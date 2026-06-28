/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Service métier — Dispatch / transfert interne (entrepôt → boutique).
 *   Création (brouillon), validation (déplace le stock des deux emplacements via
 *   la projection ProductStock + le grand livre de mouvements), annulation.
 *   Réservé OWNER/MANAGER (capacité supplier:manage).
 * @created 2026-06-28
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type {
  AuthContext,
  CreateDispatchInput,
  DispatchOrderDto,
  DispatchOrderItemDto,
} from '@wilinwi/types';
import type { TenantTx } from '@wilinwi/db';
import { PrismaService } from '../common/prisma.service';
import { ActivityService } from '../common/activity.service';
import { applyStockDelta, readStockAt } from '../common/product-stock';

type DispatchRow = {
  id: string;
  reference: string;
  sourceId: string;
  destinationId: string;
  statut: string;
  note: string | null;
  createdAt: Date;
  validatedAt: Date | null;
  source: { nom: string } | null;
  destination: { nom: string } | null;
  items: {
    id: string;
    productId: string;
    variantId: string | null;
    quantite: number;
    product: { nom: string };
  }[];
};

function toDto(d: DispatchRow): DispatchOrderDto {
  return {
    id: d.id,
    reference: d.reference,
    sourceId: d.sourceId,
    sourceNom: d.source?.nom ?? null,
    destinationId: d.destinationId,
    destinationNom: d.destination?.nom ?? null,
    statut: d.statut as DispatchOrderDto['statut'],
    note: d.note,
    createdAt: d.createdAt.toISOString(),
    validatedAt: d.validatedAt ? d.validatedAt.toISOString() : null,
    items: d.items.map(
      (i): DispatchOrderItemDto => ({
        id: i.id,
        productId: i.productId,
        variantId: i.variantId,
        productNom: i.product.nom,
        quantite: i.quantite,
      }),
    ),
  };
}

const INCLUDE = {
  source: { select: { nom: true } },
  destination: { select: { nom: true } },
  items: { include: { product: { select: { nom: true } } } },
} as const;

@Injectable()
export class DispatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async list(ctx: AuthContext, status?: string) {
    const rows = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.dispatchOrder.findMany({
        where: { tenantId: ctx.tenantId, ...(status ? { statut: status as never } : {}) },
        include: INCLUDE,
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    );
    return rows.map((r) => toDto(r as DispatchRow));
  }

  async get(ctx: AuthContext, id: string) {
    const row = await this.prisma.forTenant(ctx.tenantId, (tx) => this.ensure(tx, ctx.tenantId, id));
    return toDto(row as DispatchRow);
  }

