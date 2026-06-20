/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Mapper DTO/Entité pour sale.mapper.test.ts
 * @created 2026-06-20
 * @updated 2026-06-20
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
      priceOverride: {
        id: 'o1',
        prixApplique: 1800,
        prixPlancher: 1500, // sensible
        motif: 'Négociation',
      },
    },
  ],
};

describe('toSaleDto — sécurité au niveau champ (ventes)', () => {
  it('OWNER/MANAGER voient coutUnitaire et prixPlancher', () => {
    for (const role of ['OWNER', 'MANAGER'] as const) {
      const dto = toSaleDto(sale, role);
      expect(dto.items[0]!.coutUnitaire).toBe(1000);
      expect(dto.items[0]!.priceOverride!.prixPlancher).toBe(1500);
    }
  });

  it('SELLER/CASHIER/DELIVERY ne voient NI coutUnitaire NI prixPlancher', () => {
    for (const role of ['SELLER', 'CASHIER', 'DELIVERY'] as const) {
      const dto = toSaleDto(sale, role);
      const item = dto.items[0] as Record<string, unknown>;
      expect(item.coutUnitaire).toBeUndefined();
      // prixReel reste visible (nécessaire au reçu)
      expect(item.prixReel).toBe(1800);
      const override = item.priceOverride as Record<string, unknown>;
      expect(override.prixPlancher).toBeUndefined();
      expect(override.prixApplique).toBe(1800);
    }
  });
});
