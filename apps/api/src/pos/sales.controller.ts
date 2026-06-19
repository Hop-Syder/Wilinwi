import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import {
  ApprovePriceOverrideSchema,
  CreateSaleSchema,
  MoneySchema,
  type ApprovePriceOverrideInput,
  type AuthContext,
  type CreateSaleInput,
} from '@wilinwi/types';
import { CurrentUser, RequireCapabilities } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SalesService } from './sales.service';

const AddPaymentSchema = z.object({ montant: MoneySchema });

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
  list(@CurrentUser() user: AuthContext) {
    return this.sales.list(user);
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

  @RequireCapabilities('sale:override_floor_price')
  @Get('overrides/pending')
  pendingOverrides(@CurrentUser() user: AuthContext) {
    return this.sales.pendingOverrides(user);
  }

  @RequireCapabilities('sale:override_floor_price')
  @Post('overrides/approve')
  approveOverride(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(ApprovePriceOverrideSchema)) dto: ApprovePriceOverrideInput,
  ) {
    return this.sales.approveOverride(user, dto);
  }
}
