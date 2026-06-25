/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant UI partagé (Design System) : button.tsx
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../cn.js';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded font-medium cursor-pointer transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white hover:bg-primary-hover shadow-sm focus-visible:ring-primary',
        emerald: 'bg-success text-white hover:opacity-90 shadow-sm focus-visible:ring-success',
        gold: 'bg-warning text-slate-900 hover:opacity-90 shadow-sm focus-visible:ring-warning',
        outline:
          'border border-border bg-surface text-text-primary hover:bg-surface-hover shadow-sm focus-visible:ring-primary',
        ghost: 'text-text-secondary hover:bg-surface-hover hover:text-text-primary focus-visible:ring-primary',
        danger: 'bg-danger text-white hover:opacity-90 shadow-sm focus-visible:ring-danger',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = 'Button';

export { buttonVariants };
