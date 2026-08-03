/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant StockLevelBar (Barre de niveau de stock visuelle colorée - Axe 2)
 * @created 2026-08-03
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React from 'react';
import { formatQty } from '@wilinwi/ui';

interface StockLevelBarProps {
  stock: number;
  seuilAlerte?: number;
  maxTarget?: number;
}

export function StockLevelBar({ stock, seuilAlerte = 5, maxTarget = 50 }: StockLevelBarProps) {
  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock <= seuilAlerte;
  const isWarningStock = stock > seuilAlerte && stock <= seuilAlerte * 1.5;

  // Niveau en pourcentage pour la barre visuelle (capé entre 5% et 100%)
  const percentage = Math.min(100, Math.max(isOutOfStock ? 0 : 8, Math.round((stock / Math.max(maxTarget, seuilAlerte * 3)) * 100)));

  const barColorClass = isOutOfStock || isLowStock
    ? 'bg-rose-500'
    : isWarningStock
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  const badgeColorClass = isOutOfStock || isLowStock
    ? 'bg-rose-50 text-rose-700 border-rose-200'
    : isWarningStock
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  return (
    <div className="space-y-1 w-32 shrink-0">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 font-bold ${badgeColorClass}`}>
          {formatQty(stock)}
        </span>
        <span className="text-[10px] text-slate-400 font-sans">Seuil: {seuilAlerte}</span>
      </div>

      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200/50">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
