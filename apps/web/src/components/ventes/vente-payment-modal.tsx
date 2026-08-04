/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Modale d'encaissement d'un reste dû (crédit/acompte)
 * @created 2026-06-20
 * @updated 2026-08-04
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { X } from 'lucide-react';
import { Button, formatFCFA } from '@wilinwi/ui';
import type { Sale } from './types';

interface VentePaymentModalProps {
  sale: Sale;
  payAmount: string;
  setPayAmount: (val: string) => void;
  busy: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export function VentePaymentModal({
  sale,
  payAmount,
  setPayAmount,
  busy,
  onClose,
  onSubmit,
}: VentePaymentModalProps) {
  const reste = sale.total - sale.montantVerse;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm max-h-[95vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Règlement de crédit</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mb-4 text-sm text-slate-600 space-y-1">
          <p>
            Vente : <span className="font-mono font-bold text-brand">#{sale.id.slice(0, 8).toUpperCase()}</span>
          </p>
          <p>
            Client : <span className="font-bold">{sale.client?.nom || 'Client Comptoir'}</span>
          </p>
          <div className="flex justify-between items-center bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
            <span className="text-xs text-amber-800 font-semibold uppercase tracking-wider">Reste à payer</span>
            <span className="text-xl font-black text-amber-700">{formatFCFA(reste)}</span>
          </div>
        </div>
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="block font-medium text-slate-600 mb-1">Montant versé aujourd'hui (FCFA)</span>
            <input
              type="number"
              placeholder="Ex: 5000"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            />
          </label>
        </div>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Annuler
          </Button>
          <Button className="flex-1" onClick={onSubmit} disabled={busy || !payAmount}>
            {busy ? 'Règlement...' : 'Encaisser'}
          </Button>
        </div>
      </div>
    </div>
  );
}
