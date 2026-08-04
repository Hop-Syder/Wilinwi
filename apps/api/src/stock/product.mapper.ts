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

import {
  canSeeSensitivePricing,
  type BatchDto,
  type ProductDto,
  type ProductUnitDto,
  type Role,
} from '@wilinwi/types';
import type { Product, ProductBatch, ProductUnit, ProductVariant } from '@wilinwi/db';

/**
 * Transforme un produit en DTO en retirant les champs sensibles
 * (prix d'achat, prix plancher) pour les rôles non autorisés (§3 / §9).
 * Cette fonction est l'unique point de sortie des produits vers le client.
 */
export function toProductDto(
  product: Product & {
    variants?: ProductVariant[];
    batches?: ProductBatch[];
    units?: ProductUnit[];
  },
  role: Role,
  stockParEtablissement?: Record<string, number>,
  otherEtablissementsStock?: { etablissementNom: string; stock: number }[],
): ProductDto {
  const base: ProductDto = {
    id: product.id,
    nom: product.nom,
    sku: product.sku,
    categorie: product.categorie,
    // Typage produit (TDR v2) : non sensible — visible par tous les rôles
    // (le POS en a besoin pour appliquer la stratégie de stock par type).
    type: product.type,
    stockPolicy: product.stockPolicy,
    unitKind: product.unitKind,
    baseUnit: product.baseUnit,
    photos: product.photos,
    prixCatalogue: product.prixCatalogue,
    // Le prix plancher (minimum de vente) est visible par TOUS les rôles : le
    // vendeur/caissier en a besoin pour négocier. (La vente sous le plancher
    // reste refusée par le backend — l'anti-fraude est conservé.)
    prixPlancher: product.prixPlancher,
    stock: product.stock,
    seuilAlerte: product.seuilAlerte,
    vendablePos: product.vendablePos,
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

  if (otherEtablissementsStock && otherEtablissementsStock.length > 0) {
    base.otherEtablissementsStock = otherEtablissementsStock;
  }

  // Conditionnements commerciaux (Wholesale M5) : visibles par tous les rôles
  // (le vendeur en a besoin pour vendre au casier).
  if (product.units && product.units.length > 0) {
    base.units = product.units.map(
      (u): ProductUnitDto => ({
        id: u.id,
        label: u.label,
        factorToBase: u.factorToBase,
        salePrice: u.salePrice,
      }),
    );
  }

  // Lots (produits BATCHED, vue scopée) : snapshot POS offline + péremption.
  if (product.batches) {
    base.batches = product.batches.map(
      (b): BatchDto => ({
        id: b.id,
        batchNumber: b.batchNumber,
        expiresAt: b.expiresAt,
        quantite: b.quantite,
      }),
    );
  }

  return base;
}
