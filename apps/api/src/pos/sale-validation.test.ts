/**
 * Tests unitaires de la validation serveur des ventes (sale-validation) : les
 * règles réaffirmées au moment du sync — et appliquées à l'identique en ligne.
 * Chaque règle est testée par un rejet avec son motif structuré (`kind`) ET par
 * une vente légitime acceptée, pour cadrer le risque de faux positifs.
 */
import { describe, expect, it } from 'vitest';
import type { SaleItemInput } from '@wilinwi/types';
import {
  aggregateDemand,
  assertAcompteCoherent,
  assertCreditWithinLimit,
  assertDemandWithinStock,
  lineKey,
  SaleValidationError,
  validateSaleLine,
  type LineProduct,
  type LineServerData,
} from './sale-validation';

const PRODUIT_ID = '11111111-1111-1111-1111-111111111111';
const VARIANTE_ID = '22222222-2222-2222-2222-222222222222';
const AUTRE_PRODUIT_ID = '33333333-3333-3333-3333-333333333333';

const produit = (over: Partial<LineProduct> = {}): LineProduct => ({
  id: PRODUIT_ID,
  nom: 'Ciment 50kg',
  prixAchat: 4_000,
  prixPlancher: 5_000,
  actif: true,
  variantIds: [VARIANTE_ID],
  ...over,
});

const serveur = (over: Partial<LineServerData> = {}): LineServerData => ({
  product: produit(),
  hasEtablissement: true,
  availableStock: async () => 10,
  ...over,
});

const ligne = (over: Partial<SaleItemInput> = {}): SaleItemInput => ({
  productId: PRODUIT_ID,
  quantite: 2,
  prixReel: 5_000,
  ...over,
});

describe('validateSaleLine — existence du produit', () => {
  it('produit introuvable → rejeté avec PRODUCT_NOT_FOUND (404, comme avant)', async () => {
    const err = await validateSaleLine(ligne({ productId: PRODUIT_ID }), serveur({ product: null })).catch(
      (e) => e,
    );
    expect(err).toBeInstanceOf(SaleValidationError);
    expect(err.kind).toBe('PRODUCT_NOT_FOUND');
    expect(err.getStatus()).toBe(404);
  });

  it('produit existant → ligne validée, coût unitaire pris côté serveur', async () => {
    const validée = await validateSaleLine(
      ligne({ quantite: 2, prixReel: 5_000 }),
      serveur(),
    );
    expect(validée.productId).toBe(PRODUIT_ID);
    expect(validée.coutUnitaire).toBe(4_000);
    expect(validée.variantId).toBeNull();
  });
});

describe('validateSaleLine — statut actif du produit', () => {
  it('produit désactivé depuis la vente → rejeté avec PRODUCT_INACTIVE', async () => {
    const err = await validateSaleLine(
      ligne(),
      serveur({ product: produit({ actif: false }) }),
    ).catch((e) => e);
    expect(err.kind).toBe('PRODUCT_INACTIVE');
  });

  it('produit actif → accepté (cas nominal, zéro faux positif)', async () => {
    await expect(validateSaleLine(ligne(), serveur())).resolves.toBeTruthy();
  });
});

describe('validateSaleLine — cohérence de la variante', () => {
  it('variante inconnue pour le produit → rejeté avec VARIANT_NOT_FOUND', async () => {
    const err = await validateSaleLine(
      ligne({ variantId: '44444444-4444-4444-4444-444444444444' }),
      serveur(),
    ).catch((e) => e);
    expect(err.kind).toBe('VARIANT_NOT_FOUND');
  });

  it('variante existante → acceptée et reportée telle quelle', async () => {
    const validée = await validateSaleLine(ligne({ variantId: VARIANTE_ID }), serveur());
    expect(validée.variantId).toBe(VARIANTE_ID);
  });
});

describe('validateSaleLine — établissement vendeur', () => {
  it('sans établissement courant → rejeté avec NO_ETABLISSEMENT (sans lire le stock)', async () => {
    let stockLu = false;
    const err = await validateSaleLine(ligne(), {
      ...serveur(),
      availableStock: async () => {
        stockLu = true;
        return 10;
      },
      hasEtablissement: false,
    }).catch((e) => e);
    expect(err.kind).toBe('NO_ETABLISSEMENT');
    expect(stockLu).toBe(false);
  });
});

describe('validateSaleLine — disponibilité du stock', () => {
  it('quantité au-delà du stock serveur actuel → rejeté avec STOCK_INSUFFICIENT', async () => {
    const err = await validateSaleLine(ligne({ quantite: 11 }), serveur()).catch((e) => e);
    expect(err.kind).toBe('STOCK_INSUFFICIENT');
    expect(err.message).toContain('Demandé : 11');
    expect(err.message).toContain('Disponible : 10');
  });

  it('quantité exactement au stock disponible → acceptée (borne incluse)', async () => {
    await expect(validateSaleLine(ligne({ quantite: 10 }), serveur())).resolves.toBeTruthy();
  });
});

describe('validateSaleLine — prix plancher (anti-fraude absolu)', () => {
  it('prix sous le plancher serveur → rejeté avec BELOW_FLOOR', async () => {
    const err = await validateSaleLine(ligne({ prixReel: 4_999 }), serveur()).catch((e) => e);
    expect(err.kind).toBe('BELOW_FLOOR');
    expect(err.message).toContain('prix plancher fixe (5000)');
  });

  it('prix égal au plancher → accepté (borne incluse)', async () => {
    await expect(validateSaleLine(ligne({ prixReel: 5_000 }), serveur())).resolves.toBeTruthy();
  });

  it('le stock est vérifié AVANT le plancher (ordre préservé du chemin online)', async () => {
    const err = await validateSaleLine(
      ligne({ quantite: 11, prixReel: 1_000 }),
      serveur(),
    ).catch((e) => e);
    expect(err.kind).toBe('STOCK_INSUFFICIENT');
  });
});

