/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Recettes Food (Milestone 3 — TDR §9.5) et tables d'établissement.
 *   Une recette lie un produit MANUFACTURED à ses ingrédients (produits à stock
 *   direct) : à la vente du plat, les ingrédients sont décrémentés si la recette
 *   est active. Les quantités d'ingrédients suivent la convention milli-unités
 *   (§19.1) : elles sont exprimées dans l'ÉCHELLE DE L'INGRÉDIENT.
 * @created 2026-07-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { z } from 'zod';
import { IdSchema } from './common.js';
import { ProductTypeSchema, UnitKindSchema } from './product.js';

// ───────────────────────────── Recettes ─────────────────────────────

export const RecipeItemInputSchema = z.object({
  ingredientProductId: IdSchema,
  /** Quantité consommée PAR PLAT VENDU, en unités PERSISTÉES de l'ingrédient
   *  (milli-unités pour WEIGHT/VOLUME — l'UI convertit la saisie décimale). */
  quantite: z.number().int().positive(),
});
export type RecipeItemInput = z.infer<typeof RecipeItemInputSchema>;

/** Remplace intégralement la recette d'un produit (upsert idempotent). */
export const UpsertRecipeSchema = z.object({
  active: z.boolean().default(true),
  items: z
    .array(RecipeItemInputSchema)
    .min(1)
    .max(50)
    .refine(
      (items) => new Set(items.map((i) => i.ingredientProductId)).size === items.length,
      'Un ingrédient ne peut apparaître qu’une seule fois dans la recette',
    ),
});
export type UpsertRecipeInput = z.infer<typeof UpsertRecipeSchema>;

export const RecipeItemDtoSchema = z.object({
  id: IdSchema,
  ingredientProductId: IdSchema,
  ingredientNom: z.string(),
  ingredientType: ProductTypeSchema,
  ingredientUnitKind: UnitKindSchema,
  ingredientBaseUnit: z.string().nullable(),
  quantite: z.number().int().positive(),
});
export type RecipeItemDto = z.infer<typeof RecipeItemDtoSchema>;

export const RecipeDtoSchema = z.object({
  id: IdSchema,
  productId: IdSchema,
  active: z.boolean(),
  items: z.array(RecipeItemDtoSchema),
});
export type RecipeDto = z.infer<typeof RecipeDtoSchema>;

// ─────────────────────── Tables (établissement FOOD) ───────────────────────

export const CreateFoodTableSchema = z.object({
  nom: z.string().min(1).max(60),
});
export type CreateFoodTableInput = z.infer<typeof CreateFoodTableSchema>;

export const UpdateFoodTableSchema = z.object({
  nom: z.string().min(1).max(60).optional(),
  actif: z.boolean().optional(),
});
export type UpdateFoodTableInput = z.infer<typeof UpdateFoodTableSchema>;

export interface FoodTableDto {
  id: string;
  etablissementId: string;
  nom: string;
  actif: boolean;
}
