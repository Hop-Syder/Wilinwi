/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Mapper DTO/Entité pour product.mapper.test.ts
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { describe, expect, it } from 'vitest';
import type { Product } from '@wilinwi/db';
import { toProductDto } from './product.mapper';

const product: Product = {
  id: 'p1',
  tenantId: 't1',
  nom: 'Pagne Wax',
  sku: 'WAX-6Y',
  categorie: 'Tissus',
  photos: [],
  prixAchat: 8000,
  prixPlancher: 11000,
  prixCatalogue: 15000,
  stock: 24,
  seuilAlerte: 5,
  actif: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('toProductDto — sécurité au niveau champ', () => {
  it('expose les prix sensibles pour OWNER et MANAGER', () => {
    for (const role of ['OWNER', 'MANAGER'] as const) {
      const dto = toProductDto(product, role);
      expect(dto.prixAchat).toBe(8000);
      expect(dto.prixPlancher).toBe(11000);
      expect(dto.prixCatalogue).toBe(15000);
    }
  });

  it('masque prix_achat et prix_plancher pour SELLER/CASHIER/DELIVERY', () => {
    for (const role of ['SELLER', 'CASHIER', 'DELIVERY'] as const) {
      const dto = toProductDto(product, role);
      expect(dto.prixAchat).toBeUndefined();
      expect(dto.prixPlancher).toBeUndefined();
      // Le prix catalogue reste visible pour vendre.
      expect(dto.prixCatalogue).toBe(15000);
    }
  });
});
