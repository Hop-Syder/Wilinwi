'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant UI partagé (Design System) : modal.tsx
 *   Dialogue centré générique — unifie les ~16 dialogues ad hoc du produit
 *   (`fixed inset-0 ... bg-black/40` réimplémenté indépendamment partout).
 *   Pas de slot `footer` dédié en v1 : l'appelant compose son propre pied de
 *   page dans `children`, comme le font déjà les dialogues existants.
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

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Ferme au clic sur le fond assombri. Défaut : true. */
  closeOnBackdrop?: boolean;
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
};

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  closeOnBackdrop = true,
  className,
}: ModalProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  useDialogBehavior(open, onClose, dialogRef);

  if (!open) return null;

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'animate-scale-in max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-xl',
          SIZE_CLASS[size],
          className,
        )}
      >
        {title && (
          <div className="mb-4 flex items-center justify-between">
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
        {children}
      </div>
    </div>
  );
}
