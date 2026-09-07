/**
 * Tests unitaires du lettrage FIFO des remboursements client (§6.2).
 */
import { describe, expect, it } from 'vitest';
import { applyPaymentToInstallment, type InstallmentSnapshot } from './payment-allocation';

describe('applyPaymentToInstallment — lettrage d’un acompte', () => {
  it('remboursement couvrant le restant dû → acompte soldé et vente complétée', () => {
    const inst: InstallmentSnapshot = { total: 10_000, montantVerse: 0, soldeRestant: 10_000 };
    const app = applyPaymentToInstallment(10_000, inst);
    expect(app.aPayer).toBe(10_000);
    expect(app.montantVerse).toBe(10_000);
    expect(app.soldeRestant).toBe(0);
    expect(app.installmentStatus).toBe('SETTLED');
    expect(app.saleStatus).toBe('COMPLETED');
  });

  it('remboursement partiel → acompte partiel, vente en attente', () => {
    const inst: InstallmentSnapshot = { total: 10_000, montantVerse: 2_000, soldeRestant: 8_000 };
    const app = applyPaymentToInstallment(3_000, inst);
    expect(app.aPayer).toBe(3_000);
    expect(app.montantVerse).toBe(5_000);
    expect(app.soldeRestant).toBe(5_000);
    expect(app.installmentStatus).toBe('PARTIAL');
    expect(app.saleStatus).toBe('PENDING_PAYMENT');
  });

  it('remboursement supérieur au restant dû → allocation bornée au restant', () => {
    const inst: InstallmentSnapshot = { total: 10_000, montantVerse: 7_000, soldeRestant: 3_000 };
    const app = applyPaymentToInstallment(50_000, inst);
    expect(app.aPayer).toBe(3_000);
    expect(app.soldeRestant).toBe(0);
    expect(app.installmentStatus).toBe('SETTLED');
    expect(app.saleStatus).toBe('COMPLETED');
  });

  it('lettrage FIFO : la créance la plus ancienne est soldée en premier', () => {
    // Deux ventes en attente (triées par ancienneté) ; 120 rembourse la plus ancienne
    // (reste 100) puis entame la suivante (reste 20).
    const ancienne: InstallmentSnapshot = { total: 10_000, montantVerse: 9_000, soldeRestant: 1_000 };
    const recente: InstallmentSnapshot = { total: 5_000, montantVerse: 0, soldeRestant: 5_000 };

    let remaining = 1_200;
    const first = applyPaymentToInstallment(remaining, ancienne);
    remaining -= first.aPayer;
    const second = applyPaymentToInstallment(remaining, recente);

    expect(first.aPayer).toBe(1_000);
    expect(first.installmentStatus).toBe('SETTLED');
    expect(remaining).toBe(200);
    expect(second.aPayer).toBe(200);
    expect(second.installmentStatus).toBe('PARTIAL');
  });
});
