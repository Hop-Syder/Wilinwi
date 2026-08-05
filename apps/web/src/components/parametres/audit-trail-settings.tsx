/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Onglet Journal d'Audit & Sécurité (AuditTrailSettings) — Traçabilité totale des actions sensibles
 * @created 2026-06-20
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React, { useMemo, useState } from 'react';
import { ShieldCheck, Search, Download, Clock } from 'lucide-react';
import { Card, Button } from '@wilinwi/ui';

export interface AuditLogItem {
  id: string;
  action: string;
  category: 'SALE_CANCEL' | 'DISCOUNT_OVER' | 'STOCK_ADJUST' | 'CASH_DISCREPANCY' | 'USER_CHANGE';
  userNom: string;
  userRole: string;
  etablissementNom?: string;
  details: string;
  createdAt: string;
}

interface AuditTrailSettingsProps {
  logs: AuditLogItem[];
  onExportCsv?: () => void;
}

export function AuditTrailSettings({
  logs,
  onExportCsv,
}: AuditTrailSettingsProps) {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (categoryFilter !== 'ALL' && l.category !== categoryFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase().trim();
        const matchUser = l.userNom.toLowerCase().includes(q);
        const matchAction = l.action.toLowerCase().includes(q);
        const matchDetails = l.details.toLowerCase().includes(q);
        if (!matchUser && !matchAction && !matchDetails) return false;
      }
      return true;
    });
  }, [logs, categoryFilter, query]);

  const categoryBadges: Record<string, { label: string; color: string }> = {
    SALE_CANCEL: { label: '🚫 Annulation Vente', color: 'bg-rose-50 text-rose-800 border-rose-200' },
    DISCOUNT_OVER: { label: '🏷️ Remise Exceptionnelle', color: 'bg-amber-50 text-amber-800 border-amber-200' },
    STOCK_ADJUST: { label: '📦 Ajustement Stock', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
    CASH_DISCREPANCY: { label: '⚖️ Écart de Caisse', color: 'bg-purple-50 text-purple-800 border-purple-200' },
    USER_CHANGE: { label: '👥 Modification Sécurité', color: 'bg-sky-50 text-sky-800 border-sky-200' },
  };

  return (
    <div className="space-y-4 select-none">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" /> Journal d'Audit Trail & Traçabilité des Actions
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Enregistrement automatique horodaté des annulations, remises exceptionnelles, ajustements et écarts
          </p>
        </div>
        {onExportCsv && (
          <Button
            size="sm"
            variant="outline"
            onClick={onExportCsv}
            className="text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50 shrink-0 rounded-xl"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" /> Exporter le Journal CSV
          </Button>
        )}
      </div>

      <Card className="p-4 border-slate-200/80 shadow-xs rounded-2xl space-y-4">
        {/* Barre d'outils Recherche & Filtres */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher par opérateur, action, détail..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-full border border-slate-200 bg-white pl-10 pr-4 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'ALL', label: 'Toutes les actions' },
              { id: 'SALE_CANCEL', label: '🚫 Annulations' },
              { id: 'DISCOUNT_OVER', label: '🏷️ Remises' },
              { id: 'STOCK_ADJUST', label: '📦 Ajustements Stock' },
              { id: 'CASH_DISCREPANCY', label: '⚖️ Écarts Caisse' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setCategoryFilter(f.id)}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-full transition-all shrink-0 ${
                  categoryFilter === f.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Vue Tableau */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Horodatage</th>
                <th className="py-3.5 px-4">Catégorie Action</th>
                <th className="py-3.5 px-4">Opérateur / Auteur</th>
                <th className="py-3.5 px-4">Description Détaillée & Motif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredLogs.map((log) => {
                const badge = categoryBadges[log.category] || { label: log.category, color: 'bg-slate-100 text-slate-700' };

                return (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Horodatage */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                      <div className="flex items-center gap-1 font-bold text-slate-800">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>{new Date(log.createdAt).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(log.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </td>

                    {/* Catégorie Action */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full border text-[11px] font-extrabold ${badge.color}`}>
                        {badge.label}
                      </span>
                    </td>

                    {/* Opérateur */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[11px]">
                          {log.userNom.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900">{log.userNom}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{log.userRole}</p>
                        </div>
                      </div>
                    </td>

                    {/* Details & Motif */}
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      <p className="font-bold text-slate-900">{log.action}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{log.details}</p>
                    </td>
                  </tr>
                );
              })}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400 text-xs font-medium">
                    Aucun enregistrement d'audit trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
