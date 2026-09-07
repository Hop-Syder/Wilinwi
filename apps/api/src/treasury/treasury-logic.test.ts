/**
 * Tests unitaires de la logique pure de trésorerie : soldes, virement et clôture.
 */
import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  assertSufficientBalance,
  closingAdjustment,
  requireClosingNote,
  sumBalances,
} from './treasury-logic';

describe('sumBalances — soldes par compte = Σ IN − Σ OUT', () => {
  it('aucun mouvement → tous les comptes à zéro', () => {
    expect(sumBalances([])).toEqual({ CAISSE: 0, MOBILE_MONEY: 0, BANQUE: 0 });
  });

  it('les entrées créditent, les sorties débitent', () => {
    const rows = [
      { compte: 'CAISSE' as const, type: 'IN' as const, montant: 10_000 },
      { compte: 'CAISSE' as const, type: 'OUT' as const, montant: 3_000 },
      { compte: 'BANQUE' as const, type: 'IN' as const, montant: 7_000 },
    ];
    expect(sumBalances(rows)).toEqual({ CAISSE: 7_000, MOBILE_MONEY: 0, BANQUE: 7_000 });
  });

  it('le solde peut devenir négatif (découvert) si les sorties excèdent les entrées', () => {
    const rows = [
      { compte: 'CAISSE' as const, type: 'OUT' as const, montant: 5_000 },
    ];
    expect(sumBalances(rows)).toEqual({ CAISSE: -5_000, MOBILE_MONEY: 0, BANQUE: 0 });
  });
});

describe('assertSufficientBalance — virement inter-comptes', () => {
  const balances = { CAISSE: 5_000, MOBILE_MONEY: 0, BANQUE: 1_000 };

  it('refuse si le solde source est insuffisant', () => {
    expect(() => assertSufficientBalance(balances, 'BANQUE', 1_500)).toThrow(BadRequestException);
  });

  it('autorise un virement égal au solde exact', () => {
    expect(() => assertSufficientBalance(balances, 'BANQUE', 1_000)).not.toThrow();
  });

  it('autorise un virement inférieur au solde', () => {
    expect(() => assertSufficientBalance(balances, 'CAISSE', 2_000)).not.toThrow();
  });
});

describe('requireClosingNote — motif obligatoire sur écart', () => {
  it('à l’équilibre, aucun motif requis', () => {
    expect(() => requireClosingNote(0, undefined)).not.toThrow();
  });

  it('un écart avec motif (même entouré d’espaces) est accepté', () => {
    expect(() => requireClosingNote(500, '  comptage erroné  ')).not.toThrow();
  });

  it('un écart sans motif → refusé', () => {
    expect(() => requireClosingNote(500, undefined)).toThrow(BadRequestException);
    expect(() => requireClosingNote(-500, '')).toThrow(BadRequestException);
    expect(() => requireClosingNote(500, '   ')).toThrow(BadRequestException);
  });
});

describe('closingAdjustment — alignement sur le comptage réel', () => {
  it('à l’équilibre, aucun ajustement', () => {
    expect(closingAdjustment(0)).toBeNull();
  });

  it('excédent réel → entrée (IN) du montant de l’écart', () => {
    expect(closingAdjustment(700)).toEqual({ type: 'IN', montant: 700 });
  });

  it('manquant réel → sortie (OUT) de la valeur absolue de l’écart', () => {
    expect(closingAdjustment(-700)).toEqual({ type: 'OUT', montant: 700 });
  });
});
