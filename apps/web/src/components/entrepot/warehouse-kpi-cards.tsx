/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Cartes KPIs Synthétiques Entrepôt & Logistique (4 Métriques Clés)
 * @created 2026-08-05
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React from 'react';
import { Warehouse, Truck, ShoppingBag, AlertTriangle } from 'lucide-react';
import { formatFCFA } from '@wilinwi/ui';

interface WarehouseKpiCardsProps {
  totalStockValue: number;
  inTransitCount: number;
  pendingOrdersCount: number;
  reorderAlertsCount: number;
  onSelectTab?: (tab: 'dispatch' | 'orders' | 'suppliers') => void;
}

export function WarehouseKpiCards({
  totalStockValue,
  inTransitCount,
  pendingOrdersCount,
  reorderAlertsCount,
  onSelectTab,
}: WarehouseKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* KPI 1 : Valeur du Stock Réparti */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            Stock Réparti
          </span>
          <div className="p-2 bg-teal-50 text-teal-700 rounded-xl border border-teal-100/80">
            <Warehouse className="h-4 w-4" />
          </div>
        </div>
        <div>
          <span className="font-mono text-xl font-black text-slate-900 tabular-nums">
            {formatFCFA(totalStockValue)}
          </span>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">Dépôt Central + Boutiques</p>
        </div>
      </div>

      {/* KPI 2 : Transferts en Transit 🔵 */}
      <button
        type="button"
        onClick={() => onSelectTab?.('dispatch')}
        className="rounded-2xl border border-blue-200/80 bg-blue-50/60 p-4 shadow-xs text-left transition-all hover:bg-blue-100/60 flex flex-col justify-between space-y-2 active:scale-98"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-800">
            En Transit
          </span>
          <div className="p-2 bg-blue-100 text-blue-700 rounded-xl border border-blue-200/80">
            <Truck className="h-4 w-4" />
          </div>
        </div>
        <div>
          <span className="font-mono text-xl font-black text-blue-950 tabular-nums">
            {inTransitCount} expédition{inTransitCount > 1 ? 's' : ''} 🔵
          </span>
          <p className="text-[11px] text-blue-700 font-semibold mt-0.5">Sur la route vers boutique</p>
        </div>
      </button>

      {/* KPI 3 : Commandes Fournisseurs en Attente 🟡 */}
      <button
        type="button"
        onClick={() => onSelectTab?.('orders')}
        className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 shadow-xs text-left transition-all hover:bg-amber-100/60 flex flex-col justify-between space-y-2 active:scale-98"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">
            Commandes Attente
          </span>
          <div className="p-2 bg-amber-100 text-amber-700 rounded-xl border border-amber-200/80">
            <ShoppingBag className="h-4 w-4" />
          </div>
        </div>
        <div>
          <span className="font-mono text-xl font-black text-amber-950 tabular-nums">
            {pendingOrdersCount} bon{pendingOrdersCount > 1 ? 's' : ''} 🟡
          </span>
          <p className="text-[11px] text-amber-700 font-semibold mt-0.5">En cours de livraison</p>
        </div>
      </button>

      {/* KPI 4 : Alertes de Réapprovisionnement 🔴 */}
      <div className="rounded-2xl border border-rose-200/80 bg-rose-50/60 p-4 shadow-xs flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-800">
            Réappro. Requis
          </span>
          <div className="p-2 bg-rose-100 text-rose-700 rounded-xl border border-rose-200/80">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
        <div>
          <span className="font-mono text-xl font-black text-rose-950 tabular-nums">
            {reorderAlertsCount} article{reorderAlertsCount > 1 ? 's' : ''} 🔴
          </span>
          <p className="text-[11px] text-rose-700 font-semibold mt-0.5">Boutiques sous le seuil bas</p>
        </div>
      </div>
    </div>
  );
}
