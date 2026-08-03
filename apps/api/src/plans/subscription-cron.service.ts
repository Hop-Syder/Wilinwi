/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Service de vérification périodique des abonnements (Cron/Job - Module 3).
 *   Bascule les entreprises arrivées à échéance (subscriptionDueDate < now) en PAST_DUE
 *   et génère les notifications et alertes système.
 * @created 2026-08-03
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class SubscriptionCronService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SubscriptionCronService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    // Exécution initiale puis boucle toutes les 12h
    void this.checkSubscriptions();
    this.timer = setInterval(() => {
      void this.checkSubscriptions();
    }, 12 * 60 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * Scanne tous les tenants dont l'échéance d'abonnement est dépassée
   * et initialise le processus d'impayé (PAST_DUE + pastDueSince).
   */
  async checkSubscriptions(): Promise<{ updatedCount: number }> {
    const now = new Date();
    try {
      // Direct query via client instance
      const expiredTenants = await this.prisma.client.tenant.findMany({
        where: {
          subscriptionStatus: 'ACTIVE',
          subscriptionDueDate: { lte: now },
        },
        select: { id: true, nom: true, subscriptionDueDate: true },
      });

      let updatedCount = 0;
      for (const tenant of expiredTenants) {
        await this.prisma.client.tenant.update({
          where: { id: tenant.id },
          data: {
            subscriptionStatus: 'PAST_DUE',
            pastDueSince: now,
          },
        });

        // Alerte/Notification système pour l'OWNER
        await this.prisma.client.notification.create({
          data: {
            tenantId: tenant.id,
            type: 'PAST_DUE',
            titre: 'Abonnement arrivé à échéance',
            message: `L'abonnement de votre entreprise ${tenant.nom} est arrivé à échéance. Vous bénéficiez d'une période de grâce de 3 jours avant le passage en mode Lecture Seule.`,
          },
        });

        updatedCount++;
        this.logger.warn(`Tenant ${tenant.nom} (${tenant.id}) basculé en PAST_DUE à l'échéance.`);
      }

      return { updatedCount };
    } catch (err) {
      this.logger.error(`Erreur lors du contrôle des abonnements : ${(err as Error).message}`);
      return { updatedCount: 0 };
    }
  }
}
