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

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import type { PlatformTenantDto, PlatformEtablissementDto } from '@wilinwi/types';

@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

  /** Retourne la synthèse globale de tous les tenants (entreprises) en contournant la RLS. */
  async getTenantsOverview(): Promise<PlatformTenantDto[]> {
    return this.prisma.client.$queryRaw<PlatformTenantDto[]>`
      SELECT 
        id,
        nom,
        plan,
        subscription_status AS "subscriptionStatus",
        created_at AS "createdAt",
        active_users_count::integer AS "activeUsersCount",
        etablissements_count::integer AS "etablissementsCount"
      FROM app.platform_tenants_overview()
    `;
  }

  /** Retourne la liste des établissements d'un tenant spécifique en contournant la RLS. */
  async getTenantEtablissements(tenantId: string): Promise<PlatformEtablissementDto[]> {
    return this.prisma.client.$queryRaw<PlatformEtablissementDto[]>`
      SELECT 
        id,
        nom,
        type,
        actif,
        created_at AS "createdAt"
      FROM app.platform_tenant_etablissements(${tenantId}::uuid)
    `;
  }
}
