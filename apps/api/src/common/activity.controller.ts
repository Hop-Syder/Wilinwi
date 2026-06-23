import { Controller, Get, Query } from '@nestjs/common';
import type { AuthContext } from '@wilinwi/types';
import { CurrentUser, RequireCapabilities } from './decorators';
import { ActivityService, type ActivityLogRow } from './activity.service';

@Controller('activity')
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  /** Journal d'activité du tenant (propriétaire / gérant). */
  @RequireCapabilities('activity:read')
  @Get()
  list(@CurrentUser() user: AuthContext, @Query('limit') limit?: string): Promise<ActivityLogRow[]> {
    return this.activity.list(user.tenantId, limit ? Number(limit) : 100);
  }
}
