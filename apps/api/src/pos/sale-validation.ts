/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Validation d'une vente contre les données serveur, partagée par le
 *   chemin online (POS) et le chemin sync (rejeu des ventes hors-ligne) : existence
 *   et statut actif des produits, variante, disponibilité du stock (y compris
 *   agrégée sur des lignes dupliquées), plancher de prix, acompte et plafond de
 *   crédit. Les décisions sont pures (données injectées, testable sans Prisma) ;
 *   chaque rejet porte un motif structuré `kind` consommé par le protocole de sync.
 * @created 2026-09-08
 * @updated 2026-09-08
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { BadRequestException, HttpStatus, HttpException } from '@nestjs/common';
import type { PaymentMethod, SaleItemInput, SaleRejectionKind } from '@wilinwi/types';
import { exceedsCreditLimit, projectedCreditDebt, resolveAcompte } from './sales-logic';

/**
 * Rejet de vente avec motif structuré (`kind`) : consommé par le protocole de
 * synchronisation (POST /sync/sales) tout en préservant le statut HTTP du chemin
 * online (400 par défaut ; 404 pour une entité introuvable, comme avant l'extraction).
 */
export class SaleValidationError extends HttpException {
  constructor(
    public readonly kind: SaleRejectionKind,
    message: string,
    status: number = HttpStatus.BAD_REQUEST,
  ) {
    super(message, status);
  }
}

/** Données produit nécessaires à la validation d'une ligne (côté serveur). */
export interface LineProduct {
  id: string;
  nom: string;
  prixAchat: number;
  prixPlancher: number;
  actif: boolean;
  /** Ids des variantes existantes du produit. */
  variantIds: string[];
}

/** Données serveur injectées pour valider une ligne de vente. */
export interface LineServerData {
  /** Produit résolu pour ce tenant — null si introuvable. */
  product: LineProduct | null;
  /** Un établissement précis vend (défense en profondeur : le contrôleur vérifie déjà). */
  hasEtablissement: boolean;
  /**
   * Stock disponible à l'établissement vendeur (projection ProductStock).
   * Lecture paresseuse : appelée seulement si les contrôles antérieurs passent.
   */
  availableStock: () => Promise<number>;
}

/** Ligne de vente validée, prête à être persistée. */
export interface ValidatedLine {
  productId: string;
  variantId: string | null;
  quantite: number;
  prixReel: number;
  coutUnitaire: number;
  /** Nom serveur du produit (messages du contrôle agrégé de stock). */
  nom: string;
}

/**
 * Valide une ligne de vente contre les données serveur ACTUELLES (pas celles
 * embarquées hors-ligne) : le serveur reste la source de vérité au moment du sync.
 * Ordre des contrôles préservé à l'identique du chemin online historique :
 * existence → actif → variante → établissement → stock → plancher.
 */
export async function validateSaleLine(
  item: SaleItemInput,
  srv: LineServerData,
): Promise<ValidatedLine> {
  if (!srv.product) {
    throw new SaleValidationError(
      'PRODUCT_NOT_FOUND',
      `Produit ${item.productId} introuvable`,
      HttpStatus.NOT_FOUND,
    );
  }
  const { product } = srv;
  // Un produit désactivé disparaît du catalogue (filtre actif) mais reste en base :
  // une vente qui le porte encore est refusée, en ligne comme au sync.
  if (!product.actif) {
    throw new SaleValidationError(
      'PRODUCT_INACTIVE',
      `Produit "${product.nom}" désactivé : la vente est refusée.`,
    );
  }
  if (item.variantId && !product.variantIds.includes(item.variantId)) {
    throw new SaleValidationError(
      'VARIANT_NOT_FOUND',
      `Variante introuvable pour le produit "${product.nom}"`,
    );
  }
  if (!srv.hasEtablissement) {
    throw new SaleValidationError(
      'NO_ETABLISSEMENT',
      'Vente impossible sans établissement courant : sélectionnez une boutique.',
    );
  }
  const availableStock = await srv.availableStock();
  if (item.quantite > availableStock) {
    throw new SaleValidationError(
      'STOCK_INSUFFICIENT',
      `Stock insuffisant pour le produit "${product.nom}". Demandé : ${item.quantite}, Disponible : ${availableStock}`,
    );
  }
  // Anti-fraude absolu : vente sous le prix plancher strictement refusée.
  if (item.prixReel < product.prixPlancher) {
    throw new SaleValidationError(
      'BELOW_FLOOR',
      `Opération refusée : le prix de vente de "${product.nom}" (${item.prixReel}) est inférieur au prix plancher fixe (${product.prixPlancher}).`,
    );
  }
  return {
    productId: product.id,
    variantId: item.variantId ?? null,
    quantite: item.quantite,
    prixReel: item.prixReel,
    coutUnitaire: product.prixAchat,
    nom: product.nom,
  };
}

