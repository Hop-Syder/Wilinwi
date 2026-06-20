/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant UI partagé (Design System) : badge.tsx
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../cn.js';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      tone: {
        neutral: 'bg-slate-100 text-slate-700',
        brand: 'bg-brand-50 text-brand',
        success: 'bg-emerald-50 text-emerald-700',
        warning: 'bg-gold-50 text-gold-700',
        danger: 'bg-red-50 text-red-600',
        outline: 'border border-slate-300 bg-transparent text-slate-600',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

type Tone = NonNullable<VariantProps<typeof badgeVariants>['tone']>;

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Alias de `tone` (compatibilité ergonomique). */
  variant?: Tone;
}

export function Badge({ className, tone, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone: tone ?? variant }), className)} {...props} />;
}
