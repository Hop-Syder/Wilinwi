/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Module d'injection de dépendances NestJS pour analytics
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Controller, Get, Module, Query } from '@nestjs/common';
import type { AuthContext } from '@wilinwi/types';
import { CurrentUser, NonVital, RequireCapabilities } from '../common/decorators';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @RequireCapabilities('reports:read')
  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthContext) {
    return this.analytics.dashboard(user);
  }

  /** Rapport historique sur une période (KPIs, tendance, top produits, paiements). */
  @RequireCapabilities('reports:read')
  @NonVital() // suspendu dès l'impayé J+3 (le dashboard de base reste vital)
  @Get('report')
  report(@CurrentUser() user: AuthContext, @Query('from') from?: string, @Query('to') to?: string) {
    return this.analytics.report(user, from, to);
  }
}

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
