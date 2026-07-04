/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Tests du resolver de capacités d'infrastructure (TDR v2 — OT-2).
 * @created 2026-07-04
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { describe, expect, it } from 'vitest';
import {
  INFRA_CAPABILITIES,
  resolveEffectiveCapabilities,
  planAllowsInfrastructure,
} from './capabilities.js';
import { productAffectsStock, defaultStockPolicy, saleStockBehavior } from './product.js';
import { ACTIVE_DUNNING, computeDunning } from './dunning.js';

const DAY_MS = 86_400_000;
const NOW = new Date('2026-07-04T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY_MS);

describe('resolveEffectiveCapabilities', () => {
  it('RETAIL / OWNER / à jour → exactement la matrice RETAIL (dont pricing.floor)', () => {
    const caps = resolveEffectiveCapabilities({
      infrastructure: 'RETAIL',
      plan: 'PRO',
      role: 'OWNER',
      dunning: ACTIVE_DUNNING,
    });
    expect(new Set(caps)).toEqual(new Set(INFRA_CAPABILITIES.RETAIL));
    expect(caps).toContain('pricing.floor');
  });

  it('FOOD / OWNER → capacités FOOD (pos.touch, cuisine, recettes) sans pos.standard', () => {
    const caps = resolveEffectiveCapabilities({
      infrastructure: 'FOOD',
      plan: 'BUSINESS',
      role: 'OWNER',
      dunning: ACTIVE_DUNNING,
    });
    expect(caps).toContain('pos.touch');
    expect(caps).toContain('food.tables');
    expect(caps).toContain('food.kitchen');
    expect(caps).toContain('recipes.basic');
    expect(caps).toContain('stock.simple');
    expect(caps).not.toContain('pos.standard');
  });

  it('dunning J+7 (DOWNGRADED) → non-vital retiré, POS et stock conservés', () => {
    const dunning = computeDunning('PAST_DUE', daysAgo(7), NOW);
    expect(dunning.stage).toBe('DOWNGRADED');
    const caps = resolveEffectiveCapabilities({
      infrastructure: 'WHOLESALE',
      plan: 'BUSINESS',
      role: 'OWNER',
      dunning,
    });
    expect(caps).not.toContain('crm.creditAdvanced');
    expect(caps).not.toContain('deliveries.advanced');
    expect(caps).toContain('pos.wholesale');
    expect(caps).toContain('stock.simple');
  });

  it('dunning J+30 (BLOCKED) → aucune capacité', () => {
    const dunning = computeDunning('PAST_DUE', daysAgo(30), NOW);
    expect(dunning.posBlocked).toBe(true);
    const caps = resolveEffectiveCapabilities({
      infrastructure: 'RETAIL',
      plan: 'PRO',
      role: 'OWNER',
      dunning,
    });
    expect(caps).toEqual([]);
  });

  it('rôle CASHIER sur RETAIL → pos.standard conservé (il vend), stock.simple retiré', () => {
    const caps = resolveEffectiveCapabilities({
      infrastructure: 'RETAIL',
      plan: 'PRO',
      role: 'CASHIER',
      dunning: ACTIVE_DUNNING,
    });
    expect(caps).toContain('pos.standard'); // CASHIER a sale:create (décision TDR v2)
    expect(caps).not.toContain('stock.simple'); // CASHIER n'a pas stock:read
    expect(caps).toContain('pricing.floor');
  });

  it('rôle DELIVERY sur RETAIL → aucune capacité POS/stock', () => {
    const caps = resolveEffectiveCapabilities({
      infrastructure: 'RETAIL',
      plan: 'PRO',
      role: 'DELIVERY',
      dunning: ACTIVE_DUNNING,
    });
    expect(caps).not.toContain('pos.standard');
    expect(caps).not.toContain('stock.simple');
  });

  it('add-ons : une capacité hors matrice de base est ajoutée puis filtrée par rôle', () => {
    const caps = resolveEffectiveCapabilities({
      infrastructure: 'RETAIL',
      plan: 'BUSINESS',
      role: 'OWNER',
      dunning: ACTIVE_DUNNING,
      addOns: ['stock.batches'],
    });
    expect(caps).toContain('stock.batches');
  });

  it('gating plan : permissif aujourd’hui (arbitrage commercial en attente)', () => {
    expect(planAllowsInfrastructure('STARTER', 'HEALTH')).toBe(true);
    expect(planAllowsInfrastructure('STARTER', 'WHOLESALE')).toBe(true);
  });
});

describe('productAffectsStock (stratégie de vente TDR §9.1)', () => {
  it('STANDARD et BATCHED portent un stock direct', () => {
    expect(productAffectsStock('STANDARD')).toBe(true);
    expect(productAffectsStock('BATCHED')).toBe(true);
  });

  it('SERVICE et MANUFACTURED ne portent pas de stock direct', () => {
    expect(productAffectsStock('SERVICE')).toBe(false);
    expect(productAffectsStock('MANUFACTURED')).toBe(false);
  });

  it('undefined/null (caches offline pré-migration) = STANDARD', () => {
    expect(productAffectsStock(undefined)).toBe(true);
    expect(productAffectsStock(null)).toBe(true);
  });
});

describe('defaultStockPolicy', () => {
  it('cohérent avec le type produit', () => {
    expect(defaultStockPolicy('STANDARD')).toBe('STRICT');
    expect(defaultStockPolicy('BATCHED')).toBe('STRICT');
    expect(defaultStockPolicy('SERVICE')).toBe('NO_STOCK');
    expect(defaultStockPolicy('MANUFACTURED')).toBe('RECIPE_BASED');
  });
});

describe('saleStockBehavior (TDR §9.2)', () => {
  it('STANDARD/STRICT → pré-contrôle + décrément', () => {
    expect(saleStockBehavior('STANDARD', 'STRICT')).toEqual({ precheck: true, decrement: true });
  });

  it('STANDARD/ALLOW_NEGATIVE → pas de blocage mais décrément (stock négatif possible)', () => {
    expect(saleStockBehavior('STANDARD', 'ALLOW_NEGATIVE')).toEqual({
      precheck: false,
      decrement: true,
    });
  });

  it('STANDARD/NO_STOCK → stock totalement ignoré', () => {
    expect(saleStockBehavior('STANDARD', 'NO_STOCK')).toEqual({
      precheck: false,
      decrement: false,
    });
  });

  it('RECIPE_BASED sur produit à stock direct → repli STRICT (mauvaise config)', () => {
    expect(saleStockBehavior('STANDARD', 'RECIPE_BASED')).toEqual({
      precheck: true,
      decrement: true,
    });
  });

  it('SERVICE/MANUFACTURED → jamais de stock direct, quelle que soit la politique', () => {
    for (const policy of ['STRICT', 'ALLOW_NEGATIVE', 'NO_STOCK', 'RECIPE_BASED'] as const) {
      expect(saleStockBehavior('SERVICE', policy)).toEqual({ precheck: false, decrement: false });
      expect(saleStockBehavior('MANUFACTURED', policy)).toEqual({
        precheck: false,
        decrement: false,
      });
    }
  });

  it('type/politique absents (pré-migration, cache offline) → STANDARD/STRICT', () => {
    expect(saleStockBehavior(undefined, undefined)).toEqual({ precheck: true, decrement: true });
    expect(saleStockBehavior(null, null)).toEqual({ precheck: true, decrement: true });
  });
});
