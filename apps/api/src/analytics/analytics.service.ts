/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Service métier pour analytics
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Injectable } from '@nestjs/common';
import { canSeeSensitivePricing, type AuthContext } from '@wilinwi/types';
import { PrismaService } from '../common/prisma.service';

const LOW_STOCK_THRESHOLD = 5;
const DORMANT_DAYS = 30;

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Tableau de bord (Wilinwi Analytics — base, §5.1). */
  async dashboard(ctx: AuthContext) {
    const seeSensitive = canSeeSensitivePricing(ctx.role);

    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      // Ventes du jour
      const salesToday = await tx.sale.findMany({
        where: {
          tenantId: ctx.tenantId,
          createdAt: { gte: startOfDay },
          status: { not: 'CANCELLED' },
        },
        include: { items: true },
      });

      const ventesDuJour = salesToday.reduce((sum, s) => sum + s.total, 0);
      const articlesVendus = salesToday.reduce(
        (sum, s) => sum + s.items.reduce((q, it) => q + it.quantite, 0),
        0,
      );

      // Bénéfice du jour (marge réelle) — donnée sensible
      const beneficeDuJour = salesToday.reduce(
        (sum, s) =>
          sum + s.items.reduce((m, it) => m + (it.prixReel - it.coutUnitaire) * it.quantite, 0),
        0,
      );

      // Valorisation du stock
      const products = await tx.product.findMany({
        where: { tenantId: ctx.tenantId, actif: true },
      });
      const valeurStockCatalogue = products.reduce((s, p) => s + p.prixCatalogue * p.stock, 0);
      const valeurStockAchat = products.reduce((s, p) => s + p.prixAchat * p.stock, 0);

      // Alertes stock : ruptures proches
      const ruptures = products
        .filter((p) => p.stock <= LOW_STOCK_THRESHOLD)
        .map((p) => ({ id: p.id, nom: p.nom, stock: p.stock }));

      // Produits dormants : aucun mouvement OUT depuis DORMANT_DAYS jours
      const dormantSince = new Date();
      dormantSince.setDate(dormantSince.getDate() - DORMANT_DAYS);
      const recentlySold = await tx.stockMovement.findMany({
        where: { tenantId: ctx.tenantId, type: 'OUT', createdAt: { gte: dormantSince } },
        select: { productId: true },
        distinct: ['productId'],
      });
      const soldIds = new Set(recentlySold.map((m) => m.productId));
      const dormants = products
        .filter((p) => p.stock > 0 && !soldIds.has(p.id))
        .map((p) => ({ id: p.id, nom: p.nom, stock: p.stock }));

      return {
        ventesDuJour,
        articlesVendus,
        valeurStockCatalogue,
        // Champs sensibles uniquement pour OWNER/MANAGER (§9)
        ...(seeSensitive ? { beneficeDuJour, valeurStockAchat } : {}),
        alertes: { ruptures, dormants },
      };
    });
  }
}
