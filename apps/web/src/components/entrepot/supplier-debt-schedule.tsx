/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Échéancier des Dettes Fournisseurs & Règlements (Axe 4)
 * @created 2026-08-05
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React from 'react';
import { Calendar, DollarSign, Phone, Landmark, CheckCircle2 } from 'lucide-react';
import type { SupplierDto } from '@wilinwi/types';
import { formatFCFA } from '@wilinwi/ui';

interface SupplierDebtScheduleProps {
  suppliers: SupplierDto[];
  onRecordPayment: (supplier: SupplierDto) => void;
}

export function SupplierDebtSchedule({ suppliers, onRecordPayment }: SupplierDebtScheduleProps) {
  // Fournisseurs avec dette active
  const debtors = suppliers.filter((s) => (s.soldeDette ?? 0) > 0);
  const totalDebt = debtors.reduce((sum, s) => sum + (s.soldeDette ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Résumé dette fournisseur */}
      <div className="flex items-center justify-between rounded-2xl border border-rose-200/90 bg-rose-50/70 p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-2xs">
            <Landmark className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 block">
              Dette Fournisseurs Totale
            </span>
            <span className="font-mono text-xl font-black text-rose-950 tabular-nums">
              {formatFCFA(totalDebt)}
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-extrabold text-rose-900 bg-rose-100 px-3 py-1 rounded-full border border-rose-200">
            {debtors.length} fournisseur{debtors.length > 1 ? 's' : ''} à régler
          </span>
        </div>
      </div>

      {/* Liste de l'Échéancier */}
      {debtors.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-8 text-center text-slate-500 space-y-2">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
          <h4 className="text-sm font-bold text-slate-900">Aucune dette fournisseur en cours</h4>
          <p className="text-xs text-slate-500">Tous vos règlements fournisseurs sont à jour.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-500 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Fournisseur</th>
                  <th className="px-4 py-3.5">Contact</th>
                  <th className="px-4 py-3.5 text-right">Montant Dû</th>
                  <th className="px-4 py-3.5 text-center">Échéance Suggérée</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {debtors.map((s) => {
                  const dette = s.soldeDette ?? 0;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-extrabold text-slate-900">{s.nom}</div>
                        {s.notes && <span className="text-[11px] text-slate-500 truncate block max-w-xs">{s.notes}</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        {s.telephone ? (
                          <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-slate-700">
                            <Phone className="h-3 w-3 text-slate-400" />
                            {s.telephone}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-black text-rose-700 text-sm">
                        {formatFCFA(dette)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-200/60">
                          <Calendar className="h-3 w-3" /> 30 jours
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => onRecordPayment(s)}
                          className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-2xs hover:bg-emerald-700 active:scale-95 transition-all"
                        >
                          <DollarSign className="h-3.5 w-3.5" /> Régler
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
