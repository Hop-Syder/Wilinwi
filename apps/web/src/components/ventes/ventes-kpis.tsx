/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Cartes KPIs Financières Ventes (4 Métriques Clés)
 * @created 2026-06-20
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React from 'react';
import { DollarSign, ShoppingBag, PieChart, TrendingUp } from 'lucide-react';
import { useCurrency } from '@/lib/currency-context';

interface VentesKpisProps {
  kpis: {
    salesCount: number;
    ca: number;
    encaisse: number;
    resteDu: number;
    annulées: number;
    panierMoyen: number;
    repartition: {
      especesPct: number;
      momoPct: number;
      creditPct: number;
    };
  };
}

export function VentesKpis({ kpis }: VentesKpisProps) {
  const { formatAmount } = useCurrency();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
      {/* KPI 1 : Chiffre d'Affaires Total Encaissé */}
      <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4 shadow-xs flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
            CA Encaissé
          </span>
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200/80">
            <DollarSign className="h-4 w-4" />
          </div>
        </div>
        <div>
          <span className="font-mono text-xl font-black text-emerald-950 tabular-nums">
            {formatAmount(kpis.encaisse)}
          </span>
          <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">Sur la période sélectionnée</p>
        </div>
      </div>

      {/* KPI 2 : Volume de Transactions */}
      <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/60 p-4 shadow-xs flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-800">
            Transactions
          </span>
          <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl border border-indigo-200/80">
            <ShoppingBag className="h-4 w-4" />
          </div>
        </div>
        <div>
          <span className="font-mono text-xl font-black text-indigo-950 tabular-nums">
            {kpis.salesCount} vente{kpis.salesCount > 1 ? 's' : ''}
          </span>
          <p className="text-[11px] text-indigo-700 font-semibold mt-0.5">
            {kpis.annulées > 0 ? `${kpis.annulées} annulée${kpis.annulées > 1 ? 's' : ''}` : 'Toutes validées'}
          </p>
        </div>
      </div>

      {/* KPI 3 : Panier Moyen */}
      <div className="rounded-2xl border border-violet-200/80 bg-violet-50/60 p-4 shadow-xs flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-violet-800">
            Panier Moyen
          </span>
          <div className="p-2 bg-violet-100 text-violet-700 rounded-xl border border-violet-200/80">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        <div>
          <span className="font-mono text-xl font-black text-violet-950 tabular-nums">
            {formatAmount(kpis.panierMoyen)}
          </span>
          <p className="text-[11px] text-violet-700 font-semibold mt-0.5">Montant moyen / ticket</p>
        </div>
      </div>

      {/* KPI 4 : Répartition des Règlements */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            Règlements
          </span>
          <div className="p-2 bg-slate-100 text-slate-700 rounded-xl border border-slate-200/80">
            <PieChart className="h-4 w-4" />
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-extrabold text-slate-800">
            <span className="text-emerald-700">Espèces : {kpis.repartition.especesPct}%</span>
            <span className="text-blue-700">MoMo : {kpis.repartition.momoPct}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 flex overflow-hidden">
            <div className="bg-emerald-500 h-full" style={{ width: `${kpis.repartition.especesPct}%` }} />
            <div className="bg-blue-500 h-full" style={{ width: `${kpis.repartition.momoPct}%` }} />
            <div className="bg-rose-400 h-full" style={{ width: `${kpis.repartition.creditPct}%` }} />
          </div>
          <span className="text-[10px] text-slate-400 font-semibold block text-right">
            Crédit : {kpis.repartition.creditPct}%
          </span>
        </div>
      </div>
    </div>
  );
}
