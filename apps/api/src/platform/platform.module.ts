/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Module d'injection de dépendances NestJS pour platform (console super-admin)
 * @created 2026-06-29
 * @updated 2026-06-29
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Module } from '@nestjs/common';
import { AdminPrismaService } from '../common/admin-prisma.service';
import { AuthModule } from '../auth/auth.module';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';

@Module({
  imports: [AuthModule], // pour SupabaseAdminService (reset mot de passe)
  controllers: [PlatformController],
  providers: [PlatformService, AdminPrismaService],
  exports: [PlatformService],
})
export class PlatformModule {}
