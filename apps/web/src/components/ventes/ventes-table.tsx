/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Tableau desktop et cartes mobiles des ventes avec badges colorés par mode de règlement
 * @created 2026-06-20
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React from 'react';
import { Receipt as ReceiptIcon, Eye, CheckCircle2, Store } from 'lucide-react';
import { Card } from '@wilinwi/ui';
import type { Sale } from './types';
import { STATUS } from './types';
import { useCurrency } from '@/lib/currency-context';

interface VentesTableProps {
  sales: Sale[];
  isGlobalView: boolean;
  onSelectDetail: (sale: Sale) => void;
  onSelectReceipt: (sale: Sale) => void;
  onSelectPayment: (sale: Sale) => void;
}

export function PaymentMethodBadge({ method }: { method?: string }) {
  if (!method) return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">🟢 Espèces</span>;
  const m = method.toUpperCase();
  if (m.includes('MTN')) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">🟡 MTN MoMo</span>;
  }
  if (m.includes('WAVE')) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-sky-100 text-sky-900 border border-sky-300">🔵 Wave</span>;
  }
  if (m.includes('MOOV')) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-blue-100 text-blue-900 border border-blue-300">🔵 Moov Money</span>;
  }
  if (m.includes('CREDIT') || m.includes('CRÉDIT')) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-rose-50 text-rose-800 border border-rose-200">🔴 Crédit</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">🟢 Espèces</span>;
}

export function VentesTable({
  sales,
  isGlobalView,
  onSelectDetail,
  onSelectReceipt,
  onSelectPayment,
}: VentesTableProps) {
  const { formatAmount } = useCurrency();

  return (
    <Card id="tour-ventes-table" className="overflow-hidden border-slate-200/80 shadow-xs rounded-2xl">
      {/* 📱 Mobile : cartes empilées */}
      <div className="divide-y divide-slate-100 md:hidden">
        {sales.map((s) => {
          const reste = s.total - s.montantVerse;
          return (
            <div key={s.id} onClick={() => onSelectDetail(s)} className="p-4 hover:bg-slate-50/70 transition-colors cursor-pointer space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-xs font-bold text-indigo-700">#{s.id.slice(0, 8).toUpperCase()}</span>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {new Date(s.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {isGlobalView ? (s.etablissement?.nom ?? '—') : (s.client?.nom || 'Comptoir')}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <PaymentMethodBadge method={s.modePaiement} />
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-extrabold ${STATUS[s.status]?.color || ''}`}>
                    {STATUS[s.status]?.label || s.status}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-500 font-medium">
                  {s.vendeur?.nom ? `Caissier : ${s.vendeur.nom}` : ''}
                </span>
                <span className="font-mono text-base font-black text-slate-900">{formatAmount(s.total)}</span>
              </div>

              {reste > 0 && <p className="text-xs font-extrabold text-amber-600 text-right">Reste dû : {formatAmount(reste)}</p>}
            </div>
          );
        })}
        {sales.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            Aucune vente trouvée avec ces filtres.
          </div>
        )}
      </div>

      {/* 🖥️ Desktop : tableau */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm text-left">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-500 uppercase tracking-wider text-xs font-bold">
            <tr>
              <th className="px-4 py-3.5">N° Reçu / Date</th>
              <th className="px-4 py-3.5">Caissier</th>
              {isGlobalView ? (
                <th className="px-4 py-3.5">
                  <span className="flex items-center gap-1.5">
                    <Store className="h-3.5 w-3.5" /> Boutique
                  </span>
                </th>
              ) : (
                <th className="px-4 py-3.5">Client</th>
              )}
              <th className="px-4 py-3.5">Règlement</th>
              <th className="px-4 py-3.5">Statut</th>
              <th className="px-4 py-3.5 text-right">Total</th>
              <th className="px-4 py-3.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {sales.map((s) => {
              const reste = s.total - s.montantVerse;
              return (
                <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-mono text-xs font-extrabold text-indigo-900">
                      #{s.id.slice(0, 8).toUpperCase()}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {new Date(s.createdAt).toLocaleDateString('fr-FR')} {new Date(s.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700 font-bold">{s.vendeur?.nom || '—'}</td>
                  <td className="px-4 py-3.5 text-slate-700 font-bold">
                    {isGlobalView ? (
                      <span className="flex items-center gap-1.5">
                        <Store className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        {s.etablissement?.nom ?? <span className="text-slate-400 italic">—</span>}
                      </span>
                    ) : (
                      s.client?.nom || <span className="text-slate-400 font-normal italic">Comptoir</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <PaymentMethodBadge method={s.modePaiement} />
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-0.5 text-xs font-extrabold rounded-full border ${STATUS[s.status]?.color || ''}`}>
                      {STATUS[s.status]?.label || s.status}
                    </span>
                  </td>
                  <td className="tabular px-4 py-3.5 text-right font-mono font-black text-slate-900 text-sm">
                    {formatAmount(s.total)}
                    {reste > 0 && <span className="block text-[10px] text-amber-600 font-bold">Reste: {formatAmount(reste)}</span>}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => onSelectDetail(s)}
                        className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                        title="Voir le détail"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onSelectReceipt(s)}
                        className="rounded-xl p-1.5 text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Voir le reçu"
                      >
                        <ReceiptIcon className="h-4 w-4" />
                      </button>
                      {s.status === 'PENDING_PAYMENT' && (
                        <button
                          onClick={() => onSelectPayment(s)}
                          className="rounded-xl px-2 py-1 text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 transition-colors"
                          title="Encaisser le solde"
                        >
                          Encaisser
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {sales.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center text-slate-400">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                  Aucune vente trouvée avec ces filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
