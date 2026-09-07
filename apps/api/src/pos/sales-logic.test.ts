/**
 * Tests unitaires de la logique pure de décision des ventes (POS).
 * Chaque test documente un invariant métier réel : plancher d'acompte, statuts
 * de paiement, plafond de crédit et ventilation du paiement mixte.
 */
import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  exceedsCreditLimit,
  installmentStatus,
  projectedCreditDebt,
  resolveAcompte,
  resolvePayment,
  splitMixedPayment,
} from './sales-logic';

describe('resolveAcompte — acompte exigé', () => {
  it('hors INSTALLMENT, aucun acompte exigé (0)', () => {
    for (const m of ['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CREDIT'] as const) {
      expect(resolveAcompte(m, undefined, 5000)).toBe(0);
    }
  });

  it('INSTALLMENT : renvoie le versement demandé', () => {
    expect(resolveAcompte('INSTALLMENT', 2000, 5000)).toBe(2000);
  });

  it('INSTALLMENT sans versement (ou nul) → refusé', () => {
    expect(() => resolveAcompte('INSTALLMENT', undefined, 5000)).toThrow(BadRequestException);
    expect(() => resolveAcompte('INSTALLMENT', 0, 5000)).toThrow(BadRequestException);
  });

  it('INSTALLMENT : un acompte supérieur au total → refusé', () => {
    expect(() => resolveAcompte('INSTALLMENT', 6000, 5000)).toThrow(BadRequestException);
  });
});

describe('resolvePayment — encaissement et statut final', () => {
  it('comptant (CASH/MOBILE_MONEY/BANK_TRANSFER) : encaisse tout, COMPLETED', () => {
    for (const m of ['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER'] as const) {
      expect(resolvePayment(m, 5000, 0)).toEqual({ montantVerse: 5000, status: 'COMPLETED' });
    }
  });

  it('CREDIT : aucun encaissement immédiat, PENDING_PAYMENT', () => {
    expect(resolvePayment('CREDIT', 5000, 0)).toEqual({
      montantVerse: 0,
      status: 'PENDING_PAYMENT',
    });
  });

  it('INSTALLMENT partiel : encaisse l’acompte, PENDING_PAYMENT', () => {
    expect(resolvePayment('INSTALLMENT', 5000, 2000)).toEqual({
      montantVerse: 2000,
      status: 'PENDING_PAYMENT',
    });
  });

  it('INSTALLMENT couvrant la totalité : COMPLETED', () => {
    expect(resolvePayment('INSTALLMENT', 5000, 5000)).toEqual({
      montantVerse: 5000,
      status: 'COMPLETED',
    });
  });
});

describe('installmentStatus — statut d’acompte', () => {
  it('rien versé → PENDING', () => {
    expect(installmentStatus(5000, 0)).toBe('PENDING');
  });

  it('versement partiel → PARTIAL', () => {
    expect(installmentStatus(5000, 2000)).toBe('PARTIAL');
  });

  it('versement total → SETTLED', () => {
    expect(installmentStatus(5000, 5000)).toBe('SETTLED');
    expect(installmentStatus(5000, 6000)).toBe('SETTLED');
  });
});

describe('projectedCreditDebt — dette projetée', () => {
  it('CREDIT fait porter tout le total', () => {
    expect(projectedCreditDebt('CREDIT', 5000, 0)).toBe(5000);
  });

  it('INSTALLMENT ne porte que le reste après acompte', () => {
    expect(projectedCreditDebt('INSTALLMENT', 5000, 2000)).toBe(3000);
  });
});

describe('exceedsCreditLimit — plafond de crédit (§6.2)', () => {
  it('plafond null → illimité (jamais dépassé)', () => {
    expect(exceedsCreditLimit(100000, null, 5000)).toBe(false);
  });

  it('dette projetée atteignant exactement le plafond → autorisé', () => {
    expect(exceedsCreditLimit(5000, 10000, 5000)).toBe(false);
  });

  it('dette projetée dépassant le plafond → refusé', () => {
    expect(exceedsCreditLimit(5001, 10000, 5000)).toBe(true);
  });
});

describe('splitMixedPayment — ventilation du paiement mixte', () => {
  it('compte CAISSE : tout est espèces, pas de ventilation', () => {
    expect(splitMixedPayment('CAISSE', 3000, 1000)).toEqual({ espece: 0, reste: 3000 });
  });

  it('compte non-caisse : part espèces bornée au versé, reste sur le compte', () => {
    expect(splitMixedPayment('MOBILE_MONEY', 3000, 1000)).toEqual({ espece: 1000, reste: 2000 });
  });

  it('part espèces supérieure au versé → plafonnée au versé', () => {
    expect(splitMixedPayment('BANQUE', 3000, 5000)).toEqual({ espece: 3000, reste: 0 });
  });

  it('part espèces négative ou absente → aucune espèce', () => {
    expect(splitMixedPayment('MOBILE_MONEY', 3000, -500)).toEqual({ espece: 0, reste: 3000 });
    expect(splitMixedPayment('MOBILE_MONEY', 3000, undefined)).toEqual({ espece: 0, reste: 3000 });
  });
});
