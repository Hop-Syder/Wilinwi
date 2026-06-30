/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Contrôleur API — lecture des plans/tarifs (config pilotable, Lot 2.3).
 * @created 2026-06-30
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Controller, Get } from '@nestjs/common';
import type { PlanConfigDto } from '@wilinwi/types';
import { PlanConfigService } from '../common/plan-config.service';

@Controller('plans')
export class PlansController {
  constructor(private readonly planConfig: PlanConfigService) {}

  /** GET /api/plans — tarifs & limites des plans (lecture pour tout utilisateur authentifié). */
  @Get()
  getPlans(): Promise<PlanConfigDto[]> {
    return this.planConfig.getAll();
  }
}
