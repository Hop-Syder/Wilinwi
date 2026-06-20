/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Module d'injection de dépendances NestJS pour app
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env';
import { CommonModule } from './common/common.module';
import { Public } from './common/decorators';
import { AuthModule } from './auth/auth.module';
import { StockModule } from './stock/stock.module';
import { InventoryModule } from './inventory/inventory.module';
import { SalesModule } from './pos/sales.module';
import { CrmModule } from './crm/crm.module';
import { TreasuryModule } from './treasury/treasury.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SyncModule } from './sync/sync.module';

@Controller()
class HealthController {
  @Public()
  @Get()
  root() {
    return {
      status: 'online',
      message: "🚀 L'API Wilinwi est connectée et fonctionne parfaitement !",
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', service: 'wilinwi-api', ts: new Date().toISOString() };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    CommonModule,
    AuthModule,
    StockModule,
    InventoryModule,
    SalesModule,
    CrmModule,
    TreasuryModule,
    AnalyticsModule,
    SyncModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
