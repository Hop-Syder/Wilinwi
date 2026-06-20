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
import { AuthGuard } from './auth.guard';
import { CapabilitiesGuard } from './capabilities.guard';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { ActivityInterceptor } from './activity.interceptor';

/**
 * Module global : expose PrismaService + ActivityService partout, installe les
 * gardes (AuthGuard puis CapabilitiesGuard) et l'intercepteur d'audit.
 */
@Global()
@Module({
  controllers: [ActivityController],
  providers: [
    PrismaService,
    ActivityService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: CapabilitiesGuard },
    { provide: APP_INTERCEPTOR, useClass: ActivityInterceptor },
  ],
  exports: [PrismaService, ActivityService],
})
export class CommonModule {}
