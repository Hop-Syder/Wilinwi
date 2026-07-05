/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Définitions de types partagés : product.ts
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { z } from 'zod';
import { IdSchema, MoneySchema, QuantitySchema } from './common.js';

// ──────────── Typage produit (TDR v2 — ADR-003) ────────────

/** Comportement stock/vente d'un produit. */
export const PRODUCT_TYPES = ['STANDARD', 'BATCHED', 'MANUFACTURED', 'SERVICE'] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];
export const ProductTypeSchema = z.enum(PRODUCT_TYPES);

/** Libellés FR affichés dans l'interface. */
export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  STANDARD: 'Standard (stock direct)',
  BATCHED: 'Par lots (péremption)',
  MANUFACTURED: 'Fabriqué (plat, production)',
  SERVICE: 'Service (prestation)',
};

/** Politique de stock appliquée à la vente. */
export const STOCK_POLICIES = ['STRICT', 'ALLOW_NEGATIVE', 'NO_STOCK', 'RECIPE_BASED'] as const;
export type StockPolicy = (typeof STOCK_POLICIES)[number];
export const StockPolicySchema = z.enum(STOCK_POLICIES);

/** Nature de l'unité de base d'un produit. */
export const UNIT_KINDS = ['UNIT', 'WEIGHT', 'VOLUME', 'PACKAGE', 'TIME'] as const;
export type UnitKind = (typeof UNIT_KINDS)[number];
export const UnitKindSchema = z.enum(UNIT_KINDS);

/** Libellés FR affichés dans l'interface. */
export const UNIT_KIND_LABELS: Record<UnitKind, string> = {
  UNIT: 'À l’unité (pièce)',
  WEIGHT: 'Au poids',
  VOLUME: 'Au volume',
  PACKAGE: 'Au conditionnement',
  TIME: 'Au temps',
};

// ─────────── Convention milli-unités (TDR — quantités décimales) ───────────

/**
 * Toutes les quantités persistées restent des ENTIERS (même philosophie que les
 * FCFA). Pour vendre au poids/volume (1,5 kg ; 0,33 L), les produits WEIGHT et
 * VOLUME stockent des MILLI-unités de `baseUnit` : stock 1500 avec baseUnit
 * « kg » = 1,5 kg. UNIT/PACKAGE/TIME restent à l'échelle 1.
 */
export const QUANTITY_SCALE: Record<UnitKind, number> = {
  UNIT: 1,
  PACKAGE: 1,
  TIME: 1,
  WEIGHT: 1000,
  VOLUME: 1000,
};

export function quantityScale(kind: UnitKind | null | undefined): number {
  return kind ? QUANTITY_SCALE[kind] : 1;
}

/** Saisie utilisateur (décimale possible) → quantité persistée (entier). */
export function toStoredQuantity(display: number, kind: UnitKind | null | undefined): number {
  return Math.round(display * quantityScale(kind));
}

/** Quantité persistée (entier) → valeur affichable (décimale possible). */
export function toDisplayQuantity(stored: number, kind: UnitKind | null | undefined): number {
  return stored / quantityScale(kind);
}

/** Affichage FR : « 1,5 kg », « 0,33 L », « 24 ». */
export function formatQuantity(
  stored: number,
  kind: UnitKind | null | undefined,
  baseUnit?: string | null,
): string {
  const value = toDisplayQuantity(stored, kind);
  const text = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(value);
  return baseUnit && quantityScale(kind) !== 1 ? `${text} ${baseUnit}` : text;
}

/**
 * Stratégie de vente par type produit (TDR §9.1) : seuls STANDARD et BATCHED
 * portent un stock direct (pré-contrôle + décrément à la vente). SERVICE et
 * MANUFACTURED sont vendables à stock nul, sans mouvement de stock direct.
 * `undefined`/`null` (données antérieures à la migration, caches offline) = STANDARD.
 */
export function productAffectsStock(type: ProductType | null | undefined): boolean {
  return type == null || type === 'STANDARD' || type === 'BATCHED';
}

/** Politique de stock par défaut cohérente avec le type produit. */
export function defaultStockPolicy(type: ProductType): StockPolicy {
  switch (type) {
    case 'SERVICE':
      return 'NO_STOCK';
    case 'MANUFACTURED':
      return 'RECIPE_BASED';
    default:
      return 'STRICT';
  }
}

/** Comportement effectif d'une vente vis-à-vis du stock (TDR §9.1 + §9.2). */
export interface SaleStockBehavior {
  /** Vérifier la disponibilité AVANT la vente (refus si insuffisant). */
  precheck: boolean;
  /** Décrémenter le stock direct À la vente (et le ré-entrer à l'annulation/retour). */
  decrement: boolean;
}

