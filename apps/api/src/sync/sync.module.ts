/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Module d'injection de dépendances NestJS pour sync
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Body, Controller, Module, Post } from '@nestjs/common';
import { z } from 'zod';
import { CreateSaleSchema, type AuthContext } from '@wilinwi/types';
import { CurrentUser, RequireCapabilities } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SalesModule } from '../pos/sales.module';
import { SalesService } from '../pos/sales.service';

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
    const results = [];
    for (const sale of dto.sales) {
      try {
        const created = await this.sales.create(user, sale);
        results.push({ clientGeneratedId: sale.clientGeneratedId, ok: true, id: created?.id });
      } catch (err) {
        results.push({
          clientGeneratedId: sale.clientGeneratedId,
          ok: false,
          error: err instanceof Error ? err.message : 'Erreur inconnue',
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
