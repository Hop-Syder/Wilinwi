/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Graphique en anneau (Donut Chart) pour la répartition des règlements
 * @created 2026-08-03
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { DashboardEmptyState } from './dashboard-empty-state';
import { useCurrency } from '@/lib/currency-context';

export interface PaymentItem {
  methode: string;
  label: string;
  color?: string;
  montant: number;
  pourcentage: number;
  ventes: number;
  isCredit?: boolean;
}

interface PaymentDonutChartProps {
  data: PaymentItem[];
}

const DEFAULT_COLORS = ['#00A86B', '#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6'];

export function PaymentDonutChart({ data }: PaymentDonutChartProps) {
  const { convertAmount, formatAmount } = useCurrency();
  const totalVentes = data.reduce((sum, item) => sum + item.montant, 0);
  const totalEncaisse = data
    .filter((item) => !item.isCredit)
    .reduce((sum, item) => sum + item.montant, 0);
  const hasData = totalVentes > 0;
  const convertedData = data.map((item) => ({ ...item, montant: convertAmount(item.montant) }));

  if (!hasData) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-2xs flex flex-col justify-between h-[386px]">
        <div>
          <h3 className="text-base font-bold text-slate-900">Répartition des Règlements</h3>
          <p className="text-xs text-slate-500">Ventilation par canaux de paiement</p>
        </div>
        <DashboardEmptyState title="Aucun règlement" description="Les encaissements s'afficheront par mode de paiement." />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-2xs flex flex-col justify-between h-[386px]">
      <div>
        <h3 className="text-base font-bold text-slate-900">Répartition des Règlements</h3>
        <p className="text-xs text-slate-500">Ventilation par canaux de paiement</p>
      </div>

      <div className="relative h-44 w-full flex items-center justify-center my-1">
        {/* Montant total au centre du Donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Encaissé</span>
          <span className="font-mono text-sm font-extrabold text-slate-900">
            {formatAmount(totalEncaisse)}
          </span>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={convertedData}
              dataKey="montant"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={68}
              paddingAngle={3}
              cornerRadius={6}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const item = payload[0]?.payload as PaymentItem;
                return (
                  <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-lg text-xs space-y-1">
                    <p className="font-bold text-slate-900">{item.label}</p>
                    <div className="font-mono space-y-0.5">
                      <p className="text-emerald-600 font-bold">{formatAmount(data.find((entry) => entry.methode === item.methode)?.montant ?? 0)}</p>
                      <p className="text-slate-500">{item.pourcentage}% du total ({item.ventes} ventes)</p>
                    </div>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Légende Explicite Compacte */}
      <div className="space-y-1.5 pt-2 border-t border-slate-100 max-h-32 overflow-y-auto scrollbar-none">
        {data.map((item, idx) => (
          <div key={item.methode} className="flex items-center justify-between text-xs font-medium">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length] }}
              />
              <span className="text-slate-700 font-semibold truncate max-w-[120px]">{item.label}</span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-slate-900 font-bold">{formatAmount(item.montant)}</span>
              <span className="text-slate-500 font-medium text-[11px] w-9 text-right">
                {item.pourcentage}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
