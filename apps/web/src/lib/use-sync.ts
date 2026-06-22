'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description React Hook personnalisé : use-sync.ts
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import type { SyncState } from '@wilinwi/ui';
import { syncEngine } from './sync';

/**
 * Suit l'état réseau et la file de synchronisation offline.
 * Vide automatiquement la file au retour du réseau (§5.4).
 */
export function useSync() {
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pending, setPending] = useState(0);

  const refreshPending = useCallback(async () => {
    setPending(await syncEngine.pendingCount());
  }, []);

  const flush = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    await syncEngine.flush();
    setSyncing(false);
    await refreshPending();
  }, [refreshPending]);

  useEffect(() => {
    setOnline(navigator.onLine);
    void refreshPending();
    // Purge des ventes déjà synchronisées (le serveur fait foi) → IndexedDB borné.
    void syncEngine.clearSynced();

    const onOnline = () => {
      setOnline(true);
      void flush();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Re-tentative périodique : vide la file en arrière-plan tant qu'il reste des
    // ventes non synchronisées (sans flicker quand il n'y a rien à envoyer).
    const interval = setInterval(() => {
      if (!navigator.onLine) return;
      void syncEngine.pendingCount().then((n) => {
        if (n > 0) void flush();
      });
    }, 30_000);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(interval);
    };
  }, [flush, refreshPending]);

  const state: SyncState = syncing ? 'syncing' : online ? 'online' : 'offline';
  return { state, pending, flush, refreshPending };
}
