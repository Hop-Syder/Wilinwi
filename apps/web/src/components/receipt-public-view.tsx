/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant Server-Side pour le rendu visuel du reçu original
 * @created 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import Image from 'next/image';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { formatFCFA } from '@wilinwi/ui';
import { ReceiptClientActions, type PublicReceiptData } from './receipt-client-actions';

export function ReceiptPublicView({
  receipt,
  autoPrint = false,
}: {
  receipt: PublicReceiptData;
  autoPrint?: boolean;
}) {
  const formattedDate = new Date(receipt.date).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-8 text-slate-900 font-sans antialiased">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; color: #000 !important; }
          #receipt-document { border: none !important; box-shadow: none !important; width: 100% !important; max-width: 80mm !important; margin: 0 auto !important; padding: 0 !important; }
        }
      `}</style>

      {/* Document du Reçu Original */}
      <div
        id="receipt-document"
        className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/50"
      >
        {receipt.cancelled ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-rose-700 uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" /> Vente Annulée
            </div>
            <p className="mt-1 text-[11px] text-rose-600 font-medium">
              Ce reçu ne vaut plus preuve d'achat ni de paiement.
            </p>
          </div>
        ) : (
          <div className="mb-3 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[10px] font-bold uppercase tracking-widest">
              <CheckCircle2 className="w-3.5 h-3.5" /> Reçu Original Certifié
            </span>
          </div>
        )}

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Image
              src="/logo.png"
              alt="Wilinwi Logo"
              width={26}
              height={26}
              className="object-contain"
            />
            <h1 className="font-extrabold text-lg text-slate-900 tracking-tight">
              {receipt.boutique}
            </h1>
          </div>

          <div className="mt-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Montant Total Encaissé
            </span>
            <p className="text-3xl font-black font-mono tracking-tight text-slate-900 mt-0.5">
              {formatFCFA(receipt.total)}
            </p>
          </div>

          <div className="mt-2 text-[11px] font-medium text-slate-400">
            {formattedDate} · <span className="font-mono font-bold text-slate-600">N° {receipt.code}</span>
          </div>
        </div>

        <div className="my-5 border-t border-dashed border-slate-200" />

        {/* Détails des Articles */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            Détail des Articles ({receipt.items.length})
          </p>
          <ul className="divide-y divide-slate-100 text-xs">
            {receipt.items.map((it, idx) => (
              <li key={idx} className="py-2 flex justify-between items-baseline gap-2">
                <span className="font-medium text-slate-800">
                  <span className="font-bold text-slate-900 font-mono">{it.quantite}×</span> {it.nom}
                </span>
                <span className="font-bold font-mono text-slate-900 shrink-0">
                  {formatFCFA(it.prixReel * it.quantite)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="my-4 border-t border-dashed border-slate-200" />

        <div className="flex justify-between items-center text-xs font-bold text-slate-700">
          <span>Montant Versé</span>
          <span className="font-mono text-slate-900">{formatFCFA(receipt.montantVerse)}</span>
        </div>
      </div>

      {/* Composant Client Interactif (Impression & Partage) */}
      <ReceiptClientActions receipt={receipt} autoPrint={autoPrint} />
    </main>
  );
}
