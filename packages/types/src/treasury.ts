/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Définitions de types partagés Zod et utilitaires pour la trésorerie : comptes, dépenses, virements, et clôtures.
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { z } from 'zod';
import { MoneySchema } from './common.js';
import type { PaymentMethod } from './sale.js';

/** Comptes de trésorerie (soldes séparés, §6.1). */
export const CASH_ACCOUNTS = ['CAISSE', 'MOBILE_MONEY', 'BANQUE'] as const;
export type CashAccount = (typeof CASH_ACCOUNTS)[number];
export const CashAccountSchema = z.enum(CASH_ACCOUNTS);
export const CASH_ACCOUNT_LABELS: Record<CashAccount, string> = {
  CAISSE: 'Caisse (espèces)',
  MOBILE_MONEY: 'Mobile Money',
  BANQUE: 'Banque',
};

/** Catégories de dépenses (§6.1). */
export const EXPENSE_CATEGORIES = [
  'LOYER',
  'ELECTRICITE',
  'EAU',
  'SALAIRE',
  'REAPPRO',
  'TRANSPORT',
  'AUTRE',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  LOYER: 'Loyer',
  ELECTRICITE: 'Électricité',
  EAU: 'Eau',
  SALAIRE: 'Salaire',
  REAPPRO: 'Réapprovisionnement',
  TRANSPORT: 'Transport',
  AUTRE: 'Autre',
};

const PositiveMoney = MoneySchema.refine((m) => m > 0, 'Le montant doit être positif');

/** Enregistrer une dépense (sortie). */
export const RecordExpenseSchema = z.object({
  compte: CashAccountSchema,
  montant: PositiveMoney,
  categorie: z.enum(EXPENSE_CATEGORIES).default('AUTRE'),
  note: z.string().optional(),
});
export type RecordExpenseInput = z.infer<typeof RecordExpenseSchema>;

/** Mouvement manuel : ajustement ou solde d'ouverture (entrée ou sortie). */
export const RecordCashMovementSchema = z.object({
  type: z.enum(['IN', 'OUT']),
  compte: CashAccountSchema,
  montant: PositiveMoney,
  source: z.enum(['ADJUSTMENT', 'OPENING']).default('ADJUSTMENT'),
  note: z.string().optional(),
});
export type RecordCashMovementInput = z.infer<typeof RecordCashMovementSchema>;

/** Virement entre deux comptes (ex : déposer la caisse en banque). */
export const TransferSchema = z
  .object({
    from: CashAccountSchema,
    to: CashAccountSchema,
    montant: PositiveMoney,
    note: z.string().optional(),
  })
  .refine((t) => t.from !== t.to, { message: 'Les comptes source et destination diffèrent' });
export type TransferInput = z.infer<typeof TransferSchema>;

/** Clôture de caisse : comptage réel vs théorique (§6.1). */
export const CashCloseSchema = z.object({
  compte: CashAccountSchema.default('CAISSE'),
  soldeReel: MoneySchema,
  note: z.string().optional(),
});
export type CashCloseInput = z.infer<typeof CashCloseSchema>;

/**
 * Mappe un mode de paiement vers le compte de trésorerie crédité.
 * `CREDIT` → null (aucun encaissement immédiat). `INSTALLMENT` → caisse (acompte espèces).
 */
export function accountForPayment(method: PaymentMethod): CashAccount | null {
  switch (method) {
    case 'CASH':
    case 'INSTALLMENT':
      return 'CAISSE';
    case 'MOBILE_MONEY':
      return 'MOBILE_MONEY';
    case 'BANK_TRANSFER':
      return 'BANQUE';
    case 'CREDIT':
    default:
      return null;
  }
}
