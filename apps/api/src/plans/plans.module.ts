/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Module — lecture des plans/tarifs (PlanConfigService est global).
 * @created 2026-06-30
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Module } from '@nestjs/common';
import { PlansController } from './plans.controller';

@Module({ controllers: [PlansController] })
export class PlansModule {}
