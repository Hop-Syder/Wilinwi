'use client';
/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page principale du module d'approvisionnement / Entrepôt
 * @created 2026-06-28
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Truck, Plus, CheckCircle, Clock, Ban, DollarSign, Search, Eye, AlertTriangle } from 'lucide-react';
import { Button, Card, Badge } from '@wilinwi/ui';
import { OfflineBanner } from '@/components/offline-banner';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { SupplierFormModal, RecordSupplierPaymentModal, PurchaseOrderInvoiceModal } from '@/components/supplier-modals';
import { PurchaseOrderModal } from '@/components/purchase-order-modal';
import type { SupplierDto, PurchaseOrderDto, EtablissementDto } from '@wilinwi/types';

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
  const [activeTab, setActiveTab] = useState<'suppliers' | 'orders' | 'payments'>('suppliers');
  
  // Data states
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [orders, setOrders] = useState<PurchaseOrderDto[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [etablissements, setEtablissements] = useState<EtablissementDto[]>([]);
  
  // Filters & loading
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierDto | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<SupplierDto | null>(null);
  const [showPoModal, setShowPoModal] = useState(false);
  const [viewPoInvoice, setViewPoInvoice] = useState<PurchaseOrderDto | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [sups, ords, pays, etabs] = await Promise.all([
        apiGet<SupplierDto[]>('/api/suppliers'),
        apiGet<PurchaseOrderDto[]>('/api/purchase-orders'),
        apiGet<any[]>('/api/suppliers/payments'),
        apiGet<EtablissementDto[]>('/api/etablissements'),
      ]);
      setSuppliers(sups);
      setOrders(ords);
      setPayments(pays);
      setEtablissements(etabs);
    } catch (e) {
      setError('Impossible de charger les données du module d&apos;approvisionnement.');
    } finally {
      setLoading(false);
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
    // Filter by establishment scope
    if (currentEtablissementId && currentEtablissementId !== 'ALL' && o.etablissementId !== currentEtablissementId) {
      return false;
    }
    return o.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.fournisseurNom && o.fournisseurNom.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const filteredPayments = payments.filter((p) => {
    if (currentEtablissementId && currentEtablissementId !== 'ALL' && p.etablissementId !== currentEtablissementId) {
      return false;
    }
    const sup = suppliers.find((s) => s.id === p.fournisseurId);
    return sup?.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.note && p.note.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const totalDetteFournisseurs = suppliers.reduce((sum, s) => sum + (s.soldeDette || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand">Approvisionnement & Entrepôt</h1>
          <p className="mt-1 text-sm text-slate-500">Gérez vos fournisseurs, bons de commande, réceptions et dettes.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/entrepot/dispatch"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Truck className="h-4 w-4" /> Dispatch
          </Link>
          {activeTab === 'suppliers' && (
            <Button onClick={() => { setSelectedSupplier(null); setShowSupplierModal(true); }}>
              <Plus className="h-4 w-4" /> Nouveau fournisseur
            </Button>
          )}
          {activeTab === 'orders' && (
            <Button onClick={() => setShowPoModal(true)}>
              <Plus className="h-4 w-4" /> Rédiger un Bon
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4">
        <OfflineBanner message="Mode hors-ligne : la réception de commande et les transferts nécessitent une connexion." />
      </div>

      {/* KPI Cards (for suppliers & dettes) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="flex items-center gap-4 p-4 border border-brand/10 bg-brand/5">
          <div className="rounded-xl bg-brand/10 p-3 text-brand">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fournisseurs Actifs</div>
            <div className="text-xl font-bold text-slate-900">{suppliers.filter((s) => s.actif).length}</div>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-4 border border-red-100 bg-red-50/50">
          <div className="rounded-xl bg-red-100 p-3 text-red-600">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dette Fournisseurs</div>
            <div className="text-xl font-bold text-red-600">
              {totalDetteFournisseurs.toLocaleString('fr-FR')} FCFA
            </div>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-4 border border-emerald-100 bg-emerald-50/50">
          <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Commandes En Cours</div>
            <div className="text-xl font-bold text-emerald-600">
              {orders.filter((o) => o.statut === 'ORDERED' || o.statut === 'PARTIAL').length}
            </div>
          </div>
        </Card>
      </div>

      {/* Tab Switcher & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 border-b border-slate-200 pb-2">
        <div className="flex gap-2 text-sm font-medium">
          <button
            onClick={() => { setActiveTab('suppliers'); setSearchQuery(''); }}
            className={`pb-2 px-3 transition-colors border-b-2 ${
              activeTab === 'suppliers'
                ? 'border-brand text-brand font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Fournisseurs
          </button>
          <button
            onClick={() => { setActiveTab('orders'); setSearchQuery(''); }}
            className={`pb-2 px-3 transition-colors border-b-2 ${
              activeTab === 'orders'
                ? 'border-brand text-brand font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Bons de Commande
          </button>
          <button
            onClick={() => { setActiveTab('payments'); setSearchQuery(''); }}
            className={`pb-2 px-3 transition-colors border-b-2 ${
              activeTab === 'payments'
                ? 'border-brand text-brand font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Règlements & Dettes
          </button>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={
              activeTab === 'suppliers'
                ? 'Rechercher un fournisseur...'
                : activeTab === 'orders'
                ? 'Référence, fournisseur...'
                : 'Filtrer les règlements...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-4 text-sm text-slate-800 outline-none focus:border-brand"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Main content table */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <p className="text-sm text-slate-500">Chargement des données...</p>
        </div>
      ) : (
        <Card className="overflow-x-auto p-0 border border-slate-100 shadow-sm">
          {activeTab === 'suppliers' && (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-left font-medium">
                <tr>
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Téléphone / Contact</th>
                  <th className="px-4 py-3">Adresse</th>
                  <th className="px-4 py-3 text-right">Dette Courante</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">Aucun fournisseur trouvé.</td>
                  </tr>
                ) : (
                  filteredSuppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{s.nom}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {s.telephone && <div>{s.telephone}</div>}
                        {s.contact && <div className="text-xs text-slate-400">{s.contact}</div>}
                        {!s.telephone && !s.contact && '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{s.adresse ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">
                        {s.soldeDette.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="px-4 py-3 text-right flex justify-end gap-2">
                        {s.soldeDette > 0 && (
                          <Button size="sm" variant="outline" onClick={() => setShowPaymentModal(s)} className="text-xs border-brand text-brand hover:bg-brand/5">
                            Régler dette
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => { setSelectedSupplier(s); setShowSupplierModal(true); }} className="text-xs">
                          Modifier
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'orders' && (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-left font-medium">
                <tr>
                  <th className="px-4 py-3">Référence</th>
                  <th className="px-4 py-3">Fournisseur</th>
                  <th className="px-4 py-3">Destination</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">M. Total</th>
                  <th className="px-4 py-3 text-right">M. Reçu / Payé</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">Aucun bon de commande trouvé.</td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{o.reference}</td>
                      <td className="px-4 py-3 text-slate-800">{o.fournisseurNom ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{o.etablissementNom ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge tone={STATUS_TONES[o.statut]}>{STATUS_LABELS[o.statut]}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {o.montantTotal.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-slate-500">
                        <div>Reçu: {o.montantRecu.toLocaleString('fr-FR')}</div>
                        <div>Payé: {o.montantPaye.toLocaleString('fr-FR')}</div>
                      </td>
                      <td className="px-4 py-3 text-right flex justify-end gap-2 items-center">
                        <button
                          onClick={() => setViewPoInvoice(o)}
                          className="p-1.5 text-slate-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors"
                          title="Voir la facture"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {(o.statut === 'ORDERED' || o.statut === 'PARTIAL') && (
                          <Link href={`/entrepot/reception/${o.id}`}>
                            <Button size="sm" className="text-xs bg-brand hover:bg-brand/90 text-white">
                              Réceptionner
                            </Button>
                          </Link>
                        )}
                        {(o.statut === 'DRAFT' || o.statut === 'ORDERED') && (
                          <Button size="sm" variant="outline" onClick={() => handleCancelOrder(o.id)} className="text-xs border-red-200 text-red-500 hover:bg-red-50">
                            Annuler
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'payments' && (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-left font-medium">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Fournisseur</th>
                  <th className="px-4 py-3">Méthode</th>
                  <th className="px-4 py-3 text-right">Montant Réglé</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">Aucun règlement trouvé.</td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => {
                    const supplier = suppliers.find((s) => s.id === p.fournisseurId);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-slate-500">{new Date(p.createdAt).toLocaleString('fr-FR')}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{supplier?.nom ?? 'Fournisseur inconnu'}</td>
                        <td className="px-4 py-3 text-slate-600">{p.methode}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600">
                          {p.montant.toLocaleString('fr-FR')} FCFA
                        </td>
                        <td className="px-4 py-3 text-slate-500">{p.note ?? '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Modals */}
      {showSupplierModal && (
        <SupplierFormModal
          supplier={selectedSupplier}
          onClose={() => setShowSupplierModal(false)}
          onSuccess={() => {
            setShowSupplierModal(false);
            void loadData();
          }}
        />
      )}

      {showPaymentModal && (
        <RecordSupplierPaymentModal
          supplier={showPaymentModal}
          onClose={() => setShowPaymentModal(null)}
          onSuccess={() => {
            setShowPaymentModal(null);
            void loadData();
          }}
        />
      )}

      {showPoModal && (
        <PurchaseOrderModal
          etablissements={etablissements}
          currentEtablissementId={currentEtablissementId}
          onClose={() => setShowPoModal(false)}
          onSuccess={() => {
            setShowPoModal(false);
            void loadData();
          }}
        />
      )}

      {viewPoInvoice && (
        <PurchaseOrderInvoiceModal
          order={viewPoInvoice}
          onClose={() => setViewPoInvoice(null)}
        />
      )}
    </div>
  );
}
