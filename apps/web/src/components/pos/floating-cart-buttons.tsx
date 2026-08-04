/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant Bouton Panier Flottant avec Compteur Dynamique & Scanner (FloatingCartButtons)
 * @created 2026-08-04
 * @updated 2026-08-04
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

'use client';

import React from 'react';
import { ShoppingBag, Camera } from 'lucide-react';
import { useCurrency } from '@/lib/currency-context';

interface FloatingCartButtonsProps {
  itemCount: number;
  totalAmount: number;
  onOpenCart: () => void;
  onOpenScanner: () => void;
}

export function FloatingCartButtons({
  itemCount,
  totalAmount,
  onOpenCart,
  onOpenScanner,
}: FloatingCartButtonsProps) {
  const { formatAmount } = useCurrency();

  return (
    <div className="lg:hidden fixed bottom-20 right-4 z-40 flex flex-col items-end gap-3 pointer-events-auto">
      {/* 1. Bouton Panier Flottant (au-dessus du scanner) */}
      <button
        type="button"
        onClick={onOpenCart}
        className="relative flex items-center gap-3 px-4 py-3 bg-slate-900 text-white rounded-full shadow-2xl hover:bg-slate-800 transition-all active:scale-95 border border-slate-700/80 min-h-[48px]"
        aria-label="Ouvrir le panier"
      >
        <div className="relative">
          <ShoppingBag className="w-6 h-6 text-emerald-400 shrink-0" />
          {itemCount > 0 && (
            <span className="absolute -top-2.5 -right-2.5 bg-rose-600 text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse shadow-md border-2 border-slate-900">
              {itemCount}
            </span>
          )}
        </div>
        <div className="text-left pr-1">
          <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider leading-none">Panier</div>
          <div className="text-xs font-extrabold text-white leading-tight mt-0.5">
            {formatAmount(totalAmount)}
          </div>
        </div>
      </button>

      {/* 2. Bouton Scanner Flottant */}
      <button
        type="button"
        onClick={onOpenScanner}
        className="flex items-center justify-center w-12 h-12 bg-emerald-600 text-white rounded-full shadow-xl hover:bg-emerald-700 transition-all active:scale-95 border border-emerald-500/40 shrink-0"
        title="Scanner un code-barres"
        aria-label="Scanner un code-barres"
      >
        <Camera className="w-5 h-5" />
      </button>
    </div>
  );
}
