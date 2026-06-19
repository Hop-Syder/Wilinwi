import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env';
import { CommonModule } from './common/common.module';
import { Public } from './common/decorators';
import { AuthModule } from './auth/auth.module';
import { StockModule } from './stock/stock.module';
import { InventoryModule } from './inventory/inventory.module';
import { SalesModule } from './pos/sales.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SyncModule } from './sync/sync.module';

@Controller()
class HealthController {
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
    AnalyticsModule,
    SyncModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
