/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Projection du stock par emplacement (ProductStock).
 *   À appeler à CHAQUE mouvement de stock pour tenir le solde par
 *   (produit/variante × établissement) à jour — la projection du grand livre.
 *   Double-écriture avec Product.stock pendant la transition (cf. doc §7).
 * @created 2026-06-28
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import type { TenantTx } from '@wilinwi/db';

export interface StockDelta {
  tenantId: string;
  etablissementId: string;
  productId: string;
  variantId?: string | null;
  delta: number;
  /** Seuil de réappro à poser uniquement à la création de la ligne. */
  quantiteMin?: number;
}

/**
 * Applique un delta au solde ProductStock de l'emplacement (crée la ligne si absente).
 * Unicité (etab, produit, variante) garantie par index partiels (rls.sql).
 */
export async function applyStockDelta(tx: TenantTx, p: StockDelta): Promise<void> {
  const variantId = p.variantId ?? null;
  const existing = await tx.productStock.findFirst({
    where: { etablissementId: p.etablissementId, productId: p.productId, variantId },
    select: { id: true },
  });
  if (existing) {
    await tx.productStock.update({
      where: { id: existing.id },
      data: { quantite: { increment: p.delta } },
    });
  } else {
    await tx.productStock.create({
      data: {
        tenantId: p.tenantId,
        etablissementId: p.etablissementId,
        productId: p.productId,
        variantId,
        quantite: p.delta,
        quantiteMin: p.quantiteMin ?? 0,
      },
    });
  }
}

/** Stock disponible d'un produit/variante à un établissement précis (lecture O(1)). */
export async function readStockAt(
  tx: TenantTx,
  etablissementId: string,
  productId: string,
  variantId?: string | null,
): Promise<number> {
  const row = await tx.productStock.findFirst({
    where: { etablissementId, productId, variantId: variantId ?? null },
    select: { quantite: true },
  });
  return row?.quantite ?? 0;
}
