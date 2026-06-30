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
import { IdSchema, PlanSchema, ModuleKeySchema } from './common.js';
import { SubscriptionStatusSchema } from './dunning.js';
import { EtablissementTypeSchema } from './etablissement.js';

export const BILLING_CYCLES = ['MONTHLY', 'YEARLY'] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];
export const BillingCycleSchema = z.enum(BILLING_CYCLES);
export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  MONTHLY: 'Mensuel',
  YEARLY: 'Annuel',
};

export const PlatformTenantSchema = z.object({
  id: IdSchema,
  nom: z.string(),
  plan: PlanSchema,
  subscriptionStatus: SubscriptionStatusSchema,
  createdAt: z.coerce.date(),
  activeUsersCount: z.number().int().nonnegative(),
  etablissementsCount: z.number().int().nonnegative(),
  /** Échéance du prochain règlement d'abonnement (null = facturation non configurée). */
  subscriptionDueDate: z.coerce.date().nullable(),
  billingCycle: BillingCycleSchema,
  /** Modules premium activés « à la carte » pour cette entreprise (Lot 2.4). */
  moduleAddons: z.array(ModuleKeySchema),
});
export type PlatformTenantDto = z.infer<typeof PlatformTenantSchema>;

/** Entrée : modules « à la carte » d'une entreprise (remplace l'ensemble courant). */
export const PlatformSetModulesSchema = z.object({ modules: z.array(ModuleKeySchema) });
export type PlatformSetModulesInput = z.infer<typeof PlatformSetModulesSchema>;

/** Entrées des actions super-admin de facturation. */
export const PlatformChangePlanSchema = z.object({ plan: PlanSchema });
export type PlatformChangePlanInput = z.infer<typeof PlatformChangePlanSchema>;

export const PlatformSetStatusSchema = z.object({ status: SubscriptionStatusSchema });
export type PlatformSetStatusInput = z.infer<typeof PlatformSetStatusSchema>;

/** Résultat d'un paiement enregistré (échéance reportée). */
export const PlatformPaymentResultSchema = z.object({
  subscriptionStatus: SubscriptionStatusSchema,
  subscriptionDueDate: z.coerce.date(),
});
export type PlatformPaymentResultDto = z.infer<typeof PlatformPaymentResultSchema>;

/** Résultat d'un cycle de relève des impayés. */
export const PlatformOverdueResultSchema = z.object({
  markedPastDue: z.number().int().nonnegative(),
});
export type PlatformOverdueResultDto = z.infer<typeof PlatformOverdueResultSchema>;

export const PlatformEtablissementSchema = z.object({
  id: IdSchema,
  nom: z.string(),
  type: EtablissementTypeSchema,
  actif: z.boolean(),
  createdAt: z.coerce.date(),
});
export type PlatformEtablissementDto = z.infer<typeof PlatformEtablissementSchema>;
