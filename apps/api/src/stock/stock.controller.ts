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

import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import {
  AdjustBatchSchema,
  CreateBatchSchema,
  CreateProductSchema,
  CreateStockMovementSchema,
  SetProductExclusionsSchema,
  SetStockThresholdSchema,
  UpdateProductSchema,
  UpsertProductUnitsSchema,
  UpsertRecipeSchema,
  type AdjustBatchInput,
  type AuthContext,
  type CreateBatchInput,
  type CreateProductInput,
  type CreateStockMovementInput,
  type SetProductExclusionsInput,
  type SetStockThresholdInput,
  type UpdateProductInput,
  type UpsertProductUnitsInput,
  type UpsertRecipeInput,
} from '@wilinwi/types';
import {
  CurrentUser,
  NonVital,
  RequireCapabilities,
  RequireInfraCapability,
} from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { StockService } from './stock.service';

@Controller('stock')
export class StockController {
  constructor(private readonly stock: StockService) {}

  @RequireCapabilities('stock:read')
  @Get('products')
  list(
    @CurrentUser() user: AuthContext,
    @Query('global') global?: string,
  ) {
    return this.stock.list(user, global === 'true');
  }

  /** Alertes de stock bas (avant :id pour ne pas être capté par la route paramétrée). */
  @RequireCapabilities('stock:read')
  @Get('products/alerts')
  alerts(@CurrentUser() user: AuthContext) {
    return this.stock.alerts(user);
  }

  @RequireCapabilities('stock:read')
  @Get('products/:id')
  getProduct(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.stock.getProduct(user, id);
  }

  /** Définit le seuil de réappro (alerte) d'un produit à un emplacement. */
  @RequireCapabilities('stock:write')
  @Patch('products/:id/threshold')
  setThreshold(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SetStockThresholdSchema)) dto: SetStockThresholdInput,
  ) {
    return this.stock.setThreshold(user, id, dto);
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
  @NonVital() // rapport avancé : suspendu dès l'impayé J+3
  @Get('valuation')
  valuation(@CurrentUser() user: AuthContext) {
    return this.stock.valuation(user);
  }

  /** Recette d'un plat (Food, Milestone 3) — capacité d'infrastructure recipes.basic. */
  @RequireCapabilities('stock:read')
  @RequireInfraCapability('recipes.basic')
  @Get('products/:id/recipe')
  getRecipe(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.stock.getRecipe(user, id);
  }

  /** Remplace la recette d'un plat (upsert intégral). */
  @RequireCapabilities('stock:write')
  @RequireInfraCapability('recipes.basic')
  @Put('products/:id/recipe')
  upsertRecipe(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpsertRecipeSchema)) dto: UpsertRecipeInput,
  ) {
    return this.stock.upsertRecipe(user, id, dto);
  }

  /** Lots d'un produit BATCHED à l'établissement courant (Health, M4 — FEFO). */
  @RequireCapabilities('stock:read')
  @RequireInfraCapability('stock.batches')
  @Get('products/:id/batches')
  listBatches(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.stock.listBatches(user, id);
  }

  /** Réception d'un lot (seule porte d'entrée du stock des produits BATCHED). */
  @RequireCapabilities('stock:write')
  @RequireInfraCapability('stock.batches')
  @Post('products/:id/batches')
  receiveBatch(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateBatchSchema)) dto: CreateBatchInput,
  ) {
    return this.stock.receiveBatch(user, id, dto);
  }

  /** Correction d'un lot (casse, retrait de périmés, recomptage) : delta signé. */
  @RequireCapabilities('stock:write')
  @RequireInfraCapability('stock.batches')
  @Patch('batches/:batchId')
  adjustBatch(
    @CurrentUser() user: AuthContext,
    @Param('batchId') batchId: string,
    @Body(new ZodValidationPipe(AdjustBatchSchema)) dto: AdjustBatchInput,
  ) {
    return this.stock.adjustBatch(user, batchId, dto);
  }

  /** Conditionnements d'un produit (Wholesale, M5) — stock.unitConversions. */
  @RequireCapabilities('stock:read')
  @RequireInfraCapability('stock.unitConversions')
  @Get('products/:id/units')
  getUnits(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.stock.getUnits(user, id);
  }

  /** Remplace les conditionnements d'un produit (tarif ≥ plancher × facteur — F7). */
  @RequireCapabilities('stock:write')
  @RequireInfraCapability('stock.unitConversions')
  @Put('products/:id/units')
  upsertUnits(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpsertProductUnitsSchema)) dto: UpsertProductUnitsInput,
  ) {
    return this.stock.upsertUnits(user, id, dto);
  }

  /** Établissements où le produit est EXCLU (Opt-Out — défaut : visible partout). */
  @RequireCapabilities('stock:write')
  @Get('products/:id/exclusions')
  getExclusions(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.stock.getExclusions(user, id);
  }

  /** Remplace la liste des exclusions (refusé si stock local ≠ 0). */
  @RequireCapabilities('stock:write')
  @Put('products/:id/exclusions')
  setExclusions(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SetProductExclusionsSchema)) dto: SetProductExclusionsInput,
  ) {
    return this.stock.setExclusions(user, id, dto);
  }

  // NOTE : POST /stock/transfers a été SUPPRIMÉ — les transferts inter-boutiques
  // passent par le Dispatch (POST /dispatches, warehouse), canal unique avec
  // statuts, référence, audit et contrôle d'accès à la source.
}
