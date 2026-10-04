/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Service métier pour inventory
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 nexus-partners.xyz
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
  constructor(private readonly prisma: PrismaService) { }

  /** 1. Lancer : fige le stock théorique des produits sélectionnés. */
  async start(ctx: AuthContext, input: StartInventoryInput) {
    assertConcreteEtablissement(ctx);
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const products = await tx.product.findMany({
        where: {
          tenantId: ctx.tenantId,
          actif: true,
          // Seuls les produits à stock direct se comptent (SERVICE/MANUFACTURED exclus).
          type: { in: ['STANDARD', 'BATCHED'] },
          ...(input.productIds.length > 0 ? { id: { in: input.productIds } } : {}),
        },
      });
      if (products.length === 0) throw new BadRequestException('Aucun produit à compter');

      // Le comptage se fait dans UNE boutique : le théorique est le stock LOCAL
      // (projection ProductStock), pas la colonne globale — sinon tous les écarts
      // sont faux dès que l'entreprise a plusieurs établissements.
      const localRows = await tx.productStock.findMany({
        where: {
          tenantId: ctx.tenantId,
          etablissementId: ctx.etablissementId!,
          variantId: null,
          productId: { in: products.map((p) => p.id) },
        },
        select: { productId: true, quantite: true },
      });
      const localByProduct = new Map(localRows.map((r) => [r.productId, r.quantite]));

      const inv = await tx.inventory.create({
        data: {
          tenantId: ctx.tenantId,
          etablissementId: ctx.etablissementId,
          libelle: input.libelle ?? null,
          status: 'OPEN',
          items: {
            create: products.map((p) => ({
              tenantId: ctx.tenantId,
              productId: p.id,
              quantiteTheorique: localByProduct.get(p.id) ?? p.stock ?? 0,
            })),
          },
        },
        include: { items: true },
      });
      const itemsWithProduct = await this.attachProductsToItems(tx, inv.items);
      return { ...inv, items: itemsWithProduct };
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
      const items = await tx.inventoryItem.findMany({ where: { tenantId: ctx.tenantId, inventoryId } });
      return this.attachProductsToItems(tx, items);
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
        // La colonne globale reçoit l'ÉCART (delta), pas le comptage local :
        // écraser le stock global avec le réel d'UNE boutique effacerait le stock
        // des autres établissements.
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.ecart } },
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

      const updated = await tx.inventory.update({
        where: { id: inventoryId },
        data: {
          status: 'VALIDATED',
          motif: input.motif,
          validatedBy: ctx.userId,
          validatedAt: new Date(),
        },
        include: { items: true },
      });
      const itemsWithProduct = await this.attachProductsToItems(tx, updated.items);
      return { ...updated, items: itemsWithProduct };
    });
  }

  async list(ctx: AuthContext) {
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const inventories = await tx.inventory.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...(ctx.etablissementId ? { etablissementId: ctx.etablissementId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: {
          items: true,
          validator: { select: { id: true, nom: true, email: true } },
          etablissement: { select: { id: true, nom: true } },
        },
      });

      return Promise.all(
        inventories.map(async (inv) => ({
          ...inv,
          items: await this.attachProductsToItems(tx, inv.items),
        })),
      );
    });
  }

  async get(ctx: AuthContext, inventoryId: string) {
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const inv = await tx.inventory.findFirst({
        where: { id: inventoryId, tenantId: ctx.tenantId },
        include: {
          items: true,
          validator: { select: { id: true, nom: true, email: true } },
          etablissement: { select: { id: true, nom: true } },
        },
      });
      if (!inv) throw new NotFoundException('Inventaire introuvable');
      const itemsWithProduct = await this.attachProductsToItems(tx, inv.items);
      return { ...inv, items: itemsWithProduct };
    });
  }

  private async attachProductsToItems<T extends { productId: string }>(
    tx: any,
    items: T[],
  ) {
    if (items.length === 0) return [];
    const productIds = Array.from(new Set(items.map((it) => it.productId)));
    const products: Array<{
      id: string;
      nom: string;
      baseUnit: string | null;
      unitKind: any;
      prixVente: number;
      prixAchat: number;
    }> = await tx.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        nom: true,
        baseUnit: true,
        unitKind: true,
        prixVente: true,
        prixAchat: true,
      },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));
    return items.map((it) => ({
      ...it,
      product: productMap.get(it.productId) ?? null,
    }));
  }
}
