/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Modale de consultation du stock inter-boutiques (Règle POS Niveau 2 - Rupture en boutique)
 * @created 2026-08-04
 * @updated 2026-08-04
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import { Store, AlertTriangle, X, PackageCheck } from 'lucide-react';
import type { ProductDto } from '@wilinwi/types';
import { formatQty } from '@wilinwi/ui';

interface StockInterBoutiquesModalProps {
  product: ProductDto | null;
  onClose: () => void;
}

export function StockInterBoutiquesModal({ product, onClose }: StockInterBoutiquesModalProps) {
  if (!product) return null;

  const stocks = product.otherEtablissementsStock ?? [];
  const hasOtherStocks = stocks.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Stock Inter-Boutiques</h2>
              <p className="text-xs font-medium text-slate-500">Disponibilité dans le réseau</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Détails Produit */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="space-y-1 flex-1">
              <h3 className="text-sm font-black text-slate-900 leading-tight">{product.nom}</h3>
              {product.sku && <p className="text-xs font-mono text-slate-400">SKU: {product.sku}</p>}
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700 border border-rose-200">
              <AlertTriangle className="h-3.5 w-3.5" />
              Rupture locale
            </span>
          </div>

          {/* Liste des stocks autres boutiques */}
          <div className="space-y-2">
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              Disponibilité réseau ({stocks.length})
            </p>

            {hasOtherStocks ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {stocks.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-emerald-500/50 transition-all shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-bold">
                        <Store className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{item.etablissementNom}</p>
                        <p className="text-[11px] font-medium text-emerald-600">Boutique partenaire</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800 border border-emerald-200 shadow-2xs">
                        <PackageCheck className="h-3.5 w-3.5" />
                        {formatQty(item.stock)} en stock
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 px-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-center">
                <AlertTriangle className="h-8 w-8 text-rose-400 mb-2" />
                <p className="text-xs font-bold text-slate-700">Rupture Générale dans le Réseau</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Ce produit est actuellement épuisé dans tous les autres établissements de l’entreprise.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Pied de page */}
        <div className="border-t border-slate-100 p-4 bg-slate-50/50 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-all"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
