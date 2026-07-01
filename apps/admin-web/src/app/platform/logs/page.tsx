/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Journaux : flux d'audit cross-tenant (dernières actions, tout locataire confondu).
 * 🌐 ceo.nexuspartners.xyz
 */
// ──────────────────────────────────

'use client';

import { useEffect, useState } from 'react';
import { ScrollText, RefreshCw } from 'lucide-react';
import { Card, Badge } from '@wilinwi/ui';
import type { PlatformActivityDto } from '@wilinwi/types';
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

export default function LogsPage() {
  const [rows, setRows] = useState<PlatformActivityDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<PlatformActivityDto[]>('/api/platform/activity?limit=100');
      setRows(data);
    } catch (e) {
      setError((e as ApiError).message || 'Journaux indisponibles.');
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
          <h1 className="text-2xl font-black tracking-tight">Journaux</h1>
          <p className="mt-1 text-sm text-text-secondary">Activité récente, toutes entreprises confondues (audit).</p>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <ScrollText className="h-4.5 w-4.5 text-primary" /> Flux d&apos;activité
          </h2>
          {loading && <RefreshCw className="h-4 w-4 animate-spin text-primary" />}
        </div>
        {error ? (
          <div className="p-6 text-center text-sm text-danger">{error}</div>
        ) : rows.length === 0 && !loading ? (
          <div className="p-8 text-center text-sm text-text-secondary">Aucune activité.</div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-text-primary">{a.action}</div>
                  <div className="text-[11px] text-text-secondary">
                    {a.userNom ?? 'système'}
                    {a.entity ? ` · ${a.entity}` : ''}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <Badge variant="neutral">{a.tenantNom}</Badge>
                  <div className="mt-0.5 text-[10px] text-text-secondary">{relativeTime(a.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
