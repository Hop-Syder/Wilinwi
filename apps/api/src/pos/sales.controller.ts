/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Contrôleur API pour sales
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import {
  CreateSaleSchema,
  MoneySchema,
  type AuthContext,
  type CreateSaleInput,
} from '@wilinwi/types';
import { CurrentUser, RequireCapabilities } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SalesService } from './sales.service';

const AddPaymentSchema = z.object({ montant: MoneySchema });
const ApproveSaleSchema = z.object({ approuve: z.boolean() });

@Controller('pos')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @RequireCapabilities('sale:create')
  @Post('sales')
  create(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(CreateSaleSchema)) dto: CreateSaleInput,
  ) {
    return this.sales.create(user, dto);
  }

  @RequireCapabilities('sale:read')
  @Get('sales')
  list(
    @CurrentUser() user: AuthContext,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
    @Query('clientId') clientId?: string,
    @Query('q') q?: string,
  ) {
    return this.sales.list(user, { from, to, status, clientId, q });
  }

  @RequireCapabilities('sale:read')
  @Get('sales/today')
  todaySales(@CurrentUser() user: AuthContext) {
    return this.sales.todaySales(user);
  }

  // Ventes en attente de validation gérant (écran « à valider »).
  @RequireCapabilities('sale:override_floor_price')
  @Get('sales/pending')
  pending(@CurrentUser() user: AuthContext) {
    return this.sales.pendingSales(user);
  }

  @RequireCapabilities('sale:read')
  @Get('sales/:id')
  get(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.sales.get(user, id);
  }

  @RequireCapabilities('cash:collect')
  @Post('sales/:id/payments')
  addPayment(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AddPaymentSchema)) dto: { montant: number },
  ) {
    return this.sales.addPayment(user, id, dto.montant);
  }

  // Validation (ou rejet) gérant d'une vente sous le plancher.
  @RequireCapabilities('sale:override_floor_price')
  @Post('sales/:id/approve')
  approve(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ApproveSaleSchema)) dto: { approuve: boolean },
  ) {
    return this.sales.approveSale(user, id, dto.approuve);
  }

  // Annulation d'une vente (ré-entrée stock + reversal) — gérant/propriétaire.
  @RequireCapabilities('sale:cancel')
  @Post('sales/:id/cancel')
  cancel(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.sales.cancelSale(user, id);
  }

  @RequireCapabilities('sale:cancel')
  @Post('sales/:id/return')
  returnPartial(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body() body: { returns: { saleItemId: string; quantiteRetournee: number }[]; action: 'REFUND_CASH' | 'CREATE_CREDIT' }
  ) {
    return this.sales.returnPartial(user, id, body.returns, body.action);
  }
}
