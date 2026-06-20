/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant UI partagé (Design System) : stat-card.tsx
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import * as React from 'react';
import { cn } from '../cn.js';

export interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  accent?: 'brand' | 'emerald' | 'gold' | 'red';
}

const accentBg: Record<NonNullable<StatCardProps['accent']>, string> = {
  brand: 'bg-brand-50 text-brand',
  emerald: 'bg-emerald-50 text-emerald-700',
  gold: 'bg-gold-50 text-gold-700',
  red: 'bg-red-50 text-red-600',
};

/** Indicateur de tableau de bord — chiffre lisible en moins de 30 s (§11.1). */
export function StatCard({ label, value, hint, icon, accent = 'brand' }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {icon && (
          <span className={cn('rounded-lg p-2', accentBg[accent])} aria-hidden>
            {icon}
          </span>
        )}
      </div>
      <p className="tabular mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
