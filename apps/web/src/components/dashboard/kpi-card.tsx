/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant Carte KPI Hero avec sparkline en arrière-plan et badge de tendance
 * @created 2026-08-03
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useCurrency } from '@/lib/currency-context';

interface KpiCardProps {
  title: string;
  value: number;
  isCurrency?: boolean;
  variationPercent?: number;
  previousValue?: number;
  compareActive?: boolean;
  sparklineData?: number[];
  subtext?: string;
  periodLabel?: string;
  icon?: React.ReactNode;
  variant?: 'emerald' | 'amber' | 'rose' | 'indigo';
  sensitive?: boolean;
}

export function KpiCard({
  title,
  value,
  isCurrency = true,
  variationPercent = 0,
  previousValue,
  compareActive = true,
  sparklineData = [],
  subtext,
  periodLabel,
  icon,
  variant = 'emerald',
  sensitive = false,
}: KpiCardProps) {
  const { formatAmount } = useCurrency();
  const isPositive = variationPercent > 0;
  const isNegative = variationPercent < 0;
  const diff = previousValue !== undefined ? value - previousValue : 0;

  // Calcul du tracé SVG Sparkline
  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return null;

    const min = Math.min(...sparklineData);
    const max = Math.max(...sparklineData);
    const range = max - min || 1;
    const width = 120;
    const height = 36;

    const points = sparklineData
      .map((val, idx) => {
        const x = (idx / (sparklineData.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 8) - 4;
        return `${x},${y}`;
      })
      .join(' ');

    const strokeColor =
      variant === 'emerald'
        ? '#00A86B'
        : variant === 'amber'
          ? '#F59E0B'
          : variant === 'rose'
            ? '#E53935'
            : '#3B82F6';

    return (
      <svg className="absolute bottom-2 right-2 h-10 w-28 opacity-25" viewBox="0 0 120 36">
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  const badgeColorClass = isPositive
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : isNegative
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300">
      {/* Dynamic Sparkline SVG Background */}
      {renderSparkline()}

      <div className="relative z-10 space-y-3">
        {/* Header Carte : Titre + Icône / Badge */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</span>
          {icon && (
            <div className="rounded-xl bg-slate-50 p-2 text-slate-600 border border-slate-100">
              {icon}
            </div>
          )}
        </div>

        {/* Valeur Principale Grand Format */}
        <div className="space-y-1">
          <h3 className="font-mono text-2xl font-extrabold tracking-tight text-slate-900 tabular-nums">
            {sensitive ? '••••••' : isCurrency ? formatAmount(value) : value.toLocaleString('fr-FR')}
          </h3>

          {/* Badge de variation relative */}
          {compareActive && !sensitive && (
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-bold ${badgeColorClass}`}
              >
                {isPositive ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : isNegative ? (
                  <TrendingDown className="h-3.5 w-3.5" />
                ) : (
                  <Minus className="h-3.5 w-3.5" />
                )}
                <span>{isPositive ? `+${variationPercent}%` : `${variationPercent}%`}</span>
              </span>

              {previousValue !== undefined ? (
                <span className="text-[11px] font-medium text-slate-500">
                  {isCurrency ? formatAmount(previousValue) : previousValue.toLocaleString('fr-FR')}{' '}
                  {periodLabel ?? 'vs précédente'} ({diff >= 0 ? `+${isCurrency ? formatAmount(diff) : diff}` : (isCurrency ? formatAmount(diff) : diff)})
                </span>
              ) : (
                <span className="text-[11px] font-medium text-slate-500">vs période précédente</span>
              )}
            </div>
          )}
        </div>

        {/* Sous-texte explicatif */}
        {!compareActive && subtext && <p className="text-xs text-slate-600 font-medium">{subtext}</p>}
      </div>
    </div>
  );
}
