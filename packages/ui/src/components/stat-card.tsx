/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant UI partagé : stat-card.tsx (Magic Glow Card)
 * @created 2026-06-20
 * @updated 2026-07-21
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import * as React from 'react';
import { cn } from '../cn.js';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  accent?: 'brand' | 'emerald' | 'gold' | 'red';
  className?: string;
}

const accentColors: Record<NonNullable<StatCardProps['accent']>, string> = {
  brand: 'from-primary/20 via-primary/5 to-transparent',
  emerald: 'from-success/20 via-success/5 to-transparent',
  gold: 'from-warning/20 via-warning/5 to-transparent',
  red: 'from-danger/20 via-danger/5 to-transparent',
};

const iconColors: Record<NonNullable<StatCardProps['accent']>, string> = {
  brand: 'bg-primary/10 text-primary',
  emerald: 'bg-success/10 text-success',
  gold: 'bg-warning/10 text-warning',
  red: 'bg-danger/10 text-danger',
};

/** Indicateur de tableau de bord — design "Magic Glow Card" Glassmorphism. */
export function StatCard({ label, value, hint, icon, accent = 'brand', className }: StatCardProps) {
  return (
    <div 
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/50 bg-white/60 p-5 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:bg-slate-900/60",
        className
      )}
    >
      {/* Effet Glow au survol */}
      <div 
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br opacity-0 transition-opacity duration-500 group-hover:opacity-100",
          accentColors[accent]
        )} 
      />
      
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs sm:text-sm font-semibold tracking-wide text-text-secondary truncate">{label}</p>
        {icon && (
          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', iconColors[accent])} aria-hidden>
            {icon}
          </div>
        )}
      </div>
      
      <div className="mt-3 flex items-baseline gap-2 overflow-hidden">
        <p className="tabular text-lg sm:text-xl xl:text-2xl font-bold tracking-tight text-text-primary whitespace-nowrap">{value}</p>
      </div>
      
      {hint && (
        <div className="mt-2 flex items-center text-sm font-medium text-text-secondary/80">
          <span className="relative flex h-2 w-2 mr-2">
            <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", iconColors[accent].split(' ')[0])}></span>
            <span className={cn("relative inline-flex h-2 w-2 rounded-full", iconColors[accent].split(' ')[0])}></span>
          </span>
          {hint}
        </div>
      )}
    </div>
  );
}
