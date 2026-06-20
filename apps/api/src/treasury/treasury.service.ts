import { Injectable } from '@nestjs/common';
import {
  CASH_ACCOUNTS,
  type AuthContext,
  type CashAccount,
  type CashCloseInput,
  type RecordCashMovementInput,
  type RecordExpenseInput,
  type TransferInput,
} from '@wilinwi/types';
import type { TenantTx } from '@wilinwi/db';
import { PrismaService } from '../common/prisma.service';

export type Balances = Record<CashAccount, number>;

@Injectable()
export class TreasuryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Soldes par compte = Σ(entrées) − Σ(sorties). */
  async balances(ctx: AuthContext): Promise<Balances> {
    return this.prisma.forTenant(ctx.tenantId, (tx) => this.computeBalances(tx, ctx.tenantId));
  }

  private async computeBalances(tx: TenantTx, tenantId: string): Promise<Balances> {
    const rows = await tx.cashMovement.groupBy({
      by: ['compte', 'type'],
      where: { tenantId },
      _sum: { montant: true },
    });
    const balances = Object.fromEntries(CASH_ACCOUNTS.map((c) => [c, 0])) as Balances;
    for (const r of rows) {
      const montant = r._sum.montant ?? 0;
      balances[r.compte] += r.type === 'IN' ? montant : -montant;
    }
    return balances;
  }

  /** Dépense (sortie). */
  async recordExpense(ctx: AuthContext, input: RecordExpenseInput) {
    return this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.cashMovement.create({
        data: {
          tenantId: ctx.tenantId,
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

  /** Mouvement manuel (ajustement / solde d'ouverture). */
  async recordMovement(ctx: AuthContext, input: RecordCashMovementInput) {
    return this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.cashMovement.create({
        data: {
          tenantId: ctx.tenantId,
          type: input.type,
          compte: input.compte,
          montant: input.montant,
          source: 'ADJUSTMENT',
          note: input.note ?? null,
          createdBy: ctx.userId,
        },
      }),
    );
  }

  /** Virement entre deux comptes. */
  async transfer(ctx: AuthContext, input: TransferInput) {
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      await tx.cashMovement.create({
        data: {
          tenantId: ctx.tenantId,
          type: 'OUT',
          compte: input.from,
          montant: input.montant,
          source: 'TRANSFER',
          note: input.note ?? `Virement vers ${input.to}`,
          createdBy: ctx.userId,
        },
      });
      await tx.cashMovement.create({
        data: {
          tenantId: ctx.tenantId,
          type: 'IN',
          compte: input.to,
          montant: input.montant,
          source: 'TRANSFER',
          note: input.note ?? `Virement depuis ${input.from}`,
          createdBy: ctx.userId,
        },
      });
      return this.computeBalances(tx, ctx.tenantId);
    });
  }

  async listMovements(ctx: AuthContext, compte?: CashAccount) {
    return this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.cashMovement.findMany({
        where: { tenantId: ctx.tenantId, ...(compte ? { compte } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    );
  }

  /**
   * Clôture de caisse : compare le solde théorique au comptage réel, enregistre
   * l'écart et aligne le solde sur la réalité (mouvement d'ajustement). (§6.1)
   */
  async close(ctx: AuthContext, input: CashCloseInput) {
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const balances = await this.computeBalances(tx, ctx.tenantId);
      const soldeTheorique = balances[input.compte];
      const ecart = input.soldeReel - soldeTheorique;

      const cashClose = await tx.cashClose.create({
        data: {
          tenantId: ctx.tenantId,
          compte: input.compte,
          soldeTheorique,
          soldeReel: input.soldeReel,
          ecart,
          note: input.note ?? null,
          closedBy: ctx.userId,
        },
      });

      // Aligne le solde système sur le comptage réel.
      if (ecart !== 0) {
        await tx.cashMovement.create({
          data: {
            tenantId: ctx.tenantId,
            type: ecart > 0 ? 'IN' : 'OUT',
            compte: input.compte,
            montant: Math.abs(ecart),
            source: 'ADJUSTMENT',
            note: `Écart de clôture (${ecart > 0 ? '+' : ''}${ecart})`,
            createdBy: ctx.userId,
          },
        });
      }
      return { cashClose, soldeTheorique, soldeReel: input.soldeReel, ecart };
    });
  }
}
