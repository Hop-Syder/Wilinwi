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
import { canSeeSensitivePricing, hasCapability, type Role } from './roles.js';
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

  it('seul OWNER gère abonnement et configuration', () => {
    expect(hasCapability('OWNER', 'subscription:manage')).toBe(true);
    expect(hasCapability('MANAGER', 'subscription:manage')).toBe(false);
  });
});

describe('gating des modules par plan', () => {
  it("le plan FREE n'inclut ni CRM ni AI", () => {
    expect(planIncludesModule('FREE', 'POS')).toBe(true);
    expect(planIncludesModule('FREE', 'CRM')).toBe(false);
    expect(planIncludesModule('FREE', 'AI')).toBe(false);
  });

  it("seul le plan BUSINESS inclut l'IA", () => {
    expect(planIncludesModule('BUSINESS', 'AI')).toBe(true);
    expect(planIncludesModule('PRO', 'AI')).toBe(false);
  });
});
