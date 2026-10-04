/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Interface professionnelle "Point de Stock & Récolement" (Inventaire physique)
 *   Permet de comparer le stock théorique de l'application avec le comptage physique en rayon,
 *   de détecter instantanément les écarts (manquants/surplus), de régulariser le stock en un clic,
 *   et de consulter l'historique complet des points de stock passés avec détails et rapports imprimables.
 * @created 2026-10-04
 * 🌐 nexus-partners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */

'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ClipboardCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  X,
  Printer,
  Save,
  Check,
  Loader2,
  History,
  Calendar,
  UserCheck,
  Eye,
  RefreshCw,
  FileText,
  Store,
  ArrowRight,
} from 'lucide-react';
import { Button, formatFCFA, cn } from '@wilinwi/ui';
import { apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { ProductDto } from '@wilinwi/types';
import { PrintBrandLogo } from '@/components/print-brand-logo';

export interface PointItem {
  id: string; // InventoryItem id or temp id
  productId: string;
  nom: string;
  baseUnit: string | null;
  unitKind?: string | null;
  prixVente: number;
  prixAchat?: number;
  quantiteTheorique: number;
  quantiteReelle: number | null;
  ecart: number | null;
}

export interface InventoryRecord {
  id: string;
  libelle: string | null;
  status: 'OPEN' | 'VALIDATED' | 'CANCELLED';
  motif: string | null;
  createdAt: string;
  validatedAt: string | null;
  validator?: { id: string; nom: string; email: string } | null;
  etablissement?: { id: string; nom: string } | null;
  items: Array<{
    id: string;
    productId: string;
    quantiteTheorique: number;
    quantiteReelle: number | null;
    ecart: number | null;
    product?: {
      id: string;
      nom: string;
      baseUnit: string | null;
      unitKind: string | null;
      prixVente: number;
      prixAchat: number;
    } | null;
  }>;
}

interface PointDeStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductDto[];
  onStockUpdated?: () => void;
  initialTab?: 'COUNT' | 'HISTORY';
}

