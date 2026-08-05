/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Tableau des clôtures de caisse (Historique des Clôtures & Rapports Journaliers)
 * @created 2026-06-20
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React from 'react';
import { Eye, Printer, Lock, Clock, CheckCircle2 } from 'lucide-react';
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
        <h3 className="font-extrabold text-sm text-slate-900">
          Historique des Clôtures de Caisse (Rapports Journaliers)
        </h3>
        <span className="text-xs font-bold text-slate-500">
          {sessions.length} session{sessions.length > 1 ? 's' : ''} enregistrée{sessions.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
            <tr>
              <th className="px-4 py-3.5 whitespace-nowrap">N° Session / Date</th>
              <th className="px-4 py-3.5 whitespace-nowrap">Caissier</th>
              <th className="px-4 py-3.5 whitespace-nowrap">Statut</th>
              <th className="px-4 py-3.5 text-right whitespace-nowrap">Fond Initial</th>
              <th className="px-4 py-3.5 text-right whitespace-nowrap">Total Ventes</th>
              <th className="px-4 py-3.5 text-right whitespace-nowrap">Comptage Réel</th>
              <th className="px-4 py-3.5 text-right whitespace-nowrap">Écart Caisse</th>
              <th className="px-4 py-3.5 text-center w-20 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-xs text-slate-700">
            {sessions.map((sess) => {
              const openedDate = new Date(sess.openedAt);
              const ecart = sess.ecart;
              const isOpen = sess.status !== 'CLOSED';
              const isDiffPositive = ecart !== null && ecart !== undefined && ecart > 0;
              const isDiffNegative = ecart !== null && ecart !== undefined && ecart < 0;

              return (
                <tr key={sess.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* N° Session / Date */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="font-mono font-bold text-slate-900">#{sess.id.slice(0, 8).toUpperCase()}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {openedDate.toLocaleDateString('fr-FR')} à {openedDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>

                  {/* Caissier */}
                  <td className="px-4 py-3.5 font-medium text-slate-800 whitespace-nowrap">
                    {sess.openedBy?.nom ?? 'Caissier'}
                  </td>

                  {/* Statut sur 1 seule ligne */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {isOpen ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200/80 rounded-full text-[11px] font-semibold text-amber-700">
                        <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                        En cours
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200/80 rounded-full text-[11px] font-semibold text-emerald-700">
                        <Lock className="w-3 h-3 text-emerald-600" />
                        Clôturée (Rapport Journalier)
                      </span>
                    )}
                  </td>

                  {/* Fond Initial */}
                  <td className="px-4 py-3.5 text-right font-mono font-medium text-slate-600 whitespace-nowrap">
                    {formatAmount(sess.fondInitial)}
                  </td>

                  {/* Total Ventes */}
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="font-mono font-bold text-slate-900">
                      {formatAmount(sess.totalVentes)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      ({sess.nombreVentes} vente{sess.nombreVentes > 1 ? 's' : ''})
                    </div>
                  </td>

                  {/* Comptage Réel */}
                  <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-800 whitespace-nowrap">
                    {sess.soldeReel !== null && sess.soldeReel !== undefined ? formatAmount(sess.soldeReel) : '—'}
                  </td>

                  {/* Écart Caisse */}
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    {ecart === null || ecart === undefined ? (
                      <span className="text-slate-400">—</span>
                    ) : isDiffPositive ? (
                      <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 font-mono font-bold text-[11px] rounded-md">
                        +{formatAmount(ecart)} (Excédent)
                      </span>
                    ) : isDiffNegative ? (
                      <span
                        className="inline-flex items-center px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-800 font-mono font-bold text-[11px] rounded-md"
                        title={(sess as any).noteFermeture || 'Déficit de caisse'}
                      >
                        {formatAmount(ecart)} (Déficit)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono font-bold text-[11px] rounded-md">
                        0 FCFA (Conforme)
                      </span>
                    )}
                  </td>

                  {/* COLONNE ACTIONS (Icônes seules compactes) */}
                  <td className="px-4 py-3.5 text-center whitespace-nowrap">
                    <div className="inline-flex items-center justify-center gap-1">
                      {/* Icône 1 : Voir / Filtrer les ventes */}
                      <button
                        type="button"
                        onClick={() => onFilterBySession(sess.id)}
                        title="Voir / filtrer les ventes de cette session"
                        className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200/80 rounded-lg transition-all active:scale-95 shadow-2xs"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Icône 2 : Imprimer le Rapport Journalier */}
                      {!isOpen && (
                        <button
                          type="button"
                          onClick={() => onSelectReportZ(sess)}
                          title="Imprimer le rapport journalier"
                          className="p-1.5 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border border-emerald-200/80 rounded-lg transition-all active:scale-95 shadow-2xs"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      )}
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
