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
  attributs: z.record(z.string(), z.string()), // ex: { taille: 'L', couleur: 'rouge' }
  stock: QuantitySchema.default(0),
  sku: z.string().min(1).optional(),
});
export type ProductVariantInput = z.infer<typeof ProductVariantInputSchema>;

export const CreateProductSchema = z.object({
  nom: z.string().min(1),
  sku: z.string().min(1).optional(),
  categorie: z.string().min(1).optional(),
  photos: z.array(z.string().url()).default([]),
  prixAchat: MoneySchema,
  prixPlancher: MoneySchema,
  prixCatalogue: MoneySchema,
  stock: QuantitySchema.default(0),
  variants: z.array(ProductVariantInputSchema).default([]),
});
export type CreateProductInput = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchema.partial();
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
  stock: QuantitySchema,
  // Sensibles — présents seulement pour OWNER/MANAGER :
  prixAchat: MoneySchema.optional(),
  prixPlancher: MoneySchema.optional(),
});
export type ProductDto = z.infer<typeof ProductDtoSchema>;

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
