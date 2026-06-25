/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Définitions de types partagés : sale.ts
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { z } from 'zod';
import { IdSchema, MoneySchema } from './common.js';

/** Modes de paiement (§5.3). */
export const PAYMENT_METHODS = [
  'CASH', // Espèces
  'MOBILE_MONEY', // Mobile Money générique (MoMo, Moov, Celtiis, Orange…)
  'BANK_TRANSFER', // Virement
  'CREDIT', // Crédit (dette client)
  'INSTALLMENT', // Acompte (versement partiel)
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PaymentMethodSchema = z.enum(PAYMENT_METHODS);

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Espèces',
  MOBILE_MONEY: 'Mobile Money',
  BANK_TRANSFER: 'Virement',
  CREDIT: 'Crédit',
  INSTALLMENT: 'Acompte',
};

/** Statut d'un acompte / d'une vente à crédit (§5.3). */
export const INSTALLMENT_STATUSES = ['PENDING', 'PARTIAL', 'SETTLED', 'OVERDUE'] as const;
export type InstallmentStatus = (typeof INSTALLMENT_STATUSES)[number];

/**
 * Ligne de vente. Le `prixReel` est le 4ᵉ prix : celui réellement négocié.
 * Si `prixReel < prix_plancher`, une preuve + validation gérant sont exigées (§5.5).
 */
export const SaleItemInputSchema = z.object({
  productId: IdSchema,
  variantId: IdSchema.optional(),
  quantite: z.number().int().positive(),
  prixReel: MoneySchema,
  /** Justification obligatoire quand on passe sous le prix plancher. */
  motifSousPlancher: z.string().min(1).optional(),
});
export type SaleItemInput = z.infer<typeof SaleItemInputSchema>;

export const CreateSaleSchema = z
  .object({
    items: z.array(SaleItemInputSchema).min(1),
    paymentMethod: PaymentMethodSchema,
    /** Montant versé immédiatement (acompte). Requis si paymentMethod = INSTALLMENT. */
    montantVerse: MoneySchema.optional(),
    /** Paiement mixte : part payée en ESPÈCES (le reste via paymentMethod). */
    montantEspeces: MoneySchema.optional(),
    clientId: IdSchema.optional(),
    /** Identifiant local pour l'idempotence de la synchronisation offline. */
    clientGeneratedId: z.string().min(1).optional(),
    clientNom: z.string().min(1).optional(),
    clientTelephone: z.string().min(1).optional(),
    aLivrer: z.boolean().optional(),
    livreurId: IdSchema.nullable().optional(),
    adresseLivraison: z.string().max(500).nullable().optional(),
  })
  .refine((s) => s.paymentMethod !== 'INSTALLMENT' || s.montantVerse !== undefined, {
    message: 'montantVerse est requis pour un paiement par acompte',
    path: ['montantVerse'],
  });
export type CreateSaleInput = z.infer<typeof CreateSaleSchema>;

/** Validation gérant d'une vente passée sous le prix plancher (§5.5). */
export const ApprovePriceOverrideSchema = z.object({
  saleItemId: IdSchema,
  approuve: z.boolean(),
});
export type ApprovePriceOverrideInput = z.infer<typeof ApprovePriceOverrideSchema>;
