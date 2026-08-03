/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant UI partagé (Design System) : format.ts (Formatage FCFA avec espace insécable)
 * @created 2026-06-20
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

/** Formatage d'un montant en FCFA (entier, séparateur d'espace insécable strict). */
export function formatFCFA(montant: number): string {
  const formatted = new Intl.NumberFormat('fr-FR')
    .format(Math.round(montant))
    .replace(/[\s\u202F\u00A0]/g, '\u00A0');
  return `${formatted}\u00A0FCFA`;
}

/** Formatage d'une quantité entière. */
export function formatQty(qty: number): string {
  return new Intl.NumberFormat('fr-FR').format(qty);
}

/** Date courte FR. */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(date));
}
