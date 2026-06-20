/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Utilitaire de sécurité/validation API : capabilities.guard.ts
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasCapability, type AuthContext, type Capability } from '@wilinwi/types';
import { CAPABILITIES_KEY } from './decorators';

/** Refuse l'accès si le rôle de l'utilisateur n'a pas toutes les capacités requises. */
@Injectable()
export class CapabilitiesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Capability[]>(CAPABILITIES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user as AuthContext | undefined;
    if (!user) throw new ForbiddenException('Non authentifié');

    const missing = required.filter((cap) => !hasCapability(user.role, cap));
    if (missing.length > 0) {
      throw new ForbiddenException(
        `Permission refusée pour votre rôle (${user.role}) : ${missing.join(', ')}`,
      );
    }
    return true;
  }
}
