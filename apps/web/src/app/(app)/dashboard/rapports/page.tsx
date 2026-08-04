'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Rapports historiques (Analytics) : KPIs sur période, tendance,
 *   top produits, répartition par paiement, export CSV. (OT-5)
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, TrendingUp, Lock, Receipt, Wallet, PiggyBank, Package, ShoppingBasket } from 'lucide-react';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '@wilinwi/types';
import { Card, formatFCFA, formatQty } from '@wilinwi/ui';
import { apiGet } from '@/lib/api';
import { useCachedQuery } from '@/lib/use-cached-query';
import { useAuth } from '@/lib/auth-context';
import { ContextualHelp } from '@/components/contextual-help';
import { PaymentDonutChart, type PaymentItem } from '@/components/dashboard/payment-donut-chart';
import type { TourStep } from '@/components/tour-guide';

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

/** Compteur animé (600 ms, easing cubique) — désactivé si `prefers-reduced-motion`. */
function useCountUp(target: number): number {
  const [value, setValue] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      prev.current = target;
      setValue(target);
      return;
    }
    const from = prev.current;
    prev.current = target;
    const start = performance.now();
    const dur = 600;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return value;
}

/** Mini-KPI intégré à la carte Tendance (texte en encre, pastille de couleur). */
function KpiInline({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 leading-tight">
        <div className="truncate text-[11px] font-medium text-slate-400">{label}</div>
        <div className="tabular truncate text-sm font-bold text-slate-900">{value}</div>
      </div>
    </div>
  );
}

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
  const avgCa = useMemo(
    () =>
      data && data.serie.length > 0
        ? Math.round(data.serie.reduce((sum, s) => sum + s.ca, 0) / data.serie.length)
        : 0,
    [data],
  );
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const hovered = hoverIdx !== null ? data?.serie[hoverIdx] : null;

  // Compteurs animés des KPI intégrés à la carte Tendance.
  const caAnime = useCountUp(data?.chiffreAffaires ?? 0);
  const ventesAnime = useCountUp(data?.nombreVentes ?? 0);
  const panierAnime = useCountUp(data?.panierMoyen ?? 0);
  const margeAnime = useCountUp(data?.benefice ?? data?.articlesVendus ?? 0);

  // Périmètre du rapport : vue globale (tous les établissements) ou boutique courante.
  const isGlobalView = user?.etablissementId === null && (user?.etablissements?.length ?? 0) > 1;
  const scopeLabel = isGlobalView
    ? 'Vue globale — tous les établissements'
    : user?.etablissements?.find((e) => e.id === user.etablissementId)?.nom ?? '';

  // Donut « Top produits » : top 5 (part du CA)
  const topItems: PaymentItem[] = useMemo(() => {
    if (!data) return [];
    const totalCa = data.topProduits.reduce((sum, p) => sum + p.ca, 0);
    return data.topProduits.slice(0, 5).map((p) => ({
      methode: p.nom,
      label: p.nom,
      montant: p.ca,
      pourcentage: totalCa > 0 ? Math.round((p.ca / totalCa) * 100) : 0,
      ventes: p.quantite,
    }));
  }, [data]);

  // Donut « Par mode de paiement » (part du montant encaissé).
  const paymentItems: PaymentItem[] = useMemo(() => {
    if (!data) return [];
    const totalMontant = data.parPaiement.reduce((sum, p) => sum + p.montant, 0);
    return data.parPaiement.map((p) => ({
      methode: p.methode,
      label: PAYMENT_METHOD_LABELS[p.methode as PaymentMethod] ?? p.methode,
      montant: p.montant,
      pourcentage: totalMontant > 0 ? Math.round((p.montant / totalMontant) * 100) : 0,
      ventes: p.ventes,
      isCredit: p.methode === 'CREDIT',
    }));
  }, [data]);

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

  const tourSteps: TourStep[] = [
    {
      targetId: 'tour-rapports-period',
      title: 'Choisissez la période',
      content: 'Comparez vos performances sur 7 jours, 30 jours, le mois en cours ou une plage de dates personnalisée.',
      position: 'bottom',
    },
    {
      targetId: 'tour-rapports-tendance',
      title: 'Tendance et détails',
      content: 'Visualisez l\'évolution du chiffre d\'affaires jour par jour, le top des produits vendus et la répartition par mode de paiement.',
      position: 'top',
    },
  ];

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
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-brand">
            <TrendingUp className="h-6 w-6" /> Rapports
          </h1>
          {scopeLabel && (
            <p className="mt-0.5 text-sm font-medium text-slate-500">
              Rapport détaillé · <span className={isGlobalView ? 'text-brand font-semibold' : ''}>{scopeLabel}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ContextualHelp
            storageKey="wilinwi_rapports_tour_done"
            tourSteps={tourSteps}
            useCases={[
              { title: 'Bénéfice (marge)', description: 'Si vous avez accès au coût d\'achat, le bénéfice net remplace le nombre d\'articles vendus dans les KPIs.' },
              { title: 'Export CSV', description: 'Exportez la série quotidienne du chiffre d\'affaires pour l\'analyser ailleurs (tableur, comptabilité).' },
              { title: 'Suspension pour impayé', description: 'En cas d\'abonnement impayé, les rapports avancés et l\'export sont suspendus jusqu\'à régularisation.' },
            ]}
          />
          <button
            onClick={exportCSV}
            disabled={!data || data.serie.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Exporter CSV
          </button>
        </div>
      </div>

      {/* Sélecteur de période */}
      <div id="tour-rapports-period" className="mt-4 flex flex-wrap items-center gap-2">
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
          {/* Tendance des ventes : KPI intégrés + barres animées + moyenne + lecture au survol */}
          <Card id="tour-rapports-tendance" className="mt-6 p-5">
            <style>{`@keyframes wl-bar-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }`}</style>

            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-lg font-semibold text-slate-900">
                Tendance des ventes
              </h2>
              {/* Lecture au survol : détail du jour pointé, sinon moyenne de la période. */}
              <p className="tabular text-xs font-medium text-slate-500">
                {hovered ? (
                  <>
                    <span className="font-bold text-brand">
                      {new Date(hovered.date).toLocaleDateString('fr-FR', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>{' '}
                    · {formatFCFA(hovered.ca)} · {hovered.ventes} vente(s)
                  </>
                ) : (
                  <>Moyenne : {formatFCFA(avgCa)}/jour</>
                )}
              </p>
            </div>

            {/* KPI de la période (compteurs animés) */}
            <div className="mb-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
              <KpiInline icon={Wallet} label="Chiffre d'affaires" value={formatFCFA(caAnime)} tone="bg-brand/10 text-brand" />
              <KpiInline icon={Receipt} label="Ventes" value={formatQty(ventesAnime)} tone="bg-emerald-100 text-emerald-600" />
              <KpiInline icon={ShoppingBasket} label="Panier moyen" value={formatFCFA(panierAnime)} tone="bg-gold/10 text-gold-700" />
              {data.benefice !== undefined ? (
                <KpiInline icon={PiggyBank} label="Bénéfice (marge)" value={formatFCFA(margeAnime)} tone="bg-emerald-100 text-emerald-600" />
              ) : (
                <KpiInline icon={Package} label="Articles vendus" value={formatQty(margeAnime)} tone="bg-brand/10 text-brand" />
              )}
            </div>

            {data.serie.length === 0 ? (
              <p className="text-sm text-slate-400">Aucune vente sur la période.</p>
            ) : (
              <div className="relative" onMouseLeave={() => setHoverIdx(null)}>
                {/* Ligne de moyenne (repère, or) */}
                {avgCa > 0 && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-gold/70"
                    style={{ bottom: `${Math.min(96, (avgCa / maxCa) * 100)}%` }}
                  >
                    <span className="absolute right-0 -top-4 rounded bg-gold/10 px-1.5 py-0.5 text-[10px] font-semibold text-gold-700">
                      moy.
                    </span>
                  </div>
                )}

                {/* h-full + justify-end sur chaque colonne : sans hauteur définie sur le
                    parent, les hauteurs en % des barres se résolvaient à 0 (invisibles). */}
                <div className="flex h-44 items-stretch gap-1 overflow-x-auto">
                  {data.serie.map((s, i) => (
                    <div
                      key={s.date}
                      onMouseEnter={() => setHoverIdx(i)}
                      className="flex h-full min-w-[10px] flex-1 cursor-pointer flex-col items-center justify-end"
                      title={`${s.date} · ${formatFCFA(s.ca)} · ${s.ventes} vente(s)`}
                    >
                      <div
                        className="w-full origin-bottom rounded-t bg-gradient-to-t from-brand to-brand/50 transition-opacity duration-150 motion-reduce:!animate-none"
                        style={{
                          height: `${Math.max(2, (s.ca / maxCa) * 100)}%`,
                          animation: 'wl-bar-grow 0.5s ease-out both',
                          animationDelay: `${Math.min(i * 25, 900)}ms`,
                          opacity: hoverIdx === null || hoverIdx === i ? 1 : 0.35,
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* Axe des dates (début / fin) */}
                <div className="mt-1.5 flex justify-between text-[10px] font-medium text-slate-400">
                  <span>{new Date(data.from).toLocaleDateString('fr-FR')}</span>
                  <span>{new Date(data.to).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
            )}
          </Card>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top produits */}
            <Card className="p-5">
              <h2 className="mb-4 font-display text-lg font-semibold text-slate-900">
                Top produits
              </h2>
              {topItems.length === 0 ? (
                <p className="text-sm text-slate-400">—</p>
              ) : (
                <PaymentDonutChart data={topItems} />
              )}
            </Card>

            {/* Par mode de paiement */}
            <Card className="p-5">
              <h2 className="mb-4 font-display text-lg font-semibold text-slate-900">
                Par mode de paiement
              </h2>
              {paymentItems.length === 0 ? (
                <p className="text-sm text-slate-400">—</p>
              ) : (
                <PaymentDonutChart data={paymentItems} />
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
