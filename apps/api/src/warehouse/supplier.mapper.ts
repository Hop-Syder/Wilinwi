import type { Supplier } from '@wilinwi/db';
import type { SupplierDto } from '@wilinwi/types';

export function toSupplierDto(s: Supplier): SupplierDto {
  return {
    id: s.id,
    nom: s.nom,
    telephone: s.telephone,
    contact: s.contact,
    adresse: s.adresse,
    notes: s.notes,
    soldeDette: s.soldeDette,
    actif: s.actif,
  };
}
