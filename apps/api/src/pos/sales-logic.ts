/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Logique de décision pure des ventes (POS) : acompte, statuts de
 *   paiement, plafond de crédit et ventilation du paiement mixte. Extraite de
 *   `sales.service.ts` pour être testable sans infrastructure (Prisma/Supabase).
 * @created 2026-09-07
 * @updated 2026-09-07
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { BadRequestException } from '@nestjs/common';
import type { CashAccount, InstallmentStatus, PaymentMethod } from '@wilinwi/types';

/**
 * Résout le montant d'acompte exigé pour un paiement (§5.3).
 * Hors paiement par acompte, aucun versement immédiat n'est demandé (0).
 * Pour un acompte, le versement doit être strictement positif et ≤ au total.
 */
export function resolveAcompte(
  paymentMethod: PaymentMethod,
  montantVerse: number | undefined,
  total: number,
): number {
  if (paymentMethod !== 'INSTALLMENT') return 0;
  const verse = montantVerse ?? 0;
  if (verse <= 0) throw new BadRequestException("Le montant de l'acompte doit être positif");
  if (verse > total) throw new BadRequestException("L'acompte dépasse le total");
  return verse;
}

/**
 * Montant encaissé à la finalisation + statut de la vente selon le mode de paiement.
 *  - acompte  : encaisse l'acompte ; complété si l'acompte couvre le total ;
 *  - crédit   : aucun encaissement immédiat, vente en attente de paiement ;
 *  - comptant : encaisse l'intégralité, vente complétée.
 */
export function resolvePayment(
  paymentMethod: PaymentMethod,
  total: number,
  intendedAcompte: number,
): { montantVerse: number; status: 'COMPLETED' | 'PENDING_PAYMENT' } {
  if (paymentMethod === 'INSTALLMENT') {
    return {
      montantVerse: intendedAcompte,
      status: intendedAcompte >= total ? 'COMPLETED' : 'PENDING_PAYMENT',
    };
  }
  if (paymentMethod === 'CREDIT') {
    return { montantVerse: 0, status: 'PENDING_PAYMENT' };
  }
  return { montantVerse: total, status: 'COMPLETED' };
}

/** Statut d'un acompte selon la part versée par rapport au total. */
export function installmentStatus(total: number, verse: number): InstallmentStatus {
  if (verse <= 0) return 'PENDING';
  if (verse >= total) return 'SETTLED';
  return 'PARTIAL';
}

/**
 * Dette projetée d'une vente à crédit / acompte : la part non réglée immédiatement.
 * Un crédit fait porter l'intégralité du total ; un acompte seulement le reste.
 */
export function projectedCreditDebt(
  paymentMethod: PaymentMethod,
  total: number,
  intendedAcompte: number,
): number {
  return paymentMethod === 'CREDIT' ? total : total - intendedAcompte;
}

/**
 * Vérifie si la dette projetée fait dépasser le plafond de crédit du client (§6.2).
 * `plafondCredit === null` → illimité (jamais dépassé).
 */
export function exceedsCreditLimit(
  soldeCredit: number,
  plafondCredit: number | null,
  detteProjetee: number,
): boolean {
  return plafondCredit !== null && soldeCredit + detteProjetee > plafondCredit;
}

/**
 * Ventilation d'un paiement mixte : la part payée en ESPÈCES vs la part sur le
 * compte du mode de paiement. Si le compte est déjà la CAISSE, tout y est versé
 * (aucune ventilation). La part espèces est bornée entre 0 et le montant versé.
 */
export function splitMixedPayment(
  compte: CashAccount | null,
  montantVerse: number,
  montantEspeces: number | null | undefined,
): { espece: number; reste: number } {
  const espece =
    compte === 'CAISSE' ? 0 : Math.min(Math.max(montantEspeces ?? 0, 0), montantVerse);
  return { espece, reste: montantVerse - espece };
}
