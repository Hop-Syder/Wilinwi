/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Drawer latéral d'inspection du détail d'une vente (Aperçu Reçu, SMS MoMo, WhatsApp, Retour & Annulation avec Motif)
 * @created 2026-06-20
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import Link from 'next/link';
import { Ban, X, Store, Share2, RotateCcw, Printer } from 'lucide-react';
import { PAYMENT_METHOD_LABELS } from '@wilinwi/types';
import { Button, formatFCFA } from '@wilinwi/ui';
import type { Sale } from './types';
import { STATUS } from './types';

interface VenteDetailDrawerProps {
  sale: Sale;
  isGlobalView: boolean;
  canCancel: boolean;
  busy: boolean;
  onClose: () => void;
  onOpenReceipt: () => void;
  onOpenPayment: () => void;
  onOpenCancel: () => void;
}

export function VenteDetailDrawer({
  sale,
  isGlobalView,
  canCancel,
  busy,
  onClose,
  onOpenReceipt,
  onOpenPayment,
  onOpenCancel,
}: VenteDetailDrawerProps) {
  const reste = sale.total - sale.montantVerse;

  const handleShareWhatsapp = () => {
    const publicUrl = `${window.location.origin}/r/${sale.id}`;
    const text = encodeURIComponent(`Bonjour ! Voici votre reçu numérique Wilinwi : ${publicUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200 border-l border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-5">
          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-display text-xl font-black text-slate-900">
                Vente <span className="font-mono text-indigo-700">#{sale.id.slice(0, 8).toUpperCase()}</span>
              </h2>
              <div className="mt-1.5 flex flex-wrap gap-2 items-center">
                <span className={`px-2.5 py-0.5 text-xs font-extrabold rounded-full border ${STATUS[sale.status]?.color || ''}`}>
                  {STATUS[sale.status]?.label || sale.status}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {new Date(sale.createdAt).toLocaleString('fr-FR')}
                </span>
                {isGlobalView && sale.etablissement && (
                  <span className="flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full font-bold">
                    <Store className="h-3 w-3 text-slate-400" /> {sale.etablissement.nom}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
            <div className="text-xs">
              <span className="block font-extrabold text-slate-400 uppercase tracking-wider">Client</span>
              <span className="block mt-1 font-bold text-slate-800">{sale.client?.nom || 'Client Comptoir'}</span>
              {sale.client?.telephone && <span className="block font-mono text-[11px] text-slate-500 mt-0.5">{sale.client.telephone}</span>}
            </div>
            <div className="text-xs">
              <span className="block font-extrabold text-slate-400 uppercase tracking-wider">Caissier / Opérateur</span>
              <span className="block mt-1 font-bold text-slate-800">{sale.vendeur?.nom || '—'}</span>
              {sale.vendeur?.email && <span className="block text-[11px] text-slate-500 mt-0.5 truncate">{sale.vendeur.email}</span>}
            </div>
          </div>

          {/* Reçu Thermique Simulé */}
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 font-mono text-xs space-y-3 shadow-2xs">
            <div className="text-center border-b border-dashed border-slate-300 pb-2">
              <span className="font-bold uppercase tracking-wider text-slate-800 block text-sm">REÇU DE CAISSE</span>
              <span className="text-[10px] text-slate-500">Ticket Thermique #NEXUS-POS</span>
            </div>

            <ul className="divide-y divide-dashed divide-slate-200">
              {sale.items.map((it) => (
                <li key={it.id} className="flex justify-between py-1.5">
                  <span className="text-slate-800 font-bold">
                    {it.quantite}× {it.product?.nom ?? 'Article'}
                  </span>
                  <span className="font-black text-slate-900">{formatFCFA(it.prixReel * it.quantite)}</span>
                </li>
              ))}
            </ul>

            <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
              <div className="flex justify-between text-slate-500">
                <span>Règlement</span>
                <span className="font-bold text-slate-800">{PAYMENT_METHOD_LABELS[sale.paymentMethod] || sale.modePaiement || 'Espèces'}</span>
              </div>
              {sale.referenceClient && (
                <div className="flex justify-between text-[11px] text-amber-800 bg-amber-50 p-1.5 rounded-lg border border-amber-200/80 font-mono">
                  <span>Réf SMS MoMo :</span>
                  <span className="font-bold">{sale.referenceClient}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm text-slate-900 pt-1">
                <span>TOTAL NET</span>
                <span className="text-indigo-900">{formatFCFA(sale.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Directes */}
        <div className="mt-6 space-y-2.5 pt-4 border-t border-slate-100">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="rounded-xl text-xs font-bold gap-1.5" onClick={onOpenReceipt}>
              <Printer className="h-3.5 w-3.5 text-indigo-600" /> Réimprimer
            </Button>
            <Button variant="outline" className="rounded-xl text-xs font-bold gap-1.5 border-emerald-200 text-emerald-800 hover:bg-emerald-50" onClick={handleShareWhatsapp}>
              <Share2 className="h-3.5 w-3.5 text-emerald-600" /> WhatsApp
            </Button>
          </div>

          <Link href={`/pos/returns?saleId=${sale.id}`} className="block">
            <Button variant="outline" className="w-full justify-center rounded-xl text-xs font-bold gap-1.5 border-slate-200 text-slate-700">
              <RotateCcw className="h-3.5 w-3.5" /> Effectuer un Retour / Avoir
            </Button>
          </Link>

          {sale.status === 'PENDING_PAYMENT' && (
            <Button className="w-full justify-center rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-md shadow-amber-500/20" onClick={onOpenPayment}>
              Encaisser le reste ({formatFCFA(reste)})
            </Button>
          )}

          {canCancel && sale.status !== 'CANCELLED' && (
            <Button
              variant="danger"
              className="w-full justify-center rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/20 gap-1.5"
              disabled={busy}
              onClick={onOpenCancel}
            >
              <Ban className="h-3.5 w-3.5" /> Annuler la Vente (Motif)
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
