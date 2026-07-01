/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Répartition des établissements par ville (carte = futur ; ici agrégat).
 * 🌐 ceo.nexuspartners.xyz
 */
// ──────────────────────────────────

'use client';

import { useEffect, useState } from 'react';
import { MapPin, RefreshCw } from 'lucide-react';
import { Card } from '@wilinwi/ui';
import type { PlatformEtabGeoDto } from '@wilinwi/types';
import { apiGet, ApiError } from '@/lib/api';

export function EtabGeo() {
  const [rows, setRows] = useState<PlatformEtabGeoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet<PlatformEtabGeoDto[]>('/api/platform/etablissements-geo');
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
  }, []);

  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <MapPin className="h-4.5 w-4.5 text-primary" /> Établissements par ville
        </h2>
      </div>
      {error ? (
        <div className="p-6 text-center text-sm text-danger">{error}</div>
      ) : loading ? (
        <div className="flex items-center justify-center py-12 text-text-secondary">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <div className="p-6 text-center text-xs text-text-secondary">Aucun établissement.</div>
      ) : (
        <div className="max-h-[320px] space-y-2.5 overflow-y-auto p-4">
          {rows.map((r) => (
            <div key={r.ville} className="flex items-center gap-3">
              <span className="w-32 truncate text-xs font-semibold text-text-primary" title={r.ville}>
                {r.ville}
              </span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-hover">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(r.count / max) * 100}%` }} />
              </div>
              <span className="w-8 text-right text-xs font-bold tabular">{r.count}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
