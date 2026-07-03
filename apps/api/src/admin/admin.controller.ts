/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Contrôleur Admin — gestion du plan d'abonnement du tenant (usage test/backoffice).
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Body, Controller, Get, Patch, ForbiddenException } from '@nestjs/common';
import { TenantLocalisationSchema, type AuthContext } from '@wilinwi/types';
import { CurrentUser, Public, RequireCapabilities } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PrismaService } from '../common/prisma.service';
import type { TenantLocalisationInput } from '@wilinwi/types';

@Controller('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /api/admin/tenant — Infos du tenant courant (plan, statut). */
  @RequireCapabilities('users:manage')
  @Get('tenant')
  async getTenant(@CurrentUser() ctx: AuthContext) {
    return this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.tenant.findUnique({
        where: { id: ctx.tenantId },
        select: {
          id: true,
          nom: true,
          pays: true,
          ville: true,
          plan: true,
          subscriptionStatus: true,
          pastDueSince: true,
          createdAt: true,
        },
      }),
    );
  }

  // Les anciens PATCH tenant/plan et tenant/subscription (self-service « usage
  // test ») sont supprimés : le plan et le statut d'abonnement ne se pilotent
  // QUE depuis la console plateforme (POST /platform/tenants/:id/plan|status).

  /**
   * PATCH /api/admin/tenant/localisation — Pays & ville du siège (onboarding).
   * Réservé au propriétaire ; renseigne aussi la ville des établissements qui
   * n'en ont pas encore.
   */
  @RequireCapabilities('users:manage')
  @Patch('tenant/localisation')
  async updateLocalisation(
    @CurrentUser() ctx: AuthContext,
    @Body(new ZodValidationPipe(TenantLocalisationSchema)) body: TenantLocalisationInput,
  ) {
    if (ctx.role !== 'OWNER') {
      throw new ForbiddenException('Seul le propriétaire peut définir la localisation.');
    }
    const updated = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const tenant = await tx.tenant.update({
        where: { id: ctx.tenantId },
        data: { pays: body.pays, ville: body.ville },
        select: { id: true, nom: true, pays: true, ville: true },
      });
      await tx.etablissement.updateMany({
        where: { tenantId: ctx.tenantId, ville: null },
        data: { ville: body.ville },
      });
      return tenant;
    });
    return { message: `Localisation → ${updated.ville}, ${updated.pays}`, tenant: updated };
  }

  /** GET /api/admin/ping — Health check public. */
  @Public()
  @Get('ping')
  ping() {
    return { status: 'ok' };
  }
}
