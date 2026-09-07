/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Service métier pour la gestion des fournisseurs
 * @created 2026-06-28
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type { AuthContext, CreateSupplierInput, UpdateSupplierInput, RecordSupplierPaymentInput } from '@wilinwi/types';
import type { TenantTx } from '@wilinwi/db';
import { PrismaService } from '../common/prisma.service';
import { ActivityService } from '../common/activity.service';
import { toSupplierDto } from './supplier.mapper';

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async list(ctx: AuthContext) {
    const suppliers = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.supplier.findMany({
        where: { tenantId: ctx.tenantId, actif: true },
        orderBy: { nom: 'asc' },
      }),
    );
    return suppliers.map(toSupplierDto);
  }

  async getSupplier(ctx: AuthContext, id: string) {
    const supplier = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      return this.ensureSupplier(tx, ctx.tenantId, id);
    });
    return toSupplierDto(supplier);
  }

  async create(ctx: AuthContext, input: CreateSupplierInput) {
    const supplier = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const created = await tx.supplier.create({
        data: {
          tenantId: ctx.tenantId,
          nom: input.nom,
          telephone: input.telephone ?? null,
          contact: input.contact ?? null,
          adresse: input.adresse ?? null,
          notes: input.notes ?? null,
        },
      });
      await this.activity.log({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        action: 'SUPPLIER_CREATE',
        entity: 'supplier',
        entityId: created.id,
        metadata: { nom: created.nom },
      });
      return created;
    });
    return toSupplierDto(supplier);
  }

  async update(ctx: AuthContext, id: string, input: UpdateSupplierInput) {
    const supplier = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      await this.ensureSupplier(tx, ctx.tenantId, id);
      const updated = await tx.supplier.update({
        where: { id },
        data: {
          nom: input.nom,
          telephone: input.telephone ?? null,
          contact: input.contact ?? null,
          adresse: input.adresse ?? null,
          notes: input.notes ?? null,
          actif: input.actif,
        },
      });
      await this.activity.log({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        action: 'SUPPLIER_UPDATE',
        entity: 'supplier',
        entityId: updated.id,
        metadata: { nom: updated.nom },
      });
      return updated;
    });
    return toSupplierDto(supplier);
  }

  async paySupplier(ctx: AuthContext, id: string, input: RecordSupplierPaymentInput) {
    const etablissementId = input.etablissementId ?? ctx.etablissementId;
    if (!etablissementId) {
      throw new BadRequestException("Veuillez sélectionner un établissement pour enregistrer ce règlement");
    }
    
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const supplier = await this.ensureSupplier(tx, ctx.tenantId, id);
      
      if (supplier.soldeDette < input.montant) {
        throw new BadRequestException("Le montant du règlement ne peut pas dépasser le solde de la dette.");
      }

      // Enregistrer le paiement
      const payment = await tx.supplierPayment.create({
        data: {
          tenantId: ctx.tenantId,
          fournisseurId: id,
          etablissementId: etablissementId,
          montant: input.montant,
          methode: input.methode ?? 'CASH',
          note: input.note ?? null,
          purchaseOrderId: input.purchaseOrderId ?? null,
          createdBy: ctx.userId,
        },
      });

      // Mettre à jour la dette du fournisseur
      const updatedSupplier = await tx.supplier.update({
        where: { id },
        data: { soldeDette: { decrement: input.montant } },
      });

      // Sortie de trésorerie (Compte selon la méthode)
      const compte = this.accountForPayment(input.methode ?? 'CASH');
      await tx.cashMovement.create({
        data: {
          tenantId: ctx.tenantId,
          etablissementId: etablissementId,
          type: 'OUT',
          compte,
          montant: input.montant,
          source: 'EXPENSE',
          note: `Règlement fournisseur ${supplier.nom}${input.note ? ` - ${input.note}` : ''}`,
          createdBy: ctx.userId,
        },
      });

      await this.activity.log({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        action: 'SUPPLIER_PAYMENT',
        entity: 'supplier',
        entityId: id,
        metadata: { montant: input.montant, methode: input.methode },
      });

      return { payment, supplier: toSupplierDto(updatedSupplier) };
    });
  }

  async listPayments(ctx: AuthContext, supplierId?: string) {
    const payments = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.supplierPayment.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...(supplierId ? { fournisseurId: supplierId } : {}),
        },
        orderBy: { createdAt: 'desc' },
      }),
    );
    return payments;
  }

  private async ensureSupplier(tx: TenantTx, tenantId: string, id: string) {
    const supplier = await tx.supplier.findFirst({
      where: { id, tenantId },
    });
    if (!supplier) throw new NotFoundException('Fournisseur introuvable');
    return supplier;
  }

  private accountForPayment(method: string): 'CAISSE' | 'MOBILE_MONEY' | 'BANQUE' {
    if (method === 'MOBILE_MONEY') return 'MOBILE_MONEY';
    if (method === 'CARD' || method === 'TRANSFER') return 'BANQUE';
    return 'CAISSE';
  }
}
