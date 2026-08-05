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
  saleStockBehavior,
  type AuthContext,
  type CreateSaleInput,
  type InstallmentStatus,
  endOfCalendarDayInTz,
  startOfDayInTz,
} from '@wilinwi/types';
import { randomBytes } from 'node:crypto';
import { Prisma, type TenantTx } from '@wilinwi/db';
import { PrismaService } from '../common/prisma.service';
import { AuditAlertService } from '../common/audit-alert.service';
import { assertConcreteEtablissement } from '../common/scope';
import { applyStockDelta, readStockAt } from '../common/product-stock';
import { toSaleDto, toSaleDtoList } from './sale.mapper';

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AuditAlertService,
  ) {}

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
            include: { items: true, installment: true },
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
          include: { items: true, installment: true },
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
        unitId: string | null;
        unitLabel: string | null;
        unitFactor: number;
      }[] = [];

      for (const item of input.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, tenantId: ctx.tenantId },
          include: { variants: true, units: true },
        });
        if (!product) throw new NotFoundException(`Produit ${item.productId} introuvable`);

        // Opt-Out : produit exclu de la boutique → 404 volontairement non
        // révélateur (couvre aussi la sync offline, même chemin).
        const exclusion = await tx.productExclusion.findFirst({
          where: {
            tenantId: ctx.tenantId,
            productId: product.id,
            etablissementId: ctx.etablissementId ?? undefined,
          },
          select: { id: true },
        });
        if (exclusion) {
          throw new NotFoundException(`Produit « ${product.nom} » non disponible dans cet établissement.`);
        }
        // Matière première / ingrédient : géré en stock mais JAMAIS vendu au POS.
        if (product.vendablePos === false) {
          throw new BadRequestException(
            `« ${product.nom} » n'est pas vendable à la caisse (matière première / ingrédient).`,
          );
        }

        const variant = item.variantId ? product.variants.find(v => v.id === item.variantId) : null;
        if (item.variantId && !variant) {
          throw new BadRequestException(`Variante introuvable pour le produit "${product.nom}"`);
        }

        // Conditionnement (Wholesale M5) : quantite = nombre de CONDITIONNEMENTS ;
        // le stock bouge de quantite × facteur (unités de base). Snapshot figé sur
        // la ligne (label + facteur) pour une réversibilité exacte.
        const unit = item.unitId ? product.units.find((u) => u.id === item.unitId) : null;
        if (item.unitId && !unit) {
          throw new BadRequestException(`Conditionnement introuvable pour le produit "${product.nom}"`);
        }
        if (unit && product.type !== 'STANDARD') {
          throw new BadRequestException(
            `Les conditionnements ne s'appliquent qu'aux produits STANDARD — "${product.nom}" est ${product.type}.`,
          );
        }
        if (unit && item.variantId) {
          throw new BadRequestException('Conditionnement et variante ne se combinent pas.');
        }
        const facteur = unit?.factorToBase ?? 1;

        // Stock disponible dans LA BOUTIQUE qui vend (projection ProductStock).
        // Pas de repli sur le stock global : sans établissement courant la vente
        // est déjà refusée en amont (assertConcreteEtablissement) — on garde un
        // refus explicite plutôt qu'un fallback silencieux si ce chemin changeait.
        if (!ctx.etablissementId) {
          throw new BadRequestException(
            'Vente impossible sans établissement courant : sélectionnez une boutique.',
          );
        }
        // Stratégie type × politique de stock (TDR §9.1/§9.2) : SERVICE et
        // MANUFACTURED n'ont pas de stock direct ; ALLOW_NEGATIVE/NO_STOCK ne
        // bloquent pas (le stock négatif reste visible et alerté par les seuils).
        // BATCHED (Option B §18.2) : jamais bloqué serveur-side — le POS local
        // refuse déjà périmés/insuffisants ; un conflit devient une alerte CRITICAL.
        if (product.type !== 'BATCHED' && saleStockBehavior(product.type, product.stockPolicy).precheck) {
          const availableStock = await readStockAt(
            tx,
            ctx.etablissementId,
            product.id,
            item.variantId ?? null,
          );
          if (item.quantite * facteur > availableStock) {
            throw new BadRequestException(
              `Stock insuffisant pour le produit "${product.nom}". Demandé : ${item.quantite * facteur}, Disponible : ${availableStock}`
            );
          }
        }

        // Anti-fraude absolu : vente sous le prix plancher strictement refusée.
        // Conditionnement : le plancher se contrôle × facteur (un casier de 24 ne
        // peut pas passer sous 24 × plancher — revue F7).
        if (item.prixReel < product.prixPlancher * facteur) {
          throw new BadRequestException(
            `Opération refusée : le prix de vente de "${product.nom}"${unit ? ` (${unit.label})` : ''} (${item.prixReel}) est inférieur au prix plancher (${product.prixPlancher * facteur}).`,
          );
        }

        total += item.prixReel * item.quantite;
        lines.push({
          productId: product.id,
          variantId: item.variantId ?? null,
          quantite: item.quantite,
          prixReel: item.prixReel,
          coutUnitaire: product.prixAchat * facteur,
          unitId: unit?.id ?? null,
          unitLabel: unit?.label ?? null,
          unitFactor: facteur,
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

      // Table FOOD (Milestone 3) : doit appartenir à la boutique qui vend.
      if (input.tableId) {
        const table = await tx.foodTable.findFirst({
          where: {
            id: input.tableId,
            tenantId: ctx.tenantId,
            // Non-null : assertConcreteEtablissement l'a garanti en amont.
            etablissementId: ctx.etablissementId!,
            actif: true,
          },
        });
        if (!table) throw new NotFoundException('Table introuvable pour cet établissement');
      }

      // Acompte : validé tôt (échoue vite) pour les deux flux.
      const intendedAcompte = this.validateAcompte(input, total);
      // Crédit client : vérifier le plafond avant de créer la vente.
      await this.assertCreditWithinLimit(tx, ctx, input, total, intendedAcompte);
      
      // Rattachement de la vente à la session POS active du caissier/établissement.
      let session = null;
      if (input.posSessionId) {
        session = await tx.posSession.findFirst({
          where: { id: input.posSessionId, tenantId: ctx.tenantId },
        });
      }
      if (!session && ctx.etablissementId) {
        session = await tx.posSession.findFirst({
          where: {
            tenantId: ctx.tenantId,
            etablissementId: ctx.etablissementId,
            openedById: ctx.userId,
            status: 'OPEN',
          },
        });
        if (!session) {
          session = await tx.posSession.create({
            data: {
              tenantId: ctx.tenantId,
              etablissementId: ctx.etablissementId,
              openedById: ctx.userId,
              status: 'OPEN',
              fondInitial: 0,
              soldeTheorique: 0,
            },
          });
        }
      }
      const activePosSessionId = session?.id ?? null;

      // Création de la vente + lignes. Le prix plancher est un blocage strict en
      // amont : aucune vente n'atteint ce point sous le plancher (pas d'approbation).
      const created = await tx.sale.create({
        data: {
          tenantId: ctx.tenantId,
          etablissementId: ctx.etablissementId,
          vendeurId: ctx.userId,
          clientId: input.clientId ?? null,
          posSessionId: activePosSessionId,
          status: 'COMPLETED',
          paymentMethod: input.paymentMethod,
          total,
          // Acompte voulu mémorisé (appliqué à la finalisation).
          montantVerse: input.paymentMethod === 'INSTALLMENT' ? intendedAcompte : 0,
          // Part espèces d'un paiement mixte (ventilée en trésorerie à la finalisation).
          montantEspeces: input.montantEspeces ?? 0,
          momoOperator: input.momoOperator ?? null,
          momoReference: input.momoReference ?? null,
          clientGeneratedId: input.clientGeneratedId ?? null,
          tableId: input.tableId ?? null,
          aLivrer: input.aLivrer ?? false,
          livreurId: input.livreurId ?? null,
          adresseLivraison: input.adresseLivraison ?? null,
        },
      });

      if (activePosSessionId) {
        const isCash = input.paymentMethod === 'CASH';
        const isMoMo = input.paymentMethod === 'MOBILE_MONEY';
        const isBanque = input.paymentMethod === 'BANK_TRANSFER';
        const isCredit = input.paymentMethod === 'CREDIT' || input.paymentMethod === 'INSTALLMENT';

        const especesAdd = isCash ? total : (input.montantEspeces ?? 0);
        const momoAdd = isMoMo ? total : 0;
        const banqueAdd = isBanque ? total : 0;
        const creditAdd = isCredit ? (total - (input.montantVerse ?? 0)) : 0;

        await tx.posSession.update({
          where: { id: activePosSessionId },
          data: {
            nombreVentes: { increment: 1 },
            totalVentes: { increment: total },
            totalEspeces: { increment: especesAdd },
            totalMoMo: { increment: momoAdd },
            totalBanque: { increment: banqueAdd },
            totalCredit: { increment: creditAdd },
            soldeTheorique: { increment: especesAdd },
          },
        });
      }

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
            unitId: line.unitId,
            unitLabel: line.unitLabel,
            unitFactor: line.unitFactor,
          },
        });
      }

      // La vente est valide et au-dessus du plancher : finalisation immédiate.
      await this.finalize(tx, ctx, created.id);

      return tx.sale.findUnique({
        where: { id: created.id },
        include: { items: true, installment: true },
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
      // Pas de stock direct (SERVICE/MANUFACTURED) ou politique NO_STOCK → aucun
      // mouvement ni décrément (paiement, trésorerie et reçu restent identiques).
      const behavior = saleStockBehavior(item.product?.type, item.product?.stockPolicy);
      if (!behavior.decrement) continue;
      // BATCHED : sortie par lots en FEFO (péremption la plus proche d'abord,
      // périmés exclus) — remplace le décrément générique ci-dessous.
      if (item.product?.type === 'BATCHED') {
        if (etablissementId) {
          await this.consumeBatchesFEFO(tx, ctx, {
            saleId,
            etablissementId,
            productId: item.productId,
            productNom: item.product.nom,
            quantite: item.quantite,
          });
        }
        continue;
      }
      // Conditionnement (Wholesale M5) : le stock bouge en UNITÉS DE BASE.
      const baseQty = item.quantite * item.unitFactor;
      await tx.stockMovement.create({
        data: {
          tenantId: ctx.tenantId,
          etablissementId,
          productId: item.productId,
          variantId: item.variantId,
          type: 'OUT',
          quantite: -baseQty,
          motif: `Vente ${saleId}${item.unitLabel ? ` (${item.quantite} × ${item.unitLabel})` : ''}`,
          saleId,
        },
      });
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: baseQty } },
      });
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: baseQty } },
        });
      }
      // Projection ProductStock : décrément à la boutique vendeuse.
      if (etablissementId) {
        await applyStockDelta(tx, {
          tenantId: ctx.tenantId,
          etablissementId,
          productId: item.productId,
          variantId: item.variantId,
          delta: -baseQty,
        });
        // ALLOW_NEGATIVE (§9.2 « autorise le stock négatif AVEC ALERTE ») : la
        // vente est passée sans pré-contrôle — si le solde local devient négatif,
        // on lève l'alerte d'audit pour correction (réappro / inventaire).
        if (!behavior.precheck) {
          const after = await readStockAt(
            tx,
            etablissementId,
            item.productId,
            item.variantId ?? null,
          );
          if (after < 0) {
            await this.alerts.raise(tx, {
              tenantId: ctx.tenantId,
              etablissementId,
              severity: 'WARNING',
              type: 'stock.negative',
              message: `Stock négatif après vente : « ${item.product?.nom ?? item.productId} » à ${after} (politique ALLOW_NEGATIVE).`,
              payload: {
                productId: item.productId,
                variantId: item.variantId,
                saleId,
                stockApres: after,
                quantiteVendue: item.quantite,
              },
            });
          }
        }
      }
    }

    // ── Recettes Food (Milestone 3, §9.5) : un plat MANUFACTURED + RECIPE_BASED
    //    avec recette ACTIVE consomme ses ingrédients (le plat lui-même n'a pas
    //    de stock direct). Ingrédient insuffisant → la vente N'EST PAS bloquée,
    //    une alerte d'audit `ingredient.insufficient` est levée (rail §18.2).
    for (const item of sale.items) {
      const plat = item.product;
      if (!plat || plat.type !== 'MANUFACTURED' || plat.stockPolicy !== 'RECIPE_BASED') continue;
      const recipe = await tx.productRecipe.findFirst({
        where: { productId: item.productId, active: true },
        include: {
          items: {
            include: {
              ingredient: { select: { id: true, nom: true, type: true, stockPolicy: true } },
            },
          },
        },
      });
      if (!recipe) continue; // recette optionnelle (§13-M3)

      for (const ri of recipe.items) {
        // Seuls les ingrédients à stock direct se décrémentent (pas de recettes
        // imbriquées au MVP ; la politique NO_STOCK de l'ingrédient est respectée).
        if (!saleStockBehavior(ri.ingredient.type, ri.ingredient.stockPolicy).decrement) continue;
        const consomme = ri.quantite * item.quantite;
        await tx.stockMovement.create({
          data: {
            tenantId: ctx.tenantId,
            etablissementId,
            productId: ri.ingredientProductId,
            variantId: null,
            type: 'OUT',
            quantite: -consomme,
            motif: `Recette vente ${saleId}`,
            saleId,
          },
        });
        await tx.product.update({
          where: { id: ri.ingredientProductId },
          data: { stock: { decrement: consomme } },
        });
        if (etablissementId) {
          await applyStockDelta(tx, {
            tenantId: ctx.tenantId,
            etablissementId,
            productId: ri.ingredientProductId,
            variantId: null,
            delta: -consomme,
          });
          const after = await readStockAt(tx, etablissementId, ri.ingredientProductId, null);
          if (after < 0) {
            await this.alerts.raise(tx, {
              tenantId: ctx.tenantId,
              etablissementId,
              severity: 'WARNING',
              type: 'ingredient.insufficient',
              message: `Ingrédient insuffisant : « ${ri.ingredient.nom} » à ${after} après la vente du plat « ${plat.nom} ».`,
              payload: {
                platId: item.productId,
                ingredientId: ri.ingredientProductId,
                saleId,
                stockApres: after,
                consomme,
              },
            });
          }
        }
      }
    }

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

    // Trésorerie : la part encaissée entre dans le(s) compte(s) correspondant(s) (§6.1).
    // Paiement mixte : `montantEspeces` va en CAISSE, le reste sur le compte du mode.
    const compte = accountForPayment(sale.paymentMethod);
    if (montantVerse > 0) {
      const espece =
        compte === 'CAISSE' ? 0 : Math.min(Math.max(sale.montantEspeces ?? 0, 0), montantVerse);
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
      const reste = montantVerse - espece;
      if (compte && reste > 0) {
        await tx.cashMovement.create({
          data: {
            tenantId: ctx.tenantId,
            etablissementId,
            type: 'IN',
            compte,
            montant: reste,
            source: 'SALE',
            momoOperator: sale.momoOperator,
            momoReference: sale.momoReference,
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
          nom: it.unitLabel
            ? `${it.product?.nom ?? 'Article'} — ${it.unitLabel}`
            : (it.product?.nom ?? 'Article'),
          quantite: it.quantite,
          prixReel: it.prixReel,
        })),
        saleDate: sale.createdAt,
      },
    });
  }

  // ─────────────── Lots & FEFO (Health — Milestone 4, §9.4/§18.2) ───────────────

  /**
   * Consomme les lots d'un produit BATCHED en FEFO (péremption la plus proche
   * d'abord), périmés EXCLUS. Si le stock vendable ne suffit pas, la vente est
   * quand même validée (Option B : la caisse ne ment pas) : le déficit est imputé
   * au dernier lot pertinent (quantité négative) et une alerte CRITICAL
   * `health.batch_conflict` est levée pour correction manuelle.
   * Invariant F8 maintenu : Σ lots et projection bougent du même montant.
   */
  private async consumeBatchesFEFO(
    tx: TenantTx,
    ctx: AuthContext,
    args: {
      saleId: string;
      etablissementId: string;
      productId: string;
      productNom: string;
      quantite: number;
    },
  ): Promise<void> {
    const now = new Date();
    const batches = await tx.productBatch.findMany({
      where: {
        tenantId: ctx.tenantId,
        etablissementId: args.etablissementId,
        productId: args.productId,
      },
      orderBy: { expiresAt: 'asc' },
    });
    const vendables = batches.filter((b) => b.expiresAt > now && b.quantite > 0);

    let restant = args.quantite;
    for (const b of vendables) {
      if (restant <= 0) break;
      const pris = Math.min(b.quantite, restant);
      await this.takeFromBatch(tx, ctx, args, b.id, pris);
      restant -= pris;
    }

    if (restant > 0) {
      // Déficit (vente offline concurrente, lots périmés entre-temps…) : imputé
      // au lot le plus « sûr » disponible — vendable le plus lointain, sinon le
      // dernier lot connu, sinon un lot CONFLIT créé pour porter la trace.
      const cible =
        vendables.at(-1) ??
        batches.at(-1) ??
        (await tx.productBatch.create({
          data: {
            tenantId: ctx.tenantId,
            etablissementId: args.etablissementId,
            productId: args.productId,
            batchNumber: `CONFLIT-${args.saleId.slice(0, 8)}`,
            expiresAt: now,
            quantite: 0,
          },
        }));
      await this.takeFromBatch(tx, ctx, args, cible.id, restant);
      await this.alerts.raise(tx, {
        tenantId: ctx.tenantId,
        etablissementId: args.etablissementId,
        severity: 'CRITICAL',
        type: 'health.batch_conflict',
        message: `Conflit de lots : « ${args.productNom} » vendu au-delà du stock vendable (déficit ${restant}${vendables.length === 0 ? ', aucun lot non périmé' : ''}). Corrigez les lots manuellement.`,
        payload: {
          productId: args.productId,
          saleId: args.saleId,
          deficit: restant,
          batchId: cible.id,
          aucunLotVendable: vendables.length === 0,
        },
      });
    }
  }

  /** Sortie d'un lot : mouvement tracé par batchId + lot + colonne + projection. */
  private async takeFromBatch(
    tx: TenantTx,
    ctx: AuthContext,
    args: { saleId: string; etablissementId: string; productId: string },
    batchId: string,
    quantite: number,
  ): Promise<void> {
    await tx.stockMovement.create({
      data: {
        tenantId: ctx.tenantId,
        etablissementId: args.etablissementId,
        productId: args.productId,
        batchId,
        type: 'OUT',
        quantite: -quantite,
        motif: `Vente ${args.saleId}`,
        saleId: args.saleId,
      },
    });
    await tx.productBatch.update({
      where: { id: batchId },
      data: { quantite: { decrement: quantite } },
    });
    await tx.product.update({
      where: { id: args.productId },
      data: { stock: { decrement: quantite } },
    });
    await applyStockDelta(tx, {
      tenantId: ctx.tenantId,
      etablissementId: args.etablissementId,
      productId: args.productId,
      variantId: null,
      delta: -quantite,
    });
  }

  /**
   * Net consommé PAR LOT pour une vente = -Σ des mouvements portant un batchId
   * (les OUT de vente sont négatifs, les IN de retours/annulations positifs) →
   * exact quel que soit l'historique (retours partiels compris).
   */
  private async batchNetConsumed(
    tx: TenantTx,
    tenantId: string,
    saleId: string,
    productId?: string,
  ): Promise<Map<string, { net: number; productId: string; etablissementId: string | null }>> {
    const movements = await tx.stockMovement.findMany({
      where: {
        tenantId,
        saleId,
        batchId: { not: null },
        ...(productId ? { productId } : {}),
      },
    });
    const nets = new Map<string, { net: number; productId: string; etablissementId: string | null }>();
    for (const m of movements) {
      const cur = nets.get(m.batchId!) ?? { net: 0, productId: m.productId, etablissementId: m.etablissementId };
      cur.net -= m.quantite; // OUT négatif → net positif consommé
      nets.set(m.batchId!, cur);
    }
    return nets;
  }

  /** Ré-entrée d'un lot (annulation/retour) : miroir exact de takeFromBatch. */
  private async returnToBatch(
    tx: TenantTx,
    ctx: AuthContext,
    args: { saleId: string; etablissementId: string | null; productId: string; motif: string },
    batchId: string,
    quantite: number,
  ): Promise<void> {
    await tx.stockMovement.create({
      data: {
        tenantId: ctx.tenantId,
        etablissementId: args.etablissementId,
        productId: args.productId,
        batchId,
        type: 'IN',
        quantite,
        motif: args.motif,
        saleId: args.saleId,
      },
    });
    await tx.productBatch.update({
      where: { id: batchId },
      data: { quantite: { increment: quantite } },
    });
    await tx.product.update({
      where: { id: args.productId },
      data: { stock: { increment: quantite } },
    });
    if (args.etablissementId) {
      await applyStockDelta(tx, {
        tenantId: ctx.tenantId,
        etablissementId: args.etablissementId,
        productId: args.productId,
        variantId: null,
        delta: quantite,
      });
    }
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
        include: { items: { include: { product: { select: { type: true, stockPolicy: true } } } } },
      });
      if (!target) throw new NotFoundException('Vente introuvable');
      if (target.status === 'CANCELLED') throw new BadRequestException('Vente déjà annulée');
      const etablissementId = target.etablissementId ?? ctx.etablissementId;

      // Toute vente non annulée a été finalisée (stock décrémenté, trésorerie
      // encaissée) : on inverse tout.
      for (const item of target.items) {
        // Symétrique de finalize : on ne ré-entre que ce qui a été décrémenté.
        if (!saleStockBehavior(item.product?.type, item.product?.stockPolicy).decrement) continue;
        // BATCHED : ré-entrée PAR LOTS via les nets exacts (pass dédié plus bas).
        if (item.product?.type === 'BATCHED') continue;
        // Un retour partiel a déjà restocké `quantiteRetournee` : ne ré-entrer
        // que le restant, sinon l'annulation double la ré-entrée de stock.
        const restant = (item.quantite - (item.quantiteRetournee ?? 0)) * item.unitFactor;
        if (restant <= 0) continue;
        await tx.stockMovement.create({
          data: {
            tenantId: ctx.tenantId,
            etablissementId,
            productId: item.productId,
            variantId: item.variantId,
            type: 'IN',
            quantite: restant,
            motif: `Annulation vente ${saleId}`,
            saleId,
          },
        });
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: restant } },
        });
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: restant } },
          });
        }
        // Projection ProductStock : ré-entrée à la boutique de la vente.
        if (etablissementId) {
          await applyStockDelta(tx, {
            tenantId: ctx.tenantId,
            etablissementId,
            productId: item.productId,
            variantId: item.variantId,
            delta: restant,
          });
        }
      }

      // Reversal trésorerie : on ressort la part encaissée (en ventilant le mixte).
      const compte = accountForPayment(target.paymentMethod);
      if (target.montantVerse > 0) {
        const espece =
          compte === 'CAISSE'
            ? 0
            : Math.min(Math.max(target.montantEspeces ?? 0, 0), target.montantVerse);
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
        const reste = target.montantVerse - espece;
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

      // Recettes Food : ré-entrée EXACTE des ingrédients consommés, par relecture
      // des mouvements de CETTE vente (pas de recalcul — la recette a pu changer).
      const recipeMovements = await tx.stockMovement.findMany({
        where: { tenantId: ctx.tenantId, saleId, motif: { startsWith: 'Recette vente' } },
      });
      for (const m of recipeMovements) {
        const qty = -m.quantite; // OUT stocké en négatif
        if (qty <= 0) continue;
        await tx.stockMovement.create({
          data: {
            tenantId: ctx.tenantId,
            etablissementId: m.etablissementId,
            productId: m.productId,
            variantId: m.variantId,
            type: 'IN',
            quantite: qty,
            motif: `Annulation recette ${saleId}`,
            saleId,
          },
        });
        await tx.product.update({
          where: { id: m.productId },
          data: { stock: { increment: qty } },
        });
        if (m.etablissementId) {
          await applyStockDelta(tx, {
            tenantId: ctx.tenantId,
            etablissementId: m.etablissementId,
            productId: m.productId,
            variantId: m.variantId,
            delta: qty,
          });
        }
      }
      // NOTE retour partiel : PAS de ré-entrée d'ingrédients (le plat retourné a
      // été cuisiné — la matière est consommée ; seul l'argent est restitué).

      // Lots (BATCHED) : ré-entrée EXACTE par lot via les NETS de la vente
      // (OUT de vente − IN de retours déjà faits) — correct quel que soit
      // l'historique, y compris après des retours partiels.
      const batchNets = await this.batchNetConsumed(tx, ctx.tenantId, saleId);
      for (const [batchId, info] of batchNets) {
        if (info.net <= 0) continue;
        await this.returnToBatch(
          tx,
          ctx,
          {
            saleId,
            etablissementId: info.etablissementId ?? etablissementId,
            productId: info.productId,
            motif: `Annulation vente ${saleId}`,
          },
          batchId,
          info.net,
        );
      }

      await tx.sale.update({ where: { id: saleId }, data: { status: 'CANCELLED' } });
      // Le reçu public ne vaut plus preuve d'achat : marqué annulé (reste
      // consultable, la page /r/<code> affiche « VENTE ANNULÉE »).
      if (target.receiptCode) {
        await tx.publicReceipt.updateMany({
          where: { code: target.receiptCode },
          data: { cancelledAt: new Date() },
        });
      }
      return tx.sale.findUnique({
        where: { id: saleId },
        include: { items: true, installment: true },
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
        include: { items: { include: { product: { select: { type: true, stockPolicy: true } } } } },
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

        // Remettre en stock — symétrique de finalize : seuls les articles dont le
        // stock a été décrémenté ré-entrent (le retour d'un service/plat reste
        // possible : avoir/remboursement sans ré-entrée).
        if (item.product?.type === 'BATCHED') {
          // Ré-entrée PAR LOTS, bornée aux nets consommés par CETTE vente —
          // lots à péremption lointaine d'abord, invariant Σ lots = projection préservé.
          let restantRetour = ret.quantiteRetournee;
          const nets = await this.batchNetConsumed(tx, ctx.tenantId, sale.id, item.productId);
          const lots = await tx.productBatch.findMany({
            where: { id: { in: [...nets.keys()] } },
            orderBy: { expiresAt: 'desc' },
          });
          for (const lot of lots) {
            if (restantRetour <= 0) break;
            const net = nets.get(lot.id)?.net ?? 0;
            if (net <= 0) continue;
            const back = Math.min(net, restantRetour);
            await this.returnToBatch(
              tx,
              ctx,
              {
                saleId: sale.id,
                etablissementId,
                productId: item.productId,
                motif: `Retour client (Vente ${sale.id.slice(0, 8)})`,
              },
              lot.id,
              back,
            );
            restantRetour -= back;
          }
        } else if (saleStockBehavior(item.product?.type, item.product?.stockPolicy).decrement) {
          // Conditionnement : quantiteRetournee compte des CONDITIONNEMENTS.
          const baseBack = ret.quantiteRetournee * item.unitFactor;
          await tx.stockMovement.create({
            data: {
              tenantId: ctx.tenantId,
              etablissementId,
              productId: item.productId,
              variantId: item.variantId,
              type: 'IN',
              quantite: baseBack,
              motif: `Retour client (Vente ${sale.id.slice(0, 8)})`,
              saleId: sale.id,
            },
          });
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: baseBack } },
          });
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: baseBack } },
            });
          }
          // Projection ProductStock : ré-entrée à la boutique de la vente.
          if (etablissementId) {
            await applyStockDelta(tx, {
              tenantId: ctx.tenantId,
              etablissementId,
              productId: item.productId,
              variantId: item.variantId,
              delta: baseBack,
            });
          }
        }

        refundAmount += item.prixReel * ret.quantiteRetournee;
      }

      // Remboursement espèces borné à ce qui a réellement été encaissé : sur une
      // vente à crédit (montantVerse = 0) on ne décaisse pas d'argent jamais reçu —
      // l'avoir (CREATE_CREDIT) est le chemin correct.
      if (action === 'REFUND_CASH' && refundAmount > sale.montantVerse) {
        throw new BadRequestException(
          `Remboursement espèces impossible : ${refundAmount} demandé mais seulement ${sale.montantVerse} encaissé sur cette vente. Utilisez l'avoir (crédit client).`,
        );
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
        include: { items: true, installment: true },
      });
      return toSaleDto(updatedSale as any, ctx.role);
    });
  }

  // ─────────────────────────── Livraisons (MVP minimal) ───────────────────────────

  /** DTO léger d'une livraison (statut dérivé de `livreLe`). */
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

  async list(ctx: AuthContext, filters?: { from?: string; to?: string; status?: string; clientId?: string; posSessionId?: string; q?: string }) {
    const where: any = { tenantId: ctx.tenantId };
    // Phase 1 : on ne montre que l'établissement courant.
    if (ctx.etablissementId) where.etablissementId = ctx.etablissementId;

    if (filters) {
      const { from, to, status, clientId, posSessionId, q } = filters;
      
      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(from);
        if (to) {
          // Date calendaire = fin de journée LOCALE de la boutique.
          where.createdAt.lte =
            to.length <= 10 ? endOfCalendarDayInTz(to, ctx.timezone) : new Date(to);
        }
      }
      
      if (status) {
        where.status = status;
      }
      
      if (clientId) {
        where.clientId = clientId;
      }

      if (posSessionId) {
        where.posSessionId = posSessionId;
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
          items: { include: { product: true } },
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
    // Journée = minuit LOCAL de l'établissement (pas celui du serveur).
    const startOfDay = startOfDayInTz(ctx.timezone);

    const sales = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.sale.findMany({
        where: {
          tenantId: ctx.tenantId,
          createdAt: { gte: startOfDay },
          ...(ctx.etablissementId ? { etablissementId: ctx.etablissementId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: { items: { include: { product: true } }, installment: true, client: true },
      }),
    );
    return toSaleDtoList(sales, ctx.role);
  }

  async get(ctx: AuthContext, id: string) {
    const sale = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.sale.findFirst({
        where: { id, tenantId: ctx.tenantId },
        include: { items: true, installment: true },
      }),
    );
    if (!sale) throw new NotFoundException('Vente introuvable');
    return toSaleDto(sale, ctx.role);
  }

  // ───────────────────────── POS Sessions (Clôtures & Rapport Z) ─────────────────────────

  async getActivePosSession(ctx: AuthContext) {
    if (!ctx.etablissementId) {
      throw new BadRequestException('Aucun établissement sélectionné');
    }
    const session = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.posSession.findFirst({
        where: {
          tenantId: ctx.tenantId,
          etablissementId: ctx.etablissementId!,
          openedById: ctx.userId,
          status: 'OPEN',
        },
        include: {
          openedBy: { select: { id: true, nom: true, email: true } },
        },
      }),
    );
    return session;
  }

  async openPosSession(ctx: AuthContext, fondInitial: number = 0, note?: string) {
    if (!ctx.etablissementId) {
      throw new BadRequestException('Aucun établissement sélectionné');
    }
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const active = await tx.posSession.findFirst({
        where: {
          tenantId: ctx.tenantId,
          etablissementId: ctx.etablissementId!,
          openedById: ctx.userId,
          status: 'OPEN',
        },
      });
      if (active) {
        return active;
      }
      return tx.posSession.create({
        data: {
          tenantId: ctx.tenantId,
          etablissementId: ctx.etablissementId!,
          openedById: ctx.userId,
          status: 'OPEN',
          fondInitial,
          soldeTheorique: fondInitial,
          note,
        },
        include: {
          openedBy: { select: { id: true, nom: true, email: true } },
        },
      });
    });
  }

  async closePosSession(ctx: AuthContext, soldeReel: number, note?: string) {
    if (!ctx.etablissementId) {
      throw new BadRequestException('Aucun établissement sélectionné');
    }
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const active = await tx.posSession.findFirst({
        where: {
          tenantId: ctx.tenantId,
          etablissementId: ctx.etablissementId!,
          status: 'OPEN',
        },
      });

      if (!active) {
        throw new NotFoundException('Aucune session POS ouverte à clôturer');
      }

      // Re-calcul direct des totaux depuis toutes les ventes réellement rattachées en base.
      const sales = await tx.sale.findMany({
        where: {
          tenantId: ctx.tenantId,
          posSessionId: active.id,
          status: 'COMPLETED',
        },
        select: {
          total: true,
          paymentMethod: true,
          montantVerse: true,
          montantEspeces: true,
        },
      });

      let totalVentes = 0;
      let totalEspeces = 0;
      let totalMoMo = 0;
      let totalBanque = 0;
      let totalCredit = 0;

      for (const s of sales) {
        totalVentes += s.total;
        if (s.paymentMethod === 'CASH') {
          totalEspeces += s.total;
        } else if (s.paymentMethod === 'MOBILE_MONEY') {
          totalMoMo += s.total;
        } else if (s.paymentMethod === 'BANK_TRANSFER') {
          totalBanque += s.total;
        } else if (s.paymentMethod === 'CREDIT' || s.paymentMethod === 'INSTALLMENT') {
          totalCredit += (s.total - s.montantVerse);
          totalEspeces += s.montantEspeces;
        }
      }

      const soldeTheorique = active.fondInitial + totalEspeces;
      const ecart = soldeReel - soldeTheorique;

      const closed = await tx.posSession.update({
        where: { id: active.id },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          closedById: ctx.userId,
          totalVentes,
          totalEspeces,
          totalMoMo,
          totalBanque,
          totalCredit,
          nombreVentes: sales.length,
          soldeTheorique,
          soldeReel,
          ecart,
          note: note ?? active.note,
        },
        include: {
          openedBy: { select: { id: true, nom: true, email: true } },
          closedBy: { select: { id: true, nom: true, email: true } },
        },
      });

      // Traçabilité Trésorerie : créer une entrée CashClose correspondante pour l'historique général
      await tx.cashClose.create({
        data: {
          tenantId: ctx.tenantId,
          etablissementId: ctx.etablissementId,
          compte: 'CAISSE',
          soldeTheorique,
          soldeReel,
          ecart,
          note: note ? `Clôture Session POS ${active.id} - ${note}` : `Clôture Session POS ${active.id}`,
          closedBy: ctx.userId,
        },
      });

      // Notification automatique pour la gestion si un déficit de caisse est déclaré
      if (ecart < 0) {
        await tx.notification.create({
          data: {
            tenantId: ctx.tenantId,
            etablissementId: ctx.etablissementId,
            type: 'INFO',
            titre: `Écart de caisse — Session #${active.id.slice(0, 8).toUpperCase()}`,
            message: `Déficit de ${Math.abs(ecart)} FCFA à la clôture par ${closed.closedBy?.nom ?? 'un caissier'}${note ? ` (${note})` : ''}.`,
            entityId: active.id,
          },
        });
      }

      return closed;
    });
  }

  async listPosSessions(ctx: AuthContext, options?: { from?: string; to?: string; status?: string }) {
    const where: any = { tenantId: ctx.tenantId };
    if (ctx.etablissementId) where.etablissementId = ctx.etablissementId;

    if (options?.status) {
      where.status = options.status;
    }
    if (options?.from || options?.to) {
      where.openedAt = {};
      if (options.from) where.openedAt.gte = new Date(options.from);
      if (options.to) {
        where.openedAt.lte = options.to.length <= 10 ? endOfCalendarDayInTz(options.to, ctx.timezone) : new Date(options.to);
      }
    }

    return this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.posSession.findMany({
        where,
        orderBy: { openedAt: 'desc' },
        take: 100,
        include: {
          openedBy: { select: { id: true, nom: true, email: true } },
          closedBy: { select: { id: true, nom: true, email: true } },
        },
      }),
    );
  }

  async getPosSession(ctx: AuthContext, id: string) {
    const session = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.posSession.findFirst({
        where: { id, tenantId: ctx.tenantId },
        include: {
          openedBy: { select: { id: true, nom: true, email: true } },
          closedBy: { select: { id: true, nom: true, email: true } },
          sales: {
            take: 200,
            include: {
              items: { include: { product: true } },
              client: true,
              vendeur: { select: { id: true, nom: true } },
            },
          },
        },
      }),
    );
    if (!session) throw new NotFoundException('Session POS introuvable');
    return session;
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
