/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Recherche floue de produits (nom/référence), pure et testable.
 *   Un seul algorithme, deux consommateurs : la recherche serveur
 *   (`GET /stock/products/search`) et la résolution du panier vocal Wilinwi AI
 *   (Phase 1 du plan). Ne touche à aucune donnée sensible — opère uniquement
 *   sur `nom`/`sku`, jamais sur les prix.
 * @created 2026-09-08
 * @updated 2026-09-08
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

export interface SearchableProduct {
  nom: string;
  sku?: string | null;
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

/** Score de pertinence d'un produit pour une requête ; 0 = aucune correspondance. */
export function scoreProductMatch(product: SearchableProduct, query: string): number {
  const q = normalize(query);
  if (!q) return 0;
  const nom = normalize(product.nom);
  const sku = product.sku ? normalize(product.sku) : '';

  if (sku && sku === q) return 100; // référence exacte
  if (nom === q) return 90; // nom exact
  if (sku && sku.startsWith(q)) return 70;
  if (nom.startsWith(q)) return 60;
  if (sku && sku.includes(q)) return 40;
  if (nom.includes(q)) return 30;
  return 0;
}

/** Produits pertinents pour une requête, triés par score décroissant (score > 0 uniquement). */
export function matchProducts<T extends SearchableProduct>(
  products: readonly T[],
  query: string,
  limit = 5,
): T[] {
  return products
    .map((p) => ({ p, score: scoreProductMatch(p, query) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.p.nom.localeCompare(b.p.nom))
    .slice(0, limit)
    .map((r) => r.p);
}
