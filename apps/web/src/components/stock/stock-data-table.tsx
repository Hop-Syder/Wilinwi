/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Data Table du Stock (Axe 2 : Ergonomie Data Table, Marge %, Toggle POS, Rapid +/- & Vue Mobile)
 * @created 2026-08-03
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Package, Edit, ArrowRightLeft, Plus, Minus, ChevronDown, ChevronUp, ExternalLink, Store
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
      {/* ── VUE DESKTOP : Table Complète Ergonomique ── */}
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
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 border border-slate-200/60">
                              <Package className="h-5 w-5" />
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
                      <td className="px-4 py-3 text-slate-600 font-medium">{p.categorie || 'Général'}</td>

                      {/* Cellule Tarification : Prix Achat + Prix Vente sur 2 lignes & Marge Nette % */}
                      <td className="px-4 py-3 font-mono">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{formatFCFA(prixVente)}</span>
                            {canSeeCost && prixAchat > 0 && (
                              <span className={`inline-flex items-center rounded-md border px-1.5 py-0.2 text-[10px] font-bold ${margeToneClass}`}>
                                +{margePercent}%
                              </span>
                            )}
                          </div>
                          {canSeeCost && (
                            <span className="text-[11px] text-slate-600 block font-sans">
                              Achat: {prixAchat > 0 ? formatFCFA(prixAchat) : '—'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Niveau de Stock avec Barre visuelle */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <StockLevelBar stock={p.stock} seuilAlerte={p.seuilAlerte ?? 5} />
                          {hasBreakdown && (
                            isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                      </td>

                      {/* Toggle Vendable en POS */}
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

                      {/* Actions Rapides & Mouvement */}
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Ajustement Rapide Inline + / - */}
                          {canWrite && (
                            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                              <button
                                type="button"
                                onClick={() => onQuickAdjust(p, -1)}
                                className="rounded p-1 text-slate-600 hover:bg-rose-100 hover:text-rose-700 transition-colors"
                                title="Retirer 1 unité"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onQuickAdjust(p, 1)}
                                className="rounded p-1 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700 transition-colors"
                                title="Ajouter 1 unité"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}

                          {canWrite && (
                            <>
                              <button
                                type="button"
                                onClick={() => onOpenMovementModal(p)}
                                className="p-2 text-slate-500 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
                                title="Mouvement / Ajustement complet"
                              >
                                <ArrowRightLeft className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => onEditProduct(p)}
                                className="p-2 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                                title="Modifier la fiche produit"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Répartition multi-boutiques si ligne dépliée */}
                    {hasBreakdown && isExpanded && (
                      <tr className="bg-slate-50/80">
                        <td colSpan={6} className="px-6 py-3 border-t border-slate-200/60">
                          <div className="flex flex-wrap items-center gap-4 text-xs">
                            <span className="font-bold text-slate-700 flex items-center gap-1">
                              <Store className="h-3.5 w-3.5 text-slate-400" /> Répartition par boutique :
                            </span>
                            {Object.entries(breakdown).map(([etabId, qte]) => (
                              <span key={etabId} className="rounded-lg bg-white px-2.5 py-1 border border-slate-200 text-slate-700 font-medium">
                                <strong className="text-slate-900">{etabId}</strong> : <span className="font-mono font-bold text-emerald-700">{formatQty(qte)}</span>
                              </span>
                            ))}
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

      {/* ── VUE MOBILE : Cartes Compactes pour Smartphone (Axe 5) ── */}
      <div className="md:hidden space-y-3">
        {products.map((p) => {
          const prixVente = p.prixCatalogue || 0;
          const prixAchat = p.prixAchat || 0;
          const isLowStock = p.stock <= (p.seuilAlerte ?? 5);

          return (
            <div
              key={p.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3 transition-all active:scale-[0.99]"
            >
              <div className="flex items-start gap-3">
                {/* Photo Produit */}
                {p.photos && p.photos.length > 0 ? (
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200">
                    <Image src={p.photos[0]} alt={p.nom} fill sizes="56px" className="object-cover" unoptimized />
                  </span>
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 border border-slate-200">
                    <Package className="h-6 w-6" />
                  </span>
                )}

                {/* Info Produit */}
                <div className="flex-1 min-w-0 space-y-1">
                  <Link href={`/stock/${p.id}`} className="font-bold text-slate-900 text-sm hover:underline block truncate">
                    {p.nom}
                  </Link>
                  <p className="text-xs text-slate-600 font-medium">{p.categorie || 'Général'} {p.sku ? `• SKU: ${p.sku}` : ''}</p>

                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="font-extrabold text-slate-900">{formatFCFA(prixVente)}</span>
                    {canSeeCost && prixAchat > 0 && (
                      <span className="text-[11px] text-slate-600">Cost: {formatFCFA(prixAchat)}</span>
                    )}
                  </div>
                </div>

                {/* Badge de Stock Géant Mobile */}
                <div className="shrink-0 text-right">
                  <span
                    className={`inline-flex flex-col items-center justify-center rounded-xl border px-3 py-1.5 font-mono ${
                      isLowStock
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    <span className="text-xs font-sans text-slate-600 font-medium">Stock</span>
                    <span className="text-base font-extrabold tabular-nums">{formatQty(p.stock)}</span>
                  </span>
                </div>
              </div>

              {/* Boutons d'Action Rapide Mobile */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 font-medium">Vendable POS :</span>
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

                {canWrite && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onQuickAdjust(p, -1)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => onQuickAdjust(p, 1)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenMovementModal(p)}
                      className="rounded-lg bg-slate-900 px-3 py-1 font-bold text-white shadow-sm"
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
