/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Module d'injection de dépendances NestJS pour sync
 * @created 2026-06-20
 * @updated 2026-09-08
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Body, Controller, Module, Post } from '@nestjs/common';
import { z } from 'zod';
import { CreateSaleSchema, type AuthContext, type SyncSaleResultRow } from '@wilinwi/types';
import { CurrentUser, RequireCapabilities } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SalesModule } from '../pos/sales.module';
import { SalesService } from '../pos/sales.service';
import { classifySyncError } from './sync-logic';

// Lot de ventes créées hors-ligne ; chaque vente porte un clientGeneratedId.
const SyncBatchSchema = z.object({
  sales: z.array(CreateSaleSchema).max(200),
});
type SyncBatchInput = z.infer<typeof SyncBatchSchema>;

@Controller('sync')
class SyncController {
  constructor(private readonly sales: SalesService) {}

  /**
   * Vide la file de synchronisation offline. Chaque opération est idempotente
   * (clientGeneratedId) → rejouer le même lot ne crée pas de doublon.
   */
  @RequireCapabilities('sale:create')
  @Post('sales')
  async syncSales(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(SyncBatchSchema)) dto: SyncBatchInput,
  ) {
    const results: SyncSaleResultRow[] = [];
    for (const sale of dto.sales) {
      try {
        const created = await this.sales.create(user, sale);
        results.push({ clientGeneratedId: sale.clientGeneratedId ?? null, ok: true, id: created?.id });
      } catch (err) {
        // Une vente rejetée n'abîme ni le lot ni l'état serveur : elle est renvoyée
        // avec sa raison structurée (motif `kind` + détail), le reste du lot
        // continue et le rejeu reste idempotent (clientGeneratedId).
        // Échec permanent (validation métier 4xx : stock insuffisant, produit
        // introuvable, plancher…) → inutile de re-tenter. Échec transitoire
        // (5xx / réseau) → l'auto-retry finira par passer.
        const { permanent, kind, error } = classifySyncError(err);
        results.push({
          clientGeneratedId: sale.clientGeneratedId ?? null,
          ok: false,
          permanent,
          kind,
          error,
        });
      }
    }
    return { synced: results.filter((r) => r.ok).length, total: results.length, results };
  }
}

@Module({
  imports: [SalesModule],
  controllers: [SyncController],
})
export class SyncModule {}
