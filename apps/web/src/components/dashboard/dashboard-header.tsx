/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant En-tête du Tableau de Bord (Architecture Responsive Executive & Toolbar Unifiée)
 * @created 2026-06-20
 * @updated 2026-09-17
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React from 'react';
import { Store, Wifi, WifiOff, Calendar, RefreshCw, Check } from 'lucide-react';
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
    <div className="pb-4 border-b border-slate-200/80 space-y-3">
      {/* ── AFFICHAGE DESKTOP (lg:block hidden) — 2 LIGNES HORIZONTALES STRICTES ── */}
      <div className="hidden lg:block space-y-3">
        {/* LIGNE 1 DESKTOP (Contexte & Utilitaires) */}
        <div className="flex items-center justify-between gap-4">
          {/* Gauche : Titre + Badge Boutique + Badge Statut */}
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-black text-slate-900 tracking-tight whitespace-nowrap">
              Tableau de bord
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-slate-100/90 text-slate-700 border border-slate-200/80 whitespace-nowrap shadow-2xs">
              <Store className="w-3.5 h-3.5 text-blue-600" />
              <span className="truncate max-w-[220px]">{activeEtablissementName}</span>
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap border shadow-2xs ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                  : 'bg-amber-50 text-amber-800 border-amber-200/80'
              }`}
            >
              {isOnline ? (
                <Wifi className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              )}
              <span>
                {isOnline
                  ? `En ligne — ${pendingCount} vente${pendingCount > 1 ? 's' : ''} en attente`
                  : `Hors-ligne — ${pendingCount} locale${pendingCount > 1 ? 's' : ''}`}
              </span>
            </span>
          </div>

          {/* Droite : Sélecteur Devises + Bouton Aide */}
          <div className="flex items-center gap-2.5 shrink-0">
            <CurrencySelector />
            <ContextualHelp
              storageKey="wilinwi_dashboard_tour_done"
              tourSteps={tourSteps}
              useCases={dashboardUseCases}
            />
          </div>
        </div>

        {/* LIGNE 2 DESKTOP (Période & Filtres) */}
        <div className="flex items-center justify-between gap-4 pt-1">
          {/* Gauche : Badge Période Active */}
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-semibold whitespace-nowrap bg-slate-100/80 border border-slate-200/80 px-3.5 py-1.5 rounded-xl shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>
              Période : <strong className="text-slate-900">{dateRange.from}</strong> au{' '}
              <strong className="text-slate-900">{dateRange.to}</strong>
            </span>
          </span>

          <div className="flex-1" />

          {/* Droite : Groupe Filtres Période + Coche Comparaison + Rafraîchir */}
          <div className="flex items-center gap-2 shrink-0">
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
        </div>
      </div>

      {/* ── AFFICHAGE MOBILE & TABLETTE (< lg) — TOOLBAR COMPACTE EXECUTIVE ── */}
      <div className="lg:hidden space-y-2.5">
        {/* LIGNE 1 MOBILE : [ Titre | 🏪 Boutique ] ------------------ [ 🔄 Refresh ] [ ❓ Aide ] */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="font-display text-lg font-black text-slate-900 tracking-tight whitespace-nowrap">
              Tableau de bord
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/90 min-w-0">
              <Store className="w-3 h-3 text-blue-600 shrink-0" />
              <span className="truncate max-w-[120px] sm:max-w-[160px]">{activeEtablissementName}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              title="Actualiser les données"
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50 shrink-0 active:scale-95"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <ContextualHelp
              storageKey="wilinwi_dashboard_tour_done"
              tourSteps={tourSteps}
              useCases={dashboardUseCases}
            />
          </div>
        </div>

        {/* CARTE TOOLBAR UNIFIÉE DES FILTRES & PÉRIODES */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-2.5 shadow-2xs space-y-2">
          {/* Rangée 1 : Onglets temporels (Segmented Control sans scrollbar) */}
          <div className="overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-0.5">
            <PeriodSelector
              preset={preset}
              compare={false}
              onPresetChange={onPresetChange}
              onCompareToggle={() => {}}
              customFrom={customFrom}
              customTo={customTo}
              onCustomDateChange={onCustomDateChange}
              hideCompareAndRefresh
            />
          </div>

          {/* Rangée 2 : Utilitaires contextuels (Devise, Statut, Date active, Switch comparaison) */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 flex-wrap">
            {/* Gauche : Sélecteur de Devise + Badge Réseau compact */}
            <div className="flex items-center gap-1.5 shrink-0">
              <CurrencySelector />
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border shrink-0 ${
                  isOnline
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                    : 'bg-amber-50 text-amber-800 border-amber-200/80'
                }`}
                title={isOnline ? `${pendingCount} vente(s) en attente` : 'Mode hors-ligne'}
              >
                {isOnline ? (
                  <Wifi className="h-3 w-3 text-emerald-600 shrink-0" />
                ) : (
                  <WifiOff className="h-3 w-3 text-amber-600 shrink-0" />
                )}
                <span>{isOnline ? `En ligne` : `Hors-ligne`}</span>
              </span>
            </div>

            {/* Droite : Badge Date + Switch Comparaison */}
            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-600 font-semibold bg-slate-100/90 border border-slate-200/80 px-2 py-0.5 rounded-lg whitespace-nowrap">
                <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                <span>
                  {dateRange.from} → {dateRange.to}
                </span>
              </span>

              <button
                type="button"
                onClick={() => onCompareToggle(!compare)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold transition-all shadow-2xs select-none whitespace-nowrap active:scale-95 ${
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
                <span>vs période préc.</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
