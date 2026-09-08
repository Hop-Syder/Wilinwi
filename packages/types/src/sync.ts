/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Contrat du protocole de synchronisation des ventes hors-ligne
 *   (POST /api/sync/sales), partagé entre l'API (émetteur) et @wilinwi/offline
 *   (consommateur). Le serveur réaffirme toutes les validations du chemin online
 *   au moment du sync (produits, stock, plancher, crédit…) et classe chaque refus
 *   par un motif structuré `kind` — une vente rejetée n'abîme jamais le reste du lot.
 * @created 2026-09-08
 * @updated 2026-09-08
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

/**
 * Motifs structurés de rejet serveur d'une vente hors-ligne.
 * Un seul motif par vente (le premier contrôle en échec).
 * Évolution rétrocompatible : ajouter un membre est une extension, ne pas
 * renommer/supprimer les existants (le client les persiste dans IndexedDB).
 */
export const SALE_REJECTION_KINDS = [
  'PRODUCT_NOT_FOUND', // produit introuvable (supprimé / autre tenant)
  'PRODUCT_INACTIVE', // produit désactivé depuis la vente hors-ligne
  'VARIANT_NOT_FOUND', // variante inconnue pour le produit
  'NO_ETABLISSEMENT', // vente sans boutique courante (défense en profondeur)
  'STOCK_INSUFFICIENT', // stock indisponible (ligne ou somme de lignes dupliquées)
  'BELOW_FLOOR', // prix unitaire sous le prix plancher
  'ACOMPTE_INVALID', // acompte ≤ 0 ou supérieur au total
  'CREDIT_LIMIT_EXCEEDED', // dette projetée au-delà du plafond client
  'CLIENT_NOT_FOUND', // client référencé introuvable
  'LIVREUR_NOT_FOUND', // livreur référencé introuvable
] as const;
export type SaleRejectionKind = (typeof SALE_REJECTION_KINDS)[number];

/**
 * Résultat par vente d'un lot de synchronisation. Évolution rétrocompatible du
 * protocole initial `{ ok, id?, permanent?, error? }` : `kind` (motif structuré)
 * et `clientGeneratedId: null` sont additifs — les champs existants gardent leur
 * sémantique et un client ancien ignore `kind` sans casser.
 */
export interface SyncSaleResultRow {
  /** Identifiant généré client (clé de rapprochement) ; null si la vente n'en portait pas. */
  clientGeneratedId: string | null;
  /** true = vente créée (ou déjà présente, idempotence) ; false = rejetée. */
  ok: boolean;
  /** Id serveur de la vente créée (si ok). */
  id?: string;
  /** Motif structuré du rejet (si !ok et erreur métier classée). */
  kind?: SaleRejectionKind;
  /** true = échec permanent (validation métier 4xx) → ne pas re-tenter ; false/absent = transitoire. */
  permanent?: boolean;
  /** Message d'erreur lisible (si !ok). */
  error?: string;
}
