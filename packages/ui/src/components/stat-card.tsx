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
  brand: 'bg-primary/5 text-primary border border-primary/10',
  emerald: 'bg-success/5 text-success border border-success/10',
  gold: 'bg-warning/5 text-warning border border-warning/10',
  red: 'bg-danger/5 text-danger border border-danger/10',
};

/** Indicateur de tableau de bord — chiffre lisible en moins de 30 s (§11.1). */
export function StatCard({ label, value, hint, icon, accent = 'brand' }: StatCardProps) {
  return (
    <div className="rounded border border-border bg-surface p-5 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-text-secondary">{label}</p>
        {icon && (
          <span className={cn('rounded p-1.5', accentBg[accent])} aria-hidden>
            {icon}
          </span>
        )}
      </div>
      <p className="tabular mt-2 text-2xl font-bold tracking-tight text-text-primary">{value}</p>
      {hint && <p className="mt-1 text-xs text-text-secondary/70">{hint}</p>}
    </div>
  );
}
