/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Service métier pour la gestion des bons de commande et réceptions
 * @created 2026-06-28
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type { AuthContext, CreatePurchaseOrderInput, ReceivePurchaseOrderInput } from '@wilinwi/types';
import type { TenantTx } from '@wilinwi/db';
import { PrismaService } from '../common/prisma.service';
import { ActivityService } from '../common/activity.service';
import { toPurchaseOrderDto } from './purchase-order.mapper';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async list(ctx: AuthContext, status?: string) {
    const orders = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.purchaseOrder.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...(ctx.etablissementId ? { etablissementId: ctx.etablissementId } : {}),
          ...(status ? { statut: status as any } : {}),
        },
        include: {
          fournisseur: true,
          etablissement: true,
          items: {
            include: {
              product: { select: { nom: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    );
    return orders.map(toPurchaseOrderDto);
  }

  async getOrder(ctx: AuthContext, id: string) {
    const order = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      return this.ensureOrder(tx, ctx.tenantId, id);
    });
    return toPurchaseOrderDto(order);
  }

  async create(ctx: AuthContext, input: CreatePurchaseOrderInput) {
    // Générer une référence lisible et unique, ex: BC-260628-XXXX
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const reference = `BC-${dateStr}-${randomHex}`;

    const order = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      // Vérifier le fournisseur
      const supplier = await tx.supplier.findFirst({
        where: { id: input.fournisseurId, tenantId: ctx.tenantId },
      });
      if (!supplier) throw new NotFoundException('Fournisseur introuvable');

      // Calculer le montant total
      const montantTotal = input.items.reduce(
        (sum, item) => sum + item.quantiteCommandee * item.prixUnitaire,
        0,
      );

      const created = await tx.purchaseOrder.create({
        data: {
          tenantId: ctx.tenantId,
          etablissementId: input.etablissementId,
          fournisseurId: input.fournisseurId,
          reference,
          statut: input.ordered ? 'ORDERED' : 'DRAFT',
          montantTotal,
          createdBy: ctx.userId,
          notes: input.notes ?? null,
          items: {
            create: input.items.map((item) => ({
              tenantId: ctx.tenantId,
              productId: item.productId,
              variantId: item.variantId ?? null,
              quantiteCommandee: item.quantiteCommandee,
              prixUnitaire: item.prixUnitaire,
            })),
          },
        },
      });

      await this.activity.log({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        action: 'PURCHASE_ORDER_CREATE',
        entity: 'purchase_order',
        entityId: created.id,
        metadata: { reference, montantTotal },
      });

      return tx.purchaseOrder.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          fournisseur: true,
          etablissement: true,
          items: {
            include: {
              product: { select: { nom: true } },
            },
          },
        },
      });
    });

    return toPurchaseOrderDto(order);
  }

  async receive(ctx: AuthContext, id: string, input: ReceivePurchaseOrderInput) {
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const po = await this.ensureOrder(tx, ctx.tenantId, id);

      if (po.statut !== 'ORDERED' && po.statut !== 'PARTIAL') {
        throw new BadRequestException('Le bon de commande doit être au statut commandé ou partiel pour être réceptionné.');
      }

      let valueOfReceivedItems = 0;

      for (const rx of input.items) {
        const item = po.items.find((i) => i.id === rx.itemId);
        if (!item) throw new NotFoundException(`Ligne de commande ${rx.itemId} introuvable`);

        const remaining = item.quantiteCommandee - item.quantiteRecue;
        if (rx.quantite > remaining) {
          throw new BadRequestException(
            `Quantité reçue supérieure au restant commandé pour ${item.product.nom} (max ${remaining})`,
          );
        }

        // Mettre à jour la ligne de commande
        await tx.purchaseOrderItem.update({
          where: { id: rx.itemId },
          data: { quantiteRecue: { increment: rx.quantite } },
        });

        // Cumuler la valeur reçue
        valueOfReceivedItems += rx.quantite * item.prixUnitaire;

        // Mettre à jour les stocks (IN + motif)
        await tx.stockMovement.create({
          data: {
            tenantId: ctx.tenantId,
            etablissementId: po.etablissementId,
            productId: item.productId,
            variantId: item.variantId ?? null,
            type: 'IN',
            quantite: rx.quantite,
            motif: `Réception de commande ${po.reference}`,
          },
        });

        // Mettre à jour le stock cumulé des produits (caches de stock globaux)
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: rx.quantite } },
        });
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: rx.quantite } },
          });
        }
      }

      // Calcul de la dette fournisseur générée
      const debtIncrease = valueOfReceivedItems - input.montantPaye;
      if (debtIncrease !== 0) {
        await tx.supplier.update({
          where: { id: po.fournisseurId },
          data: { soldeDette: { increment: debtIncrease } },
        });
      }

      // Enregistrer le paiement si acompte immédiat
      if (input.montantPaye > 0) {
        await tx.supplierPayment.create({
          data: {
            tenantId: ctx.tenantId,
            fournisseurId: po.fournisseurId,
            etablissementId: po.etablissementId,
            montant: input.montantPaye,
            methode: 'CASH',
            note: `Acompte réception bon de commande ${po.reference}`,
            purchaseOrderId: po.id,
            createdBy: ctx.userId,
          },
        });

        // Sortie de trésorerie associée
        await tx.cashMovement.create({
          data: {
            tenantId: ctx.tenantId,
            etablissementId: po.etablissementId,
            type: 'OUT',
            compte: 'CAISSE',
            montant: input.montantPaye,
            source: 'EXPENSE',
            note: `Acompte réception bon de commande ${po.reference}`,
            createdBy: ctx.userId,
          },
        });
      }

      // Re-charger les items mis à jour pour recalculer les totaux globaux du bon de commande
      const updatedItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: id },
      });

      const totalQtyOrdered = updatedItems.reduce((sum, i) => sum + i.quantiteCommandee, 0);
      const totalQtyReceived = updatedItems.reduce((sum, i) => sum + i.quantiteRecue, 0);

      let nextStatus: 'PARTIAL' | 'RECEIVED' = 'PARTIAL';
      if (totalQtyReceived >= totalQtyOrdered) {
        nextStatus = 'RECEIVED';
      }

      const updatedPo = await tx.purchaseOrder.update({
        where: { id },
        data: {
          statut: nextStatus,
          montantRecu: { increment: valueOfReceivedItems },
          montantPaye: { increment: input.montantPaye },
        },
        include: {
          fournisseur: true,
          etablissement: true,
          items: {
            include: {
              product: { select: { nom: true } },
            },
          },
        },
      });

      await this.activity.log({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        action: 'PURCHASE_ORDER_RECEIVE',
        entity: 'purchase_order',
        entityId: id,
        metadata: { reference: po.reference, valeurRecue: valueOfReceivedItems, paye: input.montantPaye },
      });

      return toPurchaseOrderDto(updatedPo);
    });
  }

  async cancel(ctx: AuthContext, id: string) {
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const po = await this.ensureOrder(tx, ctx.tenantId, id);

      if (po.statut !== 'DRAFT' && po.statut !== 'ORDERED') {
        throw new BadRequestException('Seules les commandes au statut Brouillon ou Commandé sans réception peuvent être annulées.');
      }

      const cancelledPo = await tx.purchaseOrder.update({
        where: { id },
        data: { statut: 'CANCELLED' },
        include: {
          fournisseur: true,
          etablissement: true,
          items: {
            include: {
              product: { select: { nom: true } },
            },
          },
        },
      });

      await this.activity.log({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        action: 'PURCHASE_ORDER_CANCEL',
        entity: 'purchase_order',
        entityId: id,
        metadata: { reference: po.reference },
      });

      return toPurchaseOrderDto(cancelledPo);
    });
  }

  private async ensureOrder(tx: TenantTx, tenantId: string, id: string) {
    const order = await tx.purchaseOrder.findFirst({
      where: { id, tenantId },
      include: {
        fournisseur: true,
        etablissement: true,
        items: {
          include: {
            product: { select: { nom: true } },
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Bon de commande introuvable');
    return order;
  }
}
