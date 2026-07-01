/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Configuration tarifaire & limites par plan (Lot 2.3) — pilotable en base.
 * @created 2026-06-30
 * @updated 2026-06-30
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { z } from 'zod';
import { PlanSchema, UNLIMITED } from './common.js';

/** Sentinelle « illimité » côté base (Infinity n'est pas stockable). */
export const LIMIT_UNLIMITED = -1;

/** Une limite stockée est-elle « illimitée » ? */
export function isUnlimited(value: number): boolean {
  return value < 0;
}

/** Convertit une limite stockée (-1) en valeur runtime (`UNLIMITED` = Infinity). */
export function resolveLimit(value: number): number {
  return isUnlimited(value) ? UNLIMITED : value;
}

/**
 * Configuration d'un plan telle que stockée/transportée.
 * Prix en FCFA : `null` = « sur devis » (ex. ENTERPRISE), `0` = gratuit (STARTER).
 * Limites : `-1` = illimité (cf. {@link LIMIT_UNLIMITED}).
 */
export const PlanConfigSchema = z.object({
  plan: PlanSchema,
  label: z.string(),
  priceMonthly: z.number().int().nonnegative().nullable(),
  priceYearly: z.number().int().nonnegative().nullable(),
  maxUsers: z.number().int().min(LIMIT_UNLIMITED),
  maxEtablissements: z.number().int().min(LIMIT_UNLIMITED),
  maxDevices: z.number().int().min(LIMIT_UNLIMITED),
  maxPhotos: z.number().int().min(LIMIT_UNLIMITED), // -1 = illimité · 0 = désactivé
  updatedAt: z.coerce.date(),
});
export type PlanConfigDto = z.infer<typeof PlanConfigSchema>;

/** Entrée d'édition d'un plan (super-admin). `plan` et `updatedAt` non éditables. */
export const UpdatePlanConfigSchema = z.object({
  label: z.string().min(1).max(40),
  priceMonthly: z.number().int().nonnegative().nullable(),
  priceYearly: z.number().int().nonnegative().nullable(),
  maxUsers: z.number().int().min(LIMIT_UNLIMITED),
  maxEtablissements: z.number().int().min(LIMIT_UNLIMITED),
  maxDevices: z.number().int().min(LIMIT_UNLIMITED),
  maxPhotos: z.number().int().min(LIMIT_UNLIMITED), // -1 = illimité · 0 = désactivé
});
export type UpdatePlanConfigInput = z.infer<typeof UpdatePlanConfigSchema>;
