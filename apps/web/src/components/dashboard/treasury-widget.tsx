/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Widget Récapitulatif de la Trésorerie (Espèces, MoMo, Banque)
 * @created 2026-08-03
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React from 'react';
import { Wallet, Smartphone, Landmark, ShieldCheck } from 'lucide-react';
import { formatFCFA } from '@wilinwi/ui';

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
  const fondDeCaisse = balances?.fondDeCaisse ?? 0;
  const mobileMoney = balances?.mobileMoney ?? 0;
  const banque = balances?.banque ?? 0;
  const total = balances?.total ?? fondDeCaisse + mobileMoney + banque;

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Trésorerie & Solde des Caisses</h3>
          <p className="text-xs text-slate-600">Vision globale des disponibilités par canal</p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/60">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Actif</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Fond de caisse espèces */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 space-y-1 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold">
            <Wallet className="h-4 w-4 text-emerald-600" />
            <span>Fond de Caisse (Espèces)</span>
          </div>
          <p className="font-mono text-lg font-extrabold text-slate-900 tabular-nums">
            {formatFCFA(fondDeCaisse)}
          </p>
        </div>

        {/* Mobile Money Merchant */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 space-y-1 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold">
            <Smartphone className="h-4 w-4 text-amber-600" />
            <span>Comptes MoMo Merchant</span>
          </div>
          <p className="font-mono text-lg font-extrabold text-slate-900 tabular-nums">
            {formatFCFA(mobileMoney)}
          </p>
        </div>

        {/* Comptes Bancaires */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 space-y-1 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold">
            <Landmark className="h-4 w-4 text-blue-600" />
            <span>Comptes Bancaires</span>
          </div>
          <p className="font-mono text-lg font-extrabold text-slate-900 tabular-nums">
            {formatFCFA(banque)}
          </p>
        </div>
      </div>

      {/* Barre de Total de Trésorerie */}
      <div className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-white">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Disponibilités Totales
        </span>
        <span className="font-mono text-lg font-extrabold text-emerald-400 tabular-nums">
          {formatFCFA(total)}
        </span>
      </div>
    </div>
  );
}
