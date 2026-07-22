/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Répartition des établissements par ville avec visualisation Globe 3D.
 * 🌐 ceo.nexuspartners.xyz
 */
// ──────────────────────────────────

'use client';

import { useEffect, useState } from 'react';
import { MapPin, RefreshCw } from 'lucide-react';
import { Card, Globe } from '@wilinwi/ui';
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
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl">
      <div className="absolute -right-20 -top-20 bottom-0 z-0 opacity-40 pointer-events-none mix-blend-screen dark:opacity-30">
        <Globe className="h-[400px] w-[400px] sm:h-[600px] sm:w-[600px]" />
      </div>

      <Card className="relative z-10 flex h-full flex-col bg-transparent shadow-none border-none">
        <div className="flex items-center justify-between p-6">
          <h2 className="flex items-center gap-2 text-lg font-black tracking-tight text-text-primary">
            <MapPin className="h-5 w-5 text-emerald-500" /> Établissements par ville
          </h2>
        </div>
        
        <div className="flex-1 p-6 pt-0">
          {error ? (
            <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-center text-sm text-danger backdrop-blur-md">
              {error}
            </div>
          ) : loading ? (
            <div className="flex h-32 items-center justify-center text-text-secondary">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-500" />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-center text-sm text-text-secondary">Aucun établissement enregistré.</div>
          ) : (
            <div className="max-h-[250px] space-y-4 overflow-y-auto pr-2">
              {rows.map((r) => (
                <div key={r.ville} className="flex items-center gap-4">
                  <span className="w-32 truncate text-sm font-semibold text-text-primary" title={r.ville}>
                    {r.ville}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-[0_0_10px_rgba(52,211,153,0.5)]" style={{ width: `${(r.count / max) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right text-sm font-bold tabular-nums text-text-primary">{r.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
