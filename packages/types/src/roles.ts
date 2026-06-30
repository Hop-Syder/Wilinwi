/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Source de vérité statique pour le RBAC (rôles et capacités), utilisée à la fois par le frontend et le backend
 * @created 2026-06-19
 * @updated 2026-06-19
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { z } from 'zod';
import { MODULES, PLAN_MODULES, type ModuleKey, type Plan } from './common.js';

/**
 * Les 5 rôles Wilinwi (cf. §3 du plan de projet — l'ADN).
 * Les valeurs sont stables : elles servent aussi de valeurs d'enum en base.
 */
export const ROLES = ['OWNER', 'MANAGER', 'SELLER', 'CASHIER', 'DELIVERY'] as const;
export type Role = (typeof ROLES)[number];
export const RoleSchema = z.enum(ROLES);

/** Libellés FR affichés dans l'interface. */
export const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Propriétaire',
  MANAGER: 'Gérant',
  SELLER: 'Vendeur',
  CASHIER: 'Caissier',
  DELIVERY: 'Livreur',
};

/**
 * Capacités atomiques vérifiées par le RolesGuard côté API
 * et par le gating d'interface côté web.
 */
export const CAPABILITIES = [
  // Administration
  'tenant:configure',
  'users:manage',
  'subscription:manage',
  'activity:read', // consulter le journal d'activité (audit)
  // Stock
  'stock:read',
  'stock:write',
  'inventory:count',
  'inventory:validate',
  // Entrepôt — Fournisseurs & achats (MVP2)
  'supplier:manage', // fournisseurs, bons de commande, réception, dettes fournisseurs
  // Ventes
  'sale:create',
  'sale:read',
  'sale:override_floor_price', // valider une vente sous le prix plancher
  'sale:cancel', // annuler une vente entière (ré-entrée stock + reversal) — responsable
  'sale:return', // retour partiel d'articles (avoir / remboursement) — caissier autorisé
  // Caisse
  'cash:collect',
  'cash:close',
  'cash:disburse', // décaisser des ESPÈCES de la caisse (le tenant de caisse : OWNER/MANAGER/CASHIER)
  // CRM — Clients & dettes (MVP2)
  'client:read', // voir l'identité des clients (nom, téléphone)
  'client:write', // créer/modifier les clients, définir le plafond
  'client:view_credit', // voir solde de crédit & plafond (donnée sensible)
  'client:collect_payment', // enregistrer un remboursement de dette
  // Trésorerie — Wilinwi Pay (MVP2)
  'treasury:read', // voir soldes & mouvements
  'treasury:write', // enregistrer dépenses / mouvements / virements
  // Livraisons (MVP2)
  'delivery:update',
  // Rapports
  'reports:read',
  'reports:read_full', // marges, prix d'achat, trésorerie
] as const;
export type Capability = (typeof CAPABILITIES)[number];

/** Matrice rôle → capacités. Source de vérité de l'autorisation. */
export const ROLE_CAPABILITIES: Record<Role, readonly Capability[]> = {
  OWNER: [...CAPABILITIES],
  // MANAGER = mêmes droits que l'OWNER SAUF la gestion de l'abonnement
  // (`subscription:manage`). L'anti-escalade (ne pas toucher aux OWNER) est
  // appliquée côté service, pas par la matrice de capacités.
  MANAGER: [
    'tenant:configure',
    'users:manage',
    'supplier:manage',
    'stock:read',
    'stock:write',
    'inventory:count',
    'inventory:validate',
    'supplier:manage',
    'sale:create',
    'sale:read',
    'sale:override_floor_price',
    'sale:cancel',
    'sale:return',
    'cash:collect',
    'cash:close',
    'cash:disburse',
    'client:read',
    'client:write',
    'client:view_credit',
    'client:collect_payment',
    'treasury:read',
    'treasury:write',
    'delivery:update',
    'reports:read',
    'reports:read_full',
  ],
  SELLER: ['stock:read', 'sale:create', 'sale:read', 'client:read'],
  CASHIER: [
    'sale:read',
    'sale:return',
    'cash:collect',
    'cash:close',
    'cash:disburse',
    'client:read',
    'client:view_credit',
    'client:collect_payment',
  ],
  DELIVERY: ['delivery:update'],
};

