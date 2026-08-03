/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Guard de restriction d'accès aux requêtes de mutation (POST, PUT, PATCH, DELETE)
 *   lorsque l'entreprise est en statut Lecture Seule (impayé > 3 jours de grâce - Module 3).
 * @created 2026-08-03
 * @updated 2026-08-03
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import type { AuthContext } from '@wilinwi/types';

@Injectable()
export class ReadOnlyGuard implements CanActivate {
  private readonly logger = new Logger(ReadOnlyGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const method = req.method as string;

    // Les requêtes en lecture (GET, OPTIONS, HEAD) sont toujours autorisées
    if (['GET', 'OPTIONS', 'HEAD'].includes(method.toUpperCase())) {
      return true;
    }

    const user = req.user as AuthContext | undefined;
    if (!user) return true; // AuthGuard s'en occupe si absent

    if (user.dunning?.isReadOnly) {
      this.logger.warn(
        `Refus d'écriture en Mode Lecture Seule (${user.dunning.stage}, ${user.dunning.daysOverdue}j) — method=${method} url=${req.url} tenant=${user.tenantId}`,
      );
      throw new ForbiddenException(
        `Votre boutique est actuellement en Mode Lecture Seule (abonnement expiré depuis ${user.dunning.daysOverdue ?? 3} jours). Les créations et modifications sont suspendues. Veuillez régulariser votre abonnement.`,
      );
    }

    return true;
  }
}
