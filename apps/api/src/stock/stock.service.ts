/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Service métier pour stock
 * @created 2026-06-20
 * @updated 2026-06-20
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
  defaultStockPolicy,
  DOWNGRADE_MAX_PRODUCTS,
  productAffectsStock,
  type AuthContext,
  type AdjustBatchInput,
  type BatchDto,
  type CreateBatchInput,
  type CreateProductInput,
  type CreateStockMovementInput,
  type ProductUnitDto,
  type RecipeDto,
  type SetProductExclusionsInput,
  type SetStockThresholdInput,
  type StockAlertDto,
  type UpdateProductInput,
  type UpsertProductUnitsInput,
  type UpsertRecipeInput,
} from '@wilinwi/types';
import type { TenantTx } from '@wilinwi/db';
import { PrismaService } from '../common/prisma.service';
import { PlanConfigService } from '../common/plan-config.service';
import { AuditAlertService } from '../common/audit-alert.service';
import { assertConcreteEtablissement } from '../common/scope';
import { applyStockDelta, readStockAt } from '../common/product-stock';
import { toProductDto } from './product.mapper';
import type { ImportCatalogueItemInput, ImportCataloguePayloadInput } from './dto/import-catalogue.dto';

@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planConfig: PlanConfigService,
    private readonly auditAlerts: AuditAlertService,
  ) {}

  async list(ctx: AuthContext, globalView = false) {
    // Rétrogradation Starter (impayé J+7) : catalogue bridé aux 50 articles les
    // plus anciens (les autres restent en base, simplement masqués).
    const downgraded = ctx.dunning.downgraded;

    const { products, breakdownByProduct, otherStockMap } = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const prods = await tx.product.findMany({
        where: {
          tenantId: ctx.tenantId,
          actif: true,
          // Opt-Out : un produit exclu de la boutique courante disparaît de ses
          // listes (la vue globale « Tous » n'est pas affectée).
          ...(!globalView && ctx.etablissementId
            ? { exclusions: { none: { etablissementId: ctx.etablissementId } } }
            : {}),
        },
        include: {
          variants: true,
          units: true,
          // Lots de la boutique courante (BATCHED) : snapshot POS + péremption.
          ...(!globalView && ctx.etablissementId
            ? {
                batches: {
                  where: { etablissementId: ctx.etablissementId },
                  orderBy: { expiresAt: 'asc' as const },
                },
              }
            : {}),
        },
        orderBy: downgraded ? { createdAt: 'asc' } : { nom: 'asc' },
        ...(downgraded ? { take: DOWNGRADE_MAX_PRODUCTS } : {}),
      });

      if (globalView) {
        // Vue consolidée (page Stock) : Σ tous mouvements du tenant, toutes boutiques.
        const { byProduct, byVariant, byEtablissement } = await this.globalStockMaps(tx, ctx.tenantId);
        for (const p of prods) {
          p.stock = byProduct.get(p.id) ?? 0;
          for (const v of p.variants) {
            v.stock = byVariant.get(v.id) ?? 0;
          }
        }
        return { products: prods, breakdownByProduct: byEtablissement, otherStockMap: new Map<string, { etablissementNom: string; stock: number }[]>() };
      } else {
        // Vue scopée (POS, autres) : stock de l'établissement courant + consultation inter-boutiques.
        const otherStockMapLocal = new Map<string, { etablissementNom: string; stock: number }[]>();
        if (ctx.etablissementId) {
          const { byProduct, byVariant } = await this.scopedStockMaps(tx, ctx.tenantId, ctx.etablissementId);
          for (const p of prods) {
            p.stock = byProduct.get(p.id) ?? 0;
            for (const v of p.variants) {
              v.stock = byVariant.get(v.id) ?? 0;
            }
          }

          // Récupération de tous les stocks des autres établissements du tenant pour les produits
          const etabs = await tx.etablissement.findMany({
            where: { tenantId: ctx.tenantId, actif: true },
            select: { id: true, nom: true },
          });
          const etabNameMap = new Map(etabs.map((e) => [e.id, e.nom]));

          const allStocks = await tx.productStock.findMany({
            where: { tenantId: ctx.tenantId, variantId: null },
            select: { productId: true, etablissementId: true, quantite: true },
          });

          for (const s of allStocks) {
            if (s.etablissementId === ctx.etablissementId) continue;
            if (s.quantite <= 0) continue;
            const etabNom = etabNameMap.get(s.etablissementId) ?? 'Autre boutique';
            const list = otherStockMapLocal.get(s.productId) || [];
            list.push({ etablissementNom: etabNom, stock: s.quantite });
            otherStockMapLocal.set(s.productId, list);
          }
        }
        return { products: prods, breakdownByProduct: new Map<string, Record<string, number>>(), otherStockMap: otherStockMapLocal };
      }
    });

    const sorted = downgraded
      ? [...products].sort((a, b) => a.nom.localeCompare(b.nom))
      : products;

    return sorted.map((p) =>
      toProductDto(p, ctx.role, breakdownByProduct.get(p.id), otherStockMap?.get(p.id)),
    );
  }

  async getProduct(ctx: AuthContext, id: string) {
    const product = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const p = await this.ensureProduct(tx, ctx.tenantId, id);
      // Stock scopé à l'établissement courant = projection ProductStock (O(1)).
      if (ctx.etablissementId) {
        const rows = await tx.productStock.findMany({
          where: { etablissementId: ctx.etablissementId, productId: p.id },
          select: { variantId: true, quantite: true },
        });
        let stockProduct = 0;
        const stockByVariant: Record<string, number> = {};
        for (const r of rows) {
          if (r.variantId) stockByVariant[r.variantId] = r.quantite;
          else stockProduct = r.quantite;
        }
        p.stock = stockProduct;
        for (const v of p.variants) {
          v.stock = stockByVariant[v.id] ?? 0;
        }
      }
      const units = await tx.productUnit.findMany({
        where: { productId: p.id, tenantId: ctx.tenantId },
        orderBy: { factorToBase: 'asc' },
      });
      // Lots de la boutique courante (BATCHED).
      const batches = ctx.etablissementId
        ? await tx.productBatch.findMany({
            where: { productId: p.id, etablissementId: ctx.etablissementId },
            orderBy: { expiresAt: 'asc' },
          })
        : undefined;
      return { ...p, batches, units };
    });
    return toProductDto(product, ctx.role);
  }

  async create(ctx: AuthContext, input: CreateProductInput) {
    // Rétrogradation Starter (impayé) : ajout de produits suspendu.
    if (ctx.dunning.downgraded) {
      throw new ConflictException(
        'Abonnement impayé : ajout de produits suspendu (catalogue limité à 50 articles). Régularisez pour le réactiver.',
      );
    }
    // Gating images : la galerie produit est réservée aux plans Business+ ;
    // on borne au nombre autorisé (0 = aucune image pour Starter/Pro).
    // BATCHED (Milestone 4) : le stock s'entre EXCLUSIVEMENT via la réception de
    // lots (numéro + péremption obligatoires) — jamais en stock initial direct,
    // sinon l'invariant Σ lots = projection serait rompu dès la création.
    if (
      input.type === 'BATCHED' &&
      (input.stock !== 0 || input.variants.some((v) => v.stock !== 0))
    ) {
      throw new BadRequestException(
        'Produit par lots : créez-le avec un stock à 0 puis réceptionnez des LOTS (numéro + date de péremption).',
      );
    }
    const photos = input.photos.slice(0, await this.planConfig.maxProductPhotos(ctx.plan));
    // SERVICE/MANUFACTURED : pas de stock direct → stock forcé à 0, aucun mouvement
    // initial ni projection ProductStock (TDR §9.1).
    const affectsStock = productAffectsStock(input.type);
    const product = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const created = await tx.product.create({
        data: {
          tenantId: ctx.tenantId,
          nom: input.nom,
          sku: input.sku ?? null,
          categorie: input.categorie ?? null,
          type: input.type,
          stockPolicy: input.stockPolicy ?? defaultStockPolicy(input.type),
          vendablePos: input.vendablePos,
          unitKind: input.unitKind,
          baseUnit: input.baseUnit ?? null,
          photos,
          prixAchat: input.prixAchat,
          prixPlancher: input.prixPlancher,
          prixCatalogue: input.prixCatalogue,
          stock: affectsStock ? input.stock : 0,
          seuilAlerte: input.seuilAlerte,
          variants: {
            create: input.variants.map((v) => ({
              tenantId: ctx.tenantId,
              attributs: v.attributs,
              sku: v.sku ?? null,
              stock: affectsStock ? v.stock : 0,
            })),
          },
        },
        include: { variants: true },
      });

      // Grand livre : le stock initial devient un mouvement IN rattaché à un
      // établissement (courant, sinon primaire) → le stock scopé reste cohérent.
      const etablissementId = ctx.etablissementId ?? (await this.primaryEtablissementId(tx, ctx.tenantId));
      if (etablissementId && affectsStock) {
        if (created.stock !== 0) {
          await tx.stockMovement.create({
            data: {
              tenantId: ctx.tenantId,
              etablissementId,
              productId: created.id,
              variantId: null,
              type: 'IN',
              quantite: created.stock,
              motif: 'Stock initial',
            },
          });
        }
        // Projection : crée la ligne ProductStock (même à 0, pour porter le seuil).
        await applyStockDelta(tx, {
          tenantId: ctx.tenantId,
          etablissementId,
          productId: created.id,
          variantId: null,
          delta: created.stock,
          quantiteMin: created.seuilAlerte,
        });
        for (const v of created.variants) {
          if (v.stock !== 0) {
            await tx.stockMovement.create({
              data: {
                tenantId: ctx.tenantId,
                etablissementId,
                productId: created.id,
                variantId: v.id,
                type: 'IN',
                quantite: v.stock,
                motif: 'Stock initial',
              },
            });
          }
          await applyStockDelta(tx, {
            tenantId: ctx.tenantId,
            etablissementId,
            productId: created.id,
            variantId: v.id,
            delta: v.stock,
          });
        }
      }
      return created;
    });
    return toProductDto(product, ctx.role);
  }

  /** Établissement primaire (le plus ancien) du tenant — pour rattacher le stock initial. */
  private async primaryEtablissementId(tx: TenantTx, tenantId: string): Promise<string | null> {
    const first = await tx.etablissement.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    return first?.id ?? null;
  }

  /**
   * Stock scopé d'un établissement = lecture directe de la projection ProductStock
   * (O(lignes de l'établissement) — plus de scan/agrégation du grand livre).
   */
  private async scopedStockMaps(tx: TenantTx, tenantId: string, etablissementId: string) {
    const rows = await tx.productStock.findMany({
      where: { tenantId, etablissementId },
      select: { productId: true, variantId: true, quantite: true },
    });
    const byProduct = new Map<string, number>();
    const byVariant = new Map<string, number>();
    for (const r of rows) {
      if (r.variantId) byVariant.set(r.variantId, r.quantite);
      else byProduct.set(r.productId, r.quantite);
    }
    return { byProduct, byVariant };
  }

  /**
   * Stock global : Σ tous mouvements du tenant (toutes boutiques confondues).
   * Retourne aussi un breakdown par établissement pour chaque produit.
   * byEtablissement : Map<productId, Record<etablissementId, stockNet>>
   */
  private async globalStockMaps(tx: TenantTx, tenantId: string) {
    const [byProd, byVar, byEtabProd] = await Promise.all([
      // Stock total par produit (sans variante)
      tx.stockMovement.groupBy({
        by: ['productId'],
        where: { tenantId, variantId: null },
        _sum: { quantite: true },
      }),
      // Stock total par variante
      tx.stockMovement.groupBy({
        by: ['variantId'],
        where: { tenantId, NOT: { variantId: null } },
        _sum: { quantite: true },
      }),
      // Breakdown produit × établissement (pour OWNER/MANAGER)
      tx.stockMovement.groupBy({
        by: ['productId', 'etablissementId'],
        where: { tenantId },
        _sum: { quantite: true },
      }),
    ]);

    const byProduct = new Map<string, number>(
      byProd.map((r) => [r.productId, r._sum.quantite ?? 0]),
    );
    const byVariant = new Map<string, number>(
      byVar.filter((r) => r.variantId).map((r) => [r.variantId as string, r._sum.quantite ?? 0]),
    );

    // byEtablissement : Map<productId, Record<etablissementId, stockNet>>
    // (les mouvements non rattachés à un établissement — etablissementId null — sont ignorés)
    const byEtablissement = new Map<string, Record<string, number>>();
    for (const row of byEtabProd) {
      if (!row.etablissementId) continue;
      const existing = byEtablissement.get(row.productId) ?? {};
      existing[row.etablissementId] = (existing[row.etablissementId] ?? 0) + (row._sum.quantite ?? 0);
      byEtablissement.set(row.productId, existing);
    }

    return { byProduct, byVariant, byEtablissement };
  }

  async update(ctx: AuthContext, id: string, input: UpdateProductInput) {
    // Le stock ne se modifie JAMAIS par PATCH produit (exclu du schéma) : uniquement
    // via un mouvement (ADJUST/IN/OUT) qui tient grand livre + projection à jour.
    const { variants, ...scalars } = input;
    // Gating images : on borne la galerie au nombre autorisé par le plan.
    if (scalars.photos !== undefined) {
      scalars.photos = scalars.photos.slice(0, await this.planConfig.maxProductPhotos(ctx.plan));
    }
    const product = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const existing = await this.ensureProduct(tx, ctx.tenantId, id);

      // Entrer dans le type BATCHED : le stock existant doit être nul (le stock
      // par lots se reconstruit via des réceptions de lots tracées).
      if (scalars.type === 'BATCHED' && existing.type !== 'BATCHED' && existing.stock !== 0) {
        throw new BadRequestException(
          `Impossible de passer « ${existing.nom} » en produit par lots : ramenez d'abord son stock à zéro, puis réceptionnez des lots.`,
        );
      }
      // Quitter le type BATCHED : tous les lots doivent être soldés (Σ = 0).
      if (existing.type === 'BATCHED' && scalars.type !== undefined && scalars.type !== 'BATCHED') {
        const solde = await tx.productBatch.aggregate({
          where: { productId: id, tenantId: ctx.tenantId },
          _sum: { quantite: true },
        });
        if ((solde._sum.quantite ?? 0) !== 0) {
          throw new BadRequestException(
            `Impossible de quitter le type par lots : « ${existing.nom} » a encore des lots non soldés.`,
          );
        }
      }

      // Changement de type produit : quitter un type à stock direct (STANDARD/BATCHED)
      // avec du stock non nul créerait des quantités orphelines dans le grand livre —
      // exiger d'abord la mise à zéro par mouvement (ADJUST/OUT).
      if (
        scalars.type !== undefined &&
        productAffectsStock(existing.type) &&
        !productAffectsStock(scalars.type)
      ) {
        const residual =
          existing.stock !== 0 || existing.variants.some((v) => v.stock !== 0);
        if (residual) {
          throw new BadRequestException(
            `Impossible de passer "${existing.nom}" en type ${scalars.type} : le stock doit d'abord être ramené à zéro (mouvement de sortie ou d'ajustement).`,
          );
        }
      }

      // Invariant des 4 prix vérifié sur les valeurs FINALES (existant ⊕ patch) :
      // une mise à jour partielle ne peut pas casser prixAchat ≤ plancher ≤ catalogue.
      const prixAchat = scalars.prixAchat ?? existing.prixAchat;
      const prixPlancher = scalars.prixPlancher ?? existing.prixPlancher;
      const prixCatalogue = scalars.prixCatalogue ?? existing.prixCatalogue;
      if (!(prixAchat <= prixPlancher && prixPlancher <= prixCatalogue)) {
        throw new BadRequestException(
          `Prix incohérents : il faut prix d'achat (${prixAchat}) ≤ prix plancher (${prixPlancher}) ≤ prix catalogue (${prixCatalogue}).`,
        );
      }

      // Type effectif après patch : pilote le stock des nouvelles variantes.
      const effectiveAffectsStock = productAffectsStock(scalars.type ?? existing.type);

      if (variants) {
        const existingVariants = await tx.productVariant.findMany({ where: { productId: id } });
        const incomingIds = variants.map(v => v.id).filter(Boolean);
        const toDelete = existingVariants.filter(ev => !incomingIds.includes(ev.id)).map(ev => ev.id);

        if (toDelete.length > 0) {
          await tx.productVariant.deleteMany({ where: { id: { in: toDelete } } });
        }

        for (const v of variants) {
          if (v.id) {
            // Le stock d'une variante existante ne bouge pas ici (grand livre only).
            await tx.productVariant.update({
              where: { id: v.id },
              data: {
                attributs: v.attributs,
                sku: v.sku ?? null,
              }
            });
          } else {
            const createdVariant = await tx.productVariant.create({
              data: {
                tenantId: ctx.tenantId,
                productId: id,
                attributs: v.attributs,
                sku: v.sku ?? null,
                // SERVICE/MANUFACTURED : pas de stock direct — une nouvelle variante
                // ne doit pas en réintroduire (miroir de la création produit).
                stock: effectiveAffectsStock ? v.stock : 0,
              }
            });
            // Stock initial de la NOUVELLE variante = mouvement IN + projection,
            // comme à la création du produit (cohérence grand livre).
            const etablissementId =
              ctx.etablissementId ?? (await this.primaryEtablissementId(tx, ctx.tenantId));
            if (etablissementId && effectiveAffectsStock && createdVariant.stock !== 0) {
              await tx.stockMovement.create({
                data: {
                  tenantId: ctx.tenantId,
                  etablissementId,
                  productId: id,
                  variantId: createdVariant.id,
                  type: 'IN',
                  quantite: createdVariant.stock,
                  motif: 'Stock initial (variante)',
                },
              });
              await applyStockDelta(tx, {
                tenantId: ctx.tenantId,
                etablissementId,
                productId: id,
                variantId: createdVariant.id,
                delta: createdVariant.stock,
              });
            }
          }
        }
      }

      return tx.product.update({ 
        where: { id }, 
        data: scalars,
        include: { variants: true }
      });
    });
    return toProductDto(product, ctx.role);
  }

  /**
   * Enregistre un mouvement de stock et ajuste le stock du produit de manière
   * atomique. La quantité est normalisée selon le type (IN +, OUT -, ADJUST signé).
   */
  async addMovement(ctx: AuthContext, input: CreateStockMovementInput) {
    // Le mouvement doit être rattaché à une boutique précise (pas en vue globale).
    assertConcreteEtablissement(ctx);
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const product = await this.ensureProduct(tx, ctx.tenantId, input.productId);
      if (!productAffectsStock(product.type)) {
        throw new BadRequestException(
          `Le produit "${product.nom}" (type ${product.type}) ne gère pas de stock direct : aucun mouvement possible.`,
        );
      }
      if (product.type === 'BATCHED') {
        throw new BadRequestException(
          `« ${product.nom} » est géré PAR LOTS : réceptionnez ou ajustez un lot (traçabilité péremption), pas un mouvement global.`,
        );
      }
      await this.assertNotExcluded(tx, ctx.tenantId, product.id, ctx.etablissementId!, product.nom);
      const delta = this.signedDelta(input.type, input.quantite);

      if (input.variantId) {
        const variant = product.variants.find(v => v.id === input.variantId);
        if (!variant) throw new NotFoundException('Variante introuvable');
      }

      // Contrôle de négativité sur le stock LOCAL de la boutique du mouvement
      // (le stock global d'une autre boutique ne justifie pas une sortie ici).
      // ALLOW_NEGATIVE : politique explicite du produit → sortie autorisée AVEC alerte.
      const localStock = await readStockAt(
        tx,
        ctx.etablissementId!,
        input.productId,
        input.variantId ?? null,
      );
      if (localStock + delta < 0) {
        if (product.stockPolicy !== 'ALLOW_NEGATIVE') {
          throw new BadRequestException(
            `Opération refusée : le stock de cet établissement deviendrait négatif (disponible ici : ${localStock}, demandé : ${delta}).`,
          );
        }
        await this.auditAlerts.raise(tx, {
          tenantId: ctx.tenantId,
          etablissementId: ctx.etablissementId,
          severity: 'WARNING',
          type: 'stock.negative',
          message: `Stock négatif après mouvement : « ${product.nom} » à ${localStock + delta} (politique ALLOW_NEGATIVE).`,
          payload: {
            productId: input.productId,
            variantId: input.variantId ?? null,
            stockApres: localStock + delta,
            motif: input.motif,
          },
        });
      }

      if (input.variantId) {
        await tx.productVariant.update({
          where: { id: input.variantId },
          data: { stock: { increment: delta } },
        });
      }

      const movement = await tx.stockMovement.create({
        data: {
          tenantId: ctx.tenantId,
          etablissementId: ctx.etablissementId,
          productId: input.productId,
          variantId: input.variantId ?? null,
          type: input.type,
          quantite: delta,
          motif: input.motif,
        },
      });

      await tx.product.update({
        where: { id: input.productId },
        data: { stock: { increment: delta } },
      });

      // Projection ProductStock (solde par emplacement).
      await applyStockDelta(tx, {
        tenantId: ctx.tenantId,
        etablissementId: ctx.etablissementId!,
        productId: input.productId,
        variantId: input.variantId ?? null,
        delta,
      });

      return movement;
    });
  }

  async movements(ctx: AuthContext, productId: string) {
    return this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.stockMovement.findMany({
        where: { tenantId: ctx.tenantId, productId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    );
  }

  // NOTE : transfer() a été SUPPRIMÉ — canal unique = Dispatch (warehouse) :
  // statuts DRAFT/VALIDATED, référence, audit, lecture de la projection
  // ProductStock et contrôle d'accès à l'établissement source.

  /**
   * Valorisation du stock : valeur au prix d'achat (argent immobilisé) et au
   * prix catalogue (potentiel). Réservé aux rôles voyant les prix sensibles.
   */
  async valuation(ctx: AuthContext) {
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      // Seuls les produits à stock direct participent à la valorisation
      // (SERVICE/MANUFACTURED n'immobilisent pas d'argent en stock).
      const products = await tx.product.findMany({
        where: { tenantId: ctx.tenantId, actif: true, type: { in: ['STANDARD', 'BATCHED'] } },
      });

      // Valorisation scopée à l'établissement courant : projection ProductStock
      // (toutes lignes produit + variantes sommées). Vue globale (null) → Product.stock.
      if (ctx.etablissementId) {
        const rows = await tx.productStock.findMany({
          where: { tenantId: ctx.tenantId, etablissementId: ctx.etablissementId },
          select: { productId: true, quantite: true },
        });
        const stockByProduct = new Map<string, number>();
        for (const r of rows) {
          stockByProduct.set(r.productId, (stockByProduct.get(r.productId) ?? 0) + r.quantite);
        }
        for (const p of products) {
          p.stock = stockByProduct.get(p.id) ?? 0;
        }
      }

      let valeurAchat = 0;
      let valeurCatalogue = 0;
      for (const p of products) {
        valeurAchat += p.prixAchat * p.stock;
        valeurCatalogue += p.prixCatalogue * p.stock;
      }
      return { valeurAchat, valeurCatalogue, nbProduits: products.length };
    });
  }

  /**
   * Alertes de stock bas : lignes ProductStock où quantite ≤ quantiteMin (seuil > 0),
   * pour l'établissement courant (ou tous en vue globale).
   */
  async alerts(ctx: AuthContext): Promise<StockAlertDto[]> {
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const rows = await tx.productStock.findMany({
        where: {
          tenantId: ctx.tenantId,
          quantiteMin: { gt: 0 },
          ...(ctx.etablissementId ? { etablissementId: ctx.etablissementId } : {}),
        },
        include: {
          product: { select: { nom: true } },
          etablissement: { select: { nom: true } },
        },
        orderBy: { quantite: 'asc' },
        take: 500,
      });
      return rows
        .filter((r) => r.quantite <= r.quantiteMin)
        .map((r) => ({
          productId: r.productId,
          productNom: r.product.nom,
          variantId: r.variantId,
          etablissementId: r.etablissementId,
          etablissementNom: r.etablissement?.nom ?? null,
          quantite: r.quantite,
          quantiteMin: r.quantiteMin,
        }));
    });
  }

  /** Définit le seuil de réappro (quantiteMin) d'un produit à un emplacement. */
  async setThreshold(ctx: AuthContext, productId: string, input: SetStockThresholdInput) {
    await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      await this.ensureProduct(tx, ctx.tenantId, productId);
      const etab = await tx.etablissement.findFirst({
        where: { id: input.etablissementId, tenantId: ctx.tenantId },
      });
      if (!etab) throw new NotFoundException('Établissement introuvable');
      const variantId = input.variantId ?? null;
      const existing = await tx.productStock.findFirst({
        where: { etablissementId: input.etablissementId, productId, variantId },
        select: { id: true },
      });
      if (existing) {
        await tx.productStock.update({
          where: { id: existing.id },
          data: { quantiteMin: input.quantiteMin },
        });
      } else {
        await tx.productStock.create({
          data: {
            tenantId: ctx.tenantId,
            etablissementId: input.etablissementId,
            productId,
            variantId,
            quantite: 0,
            quantiteMin: input.quantiteMin,
          },
        });
      }
    });
    return { ok: true as const };
  }

  // ────── Visibilité par établissement (Opt-Out — exclusion ciblée) ──────

  /** 404 volontairement non révélateur : un vendeur n'a pas à savoir qu'une exclusion existe. */
  private async assertNotExcluded(
    tx: TenantTx,
    tenantId: string,
    productId: string,
    etablissementId: string,
    nom: string,
  ): Promise<void> {
    const exclusion = await tx.productExclusion.findFirst({
      where: { tenantId, productId, etablissementId },
      select: { id: true },
    });
    if (exclusion) {
      throw new NotFoundException(`Produit « ${nom} » non disponible dans cet établissement.`);
    }
  }

  /** Établissements où le produit est exclu (gestion OWNER/MANAGER). */
  async getExclusions(ctx: AuthContext, productId: string): Promise<string[]> {
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      await this.ensureProduct(tx, ctx.tenantId, productId);
      const rows = await tx.productExclusion.findMany({
        where: { productId, tenantId: ctx.tenantId },
        select: { etablissementId: true },
      });
      return rows.map((r) => r.etablissementId);
    });
  }

  /**
   * Remplace la liste des établissements exclus. Refusé si le produit a encore
   * du stock LOCAL (≠ 0) dans un établissement à exclure — pas de stock fantôme
   * (l'invariant Σ lots = projection couvre aussi les produits par lots).
   */
  async setExclusions(
    ctx: AuthContext,
    productId: string,
    input: SetProductExclusionsInput,
  ): Promise<string[]> {
    await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const product = await this.ensureProduct(tx, ctx.tenantId, productId);
      const ids = [...new Set(input.etablissementIds)];
      if (ids.length > 0) {
        const etabs = await tx.etablissement.findMany({
          where: { id: { in: ids }, tenantId: ctx.tenantId },
          select: { id: true, nom: true },
        });
        if (etabs.length !== ids.length) {
          throw new NotFoundException('Un ou plusieurs établissements sont introuvables.');
        }
        const stocks = await tx.productStock.groupBy({
          by: ['etablissementId'],
          where: { productId, etablissementId: { in: ids } },
          _sum: { quantite: true },
        });
        const nonVide = stocks.find((r) => (r._sum.quantite ?? 0) !== 0);
        if (nonVide) {
          const etab = etabs.find((e) => e.id === nonVide.etablissementId);
          throw new BadRequestException(
            `Impossible d'exclure « ${product.nom} » de « ${etab?.nom ?? nonVide.etablissementId} » : le stock local doit d'abord être ramené à zéro.`,
          );
        }
      }
      // Remplacement intégral (idempotent).
      await tx.productExclusion.deleteMany({ where: { productId, tenantId: ctx.tenantId } });
      for (const etablissementId of ids) {
        await tx.productExclusion.create({
          data: { tenantId: ctx.tenantId, productId, etablissementId },
        });
      }
    });
    return this.getExclusions(ctx, productId);
  }

  // ────────── Multi-conditionnement (Wholesale — Milestone 5, §9.6) ──────────

  /** Conditionnements d'un produit (casier, palette…), facteur croissant. */
  async getUnits(ctx: AuthContext, productId: string): Promise<ProductUnitDto[]> {
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      await this.ensureProduct(tx, ctx.tenantId, productId);
      const rows = await tx.productUnit.findMany({
        where: { productId, tenantId: ctx.tenantId },
        orderBy: { factorToBase: 'asc' },
      });
      return rows.map((u) => ({
        id: u.id,
        label: u.label,
        factorToBase: u.factorToBase,
        salePrice: u.salePrice,
      }));
    });
  }

  /**
   * Remplace intégralement les conditionnements d'un produit STANDARD.
   * Règle F7 : un tarif de conditionnement ne peut pas passer sous
   * prixPlancher × facteur (sinon le casier serait une braderie déguisée).
   */
  async upsertUnits(
    ctx: AuthContext,
    productId: string,
    input: UpsertProductUnitsInput,
  ): Promise<ProductUnitDto[]> {
    await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const product = await this.ensureProduct(tx, ctx.tenantId, productId);
      if (product.type !== 'STANDARD') {
        throw new BadRequestException(
          `Les conditionnements ne s'appliquent qu'aux produits STANDARD — « ${product.nom} » est ${product.type}.`,
        );
      }
      for (const u of input.units) {
        if (u.salePrice != null && u.salePrice < product.prixPlancher * u.factorToBase) {
          throw new BadRequestException(
            `Tarif du conditionnement « ${u.label} » (${u.salePrice}) sous le plancher ramené à la base (${product.prixPlancher * u.factorToBase} = ${product.prixPlancher} × ${u.factorToBase}).`,
          );
        }
      }
      // Remplacement intégral : les lignes de vente passées gardent leur SNAPSHOT
      // (unitLabel/unitFactor) — la suppression d'un conditionnement est sans risque.
      await tx.productUnit.deleteMany({ where: { productId, tenantId: ctx.tenantId } });
      for (const u of input.units) {
        await tx.productUnit.create({
          data: {
            tenantId: ctx.tenantId,
            productId,
            label: u.label.trim(),
            factorToBase: u.factorToBase,
            salePrice: u.salePrice ?? null,
          },
        });
      }
    });
    return this.getUnits(ctx, productId);
  }

  // ─────────────── Lots & péremption (Health — Milestone 4, §9.4) ───────────────

  /** Lots d'un produit BATCHED à l'établissement courant (FEFO : péremption asc). */
  async listBatches(ctx: AuthContext, productId: string): Promise<BatchDto[]> {
    assertConcreteEtablissement(ctx);
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      await this.ensureProduct(tx, ctx.tenantId, productId);
      const rows = await tx.productBatch.findMany({
        where: { tenantId: ctx.tenantId, productId, etablissementId: ctx.etablissementId! },
        orderBy: { expiresAt: 'asc' },
      });
      return rows.map(toBatchDto);
    });
  }

  /**
   * Réception d'un lot (entrée de stock des produits BATCHED) : upsert par
   * (établissement, produit, numéro de lot) — re-réceptionner le même lot
   * additionne. Mouvement IN tracé par batchId ; invariant Σ lots = projection.
   */
  async receiveBatch(
    ctx: AuthContext,
    productId: string,
    input: CreateBatchInput,
  ): Promise<BatchDto> {
    assertConcreteEtablissement(ctx);
    const row = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const product = await this.ensureProduct(tx, ctx.tenantId, productId);
      if (product.type !== 'BATCHED') {
        throw new BadRequestException(
          `« ${product.nom} » n'est pas géré par lots — utilisez un mouvement de stock classique.`,
        );
      }
      await this.assertNotExcluded(tx, ctx.tenantId, product.id, ctx.etablissementId!, product.nom);
      const batch = await tx.productBatch.upsert({
        where: {
          etablissementId_productId_batchNumber: {
            etablissementId: ctx.etablissementId!,
            productId,
            batchNumber: input.batchNumber.trim(),
          },
        },
        update: { quantite: { increment: input.quantite }, expiresAt: input.expiresAt },
        create: {
          tenantId: ctx.tenantId,
          etablissementId: ctx.etablissementId!,
          productId,
          batchNumber: input.batchNumber.trim(),
          expiresAt: input.expiresAt,
          quantite: input.quantite,
        },
      });
      await tx.stockMovement.create({
        data: {
          tenantId: ctx.tenantId,
          etablissementId: ctx.etablissementId!,
          productId,
          batchId: batch.id,
          type: 'IN',
          quantite: input.quantite,
          motif: `Réception lot ${batch.batchNumber}`,
        },
      });
      await tx.product.update({
        where: { id: productId },
        data: { stock: { increment: input.quantite } },
      });
      await applyStockDelta(tx, {
        tenantId: ctx.tenantId,
        etablissementId: ctx.etablissementId!,
        productId,
        variantId: null,
        delta: input.quantite,
      });
      return batch;
    });
    return toBatchDto(row);
  }

  /**
   * Correction d'un lot (casse, retrait de périmés, recomptage) : delta signé.
   * Le solde du lot ne peut pas devenir négatif par correction manuelle.
   */
  async adjustBatch(ctx: AuthContext, batchId: string, input: AdjustBatchInput): Promise<BatchDto> {
    const row = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const batch = await tx.productBatch.findFirst({
        where: { id: batchId, tenantId: ctx.tenantId },
      });
      if (!batch) throw new NotFoundException('Lot introuvable');
      if (batch.quantite + input.delta < 0) {
        throw new BadRequestException(
          `Correction refusée : le lot ${batch.batchNumber} passerait à ${batch.quantite + input.delta}.`,
        );
      }
      await tx.stockMovement.create({
        data: {
          tenantId: ctx.tenantId,
          etablissementId: batch.etablissementId,
          productId: batch.productId,
          batchId: batch.id,
          type: 'ADJUST',
          quantite: input.delta,
          motif: input.motif,
        },
      });
      await tx.product.update({
        where: { id: batch.productId },
        data: { stock: { increment: input.delta } },
      });
      await applyStockDelta(tx, {
        tenantId: ctx.tenantId,
        etablissementId: batch.etablissementId,
        productId: batch.productId,
        variantId: null,
        delta: input.delta,
      });
      return tx.productBatch.update({
        where: { id: batch.id },
        data: { quantite: { increment: input.delta } },
      });
    });
    return toBatchDto(row);
  }

  // ─────────────────── Recettes Food (Milestone 3, §9.5) ───────────────────

  /** Recette d'un produit MANUFACTURED (`null` si aucune). */
  async getRecipe(ctx: AuthContext, productId: string): Promise<RecipeDto | null> {
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      await this.ensureProduct(tx, ctx.tenantId, productId);
      const recipe = await tx.productRecipe.findFirst({
        where: { productId, tenantId: ctx.tenantId },
        include: { items: { include: { ingredient: true } } },
      });
      if (!recipe) return null;
      return {
        id: recipe.id,
        productId: recipe.productId,
        active: recipe.active,
        items: recipe.items.map((ri) => ({
          id: ri.id,
          ingredientProductId: ri.ingredientProductId,
          ingredientNom: ri.ingredient.nom,
          ingredientType: ri.ingredient.type,
          ingredientUnitKind: ri.ingredient.unitKind,
          ingredientBaseUnit: ri.ingredient.baseUnit,
          quantite: ri.quantite,
        })),
      };
    });
  }

  /**
   * Remplace intégralement la recette d'un plat (upsert). Réservé aux produits
   * MANUFACTURED ; les ingrédients doivent porter un stock direct (STANDARD).
   */
  async upsertRecipe(
    ctx: AuthContext,
    productId: string,
    input: UpsertRecipeInput,
  ): Promise<RecipeDto> {
    await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const product = await this.ensureProduct(tx, ctx.tenantId, productId);
      if (product.type !== 'MANUFACTURED') {
        throw new BadRequestException(
          `Seul un produit MANUFACTURED (plat, production) porte une recette — « ${product.nom} » est ${product.type}.`,
        );
      }
      const ingredientIds = input.items.map((i) => i.ingredientProductId);
      if (ingredientIds.includes(productId)) {
        throw new BadRequestException('Un plat ne peut pas être son propre ingrédient.');
      }
      const ingredients = await tx.product.findMany({
        where: { id: { in: ingredientIds }, tenantId: ctx.tenantId },
        select: { id: true, nom: true, type: true },
      });
      if (ingredients.length !== ingredientIds.length) {
        throw new NotFoundException('Un ou plusieurs ingrédients sont introuvables.');
      }
      const nonStock = ingredients.filter((i) => !productAffectsStock(i.type));
      if (nonStock.length > 0) {
        throw new BadRequestException(
          `Ingrédients sans stock direct (recettes imbriquées non supportées) : ${nonStock.map((i) => i.nom).join(', ')}.`,
        );
      }

      const recipe = await tx.productRecipe.upsert({
        where: { productId },
        update: { active: input.active },
        create: { tenantId: ctx.tenantId, productId, active: input.active },
      });
      // Remplacement intégral des lignes (simple et idempotent).
      await tx.recipeItem.deleteMany({ where: { recipeId: recipe.id } });
      for (const item of input.items) {
        await tx.recipeItem.create({
          data: {
            tenantId: ctx.tenantId,
            recipeId: recipe.id,
            ingredientProductId: item.ingredientProductId,
            quantite: item.quantite,
          },
        });
      }
    });
    return (await this.getRecipe(ctx, productId))!;
  }

  private signedDelta(type: CreateStockMovementInput['type'], qty: number): number {
    if (type === 'IN') return Math.abs(qty);
    if (type === 'OUT') return -Math.abs(qty);
    return qty; // ADJUST : signe conservé
  }

  async importCatalogue(ctx: AuthContext, dto: ImportCataloguePayloadInput) {
    assertConcreteEtablissement(ctx);
    const etablissementId = ctx.etablissementId!;

    let createdCount = 0;
    let updatedCount = 0;

    await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      for (const item of dto.items) {
        // Recherche du produit existant par (tenantId, sku)
        const existing = await tx.product.findFirst({
          where: { tenantId: ctx.tenantId, sku: item.sku, actif: true },
        });

        if (existing) {
          // UPDATE : uniquement les champs définis
          const updateData: Partial<
            Pick<
              ImportCatalogueItemInput,
              | 'nom'
              | 'categorie'
              | 'prixAchat'
              | 'prixPlancher'
              | 'prixCatalogue'
              | 'seuilAlerte'
            >
          > = {};
          if (item.nom !== undefined) updateData.nom = item.nom;
          if (item.categorie !== undefined) updateData.categorie = item.categorie;
          if (item.prixAchat !== undefined) updateData.prixAchat = item.prixAchat;
          if (item.prixPlancher !== undefined) updateData.prixPlancher = item.prixPlancher;
          if (item.prixCatalogue !== undefined) updateData.prixCatalogue = item.prixCatalogue;
          if (item.seuilAlerte !== undefined) updateData.seuilAlerte = item.seuilAlerte;

          // Valider les invariants de prix finaux si des prix ont été modifiés
          const finalPrixAchat = updateData.prixAchat ?? existing.prixAchat;
          const finalPrixPlancher = updateData.prixPlancher ?? existing.prixPlancher;
          const finalPrixCatalogue = updateData.prixCatalogue ?? existing.prixCatalogue;
          if (finalPrixAchat > finalPrixPlancher || finalPrixPlancher > finalPrixCatalogue) {
            throw new BadRequestException(
              `Invariant prix invalide pour le SKU ${item.sku} : prixAchat (${finalPrixAchat}) <= prixPlancher (${finalPrixPlancher}) <= prixCatalogue (${finalPrixCatalogue})`,
            );
          }

          if (Object.keys(updateData).length > 0) {
            await tx.product.update({
              where: { id: existing.id },
              data: updateData,
            });
          }

          // Mise à jour du stock si stockInitial fourni
          if (item.stockInitial !== undefined && productAffectsStock(existing.type)) {
            const currentStock = await readStockAt(tx, etablissementId, existing.id);
            const delta = item.stockInitial - currentStock;
            if (delta !== 0) {
              await tx.stockMovement.create({
                data: {
                  tenantId: ctx.tenantId,
                  etablissementId,
                  productId: existing.id,
                  variantId: null,
                  type: delta > 0 ? 'IN' : 'ADJUST',
                  quantite: delta,
                  motif: 'Importation catalogue (mise à jour)',
                },
              });
              await applyStockDelta(tx, {
                tenantId: ctx.tenantId,
                etablissementId,
                productId: existing.id,
                variantId: null,
                delta,
                quantiteMin: item.seuilAlerte ?? existing.seuilAlerte,
              });
            }
          }

          updatedCount++;
        } else {
          // CREATE : nouveau produit
          const prixAchat = item.prixAchat ?? 0;
          const prixPlancher = item.prixPlancher ?? prixAchat;
          const prixCatalogue = item.prixCatalogue ?? prixPlancher;

          if (prixAchat > prixPlancher || prixPlancher > prixCatalogue) {
            throw new BadRequestException(
              `Invariant prix invalide pour le nouveau produit SKU ${item.sku} : prixAchat (${prixAchat}) <= prixPlancher (${prixPlancher}) <= prixCatalogue (${prixCatalogue})`,
            );
          }

          const stockInitial = item.stockInitial ?? 0;

          const created = await tx.product.create({
            data: {
              tenantId: ctx.tenantId,
              nom: item.nom,
              sku: item.sku,
              categorie: item.categorie ?? null,
              prixAchat,
              prixPlancher,
              prixCatalogue,
              stock: stockInitial,
              seuilAlerte: item.seuilAlerte ?? 5,
              type: 'STANDARD',
              stockPolicy: 'STRICT',
              unitKind: 'UNIT',
            },
          });

          if (stockInitial !== 0) {
            await tx.stockMovement.create({
              data: {
                tenantId: ctx.tenantId,
                etablissementId,
                productId: created.id,
                variantId: null,
                type: 'IN',
                quantite: stockInitial,
                motif: 'Importation catalogue (initialisation)',
              },
            });
          }

          await applyStockDelta(tx, {
            tenantId: ctx.tenantId,
            etablissementId,
            productId: created.id,
            variantId: null,
            delta: stockInitial,
            quantiteMin: created.seuilAlerte,
          });

          createdCount++;
        }
      }
    });

    return {
      success: true,
      created: createdCount,
      updated: updatedCount,
      total: dto.items.length,
    };
  }

  private async ensureProduct(tx: TenantTx, tenantId: string, id: string) {
    const product = await tx.product.findFirst({ 
      where: { id, tenantId },
      include: { variants: true }
    });
    if (!product) throw new NotFoundException('Produit introuvable');
    return product;
  }
}

function toBatchDto(b: {
  id: string;
  batchNumber: string;
  expiresAt: Date;
  quantite: number;
}): BatchDto {
  return { id: b.id, batchNumber: b.batchNumber, expiresAt: b.expiresAt, quantite: b.quantite };
}
