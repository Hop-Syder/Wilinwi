'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant sélecteur de devise d'affichage (POS & Catalogue - Module 1).
 * @created 2026-08-03
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import React from 'react';
import { useCurrency } from '@/lib/currency-context';
import { SUPPORTED_CURRENCIES, CURRENCY_LABELS, Currency } from '@wilinwi/types';
import { Coins } from 'lucide-react';

export function CurrencySelector({ className = '' }: { className?: string }) {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className={`relative inline-flex items-center gap-1.5 ${className}`}>
      <Coins className="h-4 w-4 text-slate-400" />
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value as Currency)}
        className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/30 cursor-pointer transition-colors"
        title="Sélecteur de devise d'affichage"
      >
        {SUPPORTED_CURRENCIES.map((code) => (
          <option key={code} value={code}>
            {code} ({CURRENCY_LABELS[code].symbol})
          </option>
        ))}
      </select>
    </div>
  );
}
