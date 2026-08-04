/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page Stock Principal Wilinwi (Architecture 5 Axes : KPIs synthétiques, Data Table ergonomique, Modales, Importation & Scanner Mobile)
 * @created 2026-06-20
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Plus, Search, AlertTriangle, ArrowRightLeft,
  Warehouse, FileSpreadsheet, Camera
} from 'lucide-react';
import type { ProductDto } from '@wilinwi/types';
import { Button } from '@wilinwi/ui';
import { apiGet, apiPatch } from '@/lib/api';
import { useCachedQuery } from '@/lib/use-cached-query';
import { useAuth } from '@/lib/auth-context';
import { ProductFormModal, StockTransferModal } from '@/components/stock-modals';
import { StockKpiCards } from '@/components/stock/stock-kpi-cards';
import { StockDataTable } from '@/components/stock/stock-data-table';
import { StockAdjustModal } from '@/components/stock/stock-adjust-modal';
import { CatalogImportWizard } from '@/components/stock/catalog-import-wizard';
import { BarcodeScannerModal, FloatingScanButton } from '@/components/stock/barcode-scanner-modal';
import { PurchaseOrderModal } from '@/components/purchase-order-modal';
import { StockAlertsBanner } from '@/components/stock-alerts-banner';
import { ContextualHelp } from '@/components/contextual-help';
import type { TourStep } from '@/components/tour-guide';

