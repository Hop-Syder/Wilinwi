'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page Frontend CRM Clients & Carnet de Dettes (Route: /clients)
 *   En-tête KPI Synthétique, Navigation par Onglets (Annuaire vs Carnet de Dettes),
 *   Badges colorés, Modal d'encaissement et Drawer Fiche Client.
 * @created 2026-06-20
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useEffect, useState, useMemo } from 'react';
import { Plus, UserPlus, X } from 'lucide-react';
import { canSeeClientCredit, type ClientDto, type PaymentMethod } from '@wilinwi/types';
import { Button } from '@wilinwi/ui';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { readCache, writeCache } from '@wilinwi/offline';
import { ContextualHelp } from '@/components/contextual-help';
import type { TourStep } from '@/components/tour-guide';
import { ReceiptModal, type ReceiptSale } from '@/components/receipt';

import { ClientKpiCards } from '@/components/clients/client-kpi-cards';
import { ClientsTable } from '@/components/clients/clients-table';
import { ClientDetailsDrawer, type ClientDetailData } from '@/components/clients/client-details-drawer';
import { ClientPaymentModal } from '@/components/clients/client-payment-modal';

interface Sale extends ReceiptSale {
  status: 'COMPLETED' | 'PENDING_PAYMENT' | 'CANCELLED';
  vendeur?: { id: string; nom: string; email: string } | null;
}

interface CrmKpis {
  totalDette: number;
  debiteurs: number;
  remboursementsAujourdhui: number;
  creditDisponible: number;
}

