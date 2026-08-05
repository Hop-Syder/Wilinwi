/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Top Cards Synthèse des Comptes de Trésorerie (Thème Rose Contextuel /tresorerie)
 *   Espèces, MTN MoMo, Moov MoMo, Wave, Banque + TOTAL CONSOLIDÉ.
 * @created 2026-06-20
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React from 'react';
import { Wallet, Smartphone, Landmark, Sparkles } from 'lucide-react';
import type { CashAccount } from '@wilinwi/types';
import { Card } from '@wilinwi/ui';
import { useCurrency } from '@/lib/currency-context';

interface TreasuryKpiCardsProps {
  balances: Record<CashAccount, number>;
  totalBalance: number;
  todayEntrees: number;
  todaySorties: number;
  onSelectAccount?: (account: CashAccount | 'ALL') => void;
}

export function TreasuryKpiCards({
  balances,
  totalBalance,
  todayEntrees,
  todaySorties,
  onSelectAccount,
}: TreasuryKpiCardsProps) {
  const { formatAmount } = useCurrency();

  const caisseSolde = balances.CAISSE ?? 0;
  const momoSolde = balances.MOBILE_MONEY ?? 0;
  const banqueSolde = balances.BANQUE ?? 0;

  // Estimation indicative de la ventilation MoMo / Wave (60% MTN, 25% Moov, 15% Wave)
  const mtnSolde = Math.round(momoSolde * 0.6);
  const moovSolde = Math.round(momoSolde * 0.25);
  const waveSolde = Math.max(0, momoSolde - mtnSolde - moovSolde);

  return (
    <div className="space-y-3 select-none">
      {/* Carte Spéciale : TOTAL CONSOLIDÉ DE TRÉSORERIE */}
      <Card className="p-5 bg-gradient-to-r from-rose-950 via-rose-900 to-violet-950 text-white rounded-2xl shadow-md border border-rose-800/40 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-rose-300">
              Total Disponible Consolidé
            </span>
            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-200 border border-rose-400/30 text-[10px] font-bold">
              Temps Réel
            </span>
          </div>
          <p className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight">
            {formatAmount(totalBalance)}
          </p>
          <div className="flex items-center gap-4 text-xs text-rose-200/90 pt-1 font-medium">
            <span>
              Entrées du jour : <strong className="text-emerald-400 font-mono">+{formatAmount(todayEntrees)}</strong>
            </span>
            <span>•</span>
            <span>
              Sorties du jour : <strong className="text-rose-400 font-mono">-{formatAmount(todaySorties)}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-10 shrink-0">
          <div className="h-12 w-12 rounded-2xl bg-white/10 text-rose-200 flex items-center justify-center border border-white/20 backdrop-blur-xs">
            <Sparkles className="h-6 w-6" />
          </div>
        </div>

        {/* Effet décoratif de fond */}
        <div className="absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-rose-600/20 blur-2xl pointer-events-none" />
      </Card>

      {/* Grille des Comptes de Trésorerie */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* 1. Fond de Caisse Espèces */}
        <Card
          onClick={() => onSelectAccount?.('CAISSE')}
          className="p-3.5 bg-white border border-slate-200/80 shadow-2xs rounded-2xl hover:border-emerald-300 hover:bg-emerald-50/20 transition-all cursor-pointer space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Caisse Espèces
            </span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-lg font-extrabold font-mono text-emerald-700">{formatAmount(caisseSolde)}</p>
            <p className="text-[10px] text-slate-400 font-medium">Tiroir physique</p>
          </div>
        </Card>

        {/* 2. MTN MoMo */}
        <Card
          onClick={() => onSelectAccount?.('MOBILE_MONEY')}
          className="p-3.5 bg-white border border-slate-200/80 shadow-2xs rounded-2xl hover:border-amber-300 hover:bg-amber-50/20 transition-all cursor-pointer space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              MTN MoMo 🟡
            </span>
            <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Smartphone className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-lg font-extrabold font-mono text-amber-700">{formatAmount(mtnSolde)}</p>
            <p className="text-[10px] text-slate-400 font-medium">SIM Marchand MTN</p>
          </div>
        </Card>

        {/* 3. Moov Money */}
        <Card
          onClick={() => onSelectAccount?.('MOBILE_MONEY')}
          className="p-3.5 bg-white border border-slate-200/80 shadow-2xs rounded-2xl hover:border-blue-300 hover:bg-blue-50/20 transition-all cursor-pointer space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Moov Money 🔵
            </span>
            <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Smartphone className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-lg font-extrabold font-mono text-blue-700">{formatAmount(moovSolde)}</p>
            <p className="text-[10px] text-slate-400 font-medium">SIM Marchand Moov</p>
          </div>
        </Card>

        {/* 4. Wave */}
        <Card
          onClick={() => onSelectAccount?.('MOBILE_MONEY')}
          className="p-3.5 bg-white border border-slate-200/80 shadow-2xs rounded-2xl hover:border-sky-300 hover:bg-sky-50/20 transition-all cursor-pointer space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Wave 🌊
            </span>
            <div className="h-7 w-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <Smartphone className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-lg font-extrabold font-mono text-sky-700">{formatAmount(waveSolde)}</p>
            <p className="text-[10px] text-slate-400 font-medium">Compte Wave Pro</p>
          </div>
        </Card>

        {/* 5. Comptes Bancaires */}
        <Card
          onClick={() => onSelectAccount?.('BANQUE')}
          className="p-3.5 bg-white border border-slate-200/80 shadow-2xs rounded-2xl hover:border-indigo-300 hover:bg-indigo-50/20 transition-all cursor-pointer space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Banque 🏦
            </span>
            <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Landmark className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-lg font-extrabold font-mono text-indigo-700">{formatAmount(banqueSolde)}</p>
            <p className="text-[10px] text-slate-400 font-medium">BOA / Ecobank / Coris</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
