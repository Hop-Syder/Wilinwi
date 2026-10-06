'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Onglet « Remises accordées » de /ventes (OWNER/MANAGER) : ventes passées
 *   SOUS le prix de vente affiché (fourchette de prix à la caisse), avec le caissier
 *   et le NOM DU CLIENT, cumulées par caissier et par client, export CSV.
 *   Source : GET /api/analytics/discounts (capacité reports:read_full).
 * @created 2026-10-06
 * 🌐 nexus-partners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useMemo, useState } from 'react';
import { BadgePercent, FileSpreadsheet, UserRound, Users } from 'lucide-react';
import type { DiscountReportDto, DiscountTotalDto } from '@wilinwi/types';
import { Button, formatFCFA, formatQty } from '@wilinwi/ui';
import { apiGet } from '@/lib/api';
import { useCachedQuery } from '@/lib/use-cached-query';

type Period = 'TODAY' | '7DAYS' | 'MONTH';

/** Date locale AAAA-MM-JJ (le serveur la borne au fuseau de l'établissement). */
function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function rangeFor(period: Period): { from: string; to: string } {
  const today = new Date();
  const to = ymd(today);
  if (period === 'TODAY') return { from: to, to };
  if (period === 'MONTH') return { from: ymd(new Date(today.getFullYear(), today.getMonth(), 1)), to };
  const f = new Date(today);
  f.setDate(f.getDate() - 6);
  return { from: ymd(f), to };
}

function TotalsList({ title, icon: Icon, rows, total }: {
  title: string;
  icon: React.ElementType;
  rows: DiscountTotalDto[];
  total: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
        <Icon className="h-4 w-4 text-blue-700" /> {title}
      </h3>
      {rows.length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-400">Aucune remise sur la période.</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.slice(0, 8).map((r) => (
            <li key={r.id}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="truncate font-semibold text-slate-800">{r.nom}</span>
                <span className="shrink-0 font-mono font-bold text-amber-700">
                  {formatFCFA(r.remise)} <span className="font-sans font-medium text-slate-400">· {r.lignes} vente{r.lignes > 1 ? 's' : ''}</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{ width: `${total > 0 ? Math.max(4, (r.remise / total) * 100) : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function VentesRemises() {
  const [period, setPeriod] = useState<Period>('7DAYS');
  const range = useMemo(() => rangeFor(period), [period]);
  const qs = `?from=${range.from}&to=${range.to}`;
  const { data, loading, error } = useCachedQuery<DiscountReportDto>(
    `analytics/discounts${qs}`,
    () => apiGet<DiscountReportDto>(`/api/analytics/discounts${qs}`),
  );

  // Taux de remise moyen sur les lignes remisées : remise / prix affiché total.
  const taux = data && data.caRemise + data.totalRemise > 0
    ? (data.totalRemise / (data.caRemise + data.totalRemise)) * 100
    : 0;

  function exportCSV() {
    if (!data) return;
    const rows = [
      ['Date', 'Reçu', 'Caissier', 'Client', 'Produit', 'Conditionnement', 'Quantité', 'Prix de vente', 'Prix accordé', 'Remise (FCFA)'],
      ...data.lignes.map((l) => [
        new Date(l.date).toLocaleString('fr-FR'),
        l.receiptCode ?? l.saleId.slice(0, 8),
        l.vendeurNom,
        l.clientNom,
        l.productNom,
        l.unitLabel ?? '',
        String(l.quantite).replace('.', ','),
        String(l.prixReference),
        String(l.prixReel),
        String(l.remise),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `remises_${range.from}_${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const periods: { key: Period; label: string }[] = [
    { key: 'TODAY', label: "Aujourd'hui" },
    { key: '7DAYS', label: '7 jours' },
    { key: 'MONTH', label: 'Ce mois' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
          {periods.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={`whitespace-nowrap rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                period === p.key ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          onClick={exportCSV}
          disabled={!data || data.lignes.length === 0}
          className="flex items-center gap-2 border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/30"
        >
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Exporter en CSV
        </Button>
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-600">{error.message}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Remises accordées', value: formatFCFA(data?.totalRemise ?? 0), tone: 'text-amber-700' },
          { label: 'Ventes remisées', value: formatQty(data?.lignes.length ?? 0), tone: 'text-slate-900' },
          { label: 'CA des ventes remisées', value: formatFCFA(data?.caRemise ?? 0), tone: 'text-slate-900' },
          { label: 'Remise moyenne', value: `${taux.toFixed(1).replace('.', ',')} %`, tone: 'text-slate-900' },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <p className="text-[11px] font-medium text-slate-400">{k.label}</p>
            <p className={`tabular mt-1 truncate text-lg font-black ${k.tone}`}>{loading && !data ? '…' : k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <TotalsList title="Par caissier" icon={UserRound} rows={data?.parVendeur ?? []} total={data?.totalRemise ?? 0} />
        <TotalsList title="Par client" icon={Users} rows={data?.parClient ?? []} total={data?.totalRemise ?? 0} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <BadgePercent className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-bold text-slate-900">Détail des ventes sous le prix affiché</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-2.5 font-bold">Date</th>
                <th className="px-4 py-2.5 font-bold">Caissier</th>
                <th className="px-4 py-2.5 font-bold">Client</th>
                <th className="px-4 py-2.5 font-bold">Produit</th>
                <th className="px-4 py-2.5 text-right font-bold">Qté</th>
                <th className="px-4 py-2.5 text-right font-bold">Prix de vente</th>
                <th className="px-4 py-2.5 text-right font-bold">Prix accordé</th>
                <th className="px-4 py-2.5 text-right font-bold">Remise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.lignes ?? []).map((l, i) => (
                <tr key={`${l.saleId}-${i}`} className="hover:bg-slate-50/60">
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                    {new Date(l.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-slate-700">{l.vendeurNom}</td>
                  <td className="px-4 py-2.5 font-bold text-slate-900">{l.clientNom}</td>
                  <td className="px-4 py-2.5 text-slate-700">
                    {l.productNom}
                    {l.unitLabel && <span className="ml-1 rounded bg-blue-50 px-1 text-[10px] font-bold text-blue-700">{l.unitLabel}</span>}
                  </td>
                  <td className="tabular px-4 py-2.5 text-right text-slate-700">{formatQty(l.quantite)}</td>
                  <td className="tabular px-4 py-2.5 text-right text-slate-400 line-through">{formatFCFA(l.prixReference)}</td>
                  <td className="tabular px-4 py-2.5 text-right font-semibold text-slate-900">{formatFCFA(l.prixReel)}</td>
                  <td className="tabular px-4 py-2.5 text-right font-black text-amber-700">−{formatFCFA(l.remise)}</td>
                </tr>
              ))}
              {data && data.lignes.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">
                    Aucune vente sous le prix affiché sur la période — tout a été vendu au prix de vente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
