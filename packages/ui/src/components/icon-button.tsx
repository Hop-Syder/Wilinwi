/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant UI partagé (Design System) : icon-button.tsx
 *   Corrige la cible tactile des boutons d'action à icône seule (§7/§30) :
 *   `aria-label` obligatoire au niveau du type, taille par défaut ≥44px.
 * @created 2026-09-08
 * @updated 2026-09-08
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../cn.js';

const iconButtonVariants = cva(
  'inline-flex shrink-0 items-center justify-center rounded-lg transition-colors duration-150 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      tone: {
        default: 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
        danger: 'text-danger hover:bg-danger/10',
      },
      size: {
        /** 36px — contextes très denses uniquement, sous la cible tactile recommandée (§7). */
        sm: 'h-9 w-9',
        /** 44px — taille par défaut, respecte la cible tactile minimale (§7). */
        md: 'h-11 w-11',
      },
    },
    defaultVariants: { tone: 'default', size: 'md' },
  },
);

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'>,
    VariantProps<typeof iconButtonVariants> {
  icon: React.ReactNode;
  /** Un bouton icône seule doit toujours être annoncé (§30) — jamais optionnel. */
  'aria-label': string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, className, tone, size, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(iconButtonVariants({ tone, size }), className)}
      {...props}
    >
      {icon}
    </button>
  ),
);
IconButton.displayName = 'IconButton';

export { iconButtonVariants };
