/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Graphique hybride (Bâtons CA vs Ligne fine Marge Brute)
 * @created 2026-08-03
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { DashboardEmptyState } from './dashboard-empty-state';
import { useCurrency } from '@/lib/currency-context';

export interface SeriePoint {
  date: string;
  ca: number;
  benefice?: number;
  depenses?: number;
  ventes: number;
}

interface HybridSalesChartProps {
  data: SeriePoint[];
  canSeeProfit?: boolean;
}

const fmtDate = (dStr: string) => {
  if (!dStr) return '';
  const d = new Date(dStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
};

const fmtK = (n: number) => (Math.abs(n) >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`);

export function HybridSalesChart({ data, canSeeProfit = true }: HybridSalesChartProps) {
  const { convertAmount, formatAmount } = useCurrency();
  const hasData = data && data.some((d) => d.ca > 0 || (d.benefice ?? 0) > 0);
  const convertedData = data.map((point) => ({
    ...point,
    ca: convertAmount(point.ca),
    benefice: point.benefice === undefined ? undefined : convertAmount(point.benefice),
  }));

  if (!hasData) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm h-full flex flex-col justify-between">
        <h3 className="text-base font-bold text-slate-900 mb-4">Évolution Ventes & Rentabilité</h3>
        <DashboardEmptyState title="Aucune donnée sur la période" description="Enregistrez votre première vente pour visualiser les tendances." />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm h-full flex flex-col justify-between">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-900">Évolution Ventes vs Rentabilité</h3>
          <p className="text-xs text-slate-600">Volume de chiffre d'affaires et marge brute estimée</p>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={convertedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                if (!active || !payload || !payload.length) return null;
                const point = payload[0]?.payload as SeriePoint;
                return (
                  <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm space-y-1 text-xs">
                    <p className="font-bold text-slate-900 border-b border-slate-100 pb-1">
                      {new Date(label || Date.now()).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <div className="space-y-1 pt-1 font-mono">
                      <div className="flex items-center justify-between gap-4 text-emerald-700">
                        <span>Chiffre d'Affaires :</span>
                        <strong className="font-bold">{formatAmount(data.find((item) => item.date === point.date)?.ca ?? 0)}</strong>
                      </div>
                      {canSeeProfit && point.benefice !== undefined && (
                        <div className="flex items-center justify-between gap-4 text-amber-700">
                          <span>Marge Brute :</span>
                          <strong className="font-bold">{formatAmount(data.find((item) => item.date === point.date)?.benefice ?? 0)}</strong>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-4 text-slate-600">
                        <span>Nombre de Ventes :</span>
                        <strong>{point.ventes} vente{point.ventes > 1 ? 's' : ''}</strong>
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
              dataKey="ca"
              name="Chiffre d'Affaires"
              fill="#00A86B"
              radius={[6, 6, 0, 0]}
              maxBarSize={32}
            />
            {canSeeProfit && (
              <Line
                type="monotone"
                dataKey="benefice"
                name="Marge Brute"
                stroke="#F59E0B"
                strokeWidth={3}
                dot={{ r: 3, fill: '#F59E0B' }}
                activeDot={{ r: 5 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
