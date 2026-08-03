import { describe, expect, it } from 'vitest';
import { CreateSaleSchema } from './sale.js';

const baseSale = {
  items: [{ productId: '00000000-0000-4000-8000-000000000001', quantite: 1, prixReel: 1_000 }],
};

describe('CreateSaleSchema', () => {
  it('accepte les métadonnées déclaratives d’un paiement Mobile Money', () => {
    expect(CreateSaleSchema.safeParse({
      ...baseSale,
      paymentMethod: 'MOBILE_MONEY',
      momoOperator: 'MTN',
      momoReference: 'SMS-1234',
    }).success).toBe(true);
  });

  it('exige un opérateur pour un paiement Mobile Money', () => {
    expect(CreateSaleSchema.safeParse({
      ...baseSale,
      paymentMethod: 'MOBILE_MONEY',
    }).success).toBe(false);
  });

  it('refuse les métadonnées Mobile Money sur un autre moyen de paiement', () => {
    expect(CreateSaleSchema.safeParse({
      ...baseSale,
      paymentMethod: 'CASH',
      momoOperator: 'MTN',
    }).success).toBe(false);
  });
});
