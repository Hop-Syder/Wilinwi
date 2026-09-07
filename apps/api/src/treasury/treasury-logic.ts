/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Logique de décision pure de la trésorerie : sommation des soldes,
 *   garde-fou de virement (solde suffisant) et règle de clôture de caisse (motif
 *   obligatoire sur écart + sens de l'ajustement). Extraite de `treasury.service.ts`.
 * @created 2026-09-07
 * @updated 2026-09-07
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { BadRequestException } from '@nestjs/common';
import { CASH_ACCOUNTS, CASH_ACCOUNT_LABELS, type CashAccount } from '@wilinwi/types';

/** Ligne agrégée de mouvements (compte × sens), prête à sommer. */
export interface MovementAggregate {
  compte: CashAccount;
  type: 'IN' | 'OUT';
  montant: number;
}

/**
 * Soldes par compte = Σ(entrées) − Σ(sorties) (§6.1). Fonction pure : même
 * résultat côté back que dans tout agrégat de reporting.
 */
export function sumBalances(rows: MovementAggregate[]): Record<CashAccount, number> {
  const balances = Object.fromEntries(CASH_ACCOUNTS.map((c) => [c, 0])) as Record<
    CashAccount,
    number
  >;
  for (const r of rows) {
    balances[r.compte] += r.type === 'IN' ? r.montant : -r.montant;
  }
  return balances;
}

/**
 * Refuse un virement inter-comptes si le solde source est insuffisant (échec
 * rapide avant toute écriture, §6.1).
 */
export function assertSufficientBalance(
  balances: Record<CashAccount, number>,
  from: CashAccount,
  montant: number,
): void {
  if (balances[from] < montant) {
    const label = CASH_ACCOUNT_LABELS[from];
    throw new BadRequestException(
      `Solde insuffisant sur ${label} : ${balances[from].toLocaleString('fr-FR')} FCFA disponible, ${montant.toLocaleString('fr-FR')} FCFA requis.`,
    );
  }
}

/**
 * Clôture de caisse : un écart (réel − théorique) exige un motif explicatif.
 * Sans motif, l'opération est refusée (§6.1).
 */
export function requireClosingNote(ecart: number, note: string | null | undefined): void {
  if (ecart !== 0 && !note?.trim()) {
    throw new BadRequestException(
      `Un écart de ${ecart > 0 ? '+' : ''}${ecart} FCFA a été constaté. Veuillez saisir un motif explicatif.`,
    );
  }
}

/**
 * Mouvement d'ajustement généré par un écart de clôture : une entrée (IN) si le
 * comptage réel excède le théorique, une sortie (OUT) sinon. `null` à l'équilibre.
 */
export function closingAdjustment(
  ecart: number,
): { type: 'IN' | 'OUT'; montant: number } | null {
  if (ecart === 0) return null;
  return { type: ecart > 0 ? 'IN' : 'OUT', montant: Math.abs(ecart) };
}
