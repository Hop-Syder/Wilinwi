/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Modale et composant d'impression du Ticket Rapport Z (report-z-print-modal.tsx)
 * @created 2026-08-04
 * @updated 2026-08-04
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use flex';

import { Printer, X, Receipt, Wallet, DollarSign, Smartphone, CreditCard } from 'lucide-react';
import { Button, formatFCFA } from '@wilinwi/ui';
import type { PosSessionDto } from '@wilinwi/types';

interface ReportZPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: PosSessionDto | null;
}

export function ReportZPrintModal({ isOpen, onClose, session }: ReportZPrintModalProps) {
  if (!isOpen || !session) return null;

  const handlePrint = () => {
    window.print();
  };

  const openedAtDate = session.openedAt ? new Date(session.openedAt) : new Date();
  const closedAtDate = session.closedAt ? new Date(session.closedAt) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* En-tête de la Modale */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight">Rapport Z de Clôture POS</h2>
              <p className="text-xs text-slate-400">Session ID : {session.id.substring(0, 8)}...</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reçu Thermique Imprimable */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="p-5 bg-slate-50 border border-slate-300 rounded-2xl font-mono text-xs text-slate-800 space-y-4 shadow-xs print:shadow-none print:border-none print:p-0">
            {/* Header Reçu */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300 space-y-1">
              <p className="font-bold text-sm tracking-wider uppercase">Wilinwi — Ticket Z de Clôture</p>
              <p className="text-[11px] text-slate-600 font-semibold">
                Ouvert le : {openedAtDate.toLocaleDateString()} {openedAtDate.toLocaleTimeString()}
              </p>
              {closedAtDate && (
                <p className="text-[11px] text-slate-600 font-semibold">
                  Fermé le : {closedAtDate.toLocaleDateString()} {closedAtDate.toLocaleTimeString()}
                </p>
              )}
              <div className="pt-1 flex items-center justify-center gap-2 text-[10px] text-slate-500">
                <span>Ouvert par : {session.openedBy?.nom ?? 'Caissier'}</span>
                {session.closedBy && <span>• Clôturé par : {session.closedBy.nom}</span>}
              </div>
            </div>

            {/* Répartition par Mode de Paiement */}
            <div className="space-y-2 text-[11px]">
              <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">Ventilation des Ventes</p>
              <div className="flex justify-between">
                <span className="flex items-center gap-1"><Wallet className="w-3 h-3 text-slate-500"/> Espèces :</span>
                <span className="font-bold">{formatFCFA(session.totalEspeces)}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1"><Smartphone className="w-3 h-3 text-brand"/> Mobile Money :</span>
                <span className="font-bold">{formatFCFA(session.totalMoMo)}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1"><CreditCard className="w-3 h-3 text-emerald-600"/> Carte / Virement :</span>
                <span className="font-bold">{formatFCFA(session.totalBanque)}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1"><DollarSign className="w-3 h-3 text-amber-600"/> Crédits Clients :</span>
                <span className="font-bold">{formatFCFA(session.totalCredit)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-300 font-bold text-slate-900 text-xs">
                <span>TOTAL VENTES ({session.nombreVentes} Ventes) :</span>
                <span>{formatFCFA(session.totalVentes)}</span>
              </div>
            </div>

            {/* Bilans & Écarts de Caisse */}
            <div className="pt-3 border-t border-dashed border-slate-300 space-y-1.5 text-[11px]">
              <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">Contrôle de Caisse</p>
              <div className="flex justify-between">
                <span>Fond Initial de Caisse :</span>
                <span>{formatFCFA(session.fondInitial)}</span>
              </div>
              <div className="flex justify-between">
                <span>Solde Théorique Caisse :</span>
                <span className="font-semibold">{formatFCFA(session.soldeTheorique)}</span>
              </div>
              <div className="flex justify-between">
                <span>Solde Réel Compté :</span>
                <span className="font-bold text-slate-900">{formatFCFA(session.soldeReel ?? 0)}</span>
              </div>
              <div className="flex justify-between font-bold pt-1 border-t border-slate-200">
                <span>Écart Constaté :</span>
                <span className={(session.ecart ?? 0) === 0 ? 'text-emerald-700' : (session.ecart ?? 0) > 0 ? 'text-blue-700' : 'text-red-600'}>
                  {(session.ecart ?? 0) === 0
                    ? '0 FCFA (Exact)'
                    : (session.ecart ?? 0) > 0
                    ? `+${formatFCFA(session.ecart!)}`
                    : formatFCFA(session.ecart!)}
                </span>
              </div>
              {session.note && (
                <div className="pt-2 text-[10px] text-slate-600 italic bg-amber-50/50 p-2 rounded-lg border border-amber-200">
                  <span className="font-semibold text-amber-900">Motif d'écart : </span>
                  {session.note}
                </div>
              )}
            </div>

            {/* Signature & Validation */}
            <div className="pt-3 border-t border-dashed border-slate-300 text-center text-[10px] text-slate-400 space-y-1">
              <p>Wilinwi POS — Reçu Z Certifié</p>
              <p className="font-mono text-[9px] text-slate-300">{session.id}</p>
            </div>
          </div>
        </div>

        {/* Pied de Modale & Bouton d'Impression */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onClose}>
            Fermer
          </Button>
          <Button variant="primary" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1.5" />
            Imprimer Ticket Z
          </Button>
        </div>
      </div>
    </div>
  );
}
