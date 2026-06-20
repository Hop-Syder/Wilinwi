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
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from './prisma.service';
import { AuthGuard } from './auth.guard';
import { CapabilitiesGuard } from './capabilities.guard';

/**
 * Module global : expose PrismaService partout et installe les gardes
 * d'authentification + d'autorisation sur toutes les routes (ordre important :
 * AuthGuard d'abord, puis CapabilitiesGuard).
 */
@Global()
@Module({
  providers: [
    PrismaService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: CapabilitiesGuard },
  ],
  exports: [PrismaService],
})
export class CommonModule {}
