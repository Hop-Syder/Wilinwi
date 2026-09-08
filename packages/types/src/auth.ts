/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Définitions de types partagés : auth.ts
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { z } from 'zod';
import { IdSchema, PlanSchema, MODULES } from './common.js';
import { RoleSchema } from './roles.js';
import { EtablissementTypeSchema } from './etablissement.js';
import { SubscriptionStatusSchema, DunningStateSchema, ACTIVE_DUNNING } from './dunning.js';

/**
 * Inscription d'un nouveau propriétaire : crée l'entreprise (tenant) +
 * le premier établissement + l'utilisateur OWNER.
 * `nomBoutique` = nom de l'entreprise. `nomEtablissement` (optionnel) =
 * nom du premier établissement (défaut = nom de l'entreprise).
 */
export const SignUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nomComplet: z.string().min(1),
  nomBoutique: z.string().min(1),
  nomEtablissement: z.string().min(1).optional(),
  typeEtablissement: EtablissementTypeSchema.default('BOUTIQUE'),
});
export type SignUpInput = z.infer<typeof SignUpSchema>;

export const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type SignInInput = z.infer<typeof SignInSchema>;

/** Invitation d'un membre par le propriétaire/gérant. */
export const InviteUserSchema = z.object({
  email: z.string().email(),
  nomComplet: z.string().min(1),
  role: RoleSchema,
});
export type InviteUserInput = z.infer<typeof InviteUserSchema>;

/** Contexte utilisateur résolu depuis le JWT à chaque requête. */
export const AuthContextSchema = z.object({
  userId: IdSchema,
  tenantId: IdSchema,
  role: RoleSchema,
  email: z.string().email(),
  plan: PlanSchema,
  /** Modules effectivement accessibles (rôle ∩ overrides ∩ plan). */
  modules: z.array(z.enum(MODULES)).default([]),
  /** Établissement courant (en-tête X-Etablissement-Id, borné à la liste autorisée).
   *  `null` = aucun établissement scopé (vue globale « Tous » ou aucun accès). */
  etablissementId: IdSchema.nullable().default(null),
  /** Vue globale « Tous les établissements » (OWNER, ≥2 établissements). En vue
   *  globale les lectures agrègent et les écritures scopées sont refusées. */
  isGlobalView: z.boolean().default(false),
  /** Établissements auxquels l'utilisateur a accès. */
  etablissementIds: z.array(IdSchema).default([]),
  /** Statut d'abonnement de l'entreprise (facturation). */
  subscriptionStatus: SubscriptionStatusSchema.default('ACTIVE'),
  /** État de relance d'impayé (dérivé de pastDueSince) — pilote les restrictions. */
  dunning: DunningStateSchema.default(ACTIVE_DUNNING),
  /** Indique si l'utilisateur est un super-admin plateforme (Nexus super-admin). */
  isPlatformAdmin: z.boolean().default(false),
  /** Indique si le tenant est « grand-père » : limites numériques non enforced.
   *  Vrai si gatingActivatedAt est null (pas encore activé), ou si le tenant a été
   *  créé avant gatingActivatedAt, ou si grandfatheredUntil est dans le futur. */
  isGrandfathered: z.boolean().default(false),
});
export type AuthContext = z.infer<typeof AuthContextSchema>;
