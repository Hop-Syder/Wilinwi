/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Service d'accès à la base de données encapsulant le client Prisma avec la logique RLS multi-tenant
 * @created 2026-06-19
 * @updated 2026-06-19
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { prisma, withTenant, type PrismaClient, type TenantTx } from '@wilinwi/db';

/**
 * Accès base de données. Toute opération métier passe par `forTenant`, qui
 * ouvre une transaction avec le contexte tenant → la RLS isole les données.
 */
@Injectable()
export class PrismaService implements OnModuleDestroy {
  /** Client brut — réservé au bootstrap (auth) ; préférer `forTenant`. */
  readonly client: PrismaClient = prisma;

  forTenant<T>(tenantId: string, fn: (tx: TenantTx) => Promise<T>): Promise<T> {
    return withTenant(tenantId, fn);
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
