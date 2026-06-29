/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Contrôleur HTTP — Notifications in-app. Réservé OWNER/MANAGER
 *   (capacité activity:read, comme le journal d'audit).
 * @created 2026-06-29
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Controller, Get, Param, Post } from '@nestjs/common';
import type { AuthContext } from '@wilinwi/types';
import { CurrentUser, RequireCapabilities } from '../common/decorators';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @RequireCapabilities('activity:read')
  @Get()
  list(@CurrentUser() user: AuthContext) {
    return this.notifications.list(user);
  }

  @RequireCapabilities('activity:read')
  @Get('count')
  count(@CurrentUser() user: AuthContext) {
    return this.notifications.unreadCount(user);
  }

  @RequireCapabilities('activity:read')
  @Post('read-all')
  markAllRead(@CurrentUser() user: AuthContext) {
    return this.notifications.markAllRead(user);
  }

  @RequireCapabilities('activity:read')
  @Post(':id/read')
  markRead(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.notifications.markRead(user, id);
  }
}
