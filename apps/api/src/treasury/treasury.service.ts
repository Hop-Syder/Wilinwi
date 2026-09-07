/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Service Trésorerie — soldes, virements (avec vérif solde), clôtures (motif obligatoire sur écart), stats journalières, filtres avancés.
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Injectable, ForbiddenException } from '@nestjs/common';
import {
  CASH_ACCOUNT_LABELS,
  hasCapability,
  type AuthContext,
  type CashAccount,
  type CashCloseInput,
  type RecordCashMovementInput,
  type RecordExpenseInput,
  type TransferInput,
} from '@wilinwi/types';
import type { TenantTx } from '@wilinwi/db';
import { PrismaService } from '../common/prisma.service';
import { assertConcreteEtablissement } from '../common/scope';
import {
  assertSufficientBalance,
  closingAdjustment,
  requireClosingNote,
  sumBalances,
} from './treasury-logic';

export type Balances = Record<CashAccount, number>;

export interface TreasuryStats {
  balances: Balances;
  totalBalance: number;
  today: { entrees: number; sorties: number; net: number };
}

export interface MovementWithBalance {
  id: string;
  type: 'IN' | 'OUT';
  compte: CashAccount;
  montant: number;
  source: string;
  categorie: string | null;
  note: string | null;
  createdAt: Date;
  createdBy: string;
  /** Solde cumulé du compte APRÈS ce mouvement (chronologique). */
  soldeApres: number;
}

export interface MovementFilters {
  compte?: CashAccount;
  source?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class TreasuryService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Soldes ───────────────────────────────────────────────────────────────

  private async computeBalances(
    tx: TenantTx,
    tenantId: string,
    etablissementId?: string | null,
  ): Promise<Balances> {
    const rows = await tx.cashMovement.groupBy({
      by: ['compte', 'type'],
      where: { tenantId, ...(etablissementId ? { etablissementId } : {}) },
      _sum: { montant: true },
    });
    return sumBalances(
      rows.map((r) => ({
        compte: r.compte,
        type: r.type,
        montant: r._sum.montant ?? 0,
      })),
    );
  }

  /** Soldes par compte = Σ(entrées) − Σ(sorties) de l'établissement courant. */
  async balances(ctx: AuthContext): Promise<Balances> {
    return this.prisma.forTenant(ctx.tenantId, (tx) =>
      this.computeBalances(tx, ctx.tenantId, ctx.etablissementId),
    );
  }

  // ─── Stats journalières ───────────────────────────────────────────────────

