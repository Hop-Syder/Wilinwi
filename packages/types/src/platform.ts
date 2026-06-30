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
  /** Propriétaire principal (rôle OWNER) — nom + e-mail de contact (support). */
  ownerName: z.string().nullable(),
  ownerEmail: z.string().nullable(),
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

/** KPIs agrégés de la plateforme (Lot 2.5). Montants en FCFA. */
export const PlatformMetricsSchema = z.object({
  tenantsTotal: z.number().int().nonnegative(),
  tenantsActive: z.number().int().nonnegative(),
  tenantsPastDue: z.number().int().nonnegative(),
  newTenants30d: z.number().int().nonnegative(),
  usersActive: z.number().int().nonnegative(),
  etablissementsTotal: z.number().int().nonnegative(),
  sales30dCount: z.number().int().nonnegative(),
  sales30dRevenue: z.number().int().nonnegative(),
  mrr: z.number().int().nonnegative(),
});
export type PlatformMetricsDto = z.infer<typeof PlatformMetricsSchema>;

/** Provenance géographique agrégée (un pays). */
export const PlatformGeoCountrySchema = z.object({
  countryCode: z.string(), // ISO-3166 alpha-2, ou 'XX' = inconnu/local
  country: z.string(),
  ipCount: z.number().int().nonnegative(), // IP distinctes (≈ visiteurs)
  hits: z.number().int().nonnegative(), // requêtes tracées
});
export type PlatformGeoCountryDto = z.infer<typeof PlatformGeoCountrySchema>;

/** Funnel d'activation : un compte est « activé » à ≥ 10 articles ET ≥ 1 vente. */
export const PlatformActivationFunnelSchema = z.object({
  total: z.number().int().nonnegative(),
  withAnyProduct: z.number().int().nonnegative(),
  with10Products: z.number().int().nonnegative(),
  withAnySale: z.number().int().nonnegative(),
  activated: z.number().int().nonnegative(),
});
export type PlatformActivationFunnelDto = z.infer<typeof PlatformActivationFunnelSchema>;

/** Une entreprise non encore activée (à relancer). */
export const PlatformInactiveTenantSchema = z.object({
  id: IdSchema,
  nom: z.string(),
  productsCount: z.number().int().nonnegative(),
  salesCount: z.number().int().nonnegative(),
  createdAt: z.coerce.date(),
});
export type PlatformInactiveTenantDto = z.infer<typeof PlatformInactiveTenantSchema>;

/** Un point de la série temporelle d'évolution (un jour). */
export const PlatformTimeseriesPointSchema = z.object({
  day: z.string(), // 'YYYY-MM-DD'
  newTenants: z.number().int().nonnegative(),
  cumulativeTenants: z.number().int().nonnegative(),
  salesCount: z.number().int().nonnegative(),
  salesRevenue: z.number().int().nonnegative(),
});
export type PlatformTimeseriesPointDto = z.infer<typeof PlatformTimeseriesPointSchema>;

/** Une entrée du flux d'audit cross-tenant. */
export const PlatformActivitySchema = z.object({
  id: IdSchema,
  tenantId: IdSchema,
  tenantNom: z.string(),
  userNom: z.string().nullable(),
  action: z.string(),
  entity: z.string().nullable(),
  createdAt: z.coerce.date(),
});
export type PlatformActivityDto = z.infer<typeof PlatformActivitySchema>;

export const PlatformEtablissementSchema = z.object({
  id: IdSchema,
  nom: z.string(),
  type: EtablissementTypeSchema,
  actif: z.boolean(),
  createdAt: z.coerce.date(),
});
export type PlatformEtablissementDto = z.infer<typeof PlatformEtablissementSchema>;
