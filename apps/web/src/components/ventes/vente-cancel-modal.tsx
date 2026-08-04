/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Modale d'annulation de transaction de vente
 * @created 2026-06-20
 * @updated 2026-08-04
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { ShieldAlert } from 'lucide-react';
import { Button, formatFCFA } from '@wilinwi/ui';
import type { Sale } from './types';

interface VenteCancelModalProps {
  sale: Sale;
  cancelReason: string;
  setCancelReason: (val: string) => void;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function VenteCancelModal({
  sale,
  cancelReason,
  setCancelReason,
  busy,
  onClose,
  onConfirm,
}: VenteCancelModalProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm max-h-[95vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
        <div className="flex items-center gap-2.5 mb-2 text-rose-700">
          <ShieldAlert className="h-6 w-6 shrink-0" />
          <h3 className="text-lg font-bold">Annuler la transaction</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Cette action est destructive. Le stock de la vente sera automatiquement ré-entré et la caisse sera ajustée à la baisse.
        </p>
        <div className="space-y-4">
          <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1 text-slate-600 border">
            <p>
              N° Vente : <span className="font-mono font-bold text-slate-900">#{sale.id.slice(0, 8).toUpperCase()}</span>
            </p>
            <p>
              Impact Caisse : <span className="font-bold text-rose-600">-{formatFCFA(sale.montantVerse)}</span>
            </p>
          </div>
          <label className="block text-sm">
            <span className="block font-semibold text-slate-700 mb-1">Motif de l'annulation *</span>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-white focus:border-rose-500"
            >
              <option value="Erreur de saisie">Erreur de saisie / Doublon</option>
              <option value="Client a changé d'avis">Le client a changé d'avis</option>
              <option value="Retour produit total">Retour produit total</option>
              <option value="Autre motif">Autre motif</option>
            </select>
          </label>
        </div>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Garder
          </Button>
          <Button variant="danger" className="flex-1 bg-rose-600 hover:bg-rose-700" onClick={onConfirm} disabled={busy}>
            {busy ? 'Annulation...' : 'Confirmer'}
          </Button>
        </div>
      </div>
    </div>
  );
}
