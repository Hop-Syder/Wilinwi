/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Carte KPIs Synthèse Stock Haut de Page (Grid 2 Colonnes & Égalisation items-stretch)
 * @created 2026-08-03
 * @updated 2026-08-04
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React from 'react';
import { Package, DollarSign, AlertTriangle, AlertCircle, ShoppingCart } from 'lucide-react';
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
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
      {/* 1. Nombre Total de Références */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 shadow-xs space-y-3 transition-all hover:shadow-md h-full flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-500 truncate">
            Total Références
          </span>
          <div className="rounded-xl bg-blue-50 p-2 text-blue-600 border border-blue-100 shrink-0">
            <Package className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="font-mono text-xl sm:text-2xl font-extrabold text-slate-900 tabular-nums">
            {formatQty(totalProducts)}
          </h3>
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-slate-500 flex-wrap">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              {activeProductsCount} actif{activeProductsCount > 1 ? 's' : ''}
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="text-slate-600 font-semibold">
              {archivedProductsCount} inactif{archivedProductsCount > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Valeur Financière du Stock (Double Affichage Achat / Vente) */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5 shadow-xs space-y-3 transition-all hover:shadow-md h-full flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-500 truncate">
            Valeur du Stock
          </span>
          <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 border border-emerald-100 shrink-0">
            <DollarSign className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="space-y-1 font-mono">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Valeur Vente (CA Potentiel)
            </span>
            <p className="text-lg sm:text-xl font-extrabold text-slate-900 tabular-nums truncate">
              {formatFCFA(totalValueRetail)}
            </p>
          </div>

          {canSeeCost && (
            <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs">
              <span className="text-slate-500 font-sans font-medium">Prix d'Achat :</span>
              <strong className="text-slate-700 font-bold truncate">{formatFCFA(totalValueCost)}</strong>
            </div>
          )}
        </div>
      </div>

      {/* 3. Articles sous Seuil d'Alerte (Cliquable pour filtrer) */}
      <button
        type="button"
        onClick={onToggleLowStockFilter}
        className={`relative text-left overflow-hidden rounded-2xl border p-4 sm:p-5 shadow-xs transition-all duration-200 h-full flex flex-col justify-between ${
          filterLowStockActive
            ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-400'
            : 'bg-white border-slate-200/70 hover:border-amber-300 hover:shadow-md'
        }`}
      >
        <div className="flex items-center justify-between gap-1">
          <span
            className={`text-[11px] sm:text-xs font-extrabold uppercase tracking-wider truncate ${
              filterLowStockActive ? 'text-amber-100' : 'text-slate-500'
            }`}
          >
            Sous Seuil d'Alerte ⚠️
          </span>
          <div
            className={`rounded-xl p-2 border shrink-0 ${
              filterLowStockActive
                ? 'bg-amber-600/60 text-white border-amber-400/50'
                : 'bg-amber-50 text-amber-600 border-amber-100'
            }`}
          >
            <AlertTriangle className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="mt-2 space-y-0.5">
          <h3
            className={`font-mono text-xl sm:text-2xl font-extrabold tabular-nums ${
              filterLowStockActive ? 'text-white' : 'text-slate-900'
            }`}
          >
            {lowStockCount} article{lowStockCount > 1 ? 's' : ''}
          </h3>
          <p className={`text-[11px] sm:text-xs font-medium ${filterLowStockActive ? 'text-amber-100' : 'text-slate-500'}`}>
            Stock sous le seuil d'alerte
          </p>
        </div>

        <div className="pt-2">
          <p
            className={`text-[11px] sm:text-xs font-bold flex items-center gap-1 ${
              filterLowStockActive ? 'text-white underline' : 'text-amber-700 hover:underline'
            }`}
          >
            <span>{filterLowStockActive ? 'Tout réafficher ➔' : 'Cliquer pour filtrer ➔'}</span>
          </p>
        </div>
      </button>

      {/* 4. Ruptures de Stock avec Action Bon de Commande */}
      <div className="relative overflow-hidden rounded-2xl border border-rose-200/80 bg-rose-50/50 p-4 sm:p-5 shadow-xs h-full flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-rose-800 truncate">
            Ruptures de Stock ❗
          </span>
          <div className="rounded-xl bg-rose-100 p-2 text-rose-600 border border-rose-200 shrink-0">
            <AlertCircle className="h-4.5 w-4.5 animate-pulse" />
          </div>
        </div>

        <div className="space-y-0.5">
          <h3 className="font-mono text-xl sm:text-2xl font-extrabold text-rose-900 tabular-nums">
            {outOfStockCount} rupture{outOfStockCount > 1 ? 's' : ''}
          </h3>
          <p className="text-[11px] sm:text-xs font-medium text-rose-700">Stock épuisé en rayon</p>
        </div>

        <button
          type="button"
          onClick={onGeneratePurchaseOrder}
          className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-rose-700 active:scale-95 w-full"
        >
          <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">🛒 Générer Bon de Commande</span>
        </button>
      </div>
    </div>
  );
}
