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

/** Ramène les quantités persistées d'une ligne à l'échelle d'affichage. */
function toDisplayItem<I extends SaleItemLike>(item: I): I {
  const scale = item.quantityScale || 1;
  if (scale === 1) return item;
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
