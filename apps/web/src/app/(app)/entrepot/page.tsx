'use client';
/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page principale du module d'approvisionnement & entrepôt (KPIs 4 Métriques, 3 Onglets & Workflow Logistique)
 * @created 2026-06-28
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Truck, Plus, Search, FileDown, Warehouse, ShoppingBag } from 'lucide-react';
import { Button, Badge } from '@wilinwi/ui';
import { OfflineBanner } from '@/components/offline-banner';
import { ContextualHelp } from '@/components/contextual-help';
import type { TourStep } from '@/components/tour-guide';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { SupplierFormModal, RecordSupplierPaymentModal } from '@/components/supplier-modals';
import { PurchaseOrderModal } from '@/components/purchase-order-modal';
import { generatePurchaseOrderPdf } from '@/lib/purchase-order-pdf';
import { WarehouseKpiCards } from '@/components/entrepot/warehouse-kpi-cards';
import { SupplierDebtSchedule } from '@/components/entrepot/supplier-debt-schedule';
import type { SupplierDto, PurchaseOrderDto, EtablissementDto, DispatchOrderDto, ProductDto } from '@wilinwi/types';

const STATUS_TONES: Record<string, 'outline' | 'brand' | 'neutral' | 'success' | 'warning' | 'danger'> = {
  DRAFT: 'neutral',
  ORDERED: 'brand',
  PARTIAL: 'warning',
  RECEIVED: 'success',
  CANCELLED: 'danger',
} as const;

const STATUS_LABELS = {
  DRAFT: 'Brouillon',
  ORDERED: 'Commandé',
  PARTIAL: 'Réception partielle',
  RECEIVED: 'Reçu entièrement',
  CANCELLED: 'Annulé',
};