/**
 * Croisement type produit × politique de stock — MÊME logique côté web et API :
 * - SERVICE/MANUFACTURED : jamais de stock direct, quelle que soit la politique
 *   (les recettes RECIPE_BASED décrémenteront les composants — Milestone 3) ;
 * - STANDARD/BATCHED : STRICT bloque et décrémente ; ALLOW_NEGATIVE décrémente
 *   sans bloquer (stock négatif possible, alerté par les seuils existants) ;
 *   NO_STOCK ignore totalement le stock ; RECIPE_BASED sur un produit à stock
 *   direct est une mauvaise configuration → repli STRICT (le plus sûr).
 * `null`/`undefined` (données pré-migration, caches offline) = STANDARD/STRICT.
 */
export function saleStockBehavior(
  type: ProductType | null | undefined,
  stockPolicy: StockPolicy | null | undefined,
): SaleStockBehavior {
  if (!productAffectsStock(type)) return { precheck: false, decrement: false };
  switch (stockPolicy ?? 'STRICT') {
    case 'ALLOW_NEGATIVE':
      return { precheck: false, decrement: true };
    case 'NO_STOCK':
      return { precheck: false, decrement: false };
    case 'STRICT':
    case 'RECIPE_BASED':
    default:
      return { precheck: true, decrement: true };
  }
}

// ─────────── Anti-oversell offline (snapshot local — TDR §10 / §18.2) ───────────

/** Ligne de vente minimale pour l'ajustement du stock local. */
export interface SaleLineLike {
  productId: string;
  variantId?: string | null;
  quantite: number;
}

interface ProductStockLike {
  id: string;
  type?: ProductType | null;
  stockPolicy?: StockPolicy | null;
  stock: number;
  variants?: { id: string; stock: number }[];
  /** Lots (BATCHED) : le snapshot local est débité en FEFO comme le serveur. */
  batches?: { id: string; expiresAt: Date | string; quantite: number }[];
}

/**
 * Applique (ou annule) l'effet stock d'une vente sur un snapshot local de
 * produits — fonction PURE, partagée par le cache offline (Dexie) et l'état du
 * POS : deux ventes hors-ligne successives voient un stock déjà débité (anti-
 * oversell). `debit` = vente encaissée localement ; `credit` = vente locale
 * écartée après refus serveur. Respecte `saleStockBehavior` (SERVICE/
 * MANUFACTURED/NO_STOCK inchangés). Le serveur reste la source de vérité :
 * le snapshot est réaligné à chaque rechargement du catalogue.
 */
