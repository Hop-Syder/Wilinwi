/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Cartes KPIs synthétiques pour le module CRM Clients (Thème Violet Contextuel)
 * @created 2026-06-20
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React from 'react';
import { Users, CreditCard, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card } from '@wilinwi/ui';
import { useCurrency } from '@/lib/currency-context';

interface ClientKpiCardsProps {
  totalClients: number;
  totalDette: number;
  debiteursCount: number;
  overLimitCount: number;
  repaymentRate: number; // pourcentage
  onFilterOverLimit?: () => void;
  onFilterDebtors?: () => void;
}

export function ClientKpiCards({
  totalClients,
  totalDette,
  debiteursCount,
  overLimitCount,
  repaymentRate,
  onFilterOverLimit,
  onFilterDebtors,
}: ClientKpiCardsProps) {
  const { formatAmount } = useCurrency();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* KPI 1 : Total Clients */}
      <Card className="p-4 bg-white border border-slate-200/80 shadow-2xs rounded-2xl flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Clients Enregistrés
          </p>
          <p className="text-2xl font-extrabold text-violet-950 font-display">
            {totalClients} <span className="text-xs font-semibold text-slate-400">client{totalClients > 1 ? 's' : ''}</span>
          </p>
          <p className="text-[11px] text-slate-500">Base active CRM</p>
        </div>
        <div className="h-11 w-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0 border border-violet-100 shadow-2xs">
          <Users className="h-5 w-5" />
        </div>
      </Card>

      {/* KPI 2 : Encours Total des Crédits */}
      <Card className="p-4 bg-white border border-slate-200/80 shadow-2xs rounded-2xl flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Encours Total Crédits
          </p>
          <p className="text-2xl font-extrabold text-amber-600 font-mono">
            {formatAmount(totalDette)}
          </p>
          <p className="text-[11px] text-slate-500">
            {debiteursCount} client{debiteursCount > 1 ? 's' : ''} débiteur{debiteursCount > 1 ? 's' : ''}
          </p>
        </div>
        <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100 shadow-2xs">
          <CreditCard className="h-5 w-5" />
        </div>
      </Card>

      {/* KPI 3 : Créances en Retard / Plafond Dépassé */}
      <Card
        onClick={onFilterOverLimit || onFilterDebtors}
        className={`p-4 bg-white border border-slate-200/80 shadow-2xs rounded-2xl flex items-center justify-between transition-all ${
          overLimitCount > 0 ? 'cursor-pointer hover:border-rose-300 hover:bg-rose-50/30' : ''
        }`}
      >
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Retards / Plafond Dépassé
          </p>
          <p className="text-2xl font-extrabold text-rose-600 font-display">
            {overLimitCount}{' '}
            <span className="text-xs font-semibold text-rose-500">
              {overLimitCount > 0 ? '⚠️ Crédit bloqué' : 'Aucun'}
            </span>
          </p>
          <p className="text-[11px] text-rose-600 font-medium">
            {overLimitCount > 0 ? 'Cliquer pour filtrer & relancer' : 'Tous les comptes conformes'}
          </p>
        </div>
        <div className="h-11 w-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100 shadow-2xs">
          <AlertTriangle className="h-5 w-5" />
        </div>
      </Card>

      {/* KPI 4 : Taux de Recouvrement */}
      <Card className="p-4 bg-white border border-slate-200/80 shadow-2xs rounded-2xl flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Taux de Recouvrement
          </p>
          <p className="text-2xl font-extrabold text-emerald-600 font-mono">
            {repaymentRate}%
          </p>
          <p className="text-[11px] text-slate-500">Crédits honorés ce mois</p>
        </div>
        <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 shadow-2xs">
          <TrendingUp className="h-5 w-5" />
        </div>
      </Card>
    </div>
  );
}
