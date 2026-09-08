/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant UI partagé (Design System) : voice-button.tsx
 *   Bouton micro partagé — remplace les 3 implémentations indépendantes
 *   quasi identiques (panier vocal POS, dashboard, dispatch). Bande de
 *   taille par défaut 56-64px (§7 : cible tactile du micro).
 * @created 2026-09-08
 * @updated 2026-09-08
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import * as React from 'react';
import { cva } from 'class-variance-authority';
import { Mic, Loader2 } from 'lucide-react';
import { cn } from '../cn.js';

const voiceButtonVariants = cva(
  'inline-flex shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      size: {
        /** 44px — contextes secondaires (ex. tableau de bord). */
        md: 'h-11 w-11',
        /** 56px — bouton micro principal, bande 56-64px du cahier des charges (§7/§12). */
        lg: 'h-14 w-14',
      },
      recording: {
        true: 'animate-pulse bg-danger text-white',
        false: 'bg-primary text-white hover:bg-primary-hover',
      },
    },
    defaultVariants: { size: 'lg', recording: false },
  },
);

const ICON_SIZE: Record<'md' | 'lg', string> = { md: 'h-5 w-5', lg: 'h-6 w-6' };

export interface VoiceButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'onClick'> {
  state: 'idle' | 'listening' | 'loading';
  onClick: () => void;
  size?: 'md' | 'lg';
  /** Toujours annoncé (§30) — décrit l'action ("Parler pour...", "Arrêter le micro"), pas juste "micro". */
  'aria-label': string;
}

export const VoiceButton = React.forwardRef<HTMLButtonElement, VoiceButtonProps>(
  ({ state, onClick, size = 'lg', className, disabled, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(voiceButtonVariants({ size, recording: state === 'listening' }), className)}
      {...props}
    >
      {state === 'loading' ? (
        <Loader2 className={cn(ICON_SIZE[size], 'animate-spin')} aria-hidden />
      ) : (
        <Mic className={ICON_SIZE[size]} aria-hidden />
      )}
    </button>
  ),
);
VoiceButton.displayName = 'VoiceButton';

export { voiceButtonVariants };