export function applySaleStockToProducts<T extends ProductStockLike>(
  products: readonly T[],
  items: readonly SaleLineLike[],
  mode: 'debit' | 'credit',
): T[] {
  const sign = mode === 'debit' ? -1 : 1;
  return products.map((p) => {
    const lines = items.filter((it) => it.productId === p.id);
    if (lines.length === 0) return p;
    if (!saleStockBehavior(p.type, p.stockPolicy).decrement) return p;

    let stock = p.stock;
    let variants = p.variants;
    let batches = p.batches;
    for (const line of lines) {
      stock += sign * line.quantite;
      if (line.variantId && variants) {
        variants = variants.map((v) =>
          v.id === line.variantId ? { ...v, stock: v.stock + sign * line.quantite } : v,
        );
      }
      // BATCHED : miroir FEFO du serveur sur le snapshot — debit sort des lots
      // non périmés (péremption proche d'abord, le dernier peut passer négatif) ;
      // credit ré-entre en ordre inverse. Approximation locale : le serveur reste
      // la vérité, réalignée au rechargement du catalogue.
      if (batches && batches.length > 0 && p.type === 'BATCHED') {
        const now = Date.now();
        const ordered = [...batches].sort(
          (a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime(),
        );
        const vendables = ordered.filter(
          (b) => new Date(b.expiresAt).getTime() > now,
        );
        const cibles = mode === 'debit' ? vendables : [...vendables].reverse();
        let restant = line.quantite;
        const deltas = new Map<string, number>();
        for (const b of cibles) {
          if (restant <= 0) break;
          const dispo = mode === 'debit' ? Math.max(b.quantite, 0) : restant;
          const pris = Math.min(dispo, restant);
          if (pris > 0) {
            deltas.set(b.id, (deltas.get(b.id) ?? 0) + sign * pris);
            restant -= pris;
          }
        }
        if (restant > 0) {
          const dernier = cibles.at(-1) ?? ordered.at(-1);
          if (dernier) deltas.set(dernier.id, (deltas.get(dernier.id) ?? 0) + sign * restant);
        }
        batches = batches.map((b) =>
          deltas.has(b.id) ? { ...b, quantite: b.quantite + deltas.get(b.id)! } : b,
        );
      }
    }
    return { ...p, stock, variants, batches };
  });
}

/**
 * Système à 3 prix produit (le 4ᵉ, prix_reel, est porté par chaque vente).
 * Contrainte métier : prix_achat ≤ prix_plancher ≤ prix_catalogue.
 */
export const ProductPricesSchema = z
  .object({
    prixAchat: MoneySchema, // prix d'achat (coût)
    prixPlancher: MoneySchema, // prix minimum de vente
    prixCatalogue: MoneySchema, // prix affiché maximum
  })
  .refine((p) => p.prixAchat <= p.prixPlancher && p.prixPlancher <= p.prixCatalogue, {
    message: 'Doit respecter : prix_achat ≤ prix_plancher ≤ prix_catalogue',
  });

export const ProductVariantInputSchema = z.object({
  id: IdSchema.optional(),
  attributs: z.record(z.string(), z.string()), // ex: { taille: 'L', couleur: 'rouge' }
  stock: QuantitySchema.default(0),
  sku: z.string().min(1).optional(),
});
export type ProductVariantInput = z.infer<typeof ProductVariantInputSchema>;

export const ProductVariantDtoSchema = z.object({
  id: IdSchema,
  productId: IdSchema,
  attributs: z.record(z.string(), z.string()),
  sku: z.string().nullable(),
  stock: QuantitySchema,
});
export type ProductVariantDto = z.infer<typeof ProductVariantDtoSchema>;

const CreateProductSchemaBase = z.object({
  nom: z.string().min(1),
  sku: z.string().min(1).optional(),
  categorie: z.string().min(1).optional(),
  type: ProductTypeSchema.default('STANDARD'),
  stockPolicy: StockPolicySchema.optional(),
  unitKind: UnitKindSchema.default('UNIT'),
  baseUnit: z.string().min(1).nullable().optional(),
  photos: z.array(z.string().url()).default([]),
  prixAchat: MoneySchema,
  prixPlancher: MoneySchema,
  prixCatalogue: MoneySchema,
  stock: QuantitySchema.default(0),
  seuilAlerte: QuantitySchema.default(5),
  variants: z.array(ProductVariantInputSchema).default([]),
});

export const CreateProductSchema = CreateProductSchemaBase.superRefine((data, ctx) => {
  if (!(data.prixAchat <= data.prixPlancher && data.prixPlancher <= data.prixCatalogue)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Doit respecter : prix_achat ≤ prix_plancher ≤ prix_catalogue',
      path: ['prixCatalogue'],
    });
  }
});
export type CreateProductInput = z.infer<typeof CreateProductSchema>;

// `stock` est exclu du PATCH : toute variation de stock passe par un mouvement
// (IN/OUT/ADJUST) qui maintient le grand livre et la projection ProductStock.
export const UpdateProductSchema = CreateProductSchemaBase.omit({ stock: true })
  .partial()
  .superRefine((data, ctx) => {
  // If all three prices are provided, check the condition
  if (
    data.prixAchat !== undefined &&
    data.prixPlancher !== undefined &&
    data.prixCatalogue !== undefined
  ) {
    if (!(data.prixAchat <= data.prixPlancher && data.prixPlancher <= data.prixCatalogue)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Doit respecter : prix_achat ≤ prix_plancher ≤ prix_catalogue',
        path: ['prixCatalogue'],
      });
    }
  }
    // Mise à jour partielle (1 ou 2 prix) : la validation croisée contre les valeurs
    // existantes est faite côté service (StockService.update), source de vérité.
  });
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;

// ─────────────── Lots & péremption (Health — Milestone 4, §9.4) ───────────────

export const CreateBatchSchema = z.object({
  batchNumber: z.string().min(1).max(60),
  expiresAt: z.coerce.date(),
  /** Quantité reçue, dans l'échelle du produit (§19.1). */
  quantite: QuantitySchema.refine((q) => q > 0, 'La quantité doit être positive'),
});
export type CreateBatchInput = z.infer<typeof CreateBatchSchema>;

/** Correction d'un lot (casse, péremption retirée, recomptage) : delta signé. */
export const AdjustBatchSchema = z.object({
  delta: QuantitySchema.refine((q) => q !== 0, 'Le delta ne peut pas être nul'),
  motif: z.string().min(1),
});
export type AdjustBatchInput = z.infer<typeof AdjustBatchSchema>;

