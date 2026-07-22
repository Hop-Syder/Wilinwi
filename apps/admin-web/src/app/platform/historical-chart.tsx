/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Graphique d'évolution historique (MRR/GMV)
 * @created 2026-07-21
 * @updated 2026-07-21
 * 🌐 ceo.nexuspartners.xyz
 */
// ──────────────────────────────────

'use client';

import * as React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { PlatformTimeseriesPointDto } from '@wilinwi/types';
import { formatFCFA } from '@wilinwi/ui';
import { apiGet } from '@/lib/api';

export function HistoricalChart() {
  const [data, setData] = React.useState<PlatformTimeseriesPointDto[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    apiGet<PlatformTimeseriesPointDto[]>('/api/platform/timeseries?days=30')
      .then(res => {
        if (!cancelled) {
          // Recharts a besoin que les données soient ordonnées chronologiquement
          setData(res.slice().reverse());
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
      
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <div className="h-[300px] w-full animate-pulse rounded-xl bg-surface/50"></div>;
  }
  
  if (data.length === 0) {
    return <div className="flex h-[300px] w-full items-center justify-center rounded-xl bg-surface/50 text-sm text-text-secondary">Aucune donnée historique</div>;
  }

  return (
    <div className="rounded-xl border border-border/50 bg-white/60 p-6 shadow-sm backdrop-blur-md dark:bg-slate-900/60">
      <div className="mb-6">
        <h3 className="text-lg font-semibold tracking-tight">Évolution du volume d'affaires (30j)</h3>
        <p className="text-sm text-text-secondary">Chiffre d'affaires total généré par les marchands (GMV)</p>
      </div>
      
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00A86B" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#00A86B" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
            <XAxis 
              dataKey="day" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
              tickFormatter={(val) => {
                const d = new Date(val);
                return `${d.getDate()}/${d.getMonth()+1}`;
              }}
              minTickGap={20}
            />
            <YAxis 
              hide={true} 
            />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
              labelStyle={{ color: 'var(--text-secondary)', marginBottom: '4px' }}
              formatter={(value: any) => [formatFCFA(Number(value) || 0), 'GMV']}
              labelFormatter={(label) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(label))}
            />
            <Area 
              type="monotone" 
              dataKey="salesRevenue" 
              stroke="#00A86B" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorRevenue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
