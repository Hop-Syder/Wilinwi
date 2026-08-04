/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant En-tête du Tableau de Bord (Architecture 2 Lignes Desktop / 3 Lignes Mobile & Égalisation)
 * @created 2026-06-20
 * @updated 2026-08-04
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React from 'react';
import { Store, Wifi, WifiOff, Calendar } from 'lucide-react';
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

      {/* ── AFFICHAGE MOBILE & TABLETTE (< lg) — 3 LIGNES COMPACTES ── */}
      <div className="lg:hidden space-y-2.5">
        {/* LIGNE 1 MOBILE : Titre + Badge Boutique */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="font-display text-xl font-extrabold text-slate-900 tracking-tight">
            Tableau de bord
          </h1>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <Store className="w-3.5 h-3.5 text-slate-500" />
            <span className="truncate max-w-[150px]">{activeEtablissementName}</span>
          </span>
        </div>

        {/* LIGNE 2 MOBILE : Badge Statut (Gauche) + Sélecteur Devises & Aide (Droite) */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
              isOnline
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {isOnline ? (
              <Wifi className="h-3 w-3 text-emerald-600 shrink-0" />
            ) : (
              <WifiOff className="h-3 w-3 text-amber-600 shrink-0" />
            )}
            <span className="truncate">
              {isOnline ? `En ligne (${pendingCount})` : `Hors-ligne (${pendingCount})`}
            </span>
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            <CurrencySelector />
            <ContextualHelp
              storageKey="wilinwi_dashboard_tour_done"
              tourSteps={tourSteps}
              useCases={dashboardUseCases}
            />
          </div>
        </div>

        {/* LIGNE 3 MOBILE : Badge Période (Gauche) + Filtre Période & Actions (Droite) */}
        <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 font-semibold bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
            <Calendar className="w-3 h-3 text-slate-500" />
            <span>
              {dateRange.from} → {dateRange.to}
            </span>
          </span>

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
  );
}
