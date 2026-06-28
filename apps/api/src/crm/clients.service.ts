/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Service NestJS pour la gestion des clients (CRM) : création, modification, archivage, calcul des KPIs et encaissement avec lettrage/FIFO.
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  accountForPayment,
  type AuthContext,
  type CreateClientInput,
  type RecordClientPaymentInput,
  type UpdateClientInput,
} from '@wilinwi/types';
import type { TenantTx } from '@wilinwi/db';
import { PrismaService } from '../common/prisma.service';
import { assertConcreteEtablissement } from '../common/scope';
import { toClientDto } from './client.mapper';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(ctx: AuthContext) {
    const clients = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.client.findMany({
        where: { tenantId: ctx.tenantId, actif: true },
        orderBy: { nom: 'asc' },
      }),
    );
    return clients.map((c) => toClientDto(c, ctx.role));
  }

  async create(ctx: AuthContext, input: CreateClientInput) {
    const client = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.client.create({
        data: {
          tenantId: ctx.tenantId,
          nom: input.nom,
          telephone: input.telephone ?? null,
          plafondCredit: input.plafondCredit ?? null,
          notes: input.notes ?? null,
        },
      }),
    );
    return toClientDto(client, ctx.role);
  }

  async update(ctx: AuthContext, id: string, input: UpdateClientInput) {
    const client = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      await this.ensureClient(tx, ctx.tenantId, id);
      return tx.client.update({ where: { id }, data: input });
    });
    return toClientDto(client, ctx.role);
  }

  /** Détail client : solde, ventes en cours (crédit/acompte), historique complet des ventes et remboursements. */
  async get(ctx: AuthContext, id: string) {
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const client = await this.ensureClient(tx, ctx.tenantId, id);
      const sales = await tx.sale.findMany({
        where: { tenantId: ctx.tenantId, clientId: id },
        orderBy: { createdAt: 'desc' },
        include: {
          installment: true,
          items: {
            include: {
              product: {
                select: { nom: true }
              }
            }
          }
        },
        take: 100,
      });
      const payments = await tx.clientPayment.findMany({
        where: { tenantId: ctx.tenantId, clientId: id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return { client: toClientDto(client, ctx.role), ventes: sales, remboursements: payments };
    });
  }

  /** Enregistre un remboursement : diminue le solde de crédit + historise. */
  async recordPayment(ctx: AuthContext, id: string, input: RecordClientPaymentInput) {
    // L'encaissement entre en trésorerie → exige un établissement précis.
    assertConcreteEtablissement(ctx);
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const client = await this.ensureClient(tx, ctx.tenantId, id);
      if (input.montant > client.soldeCredit) {
        throw new BadRequestException(
          `Le remboursement (${input.montant}) dépasse la dette (${client.soldeCredit})`,
        );
      }

      let remaining = input.montant;
      
      if (input.saleId) {
        const sale = await tx.sale.findFirst({
          where: { id: input.saleId, tenantId: ctx.tenantId, clientId: id },
          include: { installment: true },
        });
        if (sale && sale.status === 'PENDING_PAYMENT' && sale.installment) {
          const inst = sale.installment;
          const soldeRestant = inst.soldeRestant;
          if (soldeRestant > 0) {
            const aPayer = Math.min(remaining, soldeRestant);
            const newMontantVerse = inst.montantVerse + aPayer;
            const newSoldeRestant = soldeRestant - aPayer;
            const newInstStatus = newMontantVerse >= sale.total ? 'SETTLED' : 'PARTIAL';
            const newSaleStatus = newSoldeRestant === 0 ? 'COMPLETED' : 'PENDING_PAYMENT';

            await tx.saleInstallment.update({
              where: { saleId: sale.id },
              data: {
                montantVerse: newMontantVerse,
                soldeRestant: newSoldeRestant,
                status: newInstStatus,
              },
            });

            await tx.sale.update({
              where: { id: sale.id },
              data: {
                montantVerse: newMontantVerse,
                status: newSaleStatus,
              },
            });

            remaining -= aPayer;
          }
        }
      }

      if (remaining > 0) {
        const sales = await tx.sale.findMany({
          where: { tenantId: ctx.tenantId, clientId: id, status: 'PENDING_PAYMENT' },
          orderBy: { createdAt: 'asc' },
          include: { installment: true },
        });

        for (const sale of sales) {
          if (remaining <= 0) break;
          if (input.saleId && sale.id === input.saleId) continue;
          
          const inst = sale.installment;
          if (!inst) continue;

          const soldeRestant = inst.soldeRestant;
          if (soldeRestant <= 0) continue;

          const aPayer = Math.min(remaining, soldeRestant);
          const newMontantVerse = inst.montantVerse + aPayer;
          const newSoldeRestant = soldeRestant - aPayer;
          const newInstStatus = newMontantVerse >= sale.total ? 'SETTLED' : 'PARTIAL';
          const newSaleStatus = newSoldeRestant === 0 ? 'COMPLETED' : 'PENDING_PAYMENT';

          await tx.saleInstallment.update({
            where: { saleId: sale.id },
            data: {
              montantVerse: newMontantVerse,
              soldeRestant: newSoldeRestant,
              status: newInstStatus,
            },
          });

          await tx.sale.update({
            where: { id: sale.id },
            data: {
              montantVerse: newMontantVerse,
              status: newSaleStatus,
            },
          });

          remaining -= aPayer;
        }
      }

      const payment = await tx.clientPayment.create({
        data: {
          tenantId: ctx.tenantId,
          clientId: id,
          montant: input.montant,
          methode: input.methode ?? 'CASH',
          note: input.note ?? null,
          saleId: input.saleId ?? null,
          createdBy: ctx.userId,
        },
      });

      const updated = await tx.client.update({
        where: { id },
        data: { soldeCredit: { decrement: input.montant } },
      });

      // Trésorerie : le remboursement entre dans le compte du mode de paiement.
      const compte = accountForPayment(input.methode ?? 'CASH') ?? 'CAISSE';
      await tx.cashMovement.create({
        data: {
          tenantId: ctx.tenantId,
          etablissementId: ctx.etablissementId,
          type: 'IN',
          compte,
          montant: input.montant,
          source: 'REPAYMENT',
          note: `Remboursement client ${client.nom}`,
          createdBy: ctx.userId,
        },
      });
      return { payment, client: toClientDto(updated, ctx.role) };
    });
  }

  async getKpis(ctx: AuthContext) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const clients = await tx.client.findMany({
        where: { tenantId: ctx.tenantId, actif: true },
      });

      const todayPayments = await tx.clientPayment.findMany({
        where: { tenantId: ctx.tenantId, createdAt: { gte: startOfDay } },
      });

      const totalDette = clients.reduce((sum, c) => sum + c.soldeCredit, 0);
      const debiteurs = clients.filter(c => c.soldeCredit > 0).length;
      const remboursementsAujourdhui = todayPayments.reduce((sum, p) => sum + p.montant, 0);
      
      const creditDisponible = clients.reduce((sum, c) => {
        if (c.plafondCredit === null) return sum;
        return sum + Math.max(c.plafondCredit - c.soldeCredit, 0);
      }, 0);

      return {
        totalDette,
        debiteurs,
        remboursementsAujourdhui,
        creditDisponible,
      };
    });
  }

  private async ensureClient(tx: TenantTx, tenantId: string, id: string) {
    const client = await tx.client.findFirst({ where: { id, tenantId } });
    if (!client) throw new NotFoundException('Client introuvable');
    return client;
  }
}
