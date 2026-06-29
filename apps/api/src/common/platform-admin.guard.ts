/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Guard de sécurité restreignant l'accès aux administrateurs de la plateforme.
 * @created 2026-06-29
 * @updated 2026-06-29
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import type { AuthContext } from '@wilinwi/types';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user as AuthContext | undefined;
    if (!user || !user.isPlatformAdmin) {
      throw new ForbiddenException("Accès réservé aux administrateurs de la plateforme.");
    }
    return true;
  }
}
