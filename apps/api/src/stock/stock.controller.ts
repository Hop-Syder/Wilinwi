/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Contrôleur API pour stock
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  CreateProductSchema,
  CreateStockMovementSchema,
  UpdateProductSchema,
  type AuthContext,
  type CreateProductInput,
  type CreateStockMovementInput,
  type UpdateProductInput,
} from '@wilinwi/types';
import { CurrentUser, RequireCapabilities } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { StockService } from './stock.service';

@Controller('stock')
export class StockController {
  constructor(private readonly stock: StockService) {}

  @RequireCapabilities('stock:read')
  @Get('products')
  list(@CurrentUser() user: AuthContext) {
    return this.stock.list(user);
  }

  @RequireCapabilities('stock:read')
  @Get('products/:id')
  getProduct(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.stock.getProduct(user, id);
  }

  @RequireCapabilities('stock:write')
  @Post('products')
  create(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(CreateProductSchema)) dto: CreateProductInput,
  ) {
    return this.stock.create(user, dto);
  }

  @RequireCapabilities('stock:write')
  @Patch('products/:id')
  update(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateProductSchema)) dto: UpdateProductInput,
  ) {
    return this.stock.update(user, id, dto);
  }

  @RequireCapabilities('stock:write')
  @Post('movements')
  addMovement(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(CreateStockMovementSchema)) dto: CreateStockMovementInput,
  ) {
    return this.stock.addMovement(user, dto);
  }

  @RequireCapabilities('stock:read')
  @Get('products/:id/movements')
  movements(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.stock.movements(user, id);
  }

  // Valorisation = données sensibles (prix d'achat) → reports:read_full.
  @RequireCapabilities('reports:read_full')
  @Get('valuation')
  valuation(@CurrentUser() user: AuthContext) {
    return this.stock.valuation(user);
  }
}
