'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page Ventes — Vue globale multi-boutiques (filtre et colonne Établissement) + vue boutique standard
 * @created 2026-06-20
 * @updated 2026-06-28
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import {
  Receipt as ReceiptIcon,
  Ban,
  Eye,
  Search,
  Calendar,
  FileSpreadsheet,
  ArrowRight,
  X,
  CheckCircle2,
  DollarSign,
  CreditCard,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  User,
  ShieldAlert,
  Store,
} from 'lucide-react';
import { PAYMENT_METHOD_LABELS, type PaymentMethod, type ClientDto } from '@wilinwi/types';
import { Button, Card, Badge, formatFCFA } from '@wilinwi/ui';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { readCache, writeCache } from '@wilinwi/offline';
import { ReceiptModal, type ReceiptSale } from '@/components/receipt';
import { ContextualHelp } from '@/components/contextual-help';
import type { TourStep } from '@/components/tour-guide';
import Link from 'next/link';

interface Sale extends ReceiptSale {
  status: 'COMPLETED' | 'PENDING_PAYMENT' | 'PENDING_APPROVAL' | 'CANCELLED';
  vendeur?: { id: string; nom: string; email: string } | null;
  etablissement?: { id: string; nom: string } | null;
}

const STATUS: Record<Sale['status'], { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral'; color: string }> = {
  COMPLETED: { label: 'Payée', tone: 'success', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  PENDING_PAYMENT: { label: 'Crédit/Acompte', tone: 'warning', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  PENDING_APPROVAL: { label: 'À valider', tone: 'warning', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  CANCELLED: { label: 'Annulée', tone: 'danger', color: 'text-rose-700 bg-rose-50 border-rose-200' },
};

export default function VentesPage() {
  const { user } = useAuth();
  const canCancel = user?.role === 'OWNER' || user?.role === 'MANAGER';
  // Vue globale = plusieurs établissements + aucun établissement sélectionné
  const isGlobalView = user?.etablissementId === null && (user?.etablissements?.length ?? 0) > 1;

  // State
  const [sales, setSales] = useState<Sale[]>([]);
  const [clients, setClients] = useState<ClientDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Modals
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const [detail, setDetail] = useState<Sale | null>(null);
  const [paymentSale, setPaymentSale] = useState<Sale | null>(null);
  const [cancelSale, setCancelSale] = useState<Sale | null>(null);

  // Filters
  const [filterPeriod, setFilterPeriod] = useState<'TODAY' | '7DAYS' | 'MONTH' | 'CUSTOM'>('TODAY');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterClientId, setFilterClientId] = useState('');
  const [filterEtablissementId, setFilterEtablissementId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Payments & Cancellation Input
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

  // Load Sales
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
      // Vue boutique : filtre client / Vue globale : filtre établissement
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

  // Chargement initial des clients (vue boutique uniquement)
  useEffect(() => {
    if (isGlobalView) return;
    async function init() {
      try {
        const cl = await apiGet<ClientDto[]>('/api/crm/clients');
        setClients(cl);
      } catch (err) {
        console.error('Erreur chargement clients:', err);
      }
    }
    init();
  }, [isGlobalView]);

  useEffect(() => {
    fetchSales();
  }, [filterPeriod, customFrom, customTo, filterStatus, filterClientId, filterEtablissementId]);

  // KPIs
  const kpis = useMemo(() => {
    let salesCount = 0;
    let ca = 0;
    let encaisse = 0;
    let resteDu = 0;
    let annulées = 0;

    sales.forEach((s) => {
      if (s.status === 'CANCELLED') {
        annulées++;
      } else {
        salesCount++;
        ca += s.total;
        encaisse += s.montantVerse;
        resteDu += s.total - s.montantVerse;
      }
    });

    return { salesCount, ca, encaisse, resteDu, annulées };
  }, [sales]);

  // Submit payment
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

  // Cancel sale
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

  // CSV Export
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
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-black tracking-tight text-slate-900 bg-gradient-to-r from-slate-900 via-blue-900 to-brand bg-clip-text text-transparent">
            Registre des ventes
          </h1>
          <p className="mt-1 text-slate-500 text-sm">
            {isGlobalView
              ? 'Vue consolidée — toutes les boutiques confondues.'
              : 'Consultez, recherchez, encaissez les soldes et annulez des transactions.'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ContextualHelp
            storageKey="wilinwi_ventes_tour_done"
            tourSteps={tourSteps}
            useCases={[
              { title: 'Vue globale multi-boutiques', description: 'Sans boutique sélectionnée, retrouvez les ventes de toutes vos boutiques et filtrez-les par établissement.' },
              { title: 'Encaisser un reste dû', description: 'Une vente à crédit ou avec acompte reste "En attente" jusqu\'au règlement complet du solde.' },
              { title: 'Annuler une vente', description: 'L\'annulation ré-injecte automatiquement le stock vendu et ajuste la caisse à la baisse.' },
              { title: 'Export CSV', description: 'Exportez la liste filtrée des ventes pour votre comptabilité ou votre suivi externe.' },
            ]}
          />
          <Button
            variant="outline"
            onClick={exportCSV}
            disabled={sales.length === 0}
            className="flex items-center gap-2 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 text-slate-700"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Exporter en CSV
          </Button>
        </div>
      </div>

      {/* Bandeau vue globale */}
      {isGlobalView && (
        <div className="flex items-start gap-3 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3">
          <Store className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <p className="text-sm text-brand/80">
            <span className="font-semibold text-brand">Vue globale</span> — les ventes de toutes les boutiques sont affichées.
            Utilisez le filtre <strong>Boutique</strong> pour isoler une boutique spécifique.
          </p>
        </div>
      )}

      {/* Cartes KPI */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 bg-gradient-to-br from-white to-blue-50/30 border-blue-100/60 shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-5 text-blue-900 font-bold text-7xl select-none group-hover:scale-110 transition-transform">#</div>
          <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Ventes</span>
          <span className="block mt-2 font-display text-2xl font-black text-blue-900">{kpis.salesCount}</span>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-white to-emerald-50/30 border-emerald-100/60 shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-5 text-emerald-900 font-bold text-7xl select-none group-hover:scale-110 transition-transform">F</div>
          <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Chiffre d'Affaires</span>
          <span className="block mt-2 font-display text-2xl font-black text-emerald-800">{formatFCFA(kpis.ca)}</span>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-white to-slate-50 border-slate-200/60 shadow-sm relative overflow-hidden group">
          <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Encaissé</span>
          <span className="block mt-2 font-display text-2xl font-black text-slate-800">{formatFCFA(kpis.encaisse)}</span>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-white to-amber-50/30 border-amber-100/60 shadow-sm relative overflow-hidden group">
          <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Reste à encaisser</span>
          <span className={`block mt-2 font-display text-2xl font-black ${kpis.resteDu > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
            {formatFCFA(kpis.resteDu)}
          </span>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-white to-rose-50/30 border-rose-100/60 shadow-sm relative overflow-hidden group col-span-2 md:col-span-1">
          <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Annulées</span>
          <span className="block mt-2 font-display text-2xl font-black text-rose-700">{kpis.annulées}</span>
        </Card>
      </div>

      {/* Barre de Filtres */}
      <Card id="tour-ventes-filters" className="p-4 border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-end">
          {/* Recherche */}
          <div className="flex-1 space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Recherche</label>
            <div className="relative">
              <input
                type="text"
                placeholder="N° vente, client, produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchSales()}
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>
          </div>

          {/* Période */}
          <div className="w-full lg:w-48 space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Période</label>
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none bg-white"
            >
              <option value="TODAY">Aujourd'hui</option>
              <option value="7DAYS">7 derniers jours</option>
              <option value="MONTH">Ce mois</option>
              <option value="CUSTOM">Personnalisé</option>
            </select>
          </div>

          {/* Statut */}
          <div className="w-full lg:w-48 space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Statut</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none bg-white"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="COMPLETED">Payée</option>
              <option value="PENDING_PAYMENT">Crédit / Acompte</option>
              <option value="PENDING_APPROVAL">À valider</option>
              <option value="CANCELLED">Annulée</option>
            </select>
          </div>

          {/* Filtre Boutique (vue globale) ou Client (vue boutique) */}
          {isGlobalView ? (
            <div className="w-full lg:w-56 space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5" /> Boutique
              </label>
              <select
                value={filterEtablissementId}
                onChange={(e) => setFilterEtablissementId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none bg-white"
              >
                <option value="">Toutes les boutiques</option>
                {(user?.etablissements ?? []).map((e) => (
                  <option key={e.id} value={e.id}>{e.nom}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="w-full lg:w-56 space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Client</label>
              <select
                value={filterClientId}
                onChange={(e) => setFilterClientId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none bg-white"
              >
                <option value="">Tous les clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom} {c.telephone ? `(${c.telephone})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Bouton de recherche manuelle */}
          <Button onClick={fetchSales} disabled={busy} className="lg:w-32 shrink-0">
            {busy ? 'Chargement...' : 'Rechercher'}
          </Button>
        </div>

        {/* Inputs dates personnalisées */}
        {filterPeriod === 'CUSTOM' && (
          <div className="flex gap-4 items-center border-t border-slate-100 pt-3 animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500 font-medium">Du</span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-2 py-1 border rounded-md text-sm outline-none focus:border-brand"
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500 font-medium">Au</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-2 py-1 border rounded-md text-sm outline-none focus:border-brand"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Table des Ventes */}
      {error && <p className="text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

      <Card id="tour-ventes-table" className="overflow-hidden border-slate-200/80 shadow-sm">
        {/* 📱 Mobile : cartes empilées */}
        <div className="divide-y divide-slate-100 md:hidden">
          {sales.map((s) => {
            const reste = s.total - s.montantVerse;
            return (
              <div key={s.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="tabular text-lg font-bold text-slate-900">{formatFCFA(s.total)}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {isGlobalView
                        ? (s.etablissement?.nom ?? '—')
                        : (s.client?.nom || 'Comptoir')}{' '}
                      ·{' '}
                      {new Date(s.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {s.vendeur?.nom && (
                      <p className="text-[11px] text-slate-400">Vendeur : {s.vendeur.nom}</p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS[s.status]?.color || ''}`}>
                    {STATUS[s.status]?.label || s.status}
                  </span>
                </div>
                {reste > 0 && (
                  <p className="mt-1 text-xs font-semibold text-amber-600">Reste dû : {formatFCFA(reste)}</p>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => setDetail(s)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    <Eye className="h-3.5 w-3.5" /> Détail
                  </button>
                  <button
                    onClick={() => setReceipt(s)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-brand transition-colors hover:bg-blue-50"
                  >
                    <ReceiptIcon className="h-3.5 w-3.5" /> Reçu
                  </button>
                  {s.status === 'PENDING_PAYMENT' && (
                    <button
                      onClick={() => setPaymentSale(s)}
                      className="flex-1 rounded-lg bg-amber-100 py-2 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-200"
                    >
                      Encaisser
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {sales.length === 0 && (
            <div className="p-12 text-center text-slate-400">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              Aucune vente trouvée avec ces filtres.
            </div>
          )}
        </div>

        {/* 🖥️ Desktop : tableau */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500 uppercase tracking-wider text-xs font-bold">
              <tr>
                <th className="px-5 py-3.5">Heure / Date</th>
                <th className="px-5 py-3.5">N° Vente</th>
                <th className="px-5 py-3.5">Vendeur</th>
                {/* En vue globale : colonne Boutique ; en vue boutique : colonne Client */}
                {isGlobalView ? (
                  <th className="px-5 py-3.5">
                    <span className="flex items-center gap-1.5"><Store className="h-3.5 w-3.5" /> Boutique</span>
                  </th>
                ) : (
                  <th className="px-5 py-3.5">Client</th>
                )}
                <th className="px-5 py-3.5">Statut</th>
                <th className="px-5 py-3.5 text-right">Payé</th>
                <th className="px-5 py-3.5 text-right">Reste dû</th>
                <th className="px-5 py-3.5 text-right">Total</th>
                <th className="px-5 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.map((s) => {
                const reste = s.total - s.montantVerse;
                return (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 tabular text-slate-500">
                      <div className="font-semibold text-slate-800">
                        {new Date(s.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-[11px]">{new Date(s.createdAt).toLocaleDateString('fr-FR')}</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-brand font-semibold">
                      #{s.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 font-medium">{s.vendeur?.nom || '—'}</td>
                    {/* Boutique ou Client selon le mode */}
                    <td className="px-5 py-3.5 text-slate-600 font-medium">
                      {isGlobalView ? (
                        <span className="flex items-center gap-1.5">
                          <Store className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          {s.etablissement?.nom ?? <span className="text-slate-400 italic">—</span>}
                        </span>
                      ) : (
                        s.client?.nom || <span className="text-slate-400 font-normal italic">Comptoir</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${STATUS[s.status]?.color || ''}`}>
                        {STATUS[s.status]?.label || s.status}
                      </span>
                    </td>
                    <td className="tabular px-5 py-3.5 text-right font-medium text-slate-600">
                      {formatFCFA(s.montantVerse)}
                    </td>
                    <td className={`tabular px-5 py-3.5 text-right font-bold ${reste > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                      {reste > 0 ? formatFCFA(reste) : '—'}
                    </td>
                    <td className="tabular px-5 py-3.5 text-right font-bold text-slate-900">
                      {formatFCFA(s.total)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setDetail(s)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                          title="Voir le détail"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setReceipt(s)}
                          className="rounded-lg p-1.5 text-brand hover:bg-blue-50 transition-colors"
                          title="Voir le reçu"
                        >
                          <ReceiptIcon className="h-4 w-4" />
                        </button>
                        {s.status === 'PENDING_PAYMENT' && (
                          <button
                            onClick={() => setPaymentSale(s)}
                            className="rounded-lg px-2 py-1 text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 transition-colors"
                            title="Encaisser le solde"
                          >
                            Encaisser
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center text-slate-400">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    Aucune vente trouvée avec ces filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODALE REÇU */}
      {receipt && <ReceiptModal sale={receipt} onClose={() => setReceipt(null)} />}

      {/* MODALE ENCAISSER RESTE DÛ */}
      {paymentSale && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm max-h-[95vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Règlement de crédit</h3>
              <button onClick={() => setPaymentSale(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4 text-sm text-slate-600 space-y-1">
              <p>Vente : <span className="font-mono font-bold text-brand">#{paymentSale.id.slice(0, 8).toUpperCase()}</span></p>
              <p>Client : <span className="font-bold">{paymentSale.client?.nom || 'Client Comptoir'}</span></p>
              <div className="flex justify-between items-center bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
                <span className="text-xs text-amber-800 font-semibold uppercase tracking-wider">Reste à payer</span>
                <span className="text-xl font-black text-amber-700">
                  {formatFCFA(paymentSale.total - paymentSale.montantVerse)}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="block font-medium text-slate-600 mb-1">Montant versé aujourd'hui (FCFA)</span>
                <input
                  type="number"
                  placeholder="Ex: 5000"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                />
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setPaymentSale(null)}>Annuler</Button>
              <Button className="flex-1" onClick={handleAddPayment} disabled={busy || !payAmount}>
                {busy ? 'Règlement...' : 'Encaisser'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE D'ANNULATION */}
      {cancelSale && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm max-h-[95vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 mb-2 text-rose-700">
              <ShieldAlert className="h-6 w-6 shrink-0" />
              <h3 className="text-lg font-bold">Annuler la transaction</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Cette action est destructive. Le stock de la vente sera automatiquement ré-entré et la caisse sera ajustée à la baisse.
            </p>
            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1 text-slate-600 border">
                <p>N° Vente : <span className="font-mono font-bold text-slate-900">#{cancelSale.id.slice(0, 8).toUpperCase()}</span></p>
                <p>Impact Caisse : <span className="font-bold text-rose-600">-{formatFCFA(cancelSale.montantVerse)}</span></p>
              </div>
              <label className="block text-sm">
                <span className="block font-semibold text-slate-700 mb-1">Motif de l'annulation *</span>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-white focus:border-rose-500"
                >
                  <option value="Erreur de saisie">Erreur de saisie / Doublon</option>
                  <option value="Client a changé d'avis">Le client a changé d'avis</option>
                  <option value="Retour produit total">Retour produit total</option>
                  <option value="Autre motif">Autre motif</option>
                </select>
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setCancelSale(null)}>Garder</Button>
              <Button variant="danger" className="flex-1 bg-rose-600 hover:bg-rose-700" onClick={handleCancelSale} disabled={busy}>
                {busy ? 'Annulation...' : 'Confirmer'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER DE DÉTAIL */}
      {detail && (
        <div className="fixed inset-0 z-20 flex justify-end bg-black/40 backdrop-blur-sm" onClick={() => setDetail(null)}>
          <div
            className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl flex flex-col justify-between animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-xl font-black text-slate-800">
                    Vente N° {detail.id.slice(0, 8).toUpperCase()}
                  </h2>
                  <div className="mt-1.5 flex flex-wrap gap-2 items-center">
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${STATUS[detail.status]?.color || ''}`}>
                      {STATUS[detail.status]?.label || detail.status}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {new Date(detail.createdAt).toLocaleString('fr-FR')}
                    </span>
                    {isGlobalView && detail.etablissement && (
                      <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        <Store className="h-3 w-3" /> {detail.etablissement.nom}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 border-y border-slate-100 py-4">
                <div className="text-xs">
                  <span className="block font-semibold text-slate-400 uppercase tracking-wider">Client</span>
                  <span className="block mt-1 font-bold text-slate-700">{detail.client?.nom || 'Client Comptoir'}</span>
                  {detail.client?.telephone && <span className="block text-[11px] text-slate-500 mt-0.5">{detail.client.telephone}</span>}
                </div>
                <div className="text-xs">
                  <span className="block font-semibold text-slate-400 uppercase tracking-wider">Vendeur</span>
                  <span className="block mt-1 font-bold text-slate-700">{detail.vendeur?.nom || '—'}</span>
                  {detail.vendeur?.email && <span className="block text-[11px] text-slate-500 mt-0.5">{detail.vendeur.email}</span>}
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Articles achetés</span>
                <ul className="divide-y divide-slate-100">
                  {detail.items.map((it) => (
                    <li key={it.id} className="flex justify-between py-2.5 text-sm">
                      <div className="flex-1 pr-4">
                        <span className="font-semibold text-slate-800">{it.quantite}×</span> {it.product?.nom ?? 'Article'}
                      </div>
                      <span className="tabular font-semibold text-slate-700">{formatFCFA(it.prixReel * it.quantite)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border space-y-2">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Total Brut</span>
                  <span className="tabular font-medium">{formatFCFA(detail.total)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Encaissé ({PAYMENT_METHOD_LABELS[detail.paymentMethod]})</span>
                  <span className="tabular font-medium text-slate-700">{formatFCFA(detail.montantVerse)}</span>
                </div>
                {detail.total - detail.montantVerse > 0 && (
                  <div className="flex justify-between text-sm border-t border-dashed border-slate-200 pt-2 text-amber-600 font-bold">
                    <span>Reste dû</span>
                    <span className="tabular">{formatFCFA(detail.total - detail.montantVerse)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-slate-900">
                  <span>Total Net</span>
                  <span className="tabular text-brand">{formatFCFA(detail.total)}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-2 pt-4 border-t border-slate-100">
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setReceipt(detail)}>
                  <ReceiptIcon className="h-4 w-4" /> Reçu
                </Button>
                <Link href={`/pos/returns?saleId=${detail.id}`} className="flex-1">
                  <Button variant="outline" className="w-full justify-center">Retourner</Button>
                </Link>
              </div>
              {detail.status === 'PENDING_PAYMENT' && (
                <Button
                  className="w-full justify-center bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={() => setPaymentSale(detail)}
                >
                  Encaisser le reste ({formatFCFA(detail.total - detail.montantVerse)})
                </Button>
              )}
              {canCancel && detail.status !== 'CANCELLED' && (
                <Button
                  variant="danger"
                  className="w-full justify-center bg-rose-600 hover:bg-rose-700"
                  disabled={busy}
                  onClick={() => setCancelSale(detail)}
                >
                  <Ban className="h-4 w-4" /> Annuler cette vente
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