  async create(ctx: AuthContext, input: CreateDispatchInput) {
    const reference = `DSP-${randomBytes(3).toString('hex').toUpperCase()}`;
    const result = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const [source, destination] = await Promise.all([
        tx.etablissement.findFirst({ where: { id: input.sourceId, tenantId: ctx.tenantId } }),
        tx.etablissement.findFirst({ where: { id: input.destinationId, tenantId: ctx.tenantId } }),
      ]);
      if (!source) throw new NotFoundException("L'établissement source est introuvable.");
      if (!destination) throw new NotFoundException("L'établissement de destination est introuvable.");
      if (source.id === destination.id) {
        throw new BadRequestException('Source et destination doivent être différentes.');
      }

      const created = await tx.dispatchOrder.create({
        data: {
          tenantId: ctx.tenantId,
          sourceId: input.sourceId,
          destinationId: input.destinationId,
          reference,
          statut: 'DRAFT',
          note: input.note ?? null,
          createdBy: ctx.userId,
          items: {
            create: input.items.map((it) => ({
              tenantId: ctx.tenantId,
              productId: it.productId,
              variantId: it.variantId ?? null,
              quantite: it.quantite,
            })),
          },
        },
        include: INCLUDE,
      });

      if (input.validate) {
        return this.applyValidation(tx, ctx, created.id);
      }
      return created;
    });

    await this.activity.log({
      tenantId: ctx.tenantId,
      etablissementId: input.sourceId,
      userId: ctx.userId,
      action: input.validate ? 'DISPATCH_VALIDATE' : 'DISPATCH_CREATE',
      entity: 'dispatch_order',
      entityId: result.id,
      metadata: { reference },
    });
    return toDto(result as DispatchRow);
  }

  /** Validation : déplace le stock source → destination (idempotence par statut). */
  async validate(ctx: AuthContext, id: string) {
    const result = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      this.applyValidation(tx, ctx, id),
    );
    await this.activity.log({
      tenantId: ctx.tenantId,
      etablissementId: result.sourceId,
      userId: ctx.userId,
      action: 'DISPATCH_VALIDATE',
      entity: 'dispatch_order',
      entityId: id,
      metadata: { reference: result.reference },
    });
    return toDto(result as DispatchRow);
  }

  async cancel(ctx: AuthContext, id: string) {
    const result = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const d = await this.ensure(tx, ctx.tenantId, id);
      if (d.statut !== 'DRAFT') {
        throw new BadRequestException('Seul un dispatch en brouillon peut être annulé.');
      }
      return tx.dispatchOrder.update({
        where: { id },
        data: { statut: 'CANCELLED' },
        include: INCLUDE,
      });
    });
    await this.activity.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'DISPATCH_CANCEL',
      entity: 'dispatch_order',
      entityId: id,
    });
    return toDto(result as DispatchRow);
  }

  private async applyValidation(tx: TenantTx, ctx: AuthContext, id: string) {
    const d = await this.ensure(tx, ctx.tenantId, id);
    if (d.statut !== 'DRAFT') {
      throw new BadRequestException('Ce dispatch a déjà été traité.');
    }

    for (const item of d.items) {
      // 1. Vérifier le stock disponible à la source.
      const dispo = await readStockAt(tx, d.sourceId, item.productId, item.variantId);
      if (dispo < item.quantite) {
        throw new BadRequestException(
          `Stock insuffisant à la source pour « ${item.product.nom} » (disponible ${dispo}, demandé ${item.quantite}).`,
        );
      }

      // 2. Déplacer le solde (projection ProductStock) source → destination.
      await applyStockDelta(tx, {
        tenantId: ctx.tenantId,
        etablissementId: d.sourceId,
        productId: item.productId,
        variantId: item.variantId,
        delta: -item.quantite,
      });
      await applyStockDelta(tx, {
        tenantId: ctx.tenantId,
        etablissementId: d.destinationId,
        productId: item.productId,
        variantId: item.variantId,
        delta: item.quantite,
      });

      // 3. Grand livre : un mouvement OUT (source) + IN (destination).
      await tx.stockMovement.createMany({
        data: [
          {
            tenantId: ctx.tenantId,
            etablissementId: d.sourceId,
            productId: item.productId,
            variantId: item.variantId,
            type: 'OUT',
            quantite: -item.quantite,
            motif: `Dispatch ${d.reference} → ${d.destination?.nom ?? 'boutique'}`,
          },
          {
            tenantId: ctx.tenantId,
            etablissementId: d.destinationId,
            productId: item.productId,
            variantId: item.variantId,
            type: 'IN',
            quantite: item.quantite,
            motif: `Dispatch ${d.reference} depuis ${d.source?.nom ?? 'entrepôt'}`,
          },
        ],
      });
    }

    return tx.dispatchOrder.update({
      where: { id },
      data: { statut: 'VALIDATED', validatedBy: ctx.userId, validatedAt: new Date() },
      include: INCLUDE,
    });
  }

  private async ensure(tx: TenantTx, tenantId: string, id: string) {
    const d = await tx.dispatchOrder.findFirst({ where: { id, tenantId }, include: INCLUDE });
    if (!d) throw new NotFoundException('Dispatch introuvable');
    return d;
  }
}
