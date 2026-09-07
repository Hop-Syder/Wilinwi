/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Mapper DTO/Entité pour product
 * @created 2026-06-20
 * @updated 2026-06-28
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { canSeeSensitivePricing, type ProductDto, type Role } from '@wilinwi/types';
import type { Product, ProductVariant } from '@wilinwi/db';

/**
 * Transforme un produit en DTO en retirant les champs sensibles
 * (prix d'achat, prix plancher) pour les rôles non autorisés (§3 / §9).
 * Cette fonction est l'unique point de sortie des produits vers le client.
 */
export function toProductDto(
  product: Product & { variants?: ProductVariant[] },
  role: Role,
  stockParEtablissement?: Record<string, number>,
): ProductDto {
  const base: ProductDto = {
    id: product.id,
    nom: product.nom,
    sku: product.sku,
    categorie: product.categorie,
    photos: product.photos,
    prixCatalogue: product.prixCatalogue,
    // Le prix plancher (minimum de vente) est visible par TOUS les rôles : le
    // vendeur/caissier en a besoin pour négocier. (La vente sous le plancher
    // reste refusée par le backend — l'anti-fraude est conservé.)
    prixPlancher: product.prixPlancher,
    stock: product.stock,
    seuilAlerte: product.seuilAlerte,
    variants: (product.variants || []).map(v => ({
      id: v.id,
      productId: v.productId,
      attributs: v.attributs as Record<string, string>,
      sku: v.sku,
      stock: v.stock,
    })),
  };

  // Le prix d'ACHAT (coût → marge) reste réservé aux OWNER/MANAGER.
  if (canSeeSensitivePricing(role)) {
    base.prixAchat = product.prixAchat;
  }

  // Breakdown par établissement : réservé au PROPRIÉTAIRE (OWNER) uniquement.
  if (role === 'OWNER' && stockParEtablissement) {
    base.stockParEtablissement = stockParEtablissement;
  }

  return base;
}
