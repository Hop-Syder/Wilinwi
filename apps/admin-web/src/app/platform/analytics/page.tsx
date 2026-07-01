/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Analytics : métriques + répartition plan/audit + courbes + funnel + géo.
 * 🌐 ceo.nexuspartners.xyz
 */
// ──────────────────────────────────

'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { PlatformTenantDto } from '@wilinwi/types';
import { apiGet } from '@/lib/api';
import { PlatformMetrics } from '../platform-metrics';
import { PlatformEvolution } from '../platform-evolution';
import { PlatformActivation } from '../platform-activation';
import { PlatformGeo } from '../platform-geo';

export default function AnalyticsPage() {
  const [tenants, setTenants] = useState<PlatformTenantDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet<PlatformTenantDto[]>('/api/platform/tenants');
        if (!cancelled) setTenants(data);
      } catch {
        /* PlatformMetrics fetch ses propres métriques ; tenants sert juste à la répartition par plan */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Métriques d&apos;usage, croissance, activation et provenance géographique.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-text-secondary">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <PlatformMetrics tenants={tenants} />
      )}
      <PlatformEvolution />
      <PlatformActivation />
      <PlatformGeo />
    </div>
  );
}
