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
  maxProductPhotos,
  type AuthContext,
  type CreateProductInput,
  type CreateStockMovementInput,
  type CreateStockTransferInput,
  type UpdateProductInput,
} from '@wilinwi/types';
import type { TenantTx } from '@wilinwi/db';
import { PrismaService } from '../common/prisma.service';
import { toProductDto } from './product.mapper';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async list(ctx: AuthContext) {
    // Rétrogradation Starter (impayé J+7) : catalogue bridé aux 50 articles les
    // plus anciens (les autres restent en base, simplement masqués).
    const downgraded = ctx.dunning.downgraded;
    const products = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const prods = await tx.product.findMany({
        where: { tenantId: ctx.tenantId, actif: true },
        include: { variants: true },
        orderBy: downgraded ? { createdAt: 'asc' } : { nom: 'asc' },
        ...(downgraded ? { take: DOWNGRADE_MAX_PRODUCTS } : {}),
      });

      // Si un établissement spécifique est sélectionné, on calcule le stock scopé
      if (ctx.etablissementId) {
        // Étape 1 : Récupérer tous les produits ayant au moins un mouvement dans le tenant
        const allMovements = await tx.stockMovement.findMany({
          where: { tenantId: ctx.tenantId },
          select: { productId: true },
        });
        const productsWithAnyMovements = new Set(allMovements.map((m) => m.productId));

        // Étape 2 : Récupérer les mouvements de stock de cet établissement
        const activeMovements = await tx.stockMovement.findMany({
          where: { tenantId: ctx.tenantId, etablissementId: ctx.etablissementId },
          select: { productId: true, variantId: true, quantite: true },
        });

        const stockByProduct: Record<string, number> = {};
        const stockByVariant: Record<string, number> = {};
        for (const m of activeMovements) {
          if (m.variantId) {
            stockByVariant[m.variantId] = (stockByVariant[m.variantId] ?? 0) + m.quantite;
          } else {
            stockByProduct[m.productId] = (stockByProduct[m.productId] ?? 0) + m.quantite;
          }
        }

        // Étape 3 : Assigner le stock scopé ou le fallback global
        for (const p of prods) {
          if (productsWithAnyMovements.has(p.id)) {
            p.stock = stockByProduct[p.id] ?? 0;
            if (p.variants) {
              for (const v of p.variants) {
                v.stock = stockByVariant[v.id] ?? 0;
              }
            }
          }
        }
      }
      return prods;
    });

    const sorted = downgraded
      ? [...products].sort((a, b) => a.nom.localeCompare(b.nom))
      : products;
    return sorted.map((p) => toProductDto(p, ctx.role));
  }

  async getProduct(ctx: AuthContext, id: string) {
    const product = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const p = await this.ensureProduct(tx, ctx.tenantId, id);
      if (ctx.etablissementId) {
        const hasAnyMovements = await tx.stockMovement.count({
          where: { tenantId: ctx.tenantId, productId: p.id },
        }) > 0;
        if (hasAnyMovements) {
          const movements = await tx.stockMovement.findMany({
            where: { tenantId: ctx.tenantId, etablissementId: ctx.etablissementId, productId: p.id },
            select: { variantId: true, quantite: true },
          });
          let stockProduct = 0;
          const stockByVariant: Record<string, number> = {};
          for (const m of movements) {
            if (m.variantId) {
              stockByVariant[m.variantId] = (stockByVariant[m.variantId] ?? 0) + m.quantite;
            } else {
              stockProduct += m.quantite;
            }
          }
          p.stock = stockProduct;
          if (p.variants) {
            for (const v of p.variants) {
              v.stock = stockByVariant[v.id] ?? 0;
            }
          }
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
    // Gating images : la galerie produit est réservée aux plans Business+ ;
    // on borne au nombre autorisé (0 = aucune image pour Starter/Pro).
    const photos = input.photos.slice(0, maxProductPhotos(ctx.plan));
    const product = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.product.create({
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
        include: { variants: true }
      }),
    );
    return toProductDto(product, ctx.role);
  }

  async update(ctx: AuthContext, id: string, input: UpdateProductInput) {
    const { variants, ...scalars } = input;
    // Gating images : on borne la galerie au nombre autorisé par le plan.
    if (scalars.photos !== undefined) {
      scalars.photos = scalars.photos.slice(0, maxProductPhotos(ctx.plan));
    }
    const product = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      await this.ensureProduct(tx, ctx.tenantId, id);

      if (variants) {
        const existingVariants = await tx.productVariant.findMany({ where: { productId: id } });
        const incomingIds = variants.map(v => v.id).filter(Boolean);
        const toDelete = existingVariants.filter(ev => !incomingIds.includes(ev.id)).map(ev => ev.id);

        if (toDelete.length > 0) {
          await tx.productVariant.deleteMany({ where: { id: { in: toDelete } } });
        }

        for (const v of variants) {
          if (v.id) {
            await tx.productVariant.update({
              where: { id: v.id },
              data: {
                attributs: v.attributs,
                sku: v.sku ?? null,
                stock: v.stock,
              }
            });
          } else {
            await tx.productVariant.create({
              data: {
                tenantId: ctx.tenantId,
                productId: id,
                attributs: v.attributs,
                sku: v.sku ?? null,
                stock: v.stock,
              }
            });
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
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const product = await this.ensureProduct(tx, ctx.tenantId, input.productId);
      const delta = this.signedDelta(input.type, input.quantite);

      let newParentStock = product.stock + delta;

      if (input.variantId) {
        const variant = product.variants.find(v => v.id === input.variantId);
        if (!variant) throw new NotFoundException('Variante introuvable');
        if (variant.stock + delta < 0) {
          throw new BadRequestException('Opération refusée : Le stock de la variante ne peut pas être négatif.');
        }
        await tx.productVariant.update({
          where: { id: input.variantId },
          data: { stock: { increment: delta } },
        });
      } else {
        if (newParentStock < 0) {
          throw new BadRequestException('Opération refusée : Le stock global ne peut pas être négatif.');
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
        throw new NotFoundException("L'établissement source n'existe pas ou ne vous appartient pas.");
      }

      const destination = await tx.etablissement.findFirst({
        where: { id: input.destinationEtablissementId, tenantId: ctx.tenantId },
      });
      if (!destination) {
        throw new NotFoundException("L'établissement de destination n'existe pas ou ne vous appartient pas.");
      }

      if (source.id === destination.id) {
        throw new BadRequestException("Les établissements source et de destination doivent être différents.");
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

      const currentSourceStock = movementsSource.reduce((acc, m) => acc + m.quantite, 0);

      let finalSourceStock = currentSourceStock;
      const allMovementsCount = await tx.stockMovement.count({
        where: { tenantId: ctx.tenantId, productId: input.productId },
      });

      if (allMovementsCount === 0) {
        const p = await tx.product.findFirst({
          where: { id: input.productId, tenantId: ctx.tenantId },
          include: { variants: true },
        });
        if (p) {
          if (input.variantId) {
            const v = p.variants.find((varItem) => varItem.id === input.variantId);
            finalSourceStock = v ? v.stock : 0;
          } else {
            finalSourceStock = p.stock;
          }
        }
      } else {
        const p = await tx.product.findFirst({
          where: { id: input.productId, tenantId: ctx.tenantId },
          include: { variants: true },
        });
        const activeEtabs = await tx.etablissement.findMany({
          where: { tenantId: ctx.tenantId },
          orderBy: { createdAt: 'asc' },
        });
        const isPrimary = activeEtabs[0]?.id === source.id;

        if (p && isPrimary) {
          const allMovements = await tx.stockMovement.findMany({
            where: { tenantId: ctx.tenantId, productId: input.productId, variantId: input.variantId ?? null },
            select: { quantite: true },
          });
          const sumAll = allMovements.reduce((acc, m) => acc + m.quantite, 0);
          
          let globalDbStock = 0;
          if (input.variantId) {
            const v = p.variants.find((varItem) => varItem.id === input.variantId);
            globalDbStock = v ? v.stock : 0;
          } else {
            globalDbStock = p.stock;
          }

          const untrackedInitialStock = Math.max(0, globalDbStock - sumAll);
          finalSourceStock += untrackedInitialStock;
        }
      }

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

      if (ctx.etablissementId) {
        const allMovements = await tx.stockMovement.findMany({
          where: { tenantId: ctx.tenantId },
          select: { productId: true },
        });
        const productsWithAnyMovements = new Set(allMovements.map((m) => m.productId));

        const activeMovements = await tx.stockMovement.findMany({
          where: { tenantId: ctx.tenantId, etablissementId: ctx.etablissementId },
          select: { productId: true, quantite: true },
        });
        const stockByProduct: Record<string, number> = {};
        for (const m of activeMovements) {
          stockByProduct[m.productId] = (stockByProduct[m.productId] ?? 0) + m.quantite;
        }

        for (const p of products) {
          if (productsWithAnyMovements.has(p.id)) {
            p.stock = stockByProduct[p.id] ?? 0;
          }
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

  private signedDelta(type: CreateStockMovementInput['type'], qty: number): number {
    if (type === 'IN') return Math.abs(qty);
    if (type === 'OUT') return -Math.abs(qty);
    return qty; // ADJUST : signe conservé
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
