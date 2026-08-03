/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Service de gestion des devises et des taux de change pour l'expansion régionale (Module 1).
 * @created 2026-08-03
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Injectable } from '@nestjs/common';
import {
  Currency,
  DEFAULT_EXCHANGE_RATES,
  SUPPORTED_CURRENCIES,
  CURRENCY_LABELS,
  convertFromPivot,
  convertToPivot,
} from '@wilinwi/types';

@Injectable()
export class CurrencyService {
  /**
   * Retourne la liste des devises supportées avec leurs métadonnées et taux de référence.
   */
  getSupportedCurrencies() {
    return SUPPORTED_CURRENCIES.map((code) => ({
      code,
      ...CURRENCY_LABELS[code],
      rateAgainstPivot: DEFAULT_EXCHANGE_RATES[code],
    }));
  }

  /**
   * Retourne la carte des taux de conversion actifs par rapport à la référence FCFA (XOF).
   */
  getRates(): Record<Currency, number> {
    return DEFAULT_EXCHANGE_RATES;
  }

  /**
   * Effectue la conversion d'un montant de la référence FCFA vers une devise cible.
   */
  convertFromPivot(amount: number, target: Currency): number {
    return convertFromPivot(amount, target, DEFAULT_EXCHANGE_RATES);
  }

  /**
   * Convertit un montant exprimé dans une devise vers le montant pivot FCFA.
   */
  convertToPivot(amount: number, source: Currency): number {
    return convertToPivot(amount, source, DEFAULT_EXCHANGE_RATES);
  }
}
