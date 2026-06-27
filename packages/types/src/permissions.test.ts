import { describe, expect, it } from 'vitest';
import { effectiveModules, effectiveCapabilities, CAP_MODULE, CAPABILITIES } from './roles.js';

describe('effectiveModules', () => {
  it('SELLER : modules par défaut du rôle ∩ plan', () => {
    expect(effectiveModules('SELLER', 'BUSINESS', false, []).sort()).toEqual(['POS', 'STOCK']);
  });

  it('overrides : un SELLER limité au seul POS', () => {
    expect(effectiveModules('SELLER', 'BUSINESS', true, ['POS'])).toEqual(['POS']);
  });

  it('le plan plafonne les overrides (module hors plan ignoré)', () => {
    // Les overrides demandent AI, mais STARTER ne l'inclut pas → AI rejeté.
    const mods = effectiveModules('OWNER', 'STARTER', true, ['POS', 'AI']);
    expect(mods).toContain('POS');
    expect(mods).not.toContain('AI');
  });
});

describe('effectiveCapabilities', () => {
  it('SELLER limité à POS : perd stock:read (module STOCK retiré)', () => {
    const caps = effectiveCapabilities('SELLER', 'BUSINESS', true, ['POS']);
    expect(caps).toContain('sale:create');
    expect(caps).not.toContain('stock:read');
  });

  it('OWNER garde les capacités ADMIN même sans modules métier', () => {
    const caps = effectiveCapabilities('OWNER', 'BUSINESS', true, []);
    expect(caps).toContain('users:manage');
    expect(caps).toContain('activity:read');
  });
});

describe('CAP_MODULE', () => {
  it('couvre toutes les capacités', () => {
    for (const cap of CAPABILITIES) {
      expect(CAP_MODULE[cap]).toBeDefined();
    }
  });
});
