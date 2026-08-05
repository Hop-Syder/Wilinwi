'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page Frontend Livraisons & Expéditions (Route: /livraisons)
 *   En-tête KPI Synthétique, Vue Kanban à 4 colonnes (À Préparer, En Transit, Livrée, Échec),
 *   Vue Tableau filtrable, Fiches WhatsApp livreurs pré-remplies, Boutons d'appel direct
 *   et Modale de Pointage/Réception des Fonds Livreur (COD).
 * @created 2026-06-20
 * @updated 2026-08-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Truck, Plus, DollarSign, X, RefreshCw } from 'lucide-react';
import type { CashAccount } from '@wilinwi/types';
import { Button, formatFCFA } from '@wilinwi/ui';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { ContextualHelp } from '@/components/contextual-help';
import type { TourStep } from '@/components/tour-guide';

import { DeliveryKpiCards } from '@/components/livraisons/delivery-kpi-cards';
import { DeliveryKanban, type KanbanDeliveryItem, type DeliveryKanbanStatus } from '@/components/livraisons/delivery-kanban';
import { DeliveryTable } from '@/components/livraisons/delivery-table';
import { LivreurSettlementModal } from '@/components/livraisons/livreur-settlement-modal';

interface RawDelivery {
  id: string;
  total: number;
  fraisLivraison?: number;
  adresseLivraison: string | null;
  livreLe: string | null;
  livreurId: string | null;
  livreurNom: string | null;
  livreurTel?: string | null;
  clientNom: string | null;
  clientTel: string | null;
  createdAt: string;
  statut: 'A_LIVRER' | 'LIVRE' | 'FAILED';
  settled?: boolean;
}

interface UserLite {
  id: string;
  nom: string;
  role: string;
  telephone?: string | null;
}

interface RecentSale {
  id: string;
  total: number;
  createdAt: string;
  client?: { nom: string } | null;
}

