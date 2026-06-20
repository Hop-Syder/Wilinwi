/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Définitions de types partagés : inventory.ts
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { z } from 'zod';
import { IdSchema, QuantitySchema } from './common.js';

/** Statut d'une session d'inventaire physique (§5.2). */
export const INVENTORY_STATUSES = ['OPEN', 'VALIDATED', 'CANCELLED'] as const;
export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];

/** 1. Lancer : sélection de tout ou partie du catalogue à recompter. */
export const StartInventorySchema = z.object({
  libelle: z.string().min(1).optional(),
  // vide = tout le catalogue
  productIds: z.array(IdSchema).default([]),
});
export type StartInventoryInput = z.infer<typeof StartInventorySchema>;

/** 2. Comptage : saisie/scan des quantités réelles trouvées. */
export const CountInventoryItemSchema = z.object({
  productId: IdSchema,
  variantId: IdSchema.optional(),
  quantiteReelle: QuantitySchema.nonnegative(),
});
export const SubmitCountSchema = z.object({
  items: z.array(CountInventoryItemSchema).min(1),
});
export type SubmitCountInput = z.infer<typeof SubmitCountSchema>;

/** 4. Validation : le gérant valide, motif global enregistré. */
export const ValidateInventorySchema = z.object({
  motif: z.string().min(1),
});
export type ValidateInventoryInput = z.infer<typeof ValidateInventorySchema>;
