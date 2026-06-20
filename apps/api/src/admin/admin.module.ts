/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Module Admin — plan management.
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';

@Module({
  controllers: [AdminController],
})
export class AdminModule {}
