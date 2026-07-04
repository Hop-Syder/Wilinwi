/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Mapper DTO/Entité pour sale.mapper.test.ts
 * @created 2026-06-20
 * @updated 2026-07-04
 * 🌐 ceo.nexuspartners.xyz
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
