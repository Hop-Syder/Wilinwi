/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Tableau des clôtures de caisse (Rapports Z & Sessions Fermées)
 * @created 2026-06-20
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React from 'react';
import { Receipt as ReceiptIcon, CheckCircle2, Eye } from 'lucide-react';
import { Card } from '@wilinwi/ui';
import type { PosSessionDto } from '@wilinwi/types';
import { useCurrency } from '@/lib/currency-context';

interface VentesSessionsTableProps {
  sessions: PosSessionDto[];
  onFilterBySession: (sessionId: string) => void;
  onSelectReportZ: (session: PosSessionDto) => void;
}

export function VentesSessionsTable({
  sessions,
  onFilterBySession,
  onSelectReportZ,
}: VentesSessionsTableProps) {
  const { formatAmount } = useCurrency();

  return (
    <Card className="p-4 border-slate-200/80 shadow-xs rounded-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-sm text-slate-900">Historique des Clôtures de Caisse Z</h3>
        <span className="text-xs font-bold text-slate-500">{sessions.length} session{sessions.length > 1 ? 's' : ''} enregistrée{sessions.length > 1 ? 's' : ''}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-500 uppercase tracking-wider text-xs font-bold">
            <tr>
              <th className="px-4 py-3.5">N° Session / Date</th>
              <th className="px-4 py-3.5">Caissier</th>
              <th className="px-4 py-3.5">Statut</th>
              <th className="px-4 py-3.5 text-right">Fond Initial</th>
              <th className="px-4 py-3.5 text-right">Total Ventes</th>
              <th className="px-4 py-3.5 text-right">Comptage Réel</th>
              <th className="px-4 py-3.5 text-right">Écart Caisse</th>
              <th className="px-4 py-3.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {sessions.map((sess) => {
              const openedDate = new Date(sess.openedAt);
              const ecart = sess.ecart;

              return (
                <tr key={sess.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3.5 font-mono">
                    <div className="font-bold text-slate-900">#{sess.id.slice(0, 8).toUpperCase()}</div>
                    <div className="text-[11px] text-slate-500">
                      {openedDate.toLocaleDateString('fr-FR')} {openedDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700 font-bold">{sess.openedBy?.nom ?? 'Caissier'}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`px-2.5 py-0.5 text-xs font-extrabold rounded-full border ${
                        sess.status === 'CLOSED'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {sess.status === 'CLOSED' ? 'Fermée (Rapport Z)' : 'En Cours'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-600">
                    {formatAmount(sess.fondInitial)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                    {formatAmount(sess.totalVentes)} <span className="text-[11px] font-normal text-slate-500">({sess.nombreVentes} vtes)</span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                    {sess.soldeReel !== null && sess.soldeReel !== undefined ? formatAmount(sess.soldeReel) : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold">
                    {ecart !== null && ecart !== undefined ? (
                      ecart === 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-extrabold text-emerald-800 border border-emerald-200">
                          0 FCFA (Exact)
                        </span>
                      ) : ecart < 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-extrabold text-rose-800 border border-rose-200" title={(sess as any).noteFermeture || 'Déficit de caisse'}>
                          {formatAmount(ecart)} (Déficit)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-extrabold text-amber-800 border border-amber-200">
                          +{formatAmount(ecart)} (Excédent)
                        </span>
                      )
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => onFilterBySession(sess.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg transition-colors"
                        title="Filtrer l'onglet Ventes sur cette session"
                      >
                        <Eye className="w-3.5 h-3.5" /> <span>Filtrer</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectReportZ(sess)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs"
                        title="Imprimer le Ticket Z de clôture"
                      >
                        <ReceiptIcon className="h-3.5 w-3.5 text-indigo-600" /> <span>Rapport Z</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-16 text-center text-slate-400">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                  Aucune clôture de caisse enregistrée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
