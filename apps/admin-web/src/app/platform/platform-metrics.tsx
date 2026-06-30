/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Métriques plateforme + flux d'audit cross-tenant (Lot 2.5).
 * @created 2026-06-30
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import { useEffect, useState } from 'react';
import {
  Wallet,
  TrendingUp,
  Receipt,
  AlertTriangle,
  Sprout,
  Activity,
  RefreshCw,
} from 'lucide-react';
import { Card, StatCard, Badge, formatFCFA } from '@wilinwi/ui';
import { PLANS, type Plan, type PlatformMetricsDto, type PlatformActivityDto, type PlatformTenantDto } from '@wilinwi/types';
import { apiGet, ApiError } from '@/lib/api';

const PLAN_TONE: Record<Plan, string> = {
  STARTER: 'bg-slate-400',
  PRO: 'bg-primary',
  BUSINESS: 'bg-warning',
  ENTERPRISE: 'bg-success',
};

/** Temps relatif court en français (« il y a 3 min »). */
function relativeTime(value: string | Date): string {
  const diff = Date.now() - new Date(value).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  return `il y a ${j} j`;
}

export function PlatformMetrics({ tenants }: { tenants: PlatformTenantDto[] }) {
  const [metrics, setMetrics] = useState<PlatformMetricsDto | null>(null);
  const [activity, setActivity] = useState<PlatformActivityDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [m, a] = await Promise.all([
        apiGet<PlatformMetricsDto>('/api/platform/metrics'),
        apiGet<PlatformActivityDto[]>('/api/platform/activity?limit=15'),
      ]);
      setMetrics(m);
      setActivity(a);
    } catch (e) {
      setError((e as ApiError).message || 'Métriques indisponibles.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  // Répartition par plan, dérivée de la liste déjà chargée.
  const byPlan = PLANS.map((plan) => ({ plan, count: tenants.filter((t) => t.plan === plan).length }));
  const maxPlan = Math.max(1, ...byPlan.map((p) => p.count));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* KPIs business + répartition (col 1-2) */}
      <div className="lg:col-span-2 space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard
            label="MRR estimé"
            value={metrics ? `${formatFCFA(metrics.mrr)}` : '…'}
            hint="Revenu mensuel récurrent (actifs)"
            icon={<Wallet className="h-4.5 w-4.5" />}
            accent="emerald"
          />
          <StatCard
            label="GMV 30 jours"
            value={metrics ? `${formatFCFA(metrics.sales30dRevenue)}` : '…'}
            hint={metrics ? `${metrics.sales30dCount} ventes` : ''}
            icon={<Receipt className="h-4.5 w-4.5" />}
            accent="brand"
          />
          <StatCard
            label="Nouvelles (30 j)"
            value={metrics ? `+${metrics.newTenants30d}` : '…'}
            hint="Entreprises inscrites"
            icon={<Sprout className="h-4.5 w-4.5" />}
            accent="brand"
          />
          <StatCard
            label="Actives"
            value={metrics ? metrics.tenantsActive.toString() : '…'}
            hint="Abonnements payés"
            icon={<TrendingUp className="h-4.5 w-4.5" />}
            accent="emerald"
          />
          <StatCard
            label="Impayés"
            value={metrics ? metrics.tenantsPastDue.toString() : '…'}
            hint="À relancer"
            icon={<AlertTriangle className="h-4.5 w-4.5" />}
            accent={metrics && metrics.tenantsPastDue > 0 ? 'gold' : 'brand'}
          />
          <StatCard
            label="Collaborateurs"
            value={metrics ? metrics.usersActive.toString() : '…'}
            hint="Utilisateurs actifs"
            icon={<Activity className="h-4.5 w-4.5" />}
            accent="brand"
          />
        </div>

        <Card>
          <div className="p-4 border-b border-border">
            <h3 className="font-bold text-sm">Répartition par plan</h3>
          </div>
          <div className="p-4 space-y-2.5">
            {byPlan.map(({ plan, count }) => (
              <div key={plan} className="flex items-center gap-3">
                <span className="w-20 text-xs font-bold text-text-secondary">{plan}</span>
                <div className="flex-1 h-2.5 rounded-full bg-surface-hover overflow-hidden">
                  <div className={`h-full rounded-full ${PLAN_TONE[plan]}`} style={{ width: `${(count / maxPlan) * 100}%` }} />
                </div>
                <span className="w-8 text-right text-xs font-bold tabular">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Flux d'audit (col 3) */}
      <Card className="flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Activité récente
          </h3>
          {loading && <RefreshCw className="h-4 w-4 animate-spin text-primary" />}
        </div>
        {error ? (
          <div className="p-4 text-xs text-danger">{error}</div>
        ) : (
          <div className="max-h-[360px] overflow-y-auto divide-y divide-border">
            {activity.length === 0 && !loading ? (
              <div className="p-6 text-center text-xs text-text-secondary">Aucune activité récente.</div>
            ) : (
              activity.map((a) => (
                <div key={a.id} className="px-4 py-2.5 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-text-primary truncate">{a.action}</div>
                    <div className="text-[10px] text-text-secondary truncate">
                      {a.userNom ?? 'système'}
                      {a.entity ? ` · ${a.entity}` : ''}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="neutral">{a.tenantNom}</Badge>
                    <div className="text-[10px] text-text-secondary mt-0.5">{relativeTime(a.createdAt)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
