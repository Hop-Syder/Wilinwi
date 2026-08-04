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
    <div className="pb-4 border-b border-slate-200/80">
      {/* En-tête du Tableau de bord — Aligné sur une seule ligne horizontale en affichage bureau (lg:flex-row) */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Partie Gauche : Titre, Établissement & Statut Réseau */}
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-display text-2xl font-extrabold text-slate-900 tracking-tight whitespace-nowrap">
            Tableau de bord
          </h1>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100/90 text-slate-700 border border-slate-200/80 whitespace-nowrap shadow-2xs">
            <Store className="w-3.5 h-3.5 text-slate-500" />
            <span>{activeEtablissementName}</span>
          </span>
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
                : `Hors-ligne — ${pendingCount} locale${pendingCount > 1 ? 's' : ''}`}
            </span>
          </span>
        </div>

        {/* Partie Droite : Sélecteur de Devise + Filtre Période + Aide Contextuelle */}
        <div className="flex items-center gap-2.5 flex-wrap justify-start lg:justify-end">
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
