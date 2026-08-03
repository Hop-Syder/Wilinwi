/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Modélisation & utilitaires multi-devises pour l'expansion régionale (Module 1).
 *   Devise pivot système par défaut = FCFA (XOF/XAF, 1:1).
 * @created 2026-08-03
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { z } from 'zod';

/** Devises supportées dans la sous-région et à l'international. */
export const SUPPORTED_CURRENCIES = ['XOF', 'XAF', 'GNF', 'NGN', 'USD'] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];
export const CurrencySchema = z.enum(SUPPORTED_CURRENCIES);

export const CURRENCY_LABELS: Record<Currency, { name: string; symbol: string; decimals: number }> = {
  XOF: { name: 'Franc CFA (UEMOA)', symbol: 'FCFA', decimals: 0 },
  XAF: { name: 'Franc CFA (CEMAC)', symbol: 'FCFA', decimals: 0 },
  GNF: { name: 'Franc Guinéen', symbol: 'GNF', decimals: 0 },
  NGN: { name: 'Naira Nigérian', symbol: '₦', decimals: 2 },
  USD: { name: 'Dollar US', symbol: '$', decimals: 2 },
};

/**
 * Taux de conversion par défaut par rapport à la devise de référence FCFA (1 FCFA = X unités de la devise).
 * 1 FCFA = 1 XOF = 1 XAF = 14.3 GNF = 2.5 NGN = 0.00167 USD (soit ~600 FCFA pour 1 USD).
 */
export const DEFAULT_EXCHANGE_RATES: Record<Currency, number> = {
  XOF: 1.0,
  XAF: 1.0,
  GNF: 14.3,
  NGN: 2.5,
  USD: 0.00167,
};

/**
 * Convertit un montant exprimé dans la devise pivot (FCFA) vers une devise cible.
 */
export function convertFromPivot(
  amountInPivot: number,
  targetCurrency: Currency,
  rates: Record<Currency, number> = DEFAULT_EXCHANGE_RATES,
): number {
  if (targetCurrency === 'XOF' || targetCurrency === 'XAF') return amountInPivot;
  const rate = rates[targetCurrency] ?? 1.0;
  const rawConverted = amountInPivot * rate;
  const decimals = CURRENCY_LABELS[targetCurrency]?.decimals ?? 0;
  if (decimals === 0) return Math.round(rawConverted);
  return Number(rawConverted.toFixed(decimals));
}

/**
 * Convertit un montant d'une devise donnée vers la devise pivot système (FCFA).
 */
export function convertToPivot(
  amountInTarget: number,
  sourceCurrency: Currency,
  rates: Record<Currency, number> = DEFAULT_EXCHANGE_RATES,
): number {
  if (sourceCurrency === 'XOF' || sourceCurrency === 'XAF') return Math.round(amountInTarget);
  const rate = rates[sourceCurrency] ?? 1.0;
  if (rate <= 0) return Math.round(amountInTarget);
  return Math.round(amountInTarget / rate);
}

/**
 * Formate proprement un montant selon les standards de la devise spécifiée.
 */
export function formatCurrencyAmount(amount: number, currency: Currency = 'XOF'): string {
  const meta = CURRENCY_LABELS[currency] ?? CURRENCY_LABELS.XOF;
  const formatted = amount.toLocaleString('fr-FR', {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  });
  return `${formatted} ${meta.symbol}`;
}
