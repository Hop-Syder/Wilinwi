'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page Frontend CRM (Route: clients) — Gestion de la relation client, encaissement ciblé ou FIFO, et archivage.
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useEffect, useState, useMemo } from 'react';
import { 
  Plus, 
  Users, 
  Phone, 
  Wallet, 
  Search, 
  Filter, 
  MessageSquare, 
  Trash2, 
  Edit3, 
  UserPlus, 
  ArrowRight,
  Landmark,
  ShieldAlert,
  Archive,
  BookOpen,
  Calendar,
  DollarSign,
  X
} from 'lucide-react';
import { canSeeClientCredit, type ClientDto, PAYMENT_METHOD_LABELS, type PaymentMethod } from '@wilinwi/types';
import { Button, Card, Badge, formatFCFA } from '@wilinwi/ui';
import { apiGet, apiPost, apiPatch, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { readCache, writeCache } from '@wilinwi/offline';
import { ContextualHelp } from '@/components/contextual-help';
import type { TourStep } from '@/components/tour-guide';
import Link from 'next/link';
import { ReceiptModal, type ReceiptSale } from '@/components/receipt';

interface Sale extends ReceiptSale {
  status: 'COMPLETED' | 'PENDING_PAYMENT' | 'PENDING_APPROVAL' | 'CANCELLED';
  vendeur?: { id: string; nom: string; email: string } | null;
}

const STATUS_MAP: Record<Sale['status'], { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral'; color: string }> = {
  COMPLETED: { label: 'Payée', tone: 'success', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  PENDING_PAYMENT: { label: 'Crédit/Acompte', tone: 'warning', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  PENDING_APPROVAL: { label: 'À valider', tone: 'warning', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  CANCELLED: { label: 'Annulée', tone: 'danger', color: 'text-rose-700 bg-rose-50 border-rose-200' },
};

interface ClientDetail {
  client: ClientDto;
  ventes: (Omit<Sale, 'items'> & { 
    items: { 
      id: string; 
      quantite: number; 
      prixReel: number; 
      quantiteRetournee?: number; 
      product?: { nom: string } | null 
    }[] 
  })[];
  remboursements: { id: string; montant: number; createdAt: string; methode: string; note: string | null }[];
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

  // Clients & KPIs states
  const [clients, setClients] = useState<ClientDto[]>([]);
  const [kpis, setKpis] = useState<CrmKpis>({ totalDette: 0, debiteurs: 0, remboursementsAujourdhui: 0, creditDisponible: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [clientDetail, setClientDetail] = useState<ClientDetail | null>(null);

  // Receipts
  const [activeReceiptSale, setActiveReceiptSale] = useState<Sale | null>(null);

  // Ventes à crédit calculées localement
  const ventesACredit = useMemo(() => {
    if (!clientDetail) return [];
    return clientDetail.ventes.filter(v => v.status === 'PENDING_PAYMENT');
  }, [clientDetail]);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debtFilter, setDebtFilter] = useState<'ALL' | 'DEBTORS' | 'NO_DEBT' | 'LIMIT_WARNING'>('ALL');
  
  // Modals & UI Toggles
  const [showAddForm, setShowAddForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Repayment form state
  const [repayAmount, setRepayAmount] = useState('');
  const [repayMethod, setRepayMethod] = useState<PaymentMethod>('CASH');
  const [repayNote, setRepayNote] = useState('');
  const [repaySaleId, setRepaySaleId] = useState<string>('');

  // Edit/Add Form states
  const [form, setForm] = useState({ nom: '', telephone: '', notes: '', plafondCredit: '' });

  const tourSteps: TourStep[] = [
    {
      targetId: 'tour-clients-new',
      title: 'Gérer vos clients',
      content: 'Créez une fiche client avec ses coordonnées et définissez un plafond de crédit si nécessaire.',
      position: 'bottom',
    },
    {
      targetId: 'tour-clients-crm',
      title: 'Registre CRM deux colonnes',
      content: 'Recherchez un client à gauche, puis consultez son historique complet et gérez ses remboursements à droite.',
      position: 'bottom',
    }
  ];

  // Clé de cache local namespacée par tenant + utilisateur (isolation multi-tenant).
  const cacheKey = (k: string) => (user ? `${user.tenantId}:${user.userId}:${k}` : null);

  // Fetch clients & KPIs — affichage instantané depuis le cache local (stale-while-revalidate),
  // puis rafraîchissement réseau en arrière-plan.
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
    } catch (e: any) {
      setError(e.message || "Erreur lors du chargement");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch single client detail when selectedId changes
  useEffect(() => {
    if (!selectedId) {
      setClientDetail(null);
      setIsEditing(false);
      return;
    }
    const loadDetail = async () => {
      try {
        const detail = await apiGet<ClientDetail>(`/api/crm/clients/${selectedId}`);
        setClientDetail(detail);
        setForm({
          nom: detail.client.nom,
          telephone: detail.client.telephone || '',
          notes: detail.client.notes || '',
          plafondCredit: detail.client.plafondCredit ? detail.client.plafondCredit.toString() : '',
        });
      } catch (err: any) {
        alert(err.message || "Erreur lors du chargement des détails");
      }
    };
    loadDetail();
  }, [selectedId]);

  // Handle client selection
  const handleSelectClient = (id: string) => {
    setSelectedId(id);
    setIsEditing(false);
  };

  // Filter clients list
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      // 1. Search Query
      const matchSearch = c.nom.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (c.telephone ?? '').includes(searchQuery);

      if (!matchSearch) return false;

      // 2. Debt Filter
      if (!seeCredit) return true;
      const solde = c.soldeCredit ?? 0;
      const plafond = c.plafondCredit ?? null;

      if (debtFilter === 'DEBTORS') return solde > 0;
      if (debtFilter === 'NO_DEBT') return solde === 0;
      if (debtFilter === 'LIMIT_WARNING') {
        if (plafond === null) return false;
        // Warning if debt is >= 85% of limit
        return solde >= plafond * 0.85;
      }
      return true;
    });
  }, [clients, searchQuery, debtFilter, seeCredit]);

  // Create Client
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await apiPost<ClientDto>('/api/crm/clients', {
        nom: form.nom,
        telephone: form.telephone || undefined,
        notes: form.notes || undefined,
        plafondCredit: form.plafondCredit ? Number(form.plafondCredit) : null,
      });
      setShowAddForm(false);
      setForm({ nom: '', telephone: '', notes: '', plafondCredit: '' });
      await loadData();
      setSelectedId(created.id);
    } catch (e: any) {
      setError(e.message || "Erreur de création");
    } finally {
      setBusy(false);
    }
  };

  // Update Client
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
      setIsEditing(false);
      await loadData();
      // Reload details
      const detail = await apiGet<ClientDetail>(`/api/crm/clients/${selectedId}`);
      setClientDetail(detail);
    } catch (e: any) {
      alert(e.message || "Erreur de mise à jour");
    } finally {
      setBusy(false);
    }
  };

  // Archive Client
  const handleArchiveClient = async () => {
    if (!selectedId || !confirm("Archiver ce client ? Sa fiche n'apparaîtra plus dans la liste active.")) return;
    setBusy(true);
    try {
      await apiPatch(`/api/crm/clients/${selectedId}`, { actif: false });
      setSelectedId(null);
      await loadData();
    } catch (e: any) {
      alert(e.message || "Erreur d'archivage");
    } finally {
      setBusy(false);
    }
  };

  // Encaisser remboursement
  const handleRepay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !repayAmount) return;
    const amount = Number(repayAmount);
    
    setBusy(true);
    try {
      await apiPost(`/api/crm/clients/${selectedId}/payments`, {
        montant: amount,
        methode: repayMethod,
        note: repayNote || undefined,
        saleId: repaySaleId || undefined,
      });

      setRepayAmount('');
      setRepayNote('');
      setRepaySaleId('');
      setShowRepayModal(false);
      
      // Reload details & stats
      await loadData();
      const detail = await apiGet<ClientDetail>(`/api/crm/clients/${selectedId}`);
      setClientDetail(detail);
    } catch (e: any) {
      alert(e.message || "Erreur de paiement");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-black tracking-tight text-slate-900 bg-gradient-to-r from-slate-900 to-brand bg-clip-text text-transparent">Gestion Relation Client (CRM)</h1>
          <p className="mt-1 text-sm text-slate-500">Suivi des fiches clients, limites de crédits autorisées et recouvrement.</p>
        </div>
        <div className="flex items-center gap-2" id="tour-clients-new">
          <ContextualHelp 
            storageKey="wilinwi_clients_tour_done"
            tourSteps={tourSteps}
            useCases={[
              { title: 'Vente à crédit', description: 'Sélectionnez un client et cochez "Crédit" ou "Acompte" en caisse pour générer une dette automatique.' },
              { title: 'Lettrage de remboursement', description: 'Lors d\'un encaissement, vous pouvez lettrer sur une vente précise ou utiliser le mode FIFO.' },
              { title: 'Plafonds de crédit', description: 'Empêche le vendeur d\'autoriser des ventes si le plafond défini pour le client est dépassé.' }
            ]}
          />
          {canWrite && (
            <Button onClick={() => { setShowAddForm(true); setSelectedId(null); }}>
              <Plus className="h-4 w-4 mr-1.5" /> Nouveau client
            </Button>
          )}
        </div>
      </div>

      {/* Cartes KPI */}
      {seeCredit && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-white to-red-50/20 border-red-100/50 shadow-sm relative overflow-hidden group">
            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Dette totale active</span>
            <span className="block mt-2 font-display text-2xl font-black text-rose-700">{formatFCFA(kpis.totalDette)}</span>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-white to-amber-50/20 border-amber-100/50 shadow-sm relative overflow-hidden group">
            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Clients Débiteurs</span>
            <span className="block mt-2 font-display text-2xl font-black text-amber-700">{kpis.debiteurs}</span>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-white to-emerald-50/20 border-emerald-100/50 shadow-sm relative overflow-hidden group">
            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Recouvrements du jour</span>
            <span className="block mt-2 font-display text-2xl font-black text-emerald-700">{formatFCFA(kpis.remboursementsAujourdhui)}</span>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-white to-slate-50 border-slate-200/60 shadow-sm relative overflow-hidden group">
            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Crédit Disponible global</span>
            <span className="block mt-2 font-display text-2xl font-black text-slate-800">{formatFCFA(kpis.creditDisponible)}</span>
          </Card>
        </div>
      )}

      {/* Grid deux colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" id="tour-clients-crm">
        {/* Colonne gauche : liste des clients */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-4 space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher par nom, téléphone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>

            {seeCredit && (
              <div className="flex flex-col gap-1 text-xs">
                <span className="font-semibold text-slate-500 uppercase tracking-wider mb-1">Filtrer par dette</span>
                <div className="flex flex-wrap gap-1">
                  <button 
                    onClick={() => setDebtFilter('ALL')}
                    className={`px-2.5 py-1 rounded-full border transition-colors ${debtFilter === 'ALL' ? 'bg-brand text-white border-brand font-bold' : 'bg-slate-50 hover:bg-slate-100'}`}
                  >
                    Tous
                  </button>
                  <button 
                    onClick={() => setDebtFilter('DEBTORS')}
                    className={`px-2.5 py-1 rounded-full border transition-colors ${debtFilter === 'DEBTORS' ? 'bg-red-50 text-red-700 border-red-200 font-bold' : 'bg-slate-50 hover:bg-slate-100'}`}
                  >
                    Débiteurs
                  </button>
                  <button 
                    onClick={() => setDebtFilter('LIMIT_WARNING')}
                    className={`px-2.5 py-1 rounded-full border transition-colors ${debtFilter === 'LIMIT_WARNING' ? 'bg-amber-50 text-amber-700 border-amber-200 font-bold' : 'bg-slate-50 hover:bg-slate-100'}`}
                  >
                    Proche limite
                  </button>
                </div>
              </div>
            )}
          </Card>

          {/* Liste dense des clients */}
          <Card className="p-0 overflow-hidden max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
            {filteredClients.map((c) => {
              const hasDebt = (c.soldeCredit ?? 0) > 0;
              const isSelected = selectedId === c.id;
              
              return (
                <button
                  key={c.id}
                  onClick={() => handleSelectClient(c.id)}
                  className={`w-full text-left p-3.5 flex justify-between items-center transition-colors ${isSelected ? 'bg-slate-50 border-l-4 border-brand pl-2.5' : 'hover:bg-slate-50/50 bg-white'}`}
                >
                  <div className="space-y-0.5">
                    <span className="block font-semibold text-slate-800 text-sm">{c.nom}</span>
                    {c.telephone && (
                      <span className="block text-slate-400 text-xs flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {c.telephone}
                      </span>
                    )}
                  </div>
                  {seeCredit && c.soldeCredit !== undefined && (
                    <div className="text-right">
                      {c.soldeCredit > 0 ? (
                        <span className="px-2 py-0.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-150 rounded-full">
                          {formatFCFA(c.soldeCredit)}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Sain</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
            {filteredClients.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">
                <Users className="mx-auto h-8 w-8 text-slate-350 mb-2" />
                Aucun client trouvé.
              </div>
            )}
          </Card>
        </div>

        {/* Colonne droite : Fiche client ou Formulaire création */}
        <div className="lg:col-span-8">
          {showAddForm && canWrite && (
            <Card className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-display text-xl font-bold text-brand flex items-center gap-1.5">
                  <UserPlus className="h-5 w-5" /> Nouvelle fiche client
                </h2>
                <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateClient} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block text-sm">
                    <span className="block font-semibold text-slate-700 mb-1">Nom complet *</span>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Christian Christian"
                      value={form.nom}
                      onChange={(e) => setForm(prev => ({ ...prev, nom: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="block font-semibold text-slate-700 mb-1">Téléphone (optionnel)</span>
                    <input
                      type="tel"
                      placeholder="Ex: +22997000000"
                      value={form.telephone}
                      onChange={(e) => setForm(prev => ({ ...prev, telephone: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <label className="block text-sm">
                    <span className="block font-semibold text-slate-700 mb-1">Plafond de crédit autorisé (FCFA, vide = illimité)</span>
                    <input
                      type="number"
                      placeholder="Ex: 100000"
                      value={form.plafondCredit}
                      onChange={(e) => setForm(prev => ({ ...prev, plafondCredit: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="block font-semibold text-slate-700 mb-1">Notes / Remarques</span>
                    <textarea
                      placeholder="Adresse, contraintes, confiance..."
                      value={form.notes}
                      onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand resize-none"
                    />
                  </label>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <Button variant="outline" type="button" onClick={() => setShowAddForm(false)}>
                    Annuler
                  </Button>
                  <Button variant="emerald" type="submit" disabled={busy}>
                    {busy ? 'Enregistrement...' : 'Créer la fiche'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Fiche Détail Client */}
          {clientDetail && !showAddForm && (
            <Card className="p-6 divide-y divide-slate-100 space-y-6">
              {/* Entête client */}
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 pb-6">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="font-display text-2xl font-black text-slate-800">{clientDetail.client.nom}</h2>
                    {!clientDetail.client.actif && <Badge tone="danger">Inactif</Badge>}
                  </div>
                  
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500 font-medium">
                    {clientDetail.client.telephone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <a href={`tel:${clientDetail.client.telephone}`} className="hover:text-brand transition-colors">
                          {clientDetail.client.telephone}
                        </a>
                        <a 
                          href={`https://wa.me/${(clientDetail.client.telephone).replace(/[^0-9]/g, '')}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-emerald-500 hover:text-emerald-600 ml-1 bg-emerald-50 p-1 rounded-full"
                          title="Message WhatsApp"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                  {clientDetail.client.notes && (
                    <p className="mt-3 text-sm text-slate-500 italic bg-slate-50 p-3 rounded-lg border">
                      « {clientDetail.client.notes} »
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 shrink-0">
                  <Link href={`/pos?clientId=${clientDetail.client.id}`}>
                    <Button variant="outline" className="border-slate-200 hover:border-brand/40 text-slate-700 hover:text-brand flex items-center gap-1.5">
                      <ArrowRight className="h-4 w-4" /> Vendre
                    </Button>
                  </Link>
                  {canWrite && (
                    <>
                      <Button variant="outline" onClick={() => setIsEditing(true)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="danger" onClick={handleArchiveClient} className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-150">
                        <Archive className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Formulaire d'édition si activé */}
              {isEditing && canWrite && (
                <div className="py-6 animate-in slide-in-from-top-3 duration-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Modifier la fiche client</h3>
                  <form onSubmit={handleUpdateClient} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="block text-sm">
                        <span className="block font-semibold text-slate-700 mb-1">Nom complet</span>
                        <input
                          type="text"
                          required
                          value={form.nom}
                          onChange={(e) => setForm(prev => ({ ...prev, nom: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand/20"
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="block font-semibold text-slate-700 mb-1">Téléphone</span>
                        <input
                          type="tel"
                          value={form.telephone}
                          onChange={(e) => setForm(prev => ({ ...prev, telephone: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand/20"
                        />
                      </label>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <label className="block text-sm">
                        <span className="block font-semibold text-slate-700 mb-1">Plafond de crédit (vide = illimité)</span>
                        <input
                          type="number"
                          value={form.plafondCredit}
                          onChange={(e) => setForm(prev => ({ ...prev, plafondCredit: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand/20"
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="block font-semibold text-slate-700 mb-1">Notes</span>
                        <textarea
                          value={form.notes}
                          onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                          rows={2}
                          className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand/20 resize-none"
                        />
                      </label>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" type="button" onClick={() => setIsEditing(false)}>Annuler</Button>
                      <Button type="submit" disabled={busy}>Mettre à jour</Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Analyse des crédits client */}
              {seeCredit && (
                <div className="py-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Indicateur Dette */}
                    <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Dette actuelle</span>
                        <span className="block mt-1.5 text-3xl font-black text-rose-800">
                          {formatFCFA(clientDetail.client.soldeCredit ?? 0)}
                        </span>
                      </div>
                      
                      {canCollect && (clientDetail.client.soldeCredit ?? 0) > 0 && (
                        <Button 
                          onClick={() => {
                            setRepayAmount('');
                            setRepayNote('');
                            setRepaySaleId('');
                            setShowRepayModal(true);
                          }} 
                          className="w-full bg-rose-600 hover:bg-rose-700 text-white mt-4 justify-center"
                        >
                          Encaisser un remboursement
                        </Button>
                      )}
                    </div>

                    {/* Plafond de crédit et utilisation */}
                    <div className="border border-slate-200/80 rounded-2xl p-4 space-y-4 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Plafond de crédit</span>
                          <span className="font-semibold text-slate-800 text-sm">
                            {clientDetail.client.plafondCredit === null ? 'Illimité' : formatFCFA(clientDetail.client.plafondCredit ?? 0)}
                          </span>
                        </div>
                        
                        {clientDetail.client.plafondCredit !== null && clientDetail.client.plafondCredit !== undefined && (
                          <div className="mt-4 space-y-1">
                            <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                              <span>Utilisation</span>
                              <span>{Math.round(((clientDetail.client.soldeCredit ?? 0) / clientDetail.client.plafondCredit) * 100)} %</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  (clientDetail.client.soldeCredit ?? 0) >= clientDetail.client.plafondCredit * 0.85
                                    ? 'bg-rose-500' 
                                    : 'bg-brand'
                                }`}
                                style={{ width: `${Math.min(((clientDetail.client.soldeCredit ?? 0) / clientDetail.client.plafondCredit) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-2 bg-slate-50 p-2.5 rounded-lg border">
                        <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
                        <span>En caisse, les dettes bloquent si le plafond autorisé est franchi.</span>
                      </div>
                    </div>
                  </div>

                  {/* Ventes à crédit (dettes ouvertes) */}
                  <div className="pt-2">
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Dettes Ouvertes</span>
                    {ventesACredit.length === 0 ? (
                      <p className="text-slate-400 text-xs italic p-3 text-center border rounded-lg bg-slate-50/50">Aucune dette ouverte pour ce client.</p>
                    ) : (
                      <div className="border rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50 border-b text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                            <tr>
                              <th className="px-4 py-2.5 text-left">Date</th>
                              <th className="px-4 py-2.5 text-left">N° Vente</th>
                              <th className="px-4 py-2.5 text-right">Déjà payé</th>
                              <th className="px-4 py-2.5 text-right">Reste dû</th>
                              <th className="px-4 py-2.5 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {ventesACredit.map((s) => {
                              const reste = s.total - s.montantVerse;
                              return (
                                <tr key={s.id} className="hover:bg-slate-50/40">
                                  <td className="px-4 py-2.5 text-slate-500">
                                    {new Date(s.createdAt).toLocaleDateString('fr-FR')}
                                  </td>
                                  <td className="px-4 py-2.5 font-mono text-brand font-semibold">
                                    #{s.id.slice(0, 8).toUpperCase()}
                                  </td>
                                  <td className="px-4 py-2.5 text-right tabular text-slate-500">
                                    {formatFCFA(s.montantVerse)}
                                  </td>
                                  <td className="px-4 py-2.5 text-right tabular font-bold text-rose-600">
                                    {formatFCFA(reste)}
                                  </td>
                                  <td className="px-4 py-2.5 text-right tabular font-semibold text-slate-800">
                                    {formatFCFA(s.total)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Historique complet des ventes */}
                  <div className="pt-2">
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Historique des Ventes (100 dernières)</span>
                    {clientDetail.ventes.length === 0 ? (
                      <p className="text-slate-400 text-xs italic p-3 text-center border rounded-lg bg-slate-50/50">Aucune vente enregistrée pour ce client.</p>
                    ) : (
                      <div className="border rounded-xl overflow-hidden shadow-sm max-h-60 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50 border-b text-slate-500 font-semibold uppercase tracking-wider text-[10px] sticky top-0">
                            <tr>
                              <th className="px-4 py-2.5 text-left bg-slate-50">Date</th>
                              <th className="px-4 py-2.5 text-left bg-slate-50">N° Vente</th>
                              <th className="px-4 py-2.5 text-left bg-slate-50">Articles</th>
                              <th className="px-4 py-2.5 text-center bg-slate-50">Statut</th>
                              <th className="px-4 py-2.5 text-right bg-slate-50">Total</th>
                              <th className="px-4 py-2.5 text-center bg-slate-50 no-print">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {clientDetail.ventes.map((s) => {
                              const badgeStyle = STATUS_MAP[s.status] || { label: s.status, color: 'text-slate-700 bg-slate-50 border-slate-200' };
                              const totalReturned = s.items.reduce((sum, item) => sum + (item.quantiteRetournee || 0), 0);
                              return (
                                <tr key={s.id} className="hover:bg-slate-50/40">
                                  <td className="px-4 py-2.5 text-slate-500">
                                    {new Date(s.createdAt).toLocaleDateString('fr-FR')}
                                  </td>
                                  <td className="px-4 py-2.5 font-mono text-brand font-semibold">
                                    #{s.id.slice(0, 8).toUpperCase()}
                                  </td>
                                  <td className="px-4 py-2.5 text-slate-600 max-w-[200px] truncate" title={s.items.map(it => `${it.quantite}x ${it.product?.nom || 'Article'}`).join(', ')}>
                                    {s.items.map(it => `${it.quantite}x ${it.product?.nom || 'Article'}`).join(', ')}
                                  </td>
                                  <td className="px-4 py-2.5 text-center">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${badgeStyle.color}`}>
                                      {badgeStyle.label}
                                      {totalReturned > 0 && <span className="ml-1 text-[9px] px-1 bg-red-100 text-red-800 rounded">Retour ({totalReturned})</span>}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-right tabular font-semibold text-slate-800">
                                    {formatFCFA(s.total)}
                                  </td>
                                  <td className="px-4 py-2.5 text-center no-print">
                                    <Button 
                                      variant="outline" 
                                      className="h-7 px-2 text-[10px] border-slate-200 hover:border-brand/40 text-slate-700 hover:text-brand" 
                                      onClick={() => setActiveReceiptSale(s)}
                                    >
                                      Reçu
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Historique des remboursements */}
                  <div className="pt-2">
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Historique des remboursements (50 derniers)</span>
                    {clientDetail.remboursements.length === 0 ? (
                      <p className="text-slate-400 text-xs italic p-3 text-center border rounded-lg bg-slate-50/50">Aucun remboursement enregistré.</p>
                    ) : (
                      <div className="border rounded-xl overflow-hidden shadow-sm max-h-48 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50 border-b text-slate-500 font-semibold uppercase tracking-wider text-[10px] sticky top-0">
                            <tr>
                              <th className="px-4 py-2.5 text-left bg-slate-50">Date</th>
                              <th className="px-4 py-2.5 text-left bg-slate-50">Moyen</th>
                              <th className="px-4 py-2.5 text-left bg-slate-50">Note</th>
                              <th className="px-4 py-2.5 text-right bg-slate-50">Montant</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {clientDetail.remboursements.map((p) => (
                              <tr key={p.id} className="hover:bg-slate-50/40">
                                <td className="px-4 py-2.5 text-slate-500">
                                  {new Date(p.createdAt).toLocaleDateString('fr-FR')}
                                </td>
                                <td className="px-4 py-2.5 text-slate-600 font-medium">
                                  {PAYMENT_METHOD_LABELS[p.methode as PaymentMethod] || p.methode}
                                </td>
                                <td className="px-4 py-2.5 text-slate-500 italic max-w-[120px] truncate">
                                  {p.note || '—'}
                                </td>
                                <td className="px-4 py-2.5 text-right tabular font-bold text-emerald-700">
                                  +{formatFCFA(p.montant)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* État vide si aucun sélectionné */}
          {!clientDetail && !showAddForm && (
            <Card className="p-16 text-center border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 bg-white">
              <Users className="h-12 w-12 text-slate-300 mb-3" />
              <h3 className="text-lg font-bold text-slate-700">Aucun client sélectionné</h3>
              <p className="text-sm mt-1 max-w-sm">Sélectionnez un client dans le volet de gauche ou créez-en un nouveau pour suivre son profil commercial.</p>
            </Card>
          )}
        </div>
      </div>

      {/* MODALE D'ENCAISSEMENT DES REMBOURSEMENTS */}
      {showRepayModal && clientDetail && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[95vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Enregistrer un remboursement</h3>
              <button onClick={() => setShowRepayModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-5 bg-rose-50 border border-rose-100 rounded-lg p-3 text-xs space-y-1">
              <p>Client : <span className="font-bold text-slate-800">{clientDetail.client.nom}</span></p>
              <p>Dette actuelle : <span className="font-bold text-rose-700">{formatFCFA(clientDetail.client.soldeCredit ?? 0)}</span></p>
            </div>

            <form onSubmit={handleRepay} className="space-y-4">
              {/* Choix lettrage / Vente */}
              <label className="block text-sm">
                <span className="block font-semibold text-slate-700 mb-1">Affecter à une dette</span>
                <select
                  value={repaySaleId}
                  onChange={(e) => setRepaySaleId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-brand/20"
                >
                  <option value="">Répartition automatique FIFO (plus ancienne d'abord)</option>
                  {ventesACredit.map(s => {
                    const balance = s.total - s.montantVerse;
                    return (
                      <option key={s.id} value={s.id}>
                        Vente #{s.id.slice(0, 8).toUpperCase()} ({new Date(s.createdAt).toLocaleDateString('fr-FR')}) — Reste : {balance} F
                      </option>
                    );
                  })}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-4">
                {/* Montant */}
                <label className="block text-sm">
                  <span className="block font-semibold text-slate-700 mb-1">Montant (FCFA) *</span>
                  <input
                    type="number"
                    required
                    placeholder="Ex: 5000"
                    value={repayAmount}
                    onChange={(e) => setRepayAmount(e.target.value)}
                    max={clientDetail.client.soldeCredit}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </label>

                {/* Moyen de Paiement */}
                <label className="block text-sm">
                  <span className="block font-semibold text-slate-700 mb-1">Moyen de paiement</span>
                  <select
                    value={repayMethod}
                    onChange={(e) => setRepayMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-brand/20"
                  >
                    <option value="CASH">Espèces</option>
                    <option value="MOBILE_MONEY">Mobile Money</option>
                    <option value="BANK_TRANSFER">Virement bancaire</option>
                  </select>
                </label>
              </div>

              {/* Note */}
              <label className="block text-sm">
                <span className="block font-semibold text-slate-700 mb-1">Remarques (optionnel)</span>
                <input
                  type="text"
                  placeholder="Justification, reçu n°..."
                  value={repayNote}
                  onChange={(e) => setRepayNote(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand/20"
                />
              </label>

              <div className="pt-2 flex gap-3">
                <Button variant="outline" type="button" className="flex-1" onClick={() => setShowRepayModal(false)}>
                  Annuler
                </Button>
                <Button 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700" 
                  type="submit" 
                  disabled={busy || !repayAmount}
                >
                  {busy ? 'Enregistrement...' : 'Confirmer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeReceiptSale && (
        <ReceiptModal 
          sale={{
            ...activeReceiptSale,
            client: clientDetail?.client ? { nom: clientDetail.client.nom, telephone: clientDetail.client.telephone } : null
          }} 
          onClose={() => setActiveReceiptSale(null)} 
        />
      )}
    </div>
  );
}
