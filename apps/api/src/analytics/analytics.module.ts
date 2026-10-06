/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Module d'injection de dépendances NestJS pour analytics
 * @created 2026-06-20
 * @updated 2026-10-06
 * 🌐 nexus-partners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Controller, Get, Module, Query } from '@nestjs/common';
import type { AuthContext } from '@wilinwi/types';
import { CurrentUser, RequireCapabilities } from '../common/decorators';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) { }

  @RequireCapabilities('reports:read')
  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthContext) {
    return this.analytics.dashboard(user);
  }

  /** Rapport historique sur une période (KPIs, tendance, top produits, paiements). */
  @RequireCapabilities('reports:read')
  @Get('report')
  report(
    @CurrentUser() user: AuthContext,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('compare') compare?: string,
  ) {
    return this.analytics.report(user, from, to, compare !== 'false');
  }

  /** Suivi des remises (ventes sous le prix affiché) par caissier et par client. */
  @RequireCapabilities('reports:read_full')
  @Get('discounts')
  discounts(
    @CurrentUser() user: AuthContext,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analytics.discounts(user, from, to);
  }

  @RequireCapabilities('reports:read')
  @Get('reports/dashboard')
  reportsDashboard(
    @CurrentUser() user: AuthContext,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('compare') compare?: string,
  ) {
    return this.analytics.report(user, from, to, compare !== 'false');
  }
}

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule { }
