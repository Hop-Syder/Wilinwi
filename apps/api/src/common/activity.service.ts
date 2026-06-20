import { Injectable, Logger } from '@nestjs/common';
import type { ActivityLog } from '@wilinwi/db';
import { PrismaService } from './prisma.service';

export interface ActivityInput {
  tenantId: string;
  userId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  deviceLabel?: string;
}

/** Journal d'activité (audit). N'échoue jamais l'opération métier en cas d'erreur de log. */
@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(input: ActivityInput): Promise<void> {
    try {
      await this.prisma.forTenant(input.tenantId, (tx) =>
        tx.activityLog.create({
          data: {
            tenantId: input.tenantId,
            userId: input.userId ?? null,
            action: input.action,
            entity: input.entity ?? null,
            entityId: input.entityId ?? null,
            metadata: (input.metadata ?? undefined) as object | undefined,
            ip: input.ip ?? null,
            deviceLabel: input.deviceLabel ?? null,
          },
        }),
      );
    } catch (err) {
      this.logger.warn(`Échec écriture journal (${input.action}): ${(err as Error).message}`);
    }
  }

  async list(tenantId: string, limit = 100): Promise<ActivityLog[]> {
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.activityLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 500),
      }),
    );
  }
}
