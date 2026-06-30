/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Définitions de types partagés : roles.test.ts
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { describe, expect, it } from 'vitest';
import { canSeeSensitivePricing, hasCapability, effectiveModules, type Role } from './roles.js';
import { planIncludesModule } from './common.js';

describe('sécurité au niveau champ (prix sensibles)', () => {
  it('OWNER et MANAGER voient les prix sensibles', () => {
    expect(canSeeSensitivePricing('OWNER')).toBe(true);
    expect(canSeeSensitivePricing('MANAGER')).toBe(true);
  });

  it('SELLER, CASHIER et DELIVERY ne voient JAMAIS les prix sensibles', () => {
    for (const role of ['SELLER', 'CASHIER', 'DELIVERY'] as Role[]) {
      expect(canSeeSensitivePricing(role)).toBe(false);
    }
  });
});

describe('capacités par rôle', () => {
  it('seuls OWNER/MANAGER peuvent valider sous le prix plancher', () => {
    expect(hasCapability('MANAGER', 'sale:override_floor_price')).toBe(true);
    expect(hasCapability('OWNER', 'sale:override_floor_price')).toBe(true);
    expect(hasCapability('SELLER', 'sale:override_floor_price')).toBe(false);
  });

  it('le vendeur peut créer des ventes mais pas gérer les utilisateurs', () => {
    expect(hasCapability('SELLER', 'sale:create')).toBe(true);
    expect(hasCapability('SELLER', 'users:manage')).toBe(false);
  });

  it('le MANAGER a les droits du propriétaire SAUF l\'abonnement (D2)', () => {
    expect(hasCapability('MANAGER', 'users:manage')).toBe(true);
    expect(hasCapability('MANAGER', 'tenant:configure')).toBe(true);
    // L'abonnement reste réservé au propriétaire.
    expect(hasCapability('MANAGER', 'subscription:manage')).toBe(false);
    expect(hasCapability('OWNER', 'subscription:manage')).toBe(true);
  });

  it('le caissier peut faire des retours mais pas d\'annulation totale (D3)', () => {
    expect(hasCapability('CASHIER', 'sale:return')).toBe(true);
    expect(hasCapability('MANAGER', 'sale:return')).toBe(true);
    expect(hasCapability('CASHIER', 'sale:cancel')).toBe(false);
    expect(hasCapability('SELLER', 'sale:return')).toBe(false);
  });
});

describe('gating des modules par plan', () => {
  it('STARTER se limite aux essentiels (vente, stock, dashboard)', () => {
    expect(planIncludesModule('STARTER', 'POS')).toBe(true);
    expect(planIncludesModule('STARTER', 'STOCK')).toBe(true);
    expect(planIncludesModule('STARTER', 'ANALYTICS')).toBe(true);
    expect(planIncludesModule('STARTER', 'PAY')).toBe(false);
    expect(planIncludesModule('STARTER', 'CRM')).toBe(false);
    expect(planIncludesModule('STARTER', 'AI')).toBe(false);
  });

  it('PRO débloque trésorerie + CRM (ardoise), mais pas marketing ni IA', () => {
    expect(planIncludesModule('PRO', 'PAY')).toBe(true);
    expect(planIncludesModule('PRO', 'CRM')).toBe(true);
    expect(planIncludesModule('PRO', 'MARKET')).toBe(false);
    expect(planIncludesModule('PRO', 'AI')).toBe(false);
  });

  it('BUSINESS ajoute le marketing ; seul ENTERPRISE inclut l\'IA', () => {
    expect(planIncludesModule('BUSINESS', 'MARKET')).toBe(true);
    expect(planIncludesModule('BUSINESS', 'AI')).toBe(false);
    expect(planIncludesModule('ENTERPRISE', 'AI')).toBe(true);
  });
});

describe('modules premium à la carte (add-ons)', () => {
  it('un add-on débloque un module au-delà du plan', () => {
    const base = effectiveModules('OWNER', 'STARTER', false, []);
    expect(base.includes('PAY')).toBe(false);

    const withAddon = effectiveModules('OWNER', 'STARTER', false, [], ['PAY']);
    expect(withAddon.includes('PAY')).toBe(true);
  });
});
