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

  /** Détail client : solde, ventes à crédit en cours, historique des remboursements. */
  async get(ctx: AuthContext, id: string) {
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const client = await this.ensureClient(tx, ctx.tenantId, id);
      const sales = await tx.sale.findMany({
        where: { tenantId: ctx.tenantId, clientId: id, status: 'PENDING_PAYMENT' },
        orderBy: { createdAt: 'desc' },
        include: { installment: true },
      });
      const payments = await tx.clientPayment.findMany({
        where: { tenantId: ctx.tenantId, clientId: id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return { client: toClientDto(client, ctx.role), ventesACredit: sales, remboursements: payments };
    });
  }

  /** Enregistre un remboursement : diminue le solde de crédit + historise. */
  async recordPayment(ctx: AuthContext, id: string, input: RecordClientPaymentInput) {
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const client = await this.ensureClient(tx, ctx.tenantId, id);
      if (input.montant > client.soldeCredit) {
        throw new BadRequestException(
          `Le remboursement (${input.montant}) dépasse la dette (${client.soldeCredit})`,
        );
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

  private async ensureClient(tx: TenantTx, tenantId: string, id: string) {
    const client = await tx.client.findFirst({ where: { id, tenantId } });
    if (!client) throw new NotFoundException('Client introuvable');
    return client;
  }
}
