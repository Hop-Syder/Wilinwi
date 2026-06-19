import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  hasCapability,
  type ApprovePriceOverrideInput,
  type AuthContext,
  type CreateSaleInput,
  type InstallmentStatus,
} from '@wilinwi/types';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crée une vente : décrémente le stock, fige le coût, gère le paiement
   * (acompte/crédit) et la traçabilité des prix sous le plancher (§5.3 / §5.5).
   * Idempotent via clientGeneratedId pour la synchronisation hors-ligne.
   */
  async create(ctx: AuthContext, input: CreateSaleInput) {
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      // Idempotence offline : si la vente a déjà été synchronisée, on la renvoie.
      if (input.clientGeneratedId) {
        const existing = await tx.sale.findFirst({
          where: { tenantId: ctx.tenantId, clientGeneratedId: input.clientGeneratedId },
          include: { items: true, installment: true },
        });
        if (existing) return existing;
      }

      const canOverride = hasCapability(ctx.role, 'sale:override_floor_price');
      let total = 0;
      const lines: {
        productId: string;
        variantId: string | null;
        quantite: number;
        prixReel: number;
        coutUnitaire: number;
        prixPlancher: number;
        sousPlancher: boolean;
        motif?: string;
      }[] = [];

      // Validation + préparation des lignes
      for (const item of input.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, tenantId: ctx.tenantId },
        });
        if (!product) throw new NotFoundException(`Produit ${item.productId} introuvable`);

        const sousPlancher = item.prixReel < product.prixPlancher;
        if (sousPlancher && !item.motifSousPlancher) {
          throw new BadRequestException(
            `Vente de "${product.nom}" sous le prix plancher : une preuve (motif) est obligatoire`,
          );
        }

        total += item.prixReel * item.quantite;
        lines.push({
          productId: product.id,
          variantId: item.variantId ?? null,
          quantite: item.quantite,
          prixReel: item.prixReel,
          coutUnitaire: product.prixAchat,
          prixPlancher: product.prixPlancher,
          sousPlancher,
          motif: item.motifSousPlancher,
        });
      }

      const { montantVerse, status } = this.resolvePayment(input, total);

      const sale = await tx.sale.create({
        data: {
          tenantId: ctx.tenantId,
          vendeurId: ctx.userId,
          clientId: input.clientId ?? null,
          status,
          paymentMethod: input.paymentMethod,
          total,
          montantVerse,
          clientGeneratedId: input.clientGeneratedId ?? null,
        },
      });

      // Lignes + décrément de stock + traçabilité prix
      for (const line of lines) {
        const saleItem = await tx.saleItem.create({
          data: {
            tenantId: ctx.tenantId,
            saleId: sale.id,
            productId: line.productId,
            variantId: line.variantId,
            quantite: line.quantite,
            prixReel: line.prixReel,
            coutUnitaire: line.coutUnitaire,
          },
        });

        await tx.stockMovement.create({
          data: {
            tenantId: ctx.tenantId,
            productId: line.productId,
            variantId: line.variantId,
            type: 'OUT',
            quantite: -line.quantite,
            motif: `Vente ${sale.id}`,
            saleId: sale.id,
          },
        });
        await tx.product.update({
          where: { id: line.productId },
          data: { stock: { decrement: line.quantite } },
        });

        if (line.sousPlancher) {
          await tx.priceOverride.create({
            data: {
              tenantId: ctx.tenantId,
              saleItemId: saleItem.id,
              prixPlancher: line.prixPlancher,
              prixApplique: line.prixReel,
              motif: line.motif!,
              // Si le vendeur a déjà le droit de valider, c'est auto-approuvé.
              status: canOverride ? 'APPROVED' : 'PENDING',
              requestedBy: ctx.userId,
              approvedBy: canOverride ? ctx.userId : null,
              approvedAt: canOverride ? new Date() : null,
            },
          });
        }
      }

      // Acompte → suivi du solde
      if (input.paymentMethod === 'INSTALLMENT' || input.paymentMethod === 'CREDIT') {
        await tx.saleInstallment.create({
          data: {
            tenantId: ctx.tenantId,
            saleId: sale.id,
            montantTotal: total,
            montantVerse,
            soldeRestant: total - montantVerse,
            status: this.installmentStatus(total, montantVerse),
          },
        });
      }

      return tx.sale.findUnique({
        where: { id: sale.id },
        include: { items: { include: { priceOverride: true } }, installment: true },
      });
    });
  }

  /** Validation gérant d'une vente sous le prix plancher (§5.5). */
  async approveOverride(ctx: AuthContext, input: ApprovePriceOverrideInput) {
    if (!hasCapability(ctx.role, 'sale:override_floor_price')) {
      throw new ForbiddenException('Seul un gérant peut valider une vente sous le plancher');
    }
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const override = await tx.priceOverride.findFirst({
        where: { saleItemId: input.saleItemId, tenantId: ctx.tenantId },
      });
      if (!override) throw new NotFoundException('Demande de dérogation introuvable');
      return tx.priceOverride.update({
        where: { saleItemId: input.saleItemId },
        data: {
          status: input.approuve ? 'APPROVED' : 'REJECTED',
          approvedBy: ctx.userId,
          approvedAt: new Date(),
        },
      });
    });
  }

  /** Versement supplémentaire sur un acompte. */
  async addPayment(ctx: AuthContext, saleId: string, montant: number) {
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const inst = await tx.saleInstallment.findFirst({
        where: { saleId, tenantId: ctx.tenantId },
      });
      if (!inst) throw new NotFoundException('Aucun acompte pour cette vente');
      const montantVerse = inst.montantVerse + montant;
      const soldeRestant = Math.max(inst.montantTotal - montantVerse, 0);
      const status = this.installmentStatus(inst.montantTotal, montantVerse);

      const updated = await tx.saleInstallment.update({
        where: { saleId },
        data: { montantVerse, soldeRestant, status },
      });
      if (status === 'SETTLED') {
        await tx.sale.update({ where: { id: saleId }, data: { status: 'COMPLETED', montantVerse } });
      } else {
        await tx.sale.update({ where: { id: saleId }, data: { montantVerse } });
      }
      return updated;
    });
  }

  async list(ctx: AuthContext) {
    return this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.sale.findMany({
        where: { tenantId: ctx.tenantId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { items: true, installment: true },
      }),
    );
  }

  async get(ctx: AuthContext, id: string) {
    const sale = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.sale.findFirst({
        where: { id, tenantId: ctx.tenantId },
        include: { items: { include: { priceOverride: true } }, installment: true },
      }),
    );
    if (!sale) throw new NotFoundException('Vente introuvable');
    return sale;
  }

  /** Dérogations en attente de validation gérant. */
  async pendingOverrides(ctx: AuthContext) {
    return this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.priceOverride.findMany({
        where: { tenantId: ctx.tenantId, status: 'PENDING' },
        include: { saleItem: { include: { product: true } } },
        orderBy: { createdAt: 'asc' },
      }),
    );
  }

  private resolvePayment(
    input: CreateSaleInput,
    total: number,
  ): { montantVerse: number; status: 'COMPLETED' | 'PENDING_PAYMENT' } {
    if (input.paymentMethod === 'INSTALLMENT') {
      const verse = input.montantVerse ?? 0;
      if (verse <= 0) throw new BadRequestException('Le montant de l\'acompte doit être positif');
      if (verse > total) throw new BadRequestException('L\'acompte dépasse le total');
      return { montantVerse: verse, status: verse >= total ? 'COMPLETED' : 'PENDING_PAYMENT' };
    }
    if (input.paymentMethod === 'CREDIT') {
      return { montantVerse: 0, status: 'PENDING_PAYMENT' };
    }
    return { montantVerse: total, status: 'COMPLETED' };
  }

  private installmentStatus(total: number, verse: number): InstallmentStatus {
    if (verse <= 0) return 'PENDING';
    if (verse >= total) return 'SETTLED';
    return 'PARTIAL';
  }
}
