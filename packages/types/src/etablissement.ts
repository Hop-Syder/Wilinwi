/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Définitions de types partagés : etablissement.ts
 *   Établissement = lieu physique d'exploitation d'une Entreprise (= tenant).
 * @created 2026-06-27
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { z } from 'zod';

/** Types d'établissement supportés (lieux physiques). */
export const ETABLISSEMENT_TYPES = [
  'BOUTIQUE',
  'SUPERMARCHE',
  'PHARMACIE',
  'RESTAURANT',
  'ENTREPOT',
  'AGENCE',
  'BUREAU',
  'USINE',
] as const;
export type EtablissementType = (typeof ETABLISSEMENT_TYPES)[number];
export const EtablissementTypeSchema = z.enum(ETABLISSEMENT_TYPES);

/** Libellés affichables (FR) par type d'établissement. */
export const ETABLISSEMENT_TYPE_LABELS: Record<EtablissementType, string> = {
  BOUTIQUE: 'Boutique',
  SUPERMARCHE: 'Supermarché',
  PHARMACIE: 'Pharmacie',
  RESTAURANT: 'Restaurant',
  ENTREPOT: 'Entrepôt',
  AGENCE: 'Agence',
  BUREAU: 'Bureau',
  USINE: 'Usine',
};

export const CreateEtablissementSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  type: EtablissementTypeSchema.default('BOUTIQUE'),
  ville: z.string().min(1).nullable().optional(),
  adresse: z.string().min(1).nullable().optional(),
  telephone: z.string().min(1).nullable().optional(),
});
export type CreateEtablissementInput = z.infer<typeof CreateEtablissementSchema>;

export const UpdateEtablissementSchema = z.object({
  nom: z.string().min(1).optional(),
  type: EtablissementTypeSchema.optional(),
  ville: z.string().min(1).nullable().optional(),
  adresse: z.string().min(1).nullable().optional(),
  telephone: z.string().min(1).nullable().optional(),
  actif: z.boolean().optional(),
});
export type UpdateEtablissementInput = z.infer<typeof UpdateEtablissementSchema>;

/** Vue d'un établissement renvoyée au client. */
export interface EtablissementDto {
  id: string;
  nom: string;
  type: EtablissementType;
  ville: string | null;
  adresse: string | null;
  telephone: string | null;
  actif: boolean;
}
