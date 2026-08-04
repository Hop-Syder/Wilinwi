/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Data Table du Stock (Ergonomie Desktop & Nouvelle Carte Produit Mobile Aérée & Lisible)
 * @created 2026-08-03
 * @updated 2026-08-04
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Package, Edit, ChevronDown, ChevronUp, ExternalLink, Store
} from 'lucide-react';
import type { ProductDto } from '@wilinwi/types';
import { formatFCFA, formatQty } from '@wilinwi/ui';
import { StockLevelBar } from './stock-level-bar';

interface StockDataTableProps {
  products: ProductDto[];
  canWrite: boolean;
  canSeeCost: boolean;
  canSeeBreakdown: boolean;
  onEditProduct: (p: ProductDto) => void;
  onOpenMovementModal: (p: ProductDto) => void;
  onQuickAdjust: (p: ProductDto, delta: number) => void;
  onTogglePosActif: (p: ProductDto, newActif: boolean) => void;
}

export function StockDataTable({
  products,
  canWrite,
  canSeeCost,
  canSeeBreakdown,
  onEditProduct,
  onOpenMovementModal,
  onQuickAdjust,
  onTogglePosActif,
}: StockDataTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Obtenir les initiales propres pour le visuel de secours
  const getProductInitials = (nom: string) => {
    if (!nom) return 'PR';
    const words = nom.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return nom.substring(0, 2).toUpperCase();
  };

  if (!products || products.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-12 text-center text-slate-500 space-y-3">
        <Package className="mx-auto h-12 w-12 text-slate-300" />
        <h4 className="text-base font-bold text-slate-900">Aucun produit ne correspond à la recherche</h4>
        <p className="text-xs text-slate-500">Essayez de modifier vos filtres ou ajoutez un nouveau produit au catalogue.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── VUE DESKTOP : Table Complète Ergonomique (≥ md) ── */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-slate-500 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Produit</th>
                <th className="px-4 py-3.5">Catégorie</th>
                <th className="px-4 py-3.5">Prix & Marge Nette</th>
                <th className="px-4 py-3.5">Niveau de Stock</th>
                <th className="px-4 py-3.5 text-center">POS</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => {
                const isExpanded = expandedRows.has(p.id);
                const breakdown = p.stockParEtablissement;
                const hasBreakdown = canSeeBreakdown && breakdown && Object.keys(breakdown).length > 1;

                // Calcul de la Marge Nette % : ((Prix Vente - Prix Achat) / Prix Vente) * 100
                const prixVente = p.prixCatalogue || 0;
                const prixAchat = p.prixAchat || 0;
                const margeMontant = prixVente - prixAchat;
                const margePercent = prixVente > 0 && prixAchat > 0 ? Math.round((margeMontant / prixVente) * 100) : 0;

                const margeToneClass = margePercent >= 30
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : margePercent >= 10
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200';

                return (
                  <React.Fragment key={p.id}>
                    <tr
                      className={`hover:bg-slate-50/70 transition-colors ${hasBreakdown ? 'cursor-pointer' : ''}`}
                      onClick={hasBreakdown ? () => toggleRow(p.id) : undefined}
                    >
                      {/* Photo & Nom produit */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.photos && p.photos.length > 0 ? (
                            <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-slate-200">
                              <Image src={p.photos[0]} alt={p.nom} fill sizes="40px" className="object-cover" unoptimized />
                            </span>
                          ) : (
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 border border-slate-200/60 font-mono text-xs font-bold">
                              {getProductInitials(p.nom)}
                            </span>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/stock/${p.id}`}
                                className="font-bold text-slate-900 hover:text-emerald-600 hover:underline flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span>{p.nom}</span>
                                <ExternalLink className="h-3 w-3 text-slate-400" />
                              </Link>
                              {p.variants && p.variants.length > 0 && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                                  {p.variants.length} var.
                                </span>
                              )}
                            </div>
                            {p.sku && <span className="font-mono text-xs text-slate-600 block">{p.sku}</span>}
                          </div>
                        </div>
                      </td>

                      {/* Catégorie */}
                      <td className="px-4 py-3 font-medium text-slate-700">
                        <span className="inline-block rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 border border-slate-200/60">
                          {p.categorie || 'Général'}
                        </span>
                      </td>

                      {/* Prix Vente, Prix Achat & Marge % */}
                      <td className="px-4 py-3 font-mono">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 text-sm">{formatFCFA(prixVente)}</span>
                            {prixVente > 0 && prixAchat > 0 && (
                              <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-extrabold ${margeToneClass}`}>
                                +{margePercent}%
                              </span>
                            )}
                          </div>
                          {canSeeCost && (
                            <span className="text-[11px] text-slate-500 font-sans font-medium">
                              Achat : <strong className="font-bold text-slate-700">{formatFCFA(prixAchat)}</strong>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Niveau de Stock avec Barre Visuelle */}
                      <td className="px-4 py-3">
                        <div className="space-y-1 max-w-[170px]">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono font-extrabold text-slate-900 tabular-nums">
                              {formatQty(p.stock)}
                            </span>
                            {hasBreakdown && (
                              <span className="text-[10px] font-bold text-blue-600 flex items-center gap-0.5">
                                Breakdown {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              </span>
                            )}
                          </div>
                          <StockLevelBar stock={p.stock} seuilAlerte={p.seuilAlerte ?? 5} />
                        </div>
                      </td>

                      {/* Statut Vendable en POS */}
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={p.vendablePos ?? true}
                            onChange={(e) => onTogglePosActif(p, e.target.checked)}
                            className="sr-only peer"
                            disabled={!canWrite}
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                      </td>

                      {/* Boutons d'Action & Ajustement Rapide */}
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {canWrite && (
                            <>
                              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => onQuickAdjust(p, -1)}
                                  className="rounded-lg px-2 py-1 text-xs font-black text-slate-700 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                                  title="Retirer 1 unité (-1)"
                                >
                                  -1
                                </button>
                                <div className="w-px bg-slate-200 my-0.5" />
                                <button
                                  type="button"
                                  onClick={() => onQuickAdjust(p, 1)}
                                  className="rounded-lg px-2 py-1 text-xs font-black text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                                  title="Ajouter 1 unité (+1)"
                                >
                                  +1
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => onOpenMovementModal(p)}
                                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
                              >
                                Ajuster
                              </button>

                              <button
                                type="button"
                                onClick={() => onEditProduct(p)}
                                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                title="Éditer la fiche produit"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Ligne dépliée du Breakdown par Établissement */}
                    {isExpanded && hasBreakdown && (
                      <tr className="bg-slate-50/90 border-b border-slate-200">
                        <td colSpan={6} className="px-6 py-3">
                          <div className="space-y-1.5">
                            <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                              <Store className="h-3.5 w-3.5 text-blue-600" />
                              Répartition du Stock par Établissement :
                            </span>
                            <div className="flex flex-wrap gap-2 pt-1">
                              {Object.entries(breakdown).map(([etabName, qte]) => (
                                <span
                                  key={etabName}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-800 shadow-2xs"
                                >
                                  <span>{etabName} :</span>
                                  <strong className="font-mono font-extrabold text-slate-900">{formatQty(qte)}</strong>
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── NOUVELLE VUE MOBILE : Cartes Produits Aérées & Lisibles (< md) ── */}
      <div className="md:hidden space-y-3">
        {products.map((p) => {
          const prixVente = p.prixCatalogue || 0;
          const prixAchat = p.prixAchat || 0;
          const margeMontant = prixVente - prixAchat;
          const margePercent = prixVente > 0 && prixAchat > 0 ? Math.round((margeMontant / prixVente) * 100) : 0;

          const seuil = p.seuilAlerte ?? 5;
          const isOutOfStock = p.stock <= 0;
          const isLowStock = p.stock > 0 && p.stock <= seuil;

          // Détermination du style dynamique du Badge de Stock Géant
          const stockBadgeStyle = isOutOfStock
            ? 'bg-rose-50 text-rose-700 border-rose-200/90'
            : isLowStock
              ? 'bg-amber-50 text-amber-700 border-amber-200/90'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200/90';

          const stockLabel = isOutOfStock ? 'Rupture' : isLowStock ? 'Stock Bas' : 'Disponible';

          return (
            <div
              key={p.id}
              className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3.5 transition-all active:scale-[0.99]"
            >
              <div className="flex items-start gap-3.5">
                {/* 1. Photo Produit (w-16 h-16 rounded-xl) ou Visual Initials */}
                {p.photos && p.photos.length > 0 ? (
                  <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200/80 shadow-2xs">
                    <Image src={p.photos[0]} alt={p.nom} fill sizes="64px" className="object-cover" unoptimized />
                  </span>
                ) : (
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 border border-slate-200/70 font-mono text-base font-extrabold shadow-2xs">
                    {getProductInitials(p.nom)}
                  </span>
                )}

                {/* 2. Bloc Central : Nom 2 Lignes + Tags Catégorie/SKU + Prix & Marge % */}
                <div className="flex-1 min-w-0 space-y-1">
                  <Link
                    href={`/stock/${p.id}`}
                    className="font-extrabold text-slate-900 text-sm hover:text-emerald-600 hover:underline line-clamp-2 leading-snug"
                  >
                    {p.nom}
                  </Link>

                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-600 border border-slate-200/60">
                      {p.categorie || 'Général'}
                    </span>
                    {p.sku && (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-extrabold text-slate-500 border border-slate-200/60">
                        {p.sku}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 font-mono pt-1">
                    <span className="text-sm font-black text-slate-900">{formatFCFA(prixVente)}</span>
                    {prixVente > 0 && prixAchat > 0 && (
                      <span className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-black text-emerald-700 border border-emerald-200 font-sans">
                        +{margePercent}%
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Badge de Stock Géant Dynamique à Droite */}
                <div className="shrink-0 text-right">
                  <div className={`inline-flex flex-col items-center justify-center rounded-2xl border px-3 py-2 font-mono shadow-2xs ${stockBadgeStyle}`}>
                    <span className="text-[10px] font-sans font-bold uppercase tracking-wider block leading-none mb-1 opacity-90">
                      {stockLabel}
                    </span>
                    <span className="text-lg font-black tabular-nums leading-none">
                      {formatQty(p.stock)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Barre d'Actions au Bas de la Carte (POS Switch + Boutons -1 / +1 / Ajuster grands formats) */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
                {/* Switch Vendable POS */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-slate-600">POS :</span>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={p.vendablePos ?? true}
                      onChange={(e) => onTogglePosActif(p, e.target.checked)}
                      className="sr-only peer"
                      disabled={!canWrite}
                    />
                    <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Boutons d'Ajustement Rapide Espacés & Confortables (Touch min 44px) */}
                {canWrite && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onQuickAdjust(p, -1)}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 hover:bg-rose-50 hover:text-rose-700 min-h-[44px] min-w-[44px] active:scale-95 transition-all"
                      aria-label="Diminuer stock de 1"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => onQuickAdjust(p, 1)}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 min-h-[44px] min-w-[44px] active:scale-95 transition-all"
                      aria-label="Augmenter stock de 1"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenMovementModal(p)}
                      className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-black text-white shadow-xs hover:bg-slate-800 min-h-[44px] active:scale-95 transition-all"
                    >
                      Ajuster
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