export default function ClientsPage() {
  const { user } = useAuth();
  const seeCredit = user ? canSeeClientCredit(user.role) : false;
  const canWrite = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const canCollect = user?.role === 'OWNER' || user?.role === 'MANAGER' || user?.role === 'CASHIER';

  // Navigation par Onglets Principaux (Tabs UI)
  const [activeMainTab, setActiveMainTab] = useState<'DIRECTORY' | 'DEBT_LEDGER'>('DIRECTORY');

  // État des clients & KPIs
  const [clients, setClients] = useState<ClientDto[]>([]);
  const [kpis, setKpis] = useState<CrmKpis>({ totalDette: 0, debiteurs: 0, remboursementsAujourdhui: 0, creditDisponible: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [clientDetail, setClientDetail] = useState<ClientDetailData | null>(null);

  // Reçu thermique modal
  const [activeReceiptSale, setActiveReceiptSale] = useState<Sale | null>(null);

  // Modales & Drawers
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [paymentClient, setPaymentClient] = useState<ClientDto | null>(null);
  const [busy, setBusy] = useState(false);

  // Formulaire d'édition / création
  const [form, setForm] = useState({ nom: '', telephone: '', notes: '', plafondCredit: '' });

  const tourSteps: TourStep[] = [
    {
      targetId: 'tour-clients-kpis',
      title: 'Synthèse des Crédits & Clients',
      content: 'Consultez en un coup d’œil l’encours total des crédits, les créances en retard et le taux de recouvrement.',
      position: 'bottom',
    },
    {
      targetId: 'tour-clients-tabs',
      title: 'Annuaire & Carnet de Dettes',
      content: 'Naviguez entre l’annuaire général et le carnet de dettes ciblés pour relancer vos clients en 1 clic.',
      position: 'bottom',
    },
  ];

  const cacheKey = (k: string) => (user ? `${user.tenantId}:${user.userId}:${k}` : null);

  // Chargement des données CRM (Clients + KPIs)
  const loadData = async () => {
    const ckClients = cacheKey('crm/clients');
    const ckKpis = cacheKey('crm/kpis');
    try {
      if (ckClients) {
        const cached = await readCache<ClientDto[]>(ckClients);
        if (cached) setClients(cached);
      }
      if (seeCredit && ckKpis) {
        const cachedKpis = await readCache<CrmKpis>(ckKpis);
        if (cachedKpis) setKpis(cachedKpis);
      }

      const freshClients = await apiGet<ClientDto[]>('/api/crm/clients');
      setClients(freshClients);
      if (ckClients) void writeCache(ckClients, freshClients);

      if (seeCredit) {
        const freshKpis = await apiGet<CrmKpis>('/api/crm/clients/kpis');
        setKpis(freshKpis);
        if (ckKpis) void writeCache(ckKpis, freshKpis);
      }
    } catch {
      /* silencieux */
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Chargement du détail d'un client sélectionné
  useEffect(() => {
    if (!selectedId) {
      setClientDetail(null);
      return;
    }
    const loadDetail = async () => {
      try {
        const detail = await apiGet<ClientDetailData>(`/api/crm/clients/${selectedId}`);
        setClientDetail(detail);
        setForm({
          nom: detail.client.nom,
          telephone: detail.client.telephone || '',
          notes: detail.client.notes || '',
          plafondCredit: detail.client.plafondCredit ? detail.client.plafondCredit.toString() : '',
        });
      } catch {
        /* silencieux */
      }
    };
    void loadDetail();
  }, [selectedId]);

  // Calculs synthétiques pour les cartes KPIs
  const computedMetrics = useMemo(() => {
    let totalDette = 0;
    let debiteursCount = 0;
    let overLimitCount = 0;

    clients.forEach((c) => {
      const debt = c.soldeCredit ?? 0;
      const ceiling = c.plafondCredit ?? 0;
      if (debt > 0) {
        totalDette += debt;
        debiteursCount++;
      }
      if (ceiling > 0 && debt > ceiling) {
        overLimitCount++;
      }
    });

    const totalCalculated = totalDette + kpis.remboursementsAujourdhui;
    const repaymentRate = totalCalculated > 0 ? Math.round((kpis.remboursementsAujourdhui / totalCalculated) * 100) : 82;

    return {
      totalClients: clients.length,
      totalDette: seeCredit ? (kpis.totalDette || totalDette) : 0,
      debiteursCount: seeCredit ? (kpis.debiteurs || debiteursCount) : 0,
      overLimitCount,
      repaymentRate,
    };
  }, [clients, kpis, seeCredit]);

  // Création Client
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const created = await apiPost<ClientDto>('/api/crm/clients', {
        nom: form.nom,
        telephone: form.telephone || undefined,
        notes: form.notes || undefined,
        plafondCredit: form.plafondCredit ? Number(form.plafondCredit) : null,
      });
      setShowAddModal(false);
      setForm({ nom: '', telephone: '', notes: '', plafondCredit: '' });
      await loadData();
      setSelectedId(created.id);
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la création du client');
    } finally {
      setBusy(false);
    }
  };

  // Mise à jour Client
  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    setBusy(true);
    try {
      await apiPatch(`/api/crm/clients/${selectedId}`, {
        nom: form.nom,
        telephone: form.telephone || undefined,
        notes: form.notes || undefined,
        plafondCredit: form.plafondCredit ? Number(form.plafondCredit) : null,
      });
      setShowEditModal(false);
      await loadData();
      const detail = await apiGet<ClientDetailData>(`/api/crm/clients/${selectedId}`);
      setClientDetail(detail);
    } catch (e: any) {
      alert(e.message || 'Erreur de mise à jour');
    } finally {
      setBusy(false);
    }
  };

  // Traitement d'un remboursement depuis la modale
  const handleProcessPayment = async (montant: number, methode: PaymentMethod, note?: string) => {
    if (!paymentClient) return;
    await apiPost(`/api/crm/clients/${paymentClient.id}/payments`, {
      montant,
      methode,
      note: note || undefined,
    });
    await loadData();
    if (selectedId === paymentClient.id) {
      const detail = await apiGet<ClientDetailData>(`/api/crm/clients/${selectedId}`);
      setClientDetail(detail);
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* En-tête de page avec Thème Violet Contextuel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-violet-950 font-display">
              Clients & Carnet de Dettes
            </h1>
            {/* Onglets Principaux (Tabs UI) */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80" id="tour-clients-tabs">
              <button
                type="button"
                onClick={() => setActiveMainTab('DIRECTORY')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeMainTab === 'DIRECTORY'
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                👥 Annuaire Clients
              </button>
              <button
                type="button"
                onClick={() => setActiveMainTab('DEBT_LEDGER')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeMainTab === 'DEBT_LEDGER'
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                💳 Carnet de Dettes & Recouvrements
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {activeMainTab === 'DIRECTORY'
              ? 'Gestion des fiches clients, coordonnées et plafonds de crédit autorisés'
              : 'Suivi des encours à recouvrer, relances WhatsApp et versements de dette'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ContextualHelp
            storageKey="wilinwi_clients_tour_done"
            tourSteps={tourSteps}
            useCases={[
              { title: 'Digitalisation du Carnet de Dettes', description: 'Gérez et relancez vos clients débiteurs en 1 clic via WhatsApp.' },
              { title: 'Plafonds de Crédit', description: 'Empêche la validation de ventes en caisse si le plafond défini est dépassé.' },
              { title: 'Ticket de Remboursement', description: 'Imprimez un reçu thermique pour chaque acompte ou remboursement versé.' },
            ]}
          />
          {canWrite && (
            <Button
              onClick={() => {
                setForm({ nom: '', telephone: '', notes: '', plafondCredit: '' });
                setShowAddModal(true);
              }}
              className="bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs shadow-sm rounded-xl"
            >
              <Plus className="h-4 w-4 mr-1" /> Nouveau client
            </Button>
          )}
        </div>
      </div>

      {/* Cartes KPIs Synthétiques */}
      {seeCredit && (
        <div id="tour-clients-kpis">
          <ClientKpiCards
            totalClients={computedMetrics.totalClients}
            totalDette={computedMetrics.totalDette}
            debiteursCount={computedMetrics.debiteursCount}
            overLimitCount={computedMetrics.overLimitCount}
            repaymentRate={computedMetrics.repaymentRate}
          />
        </div>
      )}

      {/* Annuaire & Tableau CRM */}
      <ClientsTable
        clients={clients}
        onSelectClient={(c) => setSelectedId(c.id)}
        onOpenPaymentModal={(c) => {
          if (canCollect) setPaymentClient(c);
        }}
      />

      {/* Slide-over Drawer Détail Client */}
      {clientDetail && (
        <ClientDetailsDrawer
          detail={clientDetail}
          onClose={() => setSelectedId(null)}
          onOpenPaymentModal={() => {
            if (canCollect) setPaymentClient(clientDetail.client);
          }}
          onOpenEditModal={() => {
            if (canWrite) setShowEditModal(true);
          }}
          onViewReceipt={(sale) => setActiveReceiptSale(sale)}
        />
      )}

      {/* Modale d'Encaissement de Remboursement */}
      {paymentClient && (
        <ClientPaymentModal
          client={paymentClient}
          onClose={() => setPaymentClient(null)}
          onSubmitPayment={handleProcessPayment}
        />
      )}

      {/* Reçu Thermique Imprimable */}
      {activeReceiptSale && (
        <ReceiptModal sale={activeReceiptSale} onClose={() => setActiveReceiptSale(null)} />
      )}

      {/* Modale de Création Client */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs" onClick={() => setShowAddModal(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-violet-950 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-violet-600" /> Nouvelle Fiche Client
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nom complet *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Koffi Christian"
                  value={form.nom}
                  onChange={(e) => setForm((prev) => ({ ...prev, nom: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Téléphone (WhatsApp)</label>
                <input
                  type="tel"
                  placeholder="Ex: +22997000000"
                  value={form.telephone}
                  onChange={(e) => setForm((prev) => ({ ...prev, telephone: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Plafond de Crédit Autorisé (FCFA, vide = illimité)
                </label>
                <input
                  type="number"
                  placeholder="Ex: 50000"
                  value={form.plafondCredit}
                  onChange={(e) => setForm((prev) => ({ ...prev, plafondCredit: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Remarques</label>
                <textarea
                  placeholder="Adresse, contraintes de relance..."
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddModal(false)} disabled={busy}>
                  Annuler
                </Button>
                <Button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-extrabold" disabled={busy}>
                  {busy ? 'Création...' : 'Créer le client'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale de Modification Client */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs" onClick={() => setShowEditModal(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-violet-950">Modifier Fiche Client</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateClient} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nom complet *</label>
                <input
                  type="text"
                  required
                  value={form.nom}
                  onChange={(e) => setForm((prev) => ({ ...prev, nom: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={form.telephone}
                  onChange={(e) => setForm((prev) => ({ ...prev, telephone: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Plafond de Crédit Autorisé (FCFA)
                </label>
                <input
                  type="number"
                  value={form.plafondCredit}
                  onChange={(e) => setForm((prev) => ({ ...prev, plafondCredit: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowEditModal(false)} disabled={busy}>
                  Annuler
                </Button>
                <Button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-extrabold" disabled={busy}>
                  {busy ? 'Mise à jour...' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
