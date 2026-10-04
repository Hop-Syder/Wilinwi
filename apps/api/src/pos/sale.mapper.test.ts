/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Mapper DTO/Entité pour sale.mapper.test.ts
 * @created 2026-06-20
 * @updated 2026-07-04
 * 🌐 nexus-partners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { describe, expect, it } from 'vitest';
import { toSaleDto } from './sale.mapper';

const sale = {
  id: 's1',
  total: 3600,
  status: 'COMPLETED',
  items: [
    {
      id: 'i1',
      prixReel: 1800,
      quantite: 2,
      coutUnitaire: 1000, // = prix d'achat figé (sensible)
    },
  ],
};

describe('toSaleDto — sécurité au niveau champ (ventes)', () => {
  it('OWNER/MANAGER voient coutUnitaire', () => {
    for (const role of ['OWNER', 'MANAGER'] as const) {
      const dto = toSaleDto(sale, role);
      expect(dto.items[0]!.coutUnitaire).toBe(1000);
    }
  });

  it('SELLER/CASHIER/DELIVERY ne voient PAS coutUnitaire', () => {
    for (const role of ['SELLER', 'CASHIER', 'DELIVERY'] as const) {
      const dto = toSaleDto(sale, role);
      const item = dto.items[0] as Record<string, unknown>;
      expect(item.coutUnitaire).toBeUndefined();
      // prixReel reste visible (nécessaire au reçu)
      expect(item.prixReel).toBe(1800);
    }
  });
});

describe('toSaleDto — quantités décimales (§19.1)', () => {
  it('ligne au poids : 250 milli-kg sortent en 0,25 (prixReel × quantite = montant)', () => {
    const weighed = {
      id: 's2',
      total: 750,
      items: [{ id: 'i2', prixReel: 3000, quantite: 250, quantiteRetournee: 0, quantityScale: 1000, coutUnitaire: 1800 }],
    };
    for (const role of ['OWNER', 'CASHIER'] as const) {
      const item = toSaleDto(weighed, role).items[0]!;
      expect(item.quantite).toBe(0.25);
      expect(item.prixReel * item.quantite).toBe(750);
    }
  });

  it('ligne à la pièce : inchangée', () => {
    expect(toSaleDto(sale, 'OWNER').items[0]!.quantite).toBe(2);
  });
});
