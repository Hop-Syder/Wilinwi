/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Types partagés Zod pour la fiche client et les paiements CRM.
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { z } from 'zod';
import { IdSchema, MoneySchema } from './common.js';
import { PaymentMethodSchema } from './sale.js';

/** Création d'une fiche client (CRM — MVP2). */
export const CreateClientSchema = z.object({
  nom: z.string().min(1),
  telephone: z.string().min(1).optional(),
  /** Plafond de crédit autorisé (FCFA). Omis/null = illimité. */
  plafondCredit: MoneySchema.nullable().optional(),
  notes: z.string().optional(),
});
export type CreateClientInput = z.infer<typeof CreateClientSchema>;

export const UpdateClientSchema = CreateClientSchema.partial().extend({
  actif: z.boolean().optional(),
});
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>;

/** Remboursement d'une dette client. */
export const RecordClientPaymentSchema = z.object({
  montant: MoneySchema.refine((m) => m > 0, 'Le montant doit être positif'),
  methode: PaymentMethodSchema.optional(),
  note: z.string().optional(),
  saleId: IdSchema.optional(),
});
export type RecordClientPaymentInput = z.infer<typeof RecordClientPaymentSchema>;

/**
 * DTO public d'un client. `soldeCredit` et `plafondCredit` sont optionnels :
 * retirés pour les rôles sans `client:view_credit` (cf. canSeeClientCredit).
 */
export const ClientDtoSchema = z.object({
  id: IdSchema,
  nom: z.string(),
  telephone: z.string().nullable(),
  notes: z.string().nullable(),
  actif: z.boolean().optional(),
  // Sensibles — présents seulement pour OWNER/MANAGER/CASHIER :
  soldeCredit: MoneySchema.optional(),
  plafondCredit: MoneySchema.nullable().optional(),
});
export type ClientDto = z.infer<typeof ClientDtoSchema>;
