'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Tableau de bord — KPIs du jour + graphe combiné (progression CA vs dépenses)
 *   connecté à la base via /api/analytics/report. (Recharts)
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, DollarSign, Package, AlertTriangle } from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { ContextualHelp } from '@/components/contextual-help';
import type { TourStep } from '@/components/tour-guide';
import { StatCard, Card, CardTitle, Badge, formatFCFA, formatQty } from '@wilinwi/ui';
import { apiGet } from '@/lib/api';
import { useCachedQuery } from '@/lib/use-cached-query';

interface Dashboard {
  ventesDuJour: number;
  articlesVendus: number;
  valeurStockCatalogue: number;
  beneficeDuJour?: number;
  valeurStockAchat?: number;
  alertes: {
    ruptures: { id: string; nom: string; stock: number }[];
    dormants: { id: string; nom: string; stock: number }[];
  };
}

interface Report {
  chiffreAffaires: number;
  totalDepenses: number;
  benefice?: number;
  serie: { date: string; ca: number; ventes: number; depenses: number }[];
}

const CA_COLOR = '#00A86B'; // vert émeraude (charte) — progression / chiffre d'affaires
const DEP_COLOR = '#E53935'; // rouge danger (charte) — dépenses

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const fmtDay = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
const fmtK = (n: number) =>
  Math.abs(n) >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`;

export default function DashboardPage() {
  const { data, loading, error } = useCachedQuery<Dashboard>('dashboard', () =>
    apiGet<Dashboard>('/api/analytics/dashboard'),
  );

  // Période du graphe (jours glissants).
  const [days, setDays] = useState(30);
  const range = useMemo(() => {
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - (days - 1));
    return { from: ymd(from), to: ymd(today) };
  }, [days]);

  const { data: report } = useCachedQuery<Report>(
    `analytics/report?from=${range.from}&to=${range.to}`,
    () => apiGet<Report>(`/api/analytics/report?from=${range.from}&to=${range.to}`),
  );

  const tourSteps: TourStep[] = [
    {
      targetId: 'tour-dashboard-stats',
      title: 'Performance du jour',
      content:
        "Analysez rapidement le chiffre d'affaires, le nombre de ventes et votre marge générée sur la journée.",
      position: 'bottom',
    },
    {
      targetId: 'tour-dashboard-charts',
      title: 'Progression & dépenses',
      content:
        "Comparez l'évolution de votre chiffre d'affaires et de vos dépenses sur la période pour suivre votre rentabilité.",
      position: 'top',
    },
  ];

  if (error && !data) return <ErrorState message={error.message} />;
  if (loading || !data) return <p className="text-text-secondary">Chargement du tableau de bord…</p>;

  const serie = report?.serie ?? [];
  const totalCa = report?.chiffreAffaires ?? 0;
  const totalDep = report?.totalDepenses ?? 0;
  const net = totalCa - totalDep;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-text-primary">Tableau de bord</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Aperçu de l'activité du{' '}
            <strong className="font-medium">{new Date().toLocaleDateString()}</strong>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/rapports"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
          >
            <TrendingUp className="h-4 w-4" /> Rapports
          </Link>
          <ContextualHelp
            storageKey="wilinwi_dashboard_tour_done"
            tourSteps={tourSteps}
            useCases={[
              {
                title: 'Suivre la rentabilité',
                description:
                  'Le graphe compare votre chiffre d\'affaires (en vert) à vos dépenses (en rouge). L\'écart, c\'est votre résultat.',
              },
              {
                title: 'Optimiser le réassort',
                description:
                  'Les panneaux "Ruptures" et "Produits dormants" vous aident à savoir quoi racheter et quoi écouler.',
              },
            ]}
          />
        </div>
      </div>

      {/* KPIs du jour */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" id="tour-dashboard-stats">
        <StatCard
          label="Ventes du jour"
          value={formatFCFA(data.ventesDuJour)}
          hint={`${formatQty(data.articlesVendus)} article(s) vendu(s)`}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="emerald"
        />
        {data.beneficeDuJour !== undefined && (
          <StatCard
            label="Bénéfice du jour"
            value={formatFCFA(data.beneficeDuJour)}
            hint="Marge réelle"
            icon={<DollarSign className="h-5 w-5" />}
            accent="brand"
          />
        )}
        <StatCard
          label="Valeur du stock (catalogue)"
          value={formatFCFA(data.valeurStockCatalogue)}
          hint="Potentiel de vente"
          icon={<Package className="h-5 w-5" />}
          accent="gold"
        />
        {data.valeurStockAchat !== undefined && (
          <StatCard
            label="Stock (prix d'achat)"
            value={formatFCFA(data.valeurStockAchat)}
            hint="Argent immobilisé"
            icon={<Package className="h-5 w-5" />}
            accent="brand"
          />
        )}
      </div>

      {/* Graphe combiné : progression (CA) vs dépenses — connecté à la BDD */}
      <div className="mt-8" id="tour-dashboard-charts">
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary/70">
                Activité
              </span>
              <CardTitle className="text-xl">Progression & dépenses</CardTitle>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                    days === d
                      ? 'bg-primary text-white'
                      : 'text-text-secondary hover:bg-surface-hover'
                  }`}
                >
                  {d}j
                </button>
              ))}
            </div>
          </div>

          {/* Résumé de la période */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <SummaryStat label="Chiffre d'affaires" value={formatFCFA(totalCa)} color={CA_COLOR} />
            <SummaryStat label="Dépenses" value={formatFCFA(totalDep)} color={DEP_COLOR} />
            <SummaryStat
              label="Résultat net"
              value={formatFCFA(net)}
              color={net >= 0 ? CA_COLOR : DEP_COLOR}
            />
          </div>

          <div className="mt-6 h-72 w-full">
            {serie.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-text-secondary">
                Pas encore de données sur cette période.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={serie} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CA_COLOR} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={CA_COLOR} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={fmtDay}
                    tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                    interval="preserveStartEnd"
                    minTickGap={24}
                  />
                  <YAxis
                    tickFormatter={fmtK}
                    tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                    width={44}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="ca"
                    name="Chiffre d'affaires"
                    stroke={CA_COLOR}
                    strokeWidth={2.5}
                    fill="url(#caGrad)"
                  />
                  <Bar dataKey="depenses" name="Dépenses" fill={DEP_COLOR} radius={[3, 3, 0, 0]} maxBarSize={22} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Légende */}
          <div className="mt-4 flex items-center justify-center gap-6 border-t border-border pt-4 text-xs font-medium text-text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: CA_COLOR }} /> Chiffre
              d'affaires
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: DEP_COLOR }} /> Dépenses
            </span>
          </div>
        </Card>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" /> Ruptures proches
            </span>
          </CardTitle>
          <AlertList items={data.alertes.ruptures} emptyLabel="Aucune rupture imminente." />
        </Card>
        <Card>
          <CardTitle>Produits dormants</CardTitle>
          <AlertList items={data.alertes.dormants} emptyLabel="Aucun produit dormant." />
        </Card>
      </div>
    </div>
  );
}

function SummaryStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2.5">
      <p className="text-[11px] font-medium text-text-secondary">{label}</p>
      <p className="tabular mt-0.5 text-base font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

interface TooltipLike {
  active?: boolean;
  label?: string | number;
  payload?: { dataKey?: string | number; value?: number }[];
}

function ChartTooltip({ active, payload, label }: TooltipLike) {
  if (!active || !payload || payload.length === 0) return null;
  const ca = Number(payload.find((p) => p.dataKey === 'ca')?.value ?? 0);
  const dep = Number(payload.find((p) => p.dataKey === 'depenses')?.value ?? 0);
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-text-primary">
        {new Date(String(label)).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })}
      </p>
      <p className="flex items-center justify-between gap-4" style={{ color: CA_COLOR }}>
        <span>Chiffre d'affaires</span>
        <span className="tabular font-semibold">{formatFCFA(ca)}</span>
      </p>
      <p className="flex items-center justify-between gap-4" style={{ color: DEP_COLOR }}>
        <span>Dépenses</span>
        <span className="tabular font-semibold">{formatFCFA(dep)}</span>
      </p>
      <p className="mt-1 flex items-center justify-between gap-4 border-t border-border pt-1 text-text-primary">
        <span className="inline-flex items-center gap-1">
          {ca - dep >= 0 ? (
            <TrendingUp className="h-3 w-3 text-emerald-500" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-500" />
          )}
          Net
        </span>
        <span className="tabular font-bold">{formatFCFA(ca - dep)}</span>
      </p>
    </div>
  );
}

function AlertList({
  items,
  emptyLabel,
}: {
  items: { id: string; nom: string; stock: number }[];
  emptyLabel: string;
}) {
  if (items.length === 0) return <p className="mt-3 text-sm text-text-secondary">{emptyLabel}</p>;
  return (
    <ul className="mt-3 space-y-2">
      {items.map((it) => (
        <li key={it.id} className="flex items-center justify-between text-sm">
          <span className="text-text-primary">{it.nom}</span>
          <Badge tone={it.stock <= 0 ? 'danger' : 'warning'}>{formatQty(it.stock)} en stock</Badge>
        </li>
      ))}
    </ul>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{message}</div>
  );
}
