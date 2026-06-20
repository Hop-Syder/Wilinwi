/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Module d'injection de dépendances NestJS pour auth
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SupabaseAdminService } from './supabase-admin.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SupabaseAdminService],
  exports: [SupabaseAdminService],
})
export class AuthModule {}
