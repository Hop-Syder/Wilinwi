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
