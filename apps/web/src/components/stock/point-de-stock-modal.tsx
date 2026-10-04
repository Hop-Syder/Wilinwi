/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Interface professionnelle "Point de Stock & Récolement" (Inventaire physique)
 *   Permet de comparer le stock théorique de l'application avec le comptage physique en rayon,
 *   de détecter instantanément les écarts (manquants/surplus) et de régulariser le stock en un clic.
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
} from 'lucide-react';
import { Button, formatFCFA, cn } from '@wilinwi/ui';
import { apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { ProductDto } from '@wilinwi/types';

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
}

export function PointDeStockModal({
  isOpen,
  onClose,
  products,
  onStockUpdated,
}: PointDeStockModalProps) {
  const { user } = useAuth();
  const canValidate = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const isGlobalView = user?.etablissementId === null && (user?.etablissements?.length ?? 0) > 1;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Inventaire actif
  const [activeInventoryId, setActiveInventoryId] = useState<string | null>(null);
  const [inventoryStatus, setInventoryStatus] = useState<'OPEN' | 'VALIDATED' | 'NEW'>('NEW');
  const [items, setItems] = useState<PointItem[]>([]);

  // Filtres UI
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'DISCREPANCIES' | 'PENDING' | 'MATCHING'>('ALL');

  // Modal de validation définitive
  const [showValidateConfirm, setShowValidateConfirm] = useState(false);
  const [validateMotif, setValidateMotif] = useState('Point de stock régulier / réconciliation physique');

  // Initialisation à partir des produits locaux ou d'un inventaire ouvert
  const initFromProducts = useCallback(() => {
    const list: PointItem[] = products
      .filter((p) => (p.vendablePos ?? true) && p.type !== 'SERVICE' && p.type !== 'MANUFACTURED')
      .map((p) => {
        // Quantité théorique locale
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

  useEffect(() => {
    if (isOpen) {
      void fetchActiveOrInit();
    }
  }, [isOpen, fetchActiveOrInit]);

  // Lancer officiellement une nouvelle session de pointage
  const handleStartSession = async () => {
    if (isGlobalView || !user?.etablissementId) {
      setError('Sélectionnez une boutique concrète pour démarrer un point de stock.');
      return;
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
    } catch (e: any) {
      setError(e.message || 'Impossible de démarrer le point de stock.');
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
    if (!activeInventoryId) {
      // Si pas encore démarré côté serveur, on démarre d'abord
      await handleStartSession();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const countedItems = items
        .filter((it) => it.quantiteReelle !== null)
        .map((it) => ({
          productId: it.productId,
          quantiteReelle: Math.round(it.quantiteReelle!),
        }));

      if (countedItems.length > 0) {
        await apiPost(`/api/inventory/${activeInventoryId}/count`, {
          items: countedItems,
        });
      }
      setSuccessMessage('Comptage sauvegardé avec succès.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la sauvegarde du comptage.');
    } finally {
      setBusy(false);
    }
  };

  // Validation finale & régularisation automatique du stock
  const handleConfirmValidate = async () => {
    if (!activeInventoryId) return;
    setBusy(true);
    setError(null);
    try {
      // 1. Sauvegarder les derniers comptages
      const countedItems = items
        .filter((it) => it.quantiteReelle !== null)
        .map((it) => ({
          productId: it.productId,
          quantiteReelle: Math.round(it.quantiteReelle!),
        }));
      if (countedItems.length > 0) {
        await apiPost(`/api/inventory/${activeInventoryId}/count`, { items: countedItems });
      }

      // 2. Valider l'inventaire
      await apiPost(`/api/inventory/${activeInventoryId}/validate`, {
        motif: validateMotif,
      });

      setInventoryStatus('VALIDATED');
      setShowValidateConfirm(false);
      setSuccessMessage('✅ Stock régularisé avec succès selon le pointage physique.');
      if (onStockUpdated) onStockUpdated();
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la validation du point de stock.');
    } finally {
      setBusy(false);
    }
  };

  // ── Statistiques de Récolement ──
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

  // Filtrage des articles pour affichage
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
        {/* ── Entête Supérieur ── */}
        <div className="no-print p-4 sm:p-6 bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">Point de Stock & Récolement</h2>
                {inventoryStatus === 'OPEN' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wider animate-pulse">
                    En cours
                  </span>
                )}
                {inventoryStatus === 'VALIDATED' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400 text-slate-950 uppercase tracking-wider">
                    Validé & synchronisé
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Comparez le stock de l'application et le stock en boutique pour détecter et corriger les écarts.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-all"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Bandeau Alertes / Statut ── */}
        {error && (
          <div className="no-print mx-4 sm:mx-6 mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
          </div>
        )}
        {successMessage && (
          <div className="no-print mx-4 sm:mx-6 mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)}><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* ── KPIs Récapitulatifs (Synthèse du Point) ── */}
        <div className="no-print p-4 sm:p-6 bg-slate-50/80 border-b border-slate-200/80 shrink-0">
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
                'px-2.5 py-1 text-xs font-bold rounded-lg transition-all shrink-0',
                filterMode === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Tous ({items.length})
            </button>
            <button
              onClick={() => setFilterMode('DISCREPANCIES')}
              className={cn(
                'px-2.5 py-1 text-xs font-bold rounded-lg transition-all shrink-0 flex items-center gap-1',
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
                'px-2.5 py-1 text-xs font-bold rounded-lg transition-all shrink-0',
                filterMode === 'PENDING' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              À pointer ({stats.total - stats.counted})
            </button>
            <button
              onClick={() => setFilterMode('MATCHING')}
              className={cn(
                'px-2.5 py-1 text-xs font-bold rounded-lg transition-all shrink-0',
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
            className="text-xs font-bold text-slate-700 rounded-xl gap-1 shrink-0"
          >
            <Check className="h-3.5 w-3.5 text-emerald-600" />
            <span>Tout marquer conforme</span>
          </Button>
        </div>

        {/* ── Tableau Interactif de Rapprochement ── */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-100/90 backdrop-blur-xs z-10 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
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
                      {/* 1. Produit & Prix */}
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900">{item.nom}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <span>{formatFCFA(item.prixVente)}</span>
                          {item.baseUnit && <span>· Unité : {item.baseUnit}</span>}
                        </div>
                      </td>

                      {/* 2. Stock Théorique (Application) */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-mono font-bold text-sm text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {item.quantiteTheorique}
                          {item.baseUnit ? ` ${item.baseUnit}` : ''}
                        </span>
                      </td>

                      {/* 3. Stock Réel (Boutique) Saisie Rapide */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const current = item.quantiteReelle ?? item.quantiteTheorique;
                              handleUpdateReelle(item.productId, Math.max(0, current - 1));
                            }}
                            className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-all active:scale-95"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="Compté..."
                            value={item.quantiteReelle !== null ? item.quantiteReelle : ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : parseFloat(e.target.value);
                              handleUpdateReelle(item.productId, val);
                            }}
                            className={cn(
                              'w-20 text-center font-mono font-bold text-sm py-1 rounded-lg border focus:outline-none transition-all',
                              isMatching
                                ? 'border-emerald-300 bg-emerald-50/50 text-emerald-900'
                                : hasDiscrepancy
                                ? 'border-rose-300 bg-rose-50/50 text-rose-900'
                                : 'border-slate-300 bg-white text-slate-900'
                            )}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const current = item.quantiteReelle ?? item.quantiteTheorique;
                              handleUpdateReelle(item.productId, current + 1);
                            }}
                            className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-all active:scale-95"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* 4. Écart Constaté & Impact */}
                      <td className="py-3 px-4 text-right">
                        {isUnchecked ? (
                          <span className="inline-flex items-center text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            Non pointé
                          </span>
                        ) : isMatching ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="h-3 w-3" /> Conforme (0)
                          </span>
                        ) : item.ecart! < 0 ? (
                          <div className="inline-block text-right">
                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                              <TrendingDown className="h-3 w-3" /> Manquant ({item.ecart})
                            </span>
                            <div className="text-[10px] text-rose-600 font-bold mt-0.5">
                              {formatFCFA(Math.abs(item.ecart!) * item.prixVente)} perdu
                            </div>
                          </div>
                        ) : (
                          <div className="inline-block text-right">
                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                              <TrendingUp className="h-3 w-3" /> Surplus (+{item.ecart})
                            </span>
                            <div className="text-[10px] text-indigo-600 font-bold mt-0.5">
                              +{formatFCFA(item.ecart! * item.prixVente)}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 5. Bouton d'action rapide */}
                      <td className="no-print py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleMarkMatching(item.productId)}
                          title="Valider que le stock réel est identique au stock théorique"
                          className={cn(
                            'p-1.5 rounded-lg border transition-all text-xs font-bold',
                            isMatching
                              ? 'bg-emerald-500 text-white border-emerald-600'
                              : 'bg-white hover:bg-slate-50 text-slate-500 border-slate-200'
                          )}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Barre d'Actions Inférieure ── */}
        <div className="no-print p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="rounded-xl text-xs font-bold gap-1.5 text-slate-700"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimer</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveProgress}
              disabled={busy}
              className="rounded-xl text-xs font-bold gap-1.5 text-slate-700"
            >
              <Save className="h-4 w-4" />
              <span>Sauvegarder le brouillon</span>
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              className="rounded-xl text-xs font-bold text-slate-600"
            >
              Fermer
            </Button>

            {canValidate && inventoryStatus !== 'VALIDATED' && (
              <Button
                onClick={() => setShowValidateConfirm(true)}
                disabled={busy || stats.counted === 0}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 gap-1.5 transition-transform active:scale-95"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                <span>Valider & Corriger le Stock</span>
              </Button>
            )}
          </div>
        </div>

        {/* ── Modale de Confirmation de Validation Définitive ── */}
        {showValidateConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
            <div
              className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4 border border-slate-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Valider le Point de Stock</h3>
                  <p className="text-xs text-slate-500">Mise à jour irréversible du stock en base de données</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5 text-slate-700">
                <div className="flex justify-between">
                  <span>Articles vérifiés :</span>
                  <span className="font-bold">{stats.counted} sur {stats.total}</span>
                </div>
                <div className="flex justify-between">
                  <span>Articles avec écart :</span>
                  <span className="font-bold text-rose-600">{stats.shortages + stats.surpluses}</span>
                </div>
                <div className="flex justify-between">
                  <span>Impact financier net :</span>
                  <span className="font-bold">{formatFCFA(stats.totalEcartValue)}</span>
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
                  className="rounded-xl text-xs font-bold"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleConfirmValidate}
                  disabled={busy || !validateMotif.trim()}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 gap-1.5"
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
