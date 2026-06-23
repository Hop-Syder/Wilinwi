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

  /**
   * Rapport historique sur une période (Wilinwi Analytics, §5.1) : KPIs agrégés,
   * série journalière (tendance), top produits et répartition par mode de paiement.
   * La marge n'est calculée que pour les rôles autorisés (§9).
   */
  async report(ctx: AuthContext, fromStr?: string, toStr?: string) {
    const seeSensitive = canSeeSensitivePricing(ctx.role);

    // Bornes de la période — défaut : 30 derniers jours.
    const to = toStr ? new Date(toStr) : new Date();
    if (toStr && toStr.length <= 10) to.setHours(23, 59, 59, 999);
    let from: Date;
    if (fromStr) {
      from = new Date(fromStr);
      if (fromStr.length <= 10) from.setHours(0, 0, 0, 0);
    } else {
      from = new Date(to);
      from.setDate(from.getDate() - 29);
      from.setHours(0, 0, 0, 0);
    }

    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const sales = await tx.sale.findMany({
        where: {
          tenantId: ctx.tenantId,
          createdAt: { gte: from, lte: to },
          status: { not: 'CANCELLED' },
        },
        include: { items: { include: { product: { select: { nom: true } } } } },
        orderBy: { createdAt: 'asc' },
      });

      const chiffreAffaires = sales.reduce((s, v) => s + v.total, 0);
      const nombreVentes = sales.length;
      const articlesVendus = sales.reduce(
        (s, v) => s + v.items.reduce((q, it) => q + it.quantite, 0),
        0,
      );
      const panierMoyen = nombreVentes ? Math.round(chiffreAffaires / nombreVentes) : 0;
      const benefice = sales.reduce(
        (s, v) => s + v.items.reduce((m, it) => m + (it.prixReel - it.coutUnitaire) * it.quantite, 0),
        0,
      );

      // Série journalière (tendance) — clés date locale AAAA-MM-JJ.
      const byDay = new Map<string, { ca: number; ventes: number }>();
      for (const s of sales) {
        const day = s.createdAt.toISOString().slice(0, 10);
        const cur = byDay.get(day) ?? { ca: 0, ventes: 0 };
        cur.ca += s.total;
        cur.ventes += 1;
        byDay.set(day, cur);
      }
      const serie = [...byDay.entries()].map(([date, v]) => ({ date, ca: v.ca, ventes: v.ventes }));

      // Top produits (par quantité vendue).
      const byProduct = new Map<string, { nom: string; quantite: number; ca: number }>();
      for (const s of sales) {
        for (const it of s.items) {
          const cur = byProduct.get(it.productId) ?? {
            nom: it.product?.nom ?? 'Article',
            quantite: 0,
            ca: 0,
          };
          cur.quantite += it.quantite;
          cur.ca += it.prixReel * it.quantite;
          byProduct.set(it.productId, cur);
        }
      }
      const topProduits = [...byProduct.values()]
        .sort((a, b) => b.quantite - a.quantite)
        .slice(0, 10);

      // Répartition par mode de paiement.
      const byPayment = new Map<string, { montant: number; ventes: number }>();
      for (const s of sales) {
        const cur = byPayment.get(s.paymentMethod) ?? { montant: 0, ventes: 0 };
        cur.montant += s.total;
        cur.ventes += 1;
        byPayment.set(s.paymentMethod, cur);
      }
      const parPaiement = [...byPayment.entries()].map(([methode, v]) => ({
        methode,
        montant: v.montant,
        ventes: v.ventes,
      }));

      return {
        from: from.toISOString(),
        to: to.toISOString(),
        chiffreAffaires,
        nombreVentes,
        articlesVendus,
        panierMoyen,
        ...(seeSensitive ? { benefice } : {}),
        serie,
        topProduits,
        parPaiement,
      };
    });
  }
}
