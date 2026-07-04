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
  it('seuls OWNER/MANAGER peuvent annuler une vente (le plancher, lui, est bloquant pour tous)', () => {
    expect(hasCapability('MANAGER', 'sale:cancel')).toBe(true);
    expect(hasCapability('OWNER', 'sale:cancel')).toBe(true);
    expect(hasCapability('SELLER', 'sale:cancel')).toBe(false);
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

  it('fusionne les modules du plan ET les add-ons (union)', () => {
    const mods = effectiveModules('OWNER', 'STARTER', false, [], ['PAY', 'CRM']);
    // Modules STARTER conservés…
    expect(mods).toEqual(expect.arrayContaining(['POS', 'STOCK', 'ANALYTICS']));
    // …+ les deux add-ons débloqués.
    expect(mods).toEqual(expect.arrayContaining(['PAY', 'CRM']));
    // Mais rien d'autre (pas de fuite : MARKET/AI non demandés).
    expect(mods.includes('MARKET')).toBe(false);
    expect(mods.includes('AI')).toBe(false);
  });

  it('un add-on NE contourne PAS le périmètre du rôle (intersection)', () => {
    // SELLER n'a que POS/STOCK dans son rôle : un add-on CRM ne doit rien débloquer.
    const mods = effectiveModules('SELLER', 'ENTERPRISE', false, [], ['CRM']);
    expect(mods.includes('CRM')).toBe(false);
    expect(mods).toEqual(expect.arrayContaining(['POS', 'STOCK']));
  });

  it('add-ons idempotents si déjà inclus dans le plan (pas de doublon)', () => {
    const mods = effectiveModules('OWNER', 'PRO', false, [], ['PAY']); // PAY déjà dans PRO
    expect(mods.filter((m) => m === 'PAY')).toHaveLength(1);
  });
});

describe('neutralisation des add-ons à la rétrogradation (impayé J+7)', () => {
  // L'AuthGuard, quand `dunning.downgraded === true`, appelle effectiveModules avec
  // le plan ramené à STARTER ET extraModules = [] → les premiums disparaissent.
  it('un BUSINESS avec add-on IA perd tous ses premiums une fois rétrogradé', () => {
    const actif = effectiveModules('OWNER', 'BUSINESS', false, [], ['AI']);
    expect(actif).toEqual(expect.arrayContaining(['PAY', 'CRM', 'MARKET', 'AI']));

    // Rétrogradation : plan → STARTER, add-ons neutralisés.
    const retrograde = effectiveModules('OWNER', 'STARTER', false, []);
    for (const premium of ['PAY', 'CRM', 'MARKET', 'AI'] as const) {
      expect(retrograde.includes(premium)).toBe(false);
    }
    // Ne reste que les essentiels.
    expect(retrograde).toEqual(expect.arrayContaining(['POS', 'STOCK', 'ANALYTICS']));
  });
});
