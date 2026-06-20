'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant Frontend Web : sw-register.tsx
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useEffect } from 'react';

/** Enregistre le service worker pour la coquille hors-ligne. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
  }, []);
  return null;
}
