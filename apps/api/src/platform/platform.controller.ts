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

import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { PlatformAdmin } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PlatformService } from './platform.service';
import {
  PlatformChangePlanSchema,
  PlatformSetStatusSchema,
  PlatformSetModulesSchema,
  UpdatePlanConfigSchema,
  PlanSchema,
  type PlatformTenantDto,
  type PlatformEtablissementDto,
  type PlatformChangePlanInput,
  type PlatformSetStatusInput,
  type PlatformSetModulesInput,
  type PlatformPaymentResultDto,
  type PlatformOverdueResultDto,
  type PlanConfigDto,
  type UpdatePlanConfigInput,
  type Plan,
  type PlatformMetricsDto,
  type PlatformActivityDto,
} from '@wilinwi/types';

@Controller('platform')
@PlatformAdmin()
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  /** GET /api/platform/tenants — Récupère tous les tenants de la plateforme. */
  @Get('tenants')
  getTenants(): Promise<PlatformTenantDto[]> {
    return this.platformService.getTenantsOverview();
  }

  /** GET /api/platform/metrics — KPIs agrégés de la plateforme (MRR, ventes, croissance). */
  @Get('metrics')
  getMetrics(): Promise<PlatformMetricsDto> {
    return this.platformService.getMetrics();
  }

  /** GET /api/platform/activity?limit= — Flux d'audit cross-tenant (dernières actions). */
  @Get('activity')
  getActivity(@Query('limit') limit?: string): Promise<PlatformActivityDto[]> {
    const n = Math.min(100, Math.max(1, Number.parseInt(limit ?? '', 10) || 20));
    return this.platformService.getRecentActivity(n);
  }

  /** GET /api/platform/tenants/:id/etablissements — Récupère les établissements du tenant. */
  @Get('tenants/:id/etablissements')
  getEtablissements(@Param('id', new ParseUUIDPipe()) id: string): Promise<PlatformEtablissementDto[]> {
    return this.platformService.getTenantEtablissements(id);
  }

  /** POST /api/platform/tenants/:id/payment — Enregistre un règlement et reporte l'échéance. */
  @Post('tenants/:id/payment')
  @HttpCode(200)
  recordPayment(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<PlatformPaymentResultDto> {
    return this.platformService.recordPayment(id);
  }

  /** POST /api/platform/tenants/:id/plan — Change le plan d'une entreprise. */
  @Post('tenants/:id/plan')
  @HttpCode(200)
  async changePlan(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(PlatformChangePlanSchema)) dto: PlatformChangePlanInput,
  ): Promise<{ ok: true }> {
    await this.platformService.changePlan(id, dto.plan);
    return { ok: true };
  }

  /** POST /api/platform/tenants/:id/status — Change le statut d'abonnement (suspendre/réactiver). */
  @Post('tenants/:id/status')
  @HttpCode(200)
  async setStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(PlatformSetStatusSchema)) dto: PlatformSetStatusInput,
  ): Promise<{ ok: true }> {
    await this.platformService.setStatus(id, dto.status);
    return { ok: true };
  }

  /** POST /api/platform/billing/run-overdue — Relève les impayés (échéances dépassées → PAST_DUE). */
  @Post('billing/run-overdue')
  @HttpCode(200)
  runOverdue(): Promise<PlatformOverdueResultDto> {
    return this.platformService.runOverdue();
  }

  /** PATCH /api/platform/plans/:plan — Met à jour les tarifs/limites d'un plan. */
  @Patch('plans/:plan')
  setPlanConfig(
    @Param('plan', new ZodValidationPipe(PlanSchema)) plan: Plan,
    @Body(new ZodValidationPipe(UpdatePlanConfigSchema)) dto: UpdatePlanConfigInput,
  ): Promise<PlanConfigDto> {
    return this.platformService.setPlanConfig(plan, dto);
  }

  /** PATCH /api/platform/tenants/:id/modules — Définit les modules « à la carte » d'une entreprise. */
  @Patch('tenants/:id/modules')
  setTenantModules(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(PlatformSetModulesSchema)) dto: PlatformSetModulesInput,
  ) {
    return this.platformService.setTenantModules(id, dto.modules);
  }
}
