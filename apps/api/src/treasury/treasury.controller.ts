/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Contrôleur Trésorerie — endpoints REST pour soldes, stats, dépenses, virements, mouvements filtrés, clôtures.
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  CashCloseSchema,
  RecordCashMovementSchema,
  RecordExpenseSchema,
  TransferSchema,
  type AuthContext,
  type CashAccount,
  type CashCloseInput,
  type RecordCashMovementInput,
  type RecordExpenseInput,
  type TransferInput,
} from '@wilinwi/types';
import { CurrentUser, RequireCapabilities } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { TreasuryService } from './treasury.service';

@Controller('treasury')
export class TreasuryController {
  constructor(private readonly treasury: TreasuryService) {}

  /** GET /api/treasury/balances — Soldes bruts par compte. */
  @RequireCapabilities('treasury:read')
  @Get('balances')
  balances(@CurrentUser() user: AuthContext) {
    return this.treasury.balances(user);
  }

  /** GET /api/treasury/stats — Soldes détaillés + KPIs journaliers. */
  @RequireCapabilities('treasury:read')
  @Get('stats')
  stats(@CurrentUser() user: AuthContext) {
    return this.treasury.stats(user);
  }

  /**
   * GET /api/treasury/movements
   * Paramètres optionnels : compte, source, from (YYYY-MM-DD), to (YYYY-MM-DD)
   */
  @RequireCapabilities('treasury:read')
  @Get('movements')
  movements(
    @CurrentUser() user: AuthContext,
    @Query('compte') compte?: CashAccount,
    @Query('source') source?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.treasury.listMovements(user, { compte, source, from, to });
  }

  /** GET /api/treasury/closes — Historique des clôtures. */
  @RequireCapabilities('treasury:read')
  @Get('closes')
  closes(@CurrentUser() user: AuthContext, @Query('compte') compte?: CashAccount) {
    return this.treasury.listCloses(user, compte);
  }

  /** POST /api/treasury/expenses — Enregistrer une dépense (sortie). */
  @RequireCapabilities('treasury:write')
  @Post('expenses')
  expense(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(RecordExpenseSchema)) dto: RecordExpenseInput,
  ) {
    return this.treasury.recordExpense(user, dto);
  }

  /** POST /api/treasury/movements — Mouvement manuel (ajustement / ouverture). */
  @RequireCapabilities('treasury:write')
  @Post('movements')
  movement(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(RecordCashMovementSchema)) dto: RecordCashMovementInput,
  ) {
    return this.treasury.recordMovement(user, dto);
  }

  /** POST /api/treasury/transfers — Virement entre comptes (avec vérification solde). */
  @RequireCapabilities('treasury:write')
  @Post('transfers')
  transfer(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(TransferSchema)) dto: TransferInput,
  ) {
    return this.treasury.transfer(user, dto);
  }

  /** POST /api/treasury/close — Clôture de caisse (motif obligatoire si écart). */
  @RequireCapabilities('cash:close')
  @Post('close')
  close(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(CashCloseSchema)) dto: CashCloseInput,
  ) {
    return this.treasury.close(user, dto);
  }
}