export default function EntrepotPage() {
  const { user } = useAuth();
  const currentEtablissementId = user?.etablissementId ?? null;
  const [activeTab, setActiveTab] = useState<'dispatch' | 'orders' | 'suppliers'>('dispatch');
  
  // Data states
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [orders, setOrders] = useState<PurchaseOrderDto[]>([]);
  const [etablissements, setEtablissements] = useState<EtablissementDto[]>([]);
  const [dispatches, setDispatches] = useState<DispatchOrderDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  
  // Filters & loading
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierDto | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<SupplierDto | null>(null);
  const [showPoModal, setShowPoModal] = useState(false);
  const [downloadingPoId, setDownloadingPoId] = useState<string | null>(null);

  async function handleDownloadPoPdf(order: PurchaseOrderDto) {
    setDownloadingPoId(order.id);
    try {
      await generatePurchaseOrderPdf(order, user?.boutiqueNom ?? 'Wilinwi');
    } finally {
      setDownloadingPoId(null);
    }
  }

  async function loadData() {
    try {
      const [sups, ords, etabs, disps, prods] = await Promise.all([
        apiGet<SupplierDto[]>('/api/suppliers').catch(() => []),
        apiGet<PurchaseOrderDto[]>('/api/purchase-orders').catch(() => []),
        apiGet<EtablissementDto[]>('/api/etablissements').catch(() => []),
        apiGet<DispatchOrderDto[]>('/api/dispatches').catch(() => []),
        apiGet<ProductDto[]>('/api/stock/products').catch(() => []),
      ]);
      setSuppliers(sups);
      setOrders(ords);
      setEtablissements(etabs);
      setDispatches(disps);
      setProducts(prods);
    } catch {
      // Ignorer silencieusement si défaillance réseau mineure
    }
  }

  useEffect(() => {
    void loadData();
  }, [currentEtablissementId]);

  async function handleCancelOrder(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir annuler ce bon de commande ?')) return;
    try {
      await apiPost(`/api/purchase-orders/${id}/cancel`, {});
      void loadData();
    } catch (e) {
      alert((e as ApiError).message);
    }
  }

  // Filter lists based on search & establishment scope
  const filteredSuppliers = suppliers.filter((s) =>
    s.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.telephone && s.telephone.includes(searchQuery))
  );

  const filteredOrders = orders.filter((o) => {
    if (currentEtablissementId && currentEtablissementId !== 'ALL' && o.etablissementId !== currentEtablissementId) {
      return false;
    }
    return o.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.fournisseurNom && o.fournisseurNom.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  // Métriques pour les 4 KPIs Synthétiques
  const totalStockValue = products.reduce((sum, p) => sum + (p.prixCatalogue || 0) * (p.stock || 0), 0);
  const inTransitCount = dispatches.filter((d) => d.statut === 'DRAFT' || d.statut === 'VALIDATED').length;
  const pendingOrdersCount = orders.filter((o) => o.statut === 'ORDERED' || o.statut === 'PARTIAL').length;
  const reorderAlertsCount = products.filter((p) => (p.stock || 0) <= (p.seuilAlerte ?? 5)).length;

  const tourSteps: TourStep[] = [
    {
      targetId: 'tour-entrepot-kpis',
      title: 'Vos indicateurs entrepôt',
      content: "Suivez d'un coup d'œil le stock réparti, les expéditions en transit et les bons de commande en attente.",
      position: 'bottom',
    },
    {
      targetId: 'tour-entrepot-tabs',
      title: 'Transferts, commandes, fournisseurs',
      content: 'Basculez entre le suivi des transferts inter-boutiques, les commandes fournisseurs et le répertoire avec échéancier des dettes.',
      position: 'bottom',
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-teal-950 flex items-center gap-2">
            <span>🏭</span> Approvisionnement & Entrepôt
          </h1>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Logistique multi-boutiques — Expéditions, commandes fournisseurs et échéancier des dettes.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            id="tour-entrepot-dispatch"
            href="/entrepot/dispatch"
            className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2 text-xs font-extrabold text-teal-800 transition-all hover:bg-teal-100 shadow-2xs"
          >
            <Truck className="h-4 w-4" /> Nouveau Dispatch
          </Link>
          {activeTab === 'suppliers' && (
            <Button
              onClick={() => { setSelectedSupplier(null); setShowSupplierModal(true); }}
              className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md shadow-teal-600/20 gap-1.5 transition-transform active:scale-95"
            >
              <Plus className="h-4 w-4" /> Nouveau fournisseur
            </Button>
          )}
          {activeTab === 'orders' && (
            <Button
              onClick={() => setShowPoModal(true)}
              className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md shadow-teal-600/20 gap-1.5 transition-transform active:scale-95"
            >
              <Plus className="h-4 w-4" /> Rédiger un Bon
            </Button>
          )}
          <ContextualHelp
            storageKey="wilinwi_entrepot_tour_done"
            tourSteps={tourSteps}
            useCases={[
              { title: 'Transfert Inter-Boutiques (Dispatch)', description: 'Expédiez de la marchandise depuis le dépôt vers une boutique. La réception contrôle les quantités et enregistre les éventuels écarts.' },
              { title: 'Commande Fournisseur', description: 'Rédigez un Bon de Commande, téléchargez le PDF officiel et réceptionnez les livraisons partielles ou totales.' },
              { title: 'Échéancier des Dettes', description: 'Consultez la liste des fournisseurs impayés et réglez les dettes avec écriture automatique en trésorerie.' },
            ]}
          />
        </div>
      </div>

      <OfflineBanner message="Mode hors-ligne : la réception de commande et les transferts exigent une connexion internet." />

      {/* ── AXE 1 : TopBar Synthétique (KPIs Entrepôt) ── */}
      <div id="tour-entrepot-kpis">
        <WarehouseKpiCards
          totalStockValue={totalStockValue}
          inTransitCount={inTransitCount}
          pendingOrdersCount={pendingOrdersCount}
          reorderAlertsCount={reorderAlertsCount}
          onSelectTab={(tab) => setActiveTab(tab)}
        />
      </div>

      {/* ── AXE 1 : Navigation par Onglets (Tabs UI) ── */}
      <div className="border-b border-slate-200" id="tour-entrepot-tabs">
        <nav className="flex space-x-6 text-sm font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('dispatch')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'dispatch'
                ? 'border-teal-600 text-teal-800 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Truck className="h-4 w-4" />
            <span>Transferts Inter-Boutiques (Dispatch)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'orders'
                ? 'border-teal-600 text-teal-800 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>📦 Commandes & Réceptions Fournisseurs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('suppliers')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'suppliers'
                ? 'border-teal-600 text-teal-800 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Warehouse className="h-4 w-4" />
            <span>Fournisseurs & Échéancier Dettes</span>
          </button>
        </nav>
      </div>

      {/* Barre de Recherche */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher par nom, bon de commande, référence..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-full border border-slate-200/90 bg-white pl-10 pr-4 py-2 text-xs font-semibold text-slate-900 outline-none shadow-2xs focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
        />
      </div>

      {/* ── ONGLET 1 : Transferts Inter-Boutiques (Dispatch) ── */}
      {activeTab === 'dispatch' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">Historique des Expéditions Inter-Magasins</h3>
            <Link href="/entrepot/dispatch">
              <Button size="sm" variant="outline" className="rounded-xl text-xs font-bold gap-1">
                <Truck className="h-3.5 w-3.5" /> Gérer les transferts
              </Button>
            </Link>
          </div>

          {dispatches.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/70 bg-white p-8 text-center text-slate-500 space-y-2">
              <Truck className="mx-auto h-10 w-10 text-slate-300" />
              <h4 className="text-sm font-bold text-slate-900">Aucun transfert inter-boutique enregistré</h4>
              <p className="text-xs text-slate-500">Utilisez le bouton "Nouveau Dispatch" pour expédier du stock d'un dépôt vers une boutique.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
              <table className="w-full text-sm text-left">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-500 text-xs uppercase font-bold">
                  <tr>
                    <th className="px-4 py-3.5">Référence</th>
                    <th className="px-4 py-3.5">Statut</th>
                    <th className="px-4 py-3.5">Source ➔ Destination</th>
                    <th className="px-4 py-3.5 text-center">Articles</th>
                    <th className="px-4 py-3.5 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {dispatches.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">#{d.reference}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-extrabold border ${
                          d.statut === 'VALIDATED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : d.statut === 'DRAFT'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          {d.statut === 'VALIDATED' ? '🟢 Reçu' : d.statut === 'DRAFT' ? '🔵 En Transit' : '🔴 Annulé'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 font-bold">
                        {d.sourceId} ➔ {d.destinationId}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-slate-900">
                        {d.items?.length ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-slate-500">
                        {new Date(d.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ONGLET 2 : Commandes & Réceptions Fournisseurs ── */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">Bons de Commande Fournisseurs</h3>
            <Button size="sm" onClick={() => setShowPoModal(true)} className="rounded-xl text-xs font-bold bg-teal-600 text-white">
              <Plus className="h-3.5 w-3.5 mr-1" /> Nouveau Bon
            </Button>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/70 bg-white p-8 text-center text-slate-500 space-y-2">
              <ShoppingBag className="mx-auto h-10 w-10 text-slate-300" />
              <h4 className="text-sm font-bold text-slate-900">Aucun bon de commande enregistré</h4>
              <p className="text-xs text-slate-500">Rédigez un nouveau bon de commande pour approvisionner vos réserves.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
              <table className="w-full text-sm text-left">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-500 text-xs uppercase font-bold">
                  <tr>
                    <th className="px-4 py-3.5">Réf.</th>
                    <th className="px-4 py-3.5">Fournisseur</th>
                    <th className="px-4 py-3.5">Statut</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">#{o.reference}</td>
                      <td className="px-4 py-3 text-slate-800 font-bold">{o.fournisseurNom || 'Fournisseur inconnu'}</td>
                      <td className="px-4 py-3">
                        <Badge tone={STATUS_TONES[o.statut] ?? 'neutral'}>
                          {STATUS_LABELS[o.statut as keyof typeof STATUS_LABELS] ?? o.statut}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleDownloadPoPdf(o)}
                          disabled={downloadingPoId === o.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          <FileDown className="h-3.5 w-3.5 text-teal-600" /> PDF
                        </button>
                        {o.statut !== 'CANCELLED' && o.statut !== 'RECEIVED' && (
                          <button
                            type="button"
                            onClick={() => handleCancelOrder(o.id)}
                            className="text-xs text-rose-600 font-bold hover:underline"
                          >
                            Annuler
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ONGLET 3 : Fournisseurs & Échéancier Dettes ── */}
      {activeTab === 'suppliers' && (
        <div className="space-y-6">
          {/* Section Échéancier des Dettes Fournisseurs (Axe 4) */}
          <SupplierDebtSchedule
            suppliers={filteredSuppliers}
            onRecordPayment={(supplier) => setShowPaymentModal(supplier)}
          />
        </div>
      )}

      {/* Modales Fournisseurs, Règlements & Bons de Commande */}
      {showSupplierModal && (
        <SupplierFormModal
          supplier={selectedSupplier ?? undefined}
          onClose={() => setShowSupplierModal(false)}
          onSuccess={() => { setShowSupplierModal(false); void loadData(); }}
        />
      )}

      {showPaymentModal && (
        <RecordSupplierPaymentModal
          supplier={showPaymentModal}
          onClose={() => setShowPaymentModal(null)}
          onSuccess={() => { setShowPaymentModal(null); void loadData(); }}
        />
      )}

      {showPoModal && (
        <PurchaseOrderModal
          etablissements={etablissements}
          currentEtablissementId={currentEtablissementId}
          onClose={() => setShowPoModal(false)}
          onSuccess={() => { setShowPoModal(false); void loadData(); }}
        />
      )}
    </div>
  );
}
