/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Types et constantes partagés pour le module Ventes
 * @created 2026-06-20
 * @updated 2026-08-04
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import type { ReceiptSale } from '@/components/receipt';

export interface Sale extends ReceiptSale {
  status: 'COMPLETED' | 'PENDING_PAYMENT' | 'CANCELLED';
  vendeur?: { id: string; nom: string; email: string } | null;
  etablissement?: { id: string; nom: string } | null;
  modePaiement?: string;
  referenceClient?: string;
}

export const STATUS: Record<
  Sale['status'],
  { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral'; color: string }
> = {
  COMPLETED: { label: 'Payée', tone: 'success', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  PENDING_PAYMENT: { label: 'Crédit/Acompte', tone: 'warning', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  CANCELLED: { label: 'Annulée', tone: 'danger', color: 'text-rose-700 bg-rose-50 border-rose-200' },
};
