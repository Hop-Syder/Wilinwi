import { canSeeClientCredit, type ClientDto, type Role } from '@wilinwi/types';
import type { Client } from '@wilinwi/db';

/**
 * Unique point de sortie des clients. Retire `soldeCredit` et `plafondCredit`
 * (dette/plafond — sensibles) pour les rôles sans `client:view_credit` (§9).
 */
export function toClientDto(client: Client, role: Role): ClientDto {
  const base: ClientDto = {
    id: client.id,
    nom: client.nom,
    telephone: client.telephone,
    notes: client.notes,
  };
  if (canSeeClientCredit(role)) {
    base.soldeCredit = client.soldeCredit;
    base.plafondCredit = client.plafondCredit;
  }
  return base;
}
