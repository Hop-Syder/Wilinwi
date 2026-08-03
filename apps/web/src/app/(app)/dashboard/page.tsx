/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Tableau de bord principal Wilinwi (Architecture 5 Axes : TopBar, Hero KPIs, DataViz, Trésorerie & Ergonomie)
 * @created 2026-06-20
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  DollarSign,
  CreditCard,
  Store,
  Wifi,
  WifiOff,
  ShoppingBag,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiGet, apiPost } from '@/lib/api';
import { useCachedQuery } from '@/lib/use-cached-query';
import { useSync } from '@/lib/use-sync';
import { ContextualHelp } from '@/components/contextual-help';
import type { TourStep } from '@/components/tour-guide';
import { PeriodSelector, PeriodPreset } from '@/components/dashboard/period-selector';
import { HeadsUpBanner } from '@/components/dashboard/heads-up-banner';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { HybridSalesChart } from '@/components/dashboard/hybrid-sales-chart';
import { PaymentDonutChart } from '@/components/dashboard/payment-donut-chart';
import { TopProductsList } from '@/components/dashboard/top-products-list';
import { TreasuryWidget } from '@/components/dashboard/treasury-widget';
import { QuickActionsBar } from '@/components/dashboard/quick-actions-bar';
import { DashboardSkeletonGrid } from '@/components/dashboard/dashboard-skeletons';

interface ReportResponse {
  from: string;
  to: string;
  prevFrom?: string;
  prevTo?: string;
  chiffreAffaires: number;
  chiffreAffairesPrev?: number;
  variationCaPercent?: number;
  sparklineCa?: number[];

  nombreVentes: number;
  articlesVendus: number;
  panierMoyen: number;
  panierMoyenPrev?: number;
  variationPanierMoyenPercent?: number;
  sparklinePanierMoyen?: number[];

  creditsEncours?: number;
  variationCreditsPercent?: number;
  totalDepenses: number;

  benefice?: number;
  beneficePrev?: number;
  variationBeneficePercent?: number;
  sparklineBenefice?: number[];

  serie: {
    date: string;
    ca: number;
    benefice?: number;
    ventes: number;
    depenses: number;
  }[];

  topProduits: {
    id: string;
    nom: string;
    categorie?: string;
    quantite: number;
    ca: number;
    contributionCaPercent?: number;
  }[];

  parPaiement: {
    methode: string;
    label: string;
    color?: string;
    montant: number;
    pourcentage: number;
    ventes: number;
    isCredit?: boolean;
  }[];

  soldesTresorerie?: {
    fondDeCaisse: number;
    mobileMoney: number;
    banque: number;
    total: number;
  };

  alertes?: {
    ruptures?: { id: string; nom: string; stock: number }[];
    dettesEchuesCount?: number;
    clientsEnDetteCount?: number;
  };
}

