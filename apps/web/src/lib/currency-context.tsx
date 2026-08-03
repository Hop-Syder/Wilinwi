'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Contexte React de gestion de la devise active pour la caisse et le catalogue (Module 1).
 *   Effectue la conversion dynamique d'affichage tout en préservant les montants bruts FCFA.
 * @created 2026-08-03
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Currency,
  SUPPORTED_CURRENCIES,
  DEFAULT_EXCHANGE_RATES,
  convertFromPivot,
  formatCurrencyAmount,
} from '@wilinwi/types';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  convertAmount: (amountInFcfa: number) => number;
  formatAmount: (amountInFcfa: number) => string;
  rates: Record<Currency, number>;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'XOF',
  setCurrency: () => {},
  convertAmount: (amount) => amount,
  formatAmount: (amount) => formatCurrencyAmount(amount, 'XOF'),
  rates: DEFAULT_EXCHANGE_RATES,
});

const CURRENCY_STORAGE_KEY = 'wilinwi_selected_currency';

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('XOF');

  useEffect(() => {
    const saved = localStorage.getItem(CURRENCY_STORAGE_KEY) as Currency | null;
    if (saved && (SUPPORTED_CURRENCIES as readonly string[]).includes(saved)) {
      setCurrencyState(saved);
    }
  }, []);

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    localStorage.setItem(CURRENCY_STORAGE_KEY, newCurrency);
  };

  const convertAmount = (amountInFcfa: number): number => {
    return convertFromPivot(amountInFcfa, currency, DEFAULT_EXCHANGE_RATES);
  };

  const formatAmount = (amountInFcfa: number): string => {
    const converted = convertAmount(amountInFcfa);
    return formatCurrencyAmount(converted, currency);
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        convertAmount,
        formatAmount,
        rates: DEFAULT_EXCHANGE_RATES,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
