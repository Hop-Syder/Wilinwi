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
import {
  applySaleStockToProducts,
  defaultStockPolicy,
  formatQuantity,
  nearestExpiry,
  productAffectsStock,
  saleStockBehavior,
  sellableBatchQuantity,
  toDisplayQuantity,
  toStoredQuantity,
} from './product.js';
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

describe('applySaleStockToProducts (anti-oversell offline)', () => {
  const products = [
    { id: 'p1', type: 'STANDARD' as const, stockPolicy: 'STRICT' as const, stock: 10 },
    { id: 'p2', type: 'SERVICE' as const, stockPolicy: 'NO_STOCK' as const, stock: 0 },
    {
      id: 'p3',
      type: 'STANDARD' as const,
      stockPolicy: 'STRICT' as const,
      stock: 8,
      variants: [{ id: 'v1', stock: 5 }],
    },
  ];

  it('debit : décrémente le STANDARD, ignore le SERVICE', () => {
    const out = applySaleStockToProducts(
      products,
      [
        { productId: 'p1', quantite: 3 },
        { productId: 'p2', quantite: 2 },
      ],
      'debit',
    );
    expect(out.find((p) => p.id === 'p1')?.stock).toBe(7);
    expect(out.find((p) => p.id === 'p2')?.stock).toBe(0);
  });

  it('debit avec variante : décrémente le parent ET la variante', () => {
    const out = applySaleStockToProducts(
      products,
      [{ productId: 'p3', variantId: 'v1', quantite: 2 }],
      'debit',
    );
    const p3 = out.find((p) => p.id === 'p3')!;
    expect(p3.stock).toBe(6);
    expect(p3.variants?.[0]?.stock).toBe(3);
  });

  it('credit annule exactement un debit (vente écartée)', () => {
    const items = [{ productId: 'p1', quantite: 4 }];
    const roundTrip = applySaleStockToProducts(
      applySaleStockToProducts(products, items, 'debit'),
      items,
      'credit',
    );
    expect(roundTrip.find((p) => p.id === 'p1')?.stock).toBe(10);
  });

  it('fonction pure : le tableau source est intact', () => {
    applySaleStockToProducts(products, [{ productId: 'p1', quantite: 3 }], 'debit');
    expect(products[0]!.stock).toBe(10);
  });
});

describe('applySaleStockToProducts — lots BATCHED (snapshot FEFO)', () => {
  const nowRef = new Date('2026-07-05T12:00:00Z');
  void nowRef;
  const produits = [
    {
      id: 'b1',
      type: 'BATCHED' as const,
      stockPolicy: 'STRICT' as const,
      stock: 130,
      batches: [
        { id: 'lotA', expiresAt: new Date('2026-10-01'), quantite: 30 },
        { id: 'lotB', expiresAt: new Date('2027-01-01'), quantite: 100 },
      ],
    },
  ];

  it('debit FEFO : le lot le plus proche de péremption sort d’abord', () => {
    const out = applySaleStockToProducts(produits, [{ productId: 'b1', quantite: 40 }], 'debit');
    const b = out[0]!;
    expect(b.stock).toBe(90);
    expect(b.batches?.find((x) => x.id === 'lotA')?.quantite).toBe(0);
    expect(b.batches?.find((x) => x.id === 'lotB')?.quantite).toBe(90);
  });

  it('credit : total restauré (répartition par lot = approximation locale, le serveur fait foi)', () => {
    const debited = applySaleStockToProducts(produits, [{ productId: 'b1', quantite: 40 }], 'debit');
    const back = applySaleStockToProducts(debited, [{ productId: 'b1', quantite: 40 }], 'credit');
    expect(back[0]!.stock).toBe(130);
    const total = back[0]!.batches!.reduce((sum, b) => sum + b.quantite, 0);
    expect(total).toBe(130); // Σ lots = stock : l'invariant local tient
  });
});

describe('milli-unités (quantités décimales, persistance entière)', () => {
  it('WEIGHT/VOLUME : ×1000 au stockage, ÷1000 à l’affichage', () => {
    expect(toStoredQuantity(1.5, 'WEIGHT')).toBe(1500);
    expect(toStoredQuantity(0.33, 'VOLUME')).toBe(330);
    expect(toDisplayQuantity(1500, 'WEIGHT')).toBe(1.5);
  });

  it('UNIT/PACKAGE/TIME et types absents : échelle 1 (rétro-compatible)', () => {
    expect(toStoredQuantity(24, 'UNIT')).toBe(24);
    expect(toStoredQuantity(24, undefined)).toBe(24);
    expect(toDisplayQuantity(24, null)).toBe(24);
  });

  it('formatQuantity : « 1,5 kg » pour le poids, nombre nu pour l’unité', () => {
    expect(formatQuantity(1500, 'WEIGHT', 'kg')).toBe('1,5 kg');
    expect(formatQuantity(330, 'VOLUME', 'L')).toBe('0,33 L');
    expect(formatQuantity(24, 'UNIT', null)).toBe('24');
  });

  it('arrondi au milli le plus proche (pas de flottant persisté)', () => {
    expect(toStoredQuantity(0.1 + 0.2, 'WEIGHT')).toBe(300);
  });
});

describe('lots & péremption (Health M4)', () => {
  const now = new Date('2026-07-05T12:00:00Z');
  const batches = [
    { expiresAt: new Date('2026-07-01'), quantite: 50 }, // périmé
    { expiresAt: new Date('2026-08-01'), quantite: 30 }, // proche
    { expiresAt: new Date('2027-01-01'), quantite: 100 },
    { expiresAt: new Date('2026-09-01'), quantite: 0 }, // vide
  ];

  it('sellableBatchQuantity exclut les périmés et les lots vides', () => {
    expect(sellableBatchQuantity(batches, now)).toBe(130);
    expect(sellableBatchQuantity([], now)).toBe(0);
    expect(sellableBatchQuantity(undefined, now)).toBe(0);
  });

  it('nearestExpiry = péremption la plus proche parmi les vendables', () => {
    expect(nearestExpiry(batches, now)?.toISOString().slice(0, 10)).toBe('2026-08-01');
    expect(nearestExpiry([{ expiresAt: new Date('2026-07-01'), quantite: 5 }], now)).toBeNull();
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
