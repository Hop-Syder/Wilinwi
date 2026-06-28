/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Contrôleur API pour la gestion des fournisseurs
 * @created 2026-06-28
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  CreateSupplierSchema,
  RecordSupplierPaymentSchema,
  UpdateSupplierSchema,
  type AuthContext,
  type CreateSupplierInput,
  type RecordSupplierPaymentInput,
  type UpdateSupplierInput,
} from '@wilinwi/types';
import { CurrentUser, RequireCapabilities } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SuppliersService } from './suppliers.service';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @RequireCapabilities('supplier:manage')
  @Get()
  list(@CurrentUser() user: AuthContext) {
    return this.suppliers.list(user);
  }

  @RequireCapabilities('supplier:manage')
  @Get('payments')
  listPayments(@CurrentUser() user: AuthContext, @Query('supplierId') supplierId?: string) {
    return this.suppliers.listPayments(user, supplierId);
  }

  @RequireCapabilities('supplier:manage')
  @Get(':id')
  getSupplier(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.suppliers.getSupplier(user, id);
  }

  @RequireCapabilities('supplier:manage')
  @Post()
  create(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(CreateSupplierSchema)) dto: CreateSupplierInput,
  ) {
    return this.suppliers.create(user, dto);
  }

  @RequireCapabilities('supplier:manage')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateSupplierSchema)) dto: UpdateSupplierInput,
  ) {
    return this.suppliers.update(user, id, dto);
  }

  @RequireCapabilities('supplier:manage')
  @Post(':id/payments')
  paySupplier(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RecordSupplierPaymentSchema)) dto: RecordSupplierPaymentInput,
  ) {
    return this.suppliers.paySupplier(user, id, dto);
  }
}
