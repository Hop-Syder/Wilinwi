/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Service métier pour platform (console super-admin)
 * @created 2026-06-29
 * @updated 2026-06-29
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Injectable, NotFoundException } from '@nestjs/common';
import geoip from 'geoip-lite';
import { AdminPrismaService } from '../common/admin-prisma.service';
import { PlanConfigService } from '../common/plan-config.service';
import type {
  PlatformTenantDto,
  PlatformEtablissementDto,
  PlatformPaymentResultDto,
  PlatformOverdueResultDto,
  PlatformMetricsDto,
  PlatformActivityDto,
  PlatformTimeseriesPointDto,
  PlatformActivationFunnelDto,
  PlatformInactiveTenantDto,
  PlatformGeoCountryDto,
  PlanConfigDto,
  UpdatePlanConfigInput,
  Plan,
  ModuleKey,
  SubscriptionStatus,
} from '@wilinwi/types';

@Injectable()
export class PlatformService {
  constructor(
    private readonly adminPrisma: AdminPrismaService,
    private readonly planConfig: PlanConfigService,
  ) {}

  /** Retourne la synthèse globale de tous les tenants (entreprises) en contournant la RLS. */
  async getTenantsOverview(): Promise<PlatformTenantDto[]> {
    return this.adminPrisma.client.$queryRaw<PlatformTenantDto[]>`
      SELECT
        id,
        nom,
        plan,
        subscription_status AS "subscriptionStatus",
        created_at AS "createdAt",
        active_users_count::integer AS "activeUsersCount",
        etablissements_count::integer AS "etablissementsCount",
        subscription_due_date AS "subscriptionDueDate",
        billing_cycle AS "billingCycle",
        module_addons AS "moduleAddons",
        owner_name AS "ownerName",
        owner_email AS "ownerEmail"
      FROM app.platform_tenants_overview()
    `;
  }

  /** Retourne la liste des établissements d'un tenant spécifique en contournant la RLS. */
  async getTenantEtablissements(tenantId: string): Promise<PlatformEtablissementDto[]> {
    return this.adminPrisma.client.$queryRaw<PlatformEtablissementDto[]>`
      SELECT
        id,
        nom,
        type,
        actif,
        created_at AS "createdAt"
      FROM app.platform_tenant_etablissements(${tenantId}::uuid)
    `;
  }

  /**
   * Enregistre un règlement (paiement hors-ligne / manuel) : régularise l'abonnement
   * (ACTIVE, impayé purgé) et reporte l'échéance d'un cycle. Source de vérité = le serveur.
   */
  async recordPayment(tenantId: string): Promise<PlatformPaymentResultDto> {
    const rows = await this.adminPrisma.client.$queryRaw<PlatformPaymentResultDto[]>`
      SELECT
        subscription_status AS "subscriptionStatus",
        subscription_due_date AS "subscriptionDueDate"
      FROM app.billing_record_payment(${tenantId}::uuid)
    `;
    const result = rows[0];
    if (!result) throw new NotFoundException('Entreprise introuvable.');
    return result;
  }

  /**
   * Relève les impayés : passe en PAST_DUE toutes les entreprises ACTIVE/TRIALING
   * dont l'échéance est dépassée. Renvoie le nombre marqué.
   */
  async runOverdue(): Promise<PlatformOverdueResultDto> {
    const rows = await this.adminPrisma.client.$queryRaw<{ markedPastDue: number }[]>`
      SELECT app.billing_run_overdue()::integer AS "markedPastDue"
    `;
    return { markedPastDue: rows[0]?.markedPastDue ?? 0 };
  }

  /** Change le plan d'une entreprise (super-admin). Fonction `void` → $executeRaw. */
  async changePlan(tenantId: string, plan: Plan): Promise<void> {
    await this.adminPrisma.client.$executeRaw`
      SELECT app.billing_set_plan(${tenantId}::uuid, ${plan}::text)
    `;
  }

  /** Change le statut d'abonnement (suspension / réactivation / annulation). Fonction `void` → $executeRaw. */
  async setStatus(tenantId: string, status: SubscriptionStatus): Promise<void> {
    await this.adminPrisma.client.$executeRaw`
      SELECT app.billing_set_status(${tenantId}::uuid, ${status}::text)
    `;
  }

  /**
   * Met à jour la configuration tarifaire/limites d'un plan (super-admin).
   * Écrit via la fonction privilégiée (RLS bloque l'écriture directe), puis
   * invalide le cache pour une prise d'effet immédiate.
   */
  async setPlanConfig(plan: Plan, input: UpdatePlanConfigInput): Promise<PlanConfigDto> {
    await this.adminPrisma.client.$executeRaw`
      SELECT app.platform_set_plan_config(
        ${plan}::text, ${input.label}::text,
        ${input.priceMonthly}::int, ${input.priceYearly}::int,
        ${input.maxUsers}::int, ${input.maxEtablissements}::int,
        ${input.maxDevices}::int, ${input.maxPhotos}::int
      )
    `;
    this.planConfig.invalidate();
    const updated = await this.planConfig.get(plan);
    if (!updated) throw new NotFoundException('Plan introuvable.');
    return updated;
  }

