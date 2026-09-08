import { describe, it, expect } from 'vitest';
import { PLAN_LIMITS } from '@wilinwi/types';

/**
 * PLAN_LIMITS est une constante de référence/documentation et un fallback
 * quand plan_configs n'est pas en base (PlanConfigService.getLimits).
 * Le chemin runtime réel passe par PlanConfigService (base), mais cette
 * constante doit rester cohérente avec le seed SQL (plan-configs.sql).
 */
describe('PLAN_LIMITS — référence documentation/fallback (cohérence seed)', () => {
  it('STARTER : gratuit, limité', () => {
    const s = PLAN_LIMITS.STARTER;
    expect(s.maxUsers).toBe(1);
    expect(s.maxEtablissements).toBe(1);
    expect(s.maxDevices).toBe(1);
    expect(s.maxPhotos).toBe(0);
    expect(s.maxProducts).toBe(100);
  });

  it('PRO : 5 000 FCFA, 5 users, produits illimités', () => {
    const p = PLAN_LIMITS.PRO;
    expect(p.maxUsers).toBe(5);
    expect(p.maxEtablissements).toBe(2);
    expect(p.maxDevices).toBe(5);
    expect(p.maxPhotos).toBe(0);
    expect(p.maxProducts).toBe(Infinity);
  });

  it('BUSINESS : 15 000 FCFA, users/etab/produits illimités', () => {
    const b = PLAN_LIMITS.BUSINESS;
    expect(b.maxUsers).toBe(Infinity);
    expect(b.maxEtablissements).toBe(Infinity);
    expect(b.maxDevices).toBe(30);
    expect(b.maxPhotos).toBe(6);
    expect(b.maxProducts).toBe(Infinity);
  });

  it('ENTERPRISE : sur devis, quasiment tout illimité', () => {
    const e = PLAN_LIMITS.ENTERPRISE;
    expect(e.maxUsers).toBe(Infinity);
    expect(e.maxEtablissements).toBe(Infinity);
    expect(e.maxDevices).toBe(Infinity);
    expect(e.maxPhotos).toBe(12);
    expect(e.maxProducts).toBe(Infinity);
  });

  it('monotonie : chaque limite croît (ou reste ∞) de STARTER → ENTERPRISE', () => {
    const plans = [
      PLAN_LIMITS.STARTER,
      PLAN_LIMITS.PRO,
      PLAN_LIMITS.BUSINESS,
      PLAN_LIMITS.ENTERPRISE,
    ];
    const keys = ['maxUsers', 'maxEtablissements', 'maxDevices', 'maxProducts'] as const;
    for (const key of keys) {
      for (let i = 1; i < plans.length; i++) {
        const prev = plans[i - 1]![key];
        const curr = plans[i]![key];
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    }
  });

  it('seed SQL cohérent : STARTER maxProducts=100, PRO maxUsers=5 (vérifie la grille v2)', () => {
    // Ces valeurs sont la clé de la grille v2 — si elles changent dans PLAN_LIMITS
    // sans changer dans plan-configs.sql, le seed et le fallback divergent.
    expect(PLAN_LIMITS.STARTER.maxProducts).toBe(100);
    expect(PLAN_LIMITS.PRO.maxUsers).toBe(5);
    expect(PLAN_LIMITS.PRO.maxEtablissements).toBe(2);
    expect(PLAN_LIMITS.BUSINESS.maxDevices).toBe(30);
  });
});
