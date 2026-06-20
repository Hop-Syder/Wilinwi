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
import { z } from 'zod';
import { PlanSchema, type AuthContext } from '@wilinwi/types';
import { CurrentUser, Public, RequireCapabilities } from '../common/decorators';
import { PrismaService } from '../common/prisma.service';

const UpdatePlanDto = z.object({
  plan: PlanSchema,
});

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
        select: { id: true, nom: true, plan: true, subscriptionStatus: true, createdAt: true },
      }),
    );
  }

  /**
   * PATCH /api/admin/tenant/plan — Upgrade/downgrade du plan.
   * Réservé aux OWNER uniquement (capacité users:manage).
   * Usage test : passer en BUSINESS pour débloquer tous les modules.
   */
  @RequireCapabilities('users:manage')
  @Patch('tenant/plan')
  async updatePlan(
    @CurrentUser() ctx: AuthContext,
    @Body() body: unknown,
  ) {
    if (ctx.role !== 'OWNER') {
      throw new ForbiddenException('Seul le propriétaire peut modifier le plan.');
    }

    const parsed = UpdatePlanDto.safeParse(body);
    if (!parsed.success) {
      throw new ForbiddenException('Plan invalide. Valeurs acceptées : FREE, PRO, BUSINESS');
    }

    const updated = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.tenant.update({
        where: { id: ctx.tenantId },
        data: {
          plan: parsed.data.plan,
          subscriptionStatus: 'ACTIVE',
        },
        select: { id: true, nom: true, plan: true, subscriptionStatus: true },
      }),
    );

    return {
      message: `Plan mis à jour → ${updated.plan}`,
      tenant: updated,
    };
  }

  /** GET /api/admin/ping — Health check public. */
  @Public()
  @Get('ping')
  ping() {
    return { status: 'ok' };
  }
}
