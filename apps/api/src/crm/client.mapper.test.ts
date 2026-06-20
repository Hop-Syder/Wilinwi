import { describe, expect, it } from 'vitest';
import type { Client } from '@wilinwi/db';
import { toClientDto } from './client.mapper';

const client: Client = {
  id: 'c1',
  tenantId: 't1',
  nom: 'Aïcha',
  telephone: '+22890000000',
  soldeCredit: 12000,
  plafondCredit: 50000,
  notes: null,
  actif: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('toClientDto — sécurité au niveau champ (CRM)', () => {
  it('OWNER/MANAGER/CASHIER voient solde et plafond de crédit', () => {
    for (const role of ['OWNER', 'MANAGER', 'CASHIER'] as const) {
      const dto = toClientDto(client, role);
      expect(dto.soldeCredit).toBe(12000);
      expect(dto.plafondCredit).toBe(50000);
    }
  });

  it('SELLER/DELIVERY voient l\'identité mais PAS la dette ni le plafond', () => {
    for (const role of ['SELLER', 'DELIVERY'] as const) {
      const dto = toClientDto(client, role);
      expect(dto.nom).toBe('Aïcha');
      expect(dto.soldeCredit).toBeUndefined();
      expect(dto.plafondCredit).toBeUndefined();
    }
  });
});