  /** KPIs : soldes détaillés + résultat de la journée (entrées, sorties, net). */
  async stats(ctx: AuthContext): Promise<TreasuryStats> {
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const balances = await this.computeBalances(tx, ctx.tenantId, ctx.etablissementId);
      const totalBalance = Object.values(balances).reduce((s, v) => s + v, 0);

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const todayRows = await tx.cashMovement.groupBy({
        by: ['type'],
        where: {
          tenantId: ctx.tenantId,
          createdAt: { gte: startOfDay },
          ...(ctx.etablissementId ? { etablissementId: ctx.etablissementId } : {}),
        },
        _sum: { montant: true },
      });

      let entrees = 0;
      let sorties = 0;
      for (const r of todayRows) {
        if (r.type === 'IN') entrees = r._sum.montant ?? 0;
        else sorties = r._sum.montant ?? 0;
      }

      return { balances, totalBalance, today: { entrees, sorties, net: entrees - sorties } };
    });
  }

  // ─── Dépense ──────────────────────────────────────────────────────────────

  /** Dépense (sortie). */
  async recordExpense(ctx: AuthContext, input: RecordExpenseInput) {
    assertConcreteEtablissement(ctx);
    // Décaissement : un opérateur de caisse sans `treasury:write` (le caissier)
    // ne peut sortir QUE des espèces (compte CAISSE). Mobile Money / Banque
    // restent réservés au gérant/propriétaire.
    if (!hasCapability(ctx.role, 'treasury:write') && input.compte !== 'CAISSE') {
      throw new ForbiddenException(
        'Le caissier ne peut décaisser que des espèces (caisse). Mobile Money / Banque sont réservés au gérant.',
      );
    }
    return this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.cashMovement.create({
        data: {
          tenantId: ctx.tenantId,
          etablissementId: ctx.etablissementId,
          type: 'OUT',
          compte: input.compte,
          montant: input.montant,
          source: 'EXPENSE',
          categorie: input.categorie,
          note: input.note ?? null,
          createdBy: ctx.userId,
        },
      }),
    );
  }

  // ─── Mouvement manuel ─────────────────────────────────────────────────────

  /** Mouvement manuel (ajustement / solde d'ouverture). */
  async recordMovement(ctx: AuthContext, input: RecordCashMovementInput) {
    assertConcreteEtablissement(ctx);
    return this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.cashMovement.create({
        data: {
          tenantId: ctx.tenantId,
          etablissementId: ctx.etablissementId,
          type: input.type,
          compte: input.compte,
          montant: input.montant,
          source: input.source ?? 'ADJUSTMENT',
          note: input.note ?? null,
          createdBy: ctx.userId,
        },
      }),
    );
  }

  // ─── Virement ─────────────────────────────────────────────────────────────

  /**
   * Virement entre deux comptes.
   * Lève une BadRequestException si le solde du compte source est insuffisant.
   */
  async transfer(ctx: AuthContext, input: TransferInput) {
    assertConcreteEtablissement(ctx);
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      // Vérification du solde source (établissement courant)
      const balances = await this.computeBalances(tx, ctx.tenantId, ctx.etablissementId);
      assertSufficientBalance(balances, input.from, input.montant);

      await tx.cashMovement.create({
        data: {
          tenantId: ctx.tenantId,
          etablissementId: ctx.etablissementId,
          type: 'OUT',
          compte: input.from,
          montant: input.montant,
          source: 'TRANSFER',
          note: input.note ?? `Virement vers ${CASH_ACCOUNT_LABELS[input.to]}`,
          createdBy: ctx.userId,
        },
      });
      await tx.cashMovement.create({
        data: {
          tenantId: ctx.tenantId,
          etablissementId: ctx.etablissementId,
          type: 'IN',
          compte: input.to,
          montant: input.montant,
          source: 'TRANSFER',
          note: input.note ?? `Virement depuis ${CASH_ACCOUNT_LABELS[input.from]}`,
          createdBy: ctx.userId,
        },
      });
      return this.computeBalances(tx, ctx.tenantId, ctx.etablissementId);
    });
  }

  // ─── Historique des mouvements ────────────────────────────────────────────

  /**
   * Liste des mouvements avec filtres avancés et calcul du solde cumulé par compte.
   * Les lignes sont retournées du plus récent au plus ancien.
   */
  async listMovements(ctx: AuthContext, filters: MovementFilters = {}): Promise<MovementWithBalance[]> {
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const where: Record<string, unknown> = { tenantId: ctx.tenantId };
      if (ctx.etablissementId) where['etablissementId'] = ctx.etablissementId;
      if (filters.compte) where['compte'] = filters.compte;
      if (filters.source) where['source'] = filters.source;
      if (filters.from || filters.to) {
        where['createdAt'] = {
          ...(filters.from ? { gte: new Date(filters.from) } : {}),
          ...(filters.to ? { lte: new Date(filters.to + 'T23:59:59') } : {}),
        };
      }

      const rows = await tx.cashMovement.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        take: 500,
      });

      // Calcul du solde cumulé par compte (chronologique ascendant, puis on inverse)
      const runningBalances: Record<string, number> = {};

      const enriched: MovementWithBalance[] = rows.map((m) => {
        const key = m.compte as string;
        const prev = runningBalances[key] ?? 0;
        const next = m.type === 'IN' ? prev + m.montant : prev - m.montant;
        runningBalances[key] = next;
        return {
          id: m.id,
          type: m.type as 'IN' | 'OUT',
          compte: m.compte as CashAccount,
          montant: m.montant,
          source: m.source,
          categorie: m.categorie,
          note: m.note,
          createdAt: m.createdAt,
          createdBy: m.createdBy,
          soldeApres: next,
        };
      });

      // Retourner du plus récent au plus ancien
      return enriched.reverse();
    });
  }

  // ─── Clôture de caisse ────────────────────────────────────────────────────

  /**
   * Clôture de caisse : compare le solde théorique au comptage réel.
   * Si un écart est constaté, un motif (note) est obligatoire.
   */
  async close(ctx: AuthContext, input: CashCloseInput) {
    assertConcreteEtablissement(ctx);
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const balances = await this.computeBalances(tx, ctx.tenantId, ctx.etablissementId);
      const soldeTheorique = balances[input.compte];
      const ecart = input.soldeReel - soldeTheorique;

      // Motif obligatoire en cas d'écart
      requireClosingNote(ecart, input.note);

      const cashClose = await tx.cashClose.create({
        data: {
          tenantId: ctx.tenantId,
          etablissementId: ctx.etablissementId,
          compte: input.compte,
          soldeTheorique,
          soldeReel: input.soldeReel,
          ecart,
          note: input.note ?? null,
          closedBy: ctx.userId,
        },
      });

      // Aligne le solde système sur le comptage réel.
      const ajustement = closingAdjustment(ecart);
      if (ajustement) {
        await tx.cashMovement.create({
          data: {
            tenantId: ctx.tenantId,
            etablissementId: ctx.etablissementId,
            type: ajustement.type,
            compte: input.compte,
            montant: ajustement.montant,
            source: 'ADJUSTMENT',
            note: `Écart clôture : ${input.note ?? ''}`,
            createdBy: ctx.userId,
          },
        });
      }
      return { cashClose, soldeTheorique, soldeReel: input.soldeReel, ecart };
    });
  }

  // ─── Historique des clôtures ──────────────────────────────────────────────

  /** Retourne les 50 dernières clôtures de tous les comptes. */
  async listCloses(ctx: AuthContext, compte?: CashAccount) {
    return this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.cashClose.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...(ctx.etablissementId ? { etablissementId: ctx.etablissementId } : {}),
          ...(compte ? { compte } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    );
  }
}
