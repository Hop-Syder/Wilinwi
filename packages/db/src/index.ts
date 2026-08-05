/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Modèle et gestionnaire de base de données : index.ts
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { PrismaClient, Prisma } from '@prisma/client';

export * from '@prisma/client';

/**
 * Client Prisma singleton.
 *
 * IMPORTANT — pour que la RLS s'applique réellement, ce client doit se connecter
 * avec un rôle Postgres SANS l'attribut BYPASSRLS (cf. prisma/rls.sql).
 * Sur Supabase, créez un rôle applicatif dédié plutôt que d'utiliser `postgres`.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/** Transaction Prisma typée (client transactionnel). */
export type TenantTx = Prisma.TransactionClient;

/**
 * Exécute `fn` dans une transaction où la variable de session
 * `app.current_tenant_id` est positionnée → la RLS isole automatiquement
 * les données au tenant courant. C'est le point d'entrée standard de toute
 * opération applicative.
 */
export function withTenant<T>(
  tenantId: string,
  fn: (tx: TenantTx) => Promise<T>,
  options?: { maxWait?: number; timeout?: number },
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      // set_config(..., true) = local à la transaction (réinitialisé au commit).
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
      return fn(tx);
    },
    { maxWait: options?.maxWait ?? 30_000, timeout: options?.timeout ?? 300_000 },
  );
}
