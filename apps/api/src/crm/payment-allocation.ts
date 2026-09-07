/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Logique pure du lettrage FIFO des remboursements client (§6.2) :
 *   application d'un montant à un acompte en attente. Extraite de
 *   `clients.service.ts` pour être testable sans infrastructure Prisma.
 * @created 2026-09-07
 * @updated 2026-09-07
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

/** État d'un acompte avant application d'un remboursement. */
export interface InstallmentSnapshot {
  /** Montant total de la vente (= montantTotal de l'acompte). */
  total: number;
  /** Déjà versé avant ce paiement. */
  montantVerse: number;
  /** Restant à payer avant ce paiement (attendu strictement positif). */
  soldeRestant: number;
}

/** Résultat de l'application d'un remboursement à un acompte. */
export interface PaymentApplication {
  /** Part effectivement allouée à cet acompte (bornée au restant dû). */
  aPayer: number;
  montantVerse: number;
  soldeRestant: number;
  installmentStatus: 'SETTLED' | 'PARTIAL';
  saleStatus: 'COMPLETED' | 'PENDING_PAYMENT';
}

/**
 * Applique un montant de remboursement à un acompte en attente. Alloue au plus
 * le restant dû (`soldeRestant`), puis recalcule versements, soldes et statuts.
 * Appelé successivement (ventes triées par ancienneté) pour réaliser le lettrage
 * FIFO : les créances les plus anciennes sont soldées en premier.
 */
export function applyPaymentToInstallment(
  montant: number,
  inst: InstallmentSnapshot,
): PaymentApplication {
  const aPayer = Math.min(montant, inst.soldeRestant);
  const montantVerse = inst.montantVerse + aPayer;
  const soldeRestant = inst.soldeRestant - aPayer;
  const installmentStatus: 'SETTLED' | 'PARTIAL' =
    montantVerse >= inst.total ? 'SETTLED' : 'PARTIAL';
  const saleStatus: 'COMPLETED' | 'PENDING_PAYMENT' =
    soldeRestant === 0 ? 'COMPLETED' : 'PENDING_PAYMENT';
  return { aPayer, montantVerse, soldeRestant, installmentStatus, saleStatus };
}
