/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Contrôleur API pour platform (console super-admin)
 * @created 2026-06-29
 * @updated 2026-06-29
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { PlatformAdmin } from '../common/decorators';
import { PlatformService } from './platform.service';
import type { PlatformTenantDto, PlatformEtablissementDto } from '@wilinwi/types';

@Controller('platform')
@PlatformAdmin()
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  /** GET /api/platform/tenants — Récupère tous les tenants de la plateforme. */
  @Get('tenants')
  getTenants(): Promise<PlatformTenantDto[]> {
    return this.platformService.getTenantsOverview();
  }

  /** GET /api/platform/tenants/:id/etablissements — Récupère les établissements du tenant. */
  @Get('tenants/:id/etablissements')
  getEtablissements(@Param('id', new ParseUUIDPipe()) id: string): Promise<PlatformEtablissementDto[]> {
    return this.platformService.getTenantEtablissements(id);
  }
}
