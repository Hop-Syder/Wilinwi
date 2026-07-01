/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Tableau de bord cockpit : KPI consolidés + revenus + échéances + géo.
 * 🌐 ceo.nexuspartners.xyz
 */
// ──────────────────────────────────

'use client';

import { useEffect, useState } from 'react';
import {
  Building2,
  Users,
  Store,
  Wallet,
  TrendingUp,
  AlertTriangle,
  Sprout,
  Receipt,
  RefreshCw,
} from 'lucide-react';
import { StatCard, formatFCFA } from '@wilinwi/ui';
import type { PlatformMetricsDto, PlatformRevenueDto } from '@wilinwi/types';
import { apiGet, ApiError } from '@/lib/api';
import { ExpiringSubscriptions } from './expiring-subscriptions';
import { EtabGeo } from './etab-geo';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<PlatformMetricsDto | null>(null);
  const [revenue, setRevenue] = useState<PlatformRevenueDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [m, r] = await Promise.all([
          apiGet<PlatformMetricsDto>('/api/platform/metrics'),
          apiGet<PlatformRevenueDto>('/api/platform/revenue'),
        ]);
        if (!cancelled) {
          setMetrics(m);
          setRevenue(r);
        }
      } catch (e) {
        if (!cancelled) setError((e as ApiError).message || 'Tableau de bord indisponible.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const v = (n?: number) => (loading ? '…' : (n ?? 0).toString());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Tableau de bord</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Vue d&apos;ensemble de la plateforme Wilinwi — opérée par Nexus Partners.
        </p>
      </div>

      {error && <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>}

      {/* KPI activité */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Entreprises" value={v(metrics?.tenantsTotal)} hint="Inscrites" icon={<Building2 className="h-4.5 w-4.5" />} accent="brand" />
        <StatCard label="Collaborateurs" value={v(metrics?.usersActive)} hint="Utilisateurs actifs" icon={<Users className="h-4.5 w-4.5" />} accent="brand" />
        <StatCard label="Points de vente" value={v(metrics?.etablissementsTotal)} hint="Établissements" icon={<Store className="h-4.5 w-4.5" />} accent="emerald" />
        <StatCard label="Nouvelles (30 j)" value={loading ? '…' : `+${metrics?.newTenants30d ?? 0}`} hint="Croissance" icon={<Sprout className="h-4.5 w-4.5" />} accent="brand" />
        <StatCard label="MRR" value={loading ? '…' : formatFCFA(revenue?.mrr ?? 0)} hint="Revenu mensuel récurrent" icon={<Wallet className="h-4.5 w-4.5" />} accent="emerald" />
        <StatCard label="ARR" value={loading ? '…' : formatFCFA(revenue?.arr ?? 0)} hint="Revenu annuel" icon={<TrendingUp className="h-4.5 w-4.5" />} accent="emerald" />
        <StatCard label="GMV 30 j" value={loading ? '…' : formatFCFA(metrics?.sales30dRevenue ?? 0)} hint={`${metrics?.sales30dCount ?? 0} ventes`} icon={<Receipt className="h-4.5 w-4.5" />} accent="gold" />
        <StatCard label="Impayés" value={v(metrics?.tenantsPastDue)} hint="À relancer" icon={<AlertTriangle className="h-4.5 w-4.5" />} accent={metrics && metrics.tenantsPastDue > 0 ? 'gold' : 'brand'} />
      </div>

      {/* Échéances + géo */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ExpiringSubscriptions days={14} max={8} />
        <EtabGeo />
      </div>
    </div>
  );
}
