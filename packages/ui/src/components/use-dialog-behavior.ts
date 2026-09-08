'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Comportement partagé Modal/BottomSheet (interne, non exporté) :
 *   focus initial sur le premier élément focusable, restauration du focus au
 *   déclencheur à la fermeture, fermeture sur Échap, verrou du scroll de fond,
 *   focus trap (Tab/Shift+Tab bouclent à l'intérieur du dialogue ouvert). Gère
 *   aussi l'imbrication (ex. modale QR dans SaleSuccessModal) : si le focus
 *   est actuellement dans une boîte de dialogue plus profondément imbriquée,
 *   cette instance ne traite ni Échap ni Tab — un seul piège de focus actif
 *   à la fois, le plus interne.
 * @created 2026-09-08
 * @updated 2026-09-08
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import * as React from 'react';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useDialogBehavior(
  open: boolean,
  onClose: () => void,
  containerRef: React.RefObject<HTMLElement | null>,
): void {
  const previouslyFocused = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusable = containerRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    focusable?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape' && e.key !== 'Tab') return;
      const container = containerRef.current;
      if (!container) return;

      // Dialogue imbriqué (ex. modale QR dans SaleSuccessModal) : si le focus
      // est actuellement dans une boîte [role="dialog"] plus profondément
      // imbriquée que la nôtre, on ne traite ni Échap ni Tab ici — sinon les
      // deux instances de ce hook réagiraient au même événement.
      const active = document.activeElement;
      if (active && active !== container) {
        const nestedDialogs = container.querySelectorAll<HTMLElement>('[role="dialog"]');
        for (const nested of nestedDialogs) {
          if (nested.contains(active)) return;
        }
      }

      if (e.key === 'Escape') {
        onClose();
        return;
      }

      const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);
}
