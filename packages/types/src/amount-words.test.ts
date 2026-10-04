/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Tests du montant en toutes lettres (mention légale des factures).
 * @created 2026-10-04
 * 🌐 nexus-partners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { describe, expect, it } from 'vitest';
import { amountInWords, fcfaInWords } from './amount-words.js';

describe('amountInWords — français traditionnel', () => {
  it.each([
    [0, 'zéro'],
    [1, 'un'],
    [16, 'seize'],
    [17, 'dix-sept'],
    [21, 'vingt et un'],
    [71, 'soixante et onze'],
    [72, 'soixante-douze'],
    [80, 'quatre-vingts'],
    [81, 'quatre-vingt-un'],
    [91, 'quatre-vingt-onze'],
    [99, 'quatre-vingt-dix-neuf'],
    [100, 'cent'],
    [101, 'cent un'],
    [200, 'deux cents'],
    [201, 'deux cent un'],
    [280, 'deux cent quatre-vingts'],
    [1000, 'mille'],
    [1001, 'mille un'],
    [2000, 'deux mille'],
    [80_000, 'quatre-vingt mille'],
    [200_000, 'deux cent mille'],
    [44_475, 'quarante-quatre mille quatre cent soixante-quinze'],
    [1_000_000, 'un million'],
    [1_280_000, 'un million deux cent quatre-vingt mille'],
    [2_000_000_000, 'deux milliards'],
  ])('%i → %s', (n, words) => {
    expect(amountInWords(n)).toBe(words);
  });

  it('négatif et arrondi', () => {
    expect(amountInWords(-5)).toBe('moins cinq');
    expect(amountInWords(749.6)).toBe('sept cent cinquante');
  });
});

describe('fcfaInWords', () => {
  it('accord de « franc » et « de » après million', () => {
    expect(fcfaInWords(1)).toBe('un franc CFA');
    expect(fcfaInWords(750)).toBe('sept cent cinquante francs CFA');
    expect(fcfaInWords(1_250_000)).toBe('un million deux cent cinquante mille francs CFA');
    expect(fcfaInWords(3_000_000)).toBe('trois millions de francs CFA');
  });
});
