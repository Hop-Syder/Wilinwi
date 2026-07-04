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

import { createParamDecorator, SetMetadata, UseGuards, type ExecutionContext } from '@nestjs/common';
import type { AuthContext, Capability, InfraCapability } from '@wilinwi/types';
import { PlatformAdminGuard } from './platform-admin.guard';

/** Marque une route comme publique (pas de JWT requis). */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Capacités requises pour accéder à une route (vérifiées par CapabilitiesGuard). */
export const CAPABILITIES_KEY = 'requiredCapabilities';
export const RequireCapabilities = (...caps: Capability[]) => SetMetadata(CAPABILITIES_KEY, caps);

/**
 * Capacités d'INFRASTRUCTURE requises (axe établissement — TDR v2), vérifiées
 * par InfraCapabilitiesGuard contre `ctx.infraCapabilities` (résolution
 * infrastructure → plan → add-ons → dunning → rôle faite par AuthGuard).
 */
export const INFRA_CAPABILITIES_KEY = 'requiredInfraCapabilities';
export const RequireInfraCapability = (...caps: InfraCapability[]) =>
  SetMetadata(INFRA_CAPABILITIES_KEY, caps);

/**
 * Variante OU : la route passe si AU MOINS UNE des capacités est effective.
 * Sert aux routes partagées entre infrastructures (ex. POST /pos/sales accepte
 * pos.standard | pos.touch | pos.service | pos.wholesale selon l'établissement).
 */
export const INFRA_ANY_CAPABILITIES_KEY = 'requiredAnyInfraCapabilities';
export const RequireAnyInfraCapability = (...caps: InfraCapability[]) =>
  SetMetadata(INFRA_ANY_CAPABILITIES_KEY, caps);

/** Toutes les déclinaisons POS — la vente exige que l'établissement ait UN POS actif. */
export const ANY_POS_CAPABILITY: readonly InfraCapability[] = [
  'pos.standard',
  'pos.touch',
  'pos.service',
  'pos.wholesale',
];

/**
 * Marque une route comme NON VITALE : suspendue dès le dunning J+3
 * (`dunning.suspendNonVital` — rapports avancés, exports). Vérifiée par
 * NonVitalGuard : masquer la page ne suffit pas, l'API refuse aussi.
 */
export const NON_VITAL_KEY = 'nonVitalRoute';
export const NonVital = () => SetMetadata(NON_VITAL_KEY, true);

/** Injecte le contexte utilisateur résolu depuis le JWT. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as AuthContext;
  },
);

/** Marque une route comme réservée aux super-administrateurs plateforme. */
export const PlatformAdmin = () => UseGuards(PlatformAdminGuard);
