/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Module d'injection de dépendances NestJS pour l'assistant
 *   vocal Wilinwi AI.
 * @created 2026-09-08
 * @updated 2026-09-08
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { StockModule } from '../stock/stock.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiClient } from './gemini.client';

@Module({
  imports: [StockModule, AnalyticsModule],
  controllers: [AiController],
  providers: [AiService, GeminiClient],
  exports: [AiService],
})
export class AiModule {}
