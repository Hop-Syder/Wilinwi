/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Tests de la fourchette de prix à la caisse (salePriceBounds /
 *   checkSalePrice) — règle partagée POS ↔ serveur.
 * @created 2026-10-06
 * 🌐 nexus-partners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { describe, expect, it } from 'vitest';
import { checkSalePrice, salePriceBounds, unitFloorPrice } from './product.js';

// Grande Béninoise : bouteille 490 – 500, casier de 12 à 5 900 – 6 000.
const biere = { prixPlancher: 490, prixCatalogue: 500 };
const casier = { factorToBase: 12, salePrice: 6000, floorPrice: 5900 };

describe('salePriceBounds', () => {
  it("à l'unité : plancher ≤ prix ≤ catalogue", () => {
    expect(salePriceBounds(biere)).toEqual({ min: 490, max: 500 });
    expect(salePriceBounds(biere, null)).toEqual({ min: 490, max: 500 });
  });

  it('conditionnement : sa propre fourchette (casier 5 900 – 6 000)', () => {
    expect(salePriceBounds(biere, casier)).toEqual({ min: 5900, max: 6000 });
  });

  it('conditionnement sans tarifs dédiés : unitaires × facteur', () => {
    expect(salePriceBounds(biere, { factorToBase: 12, salePrice: null })).toEqual({ min: 5880, max: 6000 });
    expect(unitFloorPrice({ factorToBase: 12 }, 490)).toBe(5880);
  });

  it('données incohérentes (min > max) : on ne vend jamais sous le minimum', () => {
    expect(salePriceBounds({ prixPlancher: 600, prixCatalogue: 500 })).toEqual({ min: 600, max: 600 });
  });
});

describe('checkSalePrice', () => {
  const b = salePriceBounds(biere, casier);
  it.each([
    [5850, 'low'],
    [5899, 'low'],
    [5900, 'ok'],
    [5950, 'ok'],
    [6000, 'ok'],
    [6001, 'high'],
    [6100, 'high'],
  ] as const)('%i F → %s', (price, expected) => {
    expect(checkSalePrice(price, b)).toBe(expected);
  });
});
