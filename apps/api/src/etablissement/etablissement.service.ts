/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Service métier — Établissements (lieux physiques d'une entreprise).
 *   CRUD réservé OWNER/MANAGER. La liste accessible alimente le sélecteur du header.
 * @created 2026-06-27
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type AuthContext,
  type CreateEtablissementInput,
  type EtablissementDto,
  type UpdateEtablissementInput,
} from '@wilinwi/types';
import type { Etablissement } from '@wilinwi/db';
import { PrismaService } from '../common/prisma.service';
import { PlanConfigService } from '../common/plan-config.service';
import { ActivityService } from '../common/activity.service';

function toDto(e: Etablissement): EtablissementDto {
  return {
    id: e.id,
    nom: e.nom,
    type: e.type,
    ville: e.ville,
    adresse: e.adresse,
    telephone: e.telephone,
    actif: e.actif,
  };
}

@Injectable()
export class EtablissementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly planConfig: PlanConfigService,
  ) {}

  /** Tous les établissements de l'entreprise (gestion — OWNER/MANAGER). */
  async list(ctx: AuthContext): Promise<EtablissementDto[]> {
    const rows = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.etablissement.findMany({
        where: { tenantId: ctx.tenantId },
        orderBy: { createdAt: 'asc' },
      }),
    );
    return rows.map(toDto);
  }

  /** Établissements accessibles à l'utilisateur courant (sélecteur du header). */
  async listAccessible(ctx: AuthContext): Promise<EtablissementDto[]> {
    const rows = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.etablissement.findMany({
        where: {
          tenantId: ctx.tenantId,
          actif: true,
          userAccess: { some: { userId: ctx.userId } },
        },
        orderBy: { createdAt: 'asc' },
      }),
    );
    return rows.map(toDto);
  }

  async create(ctx: AuthContext, input: CreateEtablissementInput): Promise<EtablissementDto> {
    // Quota d'établissements selon le plan (config pilotable en base — Starter 1 · Pro 2 · Business+ illimité).
    // Les tenants grand-père (isGrandfathered) ne sont pas soumis aux limites numériques.
    if (!ctx.isGrandfathered) {
      const max = (await this.planConfig.getLimits(ctx.plan)).maxEtablissements;
      const count = await this.prisma.forTenant(ctx.tenantId, (tx) =>
        tx.etablissement.count({ where: { tenantId: ctx.tenantId } }),
      );
      if (count >= max) {
        throw new ConflictException(
          `Limite du plan ${ctx.plan} atteinte (${max} établissement${max > 1 ? 's' : ''}). Passez à un plan supérieur pour en ajouter.`,
        );
      }
    }
    const etab = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const created = await tx.etablissement.create({
        data: {
          tenantId: ctx.tenantId,
          nom: input.nom,
          type: input.type,
          ville: input.ville ?? null,
          adresse: input.adresse ?? null,
          telephone: input.telephone ?? null,
        },
      });
      // Le créateur (OWNER/MANAGER) reçoit l'accès au nouvel établissement.
      await tx.userEtablissement.create({
        data: { tenantId: ctx.tenantId, userId: ctx.userId, etablissementId: created.id },
      });
      return created;
    });
    await this.activity.log({
      tenantId: ctx.tenantId,
      etablissementId: etab.id,
      userId: ctx.userId,
      action: 'ETABLISSEMENT_CREATE',
      entity: 'etablissement',
      entityId: etab.id,
      metadata: { nom: etab.nom, type: etab.type },
    });
    return toDto(etab);
  }

  async update(
    ctx: AuthContext,
    id: string,
    input: UpdateEtablissementInput,
  ): Promise<EtablissementDto> {
    const etab = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const existing = await tx.etablissement.findFirst({
        where: { id, tenantId: ctx.tenantId },
      });
      if (!existing) throw new NotFoundException('Établissement introuvable');
      return tx.etablissement.update({
        where: { id },
        data: {
          nom: input.nom,
          type: input.type,
          ville: input.ville === undefined ? undefined : input.ville,
          adresse: input.adresse === undefined ? undefined : input.adresse,
          telephone: input.telephone === undefined ? undefined : input.telephone,
          actif: input.actif,
        },
      });
    });
    await this.activity.log({
      tenantId: ctx.tenantId,
      etablissementId: id,
      userId: ctx.userId,
      action: 'ETABLISSEMENT_UPDATE',
      entity: 'etablissement',
      entityId: id,
    });
    return toDto(etab);
  }

  /**
   * Suppression : refusée si des données critiques (ventes, mouvements de stock,
   * trésorerie, inventaires) y sont rattachées — on conseille la désactivation.
   * Refusée aussi s'il s'agit du dernier établissement de l'entreprise.
   */
  async remove(ctx: AuthContext, id: string): Promise<{ ok: true }> {
    await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const existing = await tx.etablissement.findFirst({
        where: { id, tenantId: ctx.tenantId },
      });
      if (!existing) throw new NotFoundException('Établissement introuvable');

      const total = await tx.etablissement.count({ where: { tenantId: ctx.tenantId } });
      if (total <= 1) {
        throw new BadRequestException(
          "Impossible de supprimer le dernier établissement de l'entreprise.",
        );
      }

      const [ventes, mouvements, tresorerie, inventaires] = await Promise.all([
        tx.sale.count({ where: { etablissementId: id } }),
        tx.stockMovement.count({ where: { etablissementId: id } }),
        tx.cashMovement.count({ where: { etablissementId: id } }),
        tx.inventory.count({ where: { etablissementId: id } }),
      ]);
      if (ventes + mouvements + tresorerie + inventaires > 0) {
        throw new ConflictException(
          'Cet établissement contient des données (ventes, stock, trésorerie). Désactivez-le plutôt que de le supprimer.',
        );
      }

      await tx.userEtablissement.deleteMany({ where: { etablissementId: id } });
      await tx.etablissement.delete({ where: { id } });
    });
    await this.activity.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'ETABLISSEMENT_DELETE',
      entity: 'etablissement',
      entityId: id,
    });
    return { ok: true };
  }
}
