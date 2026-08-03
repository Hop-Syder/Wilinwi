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
  OpenPosSessionSchema,
  ClosePosSessionSchema,
  type AuthContext,
  type CreateSaleInput,
  type OpenPosSessionInput,
  type ClosePosSessionInput,
} from '@wilinwi/types';
import {
  ANY_POS_CAPABILITY,
  CurrentUser,
  RequireAnyInfraCapability,
  RequireCapabilities,
} from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SalesService } from './sales.service';

const AddPaymentSchema = z.object({ montant: MoneySchema });
const AssignDeliverySchema = z.object({
  livreurId: z.string().uuid().nullable().optional(),
  adresseLivraison: z.string().max(500).nullable().optional(),
});
type AssignDeliveryInput = z.infer<typeof AssignDeliverySchema>;

@Controller('pos')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  // Défense en profondeur (TDR §2.7) : au-delà du rôle, l'établissement courant
  // doit avoir UN POS actif — refuse aussi la vente serveur-side au dunning J+30
  // (posBlocked → aucune capacité d'infrastructure).
  @RequireCapabilities('sale:create')
  @RequireAnyInfraCapability(...ANY_POS_CAPABILITY)
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
    @Query('posSessionId') posSessionId?: string,
    @Query('q') q?: string,
  ) {
    return this.sales.list(user, { from, to, status, clientId, posSessionId, q });
  }

  @RequireCapabilities('sale:read')
  @Get('sales/today')
  todaySales(@CurrentUser() user: AuthContext) {
    return this.sales.todaySales(user);
  }

  @RequireCapabilities('sale:read')
  @Get('sales/:id')
  get(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.sales.get(user, id);
  }

  // ─── Sessions POS & Clôture (Rapport Z) ───────────────────────────────────

  @RequireCapabilities('sale:read')
  @Get('sessions/active')
  getActiveSession(@CurrentUser() user: AuthContext) {
    return this.sales.getActivePosSession(user);
  }

  @RequireCapabilities('sale:create')
  @Post('sessions/open')
  openSession(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(OpenPosSessionSchema)) dto: OpenPosSessionInput,
  ) {
    return this.sales.openPosSession(user, dto.fondInitial, dto.note);
  }

  @RequireCapabilities('cash:collect')
  @Post('sessions/close')
  closeSession(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(ClosePosSessionSchema)) dto: ClosePosSessionInput,
  ) {
    return this.sales.closePosSession(user, dto.soldeReel, dto.note);
  }

  @RequireCapabilities('sale:read')
  @Get('sessions')
  listSessions(
    @CurrentUser() user: AuthContext,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
  ) {
    return this.sales.listPosSessions(user, { from, to, status });
  }

  @RequireCapabilities('sale:read')
  @Get('sessions/:id')
  getSession(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.sales.getPosSession(user, id);
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

  // Annulation d'une vente (ré-entrée stock + reversal) — gérant/propriétaire.
  @RequireCapabilities('sale:cancel')
  @Post('sales/:id/cancel')
  cancel(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.sales.cancelSale(user, id);
  }

  @RequireCapabilities('sale:return')
  @Post('sales/:id/return')
  returnPartial(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body() body: { returns: { saleItemId: string; quantiteRetournee: number }[]; action: 'REFUND_CASH' | 'CREATE_CREDIT' }
  ) {
    return this.sales.returnPartial(user, id, body.returns, body.action);
  }

  // ─── Livraisons ───────────────────────────────────────────────────────────
  // Marque une vente « à livrer » + assigne un livreur (vendeur/gérant/propriétaire).
  @RequireCapabilities('sale:create')
  @Post('sales/:id/delivery')
  assignDelivery(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AssignDeliverySchema)) dto: AssignDeliveryInput,
  ) {
    return this.sales.assignDelivery(user, id, dto);
  }

  // Liste des livraisons (le livreur ne voit que les siennes).
  @RequireCapabilities('delivery:update')
  @Get('deliveries')
  deliveries(@CurrentUser() user: AuthContext) {
    return this.sales.listDeliveries(user);
  }

  // Marque une livraison comme effectuée.
  @RequireCapabilities('delivery:update')
  @Post('sales/:id/delivered')
  markDelivered(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.sales.markDelivered(user, id);
  }
}