  /**
   * Définit les modules « à la carte » d'une entreprise (Lot 2.4) — remplace l'ensemble.
   * La prise d'effet est immédiate : l'AuthGuard relit `module_addons` à chaque requête.
   */
  async setTenantModules(tenantId: string, modules: ModuleKey[]): Promise<{ moduleAddons: ModuleKey[] }> {
    await this.adminPrisma.client.$executeRaw`
      SELECT app.platform_set_tenant_modules(${tenantId}::uuid, ${modules}::text[])
    `;
    return { moduleAddons: modules };
  }

  /** KPIs agrégés de la plateforme (Lot 2.5) — MRR, ventes 30 j, croissance, etc. */
  async getMetrics(): Promise<PlatformMetricsDto> {
    const rows = await this.adminPrisma.client.$queryRaw<PlatformMetricsDto[]>`
      SELECT
        tenants_total::int        AS "tenantsTotal",
        tenants_active::int       AS "tenantsActive",
        tenants_past_due::int     AS "tenantsPastDue",
        new_tenants_30d::int      AS "newTenants30d",
        users_active::int         AS "usersActive",
        etablissements_total::int AS "etablissementsTotal",
        sales_30d_count::int      AS "sales30dCount",
        sales_30d_revenue::int    AS "sales30dRevenue",
        mrr::int                  AS "mrr"
      FROM app.platform_metrics()
    `;
    const result = rows[0];
    if (!result) throw new NotFoundException('Métriques indisponibles.');
    return result;
  }

  /** Séries temporelles d'évolution (courbes) : par jour sur `days` derniers jours. */
  async getTimeseries(days = 30): Promise<PlatformTimeseriesPointDto[]> {
    return this.adminPrisma.client.$queryRaw<PlatformTimeseriesPointDto[]>`
      SELECT
        to_char(day, 'YYYY-MM-DD') AS "day",
        new_tenants               AS "newTenants",
        cumulative_tenants        AS "cumulativeTenants",
        sales_count               AS "salesCount",
        sales_revenue::int        AS "salesRevenue"
      FROM app.platform_timeseries(${days}::int)
    `;
  }

  /**
   * Provenance géographique : géolocalise (hors-ligne, geoip-lite) les IP tracées
   * dans le journal d'activité et agrège par pays. Aucune donnée ne sort du serveur.
   */
  async getGeoBreakdown(days = 90): Promise<PlatformGeoCountryDto[]> {
    const rows = await this.adminPrisma.client.$queryRaw<{ ip: string; hits: number }[]>`
      SELECT ip, hits FROM app.platform_ip_hits(${days}::int)
    `;
    const names = new Intl.DisplayNames(['fr'], { type: 'region' });
    const byCountry = new Map<string, { ipCount: number; hits: number }>();
    for (const { ip, hits } of rows) {
      const geo = geoip.lookup(ip);
      const cc = geo?.country || 'XX'; // XX = privé/local/non résolu
      const agg = byCountry.get(cc) ?? { ipCount: 0, hits: 0 };
      agg.ipCount += 1;
      agg.hits += Number(hits);
      byCountry.set(cc, agg);
    }
    return [...byCountry.entries()]
      .map(([countryCode, { ipCount, hits }]) => ({
        countryCode,
        country:
          countryCode === 'XX'
            ? 'Inconnu / local'
            : (() => {
                try {
                  return names.of(countryCode) ?? countryCode;
                } catch {
                  return countryCode;
                }
              })(),
        ipCount,
        hits,
      }))
      .sort((a, b) => b.ipCount - a.ipCount);
  }

  /** Funnel d'activation (≥ 10 articles ET ≥ 1 vente = activé). */
  async getActivationFunnel(): Promise<PlatformActivationFunnelDto> {
    const rows = await this.adminPrisma.client.$queryRaw<PlatformActivationFunnelDto[]>`
      SELECT
        total,
        with_any_product AS "withAnyProduct",
        with_10_products AS "with10Products",
        with_any_sale    AS "withAnySale",
        activated
      FROM app.platform_activation_funnel()
    `;
    return rows[0] ?? { total: 0, withAnyProduct: 0, with10Products: 0, withAnySale: 0, activated: 0 };
  }

  /** Entreprises non activées (créées mais < 10 articles ou aucune vente) — pour relance. */
  async getInactiveTenants(limit = 50): Promise<PlatformInactiveTenantDto[]> {
    return this.adminPrisma.client.$queryRaw<PlatformInactiveTenantDto[]>`
      SELECT
        id,
        nom,
        products_count AS "productsCount",
        sales_count    AS "salesCount",
        created_at     AS "createdAt"
      FROM app.platform_inactive_tenants(${limit}::int)
    `;
  }

  /** Flux d'audit cross-tenant : dernières actions, tout locataire confondu. */
  async getRecentActivity(limit = 20): Promise<PlatformActivityDto[]> {
    return this.adminPrisma.client.$queryRaw<PlatformActivityDto[]>`
      SELECT
        id,
        tenant_id  AS "tenantId",
        tenant_nom AS "tenantNom",
        user_nom   AS "userNom",
        action,
        entity,
        created_at AS "createdAt"
      FROM app.platform_recent_activity(${limit}::int)
    `;
  }
}
