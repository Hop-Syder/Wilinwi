/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Définitions de types partagés : platform.ts (Console Plateforme)
 * @created 2026-06-29
 * @updated 2026-06-29
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { z } from 'zod';
import { IdSchema, PlanSchema } from './common.js';
import { SubscriptionStatusSchema } from './dunning.js';
import { EtablissementTypeSchema } from './etablissement.js';

export const PlatformTenantSchema = z.object({
  id: IdSchema,
  nom: z.string(),
  plan: PlanSchema,
  subscriptionStatus: SubscriptionStatusSchema,
  createdAt: z.coerce.date(),
  activeUsersCount: z.number().int().nonnegative(),
  etablissementsCount: z.number().int().nonnegative(),
});
export type PlatformTenantDto = z.infer<typeof PlatformTenantSchema>;

export const PlatformEtablissementSchema = z.object({
  id: IdSchema,
  nom: z.string(),
  type: EtablissementTypeSchema,
  actif: z.boolean(),
  createdAt: z.coerce.date(),
});
export type PlatformEtablissementDto = z.infer<typeof PlatformEtablissementSchema>;
