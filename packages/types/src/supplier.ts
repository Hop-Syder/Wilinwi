/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Types partagés — Fournisseurs (module Entrepôt).
 *   Miroir du CRM côté achat : un fournisseur porte une dette (ce qu'on lui doit).
 * @created 2026-06-28
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { z } from 'zod';
import { IdSchema, MoneySchema } from './common.js';
import { PaymentMethodSchema } from './sale.js';

export const CreateSupplierSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  telephone: z.string().min(1).nullable().optional(),
  contact: z.string().min(1).nullable().optional(),
  adresse: z.string().min(1).nullable().optional(),
  notes: z.string().min(1).nullable().optional(),
});
export type CreateSupplierInput = z.infer<typeof CreateSupplierSchema>;

export const UpdateSupplierSchema = CreateSupplierSchema.partial().extend({
  actif: z.boolean().optional(),
});
export type UpdateSupplierInput = z.infer<typeof UpdateSupplierSchema>;

/** Paiement à un fournisseur (réduit la dette + sortie de trésorerie). */
export const RecordSupplierPaymentSchema = z.object({
  montant: MoneySchema.refine((v) => v > 0, 'Le montant doit être positif'),
  methode: PaymentMethodSchema.optional(),
  note: z.string().min(1).nullable().optional(),
  purchaseOrderId: IdSchema.optional(),
});
export type RecordSupplierPaymentInput = z.infer<typeof RecordSupplierPaymentSchema>;

export interface SupplierDto {
  id: string;
  nom: string;
  telephone: string | null;
  contact: string | null;
  adresse: string | null;
  notes: string | null;
  /** Dette courante envers le fournisseur (sensible — OWNER/MANAGER). */
  soldeDette: number;
  actif: boolean;
}
