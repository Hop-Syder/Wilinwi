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
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { validateEnv } from './config/env';
import { CommonModule } from './common/common.module';
import { Public } from './common/decorators';
import { AuthModule } from './auth/auth.module';
import { EtablissementModule } from './etablissement/etablissement.module';
import { StockModule } from './stock/stock.module';
import { InventoryModule } from './inventory/inventory.module';
import { SalesModule } from './pos/sales.module';
import { CrmModule } from './crm/crm.module';
import { TreasuryModule } from './treasury/treasury.module';
import { PublicModule } from './public/public.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SyncModule } from './sync/sync.module';
import { AdminModule } from './admin/admin.module';
import { WarehouseModule } from './warehouse/warehouse.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PlatformModule } from './platform/platform.module';
import { PlansModule } from './plans/plans.module';
import { FoodModule } from './food/food.module';

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
    // Rate-limiting global (anti-abus / DoS) : 300 requêtes / minute / IP.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    CommonModule,
    AuthModule,
    EtablissementModule,
    StockModule,
    InventoryModule,
    SalesModule,
    CrmModule,
    TreasuryModule,
    PublicModule,
    AnalyticsModule,
    SyncModule,
    AdminModule,
    WarehouseModule,
    NotificationsModule,
    PlatformModule,
    PlansModule,
    FoodModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
