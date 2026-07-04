/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Utilitaire de sécurité/validation API : non-vital.guard.ts
 *   Applique le dunning J+3 (`suspendNonVital`) CÔTÉ SERVEUR : les routes
 *   marquées @NonVital (rapports avancés, exports) sont refusées tant que
 *   l'impayé n'est pas régularisé — le frontend ne fait que refléter cet état.
 * @created 2026-07-04
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthContext } from '@wilinwi/types';
import { NON_VITAL_KEY } from './decorators';

/** Refuse les routes non vitales pendant la suspension d'impayé (J+3 → régularisation). */
@Injectable()
export class NonVitalGuard implements CanActivate {
  private readonly logger = new Logger(NonVitalGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const nonVital = this.reflector.getAllAndOverride<boolean>(NON_VITAL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!nonVital) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user as AuthContext | undefined;
    if (!user) throw new ForbiddenException('Non authentifié');

    if (user.dunning.suspendNonVital) {
      this.logger.warn(
        `Refus non-vital (impayé ${user.dunning.stage}) — user=${user.userId} tenant=${user.tenantId}`,
      );
      throw new ForbiddenException(
        `Abonnement impayé depuis ${user.dunning.daysOverdue} jours : rapports avancés et exports suspendus. Régularisez pour les réactiver.`,
      );
    }
    return true;
  }
}
