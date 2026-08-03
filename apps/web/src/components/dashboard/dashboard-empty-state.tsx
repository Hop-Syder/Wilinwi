/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant d'état vide (Empty State) réutilisable pour le Tableau de bord
 * @created 2026-08-03
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React from 'react';
import Link from 'next/link';
import { BarChart3, PlusCircle } from 'lucide-react';

interface DashboardEmptyStateProps {
  title?: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  onActionClick?: () => void;
}

export function DashboardEmptyState({
  title = 'Aucune donnée disponible',
  description = 'Commencez par effectuer des ventes sur votre caisse pour voir apparaître vos statistiques.',
  actionHref,
  actionLabel,
  onActionClick,
}: DashboardEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl bg-slate-50/70 border border-dashed border-slate-200 my-auto">
      <div className="rounded-2xl bg-white p-3 shadow-sm border border-slate-100 text-slate-400 mb-3">
        <BarChart3 className="h-8 w-8 text-slate-400" />
      </div>
      <h4 className="text-sm font-bold text-slate-800 mb-1">{title}</h4>
      <p className="text-xs text-slate-500 max-w-sm mb-4">{description}</p>

      {actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          <span>{actionLabel || 'Créer une opération'}</span>
        </Link>
      )}

      {onActionClick && !actionHref && (
        <button
          type="button"
          onClick={onActionClick}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          <span>{actionLabel || 'Action'}</span>
        </button>
      )}
    </div>
  );
}
