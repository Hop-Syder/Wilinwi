/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant En-tête du Tableau de Bord (Architecture 5 Axes : Single-line Desktop Alignment, Badges & Contexte Temporel)
 * @created 2026-06-20
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React from 'react';
import { Store, Wifi, WifiOff } from 'lucide-react';
import { CurrencySelector } from '@/components/currency-selector';
import { PeriodSelector, PeriodPreset } from '@/components/dashboard/period-selector';
import { ContextualHelp } from '@/components/contextual-help';
import type { TourStep } from '@/components/tour-guide';

interface DashboardHeaderProps {
  activeEtablissementName: string;
  isOnline: boolean;
  pendingCount: number;
  dateRange: { from: string; to: string };
  preset: PeriodPreset;
  compare: boolean;
  customFrom: string;
  customTo: string;
  loading: boolean;
  onPresetChange: (preset: PeriodPreset) => void;
  onCompareToggle: (compare: boolean) => void;
  onCustomDateChange: (from: string, to: string) => void;
  onRefresh: () => void;
  tourSteps: TourStep[];
  dashboardUseCases: { title: string; description: string }[];
}

export function DashboardHeader({
  activeEtablissementName,
  isOnline,
  pendingCount,
  dateRange,
  preset,
  compare,
  customFrom,
  customTo,
  loading,
  onPresetChange,
  onCompareToggle,
  onCustomDateChange,
  onRefresh,
  tourSteps,
  dashboardUseCases,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between pb-4 border-b border-slate-200/80">
      {/* BLOC GAUCHE : Titre + Établissement */}
      <div className="flex items-center gap-3 shrink-0">
        <h1 className="font-display text-2xl font-extrabold text-slate-900 tracking-tight whitespace-nowrap">
          Tableau de bord
        </h1>

        {/* Badge Établissement */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100/90 text-slate-700 border border-slate-200/80 whitespace-nowrap shadow-2xs">
          <Store className="w-3.5 h-3.5 text-slate-500" />
          <span>{activeEtablissementName}</span>
        </span>
      </div>

      {/* BLOC MILIEU (ESPACE CENTRAL) : Statut Réseau & dates de période unifiées */}
      <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-2xl bg-slate-50 border border-slate-200/60 shadow-2xs">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap border ${
            isOnline
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
              : 'bg-amber-50 text-amber-800 border-amber-200/80'
          }`}
        >
          {isOnline ? (
            <Wifi className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-amber-600" />
          )}
          <span>
            {isOnline
              ? `En ligne — ${pendingCount} en attente`
              : `Hors-ligne — ${pendingCount} locale(s)`}
          </span>
        </span>

        <span className="text-slate-300 text-xs font-light">|</span>

        <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
          Période : <strong className="text-slate-800">{dateRange.from}</strong> au{' '}
          <strong className="text-slate-800">{dateRange.to}</strong>
        </span>
      </div>

      {/* BLOC DROIT : Devise + Période + Aide (Strictement 1 Ligne) */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
        <CurrencySelector />

        <PeriodSelector
          preset={preset}
          compare={compare}
          onPresetChange={onPresetChange}
          onCompareToggle={onCompareToggle}
          customFrom={customFrom}
          customTo={customTo}
          onCustomDateChange={onCustomDateChange}
          isRefreshing={loading}
          onRefresh={onRefresh}
        />

        <div className="pl-1 border-l border-slate-200/80 shrink-0">
          <ContextualHelp
            storageKey="wilinwi_dashboard_tour_done"
            tourSteps={tourSteps}
            useCases={dashboardUseCases}
          />
        </div>
      </div>
    </div>
  );
}
