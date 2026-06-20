/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Mapper DTO/Entité pour product
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { canSeeSensitivePricing, type ProductDto, type Role } from '@wilinwi/types';
import type { Product } from '@wilinwi/db';

/**
 * Transforme un produit en DTO en retirant les champs sensibles
 * (prix d'achat, prix plancher) pour les rôles non autorisés (§3 / §9).
 * Cette fonction est l'unique point de sortie des produits vers le client.
 */
export function toProductDto(product: Product, role: Role): ProductDto {
  const base: ProductDto = {
    id: product.id,
    nom: product.nom,
    sku: product.sku,
    categorie: product.categorie,
    photos: product.photos,
    prixCatalogue: product.prixCatalogue,
    stock: product.stock,
    seuilAlerte: product.seuilAlerte,
  };

  if (canSeeSensitivePricing(role)) {
    base.prixAchat = product.prixAchat;
    base.prixPlancher = product.prixPlancher;
  }
  return base;
}
