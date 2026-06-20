/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Service de gestion des ventes, implémentant la logique métier des 4 prix, du POS offline-first et des validations de gérant
 * @created 2026-06-19
 * @updated 2026-06-19
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  accountForPayment,
  hasCapability,
  type AuthContext,
  type CreateSaleInput,
  type InstallmentStatus,
} from '@wilinwi/types';
import { Prisma, type TenantTx } from '@wilinwi/db';
import { PrismaService } from '../common/prisma.service';
import { toSaleDto, toSaleDtoList } from './sale.mapper';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crée une vente. Trois cas :
   *  - lignes ≥ plancher (ou vendeur autorisé) → vente finalisée (stock décrémenté, paiement).
   *  - vendeur NON autorisé avec une ligne sous le plancher → vente `PENDING_APPROVAL`,
   *    stock NON décrémenté tant qu'un gérant n'a pas validé (§5.5, anti-fraude bloquant).
   * Idempotent via clientGeneratedId pour la synchronisation hors-ligne.
   */
  async create(ctx: AuthContext, input: CreateSaleInput) {
    try {
      return await this.createInternal(ctx, input);
    } catch (err) {
      // Course de synchronisation offline : la même vente (clientGeneratedId) a été
      // créée en parallèle → contrainte unique violée (P2002). On renvoie la vente
      // existante (équivalent idempotent d'un INSERT … ON CONFLICT DO NOTHING).
      if (
        input.clientGeneratedId &&
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const existing = await this.prisma.forTenant(ctx.tenantId, (tx) =>
          tx.sale.findFirst({
            where: { tenantId: ctx.tenantId, clientGeneratedId: input.clientGeneratedId },
            include: { items: { include: { priceOverride: true } }, installment: true },
          }),
        );
        if (existing) return toSaleDto(existing, ctx.role);
      }
      throw err;
    }
  }

  private async createInternal(ctx: AuthContext, input: CreateSaleInput) {
    const sale = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      // Idempotence offline : si la vente existe déjà, on la renvoie.
      if (input.clientGeneratedId) {
        const existing = await tx.sale.findFirst({
          where: { tenantId: ctx.tenantId, clientGeneratedId: input.clientGeneratedId },
          include: { items: { include: { priceOverride: true } }, installment: true },
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

      for (const item of input.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, tenantId: ctx.tenantId },
        });
        if (!product) throw new NotFoundException(`Produit ${item.productId} introuvable`);

        if (item.quantite > product.stock) {
          throw new BadRequestException(
            `Stock insuffisant pour le produit "${product.nom}". Demandé : ${item.quantite}, Disponible : ${product.stock}`
          );
        }

        const sousPlancher = item.prixReel < product.prixPlancher;
        if (sousPlancher) {
          throw new BadRequestException(
            `Opération refusée : le prix de vente de "${product.nom}" (${item.prixReel}) est inférieur au prix plancher fixe (${product.prixPlancher}).`,
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
        });
      }

      // Acompte : validé tôt (échoue vite) pour les deux flux.
      const intendedAcompte = this.validateAcompte(input, total);
      // Crédit client : vérifier le plafond avant de créer la vente.
      await this.assertCreditWithinLimit(tx, ctx, input, total, intendedAcompte);
      const needsApproval = !canOverride && lines.some((l) => l.sousPlancher);

      // Création de la vente + lignes + dérogations éventuelles.
      const created = await tx.sale.create({
        data: {
          tenantId: ctx.tenantId,
          vendeurId: ctx.userId,
          clientId: input.clientId ?? null,
          status: needsApproval ? 'PENDING_APPROVAL' : 'COMPLETED',
          paymentMethod: input.paymentMethod,
          total,
          // Acompte voulu mémorisé (appliqué à la finalisation).
          montantVerse: input.paymentMethod === 'INSTALLMENT' ? intendedAcompte : 0,
          clientGeneratedId: input.clientGeneratedId ?? null,
        },
      });

      for (const line of lines) {
        const saleItem = await tx.saleItem.create({
          data: {
            tenantId: ctx.tenantId,
            saleId: created.id,
            productId: line.productId,
            variantId: line.variantId,
            quantite: line.quantite,
            prixReel: line.prixReel,
            coutUnitaire: line.coutUnitaire,
          },
        });
        if (line.sousPlancher) {
          await tx.priceOverride.create({
            data: {
              tenantId: ctx.tenantId,
              saleItemId: saleItem.id,
              prixPlancher: line.prixPlancher,
              prixApplique: line.prixReel,
              motif: line.motif!,
              status: 'PENDING',
              requestedBy: ctx.userId,
            },
          });
        }
      }

      // Vendeur autorisé ou aucune ligne sous le plancher → finaliser tout de suite.
      // Sinon : on s'arrête en PENDING_APPROVAL (stock intact) jusqu'à validation gérant.
      if (!needsApproval) {
        await this.finalize(tx, ctx, created.id);
      }

      return tx.sale.findUnique({
        where: { id: created.id },
        include: { items: { include: { priceOverride: true } }, installment: true },
      });
    });

    return sale ? toSaleDto(sale, ctx.role) : sale;
  }

  /**
   * Validation gérant d'une vente en attente (§5.5).
   * Approuvée → finalisation (stock décrémenté, paiement). Rejetée → annulée.
   */
  async approveSale(ctx: AuthContext, saleId: string, approuve: boolean) {
    if (!hasCapability(ctx.role, 'sale:override_floor_price')) {
      throw new ForbiddenException('Seul un gérant peut valider une vente sous le plancher');
    }
    const sale = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const target = await tx.sale.findFirst({
        where: { id: saleId, tenantId: ctx.tenantId },
      });
      if (!target) throw new NotFoundException('Vente introuvable');
      if (target.status !== 'PENDING_APPROVAL') {
        throw new BadRequestException("Cette vente n'est pas en attente de validation");
      }

      if (approuve) {
        await this.finalize(tx, ctx, saleId);
      } else {
        await tx.priceOverride.updateMany({
          where: { saleItem: { saleId } },
          data: { status: 'REJECTED', approvedBy: ctx.userId, approvedAt: new Date() },
        });
        await tx.sale.update({ where: { id: saleId }, data: { status: 'CANCELLED' } });
      }

      return tx.sale.findUnique({
        where: { id: saleId },
        include: { items: { include: { priceOverride: true } }, installment: true },
      });
    });
    return sale ? toSaleDto(sale, ctx.role) : sale;
  }

  /**
   * Finalise une vente persistée : décrément du stock + mouvements, approbation des
   * dérogations, résolution du paiement (acompte/crédit) et statut final.
   */
  private async finalize(tx: TenantTx, ctx: AuthContext, saleId: string) {
    const sale = await tx.sale.findUniqueOrThrow({
      where: { id: saleId },
      include: { items: true },
    });

    for (const item of sale.items) {
      await tx.stockMovement.create({
        data: {
          tenantId: ctx.tenantId,
          productId: item.productId,
          variantId: item.variantId,
          type: 'OUT',
          quantite: -item.quantite,
          motif: `Vente ${saleId}`,
          saleId,
        },
      });
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantite } },
      });
    }

    // Dérogations de cette vente → approuvées par le gérant courant.
    await tx.priceOverride.updateMany({
      where: { saleItem: { saleId }, status: 'PENDING' },
      data: { status: 'APPROVED', approvedBy: ctx.userId, approvedAt: new Date() },
    });

    const { montantVerse, status } = this.resolvePayment(
      sale.paymentMethod,
      sale.total,
      sale.montantVerse,
    );

    if (sale.paymentMethod === 'INSTALLMENT' || sale.paymentMethod === 'CREDIT') {
      await tx.saleInstallment.upsert({
        where: { saleId },
        update: {
          montantVerse,
          soldeRestant: sale.total - montantVerse,
          status: this.installmentStatus(sale.total, montantVerse),
        },
        create: {
          tenantId: ctx.tenantId,
          saleId,
          montantTotal: sale.total,
          montantVerse,
          soldeRestant: sale.total - montantVerse,
          status: this.installmentStatus(sale.total, montantVerse),
        },
      });
    }

    // Crédit client : la part non réglée vient grossir la dette du client (§6.2).
    const impaye = sale.total - montantVerse;
    if (sale.clientId && impaye > 0) {
      await tx.client.update({
        where: { id: sale.clientId },
        data: { soldeCredit: { increment: impaye } },
      });
    }

    // Trésorerie : la part encaissée entre dans le compte correspondant (§6.1).
    const compte = accountForPayment(sale.paymentMethod);
    if (compte && montantVerse > 0) {
      await tx.cashMovement.create({
        data: {
          tenantId: ctx.tenantId,
          type: 'IN',
          compte,
          montant: montantVerse,
          source: 'SALE',
          saleId,
          createdBy: ctx.userId,
        },
      });
    }

    await tx.sale.update({ where: { id: saleId }, data: { montantVerse, status } });
  }

  /** Versement supplémentaire sur un acompte. */
  async addPayment(ctx: AuthContext, saleId: string, montant: number) {
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const inst = await tx.saleInstallment.findFirst({
        where: { saleId, tenantId: ctx.tenantId },
        include: { sale: { select: { clientId: true } } },
      });
      if (!inst) throw new NotFoundException('Aucun acompte pour cette vente');
      const applique = Math.min(montant, inst.soldeRestant);
      const montantVerse = inst.montantVerse + applique;
      const soldeRestant = Math.max(inst.montantTotal - montantVerse, 0);
      const status = this.installmentStatus(inst.montantTotal, montantVerse);

      const updated = await tx.saleInstallment.update({
        where: { saleId },
        data: { montantVerse, soldeRestant, status },
      });
      await tx.sale.update({
        where: { id: saleId },
        data: { montantVerse, ...(status === 'SETTLED' ? { status: 'COMPLETED' } : {}) },
      });
      // Tient la dette client à jour si la vente est rattachée à un client.
      if (inst.sale.clientId && applique > 0) {
        await tx.client.update({
          where: { id: inst.sale.clientId },
          data: { soldeCredit: { decrement: applique } },
        });
      }
      // Trésorerie : le versement entre en caisse (acompte en espèces par défaut).
      if (applique > 0) {
        await tx.cashMovement.create({
          data: {
            tenantId: ctx.tenantId,
            type: 'IN',
            compte: 'CAISSE',
            montant: applique,
            source: 'REPAYMENT',
            saleId,
            createdBy: ctx.userId,
          },
        });
      }
      return updated;
    });
  }

  /**
   * Annule une vente : ré-entrée du stock + reversal de la trésorerie et de la
   * dette client (capacité sale:cancel). Inverse exactement `finalize`.
   */
  async cancelSale(ctx: AuthContext, saleId: string) {
    const sale = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const target = await tx.sale.findFirst({
        where: { id: saleId, tenantId: ctx.tenantId },
        include: { items: true },
      });
      if (!target) throw new NotFoundException('Vente introuvable');
      if (target.status === 'CANCELLED') throw new BadRequestException('Vente déjà annulée');

      // Une vente non finalisée (PENDING_APPROVAL) n'a touché ni stock ni trésorerie.
      if (target.status !== 'PENDING_APPROVAL') {
        for (const item of target.items) {
          await tx.stockMovement.create({
            data: {
              tenantId: ctx.tenantId,
              productId: item.productId,
              variantId: item.variantId,
              type: 'IN',
              quantite: item.quantite,
              motif: `Annulation vente ${saleId}`,
              saleId,
            },
          });
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantite } },
          });
        }

        // Reversal trésorerie : on ressort la part encaissée.
        const compte = accountForPayment(target.paymentMethod);
        if (compte && target.montantVerse > 0) {
          await tx.cashMovement.create({
            data: {
              tenantId: ctx.tenantId,
              type: 'OUT',
              compte,
              montant: target.montantVerse,
              source: 'ADJUSTMENT',
              note: `Annulation vente ${saleId}`,
              saleId,
              createdBy: ctx.userId,
            },
          });
        }

        // Reversal dette client : on retire la part impayée (bornée au solde courant).
        const impaye = target.total - target.montantVerse;
        if (target.clientId && impaye > 0) {
          const client = await tx.client.findFirst({
            where: { id: target.clientId, tenantId: ctx.tenantId },
          });
          const dec = client ? Math.min(impaye, client.soldeCredit) : 0;
          if (dec > 0) {
            await tx.client.update({
              where: { id: target.clientId },
              data: { soldeCredit: { decrement: dec } },
            });
          }
        }
      }

      await tx.sale.update({ where: { id: saleId }, data: { status: 'CANCELLED' } });
      return tx.sale.findUnique({
        where: { id: saleId },
        include: { items: { include: { priceOverride: true } }, installment: true },
      });
    });
    return sale ? toSaleDto(sale, ctx.role) : sale;
  }

  /**
   * Retour partiel (ou total) d'articles d'une vente.
   * Recrédite le stock, et génère un avoir (solde client) ou un décaissement (remboursement).
   */
  async returnPartial(
    ctx: AuthContext,
    saleId: string,
    returns: { saleItemId: string; quantiteRetournee: number }[],
    action: 'REFUND_CASH' | 'CREATE_CREDIT'
  ) {
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id: saleId, tenantId: ctx.tenantId },
        include: { items: true },
      });
      if (!sale) throw new NotFoundException('Vente introuvable');
      if (sale.status !== 'COMPLETED') throw new BadRequestException('Seules les ventes finalisées peuvent faire l\'objet d\'un retour partiel');

      let refundAmount = 0;

      for (const ret of returns) {
        if (ret.quantiteRetournee <= 0) continue;
        const item = sale.items.find(i => i.id === ret.saleItemId);
        if (!item) throw new BadRequestException(`Ligne ${ret.saleItemId} introuvable`);
        
        // Vérifier que la quantité retournée (historique + demandée) ne dépasse pas la quantité vendue
        // On force le cast 'any' si prisma client n'est pas encore généré pour quantiteRetournee
        const itemAny = item as any;
        const prevReturned = itemAny.quantiteRetournee || 0;
        if (prevReturned + ret.quantiteRetournee > item.quantite) {
          throw new BadRequestException(`Impossible de retourner ${ret.quantiteRetournee} article(s) pour la ligne ${item.id} (déjà retourné: ${prevReturned}/${item.quantite})`);
        }

        // MAJ de la ligne
        await tx.saleItem.update({
          where: { id: item.id },
          data: { quantiteRetournee: { increment: ret.quantiteRetournee } } as any,
        });

        // Remettre en stock
        await tx.stockMovement.create({
          data: {
            tenantId: ctx.tenantId,
            productId: item.productId,
            variantId: item.variantId,
            type: 'IN',
            quantite: ret.quantiteRetournee,
            motif: `Retour client (Vente ${sale.id.slice(0, 8)})`,
            saleId: sale.id,
          },
        });
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: ret.quantiteRetournee } },
        });

        refundAmount += item.prixReel * ret.quantiteRetournee;
      }

      if (refundAmount > 0) {
        if (action === 'CREATE_CREDIT') {
          if (!sale.clientId) throw new BadRequestException("Impossible de créer un avoir sans client rattaché à la vente");
          await tx.client.update({
            where: { id: sale.clientId },
            data: { soldeCredit: { decrement: refundAmount } }, // Décrémenter la dette = Créer un avoir
          });
        } else if (action === 'REFUND_CASH') {
          const compte = accountForPayment(sale.paymentMethod) || 'CAISSE';
          await tx.cashMovement.create({
            data: {
              tenantId: ctx.tenantId,
              type: 'OUT',
              compte,
              montant: refundAmount,
              source: 'ADJUSTMENT',
              note: `Remboursement suite retour (Vente ${sale.id.slice(0, 8)})`,
              saleId: sale.id,
              createdBy: ctx.userId,
            },
          });
          // Ajuster le montant versé de la vente pour la comptabilité
          await tx.sale.update({
            where: { id: sale.id },
            data: { montantVerse: { decrement: refundAmount } },
          });
        }
      }

      const updatedSale = await tx.sale.findUnique({
        where: { id: saleId },
        include: { items: { include: { priceOverride: true } }, installment: true },
      });
      return toSaleDto(updatedSale as any, ctx.role);
    });
  }

  async list(ctx: AuthContext) {
    const sales = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.sale.findMany({
        where: { tenantId: ctx.tenantId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { items: { include: { priceOverride: true } }, installment: true },
      }),
    );
    return toSaleDtoList(sales, ctx.role);
  }

  async todaySales(ctx: AuthContext) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const sales = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.sale.findMany({
        where: { tenantId: ctx.tenantId, createdAt: { gte: startOfDay } },
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: { items: { include: { priceOverride: true, product: true } }, installment: true, client: true },
      }),
    );
    return toSaleDtoList(sales, ctx.role);
  }

  async get(ctx: AuthContext, id: string) {
    const sale = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.sale.findFirst({
        where: { id, tenantId: ctx.tenantId },
        include: { items: { include: { priceOverride: true } }, installment: true },
      }),
    );
    if (!sale) throw new NotFoundException('Vente introuvable');
    return toSaleDto(sale, ctx.role);
  }

  /** Ventes en attente de validation gérant (écran « à valider »). */
  async pendingSales(ctx: AuthContext) {
    const sales = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.sale.findMany({
        where: { tenantId: ctx.tenantId, status: 'PENDING_APPROVAL' },
        orderBy: { createdAt: 'asc' },
        include: { items: { include: { priceOverride: true, product: true } } },
      }),
    );
    return toSaleDtoList(sales, ctx.role);
  }

  /**
   * Refuse une vente à crédit qui ferait dépasser le plafond du client (§6.2).
   * `plafondCredit = null` → illimité.
   */
  private async assertCreditWithinLimit(
    tx: TenantTx,
    ctx: AuthContext,
    input: CreateSaleInput,
    total: number,
    intendedAcompte: number,
  ): Promise<void> {
    if (!input.clientId) return;
    if (input.paymentMethod !== 'CREDIT' && input.paymentMethod !== 'INSTALLMENT') return;

    const client = await tx.client.findFirst({
      where: { id: input.clientId, tenantId: ctx.tenantId },
    });
    if (!client) throw new NotFoundException('Client introuvable');

    const detteProjetee = input.paymentMethod === 'CREDIT' ? total : total - intendedAcompte;
    if (
      client.plafondCredit !== null &&
      client.soldeCredit + detteProjetee > client.plafondCredit
    ) {
      throw new BadRequestException(
        `Plafond de crédit dépassé : dette ${client.soldeCredit} + ${detteProjetee} > plafond ${client.plafondCredit}`,
      );
    }
  }

  private validateAcompte(input: CreateSaleInput, total: number): number {
    if (input.paymentMethod !== 'INSTALLMENT') return 0;
    const verse = input.montantVerse ?? 0;
    if (verse <= 0) throw new BadRequestException("Le montant de l'acompte doit être positif");
    if (verse > total) throw new BadRequestException("L'acompte dépasse le total");
    return verse;
  }

  private resolvePayment(
    paymentMethod: CreateSaleInput['paymentMethod'],
    total: number,
    intendedAcompte: number,
  ): { montantVerse: number; status: 'COMPLETED' | 'PENDING_PAYMENT' } {
    if (paymentMethod === 'INSTALLMENT') {
      return {
        montantVerse: intendedAcompte,
        status: intendedAcompte >= total ? 'COMPLETED' : 'PENDING_PAYMENT',
      };
    }
    if (paymentMethod === 'CREDIT') {
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
