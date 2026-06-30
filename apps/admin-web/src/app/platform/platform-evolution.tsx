/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Courbes d'évolution de la plateforme (inscriptions, ventes, GMV) — Lot analytics #1.
 * 🌐 ceo.nexuspartners.xyz
 */
// ──────────────────────────────────

'use client';

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, RefreshCw, LineChart as LineIcon } from 'lucide-react';
import { Card, formatFCFA } from '@wilinwi/ui';
import type { PlatformTimeseriesPointDto } from '@wilinwi/types';
import { apiGet, ApiError } from '@/lib/api';

const RANGES = [
  { days: 30, label: '30 j' },
  { days: 90, label: '90 j' },
  { days: 365, label: '1 an' },
] as const;

/** 'YYYY-MM-DD' → 'DD/MM' (libellé court d'axe). */
function shortDay(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export function PlatformEvolution() {
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<(PlatformTimeseriesPointDto & { label: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await apiGet<PlatformTimeseriesPointDto[]>(`/api/platform/timeseries?days=${days}`);
        if (!cancelled) setData(rows.map((r) => ({ ...r, label: shortDay(r.day) })));
      } catch (e) {
        if (!cancelled) setError((e as ApiError).message || 'Séries indisponibles.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [days]);

  const totalNew = data.reduce((s, d) => s + d.newTenants, 0);
  const totalGmv = data.reduce((s, d) => s + d.salesRevenue, 0);

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 border-b border-border p-4">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <LineIcon className="h-4.5 w-4.5 text-primary" />
          Évolution de la plateforme
        </h2>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-hover/40 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                days === r.days ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="p-6 text-center text-sm text-danger">{error}</div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16 text-text-secondary">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6 p-4">
          {/* Croissance des entreprises */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">Croissance des entreprises</h3>
              <span className="flex items-center gap-1 text-xs font-semibold text-success">
                <TrendingUp className="h-3.5 w-3.5" /> +{totalNew} sur la période
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={data} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e5e7eb)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={24} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(value, name) => [value as number, name === 'cumulativeTenants' ? 'Cumul' : 'Nouvelles']}
                  labelFormatter={(l) => `Jour ${l}`}
                />
                <Bar yAxisId="left" dataKey="newTenants" fill="#0005ea" radius={[3, 3, 0, 0]} maxBarSize={18} />
                <Line yAxisId="right" type="monotone" dataKey="cumulativeTenants" stroke="#00A86B" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* GMV & ventes */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">Volume d'affaires (GMV)</h3>
              <span className="text-xs font-semibold text-text-secondary tabular">{formatFCFA(totalGmv)} sur la période</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gmv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e5e7eb)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={24} />
                <YAxis tick={{ fontSize: 10 }} width={56} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(value) => [formatFCFA(Number(value)), 'GMV']}
                  labelFormatter={(l) => `Jour ${l}`}
                />
                <Area type="monotone" dataKey="salesRevenue" stroke="#F59E0B" strokeWidth={2} fill="url(#gmv)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </Card>
  );
}
