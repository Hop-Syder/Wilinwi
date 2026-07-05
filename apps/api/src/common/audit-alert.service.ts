/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Alertes d'audit (TDR §18.2) : anomalies détectées A POSTERIORI
 *   qui n'ont pas bloqué l'opération (stock négatif ALLOW_NEGATIVE, conflits de
 *   lots Health à venir). Levées DANS la transaction de l'opération (même
 *   atomicité), listées côté tenant (OWNER/MANAGER) et remontées à la console
 *   super-admin via app.platform_audit_alerts().
 * @created 2026-07-05
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { AuthContext } from '@wilinwi/types';
import type { Prisma, TenantTx } from '@wilinwi/db';
import { PrismaService } from './prisma.service';

export interface AuditAlertDto {
  id: string;
  etablissementId: string | null;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  type: string;
  message: string;
  payload: unknown;
  resolvedAt: Date | null;
  createdAt: Date;
}

export interface RaiseAlertInput {
  tenantId: string;
  etablissementId?: string | null;
  severity?: 'INFO' | 'WARNING' | 'CRITICAL';
  /** Slug stable (ex: 'stock.negative', 'health.batch_conflict'). */
  type: string;
  message: string;
  payload?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditAlertService {
  private readonly logger = new Logger(AuditAlertService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lève une alerte DANS une transaction tenant existante : si l'opération
   * échoue, l'alerte disparaît avec elle (pas de faux positifs).
   */
  async raise(tx: TenantTx, input: RaiseAlertInput): Promise<void> {
    await tx.auditAlert.create({
      data: {
        tenantId: input.tenantId,
        etablissementId: input.etablissementId ?? null,
        severity: input.severity ?? 'WARNING',
        type: input.type,
        message: input.message,
        payload: input.payload,
      },
    });
    this.logger.warn(
      `AuditAlert [${input.severity ?? 'WARNING'}] ${input.type} — tenant=${input.tenantId} etab=${input.etablissementId ?? 'n/a'} : ${input.message}`,
    );
  }

  /** Alertes du tenant (non résolues par défaut), les plus graves d'abord. */
  async list(ctx: AuthContext, includeResolved = false): Promise<AuditAlertDto[]> {
    const rows = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.auditAlert.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...(includeResolved ? {} : { resolvedAt: null }),
        },
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        take: 200,
      }),
    );
    return rows.map(toDto);
  }

  /** Marque une alerte comme résolue (jamais supprimée — trace d'audit). */
  async resolve(ctx: AuthContext, id: string): Promise<AuditAlertDto> {
    const row = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const alert = await tx.auditAlert.findFirst({ where: { id, tenantId: ctx.tenantId } });
      if (!alert) throw new NotFoundException('Alerte introuvable');
      return tx.auditAlert.update({
        where: { id },
        data: { resolvedAt: new Date(), resolvedBy: ctx.userId },
      });
    });
    return toDto(row);
  }
}

function toDto(row: {
  id: string;
  etablissementId: string | null;
  severity: string;
  type: string;
  message: string;
  payload: unknown;
  resolvedAt: Date | null;
  createdAt: Date;
}): AuditAlertDto {
  return {
    id: row.id,
    etablissementId: row.etablissementId,
    severity: row.severity as AuditAlertDto['severity'],
    type: row.type,
    message: row.message,
    payload: row.payload,
    resolvedAt: row.resolvedAt,
    createdAt: row.createdAt,
  };
}
