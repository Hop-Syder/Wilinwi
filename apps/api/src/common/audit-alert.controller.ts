/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Contrôleur des alertes d'audit (TDR §18.2) — lecture/résolution
 *   côté tenant (OWNER/MANAGER via activity:read).
 * @created 2026-07-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import type { AuthContext } from '@wilinwi/types';
import { CurrentUser, RequireCapabilities } from './decorators';
import { AuditAlertService } from './audit-alert.service';

@Controller('audit-alerts')
export class AuditAlertController {
  constructor(private readonly alerts: AuditAlertService) {}

  @RequireCapabilities('activity:read')
  @Get()
  list(@CurrentUser() user: AuthContext, @Query('all') all?: string) {
    return this.alerts.list(user, all === 'true');
  }

  @RequireCapabilities('activity:read')
  @Patch(':id/resolve')
  resolve(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.alerts.resolve(user, id);
  }
}
