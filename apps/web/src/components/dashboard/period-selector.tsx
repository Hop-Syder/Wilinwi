/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant sélecteur de période dynamique avec comparaison relative et dates personnalisées
 * @created 2026-08-03
 * @updated 2026-08-04
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React from 'react';
import { Calendar, RefreshCw, Check } from 'lucide-react';

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
  hideCompareAndRefresh?: boolean;
}

const PRESET_CONFIG: Record<PeriodPreset, { label: string; shortLabel: string }> = {
  today: { label: "Aujourd'hui", shortLabel: "Aujourd'hui" },
  yesterday: { label: 'Hier', shortLabel: 'Hier' },
  last7: { label: '7 derniers jours', shortLabel: '7 jours' },
  thisMonth: { label: 'Ce mois', shortLabel: 'Ce mois' },
  custom: { label: 'Personnalisé', shortLabel: 'Perso' },
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
  hideCompareAndRefresh = false,
}: PeriodSelectorProps) {
  return (
    <div className="inline-flex items-center gap-2 flex-nowrap max-w-full overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-0.5">
      {/* Groupe des boutons de préconfiguration (Segmented Control) */}
      <div className="inline-flex items-center rounded-xl bg-slate-100/90 p-1 border border-slate-200/80 shadow-2xs shrink-0">
        {(['today', 'yesterday', 'last7', 'thisMonth', 'custom'] as PeriodPreset[]).map((p) => {
          const active = preset === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPresetChange(p)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                active
                  ? 'bg-blue-600 text-white shadow-xs font-extrabold border border-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <span className="hidden sm:inline">{PRESET_CONFIG[p].label}</span>
              <span className="sm:hidden">{PRESET_CONFIG[p].shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Champs de sélection de date personnalisée */}
      {preset === 'custom' && onCustomDateChange && (
        <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-2.5 py-1 text-xs text-slate-700 shadow-2xs whitespace-nowrap shrink-0">
          <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span className="text-[11px] font-semibold text-slate-500">Du</span>
          <input
            type="date"
            value={customFrom}
            onChange={(e) => onCustomDateChange(e.target.value, customTo)}
            className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-[11px] font-semibold text-slate-500">au</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => onCustomDateChange(customFrom, e.target.value)}
            className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Switch moderne de comparaison relative vs période précédente */}
      {!hideCompareAndRefresh && (
        <button
          type="button"
          onClick={() => onCompareToggle(!compare)}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold transition-all shadow-2xs select-none whitespace-nowrap active:scale-95 shrink-0 ${
            compare
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500/20'
              : 'border-slate-200/90 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span
            className={`flex h-3.5 w-3.5 items-center justify-center rounded border transition-colors ${
              compare ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white'
            }`}
          >
            {compare && <Check className="h-2.5 w-2.5 stroke-[3]" />}
          </span>
          <span>vs période précédente</span>
        </button>
      )}

      {/* Bouton d'actualisation manuelle */}
      {!hideCompareAndRefresh && onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Actualiser les données"
          className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50 shrink-0 active:scale-95"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
        </button>
      )}
    </div>
  );
}
