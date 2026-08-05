/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page Ventes — Vue globale multi-boutiques et gestion des transactions (Clean Architecture refactored)
 * @created 2026-06-20
 * @updated 2026-08-04
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, Store } from 'lucide-react';
import { PAYMENT_METHOD_LABELS, type ClientDto, type PosSessionDto } from '@wilinwi/types';
import { Button } from '@wilinwi/ui';
import { apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { readCache, writeCache } from '@wilinwi/offline';
import { ReceiptModal } from '@/components/receipt';
import { ReportZPrintModal } from '@/components/report-z-print-modal';
import { ContextualHelp } from '@/components/contextual-help';
import type { TourStep } from '@/components/tour-guide';

import type { Sale } from '@/components/ventes/types';
import { STATUS } from '@/components/ventes/types';
import { VentesKpis } from '@/components/ventes/ventes-kpis';
import { VentesFilters } from '@/components/ventes/ventes-filters';
import { VentesTable } from '@/components/ventes/ventes-table';
import { VentesSessionsTable } from '@/components/ventes/ventes-sessions-table';
import { VenteDetailDrawer } from '@/components/ventes/vente-detail-drawer';
import { VentePaymentModal } from '@/components/ventes/vente-payment-modal';
import { VenteCancelModal } from '@/components/ventes/vente-cancel-modal';

export default function VentesPage() {
  const { user } = useAuth();
  const canCancel = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const isGlobalView = user?.etablissementId === null && (user?.etablissements?.length ?? 0) > 1;

  // State principal
  const [activeTab, setActiveTab] = useState<'SALES' | 'SESSIONS'>('SALES');
  const [sales, setSales] = useState<Sale[]>([]);
  const [sessions, setSessions] = useState<PosSessionDto[]>([]);
  const [clients, setClients] = useState<ClientDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Modales & Drawers
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const [detail, setDetail] = useState<Sale | null>(null);
  const [paymentSale, setPaymentSale] = useState<Sale | null>(null);
  const [cancelSale, setCancelSale] = useState<Sale | null>(null);
  const [reportZSession, setReportZSession] = useState<PosSessionDto | null>(null);

  // Filtres
  const [filterPeriod, setFilterPeriod] = useState<'TODAY' | '7DAYS' | 'MONTH' | 'CUSTOM'>('TODAY');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterClientId, setFilterClientId] = useState('');
  const [filterEtablissementId, setFilterEtablissementId] = useState('');
  const [posSessionIdFilter, setPosSessionIdFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Inputs formulaires
  const [payAmount, setPayAmount] = useState('');
  const [cancelReason, setCancelReason] = useState('Erreur de saisie');

  const tourSteps: TourStep[] = [
    {
      targetId: 'tour-ventes-filters',
      title: 'Recherchez et filtrez',
      content: 'Filtrez par période, statut ou client (et par boutique en vue globale) pour retrouver rapidement une transaction.',
      position: 'bottom',
    },
    {
      targetId: 'tour-ventes-table',
      title: 'Consultez et agissez',
      content: 'Ouvrez le détail d\'une vente pour voir le reçu, encaisser un reste dû ou annuler la transaction si besoin.',
      position: 'top',
    },
  ];

  // Chargement des Ventes
  const fetchSales = async () => {
    setBusy(true);
    setError(null);
    try {
      let from = '';
      let to = '';
      const now = new Date();

      if (filterPeriod === 'TODAY') {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        from = start.toISOString();
      } else if (filterPeriod === '7DAYS') {
        const start = new Date();
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        from = start.toISOString();
      } else if (filterPeriod === 'MONTH') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        from = start.toISOString();
      } else if (filterPeriod === 'CUSTOM') {
        if (customFrom) {
          const start = new Date(customFrom);
          start.setHours(0, 0, 0, 0);
          from = start.toISOString();
        }
        if (customTo) {
          const end = new Date(customTo);
          end.setHours(23, 59, 59, 999);
          to = end.toISOString();
        }
      }

      const params = new URLSearchParams();
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      if (filterStatus !== 'ALL') params.append('status', filterStatus);
      if (posSessionIdFilter) params.append('posSessionId', posSessionIdFilter);
      if (!isGlobalView && filterClientId) params.append('clientId', filterClientId);
      if (isGlobalView && filterEtablissementId) params.append('etablissementId', filterEtablissementId);
      if (searchQuery) params.append('q', searchQuery);

      const qs = params.toString();
      const ck = user ? `${user.tenantId}:${user.userId}:pos/sales?${qs}` : null;
      if (ck) {
        const cached = await readCache<Sale[]>(ck);
        if (cached) setSales(cached);
      }

      const data = await apiGet<Sale[]>(`/api/pos/sales?${qs}`);
      setSales(data);
      if (ck) void writeCache(ck, data);
    } catch (e: any) {
      setError(e.message || 'Erreur lors du chargement des ventes');
    } finally {
      setBusy(false);
    }
  };

  // Chargement des Sessions POS (Clôtures Z)
  const fetchSessions = async () => {
    setBusy(true);
    try {
      const data = await apiGet<PosSessionDto[]>('/api/pos/sessions');
      setSessions(data);
    } catch (e: any) {
      console.error('Erreur chargement des sessions POS', e);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (isGlobalView) return;
    apiGet<ClientDto[]>('/api/crm/clients').then(setClients).catch(console.error);
  }, [isGlobalView]);

  useEffect(() => {
    if (activeTab === 'SALES') {
      fetchSales();
    } else {
      fetchSessions();
    }
  }, [activeTab, filterPeriod, customFrom, customTo, filterStatus, filterClientId, filterEtablissementId, posSessionIdFilter]);

  // Calcul des KPIs
  const kpis = useMemo(() => {
    let salesCount = 0;
    let ca = 0;
    let encaisse = 0;
    let resteDu = 0;
    let annulées = 0;
    let especesTotal = 0;
    let momoTotal = 0;
    let creditTotal = 0;

    sales.forEach((s) => {
      if (s.status === 'CANCELLED') {
        annulées++;
      } else {
        salesCount++;
        ca += s.total;
        encaisse += s.montantVerse;
        const due = Math.max(0, s.total - s.montantVerse);
        resteDu += due;

        const method = (s.modePaiement || s.paymentMethod || '').toUpperCase();
        if (method.includes('MTN') || method.includes('WAVE') || method.includes('MOOV') || method.includes('MOMO')) {
          momoTotal += s.montantVerse;
        } else if (method.includes('CREDIT') || method.includes('CRÉDIT') || s.status === 'PENDING_PAYMENT') {
          creditTotal += due;
        } else {
          especesTotal += s.montantVerse;
        }
      }
    });

    const totalCalculated = encaisse + creditTotal;
    const panierMoyen = salesCount > 0 ? Math.round(ca / salesCount) : 0;
    const especesPct = totalCalculated > 0 ? Math.round((especesTotal / totalCalculated) * 100) : 0;
    const momoPct = totalCalculated > 0 ? Math.round((momoTotal / totalCalculated) * 100) : 0;
    const creditPct = totalCalculated > 0 ? Math.max(0, 100 - especesPct - momoPct) : 0;

    return {
      salesCount,
      ca,
      encaisse,
      resteDu,
      annulées,
      panierMoyen,
      repartition: { especesPct, momoPct, creditPct },
    };
  }, [sales]);

  // Encaissement d'un reste dû
  const handleAddPayment = async () => {
    if (!paymentSale || !payAmount) return;
    const amount = Number(payAmount);
    const maxAllowed = paymentSale.total - paymentSale.montantVerse;
    if (amount <= 0 || amount > maxAllowed) {
      alert(`Le montant doit être compris entre 1 F et ${maxAllowed.toLocaleString()} F`);
      return;
    }

    setBusy(true);
    try {
      await apiPost(`/api/pos/sales/${paymentSale.id}/payments`, { montant: amount });
      if (detail && detail.id === paymentSale.id) {
        const updated = await apiGet<Sale>(`/api/pos/sales/${paymentSale.id}`);
        setDetail(updated);
      }
      setPaymentSale(null);
      setPayAmount('');
      await fetchSales();
    } catch (e: any) {
      alert(e.message || "Erreur d'encaissement");
    } finally {
      setBusy(false);
    }
  };

  // Annulation de vente
  const handleCancelSale = async () => {
    if (!cancelSale) return;
    setBusy(true);
    try {
      await apiPost(`/api/pos/sales/${cancelSale.id}/cancel`, { reason: cancelReason });
      setCancelSale(null);
      setDetail(null);
      await fetchSales();
    } catch (e: any) {
      alert(e.message || "Erreur lors de l'annulation");
    } finally {
      setBusy(false);
    }
  };

  // Export CSV
  const exportCSV = () => {
    const headers = isGlobalView
      ? ['ID Vente', 'Date', 'Heure', 'Vendeur', 'Établissement', 'Articles', 'Paiement', 'Statut', 'Total (FCFA)', 'Payé (FCFA)', 'Reste Dû (FCFA)']
      : ['ID Vente', 'Date', 'Heure', 'Vendeur', 'Client', 'Articles', 'Paiement', 'Statut', 'Total (FCFA)', 'Payé (FCFA)', 'Reste Dû (FCFA)'];
    const rows = sales.map((s) => [
      s.id,
      new Date(s.createdAt).toLocaleDateString('fr-FR'),
      new Date(s.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      s.vendeur?.nom || 'N/A',
      isGlobalView ? (s.etablissement?.nom || '—') : (s.client?.nom || 'Client Comptoir'),
      s.items.reduce((n, it) => n + it.quantite, 0),
      PAYMENT_METHOD_LABELS[s.paymentMethod] || s.paymentMethod,
      STATUS[s.status]?.label || s.status,
      s.total,
      s.montantVerse,
      s.total - s.montantVerse,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ventes_wilinwi_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 select-none">
      {/* En-tête avec onglets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Historique & Rapports</h1>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('SALES')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'SALES' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Ventes Individuelles
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('SESSIONS')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'SESSIONS' ? 'bg-white text-brand shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Clôtures de Caisse (Rapports Z)
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            {activeTab === 'SALES'
              ? 'Consultez, filtrez et gérez les ventes de votre entreprise'
              : 'Historique des clôtures de caisse et réimpression des Rapports Z'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ContextualHelp
            storageKey="wilinwi_ventes_tour_done"
            tourSteps={tourSteps}
            useCases={[
              { title: 'Vue globale multi-boutiques', description: 'Sans boutique sélectionnée, retrouvez les ventes de toutes vos boutiques et filtrez-les par établissement.' },
              { title: 'Clôtures de Caisse (Rapports Z)', description: 'Chaque fermeture de caisse produit un Rapport Z avec le solde théorique, le solde réel et les écarts.' },
              { title: 'Encaisser un reste dû', description: 'Une vente à crédit ou avec acompte reste "En attente" jusqu\'au règlement complet du solde.' },
              { title: 'Annuler une vente', description: 'L\'annulation ré-injecte automatiquement le stock vendu et ajuste la caisse à la baisse.' },
            ]}
          />
          {activeTab === 'SALES' && (
            <Button
              variant="outline"
              onClick={exportCSV}
              disabled={sales.length === 0}
              className="flex items-center gap-2 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 text-slate-700"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Exporter en CSV
            </Button>
          )}
        </div>
      </div>

      {posSessionIdFilter && (
        <div className="flex items-center justify-between p-3 bg-brand/5 border border-brand/20 rounded-xl text-xs text-brand">
          <span className="font-semibold">
            Ventes filtrées pour la Clôture de Caisse Session <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-brand/20">{posSessionIdFilter.substring(0, 8)}...</code>
          </span>
          <button type="button" onClick={() => setPosSessionIdFilter(null)} className="font-bold underline hover:text-brand-dark">
            Afficher toutes les ventes
          </button>
        </div>
      )}

      {isGlobalView && (
        <div className="flex items-start gap-3 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3">
          <Store className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <p className="text-sm text-brand/80">
            <span className="font-semibold text-brand">Vue globale</span> — les ventes de toutes les boutiques sont affichées.
          </p>
        </div>
      )}

      {/* KPIs financiers */}
      <VentesKpis kpis={kpis} />

      {/* Filtres de recherche */}
      <VentesFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterPeriod={filterPeriod}
        setFilterPeriod={setFilterPeriod}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterClientId={filterClientId}
        setFilterClientId={setFilterClientId}
        filterEtablissementId={filterEtablissementId}
        setFilterEtablissementId={setFilterEtablissementId}
        customFrom={customFrom}
        setCustomFrom={setCustomFrom}
        customTo={customTo}
        setCustomTo={setCustomTo}
        isGlobalView={isGlobalView}
        etablissements={user?.etablissements ?? []}
        clients={clients}
        busy={busy}
        onSearch={fetchSales}
      />

      {error && <p className="text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

      {/* Contenu principal Onglet 1 vs Onglet 2 */}
      {activeTab === 'SALES' ? (
        <VentesTable
          sales={sales}
          isGlobalView={isGlobalView}
          onSelectDetail={(s) => setDetail(s)}
          onSelectReceipt={(s) => setReceipt(s)}
          onSelectPayment={(s) => setPaymentSale(s)}
        />
      ) : (
        <VentesSessionsTable
          sessions={sessions}
          onFilterBySession={(sessionId) => {
            setPosSessionIdFilter(sessionId);
            setActiveTab('SALES');
          }}
          onSelectReportZ={(sess) => setReportZSession(sess)}
        />
      )}

      {/* Modale Reçu */}
      {receipt && <ReceiptModal sale={receipt} onClose={() => setReceipt(null)} />}

      {/* Modale Ticket Z */}
      {reportZSession && (
        <ReportZPrintModal isOpen={!!reportZSession} onClose={() => setReportZSession(null)} session={reportZSession} />
      )}

      {/* Modale Règlement de Crédit */}
      {paymentSale && (
        <VentePaymentModal
          sale={paymentSale}
          payAmount={payAmount}
          setPayAmount={setPayAmount}
          busy={busy}
          onClose={() => setPaymentSale(null)}
          onSubmit={handleAddPayment}
        />
      )}

      {/* Modale d'Annulation */}
      {cancelSale && (
        <VenteCancelModal
          sale={cancelSale}
          cancelReason={cancelReason}
          setCancelReason={setCancelReason}
          busy={busy}
          onClose={() => setCancelSale(null)}
          onConfirm={handleCancelSale}
        />
      )}

      {/* Drawer de Détail */}
      {detail && (
        <VenteDetailDrawer
          sale={detail}
          isGlobalView={isGlobalView}
          canCancel={canCancel}
          busy={busy}
          onClose={() => setDetail(null)}
          onOpenReceipt={() => setReceipt(detail)}
          onOpenPayment={() => setPaymentSale(detail)}
          onOpenCancel={() => setCancelSale(detail)}
        />
      )}
    </div>
  );
}