const ymd = (d: Date) => {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isGlobalView = user?.etablissementId === 'ALL';
  const activeEtablissementName = isGlobalView
    ? 'Tous les établissements'
    : user?.etablissements.find((etablissement) => etablissement.id === user?.etablissementId)?.nom ?? 'Établissement actif';
  const canSeeProfit = user?.role === 'OWNER' || user?.role === 'MANAGER';

  // Hook Réseau & Synchronisation Hors-ligne
  const { state: syncState, pending: pendingCount } = useSync();

  // Axe 1 : Contrôle du contexte temporel & comparaison
  const [preset, setPreset] = useState<PeriodPreset>('last7');
  const [compare, setCompare] = useState<boolean>(true);
  const [customFrom, setCustomFrom] = useState<string>(ymd(new Date(Date.now() - 7 * 86400000)));
  const [customTo, setCustomTo] = useState<string>(ymd(new Date()));

  // Modale Dépense Rapide
  const [expenseModalOpen, setExpenseModalOpen] = useState<boolean>(false);
  const [expenseMontant, setExpenseMontant] = useState<string>('');
  const [expenseMotif, setExpenseMotif] = useState<string>('');
  const [expenseSubmitting, setExpenseSubmitting] = useState<boolean>(false);

  // Calcul dynamique des bornes temporelles
  const dateRange = useMemo(() => {
    const today = new Date();
    let from = new Date(today);

    if (preset === 'today') {
      from = new Date(today);
    } else if (preset === 'yesterday') {
      from.setDate(today.getDate() - 1);
      return { from: ymd(from), to: ymd(from) };
    } else if (preset === 'last7') {
      from.setDate(today.getDate() - 6);
    } else if (preset === 'thisMonth') {
      from = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (preset === 'custom') {
      return { from: customFrom || ymd(from), to: customTo || ymd(today) };
    }

    return { from: ymd(from), to: ymd(today) };
  }, [preset, customFrom, customTo]);

  // Requête réactive des métriques analytics
  const queryKey = `analytics/report?from=${dateRange.from}&to=${dateRange.to}&compare=${compare}`;
  const { data: report, loading, error, refetch } = useCachedQuery<ReportResponse>(
    queryKey,
    () => apiGet<ReportResponse>(`/api/analytics/report?from=${dateRange.from}&to=${dateRange.to}&compare=${compare}`),
  );

  // Soumission de la dépense rapide
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const montant = parseInt(expenseMontant, 10);
    if (isNaN(montant) || montant <= 0 || !expenseMotif.trim()) return;

    setExpenseSubmitting(true);
    try {
      await apiPost('/api/treasury/expenses', {
        compte: 'CAISSE',
        montant,
        categorie: 'AUTRE',
        note: expenseMotif.trim(),
      });
      setExpenseModalOpen(false);
      setExpenseMontant('');
      setExpenseMotif('');
      void refetch();
    } catch (err) {
      console.error('Erreur enregistrement dépense:', err);
    } finally {
      setExpenseSubmitting(false);
    }
  };

  const tourSteps: TourStep[] = [
    {
      targetId: 'tour-dashboard-stats',
      title: 'Hero KPIs & Variations',
      content:
        'Suivez en temps réel le chiffre d\'affaires brut, la marge brute estimée, le panier moyen et les crédits en encours.',
      position: 'bottom',
    },
    {
      targetId: 'tour-dashboard-charts',
      title: 'Visualisation de données (DataViz)',
      content:
        'Analysez le volume de vente et la rentabilité sur le graphique hybride, la répartition des règlements et le Top 5 produits.',
      position: 'top',
    },
  ];

  const dashboardUseCases = [
    {
      title: 'Analyser les tendances de vente',
      description: 'Choisissez la période souhaitée et cochez "vs période précédente" pour mesurer votre croissance relative.',
    },
    {
      title: 'Suivre la rentabilité et les crédits',
      description: 'Consultez la marge brute estimée et surveillez le montant global des crédits clients en encours.',
    },
    {
      title: 'Actionner les opérations courantes',
      description: 'Utilisez la barre d\'actions rapides pour passer au POS, saisir une dépense ou clôturer la caisse.',
    },
  ];

  const isOnline = syncState !== 'offline';

  return (
    <div className="space-y-6 pb-12">
      {/* ── AXE 1 : Top Bar & Contexte Temporel / Réseau ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-extrabold text-slate-900 tracking-tight">
              Tableau de bord
            </h1>

            {/* Badge de boutique active */}
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 border border-slate-200">
              <Store className="h-3.5 w-3.5 text-slate-500" />
              <span>{activeEtablissementName}</span>
            </span>

            {/* Statut Réseau / Synchro Hors-ligne */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-bold border ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                  : 'bg-amber-50 text-amber-800 border-amber-200/60'
              }`}
            >
              {isOnline ? (
                <Wifi className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 text-amber-600" />
              )}
              <span>
                {isOnline
                  ? `En ligne — ${pendingCount} vente${pendingCount > 1 ? 's' : ''} en attente`
                  : `Hors-ligne — ${pendingCount} vente${pendingCount > 1 ? 's' : ''} locale${pendingCount > 1 ? 's' : ''}`}
              </span>
            </span>
          </div>

          <p className="mt-1 text-xs font-medium text-slate-500">
            Période : <strong className="text-slate-800">{dateRange.from}</strong> au{' '}
            <strong className="text-slate-800">{dateRange.to}</strong>
          </p>
        </div>

        {/* Contrôles dynamiques de la période */}
        <div className="flex items-center gap-3">
          <PeriodSelector
            preset={preset}
            compare={compare}
            onPresetChange={setPreset}
            onCompareToggle={setCompare}
            customFrom={customFrom}
            customTo={customTo}
            onCustomDateChange={(f, t) => {
              setCustomFrom(f);
              setCustomTo(t);
            }}
            isRefreshing={loading}
            onRefresh={() => void refetch()}
          />
          <ContextualHelp
            storageKey="wilinwi_dashboard_tour_done"
            tourSteps={tourSteps}
            useCases={dashboardUseCases}
          />
        </div>
      </div>

      {/* ── AXE 1 (Suite) : Heads-Up Operational Alert Banner ── */}
      {report?.alertes && <HeadsUpBanner alerts={report.alertes} />}

      {/* Chargement Skeleton progressif */}
      {loading && !report ? (
        <DashboardSkeletonGrid />
      ) : error && !report ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800 space-y-2">
          <p className="font-bold text-sm">Erreur lors de la récupération des données analytics.</p>
          <p className="text-xs">{error.message}</p>
        </div>
      ) : (
        <>
          {/* ── AXE 2 : Section Hero KPIs (4 Cartes prioritaires) ── */}
          <div id="tour-dashboard-stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Chiffre d'Affaires Brut */}
            <KpiCard
              title="Chiffre d'Affaires Brut"
              value={report?.chiffreAffaires ?? 0}
              isCurrency={true}
              variationPercent={report?.variationCaPercent ?? 0}
              compareActive={compare}
              sparklineData={report?.sparklineCa}
              subtext={`${report?.nombreVentes ?? 0} vente${(report?.nombreVentes ?? 0) > 1 ? 's' : ''} enregistrée${(report?.nombreVentes ?? 0) > 1 ? 's' : ''}`}
              icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
              variant="emerald"
            />

            {/* 2. Marge Brute Estimée */}
            <KpiCard
              title="Marge Brute Estimée"
              value={report?.benefice ?? 0}
              isCurrency={true}
              variationPercent={report?.variationBeneficePercent ?? 0}
              compareActive={compare}
              sparklineData={report?.sparklineBenefice}
              subtext="Marge réelle nette calculée"
              icon={<TrendingUp className="h-5 w-5 text-amber-600" />}
              variant="amber"
              sensitive={!canSeeProfit}
            />

            {/* 3. Panier Moyen */}
            <KpiCard
              title="Panier Moyen"
              value={report?.panierMoyen ?? 0}
              isCurrency={true}
              variationPercent={report?.variationPanierMoyenPercent ?? 0}
              compareActive={compare}
              sparklineData={report?.sparklinePanierMoyen}
              subtext={`${report?.articlesVendus ?? 0} article${(report?.articlesVendus ?? 0) > 1 ? 's' : ''} écoulé${(report?.articlesVendus ?? 0) > 1 ? 's' : ''}`}
              icon={<ShoppingBag className="h-5 w-5 text-blue-600" />}
              variant="indigo"
            />

            {/* 4. Crédits Clients en Encours */}
            <KpiCard
              title="Crédits Clients Encours"
              value={report?.creditsEncours ?? 0}
              isCurrency={true}
              variationPercent={report?.variationCreditsPercent ?? 0}
              compareActive={compare}
              subtext={`${report?.alertes?.clientsEnDetteCount ?? 0} client${(report?.alertes?.clientsEnDetteCount ?? 0) > 1 ? 's' : ''} avec créances`}
              icon={<CreditCard className="h-5 w-5 text-rose-600" />}
              variant="rose"
            />
          </div>

          {/* ── AXE 4 : Actions Rapides ── */}
          <QuickActionsBar
            onOpenExpenseModal={() => setExpenseModalOpen(true)}
            onOpenCloseSessionModal={() => router.push('/pos')}
            onPrintZReport={() => router.push('/tresorerie')}
          />

          {/* ── AXE 3 : Visualisation de Données (Data Viz) ── */}
          <div id="tour-dashboard-charts" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Graphique Hybride Ventes vs Marge (2 colonnes) */}
            <div className="lg:col-span-2">
              <HybridSalesChart data={report?.serie ?? []} canSeeProfit={canSeeProfit} />
            </div>

            {/* Répartition des Règlements (Donut Chart - 1 colonne) */}
            <div>
              <PaymentDonutChart data={report?.parPaiement ?? []} />
            </div>
          </div>

          {/* Deuxième rangée DataViz & Ergonomie */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Classement Top 5 Produits (1 colonne) */}
            <div>
              <TopProductsList products={report?.topProduits ?? []} />
            </div>

            {/* Trésorerie & Soldes des caisses (2 colonnes) */}
            <div className="lg:col-span-2">
              <TreasuryWidget balances={report?.soldesTresorerie} />
            </div>
          </div>
        </>
      )}

      {/* Modal d'enregistrement Rapide de Dépense */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-rose-600" />
                <span>Enregistrer une Dépense</span>
              </h3>
              <button
                type="button"
                onClick={() => setExpenseModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Montant de la dépense (FCFA)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Ex: 5000"
                  value={expenseMontant}
                  onChange={(e) => setExpenseMontant(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Motif / Description de la dépense
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Ex: Achat de fourniture de caisse, transport..."
                  value={expenseMotif}
                  onChange={(e) => setExpenseMotif(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExpenseModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={expenseSubmitting}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
                >
                  {expenseSubmitting ? 'Enregistrement...' : 'Valider la Dépense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
