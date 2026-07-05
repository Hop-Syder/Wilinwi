/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Alertes d'audit cross-tenant (TDR §18.2) : anomalies non bloquantes
 *   à corriger manuellement — stock négatif (ALLOW_NEGATIVE), conflits de lots
 *   Health (Milestone 4). Les CRITICAL remontent en tête.
 * 🌐 ceo.nexuspartners.xyz
 */
// ──────────────────────────────────

'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import { Card, Badge } from '@wilinwi/ui';
import type { PlatformAuditAlertDto } from '@wilinwi/types';
import { apiGet, ApiError } from '@/lib/api';

function relativeTime(value: string | Date): string {
  const diff = Date.now() - new Date(value).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

const SEVERITY_TONE: Record<PlatformAuditAlertDto['severity'], 'danger' | 'warning' | 'neutral'> = {
  CRITICAL: 'danger',
  WARNING: 'warning',
  INFO: 'neutral',
};

export default function AlertesPage() {
  const [rows, setRows] = useState<PlatformAuditAlertDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setRows(await apiGet<PlatformAuditAlertDto[]>('/api/platform/audit-alerts?limit=100'));
    } catch (e) {
      setError((e as ApiError).message || 'Alertes indisponibles.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Alertes d'audit</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Anomalies non bloquantes détectées a posteriori (stock négatif, conflits de lots…).
            La résolution se fait côté entreprise — cette vue sert au support proactif.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-surface-hover"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
        </button>
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <ShieldAlert className="h-4 w-4 text-warning" /> Non résolues ({rows.length})
          </h2>
        </div>

        {error && <p className="p-4 text-sm text-danger">{error}</p>}
        {!error && !loading && rows.length === 0 && (
          <p className="p-8 text-center text-sm text-text-secondary">
            Aucune alerte en attente — tout est propre. ✨
          </p>
        )}

        <ul className="divide-y divide-border">
          {rows.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={SEVERITY_TONE[a.severity]}>{a.severity}</Badge>
                  <span className="rounded bg-surface-hover px-1.5 py-0.5 font-mono text-[11px] text-text-secondary">
                    {a.type}
                  </span>
                  <span className="truncate text-sm font-semibold">{a.tenantNom}</span>
                </div>
                <p className="mt-1 text-sm text-text-secondary">{a.message}</p>
              </div>
              <span className="shrink-0 text-xs text-text-secondary/70">
                {relativeTime(a.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
