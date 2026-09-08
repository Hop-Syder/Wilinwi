'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant UI partagé (Design System) : toast.tsx
 *   Enveloppe `sonner` (stacking, swipe-to-dismiss, live-region ARIA déjà
 *   corrects) plutôt qu'un composant fait maison — évite de mal gérer
 *   l'accessibilité des annonces transitoires. Les appelants n'importent
 *   jamais `sonner` directement (dépendance interchangeable plus tard).
 *   Placé en haut de l'écran pour ne jamais recouvrir la zone du pouce
 *   (barre d'onglets basse, barre panier — §8/§34).
 * @created 2026-09-08
 * @updated 2026-09-08
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Toaster as SonnerToaster, toast } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      duration={3500}
      toastOptions={{
        classNames: {
          toast: 'rounded-xl border border-border bg-surface shadow-lg',
          title: 'text-sm font-medium text-text-primary',
          description: 'text-sm text-text-secondary',
        },
      }}
    />
  );
}

export { toast };
