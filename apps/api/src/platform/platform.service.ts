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

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import geoip from 'geoip-lite';
import { AdminPrismaService } from '../common/admin-prisma.service';
import { PrismaService } from '../common/prisma.service';
import { PlanConfigService } from '../common/plan-config.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
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
  PlatformUserDto,
  PlatformUserLoginDto,
  PlatformRevenueDto,
  PlatformExpiringSubscriptionDto,
  PlatformEtabGeoDto,
  PlatformResetPasswordDto,
  PlatformDeleteTenantResultDto,
  PlanConfigDto,
  UpdatePlanConfigInput,
  Plan,
  EtablissementInfrastructure,
  InfraPricingDto,
  ModuleKey,
  SubscriptionStatus,
  UpdateInfraPricingInput,
} from '@wilinwi/types';

@Injectable()
export class PlatformService {
  constructor(
    private readonly adminPrisma: AdminPrismaService,
    private readonly prisma: PrismaService,
    private readonly planConfig: PlanConfigService,
    private readonly supabaseAdmin: SupabaseAdminService,
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
        owner_email AS "ownerEmail",
        infra_counts AS "infraCounts",
        infra_surcharge::integer AS "infraSurcharge"
      FROM app.platform_tenants_overview()
    `;
  }

  // ─────────────── Tarification des infrastructures (Option C — TDR §18.1) ───────────────

  /** Tarifs mensuels par infrastructure (table globale, hors RLS — comme plan_configs). */
  async getInfraPricing(): Promise<InfraPricingDto[]> {
    const rows = await this.prisma.client.infraPricing.findMany({
      orderBy: { infrastructure: 'asc' },
    });
    return rows.map((r) => ({
      infrastructure: r.infrastructure,
      priceMonthly: r.priceMonthly,
      updatedAt: r.updatedAt,
    }));
  }

  /** Met à jour le surcoût mensuel d'une infrastructure (par établissement actif). */
  async setInfraPricing(
    infrastructure: EtablissementInfrastructure,
    input: UpdateInfraPricingInput,
  ): Promise<InfraPricingDto> {
    const row = await this.prisma.client.infraPricing.upsert({
      where: { infrastructure },
      update: { priceMonthly: input.priceMonthly },
      create: { infrastructure, priceMonthly: input.priceMonthly },
    });
    return {
      infrastructure: row.infrastructure,
      priceMonthly: row.priceMonthly,
      updatedAt: row.updatedAt,
    };
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
   * Supprime DÉFINITIVEMENT une entreprise et toutes ses données (irréversible).
   * La fonction SQL supprime tout en une transaction et renvoie les ids des
   * utilisateurs ; leurs comptes Supabase Auth sont ensuite purgés (best-effort).
   */
  async deleteTenant(tenantId: string): Promise<PlatformDeleteTenantResultDto> {
    let userIds: string[];
    try {
      const rows = await this.adminPrisma.client.$queryRaw<{ userIds: string[] }[]>`
        SELECT app.platform_delete_tenant(${tenantId}::uuid) AS "userIds"
      `;
      userIds = rows[0]?.userIds ?? [];
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('TENANT_NOT_FOUND')) throw new NotFoundException('Entreprise introuvable.');
      if (msg.includes('TENANT_INTERNAL')) {
        throw new ForbiddenException('Suppression refusée : entreprise interne à la plateforme.');
      }
      throw err;
    }
    for (const id of userIds) {
      try {
        await this.supabaseAdmin.deleteUser(id);
      } catch {
        // Best-effort : les données du tenant sont déjà supprimées ; un compte auth
        // orphelin n'ouvre l'accès à rien (le contexte tenant n'existe plus).
      }
    }
    return { deletedUsers: userIds.length };
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

  /**
   * Alertes d'audit cross-tenant (TDR §18.2) : anomalies non bloquantes à
   * corriger (stock négatif ALLOW_NEGATIVE, conflits de lots Health à venir).
   */
  async getAuditAlerts(limit = 50): Promise<
    {
      id: string;
      tenantId: string;
      tenantNom: string;
      etablissementId: string | null;
      severity: string;
      type: string;
      message: string;
      payload: unknown;
      createdAt: Date;
    }[]
  > {
    return this.adminPrisma.client.$queryRaw`
      SELECT
        id,
        tenant_id        AS "tenantId",
        tenant_nom       AS "tenantNom",
        etablissement_id AS "etablissementId",
        severity,
        type,
        message,
        payload,
        created_at       AS "createdAt"
      FROM app.platform_audit_alerts(${limit}::int)
    `;
  }

  // ───────────────────────────── Cockpit ─────────────────────────────

  /** Utilisateurs (cross-tenant) avec recherche + dernière connexion. */
  async getUsers(search = '', limit = 100): Promise<PlatformUserDto[]> {
    return this.adminPrisma.client.$queryRaw<PlatformUserDto[]>`
      SELECT
        id, nom, email, role, actif,
        tenant_id  AS "tenantId",
        tenant_nom AS "tenantNom",
        last_login AS "lastLogin",
        created_at AS "createdAt"
      FROM app.platform_users(${search}::text, ${limit}::int)
    `;
  }

  /** Bloque / débloque un utilisateur. */
  async setUserActive(userId: string, active: boolean): Promise<void> {
    await this.adminPrisma.client.$executeRaw`
      SELECT app.platform_set_user_active(${userId}::uuid, ${active}::boolean)
    `;
  }

  /** Réinitialise le PIN à 0000 (hash bcrypt calculé ici). */
  async resetUserPin(userId: string): Promise<void> {
    const hash = await bcrypt.hash('0000', 10);
    await this.adminPrisma.client.$executeRaw`
      SELECT app.platform_set_user_pin(${userId}::uuid, ${hash}::text)
    `;
  }

  /** Réinitialise le mot de passe : génère un mot de passe temporaire (rendu une fois). */
  async resetUserPassword(userId: string): Promise<PlatformResetPasswordDto> {
    const tempPassword = randomBytes(9).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 12);
    await this.supabaseAdmin.setPassword(userId, tempPassword);
    return { tempPassword };
  }

  /** Historique de connexion (best-effort : événements PIN_LOGIN). */
  async getUserLogins(userId: string, limit = 20): Promise<PlatformUserLoginDto[]> {
    return this.adminPrisma.client.$queryRaw<PlatformUserLoginDto[]>`
      SELECT id, created_at AS "createdAt", ip, device_label AS "deviceLabel"
      FROM app.platform_user_logins(${userId}::uuid, ${limit}::int)
    `;
  }

  /** Indicateurs financiers (MRR/ARR/ARPU/LTV/churn). */
  async getRevenue(): Promise<PlatformRevenueDto> {
    const rows = await this.adminPrisma.client.$queryRaw<PlatformRevenueDto[]>`
      SELECT
        mrr, arr, active, trialing, cancelled, total, arpu,
        churn_rate AS "churnRate",
        ltv
      FROM app.platform_revenue_metrics()
    `;
    return (
      rows[0] ?? {
        mrr: 0, arr: 0, active: 0, trialing: 0, cancelled: 0, total: 0, arpu: 0, churnRate: 0, ltv: 0,
      }
    );
  }

  /** Abonnements arrivant à échéance (ou dépassés) sous `days` jours. */
  async getExpiringSubscriptions(days = 14): Promise<PlatformExpiringSubscriptionDto[]> {
    return this.adminPrisma.client.$queryRaw<PlatformExpiringSubscriptionDto[]>`
      SELECT
        id, nom, plan,
        subscription_status   AS "subscriptionStatus",
        subscription_due_date AS "subscriptionDueDate",
        days_left             AS "daysLeft",
        owner_email           AS "ownerEmail"
      FROM app.platform_expiring_subscriptions(${days}::int)
    `;
  }

  /** Répartition des établissements par ville. */
  async getEtablissementsGeo(): Promise<PlatformEtabGeoDto[]> {
    return this.adminPrisma.client.$queryRaw<PlatformEtabGeoDto[]>`
      SELECT ville, count FROM app.platform_etablissements_geo()
    `;
  }
}
