/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Contrôleur API pour la gestion des bons de commande d'achat
 * @created 2026-06-28
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  CreatePurchaseOrderSchema,
  ReceivePurchaseOrderSchema,
  type AuthContext,
  type CreatePurchaseOrderInput,
  type ReceivePurchaseOrderInput,
} from '@wilinwi/types';
import { CurrentUser, RequireCapabilities } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PurchaseOrdersService } from './purchase-orders.service';

@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly orders: PurchaseOrdersService) {}

  @RequireCapabilities('supplier:manage')
  @Get()
  list(@CurrentUser() user: AuthContext, @Query('status') status?: string) {
    return this.orders.list(user, status);
  }

  @RequireCapabilities('supplier:manage')
  @Get(':id')
  getOrder(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.orders.getOrder(user, id);
  }

  @RequireCapabilities('supplier:manage')
  @Post()
  create(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(CreatePurchaseOrderSchema)) dto: CreatePurchaseOrderInput,
  ) {
    return this.orders.create(user, dto);
  }

  @RequireCapabilities('supplier:manage')
  @Post(':id/receptions')
  receive(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ReceivePurchaseOrderSchema)) dto: ReceivePurchaseOrderInput,
  ) {
    return this.orders.receive(user, id, dto);
  }

  @RequireCapabilities('supplier:manage')
  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.orders.cancel(user, id);
  }
}
