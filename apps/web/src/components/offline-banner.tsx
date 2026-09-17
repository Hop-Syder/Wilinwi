'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Bandeau d'avertissement hors-ligne. Affiché sur les modules dont
 *   les opérations critiques (réception, dispatch) exigent une connexion active.
 */

import { useState } from 'react';
import { WifiOff, AlertTriangle } from 'lucide-react';
import { useSync } from '@/lib/use-sync';
import { SyncConflictsModal } from '@/components/sync-conflicts-modal';

export function OfflineBanner({ message }: { message?: string }) {
  const { state, rejected, rejectedSales, discardSale, retrySale } = useSync();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      {/* Alerte de conflit de synchronisation prioritaire */}
      {rejected > 0 && (
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            <span>
              <strong>{rejected} vente{rejected > 1 ? 's' : ''} hors-ligne en conflit :</strong> le serveur a refusé la transaction (stock insuffisant ou règle violée).
            </span>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="self-start sm:self-auto text-xs font-bold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors shrink-0 shadow-2xs"
          >
            Résoudre le conflit
          </button>
        </div>
      )}

      {/* Alerte mode hors-ligne standard */}
      {state === 'offline' && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          <WifiOff className="h-4 w-4 shrink-0" />
          {message ?? 'Mode hors-ligne actif. Vos ventes sont enregistrées localement et seront synchronisées au retour du réseau.'}
        </div>
      )}

      <SyncConflictsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        rejectedSales={rejectedSales}
        onDiscard={discardSale}
        onRetry={retrySale}
      />
    </>
  );
}

