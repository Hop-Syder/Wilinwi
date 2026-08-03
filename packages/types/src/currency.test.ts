/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Tests unitaires pour la modélisation et conversion multi-devises (Module 1).
 * @created 2026-08-03
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { describe, expect, it } from 'vitest';
import { convertFromPivot, convertToPivot, formatCurrencyAmount } from './currency.js';

describe('Currency Conversion & Formatting', () => {
  it('doit préserver le montant pour les devises FCFA (XOF/XAF)', () => {
    expect(convertFromPivot(10000, 'XOF')).toBe(10000);
    expect(convertFromPivot(10000, 'XAF')).toBe(10000);
    expect(convertToPivot(10000, 'XOF')).toBe(10000);
  });

  it('doit convertir 6000 FCFA en USD (~10 USD) et réciproquement', () => {
    const usdAmount = convertFromPivot(6000, 'USD');
    expect(usdAmount).toBe(10.02);

    const pivotAmount = convertToPivot(10, 'USD');
    expect(pivotAmount).toBe(5988);
  });

  it('doit convertir 1000 FCFA en GNF et NGN', () => {
    const gnf = convertFromPivot(1000, 'GNF');
    expect(gnf).toBe(14300);

    const ngn = convertFromPivot(1000, 'NGN');
    expect(ngn).toBe(2500);
  });

  it('doit formater correctement les montants par devise', () => {
    expect(formatCurrencyAmount(10000, 'XOF')).toContain('FCFA');
    expect(formatCurrencyAmount(50.5, 'USD')).toContain('$');
    expect(formatCurrencyAmount(2500, 'NGN')).toContain('₦');
  });
});
