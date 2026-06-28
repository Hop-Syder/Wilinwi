/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Types partagés — Dispatch / transfert interne (module Entrepôt).
 *   Déplace la marchandise entrepôt → boutique : brouillon → validation.
 * @created 2026-06-28
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { z } from 'zod';
import { IdSchema, QuantitySchema } from './common.js';

export const DISPATCH_STATUSES = ['DRAFT', 'VALIDATED', 'CANCELLED'] as const;
export type DispatchStatus = (typeof DISPATCH_STATUSES)[number];
export const DispatchStatusSchema = z.enum(DISPATCH_STATUSES);

export const DISPATCH_STATUS_LABELS: Record<DispatchStatus, string> = {
  DRAFT: 'Brouillon',
  VALIDATED: 'Validé',
  CANCELLED: 'Annulé',
};

const PositiveQty = QuantitySchema.refine((q) => q > 0, 'La quantité doit être positive');

export const CreateDispatchSchema = z
  .object({
    sourceId: IdSchema,
    destinationId: IdSchema,
    note: z.string().min(1).nullable().optional(),
    /** Valider immédiatement (déplace le stock) ; sinon brouillon. */
    validate: z.boolean().default(false),
    items: z
      .array(
        z.object({
          productId: IdSchema,
          variantId: IdSchema.optional(),
          quantite: PositiveQty,
        }),
      )
      .min(1, 'Ajoutez au moins un produit'),
  })
  .refine((d) => d.sourceId !== d.destinationId, {
    message: 'La source et la destination doivent être différentes',
    path: ['destinationId'],
  });
export type CreateDispatchInput = z.infer<typeof CreateDispatchSchema>;

export interface DispatchOrderItemDto {
  id: string;
  productId: string;
  variantId: string | null;
  productNom: string;
  quantite: number;
}

export interface DispatchOrderDto {
  id: string;
  reference: string;
  sourceId: string;
  sourceNom: string | null;
  destinationId: string;
  destinationNom: string | null;
  statut: DispatchStatus;
  note: string | null;
  createdAt: string;
  validatedAt: string | null;
  items: DispatchOrderItemDto[];
}