/** Clé physique d'une ligne : le stock se consomme par (produit × variante). */
export function lineKey(productId: string, variantId: string | null): string {
  return `${productId}|${variantId ?? ''}`;
}

/** Entrée de demande agrégée par clé physique. */
export interface DemandEntry {
  productId: string;
  variantId: string | null;
  nom: string;
  quantite: number;
}

/** Somme de la demande par (produit × variante) — expose les lignes dupliquées. */
export function aggregateDemand(lines: ValidatedLine[]): Map<string, DemandEntry> {
  const demand = new Map<string, DemandEntry>();
  for (const line of lines) {
    const key = lineKey(line.productId, line.variantId);
    const entry = demand.get(key);
    if (entry) entry.quantite += line.quantite;
    else {
      demand.set(key, {
        productId: line.productId,
        variantId: line.variantId,
        nom: line.nom,
        quantite: line.quantite,
      });
    }
  }
  return demand;
}

/**
 * Contrôle agrégé du stock : chaque ligne est déjà bornée individuellement, mais
 * des lignes dupliquées (payload manipulé : même produit scindé sur N lignes)
 * passent l'une ET l'autre le contrôle unitaire tout en dépassant le stock à elles
 * deux. On borne donc la SOMME de la demande au stock disponible du serveur.
 */
export async function assertDemandWithinStock(
  demand: Map<string, DemandEntry>,
  availableAt: (productId: string, variantId: string | null) => Promise<number>,
): Promise<void> {
  for (const entry of demand.values()) {
    const available = await availableAt(entry.productId, entry.variantId);
    if (entry.quantite > available) {
      throw new SaleValidationError(
        'STOCK_INSUFFICIENT',
        `Stock insuffisant pour le produit "${entry.nom}". Demandé : ${entry.quantite}, Disponible : ${available}`,
      );
    }
  }
}

/**
 * Acompte : délègue la décision au module pur `sales-logic` (réutilisation, sans
 * modification) et classe l'échec avec un motif structuré, message préservé.
 */
export function assertAcompteCoherent(
  paymentMethod: PaymentMethod,
  montantVerse: number | undefined,
  total: number,
): number {
  try {
    return resolveAcompte(paymentMethod, montantVerse, total);
  } catch (err) {
    if (err instanceof BadRequestException && !(err instanceof SaleValidationError)) {
      throw new SaleValidationError('ACOMPTE_INVALID', err.message);
    }
    throw err;
  }
}

/**
 * Refuse une vente à crédit qui ferait dépasser le plafond du client (§6.2).
 * Décision pure : les données client sont résolues par l'appelant (tx Prisma).
 * `plafondCredit === null` → illimité (jamais dépassé).
 */
export function assertCreditWithinLimit(
  client: { soldeCredit: number; plafondCredit: number | null } | null,
  paymentMethod: PaymentMethod,
  total: number,
  intendedAcompte: number,
): void {
  if (paymentMethod !== 'CREDIT' && paymentMethod !== 'INSTALLMENT') return;
  if (!client) {
    throw new SaleValidationError('CLIENT_NOT_FOUND', 'Client introuvable', HttpStatus.NOT_FOUND);
  }
  const detteProjetee = projectedCreditDebt(paymentMethod, total, intendedAcompte);
  if (exceedsCreditLimit(client.soldeCredit, client.plafondCredit, detteProjetee)) {
    throw new SaleValidationError(
      'CREDIT_LIMIT_EXCEEDED',
      `Plafond de crédit dépassé : dette ${client.soldeCredit} + ${detteProjetee} > plafond ${client.plafondCredit}`,
    );
  }
}