export function PointDeStockModal({
  isOpen,
  onClose,
  products,
  onStockUpdated,
  initialTab = 'COUNT',
}: PointDeStockModalProps) {
  const { user } = useAuth();
  const canValidate = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const isGlobalView = user?.etablissementId === null && (user?.etablissements?.length ?? 0) > 1;

  // ── Navigation par Onglets ──
  const [activeTab, setActiveTab] = useState<'COUNT' | 'HISTORY'>(initialTab);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ── Inventaire Actif (Pointage en cours) ──
  const [activeInventoryId, setActiveInventoryId] = useState<string | null>(null);
  const [inventoryStatus, setInventoryStatus] = useState<'OPEN' | 'VALIDATED' | 'CANCELLED' | 'NEW'>('NEW');
  const [items, setItems] = useState<PointItem[]>([]);

  // Filtres UI du pointage
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'DISCREPANCIES' | 'PENDING' | 'MATCHING'>('ALL');

  // Modal de validation définitive
  const [showValidateConfirm, setShowValidateConfirm] = useState(false);
  const [validateMotif, setValidateMotif] = useState('Point de stock régulier / réconciliation physique');

  // ── Historique des points de stock ──
  const [historyList, setHistoryList] = useState<InventoryRecord[]>([]);
  const [busyHistory, setBusyHistory] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<InventoryRecord | null>(null);
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'ALL' | 'VALIDATED' | 'OPEN'>('ALL');

  // Initialisation à partir des produits locaux ou d'un inventaire ouvert
  const initFromProducts = useCallback(() => {
    const list: PointItem[] = products
      .filter((p) => (p.vendablePos ?? true) && p.type !== 'SERVICE' && p.type !== 'MANUFACTURED')
      .map((p) => {
        const theorique = p.stock ?? 0;
        return {
          id: p.id,
          productId: p.id,
          nom: p.nom,
          baseUnit: p.baseUnit,
          unitKind: p.unitKind,
          prixVente: p.prixCatalogue,
          prixAchat: p.prixAchat,
          quantiteTheorique: theorique,
          quantiteReelle: null,
          ecart: null,
        };
      });
    setItems(list);
    setInventoryStatus('NEW');
    setActiveInventoryId(null);
  }, [products]);

  // Charger le dernier inventaire ouvert ou initialiser
  const fetchActiveOrInit = useCallback(async () => {
    if (!isOpen || isGlobalView || !user?.etablissementId) return;
    setBusy(true);
    setError(null);
    try {
      const list = await apiGet<InventoryRecord[]>('/api/inventory');
      const openInv = list.find((inv) => inv.status === 'OPEN');
      if (openInv) {
        setActiveInventoryId(openInv.id);
        setInventoryStatus('OPEN');
        const pointItems: PointItem[] = openInv.items.map((it) => ({
          id: it.id,
          productId: it.productId,
          nom: it.product?.nom ?? 'Produit',
          baseUnit: it.product?.baseUnit ?? null,
          unitKind: it.product?.unitKind ?? null,
          prixVente: it.product?.prixVente ?? 0,
          prixAchat: it.product?.prixAchat ?? 0,
          quantiteTheorique: it.quantiteTheorique,
          quantiteReelle: it.quantiteReelle,
          ecart: it.ecart,
        }));
        setItems(pointItems);
      } else {
        initFromProducts();
      }
    } catch {
      initFromProducts();
    } finally {
      setBusy(false);
    }
  }, [isOpen, isGlobalView, user?.etablissementId, initFromProducts]);

  // Charger l'historique complet des inventaires
  const fetchHistory = useCallback(async () => {
    if (!isOpen) return;
    setBusyHistory(true);
    try {
      const list = await apiGet<InventoryRecord[]>('/api/inventory');
      setHistoryList(list ?? []);
    } catch (err: any) {
      console.error('Erreur chargement historique inventaire', err);
    } finally {
      setBusyHistory(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      void fetchActiveOrInit();
      void fetchHistory();
    }
  }, [isOpen, initialTab, fetchActiveOrInit, fetchHistory]);

  // Lancer officiellement une nouvelle session de pointage
  const handleStartSession = async (): Promise<string | null> => {
    if (isGlobalView || !user?.etablissementId) {
      setError('Sélectionnez une boutique concrète pour démarrer un point de stock.');
      return null;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await apiPost<InventoryRecord>('/api/inventory', {
        libelle: `Point de stock du ${new Date().toLocaleDateString('fr-FR')}`,
        productIds: items.map((i) => i.productId),
      });
      setActiveInventoryId(res.id);
      setInventoryStatus('OPEN');
      setSuccessMessage('Point de stock ouvert. Les stocks théoriques ont été figés.');
      setTimeout(() => setSuccessMessage(null), 3500);
      void fetchHistory();
      return res.id;
    } catch (e: any) {
      setError(e.message || 'Impossible de démarrer le point de stock.');
      return null;
    } finally {
      setBusy(false);
    }
  };

  // Mise à jour de la quantité réelle saisie pour un article
  const handleUpdateReelle = (productId: string, val: number | null) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        const reelle = val === null || isNaN(val) ? null : Number(val);
        const ecart = reelle !== null ? Number((reelle - item.quantiteTheorique).toFixed(3)) : null;
        return {
          ...item,
          quantiteReelle: reelle,
          ecart,
        };
      })
    );
  };

  // Raccourci : marquer un produit comme conforme au stock théorique
  const handleMarkMatching = (productId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        return {
          ...item,
          quantiteReelle: item.quantiteTheorique,
          ecart: 0,
        };
      })
    );
  };

  // Raccourci : marquer TOUS les produits non renseignés comme conformes
  const handleMarkAllMatching = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        quantiteReelle: item.quantiteReelle ?? item.quantiteTheorique,
        ecart: (item.quantiteReelle ?? item.quantiteTheorique) - item.quantiteTheorique,
      }))
    );
  };

  // Sauvegarder les comptages partiels (brouillon serveur)
  const handleSaveProgress = async () => {
    setBusy(true);
    setError(null);
    try {
      let invId = activeInventoryId;
      if (!invId) {
        invId = await handleStartSession();
        if (!invId) return;
      }

      const countedItems = items
        .filter((it) => it.quantiteReelle !== null)
        .map((it) => ({
          productId: it.productId,
          quantiteReelle: Number(it.quantiteReelle!.toFixed(3)),
        }));

      if (countedItems.length > 0) {
        await apiPost(`/api/inventory/${invId}/count`, {
          items: countedItems,
        });
      }
      setSuccessMessage('Brouillon de comptage sauvegardé avec succès.');
      void fetchHistory();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la sauvegarde du comptage.');
    } finally {
      setBusy(false);
    }
  };

  // Validation finale & régularisation automatique du stock
  const handleConfirmValidate = async () => {
    setBusy(true);
    setError(null);
    try {
      let invId = activeInventoryId;

      // Si aucune session n'était préalablement initialisée sur le serveur,
      // on la crée automatiquement à la volée pour ne jamais bloquer l'utilisateur !
      if (!invId) {
        if (isGlobalView || !user?.etablissementId) {
          setError('Sélectionnez une boutique concrète pour valider et régulariser le point de stock.');
          setBusy(false);
          return;
        }

        const res = await apiPost<InventoryRecord>('/api/inventory', {
          libelle: `Point de stock du ${new Date().toLocaleDateString('fr-FR')}`,
          productIds: items.map((i) => i.productId),
        });
        invId = res.id;
        setActiveInventoryId(res.id);
        setInventoryStatus('OPEN');
      }

      // 1. Sauvegarder tous les comptages physiques saisis
      const countedItems = items
        .filter((it) => it.quantiteReelle !== null)
        .map((it) => ({
          productId: it.productId,
          quantiteReelle: Number(it.quantiteReelle!.toFixed(3)),
        }));

      if (countedItems.length > 0) {
        await apiPost(`/api/inventory/${invId}/count`, { items: countedItems });
      }

      // 2. Valider l'inventaire et appliquer les mouvements de régularisation ADJUST
      await apiPost(`/api/inventory/${invId}/validate`, {
        motif: validateMotif,
      });

      setInventoryStatus('VALIDATED');
      setShowValidateConfirm(false);
      setSuccessMessage('✅ Stock régularisé avec succès selon le pointage physique.');

      if (onStockUpdated) onStockUpdated();
      void fetchHistory();

      // Basculer vers l'onglet historique après 1.5s pour offrir une visibilité immédiate du PV
      setTimeout(() => {
        setActiveTab('HISTORY');
        setSuccessMessage(null);
      }, 1500);
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la validation du point de stock.');
    } finally {
      setBusy(false);
    }
  };

  // Reprendre un inventaire ouvert depuis l'historique
  const handleResumeInventory = (record: InventoryRecord) => {
    setActiveInventoryId(record.id);
    setInventoryStatus(record.status);
    const pointItems: PointItem[] = record.items.map((it) => ({
      id: it.id,
      productId: it.productId,
      nom: it.product?.nom ?? 'Produit',
      baseUnit: it.product?.baseUnit ?? null,
      unitKind: it.product?.unitKind ?? null,
      prixVente: it.product?.prixVente ?? 0,
      prixAchat: it.product?.prixAchat ?? 0,
      quantiteTheorique: it.quantiteTheorique,
      quantiteReelle: it.quantiteReelle,
      ecart: it.ecart,
    }));
    setItems(pointItems);
    setActiveTab('COUNT');
  };

  // ── Statistiques du Récolement Actuel ──
  const stats = useMemo(() => {
    const total = items.length;
    let counted = 0;
    let matching = 0;
    let shortages = 0;
    let surpluses = 0;
    let totalEcartValue = 0;

    for (const item of items) {
      if (item.quantiteReelle !== null) {
        counted++;
        if (item.ecart === 0) {
          matching++;
        } else if (item.ecart !== null && item.ecart < 0) {
          shortages++;
          totalEcartValue += item.ecart * item.prixVente;
        } else if (item.ecart !== null && item.ecart > 0) {
          surpluses++;
          totalEcartValue += item.ecart * item.prixVente;
        }
      }
    }

    const progressPct = total > 0 ? Math.round((counted / total) * 100) : 0;

    return {
      total,
      counted,
      matching,
      shortages,
      surpluses,
      totalEcartValue,
      progressPct,
    };
  }, [items]);

  // Filtrage des articles pour l'onglet de comptage
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (search) {
        const q = search.toLowerCase();
        if (!item.nom.toLowerCase().includes(q)) return false;
      }
      if (filterMode === 'DISCREPANCIES') {
        return item.ecart !== null && item.ecart !== 0;
      }
      if (filterMode === 'PENDING') {
        return item.quantiteReelle === null;
      }
      if (filterMode === 'MATCHING') {
        return item.ecart === 0;
      }
      return true;
    });
  }, [items, search, filterMode]);

  // Filtrage de la liste d'historique
  const filteredHistory = useMemo(() => {
    return historyList.filter((inv) => {
      if (historyStatusFilter !== 'ALL' && inv.status !== historyStatusFilter) {
        return false;
      }
      if (historySearch) {
        const q = historySearch.toLowerCase();
        const motifMatch = inv.motif?.toLowerCase().includes(q) ?? false;
        const libelleMatch = inv.libelle?.toLowerCase().includes(q) ?? false;
        const validatorMatch = inv.validator?.nom?.toLowerCase().includes(q) ?? false;
        const etablissementMatch = inv.etablissement?.nom?.toLowerCase().includes(q) ?? false;
        if (!motifMatch && !libelleMatch && !validatorMatch && !etablissementMatch) {
          return false;
        }
      }
      return true;
    });
  }, [historyList, historyStatusFilter, historySearch]);

  // Calcul des métriques d'un enregistrement d'historique
  const computeRecordStats = (record: InventoryRecord) => {
    const total = record.items.length;
    let counted = 0;
    let discrepancies = 0;
    let netFinancialImpact = 0;

    for (const it of record.items) {
      if (it.quantiteReelle !== null) {
        counted++;
      }
      if (it.ecart !== null && it.ecart !== 0) {
        discrepancies++;
        const pv = it.product?.prixVente ?? 0;
        netFinancialImpact += it.ecart * pv;
      }
    }

    return { total, counted, discrepancies, netFinancialImpact };
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <style>{`@media print {
        body * { visibility: hidden !important; }
        #point-de-stock-print, #point-de-stock-print * { visibility: visible !important; }
        #point-de-stock-print { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 10mm; }
        .no-print { display: none !important; }
      }`}</style>

      <div
        id="point-de-stock-print"
        className="w-full max-w-5xl rounded-3xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── En-tête imprimé uniquement : logo + intitulé du document ── */}
        <div className="hidden print:flex items-center justify-between border-b border-slate-300 pb-3 mb-4">
          <PrintBrandLogo width={170} className="!justify-start" />
          <div className="text-right">
            <p className="text-lg font-black text-slate-900">Point de stock & récolement</p>
            <p className="text-xs text-slate-500">{new Date().toLocaleString('fr-FR')}</p>
          </div>
        </div>

        {/* ── Entête Supérieur Sombre ── */}
        <div className="no-print p-4 sm:p-5 bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
              <ClipboardCheck className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-black tracking-tight">Point de Stock & Récolement</h2>
                {inventoryStatus === 'OPEN' && activeTab === 'COUNT' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wider animate-pulse">
                    En cours
                  </span>
                )}
                {inventoryStatus === 'VALIDATED' && activeTab === 'COUNT' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400 text-slate-950 uppercase tracking-wider">
                    Validé & synchronisé
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5 hidden sm:block">
                Comparez le stock de l'application et le stock en boutique pour détecter et corriger les écarts.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Barre d'Onglets Principale (Pointage / Historique) ── */}
        <div className="no-print px-4 sm:px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('COUNT')}
              className={cn(
                'flex items-center gap-2 py-3 px-3 sm:px-4 border-b-2 text-xs font-black transition-all cursor-pointer whitespace-nowrap',
                activeTab === 'COUNT'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              )}
            >
              <ClipboardCheck className="h-4 w-4" />
              <span>Pointage en cours</span>
              {inventoryStatus === 'OPEN' && (
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('HISTORY');
                void fetchHistory();
              }}
              className={cn(
                'flex items-center gap-2 py-3 px-3 sm:px-4 border-b-2 text-xs font-black transition-all cursor-pointer whitespace-nowrap',
                activeTab === 'HISTORY'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              )}
            >
              <History className="h-4 w-4" />
              <span>Historique des points de stock</span>
              {historyList.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  {historyList.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'HISTORY' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchHistory()}
              disabled={busyHistory}
              className="text-xs font-bold text-slate-300 border-slate-700 bg-slate-800/80 hover:bg-slate-700 gap-1.5 h-8 rounded-xl shrink-0 cursor-pointer"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', busyHistory && 'animate-spin')} />
              <span className="hidden sm:inline">Actualiser</span>
            </Button>
          )}
        </div>

        {/* ── Bandeau Alertes / Statut ── */}
        {error && (
          <div className="no-print mx-4 sm:mx-6 mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {successMessage && (
          <div className="no-print mx-4 sm:mx-6 mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* CONTENU ONGLET 1 : POINTAGE EN COURS */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'COUNT' && (
          <>
            {/* ── KPIs Récapitulatifs (Synthèse du Point) ── */}
            <div className="no-print p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200/80 shrink-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {/* 1. Progression du pointage */}
                <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <span>Pointés</span>
                    <span className="text-slate-700">{stats.progressPct}%</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-black text-slate-900 tabular">
                      {stats.counted}
                    </span>
                    <span className="text-xs text-slate-400 font-bold">/ {stats.total}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${stats.progressPct}%` }}
                    />
                  </div>
                </div>

                {/* 2. Produits Conformes */}
                <div className="bg-white rounded-2xl p-3 sm:p-4 border border-emerald-100 shadow-2xs">
                  <div className="text-emerald-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Conformes
                  </div>
                  <div className="mt-1 text-xl sm:text-2xl font-black text-emerald-700 tabular">
                    {stats.matching}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Zéro écart avec l'appli</p>
                </div>

                {/* 3. Écarts Détectés (Manquants & Surplus) */}
                <div className="bg-white rounded-2xl p-3 sm:p-4 border border-rose-100 shadow-2xs">
                  <div className="text-rose-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Écarts
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-black text-rose-700 tabular">
                      {stats.shortages + stats.surpluses}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      ({stats.shortages} manquants, {stats.surpluses} surplus)
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-600/90 mt-1 font-medium">Nécessite vérification</p>
                </div>

                {/* 4. Impact Financier Net */}
                <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-2xs">
                  <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                    Impact Financier Net
                  </div>
                  <div
                    className={cn(
                      'mt-1 text-lg sm:text-xl font-black tabular',
                      stats.totalEcartValue < 0
                        ? 'text-rose-600'
                        : stats.totalEcartValue > 0
                        ? 'text-indigo-600'
                        : 'text-slate-800'
                    )}
                  >
                    {stats.totalEcartValue > 0 ? `+${formatFCFA(stats.totalEcartValue)}` : formatFCFA(stats.totalEcartValue)}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Évalué au prix de vente</p>
                </div>
              </div>
            </div>

            {/* ── Barre de Contrôle & Filtres ── */}
            <div className="no-print px-4 sm:px-6 py-3 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              {/* Recherche */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un produit..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              {/* Onglets Filtres */}
              <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-1 bg-slate-100/80 rounded-xl">
                <button
                  onClick={() => setFilterMode('ALL')}
                  className={cn(
                    'px-2.5 py-1 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer',
                    filterMode === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Tous ({items.length})
                </button>
                <button
                  onClick={() => setFilterMode('DISCREPANCIES')}
                  className={cn(
                    'px-2.5 py-1 text-xs font-bold rounded-lg transition-all shrink-0 flex items-center gap-1 cursor-pointer',
                    filterMode === 'DISCREPANCIES'
                      ? 'bg-rose-500 text-white shadow-2xs'
                      : 'text-rose-700 hover:bg-rose-50'
                  )}
                >
                  Écarts ({stats.shortages + stats.surpluses})
                </button>
                <button
                  onClick={() => setFilterMode('PENDING')}
                  className={cn(
                    'px-2.5 py-1 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer',
                    filterMode === 'PENDING' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  À pointer ({stats.total - stats.counted})
                </button>
                <button
                  onClick={() => setFilterMode('MATCHING')}
                  className={cn(
                    'px-2.5 py-1 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer',
                    filterMode === 'MATCHING'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  )}
                >
                  Conformes ({stats.matching})
                </button>
              </div>

              {/* Raccourci global */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllMatching}
                className="text-xs font-bold text-slate-700 rounded-xl gap-1 shrink-0 cursor-pointer"
              >
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>Tout marquer conforme</span>
              </Button>
            </div>

            {/* ── Tableau Interactif de Rapprochement ── */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 relative">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs z-10 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200 shadow-2xs">
                  <tr>
                    <th className="py-2.5 px-4">Désignation du produit</th>
                    <th className="py-2.5 px-3 text-center">Stock Appli (Théorique)</th>
                    <th className="py-2.5 px-3 text-center">Stock Boutique (Physique Réel)</th>
                    <th className="py-2.5 px-4 text-right">Écart Constaté</th>
                    <th className="no-print py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                        Aucun produit ne correspond aux critères de filtre.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const hasDiscrepancy = item.ecart !== null && item.ecart !== 0;
                      const isMatching = item.ecart === 0;
                      const isUnchecked = item.quantiteReelle === null;

                      return (
                        <tr
                          key={item.productId}
                          className={cn(
                            'hover:bg-slate-50/80 transition-colors',
                            hasDiscrepancy && item.ecart! < 0 && 'bg-rose-50/30',
                            hasDiscrepancy && item.ecart! > 0 && 'bg-indigo-50/30'
                          )}
                        >
                          {/* 1. Produit */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{item.nom}</div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>Prix : {formatFCFA(item.prixVente)}</span>
                              {item.baseUnit && (
                                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold text-[10px]">
                                  {item.baseUnit}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 2. Stock Théorique (Appli) */}
                          <td className="py-3 px-3 text-center">
                            <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-black text-xs tabular">
                              {item.quantiteTheorique}
                            </span>
                          </td>

                          {/* 3. Stock Physique (Saisie Réelle) */}
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const current = item.quantiteReelle ?? item.quantiteTheorique;
                                  handleUpdateReelle(item.productId, Math.max(0, current - 1));
                                }}
                                className="h-7 w-7 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 font-bold active:scale-95 transition-transform cursor-pointer"
                              >
                                -
                              </button>

                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={item.quantiteReelle === null ? '' : item.quantiteReelle}
                                placeholder="À pointer"
                                onChange={(e) => {
                                  const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                  handleUpdateReelle(item.productId, val);
                                }}
                                className={cn(
                                  'w-20 sm:w-24 text-center py-1 px-2 rounded-xl text-xs font-black tabular border transition-all focus:outline-none focus:ring-2',
                                  isUnchecked && 'border-slate-300 bg-amber-50/40 text-slate-800 focus:ring-amber-500',
                                  isMatching && 'border-emerald-500 bg-emerald-50/30 text-emerald-800 focus:ring-emerald-500',
                                  hasDiscrepancy && 'border-rose-500 bg-rose-50/40 text-rose-800 focus:ring-rose-500'
                                )}
                              />

                              <button
                                type="button"
                                onClick={() => {
                                  const current = item.quantiteReelle ?? item.quantiteTheorique;
                                  handleUpdateReelle(item.productId, current + 1);
                                }}
                                className="h-7 w-7 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 font-bold active:scale-95 transition-transform cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          {/* 4. Écart Constaté & Impact */}
                          <td className="py-3 px-4 text-right">
                            {item.ecart === null ? (
                              <span className="text-slate-400 font-medium text-xs">Non vérifié</span>
                            ) : item.ecart === 0 ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-black text-xs">
                                <CheckCircle2 className="h-3.5 w-3.5" /> 0 (Conforme)
                              </span>
                            ) : (
                              <div>
                                <div
                                  className={cn(
                                    'inline-flex items-center gap-1 font-black text-xs',
                                    item.ecart < 0 ? 'text-rose-600' : 'text-indigo-600'
                                  )}
                                >
                                  {item.ecart < 0 ? (
                                    <>
                                      <TrendingDown className="h-3.5 w-3.5" />
                                      <span>{item.ecart} (Manquant)</span>
                                    </>
                                  ) : (
                                    <>
                                      <TrendingUp className="h-3.5 w-3.5" />
                                      <span>+{item.ecart} (Surplus)</span>
                                    </>
                                  )}
                                </div>
                                <div className="text-[11px] font-bold text-slate-500">
                                  {formatFCFA(item.ecart * item.prixVente)}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* 5. Action Rapide */}
                          <td className="no-print py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleMarkMatching(item.productId)}
                              title="Pointer comme conforme au stock théorique"
                              className="px-2.5 py-1 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                            >
                              OK
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Pied de Page & Actions de Validation ── */}
            <div className="no-print p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="rounded-xl text-xs font-bold gap-1.5 text-slate-700 cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>Imprimer fiche</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveProgress}
                  disabled={busy}
                  className="rounded-xl text-xs font-bold gap-1.5 text-slate-700 cursor-pointer"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>Sauvegarder le brouillon</span>
                </Button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="rounded-xl text-xs font-bold text-slate-600 cursor-pointer"
                >
                  Fermer
                </Button>

                {canValidate && inventoryStatus !== 'VALIDATED' && (
                  <Button
                    onClick={() => setShowValidateConfirm(true)}
                    disabled={busy || stats.counted === 0}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 gap-1.5 transition-transform active:scale-95 cursor-pointer"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                    <span>Valider & Corriger le Stock</span>
                  </Button>
                )}
              </div>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* CONTENU ONGLET 2 : HISTORIQUE DES POINTS DE STOCK */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'HISTORY' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
            {/* Barre de recherche & filtres de l'historique */}
            <div className="no-print p-4 sm:p-5 bg-white border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Rechercher par motif, validateur, boutique..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setHistoryStatusFilter('ALL')}
                  className={cn(
                    'px-3 py-1 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer',
                    historyStatusFilter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Tous ({historyList.length})
                </button>
                <button
                  onClick={() => setHistoryStatusFilter('VALIDATED')}
                  className={cn(
                    'px-3 py-1 text-xs font-bold rounded-lg transition-all shrink-0 flex items-center gap-1 cursor-pointer',
                    historyStatusFilter === 'VALIDATED'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  )}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Validés ({historyList.filter((h) => h.status === 'VALIDATED').length})</span>
                </button>
                <button
                  onClick={() => setHistoryStatusFilter('OPEN')}
                  className={cn(
                    'px-3 py-1 text-xs font-bold rounded-lg transition-all shrink-0 flex items-center gap-1 cursor-pointer',
                    historyStatusFilter === 'OPEN'
                      ? 'bg-amber-500 text-slate-950 shadow-2xs'
                      : 'text-amber-800 hover:bg-amber-50'
                  )}
                >
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  <span>En cours ({historyList.filter((h) => h.status === 'OPEN').length})</span>
                </button>
              </div>
            </div>

            {/* Liste des points de stock passés */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
              {busyHistory && historyList.length === 0 ? (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                  <span className="text-xs font-bold">Chargement de l'historique des points de stock...</span>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-2xl border border-slate-200/80 p-8">
                  <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <History className="h-6 w-6" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Aucun point de stock trouvé</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    {historySearch || historyStatusFilter !== 'ALL'
                      ? 'Aucun résultat ne correspond à vos filtres de recherche.'
                      : "Vous n'avez pas encore validé de point de stock. Cliquez sur « Pointage en cours » pour réaliser votre premier récolement."}
                  </p>
                </div>
              ) : (
                filteredHistory.map((inv) => {
                  const rStats = computeRecordStats(inv);
                  const isVal = inv.status === 'VALIDATED';
                  const isOpenStatus = inv.status === 'OPEN';
                  const dateStr = new Date(inv.validatedAt || inv.createdAt).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={inv.id}
                      className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 hover:border-slate-300 transition-all shadow-2xs hover:shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      {/* Bloc Gauche : Titre, Date, Établissement, Auteur */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-black text-slate-900 text-sm">
                            {inv.libelle || `Point de stock du ${dateStr}`}
                          </span>
                          {isVal && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" /> Validé & Régularisé
                            </span>
                          )}
                          {isOpenStatus && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                              <ClipboardCheck className="h-3 w-3" /> En cours (Brouillon)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {dateStr}
                          </span>
                          {inv.etablissement && (
                            <span className="flex items-center gap-1 font-medium text-slate-600">
                              <Store className="h-3.5 w-3.5 text-slate-400" />
                              {inv.etablissement.nom}
                            </span>
                          )}
                          {inv.validator && (
                            <span className="flex items-center gap-1 font-medium text-slate-600">
                              <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                              {inv.validator.nom}
                            </span>
                          )}
                        </div>

                        {inv.motif && (
                          <p className="text-xs text-slate-600 italic bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 inline-block mt-1">
                            Motif : {inv.motif}
                          </p>
                        )}
                      </div>

                      {/* Bloc Centre : Métriques (Articles, Écarts, Valeur) */}
                      <div className="flex items-center gap-3 sm:gap-6 border-y sm:border-y-0 sm:border-x border-slate-100 py-2 sm:py-0 px-0 sm:px-6 w-full md:w-auto justify-between sm:justify-start">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400">Articles</div>
                          <div className="text-xs sm:text-sm font-black text-slate-800 tabular">
                            {rStats.counted} / {rStats.total}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400">Écarts</div>
                          <div
                            className={cn(
                              'text-xs sm:text-sm font-black tabular',
                              rStats.discrepancies > 0 ? 'text-rose-600' : 'text-emerald-600'
                            )}
                          >
                            {rStats.discrepancies === 0 ? '0 (Conforme)' : `${rStats.discrepancies} écarts`}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400">Impact Net</div>
                          <div
                            className={cn(
                              'text-xs sm:text-sm font-black tabular',
                              rStats.netFinancialImpact < 0
                                ? 'text-rose-600'
                                : rStats.netFinancialImpact > 0
                                ? 'text-indigo-600'
                                : 'text-slate-700'
                            )}
                          >
                            {rStats.netFinancialImpact > 0
                              ? `+${formatFCFA(rStats.netFinancialImpact)}`
                              : formatFCFA(rStats.netFinancialImpact)}
                          </div>
                        </div>
                      </div>

                      {/* Bloc Droite : Actions */}
                      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        {isOpenStatus && (
                          <Button
                            size="sm"
                            onClick={() => handleResumeInventory(inv)}
                            className="rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <span>Reprendre</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedHistoryItem(inv)}
                          className="rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-100 gap-1.5 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-500" />
                          <span>Détails & Rapport</span>
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pied de page onglet historique */}
            <div className="no-print p-4 bg-white border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                {filteredHistory.length} point(s) de stock répertorié(s)
              </span>
              <Button
                variant="outline"
                onClick={onClose}
                className="rounded-xl text-xs font-bold text-slate-600 cursor-pointer"
              >
                Fermer
              </Button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* MODALE D'INSPECTION DÉTAILLÉE D'UN POINT DE STOCK PASSÉ */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {selectedHistoryItem && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4">
            <div
              className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Entête Détail */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base sm:text-lg">
                      {selectedHistoryItem.libelle || 'Détail du Point de Stock'}
                    </h3>
                    <p className="text-xs text-slate-300">
                      Rapport d'audit du{' '}
                      {new Date(selectedHistoryItem.validatedAt || selectedHistoryItem.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedHistoryItem(null)}
                  className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* KPIs du rapport */}
              {(() => {
                const s = computeRecordStats(selectedHistoryItem);
                return (
                  <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                    <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Statut</div>
                      <div className="text-xs font-black mt-0.5">
                        {selectedHistoryItem.status === 'VALIDATED' ? (
                          <span className="text-emerald-700">Validé & Appliqué</span>
                        ) : (
                          <span className="text-amber-700">En cours</span>
                        )}
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Articles Pointés</div>
                      <div className="text-xs font-black text-slate-900 mt-0.5">
                        {s.counted} sur {s.total}
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Écarts Constatés</div>
                      <div className={cn('text-xs font-black mt-0.5', s.discrepancies > 0 ? 'text-rose-600' : 'text-emerald-600')}>
                        {s.discrepancies} article(s)
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Impact Financier Net</div>
                      <div
                        className={cn(
                          'text-xs font-black mt-0.5',
                          s.netFinancialImpact < 0
                            ? 'text-rose-600'
                            : s.netFinancialImpact > 0
                            ? 'text-indigo-600'
                            : 'text-slate-800'
                        )}
                      >
                        {formatFCFA(s.netFinancialImpact)}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Tableau exhaustif des lignes de cet inventaire */}
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-100 z-10 text-[10px] font-extrabold uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Article</th>
                      <th className="py-2.5 px-3 text-center">Stock Initial</th>
                      <th className="py-2.5 px-3 text-center">Stock Réel</th>
                      <th className="py-2.5 px-3 text-right">Écart</th>
                      <th className="py-2.5 px-4 text-right">Impact Financier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedHistoryItem.items.map((it) => {
                      const ecart = it.ecart ?? 0;
                      const hasDiscrepancy = it.ecart !== null && it.ecart !== 0;
                      const pv = it.product?.prixVente ?? 0;

                      return (
                        <tr
                          key={it.id}
                          className={cn(
                            'hover:bg-slate-50',
                            hasDiscrepancy && ecart < 0 && 'bg-rose-50/30',
                            hasDiscrepancy && ecart > 0 && 'bg-indigo-50/30'
                          )}
                        >
                          <td className="py-2.5 px-4">
                            <div className="font-bold text-slate-900">{it.product?.nom ?? 'Article'}</div>
                            <div className="text-[10px] text-slate-400">PU : {formatFCFA(pv)}</div>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                            {it.quantiteTheorique}
                          </td>
                          <td className="py-2.5 px-3 text-center font-black text-slate-900">
                            {it.quantiteReelle !== null ? it.quantiteReelle : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black">
                            {it.ecart === null ? (
                              <span className="text-slate-400">-</span>
                            ) : it.ecart === 0 ? (
                              <span className="text-emerald-600">0</span>
                            ) : (
                              <span className={it.ecart < 0 ? 'text-rose-600' : 'text-indigo-600'}>
                                {it.ecart > 0 ? `+${it.ecart}` : it.ecart}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right font-black tabular text-slate-800">
                            {it.ecart !== null ? formatFCFA(it.ecart * pv) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Actions du détail */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="rounded-xl text-xs font-bold gap-1.5 text-slate-700 cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>Imprimer le Procès-Verbal</span>
                </Button>
                <Button
                  onClick={() => setSelectedHistoryItem(null)}
                  className="rounded-xl text-xs font-bold bg-slate-900 text-white cursor-pointer"
                >
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* MODALE DE CONFIRMATION DE VALIDATION DÉFINITIVE (Z-[100]) */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {showValidateConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div
              className="w-full max-w-md rounded-3xl bg-white p-5 sm:p-6 shadow-2xl space-y-4 border border-slate-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Valider le Point de Stock</h3>
                  <p className="text-xs text-slate-500">Mise à jour immédiate et sécurisée du stock en base de données</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-2 text-slate-700">
                <div className="flex justify-between items-center">
                  <span>Articles vérifiés :</span>
                  <span className="font-black text-slate-900">{stats.counted} sur {stats.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Articles avec écart :</span>
                  <span className="font-black text-rose-600">{stats.shortages + stats.surpluses}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Impact financier net :</span>
                  <span
                    className={cn(
                      'font-black tabular',
                      stats.totalEcartValue < 0
                        ? 'text-rose-600'
                        : stats.totalEcartValue > 0
                        ? 'text-indigo-600'
                        : 'text-slate-900'
                    )}
                  >
                    {stats.totalEcartValue > 0 ? `+${formatFCFA(stats.totalEcartValue)}` : formatFCFA(stats.totalEcartValue)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Motif de l'ajustement (obligatoire pour l'audit)
                </label>
                <input
                  type="text"
                  value={validateMotif}
                  onChange={(e) => setValidateMotif(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ex : Inventaire mensuel, contrôle inopiné..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowValidateConfirm(false)}
                  disabled={busy}
                  className="rounded-xl text-xs font-bold cursor-pointer"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleConfirmValidate}
                  disabled={busy || !validateMotif.trim()}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 gap-1.5 cursor-pointer"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  <span>Confirmer la régularisation</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
