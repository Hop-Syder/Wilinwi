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
import { CurrencyService } from './currency.service';
import { CurrencyController } from './currency.controller';
import { ReadOnlyGuard } from './read-only.guard';

/**
 * Module global : expose PrismaService + ActivityService + CurrencyService partout, installe les
 * gardes (AuthGuard, CapabilitiesGuard, ReadOnlyGuard) et l'intercepteur d'audit.
 */
@Global()
@Module({
  controllers: [ActivityController, AuditAlertController, CurrencyController],
  providers: [
    PrismaService,
    PlanConfigService,
    ActivityService,
    AuditAlertService,
    CurrencyService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: CapabilitiesGuard },
    { provide: APP_GUARD, useClass: InfraCapabilitiesGuard },
    { provide: APP_GUARD, useClass: NonVitalGuard },
    { provide: APP_GUARD, useClass: ReadOnlyGuard },
    { provide: APP_INTERCEPTOR, useClass: ActivityInterceptor },
  ],
  exports: [PrismaService, PlanConfigService, ActivityService, AuditAlertService, CurrencyService],
})
export class CommonModule {}
