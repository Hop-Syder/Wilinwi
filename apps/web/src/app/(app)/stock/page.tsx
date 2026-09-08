/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Page Stock — Vue consolidée multi-boutiques + lien Entrepôt
 * @created 2026-06-20
 * @updated 2026-06-28
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Plus, Package, Search, AlertTriangle, ArrowRightLeft,
  Edit, Clock, Warehouse, ChevronDown, ChevronUp, Store,
} from 'lucide-react';
import Link from 'next/link';
import type { ProductDto } from '@wilinwi/types';
import { Button, Card, Badge, IconButton, Skeleton, formatFCFA, formatQty, iconButtonVariants } from '@wilinwi/ui';
import { apiGet } from '@/lib/api';
import { useCachedQuery } from '@/lib/use-cached-query';
import { useAuth } from '@/lib/auth-context';
import { StockMovementModal, ProductFormModal, StockTransferModal } from '@/components/stock-modals';
import { StockAlertsBanner } from '@/components/stock-alerts-banner';
import { ContextualHelp } from '@/components/contextual-help';
import type { TourStep } from '@/components/tour-guide';

export default function StockPage() {
  const { user } = useAuth();
  const canWrite = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const canSeeCost = canWrite;
  const canSeeBreakdown = user?.role === 'OWNER'; // Uniquement le propriétaire

  const { data, loading, error, refetch } = useCachedQuery<ProductDto[]>(
    'stock/products-global',
    () => apiGet<ProductDto[]>('/api/stock/products?global=true'),
  );
  const products = data ?? [];
  // Chargement initial (pas encore de données, même en cache) : squelette plutôt
  // qu'un « catalogue vide » trompeur pendant la première requête.
  const isInitialLoading = loading && products.length === 0;

  // UI State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDto | undefined>();
  const [movementProduct, setMovementProduct] = useState<ProductDto | undefined>();
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Filters
  const [search, setSearch] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);

  // Nom des boutiques depuis le profil (id → nom)
  const etablissementNames = Object.fromEntries(
    (user?.etablissements ?? []).map((e) => [e.id, e.nom]),
  );

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const tourSteps: TourStep[] = [
    {
      targetId: 'tour-stock-search',
      title: 'Recherche et Filtres',
      content: 'Trouvez rapidement un produit par son nom ou son SKU. Utilisez le filtre "Stock Faible" pour isoler les ruptures imminentes.',
      position: 'bottom',
    },
    {
      targetId: 'tour-stock-list',
      title: 'Votre Catalogue',
      content: 'Consultez le stock total toutes boutiques confondues. Cliquez sur une ligne pour voir la répartition par boutique.',
      position: 'bottom',
    },
    {
      targetId: 'tour-stock-actions',
      title: 'Gestion du stock',
      content: 'Utilisez ces actions pour corriger un inventaire, modifier une fiche produit, ou accéder à l\'historique.',
      position: 'left',
    },
  ];

  const filteredProducts = products.filter((p) => {
    if (filterLowStock && p.stock > (p.seuilAlerte ?? 5)) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!p.nom.toLowerCase().includes(s) && !p.sku?.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  return (
    <div>
      <StockAlertsBanner />
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand">Stock</h1>
          <p className="mt-1 text-sm text-slate-500">
            Stock total consolidé — toutes boutiques confondues.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ContextualHelp
            storageKey="wilinwi_stock_tour_done"
            tourSteps={tourSteps}
            useCases={[
              { title: 'Stock par boutique', description: 'Chaque établissement a son propre stock. Le sélecteur en haut change la boutique affichée ; « Tous les établissements » montre le total consolidé et le détail par boutique.' },
              { title: 'Entrée de marchandise', description: 'Cliquez sur l\'icône de mouvement sur la ligne d\'un produit, choisissez "Entrée" et indiquez la quantité reçue.' },
              { title: 'Transférer entre boutiques', description: 'Pour déplacer du stock de l\'entrepôt (ou d\'une boutique) vers une autre, passez par Entrepôt → Dispatch : la validation déplace le stock des deux côtés.' },
              { title: 'Alerte stock bas', description: 'Sur la fiche d\'un produit, définissez un seuil de réappro par établissement. Un bandeau « stock bas » s\'affiche en haut quand un produit passe sous son seuil.' },
              { title: 'Corriger un écart (Ajustement)', description: 'Lors d\'un inventaire, utilisez l\'Ajustement pour définir la quantité exacte en rayon.' },
            ]}
          />
          {/* Lien vers l'entrepôt pour ravitaillement */}
          <Link href="/entrepot">
            <Button variant="outline">
              <Warehouse className="h-4 w-4" /> Entrepôt
            </Button>
          </Link>
          {canWrite && user?.etablissements && user.etablissements.length >= 2 && (
            <Button onClick={() => setShowTransferModal(true)} variant="outline">
              <ArrowRightLeft className="h-4 w-4" /> Transférer
            </Button>
          )}
          {canWrite && (
            <Button onClick={() => { setEditingProduct(undefined); setShowProductModal(true); }}>
              <Plus className="h-4 w-4" /> Nouveau produit
            </Button>
          )}
        </div>
      </div>

      {/* Bandeau informatif stock global */}
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3">
        <Warehouse className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        <div className="text-sm text-brand/80">
          <span className="font-semibold text-brand">Vue globale activée</span> — le stock affiché est la somme de toutes vos boutiques.
          Pour ravitailler, passez par{' '}
          <Link href="/entrepot" className="font-medium underline underline-offset-2 hover:text-brand/60">
            l'Entrepôt → Bons de commande
          </Link>.
          {canSeeBreakdown && (
            <span className="ml-1 text-slate-500">Cliquez sur une ligne pour voir la répartition par boutique.</span>
          )}
        </div>
      </div>

      {error && products.length === 0 && (
        <p className="mt-4 text-sm text-red-600">{error.message}</p>
      )}

      {/* Filtres */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center" id="tour-stock-search">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 pl-9 pr-4 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={filterLowStock ? 'danger' : 'outline'}
            onClick={() => setFilterLowStock(!filterLowStock)}
          >
            <AlertTriangle className="h-4 w-4" />
            Stock Faible
          </Button>
        </div>
      </div>

      {/* Catalogue */}
      <Card className="mt-6 overflow-hidden p-0" id="tour-stock-list">
        {isInitialLoading ? (
          <div className="space-y-4 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton variant="block" className="h-10 w-10" />
                <div className="flex-1 space-y-2">
                  <Skeleton variant="text" className="w-1/3" />
                  <Skeleton variant="text" className="w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
        {/* 📱 Mobile : cartes empilées */}
        <div className="divide-y divide-slate-100 md:hidden">
          {filteredProducts.map((p) => {
            const isExpanded = expandedRows.has(p.id);
            const breakdown = p.stockParEtablissement;
            const hasBreakdown = canSeeBreakdown && breakdown && Object.keys(breakdown).length > 1;
            return (
              <div key={p.id} className="p-4">
                <div
                  className={`flex items-start justify-between gap-3 ${hasBreakdown ? 'cursor-pointer' : ''}`}
                  onClick={hasBreakdown ? () => toggleRow(p.id) : undefined}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {p.photos && p.photos.length > 0 ? (
                      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200">
                        <Image src={p.photos[0]} alt={p.nom} fill sizes="40px" className="object-cover" unoptimized />
                      </span>
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-300">
                        <Package className="h-5 w-5" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-slate-900">{p.nom}</span>
                        {p.variants && p.variants.length > 0 && (
                          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                            {p.variants.length} var.
                          </span>
                        )}
                      </div>
                      <div className="truncate text-xs text-slate-400">
                        {p.sku ? `${p.sku} · ` : ''}{p.categorie || 'Sans catégorie'}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Badge tone={p.stock <= (p.seuilAlerte ?? 5) ? 'danger' : 'success'}>
                      {formatQty(p.stock)}
                    </Badge>
                    {hasBreakdown &&
                      (isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                      ))}
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="tabular font-semibold text-slate-800">
                    {formatFCFA(p.prixCatalogue)}
                  </span>
                  {canSeeCost && p.prixAchat !== undefined && (
                    <span className="tabular text-xs text-slate-400">
                      Achat : {formatFCFA(p.prixAchat)}
                    </span>
                  )}
                </div>

                {isExpanded && hasBreakdown && (
                  <div className="mt-2 flex flex-wrap gap-3 rounded-lg bg-slate-50/70 p-2.5">
                    {Object.entries(breakdown!).map(([etabId, qty]) => (
                      <div key={etabId} className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Store className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="font-medium">{etablissementNames[etabId] ?? etabId}</span>
                        <span className="text-slate-400">·</span>
                        <Badge tone={qty <= (p.seuilAlerte ?? 5) ? 'danger' : 'neutral'}>
                          {formatQty(qty)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  className="mt-3 flex items-center justify-end gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {canWrite && (
                    <>
                      <IconButton
                        icon={<ArrowRightLeft className="h-4 w-4" />}
                        onClick={() => setMovementProduct(p)}
                        aria-label="Mouvement de stock"
                        title="Mouvement de stock"
                      />
                      <IconButton
                        icon={<Edit className="h-4 w-4" />}
                        onClick={() => { setEditingProduct(p); setShowProductModal(true); }}
                        aria-label="Modifier le produit"
                        title="Modifier le produit"
                      />
                    </>
                  )}
                  <Link href={`/stock/${p.id}`} className={iconButtonVariants()} aria-label="Historique" title="Historique">
                    <Clock className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
          {filteredProducts.length === 0 && (
            <div className="p-12 text-center text-slate-400">
              <Package className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              {products.length === 0 ? (
                <>
                  <p className="font-medium text-slate-700">Votre catalogue est vide</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Ajoutez votre premier produit pour commencer à vendre.
                  </p>
                  {canWrite && (
                    <Button
                      className="mt-4"
                      onClick={() => { setEditingProduct(undefined); setShowProductModal(true); }}
                    >
                      <Plus className="h-4 w-4" /> Ajouter un produit
                    </Button>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-400">Aucun produit ne correspond à votre recherche.</p>
              )}
            </div>
          )}
        </div>

        {/* 🖥️ Desktop : tableau */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Produit</th>
                <th className="px-4 py-3 font-medium">Catégorie</th>
                <th className="px-4 py-3 font-medium">Catalogue</th>
                {canSeeCost && <th className="px-4 py-3 font-medium">Achat</th>}
                <th className="px-4 py-3 font-medium">Stock total</th>
                <th className="px-4 py-3 font-medium text-right" id="tour-stock-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const isExpanded = expandedRows.has(p.id);
                const breakdown = p.stockParEtablissement;
                const hasBreakdown = canSeeBreakdown && breakdown && Object.keys(breakdown).length > 1;
                return [
                  <tr
                    key={p.id}
                    className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/50 ${hasBreakdown ? 'cursor-pointer' : ''}`}
                    onClick={hasBreakdown ? () => toggleRow(p.id) : undefined}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.photos && p.photos.length > 0 ? (
                          <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-slate-200">
                            <Image src={p.photos[0]} alt={p.nom} fill sizes="36px" className="object-cover" unoptimized />
                          </span>
                        ) : (
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-300">
                            <Package className="h-4 w-4" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">{p.nom}</span>
                            {p.variants && p.variants.length > 0 && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                {p.variants.length} var.
                              </span>
                            )}
                          </div>
                          {p.sku && <div className="text-xs text-slate-400">{p.sku}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{p.categorie || '—'}</td>
                    <td className="tabular px-4 py-3">{formatFCFA(p.prixCatalogue)}</td>
                    {canSeeCost && (
                      <td className="tabular px-4 py-3 text-slate-600">
                        {p.prixAchat !== undefined ? formatFCFA(p.prixAchat) : '—'}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Badge tone={p.stock <= (p.seuilAlerte ?? 5) ? 'danger' : 'success'}>
                          {formatQty(p.stock)}
                        </Badge>
                        {hasBreakdown && (
                          isExpanded
                            ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                            : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {canWrite && (
                          <>
                            <IconButton
                              size="sm"
                              icon={<ArrowRightLeft className="h-4 w-4" />}
                              onClick={() => setMovementProduct(p)}
                              className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                              aria-label="Mouvement de stock"
                              title="Mouvement de stock"
                            />
                            <IconButton
                              size="sm"
                              icon={<Edit className="h-4 w-4" />}
                              onClick={() => { setEditingProduct(p); setShowProductModal(true); }}
                              className="text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                              aria-label="Modifier le produit"
                              title="Modifier le produit"
                            />
                          </>
                        )}
                        <Link
                          href={`/stock/${p.id}`}
                          className={iconButtonVariants({ size: 'sm', className: 'text-slate-400 hover:text-brand hover:bg-brand/10' })}
                          aria-label="Historique"
                          title="Historique"
                        >
                          <Clock className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>,
                  // Ligne de breakdown par boutique (expandable)
                  isExpanded && hasBreakdown && (
                    <tr key={`${p.id}-breakdown`} className="bg-slate-50/70 border-b border-slate-100">
                      <td colSpan={canSeeCost ? 6 : 5} className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-3 pl-12">
                          {Object.entries(breakdown!).map(([etabId, qty]) => (
                            <div key={etabId} className="flex items-center gap-1.5 text-xs text-slate-600">
                              <Store className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="font-medium">
                                {etablissementNames[etabId] ?? etabId}
                              </span>
                              <span className="text-slate-400">·</span>
                              <Badge tone={qty <= (p.seuilAlerte ?? 5) ? 'danger' : 'neutral'}>
                                {formatQty(qty)}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ),
                ];
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={canSeeCost ? 6 : 5} className="px-4 py-12 text-center">
                    <Package className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                    {products.length === 0 ? (
                      <>
                        <p className="font-medium text-slate-700">Votre catalogue est vide</p>
                        <p className="mt-1 text-sm text-slate-400">
                          Ajoutez votre premier produit pour commencer à vendre.
                        </p>
                        {canWrite && (
                          <Button
                            className="mt-4"
                            onClick={() => { setEditingProduct(undefined); setShowProductModal(true); }}
                          >
                            <Plus className="h-4 w-4" /> Ajouter un produit
                          </Button>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-slate-400">Aucun produit ne correspond à votre recherche.</p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
          </>
        )}
      </Card>

      {/* Modales */}
      {showProductModal && (
        <ProductFormModal
          product={editingProduct}
          onClose={() => setShowProductModal(false)}
          onSuccess={() => { setShowProductModal(false); void refetch(); }}
        />
      )}

      {movementProduct && (
        <StockMovementModal
          product={movementProduct}
          onClose={() => setMovementProduct(undefined)}
          onSuccess={() => { setMovementProduct(undefined); void refetch(); }}
        />
      )}

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
