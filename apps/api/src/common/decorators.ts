/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Utilitaire de sécurité/validation API : decorators.ts
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { AuthContext, Capability } from '@wilinwi/types';

/** Marque une route comme publique (pas de JWT requis). */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Capacités requises pour accéder à une route (vérifiées par CapabilitiesGuard). */
export const CAPABILITIES_KEY = 'requiredCapabilities';
export const RequireCapabilities = (...caps: Capability[]) => SetMetadata(CAPABILITIES_KEY, caps);

/** Injecte le contexte utilisateur résolu depuis le JWT. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as AuthContext;
  },
);
