/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Drawer latéral d'inspection du détail d'une vente
 * @created 2026-06-20
 * @updated 2026-08-04
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import Link from 'next/link';
import { Receipt as ReceiptIcon, Ban, X, Store } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl flex flex-col justify-between animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-xl font-black text-slate-800">
                Vente N° {sale.id.slice(0, 8).toUpperCase()}
              </h2>
              <div className="mt-1.5 flex flex-wrap gap-2 items-center">
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${STATUS[sale.status]?.color || ''}`}>
                  {STATUS[sale.status]?.label || sale.status}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {new Date(sale.createdAt).toLocaleString('fr-FR')}
                </span>
                {isGlobalView && sale.etablissement && (
                  <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    <Store className="h-3 w-3" /> {sale.etablissement.nom}
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

          <div className="grid grid-cols-2 gap-4 border-y border-slate-100 py-4">
            <div className="text-xs">
              <span className="block font-semibold text-slate-400 uppercase tracking-wider">Client</span>
              <span className="block mt-1 font-bold text-slate-700">{sale.client?.nom || 'Client Comptoir'}</span>
              {sale.client?.telephone && <span className="block text-[11px] text-slate-500 mt-0.5">{sale.client.telephone}</span>}
            </div>
            <div className="text-xs">
              <span className="block font-semibold text-slate-400 uppercase tracking-wider">Vendeur</span>
              <span className="block mt-1 font-bold text-slate-700">{sale.vendeur?.nom || '—'}</span>
              {sale.vendeur?.email && <span className="block text-[11px] text-slate-500 mt-0.5">{sale.vendeur.email}</span>}
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Articles achetés</span>
            <ul className="divide-y divide-slate-100">
              {sale.items.map((it) => (
                <li key={it.id} className="flex justify-between py-2.5 text-sm">
                  <div className="flex-1 pr-4">
                    <span className="font-semibold text-slate-800">{it.quantite}×</span> {it.product?.nom ?? 'Article'}
                  </div>
                  <span className="tabular font-semibold text-slate-700">{formatFCFA(it.prixReel * it.quantite)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border space-y-2">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Total Brut</span>
              <span className="tabular font-medium">{formatFCFA(sale.total)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-500">
              <span>Encaissé ({PAYMENT_METHOD_LABELS[sale.paymentMethod]})</span>
              <span className="tabular font-medium text-slate-700">{formatFCFA(sale.montantVerse)}</span>
            </div>
            {reste > 0 && (
              <div className="flex justify-between text-sm border-t border-dashed border-slate-200 pt-2 text-amber-600 font-bold">
                <span>Reste dû</span>
                <span className="tabular">{formatFCFA(reste)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-slate-900">
              <span>Total Net</span>
              <span className="tabular text-brand">{formatFCFA(sale.total)}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-2 pt-4 border-t border-slate-100">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onOpenReceipt}>
              <ReceiptIcon className="h-4 w-4" /> Reçu
            </Button>
            <Link href={`/pos/returns?saleId=${sale.id}`} className="flex-1">
              <Button variant="outline" className="w-full justify-center">
                Retourner
              </Button>
            </Link>
          </div>
          {sale.status === 'PENDING_PAYMENT' && (
            <Button className="w-full justify-center bg-amber-500 hover:bg-amber-600 text-white" onClick={onOpenPayment}>
              Encaisser le reste ({formatFCFA(reste)})
            </Button>
          )}
          {canCancel && sale.status !== 'CANCELLED' && (
            <Button
              variant="danger"
              className="w-full justify-center bg-rose-600 hover:bg-rose-700"
              disabled={busy}
              onClick={onOpenCancel}
            >
              <Ban className="h-4 w-4" /> Annuler cette vente
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
