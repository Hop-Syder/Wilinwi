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
  DOWNGRADE_MAX_PRODUCTS,
  type AuthContext,
  type CreateProductInput,
  type CreateStockMovementInput,
  type CreateStockTransferInput,
  type SetStockThresholdInput,
  type StockAlertDto,
  type UpdateProductInput,
} from '@wilinwi/types';
import type { TenantTx } from '@wilinwi/db';
import { PrismaService } from '../common/prisma.service';
import { PlanConfigService } from '../common/plan-config.service';
import { assertConcreteEtablissement } from '../common/scope';
import { applyStockDelta } from '../common/product-stock';
import { toProductDto } from './product.mapper';
import { matchProducts } from './product-search';

@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planConfig: PlanConfigService,
  ) {}

  async list(ctx: AuthContext, globalView = false) {
    // Rétrogradation Starter (impayé J+7) : catalogue bridé aux 50 articles les
    // plus anciens (les autres restent en base, simplement masqués).
    const downgraded = ctx.dunning.downgraded;

    const { products, breakdownByProduct } = await this.prisma.forTenant(
      ctx.tenantId,
      async (tx) => {
        const prods = await tx.product.findMany({
          where: { tenantId: ctx.tenantId, actif: true },
          include: { variants: true },
          orderBy: downgraded ? { createdAt: 'asc' } : { nom: 'asc' },
          ...(downgraded ? { take: DOWNGRADE_MAX_PRODUCTS } : {}),
        });

        if (globalView) {
          // Vue consolidée (page Stock) : Σ tous mouvements du tenant, toutes boutiques.
          const { byProduct, byVariant, byEtablissement } = await this.globalStockMaps(
            tx,
            ctx.tenantId,
          );
          for (const p of prods) {
            p.stock = byProduct.get(p.id) ?? 0;
            for (const v of p.variants) {
              v.stock = byVariant.get(v.id) ?? 0;
            }
          }
          return { products: prods, breakdownByProduct: byEtablissement };
        } else {
          // Vue scopée (POS, autres) : stock de l'établissement courant uniquement.
          if (ctx.etablissementId) {
            const { byProduct, byVariant } = await this.scopedStockMaps(
              tx,
              ctx.tenantId,
              ctx.etablissementId,
            );
            for (const p of prods) {
              p.stock = byProduct.get(p.id) ?? 0;
              for (const v of p.variants) {
                v.stock = byVariant.get(v.id) ?? 0;
              }
            }
          }
          return { products: prods, breakdownByProduct: new Map<string, Record<string, number>>() };
        }
      },
    );

    const sorted = downgraded ? [...products].sort((a, b) => a.nom.localeCompare(b.nom)) : products;

    return sorted.map((p) => toProductDto(p, ctx.role, breakdownByProduct.get(p.id)));
  }

  /**
   * Recherche floue par nom/référence, limitée aux produits actifs du tenant.
   * Réutilisée par la recherche manuelle serveur et par la résolution du
   * panier vocal Wilinwi AI (AiService) — un seul algorithme, deux usages.
   * Stock scopé à l'établissement courant comme les autres lectures (pas de
   * décrémentation ici : une recherche ne modifie jamais le stock).
   */
  async search(ctx: AuthContext, q: string, limit = 5) {
    const query = q.trim();
    if (!query) return [];

    const matched = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const products = await tx.product.findMany({
        where: { tenantId: ctx.tenantId, actif: true },
        include: { variants: true },
      });
      const results = matchProducts(products, query, limit);
      if (ctx.etablissementId && results.length > 0) {
        const { byProduct, byVariant } = await this.scopedStockMaps(
          tx,
          ctx.tenantId,
          ctx.etablissementId,
        );
        for (const p of results) {
          p.stock = byProduct.get(p.id) ?? 0;
          for (const v of p.variants) {
            v.stock = byVariant.get(v.id) ?? 0;
          }
        }
      }
      return results;
    });

    return matched.map((p) => toProductDto(p, ctx.role));
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
      return p;
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
    // Limite de produits selon le plan — les tenants grand-père ne sont pas soumis.
    if (!ctx.isGrandfathered) {
      const limits = await this.planConfig.getLimits(ctx.plan);
      const count = await this.prisma.forTenant(ctx.tenantId, (tx) =>
        tx.product.count({ where: { tenantId: ctx.tenantId, actif: true } }),
      );
      if (count >= limits.maxProducts) {
        throw new ConflictException(
          `Limite du plan ${ctx.plan} atteinte (${limits.maxProducts} produit(s)). Passez à un plan supérieur.`,
        );
      }
    }
    // Gating images : la galerie produit est réservée aux plans Business+ ;
    // on borne au nombre autorisé (0 = aucune image pour Starter/Pro).
    // Les tenants grand-père ne sont pas soumis au plafond photos non plus.
    const maxPhotos = ctx.isGrandfathered
      ? input.photos.length
      : await this.planConfig.maxProductPhotos(ctx.plan);
    const photos = input.photos.slice(0, maxPhotos);
    const product = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const created = await tx.product.create({
        data: {
          tenantId: ctx.tenantId,
          nom: input.nom,
          sku: input.sku ?? null,
          categorie: input.categorie ?? null,
          photos,
          prixAchat: input.prixAchat,
          prixPlancher: input.prixPlancher,
          prixCatalogue: input.prixCatalogue,
          stock: input.stock,
          seuilAlerte: input.seuilAlerte,
          variants: {
            create: input.variants.map((v) => ({
              tenantId: ctx.tenantId,
              attributs: v.attributs,
              sku: v.sku ?? null,
              stock: v.stock,
            })),
          },
        },
        include: { variants: true },
      });

      // Grand livre : le stock initial devient un mouvement IN rattaché à un
      // établissement (courant, sinon primaire) → le stock scopé reste cohérent.
      const etablissementId =
        ctx.etablissementId ?? (await this.primaryEtablissementId(tx, ctx.tenantId));
      if (etablissementId) {
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
      existing[row.etablissementId] =
        (existing[row.etablissementId] ?? 0) + (row._sum.quantite ?? 0);
      byEtablissement.set(row.productId, existing);
    }

    return { byProduct, byVariant, byEtablissement };
  }

  async update(ctx: AuthContext, id: string, input: UpdateProductInput) {
    // Le stock ne se modifie JAMAIS par PATCH produit (exclu du schéma) : uniquement
    // via un mouvement (ADJUST/IN/OUT) qui tient grand livre + projection à jour.
    const { variants, ...scalars } = input;
    // Gating images : on borne la galerie au nombre autorisé par le plan.
    // Les tenants grand-père ne sont pas soumis au plafond photos.
    if (scalars.photos !== undefined) {
      const maxPhotos = ctx.isGrandfathered
        ? scalars.photos.length
        : await this.planConfig.maxProductPhotos(ctx.plan);
      scalars.photos = scalars.photos.slice(0, maxPhotos);
    }
    const product = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const existing = await this.ensureProduct(tx, ctx.tenantId, id);

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

      if (variants) {
        const existingVariants = await tx.productVariant.findMany({ where: { productId: id } });
        const incomingIds = variants.map((v) => v.id).filter(Boolean);
        const toDelete = existingVariants
          .filter((ev) => !incomingIds.includes(ev.id))
          .map((ev) => ev.id);

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
              },
            });
          } else {
            const createdVariant = await tx.productVariant.create({
              data: {
                tenantId: ctx.tenantId,
                productId: id,
                attributs: v.attributs,
                sku: v.sku ?? null,
                stock: v.stock,
              },
            });
            // Stock initial de la NOUVELLE variante = mouvement IN + projection,
            // comme à la création du produit (cohérence grand livre).
            const etablissementId =
              ctx.etablissementId ?? (await this.primaryEtablissementId(tx, ctx.tenantId));
            if (etablissementId && createdVariant.stock !== 0) {
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
        include: { variants: true },
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
      const delta = this.signedDelta(input.type, input.quantite);

      const newParentStock = product.stock + delta;

      if (input.variantId) {
        const variant = product.variants.find((v) => v.id === input.variantId);
        if (!variant) throw new NotFoundException('Variante introuvable');
        if (variant.stock + delta < 0) {
          throw new BadRequestException(
            'Opération refusée : Le stock de la variante ne peut pas être négatif.',
          );
        }
        await tx.productVariant.update({
          where: { id: input.variantId },
          data: { stock: { increment: delta } },
        });
      } else {
        if (newParentStock < 0) {
          throw new BadRequestException(
            'Opération refusée : Le stock global ne peut pas être négatif.',
          );
        }
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

  async transfer(ctx: AuthContext, input: CreateStockTransferInput) {
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const source = await tx.etablissement.findFirst({
        where: { id: input.sourceEtablissementId, tenantId: ctx.tenantId },
      });
      if (!source) {
        throw new NotFoundException(
          "L'établissement source n'existe pas ou ne vous appartient pas.",
        );
      }

      const destination = await tx.etablissement.findFirst({
        where: { id: input.destinationEtablissementId, tenantId: ctx.tenantId },
      });
      if (!destination) {
        throw new NotFoundException(
          "L'établissement de destination n'existe pas ou ne vous appartient pas.",
        );
      }

      if (source.id === destination.id) {
        throw new BadRequestException(
          'Les établissements source et de destination doivent être différents.',
        );
      }

      // Vérifier le stock disponible dans la source
      const movementsSource = await tx.stockMovement.findMany({
        where: {
          tenantId: ctx.tenantId,
          etablissementId: source.id,
          productId: input.productId,
          variantId: input.variantId ?? null,
        },
        select: { quantite: true },
      });

      // Grand livre unifié : le stock disponible dans la source = Σ de ses mouvements
      // (le stock initial y est inclus, étant lui-même un mouvement).
      const finalSourceStock = movementsSource.reduce((acc, m) => acc + m.quantite, 0);

      if (finalSourceStock < input.quantite) {
        throw new BadRequestException(
          `Stock insuffisant dans l'établissement source (${source.nom}). Disponible : ${finalSourceStock}, Demandé : ${input.quantite}`,
        );
      }

      await tx.stockMovement.create({
        data: {
          tenantId: ctx.tenantId,
          etablissementId: source.id,
          productId: input.productId,
          variantId: input.variantId ?? null,
          type: 'OUT',
          quantite: -input.quantite,
          motif: `Transfert vers ${destination.nom}`,
        },
      });
      await applyStockDelta(tx, {
        tenantId: ctx.tenantId,
        etablissementId: source.id,
        productId: input.productId,
        variantId: input.variantId ?? null,
        delta: -input.quantite,
      });

      const destMovement = await tx.stockMovement.create({
        data: {
          tenantId: ctx.tenantId,
          etablissementId: destination.id,
          productId: input.productId,
          variantId: input.variantId ?? null,
          type: 'IN',
          quantite: input.quantite,
          motif: `Transfert depuis ${source.nom}`,
        },
      });
      await applyStockDelta(tx, {
        tenantId: ctx.tenantId,
        etablissementId: destination.id,
        productId: input.productId,
        variantId: input.variantId ?? null,
        delta: input.quantite,
      });

      return destMovement;
    });
  }

  /**
   * Valorisation du stock : valeur au prix d'achat (argent immobilisé) et au
   * prix catalogue (potentiel). Réservé aux rôles voyant les prix sensibles.
   */
  async valuation(ctx: AuthContext) {
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const products = await tx.product.findMany({
        where: { tenantId: ctx.tenantId, actif: true },
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

  private signedDelta(type: CreateStockMovementInput['type'], qty: number): number {
    if (type === 'IN') return Math.abs(qty);
    if (type === 'OUT') return -Math.abs(qty);
    return qty; // ADJUST : signe conservé
  }

  private async ensureProduct(tx: TenantTx, tenantId: string, id: string) {
    const product = await tx.product.findFirst({
      where: { id, tenantId },
      include: { variants: true },
    });
    if (!product) throw new NotFoundException('Produit introuvable');
    return product;
  }
}
