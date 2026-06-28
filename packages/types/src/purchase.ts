/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Types partagés — Bons de commande & réception (module Entrepôt).
 *   Créer une commande fournisseur, la recevoir (ravitaillement → stock IN).
 * @created 2026-06-28
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { z } from 'zod';
import { IdSchema, MoneySchema, QuantitySchema } from './common.js';

export const PURCHASE_ORDER_STATUSES = [
  'DRAFT',
  'ORDERED',
  'PARTIAL',
  'RECEIVED',
  'CANCELLED',
] as const;
export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];
export const PurchaseOrderStatusSchema = z.enum(PURCHASE_ORDER_STATUSES);

export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'Brouillon',
  ORDERED: 'Commandé',
  PARTIAL: 'Reçu partiellement',
  RECEIVED: 'Reçu',
  CANCELLED: 'Annulé',
};

const PositiveQty = QuantitySchema.refine((q) => q > 0, 'La quantité doit être positive');

export const CreatePurchaseOrderSchema = z.object({
  /** Établissement de réception (entrepôt ou boutique). */
  etablissementId: IdSchema,
  fournisseurId: IdSchema,
  notes: z.string().min(1).nullable().optional(),
  /** Marque la commande comme « commandée » (sinon brouillon). */
  ordered: z.boolean().default(true),
  items: z
    .array(
      z.object({
        productId: IdSchema,
        variantId: IdSchema.optional(),
        quantiteCommandee: PositiveQty,
        prixUnitaire: MoneySchema,
      }),
    )
    .min(1, 'Ajoutez au moins une ligne'),
});
export type CreatePurchaseOrderInput = z.infer<typeof CreatePurchaseOrderSchema>;

/** Réception (ravitaillement) : quantités reçues par ligne, + part payée immédiate. */
export const ReceivePurchaseOrderSchema = z.object({
  items: z
    .array(z.object({ itemId: IdSchema, quantite: PositiveQty }))
    .min(1, 'Indiquez au moins une ligne reçue'),
  /** Part réglée immédiatement (le reste passe en dette fournisseur). */
  montantPaye: MoneySchema.default(0),
});
export type ReceivePurchaseOrderInput = z.infer<typeof ReceivePurchaseOrderSchema>;

export interface PurchaseOrderItemDto {
  id: string;
  productId: string;
  variantId: string | null;
  productNom: string;
  quantiteCommandee: number;
  quantiteRecue: number;
  prixUnitaire: number;
}

export interface PurchaseOrderDto {
  id: string;
  reference: string;
  etablissementId: string;
  etablissementNom: string | null;
  fournisseurId: string;
  fournisseurNom: string | null;
  statut: PurchaseOrderStatus;
  montantTotal: number;
  montantRecu: number;
  montantPaye: number;
  notes: string | null;
  createdAt: string;
  items: PurchaseOrderItemDto[];
}
