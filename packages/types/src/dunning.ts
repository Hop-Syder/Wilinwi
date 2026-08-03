/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Logique de relance progressive des impayés (PAST_DUE).
 *   Cf. buinessplan.md §4 : J+0 (avertissement) → J+3 (restriction du non-vital)
 *   → J+7 (rétrogradation Starter, non bloquante) → J+30 (blocage, dernier recours).
 *   Tout est dérivé d'une date `pastDueSince` → aucun cron nécessaire pour les effets.
 * @created 2026-06-27
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { z } from 'zod';

/** Statuts d'abonnement (miroir de l'enum Prisma `SubscriptionStatus`). */
export const SUBSCRIPTION_STATUSES = ['ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELLED'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
export const SubscriptionStatusSchema = z.enum(SUBSCRIPTION_STATUSES);

/** Seuils (en jours) de la relance progressive (Module 3). */
export const DUNNING_DAYS = { warning: 0, grace: 3, restricted: 3, readOnly: 3, downgraded: 7, blocked: 30 } as const;

/**
 * Catalogue bridé aux N articles les plus anciens lors de la rétrogradation
 * Starter (J+7). Les articles au-delà sont **masqués, jamais supprimés** ;
 * restauration instantanée au paiement (cf. buinessplan.md §4).
 */
export const DOWNGRADE_MAX_PRODUCTS = 50;

/**
 * Étapes du cycle d'impayé :
 * - `ACTIVE`      : à jour (aucun impayé).
 * - `WARNING`     : J+0 → alerte système & notification in-app.
 * - `RESTRICTED`  : J+1 à J+3 → période de grâce bridée aux quotas du plan gratuit.
 * - `READ_ONLY`   : J+3+ → basculement en Lecture Seule (mutations bloquées).
 * - `DOWNGRADED`  : J+7 → rétrogradation Starter (non bloquante).
 * - `BLOCKED`     : J+30 → écran de régularisation bloquant (dernier recours).
 */
export const DUNNING_STAGES = ['ACTIVE', 'WARNING', 'RESTRICTED', 'READ_ONLY', 'DOWNGRADED', 'BLOCKED'] as const;
export type DunningStage = (typeof DUNNING_STAGES)[number];

export const DunningStateSchema = z.object({
  stage: z.enum(DUNNING_STAGES),
  /** Jours de retard depuis `pastDueSince` (null si à jour). */
  daysOverdue: z.number().int().nullable(),
  /** Suspendre le non-vital (rapports avancés, exports) — à partir de J+3. */
  suspendNonVital: z.boolean(),
  /** Mode Lecture Seule (bloque toute création/modification) — à partir de J+3. */
  isReadOnly: z.boolean(),
  /** Rétrograder l'accès au niveau Starter — à partir de J+7. */
  downgraded: z.boolean(),
  /** Bloquer l'accès (écran de régularisation) — à partir de J+30. */
  posBlocked: z.boolean(),
});
export type DunningState = z.infer<typeof DunningStateSchema>;

export const ACTIVE_DUNNING: DunningState = {
  stage: 'ACTIVE',
  daysOverdue: null,
  suspendNonVital: false,
  isReadOnly: false,
  downgraded: false,
  posBlocked: false,
};

const DAY_MS = 86_400_000;

/**
 * Calcule l'état de relance à partir du statut d'abonnement et de la date de
 * passage en impayé. Fonction pure → mêmes effets côté back et front.
 */
export function computeDunning(
  subscriptionStatus: SubscriptionStatus,
  pastDueSince: Date | string | null | undefined,
  now: Date = new Date(),
): DunningState {
  if (subscriptionStatus !== 'PAST_DUE') return ACTIVE_DUNNING;

  const since = pastDueSince ? new Date(pastDueSince) : now;
  const daysOverdue = Math.max(0, Math.floor((now.getTime() - since.getTime()) / DAY_MS));

  if (daysOverdue >= DUNNING_DAYS.blocked) {
    return { stage: 'BLOCKED', daysOverdue, suspendNonVital: true, isReadOnly: true, downgraded: true, posBlocked: true };
  }
  if (daysOverdue >= DUNNING_DAYS.downgraded) {
    return { stage: 'DOWNGRADED', daysOverdue, suspendNonVital: true, isReadOnly: true, downgraded: true, posBlocked: false };
  }
  if (daysOverdue >= DUNNING_DAYS.readOnly) {
    return { stage: 'READ_ONLY', daysOverdue, suspendNonVital: true, isReadOnly: true, downgraded: false, posBlocked: false };
  }
  return { stage: 'WARNING', daysOverdue, suspendNonVital: false, isReadOnly: false, downgraded: false, posBlocked: false };
}

/** Message court (FR) destiné à la bannière d'avertissement (admin). */
export function dunningMessage(state: DunningState): string {
  switch (state.stage) {
    case 'WARNING':
      return 'Votre abonnement est arrivé à échéance. Régularisez pour éviter l\'interruption des services.';
    case 'RESTRICTED':
      return `Période de grâce (${state.daysOverdue}/3 jours) : votre compte basculera en lecture seule sous peu.`;
    case 'READ_ONLY':
      return `Période de grâce expirée (${state.daysOverdue} jours) : votre boutique est en Lecture Seule. Régularisez pour réactiver l'encaissement et l'édition.`;
    case 'DOWNGRADED':
      return `Impayé depuis ${state.daysOverdue} jours : compte rétrogradé au plan Starter en Lecture Seule.`;
    case 'BLOCKED':
      return `Impayé depuis ${state.daysOverdue} jours : accès suspendu. Régularisez votre abonnement pour réactiver Wilinwi.`;
    default:
      return '';
  }
}
