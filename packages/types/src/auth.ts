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
import { EtablissementInfrastructureSchema, InfraCapabilitySchema } from './capabilities.js';
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
  /** Infrastructure métier du premier établissement (§5.5 — onboarding). */
  infrastructure: EtablissementInfrastructureSchema.default('RETAIL'),
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

// ───────────── Appareils (limite maxDevices des plans) ─────────────

export interface DeviceDto {
  id: string;
  deviceId: string;
  label: string | null;
  userAgent: string | null;
  lastUserNom: string | null;
  lastSeenAt: Date | string;
  revokedAt: Date | string | null;
  createdAt: Date | string;
}

export const UpdateDeviceSchema = z.object({
  label: z.string().min(1).max(60).nullable().optional(),
  /** true = révoquer (l'appareil est bloqué au prochain chargement) ; false = réactiver. */
  revoked: z.boolean().optional(),
});
export type UpdateDeviceInput = z.infer<typeof UpdateDeviceSchema>;

/** Fenêtre d'activité : un appareil muet depuis 30 jours libère son emplacement. */
export const DEVICE_ACTIVE_DAYS = 30;

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
  /** Infrastructure métier de l'établissement courant (`null` en vue globale). */
  infrastructure: EtablissementInfrastructureSchema.nullable().default(null),
  /** Fuseau horaire de l'établissement courant (frontières de journée : ventes
   *  du jour, clôtures). `null` → DEFAULT_TIMEZONE. */
  timezone: z.string().nullable().default(null),
  /** Capacités d'infrastructure effectives (infrastructure → plan → add-ons →
   *  dunning → rôle). En vue globale : union en lecture des établissements accessibles. */
  infraCapabilities: z.array(InfraCapabilitySchema).default([]),
  /** Statut d'abonnement de l'entreprise (facturation). */
  subscriptionStatus: SubscriptionStatusSchema.default('ACTIVE'),
  /** État de relance d'impayé (dérivé de pastDueSince) — pilote les restrictions. */
  dunning: DunningStateSchema.default(ACTIVE_DUNNING),
  /** Indique si l'utilisateur est un super-admin plateforme (Nexus super-admin). */
  isPlatformAdmin: z.boolean().default(false),
});
export type AuthContext = z.infer<typeof AuthContextSchema>;
