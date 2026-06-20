/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant UI partagé (Design System) : format.ts
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

/** Formatage d'un montant en FCFA (entier, séparateur d'espace). */
export function formatFCFA(montant: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(Math.round(montant))} FCFA`;
}

/** Formatage d'une quantité entière. */
export function formatQty(qty: number): string {
  return new Intl.NumberFormat('fr-FR').format(qty);
}

/** Date courte FR. */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(date));
}
