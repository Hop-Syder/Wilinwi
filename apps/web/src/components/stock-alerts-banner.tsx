'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Bandeau « Stock bas » : produits dont la quantité ≤ seuil de réappro
 *   à l'établissement courant (ou toutes boutiques en vue globale). Repliable.
 */

import { useEffect, useState } from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import type { StockAlertDto } from '@wilinwi/types';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export function StockAlertsBanner() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<StockAlertDto[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiGet<StockAlertDto[]>('/api/stock/products/alerts')
      .then((a) => {
        if (!cancelled) setAlerts(a);
      })
      .catch(() => {
        if (!cancelled) setAlerts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.etablissementId]);

  if (alerts.length === 0) return null;
  const showEtab = user?.etablissementId === 'ALL';

  return (
    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-sm font-semibold text-amber-800"
      >
        <span className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {alerts.length} produit(s) en stock bas
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className="mt-2 space-y-1 text-sm text-amber-900">
          {alerts.map((a) => (
            <li
              key={`${a.etablissementId}:${a.productId}:${a.variantId ?? ''}`}
              className="flex items-center justify-between gap-3 border-t border-amber-200/60 pt-1"
            >
              <span className="min-w-0 truncate">
                {a.productNom}
                {showEtab && a.etablissementNom ? (
                  <span className="text-amber-700"> · {a.etablissementNom}</span>
                ) : null}
              </span>
              <span className="tabular shrink-0 font-medium">
                {a.quantite} <span className="font-normal text-amber-700">/ seuil {a.quantiteMin}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
