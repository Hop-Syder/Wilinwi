/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Service métier — Notifications in-app (centre de pilotage).
 *   Pousse les alertes déjà calculées (stock bas, impayé). `scan` génère/résout
 *   les notifications (dédup + auto-résolution) à partir de l'état courant.
 *   Lecture au niveau entreprise. Réservé OWNER/MANAGER (activity:read).
 * @created 2026-06-29
 * 🌐 nexus-partners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Injectable, NotFoundException } from '@nestjs/common';
import { dunningMessage, type AuthContext, type NotificationDto } from '@wilinwi/types';
import type { Notification, TenantTx } from '@wilinwi/db';
import { PrismaService } from '../common/prisma.service';

function toDto(n: Notification): NotificationDto {
  return {
    id: n.id,
    type: n.type,
    titre: n.titre,
    message: n.message,
    etablissementId: n.etablissementId,
    entityId: n.entityId,
    read: n.readAt !== null,
    createdAt: n.createdAt.toISOString(),
  };
}

/** Intervalle minimal entre deux scans de notifications d'un même tenant. */
const SCAN_INTERVAL_MS = 2 * 60 * 1000;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) { }

  /** Liste (50 récentes, non-lues d'abord) après synchronisation des alertes. */
  async list(ctx: AuthContext): Promise<NotificationDto[]> {
    await this.scan(ctx, true); // ouverture de la cloche : liste toujours fraîche
    const rows = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.notification.findMany({
        where: { tenantId: ctx.tenantId },
        orderBy: [{ readAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'desc' }],
        take: 50,
      }),
    );
    return rows.map(toDto);
  }

  async unreadCount(ctx: AuthContext): Promise<{ count: number }> {
    await this.scan(ctx);
    const count = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.notification.count({ where: { tenantId: ctx.tenantId, readAt: null } }),
    );
    return { count };
  }

  async markRead(ctx: AuthContext, id: string): Promise<{ ok: true }> {
    await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const n = await tx.notification.findFirst({ where: { id, tenantId: ctx.tenantId } });
      if (!n) throw new NotFoundException('Notification introuvable');
      if (!n.readAt) {
        await tx.notification.update({ where: { id }, data: { readAt: new Date() } });
      }
    });
    return { ok: true };
  }

  async markAllRead(ctx: AuthContext): Promise<{ ok: true }> {
    await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.notification.updateMany({
        where: { tenantId: ctx.tenantId, readAt: null },
        data: { readAt: new Date() },
      }),
    );
    return { ok: true };
  }

  /** Dernier scan par tenant (mémoire du processus) — cf. SCAN_INTERVAL_MS. */
  private readonly lastScanAt = new Map<string, number>();

  /**
   * Synchronise les notifications dérivées avec l'état courant (idempotent).
   * Limité à un scan par tenant toutes les SCAN_INTERVAL_MS : le compteur est
   * interrogé toutes les 30 s par chaque onglet ouvert, rescanner tout le stock
   * à chaque appel chargeait inutilement l'API (Render) et la base.
   */
  private async scan(ctx: AuthContext, force = false): Promise<void> {
    const now = Date.now();
    const last = this.lastScanAt.get(ctx.tenantId) ?? 0;
    if (!force && now - last < SCAN_INTERVAL_MS) return;
    this.lastScanAt.set(ctx.tenantId, now);
    await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      await this.scanStockLow(tx, ctx);
      await this.scanPastDue(tx, ctx);
    });
  }

  /** Stock bas : crée pour chaque (produit × établissement) sous le seuil, résout sinon. */
  private async scanStockLow(tx: TenantTx, ctx: AuthContext): Promise<void> {
    const stocks = await tx.productStock.findMany({
      where: { tenantId: ctx.tenantId, quantiteMin: { gt: 0 } },
      include: {
        product: { select: { nom: true } },
        etablissement: { select: { nom: true } },
      },
    });
    const low = stocks.filter((s) => s.quantite <= s.quantiteMin);
    const lowKeys = new Set(low.map((s) => `${s.etablissementId}|${s.productId}`));

    const existing = await tx.notification.findMany({
      where: { tenantId: ctx.tenantId, type: 'STOCK_LOW', readAt: null },
      select: { id: true, etablissementId: true, entityId: true },
    });
    const existingKeys = new Set(existing.map((e) => `${e.etablissementId}|${e.entityId}`));

    // Création groupée (une seule requête) des nouvelles alertes.
    const toCreate = low.filter((s) => !existingKeys.has(`${s.etablissementId}|${s.productId}`));
    if (toCreate.length > 0) {
      await tx.notification.createMany({
        data: toCreate.map((s) => ({
          tenantId: ctx.tenantId,
          etablissementId: s.etablissementId,
          type: 'STOCK_LOW' as const,
          titre: `Stock bas — ${s.product.nom}`,
          message: `${s.etablissement?.nom ?? 'Boutique'} : il reste ${s.quantite} (seuil ${s.quantiteMin}).`,
          entityId: s.productId,
        })),
      });
    }

    // Auto-résolution : produit repassé au-dessus du seuil → notification marquée lue.
    const toResolve = existing
      .filter((e) => !lowKeys.has(`${e.etablissementId}|${e.entityId}`))
      .map((e) => e.id);
    if (toResolve.length > 0) {
      await tx.notification.updateMany({
        where: { id: { in: toResolve } },
        data: { readAt: new Date() },
      });
    }
  }

  /** Impayé : une notification PAST_DUE tant que l'abonnement n'est pas à jour. */
  private async scanPastDue(tx: TenantTx, ctx: AuthContext): Promise<void> {
    const impaye = ctx.dunning.stage !== 'ACTIVE';
    const existing = await tx.notification.findFirst({
      where: { tenantId: ctx.tenantId, type: 'PAST_DUE', readAt: null },
      select: { id: true },
    });
    if (impaye && !existing) {
      await tx.notification.create({
        data: {
          tenantId: ctx.tenantId,
          type: 'PAST_DUE',
          titre: 'Abonnement impayé',
          message: dunningMessage(ctx.dunning),
          entityId: null,
        },
      });
    } else if (!impaye && existing) {
      await tx.notification.updateMany({
        where: { tenantId: ctx.tenantId, type: 'PAST_DUE', readAt: null },
        data: { readAt: new Date() },
      });
    }
  }
}
