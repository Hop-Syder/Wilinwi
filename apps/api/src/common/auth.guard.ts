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
import { jwtVerify } from 'jose';
import {
  computeDunning,
  effectiveModules,
  MODULES,
  resolveEffectiveCapabilities,
  RoleSchema,
  type AuthContext,
  type EtablissementInfrastructure,
  type InfraCapability,
  type ModuleKey,
  type Plan,
  type SubscriptionStatus,
} from '@wilinwi/types';
import { IS_PUBLIC_KEY } from './decorators';
import { PrismaService } from './prisma.service';

/**
 * Vérifie le JWT Supabase (HS256, signé avec SUPABASE_JWT_SECRET) et résout
 * le contexte tenant. Le tenant_id et le rôle sont lus depuis app_metadata,
 * posés à la création de l'utilisateur — c'est le socle du SSO du Hub.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly secret: Uint8Array;

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.secret = new TextEncoder().encode(this.config.getOrThrow<string>('SUPABASE_JWT_SECRET'));
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    if (req.method === 'OPTIONS') return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const token = this.extractToken(req.headers.authorization);
    if (!token) throw new UnauthorizedException('Token manquant');

    let payload: Record<string, unknown>;
    try {
      const verified = await jwtVerify(token, this.secret);
      payload = verified.payload as Record<string, unknown>;
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
        select: {
          etablissementId: true,
          etablissement: { select: { infrastructure: true, timezone: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
      let etablissementIds = access.map((a) => a.etablissementId);
      // Infrastructure métier par établissement (résolution des capacités TDR v2).
      const infraByEtab = new Map<string, EtablissementInfrastructure>(
        access.map((a) => [
          a.etablissementId,
          a.etablissement.infrastructure as EtablissementInfrastructure,
        ]),
      );
      // Fuseau horaire par établissement (frontières de journée).
      const tzByEtab = new Map<string, string | null>(
        access.map((a) => [a.etablissementId, a.etablissement.timezone]),
      );
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
        infraByEtab,
        tzByEtab,
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

    // Capacités d'infrastructure effectives (même resolver que le frontend — TDR §2.7).
    // Vue globale : union en LECTURE des établissements accessibles (les écritures
    // scopées restent refusées par assertConcreteEtablissement).
    const infrastructure = etablissementId
      ? (resolved.infraByEtab.get(etablissementId) ?? 'RETAIL')
      : null;
    const timezone = etablissementId ? (resolved.tzByEtab.get(etablissementId) ?? null) : null;
    const resolveFor = (infra: EtablissementInfrastructure): InfraCapability[] =>
      resolveEffectiveCapabilities({
        infrastructure: infra,
        plan: resolved.plan,
        role: resolved.role,
        dunning: resolved.dunning,
      });
    const infraCapabilities = isGlobalView
      ? [...new Set([...resolved.infraByEtab.values()].flatMap(resolveFor))]
      : infrastructure
        ? resolveFor(infrastructure)
        : [];

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
      infrastructure,
      timezone,
      infraCapabilities,
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
