import { z } from 'zod';

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
  // Stock
  'stock:read',
  'stock:write',
  'inventory:count',
  'inventory:validate',
  // Ventes
  'sale:create',
  'sale:read',
  'sale:override_floor_price', // valider une vente sous le prix plancher
  // Caisse
  'cash:collect',
  'cash:close',
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
  MANAGER: [
    'stock:read',
    'stock:write',
    'inventory:count',
    'inventory:validate',
    'sale:create',
    'sale:read',
    'sale:override_floor_price',
    'cash:collect',
    'cash:close',
    'reports:read',
    'reports:read_full',
  ],
  SELLER: ['stock:read', 'sale:create', 'sale:read'],
  CASHIER: ['sale:read', 'cash:collect', 'cash:close'],
  DELIVERY: ['delivery:update'],
};

export function hasCapability(role: Role, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role].includes(capability);
}

/**
 * Sécurité au niveau champ : le prix d'achat, le prix plancher et la marge
 * ne sont JAMAIS visibles par un vendeur, un caissier ou un livreur.
 * (cf. §3 et §9 du plan de projet)
 */
export function canSeeSensitivePricing(role: Role): boolean {
  return hasCapability(role, 'reports:read_full');
}
