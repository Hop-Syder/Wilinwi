/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Mappers de ventes assurant l'application stricte de la sécurité au niveau des champs (RBAC) pour protéger la marge
 * @created 2026-06-19
 * @updated 2026-06-19
 * 🌐 nexus-partners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { canSeeSensitivePricing, type Role } from '@wilinwi/types';

type SaleItemLike = {
  coutUnitaire?: number | null;
} & Record<string, unknown>;
type SaleLike = { items?: SaleItemLike[] | null } & Record<string, unknown>;

/**
 * Point de sortie unique des ventes vers le client. Retire le champ sensible
 * `coutUnitaire` (prix d'achat figé → marge) pour les rôles non autorisés —
 * pendant des produits via toProductDto (§3 / §9).
 */
export function toSaleDto<T extends SaleLike>(sale: T, role: Role): T {
  const isAllowedSensitive = canSeeSensitivePricing(role);

  const items = (sale.items ?? []).map((item) => {
    let itemOut: SaleItemLike = { ...item };
    if (!isAllowedSensitive) {
      const { coutUnitaire: _cout, ...rest } = itemOut;
      itemOut = rest;
    }

    // 🎯 Restitution exacte des quantités décimales et prix unitaires (0.5, 0.75, 1.25...)
    const unitLabel = typeof itemOut.unitLabel === 'string' ? itemOut.unitLabel : null;
    if (unitLabel && unitLabel.startsWith('DEC:')) {
      const parts = unitLabel.split(':');
      const decQtyStr = parts[1];
      const unitPriceStr = parts[2];
      const decQty = decQtyStr ? parseFloat(decQtyStr) : NaN;
      const unitPrice = unitPriceStr ? parseInt(unitPriceStr, 10) : NaN;
      const displayTag = parts.slice(3).join(':');
      if (!isNaN(decQty) && !isNaN(unitPrice)) {
        itemOut = {
          ...itemOut,
          quantite: decQty,
          prixReel: unitPrice,
          unitLabel: displayTag || `${decQty}x`,
        };
      }
    } else if (unitLabel) {
      // Rétrocompatibilité avec les ventes créées avec format "0,5x", "0,75x", "0,5 kg"
      const match = unitLabel.match(/^([0-9]+(?:[.,][0-9]+)?)\s*(.*)$/);
      const rawQty = match?.[1];
      if (rawQty && (rawQty.includes('.') || rawQty.includes(','))) {
        const parsed = parseFloat(rawQty.replace(',', '.'));
        if (parsed > 0 && parsed !== 1 && itemOut.quantite === 1) {
          const lineTotal = Number(itemOut.prixReel) || 0;
          itemOut = {
            ...itemOut,
            quantite: parsed,
            prixReel: Math.round(lineTotal / parsed),
          };
        }
      }
    }

    return itemOut;
  });

  return { ...sale, items } as unknown as T;
}

/** Variante liste. */
export function toSaleDtoList<T extends SaleLike>(sales: T[], role: Role): T[] {
  return sales.map((s) => toSaleDto(s, role));
}
