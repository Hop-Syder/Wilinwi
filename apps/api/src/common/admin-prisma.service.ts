/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Connexion Prisma privilégiée (rôle wilinwi_admin) pour le module plateforme.
 *   Seul ce rôle peut appeler les fonctions cross-tenant `app.*` (verrou base, Lot A).
 *   Tout le reste de l'API utilise PrismaService (rôle applicatif public, RLS).
 * @created 2026-06-30
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@wilinwi/db';

@Injectable()
export class AdminPrismaService implements OnModuleDestroy {
  private readonly logger = new Logger(AdminPrismaService.name);
  /** Client brut connecté via le rôle admin. Réservé au module plateforme. */
  readonly client: PrismaClient;

  constructor(config: ConfigService) {
    const adminUrl = config.get<string>('ADMIN_DATABASE_URL');
    if (!adminUrl) {
      // Fail-closed : on retombe sur le rôle public, qui est PRIVÉ des fonctions
      // admin → les routes /platform renverront « permission denied » (pas de
      // contournement silencieux). Le reste de l'API continue de fonctionner.
      this.logger.warn(
        'ADMIN_DATABASE_URL non défini : le module plateforme utilisera le rôle applicatif, ' +
          'privé des fonctions admin — les routes /platform échoueront tant que la variable est absente.',
      );
    }
    this.client = new PrismaClient({
      datasources: { db: { url: adminUrl ?? config.getOrThrow<string>('DATABASE_URL') } },
      log: ['error'],
    });
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
