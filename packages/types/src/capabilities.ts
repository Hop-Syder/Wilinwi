/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Capacités d'infrastructure d'établissement (TDR v2 — ADR-001/004).
 *   Source de vérité PARTAGÉE (frontend + backend) de la résolution en couches :
 *   infrastructure → plan SaaS → add-ons → dunning → rôle.
 *   Axe distinct des capacités de rôle (`roles.ts`, notation `domaine:action`) :
 *   ici la notation est `domaine.action` (capacités métier par établissement).
 * @created 2026-07-04
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { z } from 'zod';
import type { Plan } from './common.js';
import { hasCapability, type Capability, type Role } from './roles.js';
import type { DunningState } from './dunning.js';

/** Infrastructures métier d'un établissement (coexiste avec le `type` physique). */
export const INFRASTRUCTURES = ['RETAIL', 'FOOD', 'HEALTH', 'SERVICE', 'WHOLESALE'] as const;
export type EtablissementInfrastructure = (typeof INFRASTRUCTURES)[number];
export const EtablissementInfrastructureSchema = z.enum(INFRASTRUCTURES);

/** Libellés FR affichés dans l'interface. */
export const INFRASTRUCTURE_LABELS: Record<EtablissementInfrastructure, string> = {
  RETAIL: 'Commerce de détail',
  FOOD: 'Restauration',
  HEALTH: 'Santé / Pharmacie',
  SERVICE: 'Services',
  WHOLESALE: 'Gros / Distribution',
};

/**
 * Capacités d'infrastructure (TDR §5.3). Certaines ne sont pas encore
 * implémentées (lots, recettes, RDV…) : les déclarer dès maintenant permet de
 * brancher menus et guards sans re-livraison du resolver.
 */
export const INFRA_CAPABILITY_KEYS = [
  'pos.standard',
  'pos.touch',
  'pos.service',
  'pos.wholesale',
  'food.tables',
  'food.kitchen',
  'stock.simple',
  'stock.batches',
  'stock.expiry',
  'stock.fefo',
  'stock.unitConversions',
  'stock.consumables',
  'recipes.basic',
  'inventory.basic',
  'pricing.floor',
  'appointments.basic',
  'staff.commissions',
  'crm.creditAdvanced',
  'deliveries.advanced',
] as const;
export type InfraCapability = (typeof INFRA_CAPABILITY_KEYS)[number];
export const InfraCapabilitySchema = z.enum(INFRA_CAPABILITY_KEYS);

/** Matrice infrastructure → capacités de base (TDR §5.3). */
export const INFRA_CAPABILITIES: Record<
  EtablissementInfrastructure,
  readonly InfraCapability[]
> = {
  RETAIL: ['pos.standard', 'stock.simple', 'inventory.basic', 'pricing.floor'],
  FOOD: ['pos.touch', 'food.tables', 'food.kitchen', 'stock.simple', 'recipes.basic'],
  HEALTH: ['pos.standard', 'stock.simple', 'stock.batches', 'stock.expiry', 'stock.fefo'],
  SERVICE: ['pos.service', 'appointments.basic', 'staff.commissions', 'stock.consumables'],
  WHOLESALE: [
    'pos.wholesale',
    'stock.simple',
    'stock.unitConversions',
    'crm.creditAdvanced',
    'deliveries.advanced',
  ],
};

/**
 * Point d'ancrage du gating commercial (TDR §12.4) — PERMISSIF tant que
 * l'arbitrage « infrastructures par plan ou add-on » n'est pas tranché :
 * toutes les infrastructures sont disponibles quel que soit le plan.
 */
export function planAllowsInfrastructure(
  _plan: Plan,
  _infrastructure: EtablissementInfrastructure,
): boolean {
  return true;
}

/**
 * Capacités « non vitales » retirées dès le dunning J+3 (`suspendNonVital`).
 * Le POS et le stock restent vitaux jusqu'au blocage J+30 (`posBlocked`).
 */
export const DUNNING_NONVITAL_INFRA_CAPS: readonly InfraCapability[] = [
  'deliveries.advanced',
  'crm.creditAdvanced',
  'staff.commissions',
  'appointments.basic',
];

/**
 * Pont vers l'axe rôle : une capacité d'infrastructure n'est effective que si
 * le rôle porte la capacité de rôle correspondante (`null` = tout rôle).
 */
export const INFRA_CAP_ROLE_REQUIREMENT: Record<InfraCapability, Capability | null> = {
  'pos.standard': 'sale:create',
  'pos.touch': 'sale:create',
  'pos.service': 'sale:create',
  'pos.wholesale': 'sale:create',
  'food.tables': 'sale:create',
  'food.kitchen': 'sale:create',
  'stock.simple': 'stock:read',
  'stock.batches': 'stock:read',
  'stock.expiry': 'stock:read',
  'stock.fefo': 'stock:read',
  'stock.unitConversions': 'stock:read',
  'stock.consumables': 'stock:read',
  'recipes.basic': 'stock:write',
  'inventory.basic': 'inventory:count',
  'pricing.floor': null,
  'appointments.basic': 'sale:create',
  'staff.commissions': 'users:manage',
  'crm.creditAdvanced': 'client:view_credit',
  'deliveries.advanced': 'delivery:update',
};

export interface ResolveCapabilitiesInput {
  infrastructure: EtablissementInfrastructure;
  plan: Plan;
  role: Role;
  dunning: DunningState;
  /** Add-ons de capacités du tenant (vide aujourd'hui — hook TDR §12.1). */
  addOns?: readonly InfraCapability[];
}

/**
 * Résolution en couches (TDR §2.3 / §5.4) — MÊME fonction côté web et API :
 *   1. capacités de base de l'infrastructure ;
 *   2. gating plan (permissif aujourd'hui, cf. planAllowsInfrastructure) ;
 *   3. union des add-ons ;
 *   4. retraits dunning (non-vital à J+3, tout à J+30) ;
 *   5. filtre par le rôle (INFRA_CAP_ROLE_REQUIREMENT).
 */
export function resolveEffectiveCapabilities(input: ResolveCapabilitiesInput): InfraCapability[] {
  const { infrastructure, plan, role, dunning, addOns = [] } = input;

  if (dunning.posBlocked) return [];

  const effectivePlan: Plan = dunning.downgraded ? 'STARTER' : plan;
  const base = planAllowsInfrastructure(effectivePlan, infrastructure)
    ? INFRA_CAPABILITIES[infrastructure]
    : [];

  const caps = new Set<InfraCapability>([...base, ...addOns]);

  if (dunning.suspendNonVital) {
    for (const cap of DUNNING_NONVITAL_INFRA_CAPS) caps.delete(cap);
  }

  return [...caps].filter((cap) => {
    const required = INFRA_CAP_ROLE_REQUIREMENT[cap];
    return required === null || hasCapability(role, required);
  });
}
