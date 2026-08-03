/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant sélecteur de période dynamique avec comparaison relative et dates personnalisées
 * @created 2026-08-03
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React from 'react';
import { Calendar, RefreshCw } from 'lucide-react';

export type PeriodPreset = 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'custom';

interface PeriodSelectorProps {
  preset: PeriodPreset;
  compare: boolean;
  onPresetChange: (preset: PeriodPreset) => void;
  onCompareToggle: (compare: boolean) => void;
  customFrom?: string;
  customTo?: string;
  onCustomDateChange?: (from: string, to: string) => void;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

const PRESET_LABELS: Record<PeriodPreset, string> = {
  today: "Aujourd'hui",
  yesterday: 'Hier',
  last7: '7 derniers jours',
  thisMonth: 'Ce mois',
  custom: 'Personnalisé',
};

export function PeriodSelector({
  preset,
  compare,
  onPresetChange,
  onCompareToggle,
  customFrom = '',
  customTo = '',
  onCustomDateChange,
  isRefreshing,
  onRefresh,
}: PeriodSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Groupe des boutons de préconfiguration */}
      <div className="inline-flex flex-wrap rounded-xl bg-slate-100 p-1 border border-slate-200/80 shadow-inner">
        {(['today', 'yesterday', 'last7', 'thisMonth', 'custom'] as PeriodPreset[]).map((p) => {
          const active = preset === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPresetChange(p)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                active
                  ? 'bg-white text-slate-900 shadow-sm font-bold border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              {PRESET_LABELS[p]}
            </button>
          );
        })}
      </div>

      {/* Champs de sélection de date personnalisée */}
      {preset === 'custom' && onCustomDateChange && (
        <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm">
          <Calendar className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-[11px] font-semibold text-slate-500">Du</span>
          <input
            type="date"
            value={customFrom}
            onChange={(e) => onCustomDateChange(e.target.value, customTo)}
            className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <span className="text-[11px] font-semibold text-slate-500">au</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => onCustomDateChange(customFrom, e.target.value)}
            className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      )}

      {/* Switch de comparaison relative vs période précédente */}
      <label className="inline-flex items-center gap-2 cursor-pointer select-none rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors">
        <input
          type="checkbox"
          checked={compare}
          onChange={(e) => onCompareToggle(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
        />
        <span>vs période précédente</span>
      </label>

      {/* Bouton de rafraîchissement réactif */}
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Rafraîchir les données"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200/80 bg-white p-2 text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
        </button>
      )}
    </div>
  );
}
