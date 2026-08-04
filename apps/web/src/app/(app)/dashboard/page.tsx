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
import { TrendingUp, DollarSign, CreditCard } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiGet, apiPost } from '@/lib/api';
import { useCachedQuery } from '@/lib/use-cached-query';
import { useSync } from '@/lib/use-sync';
import type { TourStep } from '@/components/tour-guide';
import { PeriodPreset } from '@/components/dashboard/period-selector';
import { HeadsUpBanner } from '@/components/dashboard/heads-up-banner';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { HybridSalesChart } from '@/components/dashboard/hybrid-sales-chart';
import { PaymentDonutChart } from '@/components/dashboard/payment-donut-chart';
import { TopProductsList } from '@/components/dashboard/top-products-list';
import { TreasuryWidget } from '@/components/dashboard/treasury-widget';
import { QuickActionsBar } from '@/components/dashboard/quick-actions-bar';
import { DashboardSkeletonGrid } from '@/components/dashboard/dashboard-skeletons';
import { PosCloseSessionModal } from '@/components/pos-close-session-modal';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardExpenseModal } from '@/components/dashboard/dashboard-expense-modal';
import type { DashboardReportResponse } from '@/types/dashboard';

const ymd = (d: Date) => {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const isGlobalView = user?.etablissementId === 'ALL';
  const activeEtablissementName = isGlobalView
    ? 'Tous les établissements'
    : user?.etablissements.find((etablissement) => etablissement.id === user?.etablissementId)?.nom ?? 'Établissement actif';
  const canSeeProfit = user?.role === 'OWNER' || user?.role === 'MANAGER';

  const { state: syncState, pending: pendingCount } = useSync();

  // Contrôle du contexte temporel
  const [preset, setPreset] = useState<PeriodPreset>('last7');
  const [compare, setCompare] = useState<boolean>(true);
  const [customFrom, setCustomFrom] = useState<string>(ymd(new Date(Date.now() - 7 * 86400000)));
  const [customTo, setCustomTo] = useState<string>(ymd(new Date()));

  // Modales
  const [expenseModalOpen, setExpenseModalOpen] = useState<boolean>(false);
  const [expenseMontant, setExpenseMontant] = useState<string>('');
  const [expenseMotif, setExpenseMotif] = useState<string>('');
  const [expenseSubmitting, setExpenseSubmitting] = useState<boolean>(false);
  const [closeSessionModalOpen, setCloseSessionModalOpen] = useState(false);

  // Calcul dynamique des bornes temporelles
  const dateRange = useMemo(() => {
    const now = new Date();
    if (preset === 'today') return { from: ymd(now), to: ymd(now) };
    if (preset === 'yesterday') {
      const y = new Date(now.getTime() - 86400000);
      return { from: ymd(y), to: ymd(y) };
    }
    if (preset === 'last7') {
      const f = new Date(now.getTime() - 6 * 86400000);
      return { from: ymd(f), to: ymd(now) };
    }
    if (preset === 'thisMonth') {
      const f = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: ymd(f), to: ymd(now) };
    }
    return { from: customFrom, to: customTo };
  }, [preset, customFrom, customTo]);

  // Requête API Analytics
  const queryParams = new URLSearchParams({
    from: dateRange.from,
    to: dateRange.to,
    compare: compare ? 'true' : 'false',
  });
  if (user?.etablissementId && user.etablissementId !== 'ALL') {
    queryParams.set('etablissementId', user.etablissementId);
  }

  const { data: report, loading, error, refetch } = useCachedQuery<DashboardReportResponse>(
    `analytics/reports/dashboard-${queryParams.toString()}`,
    () => apiGet<DashboardReportResponse>(`/api/analytics/reports/dashboard?${queryParams.toString()}`),
  );

  const handleExpenseSubmit = async (e: React.FormEvent) => {
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
      content: 'Suivez en temps réel le chiffre d\'affaires brut, la marge brute estimée, le panier moyen et les crédits en encours.',
      position: 'bottom',
    },
    {
      targetId: 'tour-dashboard-charts',
      title: 'Visualisation de données (DataViz)',
      content: 'Analysez le volume de vente et la rentabilité sur le graphique hybride, la répartition des règlements et le Top 5 produits.',
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
      {/* En-tête Unifié du Dashboard */}
      <DashboardHeader
        activeEtablissementName={activeEtablissementName}
        isOnline={isOnline}
        pendingCount={pendingCount}
        dateRange={dateRange}
        preset={preset}
        compare={compare}
        customFrom={customFrom}
        customTo={customTo}
        loading={loading}
        onPresetChange={setPreset}
        onCompareToggle={setCompare}
        onCustomDateChange={(f, t) => {
          setCustomFrom(f);
          setCustomTo(t);
        }}
        onRefresh={() => void refetch()}
        tourSteps={tourSteps}
        dashboardUseCases={dashboardUseCases}
      />

      {/* Bandeau d'Alertes Opérationnelles */}
      {report?.alertes && <HeadsUpBanner alerts={report.alertes} />}

      {/* Skeletons ou Erreur */}
      {loading && !report ? (
        <DashboardSkeletonGrid />
      ) : error && !report ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800 space-y-2">
          <p className="font-bold text-sm">Erreur lors de la récupération des données analytics.</p>
          <p className="text-xs">{error.message}</p>
        </div>
      ) : (
        <>
          {/* Section Hero KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-stretch" id="tour-dashboard-stats">
            <KpiCard
              title="Chiffre d'Affaires Brut"
              value={report?.chiffreAffaires ?? 0}
              variationPercent={report?.variationCaPercent}
              previousValue={report?.chiffreAffairesPrev}
              compareActive={compare}
              subtext={compare ? 'vs période précédente' : 'Période courante'}
              icon={<TrendingUp className="h-4 w-4" />}
              sparklineData={report?.sparklineCa}
              variant="emerald"
            />

            {canSeeProfit ? (
              <KpiCard
                title="Marge Brute Estimée"
                value={report?.benefice ?? 0}
                variationPercent={report?.variationBeneficePercent}
                previousValue={report?.beneficePrev}
                compareActive={compare}
                subtext={compare ? 'vs période précédente' : 'Période courante'}
                icon={<DollarSign className="h-4 w-4" />}
                sparklineData={report?.sparklineBenefice}
                variant="indigo"
              />
            ) : (
              <KpiCard
                title="Nombre de Ventes"
                value={report?.nombreVentes ?? 0}
                compareActive={compare}
                subtext={`${report?.articlesVendus ?? 0} article(s) vendus`}
                icon={<TrendingUp className="h-4 w-4" />}
                variant="indigo"
              />
            )}

            <KpiCard
              title="Panier Moyen"
              value={report?.panierMoyen ?? 0}
              variationPercent={report?.variationPanierMoyenPercent}
              previousValue={report?.panierMoyenPrev}
              compareActive={compare}
              subtext={`${report?.nombreVentes ?? 0} transaction(s)`}
              icon={<CreditCard className="h-4 w-4" />}
              sparklineData={report?.sparklinePanierMoyen}
              variant="emerald"
            />

            <KpiCard
              title="Crédits & Dettes Clients"
              value={report?.creditsEncours ?? 0}
              variationPercent={report?.variationCreditsPercent}
              compareActive={compare}
              subtext={`${report?.alertes?.clientsEnDetteCount ?? 0} client(s) en dette`}
              icon={<CreditCard className="h-4 w-4" />}
              variant="amber"
            />
          </div>

          {/* Section 1 : Graphiques Côte à Côte (Hauteurs Égales Exactes) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-stretch" id="tour-dashboard-charts">
            <div className="lg:col-span-2 flex flex-col">
              <HybridSalesChart data={report?.serie ?? []} canSeeProfit={canSeeProfit} compareActive={compare} />
            </div>

            <div className="lg:col-span-1 flex flex-col">
              <PaymentDonutChart data={report?.parPaiement ?? []} />
            </div>
          </div>

          {/* Section 2 : Trésorerie & Solde des Caisses */}
          <div>
            <TreasuryWidget balances={report?.soldesTresorerie} />
          </div>

          {/* Section 3 : Top 5 Meilleures Ventes & Actions Rapides (Même Ligne sur Desktop) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-stretch">
            <div className="flex flex-col">
              <TopProductsList products={report?.topProduits ?? []} />
            </div>

            <div className="flex flex-col">
              <QuickActionsBar
                onOpenExpenseModal={() => setExpenseModalOpen(true)}
                onOpenCloseSessionModal={() => setCloseSessionModalOpen(true)}
              />
            </div>
          </div>
        </>
      )}

      {/* Modales */}
      <DashboardExpenseModal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        montant={expenseMontant}
        motif={expenseMotif}
        submitting={expenseSubmitting}
        onMontantChange={setExpenseMontant}
        onMotifChange={setExpenseMotif}
        onSubmit={handleExpenseSubmit}
      />

      {closeSessionModalOpen && (
        <PosCloseSessionModal
          isOpen={closeSessionModalOpen}
          onClose={() => setCloseSessionModalOpen(false)}
        />
      )}
    </div>
  );
}
