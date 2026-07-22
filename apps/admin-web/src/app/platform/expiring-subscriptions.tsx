/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Liste des abonnements arrivant à échéance (ou dépassés) avec AnimatedList.
 * 🌐 ceo.nexuspartners.xyz
 */
// ──────────────────────────────────

'use client';

import { useEffect, useState } from 'react';
import { Clock, RefreshCw, AlertTriangle } from 'lucide-react';
import { Card, Badge, AnimatedList } from '@wilinwi/ui';
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
    <Card className="flex h-full flex-col bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-white/20 shadow-xl overflow-hidden relative">
      <div className="flex items-center justify-between border-b border-white/10 p-5 bg-white/30 dark:bg-black/30">
        <h2 className="flex items-center gap-2 text-lg font-black tracking-tight text-text-primary">
          <Clock className="h-5 w-5 text-red-500" />
          Échéances <span className="text-sm font-semibold text-text-secondary">({days} j)</span>
        </h2>
        {!loading && <Badge variant={rows.length > 0 ? 'danger' : 'neutral'} className="shadow-sm">{rows.length}</Badge>}
      </div>
      
      {error ? (
        <div className="p-6 text-center text-sm text-danger font-medium">{error}</div>
      ) : loading ? (
        <div className="flex items-center justify-center flex-1 py-12 text-text-secondary">
          <RefreshCw className="h-6 w-6 animate-spin text-red-500" />
        </div>
      ) : list.length === 0 ? (
        <div className="flex-1 p-6 flex items-center justify-center text-sm text-text-secondary font-medium">Aucune échéance dans cette fenêtre.</div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <AnimatedList delay={500}>
            {list.map((s) => {
              const late = s.daysLeft < 0;
              const soon = s.daysLeft >= 0 && s.daysLeft <= 3;
              return (
                <div 
                  key={s.id} 
                  className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all duration-300 hover:scale-[1.02] ${
                    late 
                      ? 'bg-red-500/10 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
                      : soon 
                      ? 'bg-orange-500/10 border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.1)]' 
                      : 'bg-white/50 dark:bg-slate-800/50 border-white/20 hover:shadow-md'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-text-primary">{s.nom}</div>
                    <div className="truncate text-xs font-medium text-text-secondary mt-0.5">
                      {s.plan} <span className="opacity-50 mx-1">•</span> {s.ownerEmail ?? '—'}
                    </div>
                  </div>
                  <Badge variant={late ? 'danger' : soon ? 'warning' : 'neutral'} className="shrink-0 shadow-sm whitespace-nowrap">
                    {late ? (
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" /> +{Math.abs(s.daysLeft)} j retard
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
          </AnimatedList>
        </div>
      )}
    </Card>
  );
}
