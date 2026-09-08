/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant UI partagé (Design System) : skeleton.tsx
 * @created 2026-09-08
 * @updated 2026-09-08
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import * as React from 'react';
import { cn } from '../cn.js';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'block' | 'circle';
}

const VARIANT_CLASS: Record<NonNullable<SkeletonProps['variant']>, string> = {
  text: 'h-4 rounded',
  block: 'rounded-xl',
  circle: 'rounded-full',
};

/** Placeholder de chargement — dimensionner via `className` (hauteur/largeur) pour éviter tout saut de mise en page. */
export function Skeleton({ variant = 'block', className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse bg-surface-hover', VARIANT_CLASS[variant], className)}
      {...props}
    />
  );
}
