/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Controller API pour la consultation des devises et des taux de conversion (Module 1).
 * @created 2026-08-03
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Controller, Get } from '@nestjs/common';
import { CurrencyService } from './currency.service';

@Controller('currency')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get('rates')
  getRates() {
    return {
      currencies: this.currencyService.getSupportedCurrencies(),
      rates: this.currencyService.getRates(),
    };
  }
}
