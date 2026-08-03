/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Bloc d'actions rapides (POS, Dépense, Clôture caisse, Rapport Z) - Design Command Hub
 * @created 2026-08-03
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingBag, DollarSign, Lock, Printer, ArrowRight } from 'lucide-react';

interface QuickActionsBarProps {
  onOpenExpenseModal?: () => void;
  onOpenCloseSessionModal?: () => void;
  onPrintZReport?: () => void;
}

export function QuickActionsBar({
  onOpenExpenseModal,
  onOpenCloseSessionModal,
  onPrintZReport,
}: QuickActionsBarProps) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-4 h-full flex flex-col justify-between">
      {/* Titre & En-tête */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Actions Rapides</h3>
          <p className="text-xs text-slate-500 font-medium">Accès direct aux opérations courantes</p>
        </div>
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
          Hub
        </span>
      </div>

      {/* Grille des boutons d'actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
        {/* + Nouvelle Vente POS (Action Majeure) */}
        <Link
          href="/pos"
          className="group relative flex items-center justify-between rounded-xl bg-emerald-600 p-3.5 text-white shadow-sm transition-all duration-200 hover:bg-emerald-700 hover:shadow-md active:scale-98"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-white group-hover:scale-110 transition-transform">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div className="text-left">
              <span className="block text-xs font-bold text-emerald-100 uppercase tracking-wider">Caisse POS</span>
              <span className="block text-sm font-extrabold text-white">Nouvelle Vente</span>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-emerald-200 group-hover:translate-x-1 transition-transform" />
        </Link>

        {/* Enregistrer une Dépense Caisse */}
        <button
          type="button"
          onClick={onOpenExpenseModal}
          className="group flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-slate-800 transition-all duration-200 hover:bg-rose-50/50 hover:border-rose-300 hover:shadow-2xs active:scale-98"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 text-rose-700 group-hover:scale-110 transition-transform">
              <DollarSign className="h-5 w-5" />
            </div>
            <div className="text-left">
              <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Trésorerie</span>
              <span className="block text-sm font-bold text-slate-900">Saisir Dépense</span>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-1 transition-all" />
        </button>

        {/* Clôturer la Caisse */}
        <button
          type="button"
          onClick={onOpenCloseSessionModal}
          className="group flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-slate-800 transition-all duration-200 hover:bg-amber-50/50 hover:border-amber-300 hover:shadow-2xs active:scale-98"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 group-hover:scale-110 transition-transform">
              <Lock className="h-5 w-5" />
            </div>
            <div className="text-left">
              <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Session Caisse</span>
              <span className="block text-sm font-bold text-slate-900">Clôturer Caisse</span>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
        </button>

        {/* Imprimer Rapport Z */}
        <button
          type="button"
          onClick={onPrintZReport}
          className="group flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-slate-800 transition-all duration-200 hover:bg-blue-50/50 hover:border-blue-300 hover:shadow-2xs active:scale-98"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 group-hover:scale-110 transition-transform">
              <Printer className="h-5 w-5" />
            </div>
            <div className="text-left">
              <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Impression</span>
              <span className="block text-sm font-bold text-slate-900">Rapport Z</span>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
        </button>
      </div>
    </div>
  );
}
