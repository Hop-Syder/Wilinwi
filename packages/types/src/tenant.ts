/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Profil entreprise & personnalisation du ticket thermique
 *   (/parametres/entreprise). Distinct de `geo.ts` (localisation siège,
 *   onboarding) : ce schéma couvre l'identité affichée sur les reçus.
 * @created 2026-09-17
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { z } from 'zod';

export const RECEIPT_PAPER_FORMATS = ['MM80', 'MM58'] as const;
export type ReceiptPaperFormat = (typeof RECEIPT_PAPER_FORMATS)[number];
export const ReceiptPaperFormatSchema = z.enum(RECEIPT_PAPER_FORMATS);

/** Tout optionnel : chaque champ peut être mis à jour indépendamment. */
export const UpdateTenantProfileSchema = z.object({
  nom: z.string().trim().min(1, 'La raison sociale ne peut pas être vide').max(200).optional(),
  telephone: z.string().trim().max(30).nullable().optional(),
  ifu: z.string().trim().max(50).nullable().optional(),
  receiptHeader: z.string().trim().max(200).nullable().optional(),
  receiptFooter: z.string().trim().max(500).nullable().optional(),
  receiptPaperFormat: ReceiptPaperFormatSchema.optional(),
});
export type UpdateTenantProfileInput = z.infer<typeof UpdateTenantProfileSchema>;

export interface TenantProfileDto {
  id: string;
  nom: string;
  pays: string | null;
  ville: string | null;
  telephone: string | null;
  ifu: string | null;
  receiptHeader: string | null;
  receiptFooter: string | null;
  receiptPaperFormat: ReceiptPaperFormat;
}
