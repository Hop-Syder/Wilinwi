/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Funnel d'activation des entreprises + comptes à relancer (analytics #3).
 *   « Activé » = ≥ 10 articles créés ET ≥ 1 vente en caisse.
 * 🌐 ceo.nexuspartners.xyz
 */
// ──────────────────────────────────

'use client';

import { useEffect, useState } from 'react';
import { Filter, RefreshCw, PackageX, AlertCircle } from 'lucide-react';
import { Card, Badge } from '@wilinwi/ui';
import type { PlatformActivationFunnelDto, PlatformInactiveTenantDto } from '@wilinwi/types';
import { apiGet, ApiError } from '@/lib/api';

export function PlatformActivation() {
  const [funnel, setFunnel] = useState<PlatformActivationFunnelDto | null>(null);
  const [inactive, setInactive] = useState<PlatformInactiveTenantDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [f, i] = await Promise.all([
          apiGet<PlatformActivationFunnelDto>('/api/platform/activation'),
          apiGet<PlatformInactiveTenantDto[]>('/api/platform/inactive?limit=50'),
        ]);
        if (!cancelled) {
          setFunnel(f);
          setInactive(i);
        }
      } catch (e) {
        if (!cancelled) setError((e as ApiError).message || 'Funnel indisponible.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const total = funnel?.total ?? 0;
  const steps = funnel
    ? [
        { label: 'Inscrits', value: funnel.total, tone: 'bg-slate-400' },
        { label: '≥ 1 article', value: funnel.withAnyProduct, tone: 'bg-primary/70' },
        { label: '≥ 10 articles', value: funnel.with10Products, tone: 'bg-primary' },
        { label: '≥ 1 vente', value: funnel.withAnySale, tone: 'bg-warning' },
        { label: 'Activés ✓', value: funnel.activated, tone: 'bg-success' },
      ]
    : [];
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Funnel */}
      <Card>
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Filter className="h-4.5 w-4.5 text-primary" />
            Funnel d&apos;activation
          </h2>
          <span className="text-[11px] text-text-secondary">activé = ≥10 articles + 1 vente</span>
        </div>
        {error ? (
          <div className="p-6 text-center text-sm text-danger">{error}</div>
        ) : loading || !funnel ? (
          <div className="flex items-center justify-center py-12 text-text-secondary">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {steps.map((s) => (
              <div key={s.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-primary">{s.label}</span>
                  <span className="text-text-secondary tabular">
                    {s.value} <span className="opacity-60">({pct(s.value)}%)</span>
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-surface-hover">
                  <div className={`h-full rounded-full ${s.tone}`} style={{ width: `${pct(s.value)}%` }} />
                </div>
              </div>
            ))}
            <p className="pt-1 text-[11px] text-text-secondary">
              Taux d&apos;activation global : <span className="font-bold text-success">{pct(funnel.activated)}%</span>
            </p>
          </div>
        )}
      </Card>

      {/* Comptes non activés (à relancer) */}
      <Card className="flex flex-col">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <PackageX className="h-4.5 w-4.5 text-warning" />
            À relancer
          </h2>
          {!loading && <Badge variant="warning">{inactive.length}</Badge>}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-text-secondary">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : inactive.length === 0 ? (
          <div className="p-6 text-center text-xs text-text-secondary">
            Toutes les entreprises sont activées 🎉
          </div>
        ) : (
          <div className="max-h-[300px] divide-y divide-border overflow-y-auto">
            {inactive.map((t) => {
              const noProduct = t.productsCount === 0;
              return (
                <div key={t.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-text-primary">{t.nom}</div>
                    <div className="flex items-center gap-1 text-[10px] text-text-secondary">
                      {noProduct && <AlertCircle className="h-3 w-3 text-danger" />}
                      {t.productsCount} article{t.productsCount > 1 ? 's' : ''} · {t.salesCount} vente
                      {t.salesCount > 1 ? 's' : ''}
                    </div>
                  </div>
                  <Badge variant={noProduct ? 'danger' : 'neutral'}>
                    {noProduct ? 'Vide' : `${t.productsCount}/10`}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
