'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Rapports historiques (Analytics) : KPIs sur période, tendance,
 *   top produits, répartition par paiement, export CSV. (OT-5)
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, TrendingUp, Lock } from 'lucide-react';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '@wilinwi/types';
import { Card, StatCard, formatFCFA, formatQty } from '@wilinwi/ui';
import { apiGet } from '@/lib/api';
import { useCachedQuery } from '@/lib/use-cached-query';
import { useAuth } from '@/lib/auth-context';

interface Report {
  from: string;
  to: string;
  chiffreAffaires: number;
  nombreVentes: number;
  articlesVendus: number;
  panierMoyen: number;
  benefice?: number;
  serie: { date: string; ca: number; ventes: number }[];
  topProduits: { nom: string; quantite: number; ca: number }[];
  parPaiement: { methode: string; montant: number; ventes: number }[];
}

type Period = '7' | '30' | 'month' | 'custom';

const ymd = (d: Date) => d.toISOString().slice(0, 10);

export default function RapportsPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const range = useMemo(() => {
    const today = new Date();
    const to = ymd(today);
    if (period === '7') {
      const f = new Date(today);
      f.setDate(f.getDate() - 6);
      return { from: ymd(f), to };
    }
    if (period === 'month') {
      const f = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: ymd(f), to };
    }
    if (period === 'custom') {
      return { from: customFrom, to: customTo };
    }
    const f = new Date(today);
    f.setDate(f.getDate() - 29);
    return { from: ymd(f), to };
  }, [period, customFrom, customTo]);

  const valid = !!range.from && !!range.to;
  const qs = valid ? `?from=${range.from}&to=${range.to}` : '';

  const { data, loading, error } = useCachedQuery<Report>(
    valid ? `analytics/report${qs}` : null,
    () => apiGet<Report>(`/api/analytics/report${qs}`),
  );

  const maxCa = useMemo(
    () => (data ? Math.max(1, ...data.serie.map((s) => s.ca)) : 1),
    [data],
  );

  function exportCSV() {
    if (!data) return;
    const rows = [
      ['Date', 'Chiffre affaires (FCFA)', 'Ventes'],
      ...data.serie.map((s) => [s.date, String(s.ca), String(s.ventes)]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport_${range.from}_${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const periods: { key: Period; label: string }[] = [
    { key: '7', label: '7 jours' },
    { key: '30', label: '30 jours' },
    { key: 'month', label: 'Ce mois' },
    { key: 'custom', label: 'Personnalisé' },
  ];

  // Relance d'impayé : à J+3+, les rapports avancés (et l'export) sont suspendus.
  // Le tableau de bord de base reste accessible.
  if (user?.dunning.suspendNonVital) {
    return (
      <div>
        <Link
          href="/dashboard"
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4" /> Tableau de bord
        </Link>
        <Card className="mt-4 flex flex-col items-center gap-3 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-warning/10 text-warning">
            <Lock className="h-7 w-7" />
          </span>
          <h1 className="font-display text-xl font-bold text-text-primary">Rapports avancés suspendus</h1>
          <p className="max-w-sm text-sm text-text-secondary">
            Votre abonnement est impayé. Les rapports avancés et les exports sont temporairement
            suspendus. Le tableau de bord reste accessible. Régularisez pour tout réactiver.
          </p>
          <Link
            href="/parametres"
            className="mt-1 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            Régulariser l'abonnement
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/dashboard"
        className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand"
      >
        <ArrowLeft className="h-4 w-4" /> Tableau de bord
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-brand">
          <TrendingUp className="h-6 w-6" /> Rapports
        </h1>
        <button
          onClick={exportCSV}
          disabled={!data || data.serie.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Exporter CSV
        </button>
      </div>

      {/* Sélecteur de période */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              period === p.key
                ? 'border-brand bg-brand text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {p.label}
          </button>
        ))}
        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-brand"
            />
            <span className="text-slate-400">→</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-brand"
            />
          </div>
        )}
      </div>

      {error && !data && <p className="mt-6 text-sm text-red-600">{error.message}</p>}
      {!valid && period === 'custom' && (
        <p className="mt-6 text-sm text-slate-400">Choisissez une date de début et de fin.</p>
      )}
      {valid && (loading || !data) && (
        <p className="mt-6 text-sm text-slate-400">Chargement du rapport…</p>
      )}

      {data && (
        <>
          {/* KPIs */}
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Chiffre d'affaires" value={formatFCFA(data.chiffreAffaires)} accent="brand" />
            <StatCard label="Ventes" value={formatQty(data.nombreVentes)} accent="emerald" />
            <StatCard label="Panier moyen" value={formatFCFA(data.panierMoyen)} accent="gold" />
            {data.benefice !== undefined ? (
              <StatCard label="Bénéfice (marge)" value={formatFCFA(data.benefice)} accent="emerald" />
            ) : (
              <StatCard label="Articles vendus" value={formatQty(data.articlesVendus)} accent="brand" />
            )}
          </div>

          {/* Tendance (barres CSS) */}
          <Card className="mt-6 p-5">
            <h2 className="mb-4 font-display text-lg font-semibold text-slate-900">
              Tendance des ventes
            </h2>
            {data.serie.length === 0 ? (
              <p className="text-sm text-slate-400">Aucune vente sur la période.</p>
            ) : (
              <div className="flex h-40 items-end gap-1 overflow-x-auto">
                {data.serie.map((s) => (
                  <div key={s.date} className="flex min-w-[10px] flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-brand/80 transition-all hover:bg-brand"
                      style={{ height: `${Math.max(2, (s.ca / maxCa) * 100)}%` }}
                      title={`${s.date} · ${formatFCFA(s.ca)} · ${s.ventes} vente(s)`}
                    />
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-center text-xs text-slate-400">
              Du {new Date(data.from).toLocaleDateString('fr-FR')} au{' '}
              {new Date(data.to).toLocaleDateString('fr-FR')}
            </p>
          </Card>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top produits */}
            <Card className="p-5">
              <h2 className="mb-4 font-display text-lg font-semibold text-slate-900">
                Top produits
              </h2>
              {data.topProduits.length === 0 ? (
                <p className="text-sm text-slate-400">—</p>
              ) : (
                <ul className="space-y-2">
                  {data.topProduits.map((p, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="truncate text-slate-700">
                        <span className="mr-2 text-slate-400">{i + 1}.</span>
                        {p.nom}
                      </span>
                      <span className="shrink-0 text-slate-500">
                        <span className="tabular font-medium text-slate-800">{formatQty(p.quantite)}</span> ·{' '}
                        <span className="tabular">{formatFCFA(p.ca)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Répartition par paiement */}
            <Card className="p-5">
              <h2 className="mb-4 font-display text-lg font-semibold text-slate-900">
                Par mode de paiement
              </h2>
              {data.parPaiement.length === 0 ? (
                <p className="text-sm text-slate-400">—</p>
              ) : (
                <ul className="space-y-2">
                  {data.parPaiement
                    .slice()
                    .sort((a, b) => b.montant - a.montant)
                    .map((p) => (
                      <li key={p.methode} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">
                          {PAYMENT_METHOD_LABELS[p.methode as PaymentMethod] ?? p.methode}
                        </span>
                        <span className="shrink-0 text-slate-500">
                          <span className="tabular font-medium text-slate-800">
                            {formatFCFA(p.montant)}
                          </span>{' '}
                          · {p.ventes}
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
