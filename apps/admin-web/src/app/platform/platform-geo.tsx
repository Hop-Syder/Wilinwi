/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Provenance géographique des accès (analytics #2) — geoip-lite hors-ligne.
 * 🌐 ceo.nexuspartners.xyz
 */
// ──────────────────────────────────

'use client';

import { useEffect, useState } from 'react';
import { Globe2, RefreshCw } from 'lucide-react';
import { Card } from '@wilinwi/ui';
import type { PlatformGeoCountryDto } from '@wilinwi/types';
import { apiGet, ApiError } from '@/lib/api';

/** ISO alpha-2 → emoji drapeau (indicateurs régionaux). */
function flag(cc: string): string {
  if (cc === 'XX' || cc.length !== 2) return '🌐';
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function PlatformGeo() {
  const [rows, setRows] = useState<PlatformGeoCountryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet<PlatformGeoCountryDto[]>('/api/platform/geo?days=365');
        if (!cancelled) setRows(data);
      } catch (e) {
        if (!cancelled) setError((e as ApiError).message || 'Provenance indisponible.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const maxIp = Math.max(1, ...rows.map((r) => r.ipCount));
  const totalIp = rows.reduce((s, r) => s + r.ipCount, 0);

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <Globe2 className="h-4.5 w-4.5 text-primary" />
          Provenance géographique
        </h2>
        <span className="text-[11px] text-text-secondary">{totalIp} IP · 12 mois</span>
      </div>
      {error ? (
        <div className="p-6 text-center text-sm text-danger">{error}</div>
      ) : loading ? (
        <div className="flex items-center justify-center py-12 text-text-secondary">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <div className="p-6 text-center text-xs text-text-secondary">Aucune donnée de provenance.</div>
      ) : (
        <div className="max-h-[320px] space-y-2.5 overflow-y-auto p-4">
          {rows.map((r) => (
            <div key={r.countryCode} className="flex items-center gap-3">
              <span className="w-6 text-center text-lg leading-none">{flag(r.countryCode)}</span>
              <span className="w-32 truncate text-xs font-semibold text-text-primary" title={r.country}>
                {r.country}
              </span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-hover">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(r.ipCount / maxIp) * 100}%` }}
                />
              </div>
              <span className="w-20 text-right text-[11px] text-text-secondary tabular">
                {r.ipCount} IP · {r.hits}
              </span>
            </div>
          ))}
          <p className="pt-1 text-[10px] text-text-secondary">
            Géolocalisation hors-ligne (geoip-lite/GeoLite2). « Inconnu/local » = localhost ou réseaux privés.
          </p>
        </div>
      )}
    </Card>
  );
}
