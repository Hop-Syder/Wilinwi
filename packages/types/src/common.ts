/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Définitions de types partagés : common.ts
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { z } from 'zod';

/** Identifiant UUID. */
export const IdSchema = z.string().uuid();

/** Montant en FCFA — entier positif (le franc CFA n'a pas de centimes). */
export const MoneySchema = z.number().int().nonnegative();

/** Quantité de stock — peut être négative en ajustement, entière. */
export const QuantitySchema = z.number().int();

/** Plans d'abonnement (cf. §8 du plan). */
export const PLANS = ['FREE', 'PRO', 'BUSINESS'] as const;
export type Plan = (typeof PLANS)[number];
export const PlanSchema = z.enum(PLANS);

/** Modules de l'écosystème (gating du Hub). */
export const MODULES = ['POS', 'STOCK', 'PAY', 'CRM', 'MARKET', 'ANALYTICS', 'AI'] as const;
export type ModuleKey = (typeof MODULES)[number];

/** Modules inclus par plan — pilote le gating premium du Hub (§4.2). */
export const PLAN_MODULES: Record<Plan, readonly ModuleKey[]> = {
  FREE: ['POS', 'STOCK', 'ANALYTICS'],
  PRO: ['POS', 'STOCK', 'PAY', 'CRM', 'MARKET', 'ANALYTICS'],
  BUSINESS: ['POS', 'STOCK', 'PAY', 'CRM', 'MARKET', 'ANALYTICS', 'AI'],
};

export function planIncludesModule(plan: Plan, module: ModuleKey): boolean {
  return PLAN_MODULES[plan].includes(module);
}
