/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Module d'injection de dépendances NestJS pour common
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Global, Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaService } from './prisma.service';
import { PlanConfigService } from './plan-config.service';
import { AuthGuard } from './auth.guard';
import { CapabilitiesGuard } from './capabilities.guard';
import { InfraCapabilitiesGuard } from './infra-capabilities.guard';
import { NonVitalGuard } from './non-vital.guard';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { ActivityInterceptor } from './activity.interceptor';
import { AuditAlertService } from './audit-alert.service';
import { AuditAlertController } from './audit-alert.controller';

/**
 * Module global : expose PrismaService + ActivityService partout, installe les
 * gardes (AuthGuard puis CapabilitiesGuard) et l'intercepteur d'audit.
 */
@Global()
@Module({
  controllers: [ActivityController, AuditAlertController],
  providers: [
    PrismaService,
    PlanConfigService,
    ActivityService,
    AuditAlertService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: CapabilitiesGuard },
    { provide: APP_GUARD, useClass: InfraCapabilitiesGuard },
    { provide: APP_GUARD, useClass: NonVitalGuard },
    { provide: APP_INTERCEPTOR, useClass: ActivityInterceptor },
  ],
  exports: [PrismaService, PlanConfigService, ActivityService, AuditAlertService],
})
export class CommonModule {}
