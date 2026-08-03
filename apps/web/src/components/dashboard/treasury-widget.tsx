/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Widget Récapitulatif de la Trésorerie (Design Fintech Modern : Espèces, MoMo, Banque & Total)
 * @created 2026-08-03
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React from 'react';
import { Wallet, Smartphone, Landmark, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { useCurrency } from '@/lib/currency-context';

export interface TreasuryBalances {
  fondDeCaisse: number;
  mobileMoney: number;
  banque: number;
  total: number;
}

interface TreasuryWidgetProps {
  balances?: TreasuryBalances;
}

export function TreasuryWidget({ balances }: TreasuryWidgetProps) {
  const { formatAmount } = useCurrency();
  const fondDeCaisse = balances?.fondDeCaisse ?? 0;
  const mobileMoney = balances?.mobileMoney ?? 0;
  const banque = balances?.banque ?? 0;
  const total = balances?.total ?? fondDeCaisse + mobileMoney + banque;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-5">
      {/* En-tête du Widget */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Trésorerie & Solde des Caisses
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-medium">Disponibilités liquides ventilées par canal</p>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/80 shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Synchronisé</span>
        </div>
      </div>

      {/* Grille des 3 comptes de trésorerie */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Espèces / Fond de caisse */}
        <div className="group rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/80 to-slate-100/50 p-4 transition-all duration-200 hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100/80 text-emerald-700 border border-emerald-200/60 shadow-2xs group-hover:scale-105 transition-transform">
              <Wallet className="h-4.5 w-4.5" />
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
              Espèces
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Fond de Caisse
            </span>
            <p className="font-mono text-xl font-black text-slate-900 tabular-nums">
              {formatAmount(fondDeCaisse)}
            </p>
          </div>
        </div>

        {/* Mobile Money Merchant */}
        <div className="group rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/80 to-slate-100/50 p-4 transition-all duration-200 hover:border-amber-300 hover:bg-amber-50/30 hover:shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100/80 text-amber-700 border border-amber-200/60 shadow-2xs group-hover:scale-105 transition-transform">
              <Smartphone className="h-4.5 w-4.5" />
            </div>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
              Wave / MoMo
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Comptes Marchands
            </span>
            <p className="font-mono text-xl font-black text-slate-900 tabular-nums">
              {formatAmount(mobileMoney)}
            </p>
          </div>
        </div>

        {/* Banque / Virements */}
        <div className="group rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/80 to-slate-100/50 p-4 transition-all duration-200 hover:border-blue-300 hover:bg-blue-50/30 hover:shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100/80 text-blue-700 border border-blue-200/60 shadow-2xs group-hover:scale-105 transition-transform">
              <Landmark className="h-4.5 w-4.5" />
            </div>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
              Banque
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Solde Bancaire
            </span>
            <p className="font-mono text-xl font-black text-slate-900 tabular-nums">
              {formatAmount(banque)}
            </p>
          </div>
        </div>
      </div>

      {/* Bandeau de synthèse totale (Fintech Dark Banner) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-slate-950 p-4 text-white shadow-md border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <ArrowUpRight className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Disponibilités Liquides Totales
            </span>
            <p className="text-xs text-slate-400 font-medium">Cumul actif caisse + comptes de réception</p>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <span className="font-mono text-2xl font-black text-emerald-400 tracking-tight tabular-nums">
            {formatAmount(total)}
          </span>
        </div>
      </div>
    </div>
  );
}