describe('aggregateDemand + assertDemandWithinStock — stock agrégé anti-contournement', () => {
  const lignesDupliquées = [
    { productId: PRODUIT_ID, variantId: null, quantite: 6, prixReel: 5_000, coutUnitaire: 4_000, nom: 'Ciment 50kg' },
    { productId: PRODUIT_ID, variantId: null, quantite: 6, prixReel: 5_000, coutUnitaire: 4_000, nom: 'Ciment 50kg' },
  ];

  it('aggregateDemand somme les lignes dupliquées et sépare les variantes', () => {
    const demand = aggregateDemand([
      ...lignesDupliquées,
      { productId: AUTRE_PRODUIT_ID, variantId: null, quantite: 1, prixReel: 5_000, coutUnitaire: 4_000, nom: 'Fer' },
    ]);
    expect(demand.get(lineKey(PRODUIT_ID, null))?.quantite).toBe(12);
    expect(demand.get(lineKey(AUTRE_PRODUIT_ID, null))?.quantite).toBe(1);
    expect(demand.size).toBe(2);
  });

  it('deux lignes sous le stock individuel mais au-delà du stock réel → rejeté avec STOCK_INSUFFICIENT', async () => {
    const err = await assertDemandWithinStock(aggregateDemand(lignesDupliquées), async () => 10).catch(
      (e) => e,
    );
    expect(err.kind).toBe('STOCK_INSUFFICIENT');
    expect(err.message).toContain('Demandé : 12');
  });

  it('demande agrégée dans les limites du stock → acceptée', async () => {
    const moitié = lignesDupliquées.slice(0, 1);
    await expect(
      assertDemandWithinStock(aggregateDemand(moitié), async () => 10),
    ).resolves.toBeUndefined();
  });
});

describe('assertAcompteCoherent — acompte classé ACOMPTE_INVALID', () => {
  it('acompte nul ou supérieur au total → rejeté avec ACOMPTE_INVALID', () => {
    for (const invalide of [0, -1, 6_000]) {
      try {
        assertAcompteCoherent('INSTALLMENT', invalide, 5_000);
        expect.unreachable('devrait rejeter');
      } catch (e) {
        expect(e).toBeInstanceOf(SaleValidationError);
        expect((e as SaleValidationError).kind).toBe('ACOMPTE_INVALID');
      }
    }
  });

  it('acompte valide (partiel ou total) → renvoyé tel quel', () => {
    expect(assertAcompteCoherent('INSTALLMENT', 2_000, 5_000)).toBe(2_000);
    expect(assertAcompteCoherent('INSTALLMENT', 5_000, 5_000)).toBe(5_000);
    expect(assertAcompteCoherent('CASH', undefined, 5_000)).toBe(0);
  });
});

describe('assertCreditWithinLimit — plafond de crédit classé', () => {
  const client = { soldeCredit: 3_000, plafondCredit: 10_000 };

  it('client introuvable sur une vente à crédit → rejeté avec CLIENT_NOT_FOUND (404)', () => {
    try {
      assertCreditWithinLimit(null, 'CREDIT', 5_000, 0);
      expect.unreachable('devrait rejeter');
    } catch (e) {
      expect((e as SaleValidationError).kind).toBe('CLIENT_NOT_FOUND');
      expect((e as SaleValidationError).getStatus()).toBe(404);
    }
  });

  it('dette projetée au-delà du plafond → rejeté avec CREDIT_LIMIT_EXCEEDED', () => {
    // dette 3 000 + 9 000 = 12 000 > plafond 10 000.
    try {
      assertCreditWithinLimit(client, 'CREDIT', 9_000, 0);
      expect.unreachable('devrait rejeter');
    } catch (e) {
      expect((e as SaleValidationError).kind).toBe('CREDIT_LIMIT_EXCEEDED');
    }
  });

  it('INSTALLMENT : seule la part non versée compte dans la dette projetée', () => {
    // 3 000 + (9 000 − 8 000) = 4 000 ≤ 10 000 → accepté.
    expect(() => assertCreditWithinLimit(client, 'INSTALLMENT', 9_000, 8_000)).not.toThrow();
    // 3 000 + (9 000 − 1 000) = 11 000 > 10 000 → rejeté.
    expect(() => assertCreditWithinLimit(client, 'INSTALLMENT', 9_000, 1_000)).toThrow(
      SaleValidationError,
    );
  });

  it('plafond illimité (null) et limite exacte → acceptés (zéro faux positif)', () => {
    expect(() =>
      assertCreditWithinLimit({ soldeCredit: 3_000, plafondCredit: null }, 'CREDIT', 50_000, 0),
    ).not.toThrow();
    // 3 000 + 7 000 = 10 000 = plafond → la borne incluse est légitime.
    expect(() => assertCreditWithinLimit(client, 'CREDIT', 7_000, 0)).not.toThrow();
  });

  it('vente comptant → jamais soumise au plafond (même client inconnu)', () => {
    expect(() => assertCreditWithinLimit(null, 'CASH', 5_000, 0)).not.toThrow();
  });
});
