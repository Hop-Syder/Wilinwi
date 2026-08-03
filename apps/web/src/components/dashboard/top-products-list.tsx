/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant Classement Top 5 Meilleures Ventes avec contribution au CA %
 * @created 2026-08-03
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React from 'react';
import { Award } from 'lucide-react';
import { formatQty } from '@wilinwi/ui';
import { DashboardEmptyState } from './dashboard-empty-state';
import { useCurrency } from '@/lib/currency-context';

export interface TopProduct {
  id: string;
  nom: string;
  categorie?: string;
  quantite: number;
  ca: number;
  contributionCaPercent?: number;
}

interface TopProductsListProps {
  products: TopProduct[];
}

export function TopProductsList({ products }: TopProductsListProps) {
  const { formatAmount } = useCurrency();
  if (!products || products.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm flex flex-col justify-between h-full">
        <h3 className="text-base font-bold text-slate-900 mb-4">Top 5 Meilleurs Produits</h3>
        <DashboardEmptyState title="Aucune vente enregistrée" description="Vos meilleures ventes s'afficheront ici." />
      </div>
    );
  }

  const maxCa = Math.max(...products.map((p) => p.ca), 1);

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm flex flex-col justify-between h-full space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Top 5 Meilleures Ventes</h3>
          <p className="text-xs text-slate-600">Articles générant le plus de chiffre d'affaires</p>
        </div>
        <div className="rounded-xl bg-amber-50 p-2 text-amber-600 border border-amber-100">
          <Award className="h-5 w-5" />
        </div>
      </div>

      <div className="space-y-3.5">
        {products.slice(0, 5).map((product, idx) => {
          const percentWidth = Math.min(100, Math.max(5, Math.round((product.ca / maxCa) * 100)));
          return (
            <div key={product.id || idx} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Badge de Rang */}
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold font-mono ${
                      idx === 0
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : idx === 1
                          ? 'bg-slate-200 text-slate-700'
                          : idx === 2
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    #{idx + 1}
                  </span>

                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{product.nom}</p>
                    <span className="text-[11px] text-slate-600 font-medium">
                      {product.categorie || 'Général'} • {formatQty(product.quantite)} vendu{product.quantite > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="text-right font-mono shrink-0 pl-2">
                  <p className="font-bold text-slate-900">{formatAmount(product.ca)}</p>
                  {product.contributionCaPercent !== undefined && (
                    <span className="text-[10px] text-emerald-600 font-bold">
                      {product.contributionCaPercent}% du CA
                    </span>
                  )}
                </div>
              </div>

              {/* Barre de progression relative */}
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${percentWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
