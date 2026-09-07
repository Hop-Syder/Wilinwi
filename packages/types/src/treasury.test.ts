/**
 * Tests unitaires du mapping mode de paiement → compte de trésorerie (§6.1).
 */
import { describe, expect, it } from 'vitest';
import { accountForPayment } from './treasury.js';

describe('accountForPayment — mode de paiement → compte crédité', () => {
  it('CASH et INSTALLMENT créditent la CAISSE', () => {
    expect(accountForPayment('CASH')).toBe('CAISSE');
    expect(accountForPayment('INSTALLMENT')).toBe('CAISSE');
  });

  it('MOBILE_MONEY crédite MOBILE_MONEY', () => {
    expect(accountForPayment('MOBILE_MONEY')).toBe('MOBILE_MONEY');
  });

  it('BANK_TRANSFER crédite la BANQUE', () => {
    expect(accountForPayment('BANK_TRANSFER')).toBe('BANQUE');
  });

  it('CREDIT ne crédite aucun compte (aucun encaissement immédiat)', () => {
    expect(accountForPayment('CREDIT')).toBeNull();
  });
});
