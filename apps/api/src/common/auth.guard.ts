/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Utilitaire de sécurité/validation API : auth.guard.ts
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet } from 'jose';
import {
  computeDunning,
  effectiveModules,
  MODULES,
  RoleSchema,
  type AuthContext,
  type ModuleKey,
  type Plan,
  type SubscriptionStatus,
} from '@wilinwi/types';
import { IS_PUBLIC_KEY } from './decorators';
import { createAccessTokenVerifier, type AccessTokenVerifier } from './jwt-verifier';
import { PrismaService } from './prisma.service';

/**
 * Vérifie le JWT et résout le contexte tenant. Deux origines de token possibles :
 *  - Supabase (login e-mail/mot de passe) : clés asymétriques ES256 publiées sur
 *    le JWKS du projet (gère nativement la rotation de clé).
 *  - Interne (login PIN sur poste partagé, cf. AuthService.pinLogin) : HS256,
 *    signé avec SUPABASE_JWT_SECRET — ce token n'est jamais émis par Supabase et
 *    n'apparaîtra donc jamais dans son JWKS, d'où l'essai JWKS puis repli HS256.
 * Le tenant_id et le rôle sont lus depuis app_metadata, posés à la création de
 * l'utilisateur — c'est le socle du SSO du Hub.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly verifyToken: AccessTokenVerifier;

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const supabaseUrl = this.config.getOrThrow<string>('SUPABASE_URL').replace(/\/$/, '');
    const jwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
    // Secret symétrique OPTIONNEL : sert uniquement au secours HS256 des tokens
    // PIN. S'il est absent, le secours est désactivé (fail-closed).
    const hs256Secret = this.config.get<string | undefined>('SUPABASE_JWT_SECRET');
    this.verifyToken = createAccessTokenVerifier(
      jwks,
      hs256Secret ? new TextEncoder().encode(hs256Secret) : null,
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const token = this.extractToken(req.headers.authorization);
    if (!token) throw new UnauthorizedException('Token manquant');

    let payload: Record<string, unknown>;
    try {
      payload = await this.verifyToken(token);
    } catch {
      throw new UnauthorizedException('Token invalide');
    }

    const meta = (payload.app_metadata ?? {}) as Record<string, unknown>;
    const userId = payload.sub as string | undefined;
    const tenantId = meta.tenant_id as string | undefined;
    const roleRaw = meta.role;

    if (!userId || !tenantId) {
      throw new UnauthorizedException('Profil utilisateur incomplet');
    }
    void roleRaw; // le rôle fait désormais autorité depuis la base (voir ci-dessous)

    // Contexte tenant : plan + utilisateur (rôle, statut actif, permissions) — toujours
    // frais en base (DB = source de vérité, les changements s'appliquent immédiatement).
    const resolved = await this.prisma.forTenant(tenantId, async (tx) => {
      const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) throw new UnauthorizedException('Boutique introuvable');
      const dbUser = await tx.user.findUnique({ where: { id: userId } });
      if (!dbUser) throw new UnauthorizedException('Utilisateur introuvable');
      if (!dbUser.actif) throw new UnauthorizedException('Compte désactivé');
      const dbRole = RoleSchema.parse(dbUser.role);
      // Relance d'impayé : à J+7+ on rétrograde l'accès au niveau Starter (non destructif).
      const subscriptionStatus = tenant.subscriptionStatus as SubscriptionStatus;
      const dunning = computeDunning(subscriptionStatus, tenant.pastDueSince);
      const realPlan = tenant.plan as Plan;
      const effectivePlan: Plan = dunning.downgraded ? 'STARTER' : realPlan;
      // Modules « à la carte » de l'entreprise (Lot 2.4) — neutralisés tant que l'abonnement
      // est rétrogradé pour impayé (J+7+), comme le plan lui-même.
      const moduleAddons: ModuleKey[] = dunning.downgraded
        ? []
        : (tenant.moduleAddons.filter((m) => (MODULES as readonly string[]).includes(m)) as ModuleKey[]);
      // Établissements accessibles à l'utilisateur (uniquement ceux encore actifs).
      const access = await tx.userEtablissement.findMany({
        where: { userId, etablissement: { actif: true } },
        select: { etablissementId: true },
        orderBy: { createdAt: 'asc' },
      });
      let etablissementIds = access.map((a) => a.etablissementId);
      // Rétrogradation Starter = 1 seul établissement actif (les autres → préservés, masqués).
      if (dunning.downgraded && etablissementIds.length > 1) {
        etablissementIds = etablissementIds.slice(0, 1);
      }
      return {
        plan: effectivePlan,
        subscriptionStatus,
        dunning,
        role: dbRole,
        modules: effectiveModules(
          dbRole,
          effectivePlan,
          dbUser.customPermissions,
          dbUser.permissions,
          moduleAddons,
        ),
        etablissementIds,
      };
    });

    // Établissement courant : en-tête X-Etablissement-Id, borné à la liste autorisée.
    // Sinon → premier établissement accessible (switch sans reconnexion).
    const headerEtab = this.extractEtablissement(req.headers['x-etablissement-id']);
    const isOwner = resolved.role === 'OWNER';
    const canSeeAll = isOwner && resolved.etablissementIds.length >= 2;
    // Vue globale « Tous » : lectures agrégées (etablissementId=null), écritures refusées.
    const isGlobalView = headerEtab === 'ALL' && canSeeAll;

    const etablissementId = isGlobalView
      ? null
      : headerEtab && resolved.etablissementIds.includes(headerEtab)
        ? headerEtab
        : (resolved.etablissementIds[0] ?? null);

    const email = (payload.email as string) ?? '';
    const adminEmails = this.config.get<string>('PLATFORM_ADMIN_EMAILS', '');
    const isPlatformAdmin = adminEmails
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
      .includes(email.toLowerCase());

    const ctx: AuthContext = {
      userId,
      tenantId,
      role: resolved.role,
      email,
      plan: resolved.plan,
      modules: resolved.modules,
      etablissementId,
      isGlobalView,
      etablissementIds: resolved.etablissementIds,
      subscriptionStatus: resolved.subscriptionStatus,
      dunning: resolved.dunning,
      isPlatformAdmin,
    };
    req.user = ctx;
    return true;
  }

  private extractEtablissement(header?: string | string[]): string | null {
    if (!header) return null;
    const value = Array.isArray(header) ? header[0] : header;
    return value?.trim() || null;
  }

  private extractToken(header?: string): string | null {
    if (!header) return null;
    const [type, value] = header.split(' ');
    return type === 'Bearer' && value ? value : null;
  }
}
