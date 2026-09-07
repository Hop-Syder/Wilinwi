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
  type AuthContext,
  type CreateSaleInput,
} from '@wilinwi/types';
import { randomBytes } from 'node:crypto';
import { Prisma, type TenantTx } from '@wilinwi/db';
import { PrismaService } from '../common/prisma.service';
import { assertConcreteEtablissement } from '../common/scope';
import { applyStockDelta, readStockAt } from '../common/product-stock';
import { toSaleDto, toSaleDtoList } from './sale.mapper';
import {
  exceedsCreditLimit,
  installmentStatus,
  projectedCreditDebt,
  resolveAcompte,
  resolvePayment,
  splitMixedPayment,
} from './sales-logic';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crée une vente.
   * Toute tentative de vente sous le prix plancher est IMMÉDIATEMENT REFUSÉE (BadRequestException).
   * Les ventes valides sont finalisées directement (stock décrémenté, paiement enregistré).
   * Idempotent via clientGeneratedId pour la synchronisation hors-ligne.
   */
  async create(ctx: AuthContext, input: CreateSaleInput) {
    // Vue globale : impossible de rattacher la vente à une boutique → on refuse.
    assertConcreteEtablissement(ctx);
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

      let total = 0;
      const lines: {
        productId: string;
        variantId: string | null;
        quantite: number;
        prixReel: number;
        coutUnitaire: number;
      }[] = [];

      for (const item of input.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, tenantId: ctx.tenantId },
          include: { variants: true },
        });
        if (!product) throw new NotFoundException(`Produit ${item.productId} introuvable`);

        const variant = item.variantId ? product.variants.find(v => v.id === item.variantId) : null;
        if (item.variantId && !variant) {
          throw new BadRequestException(`Variante introuvable pour le produit "${product.nom}"`);
        }

        // Stock disponible dans LA BOUTIQUE qui vend (projection ProductStock).
        // Pas de repli sur le stock global : sans établissement courant la vente
        // est déjà refusée en amont (assertConcreteEtablissement) — on garde un
        // refus explicite plutôt qu'un fallback silencieux si ce chemin changeait.
        if (!ctx.etablissementId) {
          throw new BadRequestException(
            'Vente impossible sans établissement courant : sélectionnez une boutique.',
          );
        }
        const availableStock = await readStockAt(
          tx,
          ctx.etablissementId,
          product.id,
          item.variantId ?? null,
        );
        if (item.quantite > availableStock) {
          throw new BadRequestException(
            `Stock insuffisant pour le produit "${product.nom}". Demandé : ${item.quantite}, Disponible : ${availableStock}`
          );
        }

        // Anti-fraude absolu : vente sous le prix plancher strictement refusée.
        if (item.prixReel < product.prixPlancher) {
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
        });
      }

      // Résolution / création automatique du client si nécessaire
      let finalClientId = input.clientId ?? null;
      if (!finalClientId && input.clientNom && input.clientTelephone) {
        const existingClient = await tx.client.findFirst({
          where: {
            tenantId: ctx.tenantId,
            telephone: input.clientTelephone,
          },
        });
        if (existingClient) {
          finalClientId = existingClient.id;
        } else {
          const newClient = await tx.client.create({
            data: {
              tenantId: ctx.tenantId,
              nom: input.clientNom,
              telephone: input.clientTelephone,
              soldeCredit: 0,
            },
          });
          finalClientId = newClient.id;
        }
        input.clientId = finalClientId;
      }

      if (input.livreurId) {
        const livreur = await tx.user.findFirst({
          where: { id: input.livreurId, tenantId: ctx.tenantId },
        });
        if (!livreur) throw new NotFoundException('Livreur introuvable');
      }

      // Acompte : validé tôt (échoue vite) pour les deux flux.
      const intendedAcompte = resolveAcompte(input.paymentMethod, input.montantVerse, total);
      // Crédit client : vérifier le plafond avant de créer la vente.
      await this.assertCreditWithinLimit(tx, ctx, input, total, intendedAcompte);
      
      // Création de la vente + lignes. Le prix plancher est un blocage strict en
      // amont : aucune vente n'atteint ce point sous le plancher (pas d'approbation).
      const created = await tx.sale.create({
        data: {
          tenantId: ctx.tenantId,
          etablissementId: ctx.etablissementId,
          vendeurId: ctx.userId,
          clientId: input.clientId ?? null,
          status: 'COMPLETED',
          paymentMethod: input.paymentMethod,
          total,
          // Acompte voulu mémorisé (appliqué à la finalisation).
          montantVerse: input.paymentMethod === 'INSTALLMENT' ? intendedAcompte : 0,
          // Part espèces d'un paiement mixte (ventilée en trésorerie à la finalisation).
          montantEspeces: input.montantEspeces ?? 0,
          clientGeneratedId: input.clientGeneratedId ?? null,
          aLivrer: input.aLivrer ?? false,
          livreurId: input.livreurId ?? null,
          adresseLivraison: input.adresseLivraison ?? null,
        },
      });

      for (const line of lines) {
        await tx.saleItem.create({
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
      }

      // La vente est valide et au-dessus du plancher : finalisation immédiate.
      await this.finalize(tx, ctx, created.id);

      return tx.sale.findUnique({
        where: { id: created.id },
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
      include: { items: { include: { product: true } } },
    });
    // Mouvements rattachés à l'établissement de la vente.
    const etablissementId = sale.etablissementId ?? ctx.etablissementId;

    for (const item of sale.items) {
      await tx.stockMovement.create({
        data: {
          tenantId: ctx.tenantId,
          etablissementId,
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
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantite } },
        });
      }
      // Projection ProductStock : décrément à la boutique vendeuse.
      if (etablissementId) {
        await applyStockDelta(tx, {
          tenantId: ctx.tenantId,
          etablissementId,
          productId: item.productId,
          variantId: item.variantId,
          delta: -item.quantite,
        });
      }
    }

    const { montantVerse, status } = resolvePayment(
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
          status: installmentStatus(sale.total, montantVerse),
        },
        create: {
          tenantId: ctx.tenantId,
          saleId,
          montantTotal: sale.total,
          montantVerse,
          soldeRestant: sale.total - montantVerse,
          status: installmentStatus(sale.total, montantVerse),
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

    // Trésorerie : la part encaissée entre dans le(s) compte(s) correspondant(s) (§6.1).
    // Paiement mixte : `montantEspeces` va en CAISSE, le reste sur le compte du mode.
    const compte = accountForPayment(sale.paymentMethod);
    if (montantVerse > 0) {
      const { espece, reste } = splitMixedPayment(compte, montantVerse, sale.montantEspeces);
      if (espece > 0) {
        await tx.cashMovement.create({
          data: {
            tenantId: ctx.tenantId,
            etablissementId,
            type: 'IN',
            compte: 'CAISSE',
            montant: espece,
            source: 'SALE',
            saleId,
            createdBy: ctx.userId,
          },
        });
      }
      if (compte && reste > 0) {
        await tx.cashMovement.create({
          data: {
            tenantId: ctx.tenantId,
            etablissementId,
            type: 'IN',
            compte,
            montant: reste,
            source: 'SALE',
            saleId,
            createdBy: ctx.userId,
          },
        });
      }
    }

    // Reçu public : QR → page Wilinwi /r/<code>. Données dénormalisées non sensibles.
    const receiptCode = randomBytes(5).toString('hex').toUpperCase(); // 10 caractères
    await tx.sale.update({ where: { id: saleId }, data: { montantVerse, status, receiptCode } });

    const tenant = await tx.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { nom: true },
    });
    await tx.publicReceipt.create({
      data: {
        code: receiptCode,
        tenantId: ctx.tenantId,
        boutiqueNom: tenant?.nom ?? 'Wilinwi',
        total: sale.total,
        montantVerse,
        items: sale.items.map((it) => ({
          nom: it.product?.nom ?? 'Article',
          quantite: it.quantite,
          prixReel: it.prixReel,
        })),
        saleDate: sale.createdAt,
      },
    });
  }

  /** Versement supplémentaire sur un acompte. */
  async addPayment(ctx: AuthContext, saleId: string, montant: number) {
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const inst = await tx.saleInstallment.findFirst({
        where: { saleId, tenantId: ctx.tenantId },
        include: { sale: { select: { clientId: true, etablissementId: true } } },
      });
      if (!inst) throw new NotFoundException('Aucun acompte pour cette vente');
      const applique = Math.min(montant, inst.soldeRestant);
      const montantVerse = inst.montantVerse + applique;
      const soldeRestant = Math.max(inst.montantTotal - montantVerse, 0);
      const status = installmentStatus(inst.montantTotal, montantVerse);

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
            etablissementId: inst.sale.etablissementId ?? ctx.etablissementId,
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
      const etablissementId = target.etablissementId ?? ctx.etablissementId;

      // Une vente non finalisée (PENDING_APPROVAL) n'a touché ni stock ni trésorerie.
      if (target.status !== 'PENDING_APPROVAL') {
        for (const item of target.items) {
          await tx.stockMovement.create({
            data: {
              tenantId: ctx.tenantId,
              etablissementId,
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
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantite } },
            });
          }
          // Projection ProductStock : ré-entrée à la boutique de la vente.
          if (etablissementId) {
            await applyStockDelta(tx, {
              tenantId: ctx.tenantId,
              etablissementId,
              productId: item.productId,
              variantId: item.variantId,
              delta: item.quantite,
            });
          }
        }

        // Reversal trésorerie : on ressort la part encaissée (en ventilant le mixte).
        const compte = accountForPayment(target.paymentMethod);
        if (target.montantVerse > 0) {
          const { espece, reste } = splitMixedPayment(
            compte,
            target.montantVerse,
            target.montantEspeces,
          );
          if (espece > 0) {
            await tx.cashMovement.create({
              data: {
                tenantId: ctx.tenantId,
                etablissementId,
                type: 'OUT',
                compte: 'CAISSE',
                montant: espece,
                source: 'ADJUSTMENT',
                note: `Annulation vente ${saleId}`,
                saleId,
                createdBy: ctx.userId,
              },
            });
          }
          if (compte && reste > 0) {
            await tx.cashMovement.create({
              data: {
                tenantId: ctx.tenantId,
                etablissementId,
                type: 'OUT',
                compte,
                montant: reste,
                source: 'ADJUSTMENT',
                note: `Annulation vente ${saleId}`,
                saleId,
                createdBy: ctx.userId,
              },
            });
          }
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
      const etablissementId = sale.etablissementId ?? ctx.etablissementId;

      let refundAmount = 0;

      for (const ret of returns) {
        if (ret.quantiteRetournee <= 0) continue;
        const item = sale.items.find(i => i.id === ret.saleItemId);
        if (!item) throw new BadRequestException(`Ligne ${ret.saleItemId} introuvable`);
        
        // Vérifier que la quantité retournée (historique + demandée) ne dépasse pas la quantité vendue
        // On force le cast 'any' si prisma client n'est pas encore généré pour quantiteRetournee
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- champ Prisma `quantiteRetournee` pas encore typé dans le client généré
        const itemAny = item as any;
        const prevReturned = itemAny.quantiteRetournee || 0;
        if (prevReturned + ret.quantiteRetournee > item.quantite) {
          throw new BadRequestException(`Impossible de retourner ${ret.quantiteRetournee} article(s) pour la ligne ${item.id} (déjà retourné: ${prevReturned}/${item.quantite})`);
        }

        // MAJ de la ligne
        await tx.saleItem.update({
          where: { id: item.id },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- champ Prisma `quantiteRetournee` pas encore typé
          data: { quantiteRetournee: { increment: ret.quantiteRetournee } } as any,
        });

        // Remettre en stock
        await tx.stockMovement.create({
          data: {
            tenantId: ctx.tenantId,
            etablissementId,
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
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: ret.quantiteRetournee } },
          });
        }
        // Projection ProductStock : ré-entrée à la boutique de la vente.
        if (etablissementId) {
          await applyStockDelta(tx, {
            tenantId: ctx.tenantId,
            etablissementId,
            productId: item.productId,
            variantId: item.variantId,
            delta: ret.quantiteRetournee,
          });
        }

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
              etablissementId,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- `findUnique` peut renvoyer null ; vente validée en amont
      return toSaleDto(updatedSale as any, ctx.role);
    });
  }

  // ─────────────────────────── Livraisons (MVP minimal) ───────────────────────────

  /** DTO léger d'une livraison (statut dérivé de `livreLe`). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DTO léger sans type Prisma strict (includes variables)
  private toDeliveryDto(s: any) {
    return {
      id: s.id,
      total: s.total,
      adresseLivraison: s.adresseLivraison ?? null,
      livreLe: s.livreLe ?? null,
      livreurId: s.livreurId ?? null,
      livreurNom: s.livreur?.nom ?? null,
      clientNom: s.client?.nom ?? null,
      clientTel: s.client?.telephone ?? null,
      createdAt: s.createdAt,
      statut: s.livreLe ? 'LIVRE' : 'A_LIVRER',
    };
  }

  /** Marque une vente « à livrer » + assigne un livreur et une adresse. */
  async assignDelivery(
    ctx: AuthContext,
    saleId: string,
    input: { livreurId?: string | null; adresseLivraison?: string | null },
  ) {
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const sale = await tx.sale.findFirst({ where: { id: saleId, tenantId: ctx.tenantId } });
      if (!sale) throw new NotFoundException('Vente introuvable');
      if (sale.status === 'CANCELLED') throw new BadRequestException('Vente annulée');
      if (input.livreurId) {
        const livreur = await tx.user.findFirst({
          where: { id: input.livreurId, tenantId: ctx.tenantId },
        });
        if (!livreur) throw new NotFoundException('Livreur introuvable');
      }
      await tx.sale.update({
        where: { id: saleId },
        data: {
          aLivrer: true,
          livreurId: input.livreurId ?? null,
          adresseLivraison: input.adresseLivraison ?? null,
          livreLe: null,
        },
      });
      const updated = await tx.sale.findUnique({
        where: { id: saleId },
        include: { livreur: { select: { nom: true } }, client: { select: { nom: true, telephone: true } } },
      });
      return this.toDeliveryDto(updated);
    });
  }

  /** Liste des livraisons : un livreur ne voit que les siennes (non livrées). */
  async listDeliveries(ctx: AuthContext) {
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- clause `where` Prisma construite dynamiquement
      const where: any = { tenantId: ctx.tenantId, aLivrer: true };
      if (ctx.etablissementId) where.etablissementId = ctx.etablissementId;
      if (ctx.role === 'DELIVERY') {
        where.livreurId = ctx.userId;
        where.livreLe = null;
      }
      const sales = await tx.sale.findMany({
        where,
        orderBy: [{ livreLe: 'asc' }, { createdAt: 'desc' }],
        take: 200,
        include: { livreur: { select: { nom: true } }, client: { select: { nom: true, telephone: true } } },
      });
      return sales.map((s) => this.toDeliveryDto(s));
    });
  }

  /** Marque une livraison comme effectuée. Un livreur ne peut livrer que ses assignations. */
  async markDelivered(ctx: AuthContext, saleId: string) {
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const sale = await tx.sale.findFirst({ where: { id: saleId, tenantId: ctx.tenantId } });
      if (!sale) throw new NotFoundException('Vente introuvable');
      if (!sale.aLivrer) throw new BadRequestException("Cette vente n'est pas une livraison");
      if (ctx.role === 'DELIVERY' && sale.livreurId !== ctx.userId) {
        throw new ForbiddenException('Cette livraison ne vous est pas assignée');
      }
      await tx.sale.update({ where: { id: saleId }, data: { livreLe: new Date() } });
      const updated = await tx.sale.findUnique({
        where: { id: saleId },
        include: { livreur: { select: { nom: true } }, client: { select: { nom: true, telephone: true } } },
      });
      return this.toDeliveryDto(updated);
    });
  }

  async list(ctx: AuthContext, filters?: { from?: string; to?: string; status?: string; clientId?: string; q?: string }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- clause `where` Prisma construite dynamiquement
    const where: any = { tenantId: ctx.tenantId };
    // Phase 1 : on ne montre que l'établissement courant.
    if (ctx.etablissementId) where.etablissementId = ctx.etablissementId;

    if (filters) {
      const { from, to, status, clientId, q } = filters;
      
      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(from);
        if (to) {
          const toDate = new Date(to);
          if (to.length <= 10) {
            toDate.setHours(23, 59, 59, 999);
          }
          where.createdAt.lte = toDate;
        }
      }
      
      if (status) {
        where.status = status;
      }
      
      if (clientId) {
        where.clientId = clientId;
      }
      
      if (q) {
        where.OR = [
          { client: { nom: { contains: q, mode: 'insensitive' } } },
          { vendeur: { nom: { contains: q, mode: 'insensitive' } } },
          { items: { some: { product: { nom: { contains: q, mode: 'insensitive' } } } } }
        ];
        
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
        if (isUuid) {
          where.OR.push({ id: q });
        }
      }
    }

    const sales = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.sale.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          items: { include: { priceOverride: true, product: true } },
          installment: true,
          client: true,
          vendeur: { select: { id: true, nom: true, email: true } },
          etablissement: { select: { id: true, nom: true } },
        },
      }),
    );
    return toSaleDtoList(sales, ctx.role);
  }

  async todaySales(ctx: AuthContext) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const sales = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.sale.findMany({
        where: {
          tenantId: ctx.tenantId,
          createdAt: { gte: startOfDay },
          ...(ctx.etablissementId ? { etablissementId: ctx.etablissementId } : {}),
        },
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

    const detteProjetee = projectedCreditDebt(input.paymentMethod, total, intendedAcompte);
    if (exceedsCreditLimit(client.soldeCredit, client.plafondCredit, detteProjetee)) {
      throw new BadRequestException(
        `Plafond de crédit dépassé : dette ${client.soldeCredit} + ${detteProjetee} > plafond ${client.plafondCredit}`,
      );
    }
  }
}
