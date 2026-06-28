/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Service métier pour inventory
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AuthContext,
  StartInventoryInput,
  SubmitCountInput,
  ValidateInventoryInput,
} from '@wilinwi/types';
import { PrismaService } from '../common/prisma.service';
import { assertConcreteEtablissement } from '../common/scope';
import { applyStockDelta } from '../common/product-stock';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /** 1. Lancer : fige le stock théorique des produits sélectionnés. */
  async start(ctx: AuthContext, input: StartInventoryInput) {
    assertConcreteEtablissement(ctx);
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const products = await tx.product.findMany({
        where: {
          tenantId: ctx.tenantId,
          actif: true,
          ...(input.productIds.length > 0 ? { id: { in: input.productIds } } : {}),
        },
      });
      if (products.length === 0) throw new BadRequestException('Aucun produit à compter');

      return tx.inventory.create({
        data: {
          tenantId: ctx.tenantId,
          etablissementId: ctx.etablissementId,
          libelle: input.libelle ?? null,
          status: 'OPEN',
          items: {
            create: products.map((p) => ({
              tenantId: ctx.tenantId,
              productId: p.id,
              quantiteTheorique: p.stock,
            })),
          },
        },
        include: { items: true },
      });
    });
  }

  /** 2/3. Comptage : enregistre les quantités réelles et calcule les écarts. */
  async submitCount(ctx: AuthContext, inventoryId: string, input: SubmitCountInput) {
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const inv = await tx.inventory.findFirst({
        where: { id: inventoryId, tenantId: ctx.tenantId },
      });
      if (!inv) throw new NotFoundException('Inventaire introuvable');
      if (inv.status !== 'OPEN') throw new BadRequestException('Inventaire déjà clôturé');

      for (const item of input.items) {
        const row = await tx.inventoryItem.findFirst({
          where: {
            tenantId: ctx.tenantId,
            inventoryId,
            productId: item.productId,
            variantId: item.variantId ?? null,
          },
        });
        if (!row) continue;
        await tx.inventoryItem.update({
          where: { id: row.id },
          data: {
            quantiteReelle: item.quantiteReelle,
            ecart: item.quantiteReelle - row.quantiteTheorique,
          },
        });
      }
      return tx.inventoryItem.findMany({ where: { tenantId: ctx.tenantId, inventoryId } });
    });
  }

  /** 4. Validation : applique les écarts en mouvements ADJUST et corrige le stock. */
  async validate(ctx: AuthContext, inventoryId: string, input: ValidateInventoryInput) {
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const inv = await tx.inventory.findFirst({
        where: { id: inventoryId, tenantId: ctx.tenantId },
        include: { items: true },
      });
      if (!inv) throw new NotFoundException('Inventaire introuvable');
      if (inv.status !== 'OPEN') throw new BadRequestException('Inventaire déjà clôturé');

      for (const item of inv.items) {
        if (item.quantiteReelle === null || item.ecart === null || item.ecart === 0) continue;
        await tx.stockMovement.create({
          data: {
            tenantId: ctx.tenantId,
            etablissementId: inv.etablissementId ?? ctx.etablissementId,
            productId: item.productId,
            variantId: item.variantId,
            type: 'ADJUST',
            quantite: item.ecart,
            motif: `Inventaire ${inventoryId}: ${input.motif}`,
          },
        });
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: item.quantiteReelle },
        });
        // Projection ProductStock : applique l'écart à l'établissement de l'inventaire.
        const etablissementId = inv.etablissementId ?? ctx.etablissementId;
        if (etablissementId) {
          await applyStockDelta(tx, {
            tenantId: ctx.tenantId,
            etablissementId,
            productId: item.productId,
            variantId: item.variantId,
            delta: item.ecart,
          });
        }
      }

      return tx.inventory.update({
        where: { id: inventoryId },
        data: {
          status: 'VALIDATED',
          motif: input.motif,
          validatedBy: ctx.userId,
          validatedAt: new Date(),
        },
        include: { items: true },
      });
    });
  }

  async get(ctx: AuthContext, inventoryId: string) {
    const inv = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.inventory.findFirst({
        where: { id: inventoryId, tenantId: ctx.tenantId },
        include: { items: true },
      }),
    );
    if (!inv) throw new NotFoundException('Inventaire introuvable');
    return inv;
  }
}
