import { canSeeSensitivePricing, type Role } from '@wilinwi/types';

type PriceOverrideLike = { prixPlancher?: number | null } & Record<string, unknown>;
type SaleItemLike = {
  coutUnitaire?: number | null;
  priceOverride?: PriceOverrideLike | null;
} & Record<string, unknown>;
type SaleLike = { items?: SaleItemLike[] | null } & Record<string, unknown>;

/**
 * Point de sortie unique des ventes vers le client. Retire les champs sensibles
 * (`coutUnitaire` = prix d'achat figé, `priceOverride.prixPlancher`) pour les rôles
 * non autorisés — pendant des produits via toProductDto (§3 / §9).
 */
export function toSaleDto<T extends SaleLike>(sale: T, role: Role): T {
  if (canSeeSensitivePricing(role)) return sale;

  const items = (sale.items ?? []).map((item) => {
    const { coutUnitaire: _cout, priceOverride, ...rest } = item;
    if (priceOverride) {
      const { prixPlancher: _plancher, ...override } = priceOverride;
      return { ...rest, priceOverride: override };
    }
    return rest;
  });

  return { ...sale, items } as unknown as T;
}

/** Variante liste. */
export function toSaleDtoList<T extends SaleLike>(sales: T[], role: Role): T[] {
  return sales.map((s) => toSaleDto(s, role));
}
