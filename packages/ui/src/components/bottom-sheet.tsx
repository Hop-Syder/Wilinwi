'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant UI partagé (Design System) : bottom-sheet.tsx
 *   Pattern mobile central du cahier des charges (§19) : panneau coulissant
 *   depuis le bas sous `sm:` (640px), rendu en dialogue centré (même forme
 *   que Modal) à `sm:`+. Une seule instance montée — la différence de forme
 *   est purement CSS (`items-end sm:items-center`), jamais deux arbres DOM
 *   avec comportement dupliqué (focus/Échap/scroll-lock ne doivent tourner
 *   qu'une fois).
 * @created 2026-09-08
 * @updated 2026-09-08
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '../cn.js';
import { useDialogBehavior } from './use-dialog-behavior.js';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function BottomSheet({ open, onClose, title, children, className }: BottomSheetProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  useDialogBehavior(open, onClose, dialogRef);

  if (!open) return null;

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'animate-slide-up sm:animate-scale-in flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white shadow-xl',
          'sm:max-h-[90vh] sm:max-w-md sm:rounded-2xl',
          className,
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Poignée visuelle — signal du geste de fermeture, mobile uniquement. */}
        <div className="flex shrink-0 justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-300" />
        </div>

        {title && (
          <div className="flex shrink-0 items-center justify-between px-5 pt-3 pb-2 sm:pt-5">
            <h2 id={titleId} className="font-display text-lg font-semibold text-text-primary">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="rounded-full p-1.5 text-text-secondary hover:bg-surface-hover"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-3">{children}</div>
      </div>
    </div>
  );
}
