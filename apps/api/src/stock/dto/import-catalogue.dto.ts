/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description DTO de validation pour l'importation de catalogue produits (import-catalogue.dto.ts)
 * @created 2026-08-01
 * @updated 2026-08-01
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { z } from 'zod';

const optionalImportNumber = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.coerce.number().int().min(0).optional(),
);

export const importCatalogueItemSchema = z
  .object({
    nom: z.string().trim().min(1, 'Le nom du produit est requis').max(255),
    sku: z.string().trim().min(1, 'Le SKU est requis').max(100),
    categorie: z.string().trim().optional(),
    prixAchat: optionalImportNumber,
    prixPlancher: optionalImportNumber,
    prixCatalogue: optionalImportNumber,
    stockInitial: optionalImportNumber,
    seuilAlerte: optionalImportNumber,
  })
  .refine(
    (data) => {
      if (
        data.prixAchat !== undefined &&
        data.prixPlancher !== undefined &&
        data.prixCatalogue !== undefined
      ) {
        return data.prixAchat <= data.prixPlancher && data.prixPlancher <= data.prixCatalogue;
      }
      return true;
    },
    { message: 'Invariants des prix invalides : prixAchat <= prixPlancher <= prixCatalogue requis' },
  );

export const importCataloguePayloadSchema = z.object({
  items: z
    .array(importCatalogueItemSchema)
    .min(1, 'Au moins un produit est requis')
    .max(1000, 'Le nombre d\'articles par import est limité à 1 000'),
});

export type ImportCatalogueItemInput = z.infer<typeof importCatalogueItemSchema>;
export type ImportCataloguePayloadInput = z.infer<typeof importCataloguePayloadSchema>;
