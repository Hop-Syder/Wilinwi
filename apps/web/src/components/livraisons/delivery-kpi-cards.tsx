/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Cartes KPIs synthétiques pour le module Livraisons & Expéditions (Thème Amber/Orange Contextuel)
 * @created 2026-06-20
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React from 'react';
import { Truck, PackageCheck, DollarSign, Award } from 'lucide-react';
import { Card } from '@wilinwi/ui';
import { useCurrency } from '@/lib/currency-context';

interface DeliveryKpiCardsProps {
  inTransitCount: number;
  toPrepareCount: number;
  codAmountToCollect: number;
  successRate: number; // pourcentage
  onFilterInTransit?: () => void;
  onFilterToPrepare?: () => void;
}

export function DeliveryKpiCards({
  inTransitCount,
  toPrepareCount,
  codAmountToCollect,
  successRate,
  onFilterInTransit,
  onFilterToPrepare,
}: DeliveryKpiCardsProps) {
  const { formatAmount } = useCurrency();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 select-none">
      {/* KPI 1 : Livraisons en Cours (En Transit) */}
      <Card
        onClick={onFilterInTransit}
        className="p-4 bg-white border border-slate-200/80 shadow-2xs rounded-2xl flex items-center justify-between cursor-pointer hover:border-amber-300 hover:bg-amber-50/20 transition-all"
      >
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Livraisons en Transit
          </p>
          <p className="text-2xl font-extrabold text-amber-600 font-display">
            {inTransitCount}{' '}
            <span className="text-xs font-semibold text-slate-400">
              colis sur la route
            </span>
          </p>
          <p className="text-[11px] text-amber-700 font-medium">Entre les mains des coursiers</p>
        </div>
        <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100 shadow-2xs">
          <Truck className="h-5 w-5" />
        </div>
      </Card>

      {/* KPI 2 : Commandes à Préparer */}
      <Card
        onClick={onFilterToPrepare}
        className="p-4 bg-white border border-slate-200/80 shadow-2xs rounded-2xl flex items-center justify-between cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/20 transition-all"
      >
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Commandes à Préparer
          </p>
          <p className="text-2xl font-extrabold text-indigo-600 font-display">
            {toPrepareCount}{' '}
            <span className="text-xs font-semibold text-slate-400">
              en boutique
            </span>
          </p>
          <p className="text-[11px] text-indigo-600 font-medium">En attente d’attribution livreur</p>
        </div>
        <div className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100 shadow-2xs">
          <PackageCheck className="h-5 w-5" />
        </div>
      </Card>

      {/* KPI 3 : Fonds à Recouvrer (COD) */}
      <Card className="p-4 bg-white border border-slate-200/80 shadow-2xs rounded-2xl flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Fonds à Recouvrer (COD)
          </p>
          <p className="text-2xl font-extrabold text-emerald-600 font-mono">
            {formatAmount(codAmountToCollect)}
          </p>
          <p className="text-[11px] text-slate-500">Encaissés par livreurs à verser</p>
        </div>
        <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 shadow-2xs">
          <DollarSign className="h-5 w-5" />
        </div>
      </Card>

      {/* KPI 4 : Taux de Succès du Mois */}
      <Card className="p-4 bg-white border border-slate-200/80 shadow-2xs rounded-2xl flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Taux de Succès Mois
          </p>
          <p className="text-2xl font-extrabold text-slate-900 font-mono">
            {successRate}%
          </p>
          <p className="text-[11px] text-slate-500">Livraisons réussies sans retour</p>
        </div>
        <div className="h-11 w-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200 shadow-2xs">
          <Award className="h-5 w-5" />
        </div>
      </Card>
    </div>
  );
}