export default function StockPage() {
  const { user } = useAuth();
  const canWrite = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const canSeeCost = canWrite;
  const canSeeBreakdown = user?.role === 'OWNER';

  const { data, refetch } = useCachedQuery<ProductDto[]>(
    'stock/products-global',
    () => apiGet<ProductDto[]>('/api/stock/products?global=true'),
  );
  const products = data ?? [];

  // Modales & Drawers UI
  const [showProductModal, setShowProductModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPurchaseOrderModal, setShowPurchaseOrderModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDto | undefined>();
  const [adjustProduct, setAdjustProduct] = useState<ProductDto | undefined>();
  const [quickAdjustDelta, setQuickAdjustDelta] = useState<number | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Filtres & Recherche Douchette / Code-barres
  const [search, setSearch] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);

  // Métriques Agrégées (Axe 1)
  const totalProducts = products.length;
  const activeProductsCount = products.filter((p) => p.vendablePos ?? true).length;
  const archivedProductsCount = totalProducts - activeProductsCount;

  const totalValueCost = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.prixAchat || 0) * (p.stock || 0), 0);
  }, [products]);

  const totalValueRetail = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.prixCatalogue || 0) * (p.stock || 0), 0);
  }, [products]);

  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.stock <= (p.seuilAlerte ?? 5));
  }, [products]);

  const outOfStockProducts = useMemo(() => {
    return products.filter((p) => p.stock <= 0);
  }, [products]);

  // Filtrage Réactif des Produits
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (filterLowStock && p.stock > (p.seuilAlerte ?? 5)) return false;
      if (search) {
        const s = search.toLowerCase().trim();
        const nomMatch = p.nom.toLowerCase().includes(s);
        const skuMatch = p.sku?.toLowerCase().includes(s);
        const catMatch = p.categorie?.toLowerCase().includes(s);
        if (!nomMatch && !skuMatch && !catMatch) return false;
      }
      return true;
    });
  }, [products, filterLowStock, search]);

  // Mise à jour optimiste du basculement Vendable en POS (Axe 2)
  const handleTogglePosActif = async (targetProduct: ProductDto, newActif: boolean) => {
    try {
      await apiPatch(`/api/stock/products/${targetProduct.id}`, { vendablePos: newActif });
      void refetch();
    } catch (err) {
      console.error('Erreur mise à jour statut POS:', err);
    }
  };

  // Ajustement Rapide Inline +1 / -1
  const handleQuickAdjust = (p: ProductDto, delta: number) => {
    setQuickAdjustDelta(delta);
    setAdjustProduct(p);
  };

  const tourSteps: TourStep[] = [
    {
      targetId: 'tour-stock-kpis',
      title: 'Synthèse & Valeur Financière',
      content: 'Analysez la valeur globale du stock au prix d\'achat et au prix de vente. Cliquez sur la carte d\'alerte pour filtrer.',
      position: 'bottom',
    },
    {
      targetId: 'tour-stock-search',
      title: 'Recherche & Code-barres',
      content: 'Scannez directement avec une douchette ou utilisez la caméra mobile pour trouver un produit instantanément.',
      position: 'bottom',
    },
    {
      targetId: 'tour-stock-list',
      title: 'Tableau des Produits & Marges',
      content: 'Visualisez les niveaux de stock avec la barre de couleur et les marges nettes %. Basculez le statut POS en un clic.',
      position: 'bottom',
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* ──────────────── 1. EN-TÊTE RÉORGANISÉ ──────────────── */}
      <div className="space-y-3 pb-4 border-b border-slate-200/80">
        {/* LIGNE 1 : Titre & Actions Principales Alignées sur 1 Ligne Desktop */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Gauche : Titre + Sous-titre */}
          <div>
            <h1 className="font-display text-2xl font-extrabold text-amber-950 tracking-tight flex items-center gap-2">
              <span>📦</span> Gestion du Stock & Catalogue
            </h1>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Stock consolidé — Suivi financier, mouvements et réapprovisionnements.
            </p>
          </div>

          {/* Droite : Groupe d'Actions Aligné sur 1 Ligne (Import | Transférer | Entrepôt | + Nouveau | ❓) */}
          <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap justify-start lg:justify-end shrink-0">
            {canWrite && (
              <Button
                variant="outline"
                onClick={() => setShowImportModal(true)}
                className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-xs font-bold gap-1.5"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span>Import</span>
              </Button>
            )}

            {canWrite && user?.etablissements && user.etablissements.length >= 2 && (
              <Button
                variant="outline"
                onClick={() => setShowTransferModal(true)}
                className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-xs font-bold gap-1.5"
              >
                <ArrowRightLeft className="h-4 w-4 text-indigo-600" />
                <span>Transférer</span>
              </Button>
            )}

            <Link href="/entrepot">
              <Button
                variant="outline"
                className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-xs font-bold gap-1.5"
              >
                <Warehouse className="h-4 w-4 text-slate-600" />
                <span>Entrepôt</span>
              </Button>
            </Link>

            {canWrite && (
              <Button
                onClick={() => {
                  setEditingProduct(undefined);
                  setShowProductModal(true);
                }}
                className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md shadow-amber-600/20 gap-1.5 transition-transform active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Nouveau produit</span>
              </Button>
            )}

            <ContextualHelp
              storageKey="wilinwi_stock_tour_done"
              tourSteps={tourSteps}
              useCases={[
                { title: 'Valeur globale du stock', description: 'Consultez le capital immobilisé au prix d\'achat et le chiffre d\'affaires potentiel au prix catalogue.' },
                { title: 'Ajustement rapide de stock', description: 'Utilisez les boutons + / - sur la ligne d\'un produit pour enregistrer une casse, une régularisation ou une perte avec son motif obligatoire.' },
                { title: 'Importation en 3 étapes', description: 'Importez votre catalogue volumineux via fichier CSV grâce à l\'assistant de mapping et de détection d\'anomalies.' },
              ]}
            />
          </div>
        </div>

        {/* LIGNE 2 : Fine alerte stock bas positionnée sous l'en-tête */}
        <StockAlertsBanner />
      </div>

      {/* ── AXE 1 : TopBar Synthétique (KPIs Stock & Alertes) ── */}
      <div id="tour-stock-kpis">
        <StockKpiCards
          totalProducts={totalProducts}
          activeProductsCount={activeProductsCount}
          archivedProductsCount={archivedProductsCount}
          totalValueCost={totalValueCost}
          totalValueRetail={totalValueRetail}
          lowStockCount={lowStockProducts.length}
          outOfStockCount={outOfStockProducts.length}
          filterLowStockActive={filterLowStock}
          onToggleLowStockFilter={() => setFilterLowStock(!filterLowStock)}
          onGeneratePurchaseOrder={() => setShowPurchaseOrderModal(true)}
          canSeeCost={canSeeCost}
        />
      </div>

      {/* ── AXE 2 : Barre de Recherche & Douchette ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3" id="tour-stock-search">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, SKU ou code-barres (douchette)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-900 outline-none shadow-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterLowStock(!filterLowStock)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all ${
              filterLowStock
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            <span>Stock Faible ({lowStockProducts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowScannerModal(true)}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50"
          >
            <Camera className="h-4 w-4 text-emerald-600" />
            <span>Scanner Caméra</span>
          </button>
        </div>
      </div>

      {/* ── AXE 2 : Data Table des Produits & Marges Nettes ── */}
      <div id="tour-stock-list">
        <StockDataTable
          products={filteredProducts}
          canWrite={canWrite}
          canSeeCost={canSeeCost}
          canSeeBreakdown={canSeeBreakdown}
          onEditProduct={(p) => { setEditingProduct(p); setShowProductModal(true); }}
          onOpenMovementModal={(p) => { setQuickAdjustDelta(null); setAdjustProduct(p); }}
          onQuickAdjust={handleQuickAdjust}
          onTogglePosActif={handleTogglePosActif}
        />
      </div>

      {/* ── AXE 5 : Bouton Flottant Persistant mobile [ 📷 Scanner ] ── */}
      <FloatingScanButton onClick={() => setShowScannerModal(true)} />

      {/* Modale Ajustement Manuel (Axe 3) */}
      {adjustProduct && (
        <StockAdjustModal
          product={adjustProduct}
          initialType={quickAdjustDelta === null ? 'IN' : quickAdjustDelta > 0 ? 'IN' : 'OUT'}
          initialQuantity={quickAdjustDelta === null ? 1 : Math.abs(quickAdjustDelta)}
          onClose={() => { setAdjustProduct(undefined); setQuickAdjustDelta(null); }}
          onSuccess={() => { setAdjustProduct(undefined); setQuickAdjustDelta(null); void refetch(); }}
        />
      )}

      {/* Modale d'Importation Catalogue en 3 étapes (Axe 3) */}
      {showImportModal && (
        <CatalogImportWizard
          onClose={() => setShowImportModal(false)}
          onSuccess={() => { setShowImportModal(false); void refetch(); }}
        />
      )}

      {/* Modale Bon de Commande Fournisseur (Action Rupture) */}
      {showPurchaseOrderModal && (
        <PurchaseOrderModal
          etablissements={user?.etablissements ?? []}
          currentEtablissementId={user?.etablissementId ?? null}
          onClose={() => setShowPurchaseOrderModal(false)}
          onSuccess={() => { setShowPurchaseOrderModal(false); void refetch(); }}
        />
      )}

      {/* Modale Scanner Code-Barres Caméra (Axe 5) */}
      {showScannerModal && (
        <BarcodeScannerModal
          onScan={(code) => {
            setSearch(code);
            setShowScannerModal(false);
          }}
          onClose={() => setShowScannerModal(false)}
        />
      )}

      {/* Modale Création / Édition Produit */}
      {showProductModal && (
        <ProductFormModal
          product={editingProduct}
          onClose={() => setShowProductModal(false)}
          onSuccess={() => { setShowProductModal(false); void refetch(); }}
        />
      )}

      {/* Modale Transfert entre Boutiques */}
      {showTransferModal && (
        <StockTransferModal
          products={products}
          onClose={() => setShowTransferModal(false)}
          onSuccess={() => { setShowTransferModal(false); void refetch(); }}
        />
      )}
    </div>
  );
}
