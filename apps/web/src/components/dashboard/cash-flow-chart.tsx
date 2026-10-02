/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Graphique Flux de Caisse : entrées (CA) vs sorties (dépenses) + solde net cumulé
 * @created 2026-09-21
 * @updated 2026-09-21
 * 🌐 nexus-partners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { DashboardEmptyState } from './dashboard-empty-state';
import { useCurrency } from '@/lib/currency-context';
import type { SeriePoint } from './hybrid-sales-chart';

interface CashFlowChartProps {
  data: SeriePoint[];
}

const fmtDate = (dStr: string) => {
  if (!dStr) return '';
  const d = new Date(dStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
};

const fmtK = (n: number) => (Math.abs(n) >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`);

export function CashFlowChart({ data }: CashFlowChartProps) {
  const { convertAmount, formatAmount } = useCurrency();

  const chartData = useMemo(() => {
    let cumul = 0;
    return data.map((point) => {
      const entrees = convertAmount(point.ca);
      const sorties = convertAmount(point.depenses ?? 0);
      cumul += entrees - sorties;
      return { date: point.date, entrees, sorties, soldeCumule: cumul };
    });
  }, [data, convertAmount]);

  const hasData = chartData.some((d) => d.entrees > 0 || d.sorties > 0);
  const netPeriod = chartData.length ? chartData[chartData.length - 1].soldeCumule : 0;

  if (!hasData) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm h-full flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Mes Entrées et Sorties d'Argent</h3>
          <p className="text-xs text-slate-600">
            Argent qui rentre (ventes) vs argent qui sort (dépenses)
          </p>
        </div>
        <DashboardEmptyState
          title="Aucun flux sur la période"
          description="Les entrées et sorties de trésorerie apparaîtront ici."
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm h-full flex flex-col justify-between">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-900">Mes Entrées et Sorties d'Argent</h3>
          <p className="text-xs text-slate-600">
            Argent qui rentre (ventes) vs argent qui sort (dépenses)
          </p>
        </div>
        <div className="text-right">
          <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Résultat de la période
          </span>
          <span
            className={`font-mono text-lg font-black tabular-nums ${netPeriod >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
          >
            {netPeriod >= 0 ? '+' : ''}
            {formatAmount(netPeriod)}
          </span>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="cashflowGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis
              dataKey="date"
              tickFormatter={fmtDate}
              tick={{ fontSize: 11, fill: '#64748B' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={fmtK}
              tick={{ fontSize: 11, fill: '#64748B' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const point = payload[0].payload as {
                  entrees: number;
                  sorties: number;
                  soldeCumule: number;
                };
                const net = point.entrees - point.sorties;
                return (
                  <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm space-y-1.5 text-xs">
                    <p className="font-bold text-slate-900 border-b border-slate-100 pb-1">
                      {new Date(label || Date.now()).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </p>
                    <div className="space-y-1 font-mono">
                      <div className="flex items-center justify-between gap-4 text-emerald-700">
                        <span>Entrées :</span>
                        <strong className="font-bold">{formatAmount(point.entrees)}</strong>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-rose-600">
                        <span>Sorties :</span>
                        <strong className="font-bold">{formatAmount(point.sorties)}</strong>
                      </div>
                      <div
                        className={`flex items-center justify-between gap-4 font-bold border-t border-slate-100 pt-1 ${net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                      >
                        <span>Net du jour :</span>
                        <span>
                          {net >= 0 ? '+' : ''}
                          {formatAmount(net)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-blue-700">
                        <span>Solde cumulé :</span>
                        <strong className="font-bold">{formatAmount(point.soldeCumule)}</strong>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
            />
            <Bar
              dataKey="entrees"
              name="Entrées (CA)"
              fill="#00A86B"
              radius={[6, 6, 0, 0]}
              maxBarSize={32}
            />
            <Bar
              dataKey="sorties"
              name="Sorties (Dépenses)"
              fill="#E53935"
              radius={[6, 6, 0, 0]}
              maxBarSize={32}
            />
            <Area
              type="monotone"
              dataKey="soldeCumule"
              name="Solde cumulé"
              stroke="#3B82F6"
              strokeWidth={2.5}
              fill="url(#cashflowGradient)"
              dot={false}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