export const BatchDtoSchema = z.object({
  id: IdSchema,
  batchNumber: z.string(),
  expiresAt: z.coerce.date(),
  quantite: QuantitySchema,
});
export type BatchDto = z.infer<typeof BatchDtoSchema>;

/**
 * Quantité VENDABLE d'un produit BATCHED = Σ des lots NON périmés (qté > 0).
 * Utilisée par le POS (snapshot local — Option B §18.2 : un lot périmé n'est
 * jamais sélectionnable localement) et par les affichages de stock vendable.
 */
export function sellableBatchQuantity(
  batches: readonly Pick<BatchDto, 'expiresAt' | 'quantite'>[] | null | undefined,
  now: Date = new Date(),
): number {
  if (!batches) return 0;
  return batches
    .filter((b) => new Date(b.expiresAt) > now && b.quantite > 0)
    .reduce((sum, b) => sum + b.quantite, 0);
}

/** Péremption la plus proche parmi les lots vendables (`null` si aucun). */
export function nearestExpiry(
  batches: readonly Pick<BatchDto, 'expiresAt' | 'quantite'>[] | null | undefined,
  now: Date = new Date(),
): Date | null {
  if (!batches) return null;
  const dates = batches
    .filter((b) => new Date(b.expiresAt) > now && b.quantite > 0)
    .map((b) => new Date(b.expiresAt).getTime());
  return dates.length > 0 ? new Date(Math.min(...dates)) : null;
}

/**
 * DTO public d'un produit. Les champs sensibles sont optionnels :
 * ils sont retirés pour les rôles SELLER/CASHIER/DELIVERY (cf. canSeeSensitivePricing).
 */
export const ProductDtoSchema = z.object({
  id: IdSchema,
  nom: z.string(),
  sku: z.string().nullable(),
  categorie: z.string().nullable(),
  // Défauts : tolère les caches offline antérieurs à la migration (= STANDARD).
  type: ProductTypeSchema.default('STANDARD'),
  stockPolicy: StockPolicySchema.default('STRICT'),
  unitKind: UnitKindSchema.default('UNIT'),
  baseUnit: z.string().nullable().default(null),
  photos: z.array(z.string()),
  prixCatalogue: MoneySchema,
  // Plancher : toujours présent (visible par tous, sert à négocier).
  prixPlancher: MoneySchema,
  stock: QuantitySchema,
  seuilAlerte: QuantitySchema,
  variants: z.array(ProductVariantDtoSchema).default([]),
  // Coût d'achat : sensible — présent uniquement pour OWNER/MANAGER.
  prixAchat: MoneySchema.optional(),
  // Breakdown du stock par établissement (ex: { "uuid-A": 12, "uuid-B": 8 }).
  // Présent uniquement dans la vue globale stock (OWNER/MANAGER).
  stockParEtablissement: z.record(z.string(), z.number()).optional(),
  // Lots de l'établissement courant (produits BATCHED — Milestone 4) : snapshot
  // pour le POS offline (Option B §18.2) et l'affichage péremption.
  batches: z.array(BatchDtoSchema).optional(),
});
export type ProductDto = z.infer<typeof ProductDtoSchema>;

/** Seuil de réappro d'un produit à un emplacement précis (alerte stock bas). */
export const SetStockThresholdSchema = z.object({
  etablissementId: IdSchema,
  variantId: IdSchema.nullable().optional(),
  quantiteMin: QuantitySchema.refine((q) => q >= 0, 'Le seuil doit être positif ou nul'),
});
export type SetStockThresholdInput = z.infer<typeof SetStockThresholdSchema>;

/** Alerte de stock bas pour un (produit/variante × établissement). */
export interface StockAlertDto {
  productId: string;
  productNom: string;
  variantId: string | null;
  etablissementId: string;
  etablissementNom: string | null;
  quantite: number;
  quantiteMin: number;
}

/** Types de mouvement de stock. */
export const STOCK_MOVEMENT_TYPES = ['IN', 'OUT', 'ADJUST'] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];
export const StockMovementTypeSchema = z.enum(STOCK_MOVEMENT_TYPES);

export const CreateStockMovementSchema = z.object({
  productId: IdSchema,
  variantId: IdSchema.optional(),
  type: StockMovementTypeSchema,
  quantite: QuantitySchema.refine((q) => q !== 0, 'La quantité ne peut pas être nulle'),
  motif: z.string().min(1),
});
export type CreateStockMovementInput = z.infer<typeof CreateStockMovementSchema>;

// NOTE : CreateStockTransferSchema a été SUPPRIMÉ — les transferts passent par
// le Dispatch (CreateDispatchSchema dans dispatch.ts), canal unique.
