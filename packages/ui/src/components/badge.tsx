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
  'inline-flex items-center gap-1 rounded px-2.5 py-0.5 text-xs font-semibold border',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-hover text-text-secondary border-border',
        brand: 'bg-primary/5 text-primary border-primary/10',
        success: 'bg-success/5 text-success border-success/10',
        warning: 'bg-warning/5 text-warning border-warning/10',
        danger: 'bg-danger/5 text-danger border-danger/10',
        outline: 'border border-border bg-transparent text-text-secondary',
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
