/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Tableau des clôtures de caisse (Rapports Z)
 * @created 2026-06-20
 * @updated 2026-08-04
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Receipt as ReceiptIcon, CheckCircle2 } from 'lucide-react';
import { Card, formatFCFA } from '@wilinwi/ui';
import type { PosSessionDto } from '@wilinwi/types';

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
  return (
    <Card className="p-4 border-slate-200/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base text-slate-900">Historique des Clôtures Z</h3>
        <span className="text-xs text-slate-500">{sessions.length} session(s) enregistrée(s)</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider text-xs font-bold">
            <tr>
              <th className="px-5 py-3.5">Date / Heure</th>
              <th className="px-5 py-3.5">Caissier</th>
              <th className="px-5 py-3.5">Statut</th>
              <th className="px-5 py-3.5 text-right">Fond Initial</th>
              <th className="px-5 py-3.5 text-right">Total Ventes</th>
              <th className="px-5 py-3.5 text-right">Théorique</th>
              <th className="px-5 py-3.5 text-right">Compté Réel</th>
              <th className="px-5 py-3.5 text-right">Écart</th>
              <th className="px-5 py-3.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sessions.map((sess) => {
              const openedDate = new Date(sess.openedAt);
              return (
                <tr key={sess.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5 tabular text-slate-500">
                    <div className="font-semibold text-slate-800">
                      {openedDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-[11px]">{openedDate.toLocaleDateString('fr-FR')}</div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-700 font-medium">{sess.openedBy?.nom ?? 'Caissier'}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                        sess.status === 'CLOSED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {sess.status === 'CLOSED' ? 'Fermée (Rapport Z)' : 'En Cours'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right text-slate-600 font-medium">
                    {formatFCFA(sess.fondInitial)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                    {formatFCFA(sess.totalVentes)} ({sess.nombreVentes})
                  </td>
                  <td className="px-5 py-3.5 text-right text-slate-600">
                    {formatFCFA(sess.soldeTheorique)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                    {sess.soldeReel !== null && sess.soldeReel !== undefined ? formatFCFA(sess.soldeReel) : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold">
                    {sess.ecart !== null && sess.ecart !== undefined ? (
                      <span className={sess.ecart === 0 ? 'text-emerald-700' : sess.ecart > 0 ? 'text-blue-700' : 'text-rose-600'}>
                        {sess.ecart === 0 ? '0 FCFA' : sess.ecart > 0 ? `+${formatFCFA(sess.ecart)}` : formatFCFA(sess.ecart)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => onFilterBySession(sess.id)}
                        className="px-2.5 py-1 text-xs font-bold text-brand bg-brand/10 hover:bg-brand/20 rounded-lg transition-colors"
                        title="Filtrer les ventes de cette session"
                      >
                        Voir Ventes
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectReportZ(sess)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Imprimer le Ticket Z"
                      >
                        <ReceiptIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={9} className="px-5 py-16 text-center text-slate-400">
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
