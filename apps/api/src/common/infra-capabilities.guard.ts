/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Utilitaire de sécurité/validation API : infra-capabilities.guard.ts
 *   Garde des capacités d'INFRASTRUCTURE (TDR v2 — OT-3) : masquer un menu ne
 *   suffit pas, l'API refuse aussi (TDR §2.7). Les capacités effectives sont
 *   résolues par AuthGuard (infrastructure → plan → add-ons → dunning → rôle).
 * @created 2026-07-04
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthContext, InfraCapability } from '@wilinwi/types';
import { INFRA_ANY_CAPABILITIES_KEY, INFRA_CAPABILITIES_KEY } from './decorators';

/**
 * Refuse l'accès si l'établissement courant n'active pas les capacités requises :
 * `@RequireInfraCapability` = TOUTES exigées (ET) ; `@RequireAnyInfraCapability`
 * = AU MOINS UNE (OU, routes partagées entre infrastructures).
 */
@Injectable()
export class InfraCapabilitiesGuard implements CanActivate {
  private readonly logger = new Logger(InfraCapabilitiesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<InfraCapability[]>(INFRA_CAPABILITIES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const anyOf = this.reflector.getAllAndOverride<InfraCapability[]>(
      INFRA_ANY_CAPABILITIES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const hasAll = required && required.length > 0;
    const hasAny = anyOf && anyOf.length > 0;
    if (!hasAll && !hasAny) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user as AuthContext | undefined;
    if (!user) throw new ForbiddenException('Non authentifié');

    const missing = hasAll
      ? required.filter((cap) => !user.infraCapabilities.includes(cap))
      : [];
    const anyOk = !hasAny || anyOf.some((cap) => user.infraCapabilities.includes(cap));

    if (missing.length > 0 || !anyOk) {
      const detail = [
        ...(missing.length > 0 ? missing : []),
        ...(!anyOk ? [`aucune de [${anyOf.join(' | ')}]`] : []),
      ].join(', ');
      // Journalisation des refus sensibles (audit TDR OT-3).
      this.logger.warn(
        `Refus infra-capability [${detail}] — user=${user.userId} tenant=${user.tenantId} etab=${user.etablissementId ?? 'GLOBAL'} infra=${user.infrastructure ?? 'n/a'} dunning=${user.dunning.stage}`,
      );
      throw new ForbiddenException(
        `Fonctionnalité indisponible pour cet établissement : ${detail}`,
      );
    }
    return true;
  }
}
