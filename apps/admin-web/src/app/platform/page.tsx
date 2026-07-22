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
} from 'lucide-react';
import { StatCard, formatFCFA, NumberTicker } from '@wilinwi/ui';
import type { PlatformMetricsDto, PlatformRevenueDto } from '@wilinwi/types';
import { apiGet, ApiError } from '@/lib/api';
import { ExpiringSubscriptions } from './expiring-subscriptions';
import { EtabGeo } from './etab-geo';
import { HistoricalChart } from './historical-chart';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<PlatformMetricsDto | null>(null);
  const [revenue, setRevenue] = useState<PlatformRevenueDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [metricsResult, revenueResult] = await Promise.allSettled([
          apiGet<PlatformMetricsDto>('/api/platform/metrics'),
          apiGet<PlatformRevenueDto>('/api/platform/revenue'),
        ]);

        if (!cancelled) {
          let hasErrors = false;
          let lastErrorMessage = '';

          if (metricsResult.status === 'fulfilled') {
            setMetrics(metricsResult.value);
          } else {
            hasErrors = true;
            lastErrorMessage = (metricsResult.reason as ApiError)?.message || 'Erreur métriques';
            console.error('Failed to fetch metrics:', metricsResult.reason);
          }

          if (revenueResult.status === 'fulfilled') {
            setRevenue(revenueResult.value);
          } else {
            hasErrors = true;
            lastErrorMessage = (revenueResult.reason as ApiError)?.message || 'Erreur revenus';
            console.error('Failed to fetch revenue:', revenueResult.reason);
          }

          if (metricsResult.status === 'rejected' && revenueResult.status === 'rejected') {
            setError(lastErrorMessage || 'Tableau de bord indisponible.');
          } else if (hasErrors) {
            // Optional: You could set a warning state here if one succeeded and one failed
            // But we will let the successful one render, and the failed one will show '…'
          }
        }
      } catch (e) {
        if (!cancelled) setError((e as ApiError).message || 'Une erreur inattendue est survenue.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const renderValue = (val: number | undefined, formatter?: (n: number) => string) => {
    if (loading || val === undefined) return '…';
    return <NumberTicker value={val} format={formatter} />;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-10">
      {/* Hero Section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight text-text-primary">Cockpit Wilinwi</h1>
        <p className="text-base text-text-secondary">
          Vue d'ensemble de la plateforme et performance globale.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger backdrop-blur-md">
          {error}
        </div>
      )}

      {/* Primary Financial KPIs */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          label="Revenu Mensuel (MRR)" 
          value={renderValue(revenue?.mrr, formatFCFA)} 
          hint="Revenu récurrent" 
          icon={<Wallet className="h-5 w-5" />} 
          accent="brand" 
          className="lg:col-span-2"
        />
        <StatCard 
          label="Croissance GMV 30 j" 
          value={renderValue(metrics?.sales30dRevenue, formatFCFA)} 
          hint={`${metrics?.sales30dCount ?? 0} ventes`} 
          icon={<Receipt className="h-5 w-5" />} 
          accent="emerald" 
          className="lg:col-span-2"
        />
      </div>

      {/* Operational KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Entreprises" value={renderValue(metrics?.tenantsTotal)} icon={<Building2 className="h-4.5 w-4.5" />} accent="brand" />
        <StatCard label="Nouvelles (30 j)" value={renderValue(metrics?.newTenants30d, (v) => `+${v}`)} icon={<Sprout className="h-4.5 w-4.5" />} accent="emerald" />
        <StatCard label="Utilisateurs" value={renderValue(metrics?.usersActive)} icon={<Users className="h-4.5 w-4.5" />} accent="brand" />
        <StatCard label="Points de vente" value={renderValue(metrics?.etablissementsTotal)} icon={<Store className="h-4.5 w-4.5" />} accent="brand" />
        <StatCard label="Revenu Annuel" value={renderValue(revenue?.arr, formatFCFA)} icon={<TrendingUp className="h-4.5 w-4.5" />} accent="emerald" />
        <StatCard label="Impayés" value={renderValue(metrics?.tenantsPastDue)} icon={<AlertTriangle className="h-4.5 w-4.5" />} accent={metrics && metrics.tenantsPastDue > 0 ? 'red' : 'brand'} />
      </div>

      {/* Historical Chart */}
      <HistoricalChart />

      {/* Échéances + géo */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border/50 bg-white/60 shadow-sm backdrop-blur-md dark:bg-slate-900/60 p-1">
          <ExpiringSubscriptions days={14} max={8} />
        </div>
        <div className="rounded-xl border border-border/50 bg-white/60 shadow-sm backdrop-blur-md dark:bg-slate-900/60 p-1">
          <EtabGeo />
        </div>
      </div>
    </div>
  );
}
