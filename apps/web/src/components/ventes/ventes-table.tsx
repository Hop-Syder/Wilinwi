/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Tableau desktop et cartes mobiles des ventes
 * @created 2026-06-20
 * @updated 2026-08-04
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Receipt as ReceiptIcon, Eye, CheckCircle2, Store } from 'lucide-react';
import { Card, formatFCFA } from '@wilinwi/ui';
import type { Sale } from './types';
import { STATUS } from './types';

interface VentesTableProps {
  sales: Sale[];
  isGlobalView: boolean;
  onSelectDetail: (sale: Sale) => void;
  onSelectReceipt: (sale: Sale) => void;
  onSelectPayment: (sale: Sale) => void;
}

export function VentesTable({
  sales,
  isGlobalView,
  onSelectDetail,
  onSelectReceipt,
  onSelectPayment,
}: VentesTableProps) {
  return (
    <Card id="tour-ventes-table" className="overflow-hidden border-slate-200/80 shadow-sm">
      {/* 📱 Mobile : cartes empilées */}
      <div className="divide-y divide-slate-100 md:hidden">
        {sales.map((s) => {
          const reste = s.total - s.montantVerse;
          return (
            <div key={s.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="tabular text-lg font-bold text-slate-900">{formatFCFA(s.total)}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {isGlobalView ? (s.etablissement?.nom ?? '—') : (s.client?.nom || 'Comptoir')} ·{' '}
                    {new Date(s.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {s.vendeur?.nom && <p className="text-[11px] text-slate-400">Vendeur : {s.vendeur.nom}</p>}
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS[s.status]?.color || ''}`}>
                  {STATUS[s.status]?.label || s.status}
                </span>
              </div>
              {reste > 0 && <p className="mt-1 text-xs font-semibold text-amber-600">Reste dû : {formatFCFA(reste)}</p>}
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => onSelectDetail(s)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <Eye className="h-3.5 w-3.5" /> Détail
                </button>
                <button
                  onClick={() => onSelectReceipt(s)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-brand transition-colors hover:bg-blue-50"
                >
                  <ReceiptIcon className="h-3.5 w-3.5" /> Reçu
                </button>
                {s.status === 'PENDING_PAYMENT' && (
                  <button
                    onClick={() => onSelectPayment(s)}
                    className="flex-1 rounded-lg bg-amber-100 py-2 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-200"
                  >
                    Encaisser
                  </button>
                )}
              </div>
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
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500 uppercase tracking-wider text-xs font-bold">
            <tr>
              <th className="px-5 py-3.5">Heure / Date</th>
              <th className="px-5 py-3.5">N° Vente</th>
              <th className="px-5 py-3.5">Vendeur</th>
              {isGlobalView ? (
                <th className="px-5 py-3.5">
                  <span className="flex items-center gap-1.5">
                    <Store className="h-3.5 w-3.5" /> Boutique
                  </span>
                </th>
              ) : (
                <th className="px-5 py-3.5">Client</th>
              )}
              <th className="px-5 py-3.5">Statut</th>
              <th className="px-5 py-3.5 text-right">Payé</th>
              <th className="px-5 py-3.5 text-right">Reste dû</th>
              <th className="px-5 py-3.5 text-right">Total</th>
              <th className="px-5 py-3.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sales.map((s) => {
              const reste = s.total - s.montantVerse;
              return (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5 tabular text-slate-500">
                    <div className="font-semibold text-slate-800">
                      {new Date(s.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-[11px]">{new Date(s.createdAt).toLocaleDateString('fr-FR')}</div>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-brand font-semibold">
                    #{s.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 font-medium">{s.vendeur?.nom || '—'}</td>
                  <td className="px-5 py-3.5 text-slate-600 font-medium">
                    {isGlobalView ? (
                      <span className="flex items-center gap-1.5">
                        <Store className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        {s.etablissement?.nom ?? <span className="text-slate-400 italic">—</span>}
                      </span>
                    ) : (
                      s.client?.nom || <span className="text-slate-400 font-normal italic">Comptoir</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${STATUS[s.status]?.color || ''}`}>
                      {STATUS[s.status]?.label || s.status}
                    </span>
                  </td>
                  <td className="tabular px-5 py-3.5 text-right font-medium text-slate-600">
                    {formatFCFA(s.montantVerse)}
                  </td>
                  <td className={`tabular px-5 py-3.5 text-right font-bold ${reste > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                    {reste > 0 ? formatFCFA(reste) : '—'}
                  </td>
                  <td className="tabular px-5 py-3.5 text-right font-bold text-slate-900">
                    {formatFCFA(s.total)}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => onSelectDetail(s)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                        title="Voir le détail"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onSelectReceipt(s)}
                        className="rounded-lg p-1.5 text-brand hover:bg-blue-50 transition-colors"
                        title="Voir le reçu"
                      >
                        <ReceiptIcon className="h-4 w-4" />
                      </button>
                      {s.status === 'PENDING_PAYMENT' && (
                        <button
                          onClick={() => onSelectPayment(s)}
                          className="rounded-lg px-2 py-1 text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 transition-colors"
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
                <td colSpan={9} className="px-5 py-16 text-center text-slate-400">
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
