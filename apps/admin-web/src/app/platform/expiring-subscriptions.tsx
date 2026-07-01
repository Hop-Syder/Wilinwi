/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Liste des abonnements arrivant à échéance (ou dépassés). Réutilisé dashboard + abonnements.
 * 🌐 ceo.nexuspartners.xyz
 */
// ──────────────────────────────────

'use client';

import { useEffect, useState } from 'react';
import { Clock, RefreshCw, AlertTriangle } from 'lucide-react';
import { Card, Badge } from '@wilinwi/ui';
import type { PlatformExpiringSubscriptionDto } from '@wilinwi/types';
import { apiGet, ApiError } from '@/lib/api';

export function ExpiringSubscriptions({ days = 14, max }: { days?: number; max?: number }) {
  const [rows, setRows] = useState<PlatformExpiringSubscriptionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet<PlatformExpiringSubscriptionDto[]>(`/api/platform/subscriptions/expiring?days=${days}`);
        if (!cancelled) setRows(data);
      } catch (e) {
        if (!cancelled) setError((e as ApiError).message || 'Indisponible.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [days]);

  const list = max ? rows.slice(0, max) : rows;

  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <Clock className="h-4.5 w-4.5 text-warning" />
          Échéances à venir <span className="text-xs font-normal text-text-secondary">({days} j)</span>
        </h2>
        {!loading && <Badge variant={rows.length > 0 ? 'warning' : 'neutral'}>{rows.length}</Badge>}
      </div>
      {error ? (
        <div className="p-6 text-center text-sm text-danger">{error}</div>
      ) : loading ? (
        <div className="flex items-center justify-center py-12 text-text-secondary">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : list.length === 0 ? (
        <div className="p-6 text-center text-xs text-text-secondary">Aucune échéance dans cette fenêtre.</div>
      ) : (
        <div className="max-h-[360px] divide-y divide-border overflow-y-auto">
          {list.map((s) => {
            const late = s.daysLeft < 0;
            const soon = s.daysLeft >= 0 && s.daysLeft <= 3;
            return (
              <div key={s.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-text-primary">{s.nom}</div>
                  <div className="truncate text-[10px] text-text-secondary">
                    {s.plan} · {s.ownerEmail ?? '—'}
                  </div>
                </div>
                <Badge variant={late ? 'danger' : soon ? 'warning' : 'neutral'}>
                  {late ? (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> +{Math.abs(s.daysLeft)} j retard
                    </span>
                  ) : s.daysLeft === 0 ? (
                    "Aujourd'hui"
                  ) : (
                    `Dans ${s.daysLeft} j`
                  )}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
