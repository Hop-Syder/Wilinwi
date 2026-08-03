/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Bloc d'actions rapides (POS, Dépense, Clôture caisse, Rapport Z)
 * @created 2026-08-03
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingBag, DollarSign, Lock, Printer } from 'lucide-react';

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
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Actions Rapides</h4>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* + Nouvelle Vente POS */}
        <Link
          href="/pos"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md active:scale-95"
        >
          <ShoppingBag className="h-4 w-4" />
          <span>+ Nouvelle Vente POS</span>
        </Link>

        {/* Enregistrer une Dépense */}
        <button
          type="button"
          onClick={onOpenExpenseModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-800 shadow-sm transition-all hover:bg-slate-100 hover:border-slate-300 active:scale-95"
        >
          <DollarSign className="h-4 w-4 text-rose-600" />
          <span>Enregistrer Dépense</span>
        </button>

        {/* Clôturer la Caisse */}
        <button
          type="button"
          onClick={onOpenCloseSessionModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-800 shadow-sm transition-all hover:bg-slate-100 hover:border-slate-300 active:scale-95"
        >
          <Lock className="h-4 w-4 text-amber-600" />
          <span>Clôturer Caisse</span>
        </button>

        {/* Imprimer Rapport Z */}
        <button
          type="button"
          onClick={onPrintZReport}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-800 shadow-sm transition-all hover:bg-slate-100 hover:border-slate-300 active:scale-95"
        >
          <Printer className="h-4 w-4 text-blue-600" />
          <span>Imprimer Rapport Z</span>
        </button>
      </div>
    </div>
  );
}
