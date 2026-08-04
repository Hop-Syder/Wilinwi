/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Carte KPIs Synthèse Stock Haut de Page (Grid 2 Colonnes md:grid-cols-2 & Vue Mobile L1: Total Réf, L2: Valeur Stock)
 * @created 2026-08-03
 * @updated 2026-08-04
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React from 'react';
import { Package, DollarSign, AlertTriangle, AlertCircle, ShoppingCart, ArrowRight } from 'lucide-react';
import { formatFCFA, formatQty } from '@wilinwi/ui';

interface StockKpiCardsProps {
  totalProducts: number;
  activeProductsCount: number;
  archivedProductsCount: number;
  totalValueCost: number;
  totalValueRetail: number;
  lowStockCount: number;
  outOfStockCount: number;
  filterLowStockActive: boolean;
  onToggleLowStockFilter: () => void;
  onGeneratePurchaseOrder: () => void;
  canSeeCost?: boolean;
}

export function StockKpiCards({
  totalProducts,
  activeProductsCount,
  archivedProductsCount,
  totalValueCost,
  totalValueRetail,
  lowStockCount,
  outOfStockCount,
  filterLowStockActive,
  onToggleLowStockFilter,
  onGeneratePurchaseOrder,
  canSeeCost = true,
}: StockKpiCardsProps) {
  return (
    <div>
      {/* ── VUE MOBILE (< md) : 2 LIGNES DÉDIÉES (L1: Total Références, L2: Valeur du Stock) ── */}
      <div className="md:hidden space-y-2.5">
        {/* Ligne 1 Mobile : [ Total Références ] */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shrink-0">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block leading-tight">
                Total Références
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-base font-black text-slate-900 tabular-nums">
                  {formatQty(totalProducts)}
                </span>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                  {activeProductsCount} actif{activeProductsCount > 1 ? 's' : ''}
                </span>
                {archivedProductsCount > 0 && (
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {archivedProductsCount} inact.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Ligne 2 Mobile : [ Valeur du Stock ] */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shrink-0">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block leading-tight">
                Valeur du Stock (CA Potentiel)
              </span>
              <p className="font-mono text-base font-black text-slate-900 tabular-nums mt-0.5">
                {formatFCFA(totalValueRetail)}
              </p>
            </div>
          </div>

          {canSeeCost && totalValueCost > 0 && (
            <div className="text-right pl-2 border-l border-slate-100 shrink-0">
              <span className="text-[9px] font-bold uppercase text-slate-500 block leading-none">Capital</span>
              <span className="font-mono text-xs font-extrabold text-slate-700 tabular-nums mt-0.5 block">
                {formatFCFA(totalValueCost)}
              </span>
            </div>
          )}
        </div>

        {/* Ligne 3 Mobile : [ SOUS SEUIL D'ALERTE ⚠️ ] | [ RUPTURES DE STOCK ❗ ] */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Sous Seuil d'Alerte */}
          <button
            type="button"
            onClick={onToggleLowStockFilter}
            className={`flex items-center justify-between rounded-2xl border p-3.5 transition-all text-left ${
              filterLowStockActive
                ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                : 'bg-amber-50/80 text-amber-950 border-amber-200/90 hover:bg-amber-100/60'
            }`}
          >
            <div className="min-w-0 pr-1">
              <span className={`text-[10px] font-extrabold uppercase tracking-wider block leading-tight ${filterLowStockActive ? 'text-amber-100' : 'text-amber-800'}`}>
                Stock Bas
              </span>
              <span className="text-xs font-black font-mono mt-0.5 block">
                {lowStockCount} art. ⚠️
              </span>
            </div>
            <ArrowRight className={`h-3.5 w-3.5 shrink-0 ${filterLowStockActive ? 'text-white' : 'text-amber-600'}`} />
          </button>

          {/* Ruptures de Stock */}
          <div className="flex items-center justify-between rounded-2xl border border-rose-200/90 bg-rose-50/80 p-3.5 text-rose-950">
            <div className="min-w-0 pr-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-800 block leading-tight">
                Ruptures
              </span>
              <span className="text-xs font-black font-mono text-rose-950 mt-0.5 block">
                {outOfStockCount} rupt. ❗
              </span>
            </div>
            <button
              type="button"
              onClick={onGeneratePurchaseOrder}
              title="Générer Bon de Commande"
              className="p-1.5 bg-rose-600 text-white rounded-xl shadow-2xs hover:bg-rose-700 active:scale-95 transition-all shrink-0"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── VUE DESKTOP & TABLETTE (≥ md) : GRID 2/4 COLONNES COMPLÈTE ── */}
      <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 items-stretch gap-4">
        {/* LIGNE 1 MD : Total Références */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm space-y-3 transition-all hover:shadow-md md:col-span-2 lg:col-span-1 h-full flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Références
            </span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600 border border-blue-100">
              <Package className="h-5 w-5" />
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="font-mono text-2xl font-extrabold text-slate-900 tabular-nums">
              {formatQty(totalProducts)}
            </h3>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {activeProductsCount} actif{activeProductsCount > 1 ? 's' : ''}
              </span>
              <span>•</span>
              <span className="text-slate-600 font-semibold">
                {archivedProductsCount} inactif{archivedProductsCount > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* LIGNE 2 MD : Valeur du Stock */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm space-y-3 transition-all hover:shadow-md md:col-span-2 lg:col-span-1 h-full flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Valeur du Stock
            </span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 border border-emerald-100">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>

          <div className="space-y-1.5 font-mono">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Valeur Vente (CA Potentiel)
              </span>
              <p className="text-xl font-extrabold text-slate-900 tabular-nums">
                {formatFCFA(totalValueRetail)}
              </p>
            </div>

            {canSeeCost && (
              <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-xs font-sans">
                <span className="text-slate-500 font-medium">Prix d'Achat (Capital) :</span>
                <strong className="text-slate-700 font-bold">{formatFCFA(totalValueCost)}</strong>
              </div>
            )}
          </div>
        </div>

        {/* LIGNE 3 MD (Gauche) : [ SOUS SEUIL D'ALERTE ⚠️ ] */}
        <button
          type="button"
          onClick={onToggleLowStockFilter}
          className={`relative text-left overflow-hidden rounded-2xl border p-5 shadow-sm transition-all duration-200 md:col-span-1 lg:col-span-1 h-full flex flex-col justify-between ${
            filterLowStockActive
              ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-400'
              : 'bg-white border-slate-200/70 hover:border-amber-300 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                filterLowStockActive ? 'text-amber-100' : 'text-slate-500'
              }`}
            >
              Sous Seuil d'Alerte
            </span>
            <div
              className={`rounded-xl p-2 border ${
                filterLowStockActive
                  ? 'bg-amber-600/60 text-white border-amber-400/50'
                  : 'bg-amber-50 text-amber-600 border-amber-100'
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-2 space-y-1">
            <h3
              className={`font-mono text-2xl font-extrabold tabular-nums ${
                filterLowStockActive ? 'text-white' : 'text-slate-900'
              }`}
            >
              {lowStockCount} article{lowStockCount > 1 ? 's' : ''}
            </h3>
            <p
              className={`text-xs font-semibold flex items-center gap-1 ${
                filterLowStockActive ? 'text-amber-100' : 'text-amber-700'
              }`}
            >
              <span>{filterLowStockActive ? 'Filtre actif — Tout réafficher' : 'Cliquer pour filtrer'}</span>
              <ArrowRight className="h-3 w-3" />
            </p>
          </div>
        </button>

        {/* LIGNE 3 MD (Droite) : [ RUPTURES DE STOCK ❗ ] */}
        <div className="relative overflow-hidden rounded-2xl border border-rose-200/80 bg-rose-50/50 p-5 shadow-sm space-y-3 md:col-span-1 lg:col-span-1 h-full flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
              Ruptures de Stock
            </span>
            <div className="rounded-xl bg-rose-100 p-2 text-rose-600 border border-rose-200">
              <AlertCircle className="h-5 w-5 animate-pulse" />
            </div>
          </div>

          <div>
            <h3 className="font-mono text-2xl font-extrabold text-rose-900 tabular-nums">
              {outOfStockCount} rupture{outOfStockCount > 1 ? 's' : ''}
            </h3>
            <p className="text-xs font-medium text-rose-700">Stock épuisé en rayon</p>
          </div>

          <button
            type="button"
            onClick={onGeneratePurchaseOrder}
            className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-rose-700 active:scale-95"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            <span>Générer Bon de Commande</span>
          </button>
        </div>
      </div>
    </div>
  );
}
