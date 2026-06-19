import { Controller, Get, Module } from '@nestjs/common';
import type { AuthContext } from '@wilinwi/types';
import { CurrentUser, RequireCapabilities } from '../common/decorators';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @RequireCapabilities('reports:read')
  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthContext) {
    return this.analytics.dashboard(user);
  }
}

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
