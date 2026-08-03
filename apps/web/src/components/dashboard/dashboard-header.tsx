/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant En-tête du Tableau de Bord (Architecture 2 Lignes : Ligne 1 Contexte/Réseau & Ligne 2 Contrôles/Filtres)
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
    <div className="space-y-3 pb-4 border-b border-slate-200/80">
      {/* LIGNE 1 : Titre, Établissement (gauche) & Statut Réseau + Dates de la période (droite) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Titre & Établissement */}
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-extrabold text-slate-900 tracking-tight whitespace-nowrap">
            Tableau de bord
          </h1>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100/90 text-slate-700 border border-slate-200/80 whitespace-nowrap shadow-2xs">
            <Store className="w-3.5 h-3.5 text-slate-500" />
            <span>{activeEtablissementName}</span>
          </span>
        </div>

        {/* Statut Réseau & dates active */}
        <div className="flex items-center gap-2.5">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap border ${
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
                ? `En ligne — ${pendingCount} vente${pendingCount > 1 ? 's' : ''} en attente`
                : `Hors-ligne — ${pendingCount} vente${pendingCount > 1 ? 's' : ''} locale${pendingCount > 1 ? 's' : ''}`}
            </span>
          </span>

          <span className="hidden md:inline-block text-xs text-slate-500 font-medium whitespace-nowrap bg-slate-100/70 border border-slate-200/80 px-3 py-1 rounded-full">
            Période : <strong className="text-slate-800">{dateRange.from}</strong> au{' '}
            <strong className="text-slate-800">{dateRange.to}</strong>
          </span>
        </div>
      </div>

      {/* LIGNE 2 : Sélecteur de Devise + Filtre Période + Comparaison & Aide */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-1">
        {/* Gauche Ligne 2 : Devise + Boutons Période */}
        <div className="flex items-center gap-2.5 flex-wrap">
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
        </div>

        {/* Droite Ligne 2 : Aide Contextuelle */}
        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
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
