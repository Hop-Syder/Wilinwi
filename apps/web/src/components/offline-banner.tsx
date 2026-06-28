'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Bandeau d'avertissement hors-ligne. Affiché sur les modules dont
 *   les opérations critiques (réception, dispatch) exigent une connexion active.
 */

import { WifiOff } from 'lucide-react';
import { useSync } from '@/lib/use-sync';

export function OfflineBanner({ message }: { message?: string }) {
  const { state } = useSync();
  if (state !== 'offline') return null;
  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
      <WifiOff className="h-4 w-4 shrink-0" />
      {message ?? 'Mode hors-ligne actif. La réception et les transferts nécessitent une connexion.'}
    </div>
  );
}
