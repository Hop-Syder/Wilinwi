/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Définitions de types partagés : product.ts
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { z } from 'zod';
import { IdSchema, MoneySchema, QuantitySchema } from './common.js';

/**
 * Système à 3 prix produit (le 4ᵉ, prix_reel, est porté par chaque vente).
 * Contrainte métier : prix_achat ≤ prix_plancher ≤ prix_catalogue.
 */
export const ProductPricesSchema = z
  .object({
    prixAchat: MoneySchema, // prix d'achat (coût)
    prixPlancher: MoneySchema, // prix minimum de vente
    prixCatalogue: MoneySchema, // prix affiché maximum
  })
  .refine((p) => p.prixAchat <= p.prixPlancher && p.prixPlancher <= p.prixCatalogue, {
    message: 'Doit respecter : prix_achat ≤ prix_plancher ≤ prix_catalogue',
  });

export const ProductVariantInputSchema = z.object({
  id: IdSchema.optional(),
  attributs: z.record(z.string(), z.string()), // ex: { taille: 'L', couleur: 'rouge' }
  stock: QuantitySchema.default(0),
  sku: z.string().min(1).optional(),
});
export type ProductVariantInput = z.infer<typeof ProductVariantInputSchema>;

export const ProductVariantDtoSchema = z.object({
  id: IdSchema,
  productId: IdSchema,
  attributs: z.record(z.string(), z.string()),
  sku: z.string().nullable(),
  stock: QuantitySchema,
});
export type ProductVariantDto = z.infer<typeof ProductVariantDtoSchema>;

const CreateProductSchemaBase = z.object({
  nom: z.string().min(1),
  sku: z.string().min(1).optional(),
  categorie: z.string().min(1).optional(),
  photos: z.array(z.string().url()).default([]),
  prixAchat: MoneySchema,
  prixPlancher: MoneySchema,
  prixCatalogue: MoneySchema,
  stock: QuantitySchema.default(0),
  seuilAlerte: QuantitySchema.default(5),
  variants: z.array(ProductVariantInputSchema).default([]),
});

export const CreateProductSchema = CreateProductSchemaBase.superRefine((data, ctx) => {
  if (!(data.prixAchat <= data.prixPlancher && data.prixPlancher <= data.prixCatalogue)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Doit respecter : prix_achat ≤ prix_plancher ≤ prix_catalogue',
      path: ['prixCatalogue'],
    });
  }
});
export type CreateProductInput = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchemaBase.partial().superRefine((data, ctx) => {
  // If all three prices are provided, check the condition
  if (
    data.prixAchat !== undefined &&
    data.prixPlancher !== undefined &&
    data.prixCatalogue !== undefined
  ) {
    if (!(data.prixAchat <= data.prixPlancher && data.prixPlancher <= data.prixCatalogue)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Doit respecter : prix_achat ≤ prix_plancher ≤ prix_catalogue',
        path: ['prixCatalogue'],
      });
    }
  }
  // Note: if only one or two prices are updated, we can't reliably check against the missing one(s) here.
  // The database constraints or service layer should ideally handle cross-field validation on partial updates.
});
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;

/**
 * DTO public d'un produit. Les champs sensibles sont optionnels :
 * ils sont retirés pour les rôles SELLER/CASHIER/DELIVERY (cf. canSeeSensitivePricing).
 */
export const ProductDtoSchema = z.object({
  id: IdSchema,
  nom: z.string(),
  sku: z.string().nullable(),
  categorie: z.string().nullable(),
  photos: z.array(z.string()),
  prixCatalogue: MoneySchema,
  // Plancher : toujours présent (visible par tous, sert à négocier).
  prixPlancher: MoneySchema,
  stock: QuantitySchema,
  seuilAlerte: QuantitySchema,
  variants: z.array(ProductVariantDtoSchema).default([]),
  // Coût d'achat : sensible — présent uniquement pour OWNER/MANAGER.
  prixAchat: MoneySchema.optional(),
  // Breakdown du stock par établissement (ex: { "uuid-A": 12, "uuid-B": 8 }).
  // Présent uniquement dans la vue globale stock (OWNER/MANAGER).
  stockParEtablissement: z.record(z.string(), z.number()).optional(),
});
export type ProductDto = z.infer<typeof ProductDtoSchema>;

/** Seuil de réappro d'un produit à un emplacement précis (alerte stock bas). */
export const SetStockThresholdSchema = z.object({
  etablissementId: IdSchema,
  variantId: IdSchema.nullable().optional(),
  quantiteMin: QuantitySchema.refine((q) => q >= 0, 'Le seuil doit être positif ou nul'),
});
export type SetStockThresholdInput = z.infer<typeof SetStockThresholdSchema>;

/** Alerte de stock bas pour un (produit/variante × établissement). */
export interface StockAlertDto {
  productId: string;
  productNom: string;
  variantId: string | null;
  etablissementId: string;
  etablissementNom: string | null;
  quantite: number;
  quantiteMin: number;
}

/** Types de mouvement de stock. */
export const STOCK_MOVEMENT_TYPES = ['IN', 'OUT', 'ADJUST'] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];
export const StockMovementTypeSchema = z.enum(STOCK_MOVEMENT_TYPES);

export const CreateStockMovementSchema = z.object({
  productId: IdSchema,
  variantId: IdSchema.optional(),
  type: StockMovementTypeSchema,
  quantite: QuantitySchema.refine((q) => q !== 0, 'La quantité ne peut pas être nulle'),
  motif: z.string().min(1),
});
export type CreateStockMovementInput = z.infer<typeof CreateStockMovementSchema>;

export const CreateStockTransferSchema = z.object({
  productId: IdSchema,
  variantId: IdSchema.optional(),
  sourceEtablissementId: IdSchema,
  destinationEtablissementId: IdSchema,
  quantite: QuantitySchema.refine((q) => q > 0, 'La quantité doit être strictement supérieure à 0'),
});
export type CreateStockTransferInput = z.infer<typeof CreateStockTransferSchema>;