export function hasCapability(role: Role, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role].includes(capability);
}

/**
 * Sécurité au niveau champ : le prix d'ACHAT (coût) et la marge ne sont JAMAIS
 * visibles par un vendeur, un caissier ou un livreur. Le prix PLANCHER, lui, est
 * visible par tous (donnée de négociation) — la vente sous le plancher restant
 * refusée par le backend. (cf. §3 et §9 du plan de projet)
 */
export function canSeeSensitivePricing(role: Role): boolean {
  return hasCapability(role, 'reports:read_full');
}

/**
 * Sécurité au niveau champ (CRM) : le solde de crédit et le plafond d'un client
 * ne sont retournés qu'aux rôles autorisés (cf. §9 — `plafond_credit`/`dette`).
 */
export function canSeeClientCredit(role: Role): boolean {
  return hasCapability(role, 'client:view_credit');
}

// ──────────────── Accès par module (permissions par utilisateur) ────────────────

/**
 * Module fonctionnel auquel appartient chaque capacité. `ADMIN` = réglages
 * réservés au propriétaire (non concernés par le gating modules).
 */
export const CAP_MODULE: Record<Capability, ModuleKey | 'ADMIN'> = {
  'tenant:configure': 'ADMIN',
  'users:manage': 'ADMIN',
  'subscription:manage': 'ADMIN',
  'activity:read': 'ADMIN',
  'stock:read': 'STOCK',
  'stock:write': 'STOCK',
  'inventory:count': 'STOCK',
  'inventory:validate': 'STOCK',
  'supplier:manage': 'STOCK',
  'sale:create': 'POS',
  'sale:read': 'POS',
  'sale:override_floor_price': 'POS',
  'sale:cancel': 'POS',
  'sale:return': 'POS',
  'cash:collect': 'POS',
  'cash:close': 'POS',
  'cash:disburse': 'POS',
  'client:read': 'CRM',
  'client:write': 'CRM',
  'client:view_credit': 'CRM',
  'client:collect_payment': 'CRM',
  'treasury:read': 'PAY',
  'treasury:write': 'PAY',
  'delivery:update': 'DELIVERY',
  'reports:read': 'ANALYTICS',
  'reports:read_full': 'ANALYTICS',
};

/** Modules visibles par défaut selon le rôle (avant overrides & plan). */
export const ROLE_MODULES: Record<Role, readonly ModuleKey[]> = {
  OWNER: [...MODULES],
  MANAGER: ['POS', 'STOCK', 'PAY', 'CRM', 'ANALYTICS', 'DELIVERY'],
  SELLER: ['POS', 'STOCK'],
  CASHIER: ['POS', 'CRM'],
  DELIVERY: ['DELIVERY'],
};

/**
 * Modules réellement accessibles à un utilisateur :
 *   (overrides si personnalisé, sinon défaut du rôle) ∩ (modules du plan ∪ add-ons entreprise).
 * `extraModules` = modules activés « à la carte » pour l'entreprise (Lot 2.4).
 */
export function effectiveModules(
  role: Role,
  plan: Plan,
  customPermissions: boolean,
  permissions: readonly string[],
  extraModules: readonly ModuleKey[] = [],
): ModuleKey[] {
  const base = customPermissions
    ? (permissions.filter((p) => (MODULES as readonly string[]).includes(p)) as ModuleKey[])
    : ROLE_MODULES[role];
  const planSet = new Set<ModuleKey>([...PLAN_MODULES[plan], ...extraModules]);
  return base.filter((m) => planSet.has(m));
}

/**
 * Capacités effectives = capacités du rôle filtrées aux modules accessibles.
 * Les capacités `ADMIN` restent (réservées au rôle, jamais élargies).
 */
export function effectiveCapabilities(
  role: Role,
  plan: Plan,
  customPermissions: boolean,
  permissions: readonly string[],
  extraModules: readonly ModuleKey[] = [],
): Capability[] {
  const mods = new Set<ModuleKey>(
    effectiveModules(role, plan, customPermissions, permissions, extraModules),
  );
  return ROLE_CAPABILITIES[role].filter((cap) => {
    const m = CAP_MODULE[cap];
    return m === 'ADMIN' || mods.has(m);
  });
}

