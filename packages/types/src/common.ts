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

/** Plans d'abonnement (cf. businessplan.md). */
export const PLANS = ['STARTER', 'PRO', 'BUSINESS', 'ENTERPRISE'] as const;
export type Plan = (typeof PLANS)[number];
export const PlanSchema = z.enum(PLANS);

/** Valeur sentinelle « illimité » pour les quotas de plan. */
export const UNLIMITED = Number.POSITIVE_INFINITY;

/** Modules de l'écosystème (gating du Hub). */
export const MODULES = ['POS', 'STOCK', 'PAY', 'CRM', 'MARKET', 'ANALYTICS', 'AI', 'DELIVERY'] as const;
export type ModuleKey = (typeof MODULES)[number];
export const ModuleKeySchema = z.enum(MODULES);

/**
 * Modules inclus par plan — pilote le gating premium du Hub.
 * Échelle de valeur (cf. businessplan.md §3) :
 *   STARTER  : vendre + stock + tableau de bord de base.
 *   PRO      : + trésorerie (dépenses/créances), ardoise client (CRM), livraisons.
 *   BUSINESS : + marketing (relances, fidélité).
 *   ENTERPRISE : tout, IA comprise.
 * (AI/MARKET sont aussi vendus en modules premium à l'unité — à câbler plus tard.)
 */
export const PLAN_MODULES: Record<Plan, readonly ModuleKey[]> = {
  STARTER: ['POS', 'STOCK', 'ANALYTICS'],
  PRO: ['POS', 'STOCK', 'PAY', 'CRM', 'ANALYTICS', 'DELIVERY'],
  BUSINESS: ['POS', 'STOCK', 'PAY', 'CRM', 'ANALYTICS', 'DELIVERY', 'MARKET'],
  ENTERPRISE: ['POS', 'STOCK', 'PAY', 'CRM', 'MARKET', 'ANALYTICS', 'AI', 'DELIVERY'],
};

export function planIncludesModule(plan: Plan, module: ModuleKey): boolean {
  return PLAN_MODULES[plan].includes(module);
}

/**
 * Limites par plan (cf. businessplan.md §3). `UNLIMITED` = pas de plafond.
 * `maxDevices` défini ; enforcement appareils ultérieur.
 * `maxProducts` : -1 = illimité, sinon plafond d'articles.
 */
export const PLAN_LIMITS: Record<
  Plan,
  { maxUsers: number; maxEtablissements: number; maxDevices: number; maxPhotos: number; maxProducts: number }
> = {
  // `maxPhotos` = nombre de photos par produit (galerie). 0 = images désactivées
  // (réservées à Business+, cf. businessplan.md §3).
  // `maxProducts` = nombre d'articles. 100 pour Starter, UNLIMITED pour les autres.
  STARTER: { maxUsers: 1, maxEtablissements: 1, maxDevices: 1, maxPhotos: 0, maxProducts: 100 },
  PRO: { maxUsers: 5, maxEtablissements: 2, maxDevices: 5, maxPhotos: 0, maxProducts: UNLIMITED },
  BUSINESS: { maxUsers: UNLIMITED, maxEtablissements: UNLIMITED, maxDevices: 30, maxPhotos: 6, maxProducts: UNLIMITED },
  ENTERPRISE: { maxUsers: UNLIMITED, maxEtablissements: UNLIMITED, maxDevices: UNLIMITED, maxPhotos: 12, maxProducts: UNLIMITED },
};

/** Nombre de photos par produit autorisé par le plan (0 = images désactivées). */
export function maxProductPhotos(plan: Plan): number {
  return PLAN_LIMITS[plan].maxPhotos;
}

/** Le plan autorise-t-il les images produits (galerie) ? (Business+) */
export function planAllowsProductImages(plan: Plan): boolean {
  return PLAN_LIMITS[plan].maxPhotos > 0;
}