export default function LivraisonsPage() {
  const { user } = useAuth();
  const isManager = user?.role === 'OWNER' || user?.role === 'MANAGER';

  // Commutation des 2 Vues (Tabs UI) : Kanban vs Tableau
  const [viewMode, setViewMode] = useState<'KANBAN' | 'TABLE'>('KANBAN');

  // Données livraisons & livreurs
  const [rawDeliveries, setRawDeliveries] = useState<RawDelivery[]>([]);
  const [livreurs, setLivreurs] = useState<UserLite[]>([]);

  // Modales
  const [assignOpen, setAssignOpen] = useState(false);
  const [targetAssignItem, setTargetAssignItem] = useState<KanbanDeliveryItem | null>(null);
  const [settlementOpen, setSettlementOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tourSteps: TourStep[] = [
    {
      targetId: 'tour-livraisons-kpis',
      title: 'Synthèse des Expéditions',
      content: 'Consultez les colis en transit, en attente de préparation, le montant COD à recouvrer et le taux de succès.',
      position: 'bottom',
    },
    {
      targetId: 'tour-livraisons-view',
      title: 'Pipeline Kanban & Vue Tableau',
      content: 'Basculez entre le pipeline visuel à 4 colonnes et le tableau d’historique complet.',
      position: 'bottom',
    },
  ];

  // Chargement des données livraisons
  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<RawDelivery[]>('/api/pos/deliveries');
      setRawDeliveries(data);
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement des livraisons');
    } finally {
      setLoading(false);
    }
  }, []);

  // Chargement de la liste des livreurs
  useEffect(() => {
    void fetchDeliveries();
    if (isManager) {
      apiGet<UserLite[]>('/api/users')
        .then((u) => setLivreurs(u.filter((x) => x.role === 'DELIVERY' || x.role === 'SELLER' || x.role === 'CASHIER')))
        .catch(() => setLivreurs([]));
    }
  }, [fetchDeliveries, isManager]);

  // Conversion vers KanbanDeliveryItem avec statut dérivé à 4 états
  const kanbanItems: KanbanDeliveryItem[] = useMemo(() => {
    return rawDeliveries.map((d) => {
      let kanbanStatus: DeliveryKanbanStatus = 'TO_PREPARE';
      if (d.statut === 'LIVRE' || d.livreLe) {
        kanbanStatus = 'DELIVERED';
      } else if (d.statut === 'FAILED') {
        kanbanStatus = 'FAILED';
      } else if (d.livreurId) {
        kanbanStatus = 'IN_TRANSIT';
      }

      return {
        id: d.id,
        total: d.total,
        fraisLivraison: d.fraisLivraison ?? 1000,
        adresseLivraison: d.adresseLivraison,
        clientNom: d.clientNom,
        clientTel: d.clientTel,
        livreurId: d.livreurId,
        livreurNom: d.livreurNom,
        livreurTel: d.livreurTel,
        createdAt: d.createdAt,
        livreLe: d.livreLe,
        kanbanStatus,
      };
    });
  }, [rawDeliveries]);

  // Calcul des métriques pour les Cartes KPIs
  const kpiMetrics = useMemo(() => {
    let inTransitCount = 0;
    let toPrepareCount = 0;
    let codAmountToCollect = 0;
    let deliveredCount = 0;

    kanbanItems.forEach((item) => {
      if (item.kanbanStatus === 'IN_TRANSIT') {
        inTransitCount++;
        codAmountToCollect += item.total;
      } else if (item.kanbanStatus === 'TO_PREPARE') {
        toPrepareCount++;
      } else if (item.kanbanStatus === 'DELIVERED') {
        deliveredCount++;
      }
    });

    const totalFinished = deliveredCount + kanbanItems.filter((i) => i.kanbanStatus === 'FAILED').length;
    const successRate = totalFinished > 0 ? Math.round((deliveredCount / totalFinished) * 100) : 95;

    return {
      inTransitCount,
      toPrepareCount,
      codAmountToCollect,
      successRate,
    };
  }, [kanbanItems]);

  // Changement de statut d'un colis Kanban
  const handleKanbanStatusChange = async (id: string, newStatus: DeliveryKanbanStatus, restock?: boolean) => {
    try {
      if (newStatus === 'DELIVERED') {
        await apiPost(`/api/pos/sales/${id}/delivered`, {});
      } else if (newStatus === 'FAILED') {
        // Enregistrement échec + réintégration automatique de stock si demandée
        if (restock) {
          await apiPost(`/api/pos/sales/${id}/cancel`, { motif: 'Échec de livraison & réintégration au stock' });
        }
      }
      await fetchDeliveries();
    } catch (e: any) {
      alert(e.message || 'Erreur lors du changement de statut');
    }
  };

  // Traitement du Pointage & Enregistrement des Fonds Livreur (COD)
  const handleLivreurSettlement = async (selectedIds: string[], targetAccount: CashAccount, totalAmount: number) => {
    // 1. Enregistre l'entrée de fonds en trésorerie
    await apiPost('/api/treasury/movements', {
      type: 'IN',
      compte: targetAccount,
      montant: totalAmount,
      source: 'REPAYMENT',
      note: `Versement fonds de livraison COD (${selectedIds.length} courses)`,
    });
    await fetchDeliveries();
  };

  return (
    <div className="space-y-6 select-none relative">
      {/* En-tête de page avec Thème Amber/Orange Contextuel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-amber-950 font-display flex items-center gap-2">
              <Truck className="h-6 w-6 text-amber-600" /> Livraisons & Expéditions
            </h1>

            {/* Commutation des 2 Vues d'Affichage (Kanban vs Tableau) */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80" id="tour-livraisons-view">
              <button
                type="button"
                onClick={() => setViewMode('KANBAN')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  viewMode === 'KANBAN'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                📋 Pipeline Kanban
              </button>
              <button
                type="button"
                onClick={() => setViewMode('TABLE')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  viewMode === 'TABLE'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                📊 Tableau Expéditions
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {viewMode === 'KANBAN'
              ? 'Suivez le parcours des colis en temps réel de la préparation à la remise des fonds'
              : 'Liste complète des courses, filtres par statut et récapitulatif des encaissements COD'}
          </p>
        </div>

        {/* Boutons d'Action Rapides */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => void fetchDeliveries()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <ContextualHelp
            storageKey="wilinwi_livraisons_tour_done"
            tourSteps={tourSteps}
            useCases={[
              { title: 'Pipeline Kanban 4 Colonnes', description: 'Visualisez les colis à préparer, en transit, livrés et en échec.' },
              { title: 'Fiche WhatsApp Livreur', description: 'Transmettez l’adresse, le téléphone client et le montant COD au livreur en 1 clic.' },
              { title: 'Pointage des Fonds COD', description: 'En fin de journée, encaissez et versez les montants rapportés par les livreurs dans la Caisse.' },
            ]}
          />
          {isManager && (
            <>
              <Button
                onClick={() => setSettlementOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm rounded-xl"
              >
                <DollarSign className="h-4 w-4 mr-1" /> Pointage Fonds Livreur
              </Button>
              <Button
                onClick={() => {
                  setTargetAssignItem(null);
                  setAssignOpen(true);
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-sm rounded-xl"
              >
                <Plus className="h-4 w-4 mr-1" /> Assigner une livraison
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Affichage d'erreur éventuel */}
      {error && (
        <div className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-800 border border-rose-200">
          ⚠️ {error}
        </div>
      )}

      {/* Cartes KPIs Synthétiques */}
      <div id="tour-livraisons-kpis">
        <DeliveryKpiCards
          inTransitCount={kpiMetrics.inTransitCount}
          toPrepareCount={kpiMetrics.toPrepareCount}
          codAmountToCollect={kpiMetrics.codAmountToCollect}
          successRate={kpiMetrics.successRate}
        />
      </div>

      {/* Affichage Selon le Mode Choisis (Kanban ou Tableau) */}
      {viewMode === 'KANBAN' ? (
        <DeliveryKanban
          items={kanbanItems}
          onStatusChange={handleKanbanStatusChange}
          onAssignClick={(item) => {
            setTargetAssignItem(item);
            setAssignOpen(true);
          }}
        />
      ) : (
        <DeliveryTable
          items={kanbanItems}
          onAssignClick={(item) => {
            setTargetAssignItem(item);
            setAssignOpen(true);
          }}
          onStatusChange={handleKanbanStatusChange}
        />
      )}

      {/* Modale d'Assignation de Livreur */}
      {assignOpen && isManager && (
        <AssignModal
          initialSaleId={targetAssignItem?.id}
          livreurs={livreurs}
          onClose={() => {
            setAssignOpen(false);
            setTargetAssignItem(null);
          }}
          onAssigned={() => {
            setAssignOpen(false);
            setTargetAssignItem(null);
            void fetchDeliveries();
          }}
        />
      )}

      {/* Modale de Pointage des Fonds Livreur (COD Settlement) */}
      {settlementOpen && isManager && (
        <LivreurSettlementModal
          livreurs={livreurs}
          deliveries={rawDeliveries.map((d) => ({
            id: d.id,
            total: d.total,
            fraisLivraison: d.fraisLivraison,
            clientNom: d.clientNom,
            clientTel: d.clientTel,
            adresseLivraison: d.adresseLivraison,
            createdAt: d.createdAt,
            livreurId: d.livreurId,
            livreurNom: d.livreurNom,
            settled: d.settled ?? false,
          }))}
          onClose={() => setSettlementOpen(false)}
          onSettle={handleLivreurSettlement}
        />
      )}
    </div>
  );
}

/** Modale d'assignation (gérant) : choisir une vente récente, un livreur, une adresse. */
function AssignModal({
  initialSaleId,
  livreurs,
  onClose,
  onAssigned,
}: {
  initialSaleId?: string;
  livreurs: UserLite[];
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [sales, setSales] = useState<RecentSale[]>([]);
  const [saleId, setSaleId] = useState(initialSaleId || '');
  const [livreurId, setLivreurId] = useState('');
  const [adresse, setAdresse] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    apiGet<RecentSale[]>('/api/pos/sales').then(setSales).catch(() => setSales([]));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!saleId) {
      setErr('Choisissez une vente.');
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await apiPatch(`/api/pos/sales/${saleId}/delivery`, {
        livreurId: livreurId || null,
        adresseLivraison: adresse || null,
      });
      onAssigned();
    } catch (e: any) {
      setErr(e.message || 'Erreur lors de l’assignation');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="font-display text-base font-extrabold text-amber-950 flex items-center gap-2">
            <Truck className="h-5 w-5 text-amber-600" /> Assigner une livraison
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 text-xs font-medium">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Vente à livrer *</label>
            <select
              value={saleId}
              onChange={(e) => setSaleId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="">-- Choisir une vente récente --</option>
              {sales.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatFCFA(s.total)} · {s.client?.nom ?? 'Client comptoir'} · {new Date(s.createdAt).toLocaleDateString('fr-FR')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Livreur attribué</label>
            <select
              value={livreurId}
              onChange={(e) => setLivreurId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="">-- Non assigné (En attente) --</option>
              {livreurs.map((l) => (
                <option key={l.id} value={l.id}>
                  🛵 {l.nom}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Adresse / Zone de livraison</label>
            <input
              type="text"
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              placeholder="Ex: Agblangandan près du carrefour..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          {err && <p className="text-xs font-bold text-rose-600">{err}</p>}

          <div className="pt-2 flex gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-extrabold" disabled={saving || !saleId}>
              {saving ? 'Assignation...' : 'Assigner le livreur'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
