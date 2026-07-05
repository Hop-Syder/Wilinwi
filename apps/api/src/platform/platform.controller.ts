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

import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { PlatformAdmin } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PlatformService } from './platform.service';
import {
  EtablissementInfrastructureSchema,
  PlatformChangePlanSchema,
  PlatformSetStatusSchema,
  PlatformSetModulesSchema,
  PlatformSetUserActiveSchema,
  UpdateInfraPricingSchema,
  UpdatePlanConfigSchema,
  PlanSchema,
  type EtablissementInfrastructure,
  type InfraPricingDto,
  type UpdateInfraPricingInput,
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
  type PlatformTimeseriesPointDto,
  type PlatformActivationFunnelDto,
  type PlatformInactiveTenantDto,
  type PlatformGeoCountryDto,
  type PlatformUserDto,
  type PlatformUserLoginDto,
  type PlatformRevenueDto,
  type PlatformExpiringSubscriptionDto,
  type PlatformEtabGeoDto,
  type PlatformResetPasswordDto,
  type PlatformSetUserActiveInput,
  type PlatformDeleteTenantResultDto,
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

  /** GET /api/platform/audit-alerts?limit= — Alertes d'audit cross-tenant (TDR §18.2). */
  @Get('audit-alerts')
  getAuditAlerts(@Query('limit') limit?: string) {
    const n = Math.min(200, Math.max(1, Number.parseInt(limit ?? '', 10) || 50));
    return this.platformService.getAuditAlerts(n);
  }

  /** GET /api/platform/timeseries?days= — Séries d'évolution (inscriptions, ventes, GMV). */
  @Get('timeseries')
  getTimeseries(@Query('days') days?: string): Promise<PlatformTimeseriesPointDto[]> {
    const n = Math.min(365, Math.max(1, Number.parseInt(days ?? '', 10) || 30));
    return this.platformService.getTimeseries(n);
  }

  /** GET /api/platform/activation — Funnel d'activation des entreprises. */
  @Get('activation')
  getActivation(): Promise<PlatformActivationFunnelDto> {
    return this.platformService.getActivationFunnel();
  }

  /** GET /api/platform/inactive?limit= — Entreprises non activées (à relancer). */
  @Get('inactive')
  getInactive(@Query('limit') limit?: string): Promise<PlatformInactiveTenantDto[]> {
    const n = Math.min(200, Math.max(1, Number.parseInt(limit ?? '', 10) || 50));
    return this.platformService.getInactiveTenants(n);
  }

  /** GET /api/platform/geo?days= — Provenance géographique (pays) des IP tracées. */
  @Get('geo')
  getGeo(@Query('days') days?: string): Promise<PlatformGeoCountryDto[]> {
    const n = Math.min(365, Math.max(1, Number.parseInt(days ?? '', 10) || 90));
    return this.platformService.getGeoBreakdown(n);
  }

  // ───────────────────────────── Cockpit ─────────────────────────────

  /** GET /api/platform/users?search=&limit= — Utilisateurs cross-tenant. */
  @Get('users')
  getUsers(@Query('search') search?: string, @Query('limit') limit?: string): Promise<PlatformUserDto[]> {
    const n = Math.min(500, Math.max(1, Number.parseInt(limit ?? '', 10) || 100));
    return this.platformService.getUsers(search ?? '', n);
  }

  /** POST /api/platform/users/:id/block — (Dé)bloque un utilisateur. */
  @Post('users/:id/block')
  @HttpCode(200)
  async setUserActive(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(PlatformSetUserActiveSchema)) dto: PlatformSetUserActiveInput,
  ): Promise<{ ok: true }> {
    await this.platformService.setUserActive(id, dto.active);
    return { ok: true };
  }

  /** POST /api/platform/users/:id/reset-pin — Réinitialise le PIN à 0000. */
  @Post('users/:id/reset-pin')
  @HttpCode(200)
  async resetPin(@Param('id', new ParseUUIDPipe()) id: string): Promise<{ ok: true }> {
    await this.platformService.resetUserPin(id);
    return { ok: true };
  }

  /** POST /api/platform/users/:id/reset-password — Réinitialise le mot de passe (temporaire). */
  @Post('users/:id/reset-password')
  @HttpCode(200)
  resetPassword(@Param('id', new ParseUUIDPipe()) id: string): Promise<PlatformResetPasswordDto> {
    return this.platformService.resetUserPassword(id);
  }

  /** GET /api/platform/users/:id/logins — Historique de connexion (best-effort). */
  @Get('users/:id/logins')
  getUserLogins(@Param('id', new ParseUUIDPipe()) id: string): Promise<PlatformUserLoginDto[]> {
    return this.platformService.getUserLogins(id);
  }

  /** GET /api/platform/revenue — Indicateurs financiers (MRR/ARR/ARPU/LTV/churn). */
  @Get('revenue')
  getRevenue(): Promise<PlatformRevenueDto> {
    return this.platformService.getRevenue();
  }

  /** GET /api/platform/subscriptions/expiring?days= — Abonnements à échéance. */
  @Get('subscriptions/expiring')
  getExpiring(@Query('days') days?: string): Promise<PlatformExpiringSubscriptionDto[]> {
    const n = Math.min(365, Math.max(1, Number.parseInt(days ?? '', 10) || 14));
    return this.platformService.getExpiringSubscriptions(n);
  }

  /** GET /api/platform/etablissements-geo — Établissements par ville. */
  @Get('etablissements-geo')
  getEtabGeo(): Promise<PlatformEtabGeoDto[]> {
    return this.platformService.getEtablissementsGeo();
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

  /** DELETE /api/platform/tenants/:id — Supprime DÉFINITIVEMENT une entreprise (irréversible). */
  @Delete('tenants/:id')
  @HttpCode(200)
  deleteTenant(@Param('id', new ParseUUIDPipe()) id: string): Promise<PlatformDeleteTenantResultDto> {
    return this.platformService.deleteTenant(id);
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

  /** GET /api/platform/infra-pricing — Tarifs des infrastructures (Option C, §18.1). */
  @Get('infra-pricing')
  getInfraPricing(): Promise<InfraPricingDto[]> {
    return this.platformService.getInfraPricing();
  }

  /** PATCH /api/platform/infra-pricing/:infrastructure — Surcoût mensuel par établissement actif. */
  @Patch('infra-pricing/:infrastructure')
  setInfraPricing(
    @Param('infrastructure', new ZodValidationPipe(EtablissementInfrastructureSchema))
    infrastructure: EtablissementInfrastructure,
    @Body(new ZodValidationPipe(UpdateInfraPricingSchema)) dto: UpdateInfraPricingInput,
  ): Promise<InfraPricingDto> {
    return this.platformService.setInfraPricing(infrastructure, dto);
  }
}
