/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Mappers de ventes assurant l'application stricte de la sécurité au niveau des champs (RBAC) pour protéger la marge
 * @created 2026-06-19
 * @updated 2026-10-04
 * 🌐 nexus-partners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { canSeeSensitivePricing, type Role } from '@wilinwi/types';

type SaleItemLike = {
  coutUnitaire?: number | null;
  prixReel?: number;
  unitLabel?: string | null;
  quantite?: number;
  quantiteRetournee?: number | null;
  quantityScale?: number | null;
} & Record<string, unknown>;
type SaleLike = { items?: SaleItemLike[] | null } & Record<string, unknown>;

/**
 * Quantité AFFICHÉE d'une ligne de vente (§19.1) : 250 milli-kg → 0,25.
 * Les lignes à la pièce (échelle 1) sont inchangées.
 */
export function saleItemDisplayQty(item: { quantite: number; quantityScale?: number | null }): number {
  return item.quantite / (item.quantityScale || 1);
}

/**
 * Lignes LEGACY (antérieures à quantity_scale) qui encodaient la quantité
 * décimale dans `unitLabel` : « DEC:0.25:3000:0,25 kg » (quantité, prix
 * unitaire, libellé) ou « 0,5 kg » sur une ligne de quantite 1 dont prixReel
 * était le total. Décodées à la lecture pour que l'historique reste juste.
 */
function decodeLegacyDecimal<I extends SaleItemLike>(item: I): I {
  const label = typeof item.unitLabel === 'string' ? item.unitLabel : null;
  if (!label) return item;
  if (label.startsWith('DEC:')) {
    const [, qtyStr, priceStr, ...tag] = label.split(':');
    const quantite = qtyStr ? parseFloat(qtyStr) : NaN;
    const prixReel = priceStr ? parseInt(priceStr, 10) : NaN;
    if (Number.isNaN(quantite) || Number.isNaN(prixReel) || quantite <= 0) return item;
    return {
      ...item,
      quantite,
      prixReel,
      coutUnitaire: unitCost(item.coutUnitaire, quantite),
      unitLabel: tag.join(':') || null,
    };
  }
  const rawQty = label.match(/^([0-9]+[.,][0-9]+)\s*(.*)$/)?.[1];
  const parsed = rawQty ? parseFloat(rawQty.replace(',', '.')) : NaN;
  if (parsed > 0 && parsed !== 1 && item.quantite === 1) {
    return {
      ...item,
      quantite: parsed,
      prixReel: Math.round((Number(item.prixReel) || 0) / parsed),
      coutUnitaire: unitCost(item.coutUnitaire, parsed),
    };
  }
  return item;
}

/** Les formats legacy figeaient le coût TOTAL de la ligne : on le ramène à l'unité. */
function unitCost(cout: number | null | undefined, quantite: number): number | null | undefined {
  return typeof cout === 'number' ? Math.round(cout / quantite) : cout;
}

/**
 * Ligne de vente telle qu'AFFICHÉE (historique, reçu, client) : quantités
 * ramenées de l'échelle persistée (250 milli-kg → 0,25) et lignes legacy
 * décodées. Invariant : saleLineAmount(prixReel, quantite) = montant ligne.
 */
export function toDisplayItem<I extends SaleItemLike>(item: I): I {
  const scale = item.quantityScale || 1;
  if (scale === 1) return decodeLegacyDecimal(item);
  return {
    ...item,
    quantite: (item.quantite ?? 0) / scale,
    quantiteRetournee: (item.quantiteRetournee ?? 0) / scale,
  };
}

/**
 * Point de sortie unique des ventes vers le client. Retire le champ sensible
 * `coutUnitaire` (prix d'achat figé → marge) pour les rôles non autorisés —
 * pendant des produits via toProductDto (§3 / §9). Les quantités sortent en
 * unités AFFICHÉES (0,25 kg) : `prixReel × quantite` = montant de la ligne.
 */
export function toSaleDto<T extends SaleLike>(sale: T, role: Role): T {
  const sensitive = canSeeSensitivePricing(role);
  if (!sale.items) return sale;

  const items = sale.items.map((raw) => {
    const item = toDisplayItem(raw);
    if (sensitive) return item;
    const { coutUnitaire: _cout, ...rest } = item;
    return rest;
  });

  return { ...sale, items } as unknown as T;
}

/** Variante liste. */
export function toSaleDtoList<T extends SaleLike>(sales: T[], role: Role): T[] {
  return sales.map((s) => toSaleDto(s, role));
}
