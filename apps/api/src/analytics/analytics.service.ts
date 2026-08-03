/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Service métier pour analytics (KPIs, comparaison temporelle, marge brute, trésorerie et alertes)
 * @created 2026-06-20
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Injectable } from '@nestjs/common';
import {
  addDays,
  calendarDateInTz,
  canSeeSensitivePricing,
  endOfCalendarDayInTz,
  startOfCalendarDayInTz,
  startOfDayInTz,
  type AuthContext,
} from '@wilinwi/types';
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
      // Journée = minuit LOCAL de l'établissement (pas celui du serveur).
      const startOfDay = startOfDayInTz(ctx.timezone);

      // Établissement courant (Phase 1 : KPIs de ventes scopés à l'établissement).
      const etabFilter = ctx.etablissementId ? { etablissementId: ctx.etablissementId } : {};

      // Ventes du jour
      const salesToday = await tx.sale.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...etabFilter,
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

      // Valorisation du stock — seuls les produits à stock direct comptent :
      // SERVICE/MANUFACTURED n'immobilisent rien et fausseraient ruptures/dormants.
      const products = await tx.product.findMany({
        where: { tenantId: ctx.tenantId, actif: true, type: { in: ['STANDARD', 'BATCHED'] } },
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

      const valeurStockCatalogue = products.reduce((s, p) => s + p.prixCatalogue * p.stock, 0);
      const valeurStockAchat = products.reduce((s, p) => s + p.prixAchat * p.stock, 0);

      // Alertes stock : ruptures proches
      const ruptures = products
        .filter((p) => p.stock <= LOW_STOCK_THRESHOLD)
        .map((p) => ({ id: p.id, nom: p.nom, stock: p.stock }));

      // Produits dormants : aucun mouvement OUT depuis DORMANT_DAYS jours dans cet établissement
      const dormantSince = new Date();
      dormantSince.setDate(dormantSince.getDate() - DORMANT_DAYS);
      const recentlySold = await tx.stockMovement.findMany({
        where: {
          tenantId: ctx.tenantId,
          type: 'OUT',
          createdAt: { gte: dormantSince },
          ...(ctx.etablissementId ? { etablissementId: ctx.etablissementId } : {}),
        },
        select: { productId: true },
        distinct: ['productId'],
      });
      const soldIds = new Set(recentlySold.map((m) => m.productId));
      const dormants = products
        .filter((p) => p.stock > 0 && !soldIds.has(p.id))
        .map((p) => ({ id: p.id, nom: p.nom, stock: p.stock }));

      // Ventes des 7 derniers jours (pour le graphique hebdomadaire)
      const sevenDaysAgo = addDays(startOfDay, -6);

      const salesLast7Days = await tx.sale.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...etabFilter,
          createdAt: { gte: sevenDaysAgo },
          status: { not: 'CANCELLED' },
        },
        select: {
          total: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      // Grouper par jour de la semaine
      const daysOfWeek = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      const salesByDayMap = new Map<string, number>();
      
      // Initialiser les 7 derniers jours à 0
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayName = daysOfWeek[d.getDay()]!;
        salesByDayMap.set(dayName, 0);
      }

      // Remplir avec les données de la base de données
      salesLast7Days.forEach((sale) => {
        const dayName = daysOfWeek[new Date(sale.createdAt).getDay()]!;
        if (salesByDayMap.has(dayName)) {
          salesByDayMap.set(dayName, (salesByDayMap.get(dayName) || 0) + sale.total);
        }
      });

      const ventesDerniers7Jours = Array.from(salesByDayMap.entries()).map(([jour, total]) => ({
        jour,
        total,
      }));

      return {
        ventesDuJour,
        articlesVendus,
        valeurStockCatalogue,
        ventesDerniers7Jours,
        // Champs sensibles uniquement pour OWNER/MANAGER (§9)
        ...(seeSensitive ? { beneficeDuJour, valeurStockAchat } : {}),
        alertes: { ruptures, dormants },
      };
    });
  }

  /**
   * Rapport historique sur une période (Wilinwi Analytics, §5.1) : KPIs agrégés,
   * comparaison relative avec période précédente, série journalière (tendance),
   * top produits avec contribution %, répartition par mode de paiement et trésorerie.
   */
  async report(ctx: AuthContext, fromStr?: string, toStr?: string, compare = true) {
    const seeSensitive = canSeeSensitivePricing(ctx.role);

    // Bornes de la période — défaut : 30 derniers jours.
    const to =
      toStr && toStr.length <= 10
        ? endOfCalendarDayInTz(toStr, ctx.timezone)
        : toStr
          ? new Date(toStr)
          : new Date();
    const from =
      fromStr && fromStr.length <= 10
        ? startOfCalendarDayInTz(fromStr, ctx.timezone)
        : fromStr
          ? new Date(fromStr)
          : addDays(startOfDayInTz(ctx.timezone, to), -29);

    // Durée en jours et période précédente de même durée pour la comparaison
    const durationMs = Math.max(86400000, to.getTime() - from.getTime());
    const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
    const prevTo = new Date(from.getTime() - 1);
    const prevFrom = addDays(from, -durationDays);

    const etabFilter = ctx.etablissementId ? { etablissementId: ctx.etablissementId } : {};

    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      // 1. Ventes période courante
      const sales = await tx.sale.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...etabFilter,
          createdAt: { gte: from, lte: to },
          status: { not: 'CANCELLED' },
        },
        include: { items: { include: { product: { select: { id: true, nom: true, categorie: true } } } } },
        orderBy: { createdAt: 'asc' },
      });

      // 2. Ventes période précédente (pour la comparaison relative)
      const salesPrev = compare
        ? await tx.sale.findMany({
            where: {
              tenantId: ctx.tenantId,
              ...etabFilter,
              createdAt: { gte: prevFrom, lte: prevTo },
              status: { not: 'CANCELLED' },
            },
            include: { items: true },
          })
        : [];

      const chiffreAffaires = sales.reduce((s, v) => s + v.total, 0);
      const chiffreAffairesPrev = salesPrev.reduce((s, v) => s + v.total, 0);

      const nombreVentes = sales.length;
      const nombreVentesPrev = salesPrev.length;

      const articlesVendus = sales.reduce(
        (s, v) => s + v.items.reduce((q, it) => q + it.quantite, 0),
        0,
      );

      const panierMoyen = nombreVentes ? Math.round(chiffreAffaires / nombreVentes) : 0;
      const panierMoyenPrev = nombreVentesPrev ? Math.round(chiffreAffairesPrev / nombreVentesPrev) : 0;

      const benefice = sales.reduce(
        (s, v) => s + v.items.reduce((m, it) => m + (it.prixReel - it.coutUnitaire) * it.quantite, 0),
        0,
      );
      const beneficePrev = salesPrev.reduce(
        (s, v) => s + v.items.reduce((m, it) => m + (it.prixReel - it.coutUnitaire) * it.quantite, 0),
        0,
      );

      // Calcul des créances / crédits clients en encours
      const clientsWithDebt = await tx.client.aggregate({
        where: { tenantId: ctx.tenantId, soldeCredit: { gt: 0 } },
        _sum: { soldeCredit: true },
      });
      const creditsEncours = clientsWithDebt._sum.soldeCredit ?? 0;

      // Calcul des variations %
      const calcVar = (curr: number, prev: number) => {
        if (!prev) return curr > 0 ? 100 : 0;
        return Math.round(((curr - prev) / prev) * 1000) / 10;
      };

      const variationCaPercent = calcVar(chiffreAffaires, chiffreAffairesPrev);
      const variationBeneficePercent = calcVar(benefice, beneficePrev);
      const variationPanierMoyenPercent = calcVar(panierMoyen, panierMoyenPrev);

      // Dépenses de la période
      const expenses = await tx.cashMovement.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...etabFilter,
          type: 'OUT',
          source: 'EXPENSE',
          createdAt: { gte: from, lte: to },
        },
        select: { montant: true, createdAt: true },
      });
      const totalDepenses = expenses.reduce((s, e) => s + e.montant, 0);

      const expByDay = new Map<string, number>();
      for (const e of expenses) {
        const day = calendarDateInTz(e.createdAt, ctx.timezone);
        expByDay.set(day, (expByDay.get(day) ?? 0) + e.montant);
      }

      // Ventes & marge par jour pour le graphique hybride
      const byDay = new Map<string, { ca: number; benefice: number; ventes: number }>();
      for (const s of sales) {
        const day = calendarDateInTz(s.createdAt, ctx.timezone);
        const cur = byDay.get(day) ?? { ca: 0, benefice: 0, ventes: 0 };
        cur.ca += s.total;
        cur.ventes += 1;
        cur.benefice += s.items.reduce((m, it) => m + (it.prixReel - it.coutUnitaire) * it.quantite, 0);
        byDay.set(day, cur);
      }

      // Série journalière continue
      const serie: { date: string; ca: number; benefice: number; ventes: number; depenses: number }[] = [];
      let cursor = startOfDayInTz(ctx.timezone, from);
      for (let guard = 0; cursor <= to && guard < 370; guard++) {
        const day = calendarDateInTz(cursor, ctx.timezone);
        const v = byDay.get(day);
        serie.push({
          date: day,
          ca: v?.ca ?? 0,
          benefice: seeSensitive ? (v?.benefice ?? 0) : 0,
          ventes: v?.ventes ?? 0,
          depenses: expByDay.get(day) ?? 0,
        });
        cursor = addDays(cursor, 1);
      }

      // Sparklines (série de points normalisés pour les cartes Hero KPI)
      const sparklineCa = serie.map((s) => s.ca);
      const sparklineBenefice = serie.map((s) => s.benefice);
      const sparklinePanierMoyen = serie.map((s) => (s.ventes > 0 ? Math.round(s.ca / s.ventes) : 0));

      // Top 5 Produits avec contribution au CA %
      const byProduct = new Map<
        string,
        { id: string; nom: string; categorie: string; quantite: number; ca: number }
      >();
      for (const s of sales) {
        for (const it of s.items) {
          const prodId = it.productId;
          const cur = byProduct.get(prodId) ?? {
            id: prodId,
            nom: it.product?.nom ?? 'Article',
            categorie: it.product?.categorie ?? 'Général',
            quantite: 0,
            ca: 0,
          };
          cur.quantite += it.quantite;
          cur.ca += it.prixReel * it.quantite;
          byProduct.set(prodId, cur);
        }
      }

      const topProduits = [...byProduct.values()]
        .sort((a, b) => b.ca - a.ca)
        .slice(0, 5)
        .map((p) => ({
          ...p,
          contributionCaPercent:
            chiffreAffaires > 0 ? Math.round((p.ca / chiffreAffaires) * 1000) / 10 : 0,
        }));

      // Répartition par mode de paiement
      const paymentLabels: Record<string, string> = {
        CASH: 'Espèces',
        MOMO_MTN: 'MTN MoMo',
        MOMO_MOOV: 'Moov Money',
        MOMO_WAVE: 'Wave',
        MOMO_ORANGE: 'Orange Money',
        MOMO_CELTIIS: 'Celtiis Cash',
        MOMO_AUTRE: 'Autre Mobile Money',
        BANK_TRANSFER: 'Virement bancaire',
        CREDIT: 'Crédit client',
      };

      const paymentColors: Record<string, string> = {
        CASH: '#00A86B', // vert émeraude
        MOMO_MTN: '#F59E0B',
        MOMO_MOOV: '#2563EB',
        MOMO_WAVE: '#0EA5E9',
        MOMO_ORANGE: '#F97316',
        MOMO_CELTIIS: '#7C3AED',
        MOMO_AUTRE: '#64748B',
        BANK_TRANSFER: '#3B82F6', // bleu virement
        CREDIT: '#EC4899', // rose crédit
      };

      const byPayment = new Map<string, { montant: number; ventes: number }>();
      const addPayment = (methode: string, montant: number) => {
        if (montant <= 0) return;
        const current = byPayment.get(methode) ?? { montant: 0, ventes: 0 };
        current.montant += montant;
        current.ventes += 1;
        byPayment.set(methode, current);
      };
      for (const s of sales) {
        const paid = Math.min(s.montantVerse, s.total);
        const cashPart = s.paymentMethod === 'CASH' || s.paymentMethod === 'INSTALLMENT'
          ? paid
          : Math.min(Math.max(s.montantEspeces, 0), paid);
        const nonCashPart = paid - cashPart;

        addPayment('CASH', cashPart);
        if (s.paymentMethod === 'MOBILE_MONEY') {
          addPayment(`MOMO_${s.momoOperator ?? 'AUTRE'}`, nonCashPart);
        } else if (s.paymentMethod === 'BANK_TRANSFER') {
          addPayment('BANK_TRANSFER', nonCashPart);
        }
        addPayment('CREDIT', s.total - paid);
      }

      const parPaiement = [...byPayment.entries()].map(([methode, v]) => ({
        methode,
        label: paymentLabels[methode] ?? methode,
        color: paymentColors[methode] ?? '#64748B',
        montant: v.montant,
        pourcentage: chiffreAffaires > 0 ? Math.round((v.montant / chiffreAffaires) * 1000) / 10 : 0,
        ventes: v.ventes,
        isCredit: methode === 'CREDIT',
      }));

      // Soldes réels : somme de toutes les écritures, indépendamment de la période affichée.
      const treasuryRows = await tx.cashMovement.groupBy({
        by: ['compte', 'type'],
        where: { tenantId: ctx.tenantId, ...etabFilter },
        _sum: { montant: true },
      });
      const treasuryBalances = { CAISSE: 0, MOBILE_MONEY: 0, BANQUE: 0 };
      for (const row of treasuryRows) {
        treasuryBalances[row.compte] += row.type === 'IN' ? row._sum.montant ?? 0 : -(row._sum.montant ?? 0);
      }
      const soldesTresorerie = {
        fondDeCaisse: treasuryBalances.CAISSE,
        mobileMoney: treasuryBalances.MOBILE_MONEY,
        banque: treasuryBalances.BANQUE,
        total: Object.values(treasuryBalances).reduce((sum, balance) => sum + balance, 0),
      };

      // Alertes Opérationnelles (Ruptures de stock, créances)
      const productsLowStock = await tx.product.findMany({
        where: { tenantId: ctx.tenantId, actif: true, stock: { lte: LOW_STOCK_THRESHOLD } },
        select: { id: true, nom: true, stock: true },
        take: 5,
      });

      const overdueInstallments = await tx.saleInstallment.count({
        where: {
          tenantId: ctx.tenantId,
          status: 'OVERDUE',
        },
      });

      const clientsEnDetteCount = await tx.client.count({
        where: { tenantId: ctx.tenantId, soldeCredit: { gt: 0 } },
      });

      // Échéances à venir sous 7 jours
      const alertes = {
        ruptures: productsLowStock,
        dettesEchuesCount: overdueInstallments,
        clientsEnDetteCount,
      };

      return {
        from: from.toISOString(),
        to: to.toISOString(),
        prevFrom: prevFrom.toISOString(),
        prevTo: prevTo.toISOString(),
        chiffreAffaires,
        chiffreAffairesPrev,
        variationCaPercent,
        sparklineCa,
        nombreVentes,
        articlesVendus,
        panierMoyen,
        panierMoyenPrev,
        variationPanierMoyenPercent,
        sparklinePanierMoyen,
        creditsEncours,
        variationCreditsPercent: 0,
        totalDepenses,
        ...(seeSensitive
          ? {
              benefice,
              beneficePrev,
              variationBeneficePercent,
              sparklineBenefice,
            }
          : {}),
        serie,
        topProduits,
        parPaiement,
        soldesTresorerie,
        alertes,
      };
    });
  }
}
