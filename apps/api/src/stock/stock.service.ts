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
    const products = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.product.findMany({
        where: { tenantId: ctx.tenantId, actif: true },
        include: { variants: true },
        orderBy: downgraded ? { createdAt: 'asc' } : { nom: 'asc' },
        ...(downgraded ? { take: DOWNGRADE_MAX_PRODUCTS } : {}),
      }),
    );
    const sorted = downgraded
      ? [...products].sort((a, b) => a.nom.localeCompare(b.nom))
      : products;
    return sorted.map((p) => toProductDto(p, ctx.role));
  }

  async getProduct(ctx: AuthContext, id: string) {
    const product = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      return this.ensureProduct(tx, ctx.tenantId, id);
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

  /**
   * Valorisation du stock : valeur au prix d'achat (argent immobilisé) et au
   * prix catalogue (potentiel). Réservé aux rôles voyant les prix sensibles.
   */
  async valuation(ctx: AuthContext) {
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const products = await tx.product.findMany({
        where: { tenantId: ctx.tenantId, actif: true },
      });
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
