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
import { effectiveModules, RoleSchema, type AuthContext, type Plan } from '@wilinwi/types';
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
      return {
        plan: tenant.plan as Plan,
        role: dbRole,
        modules: effectiveModules(
          dbRole,
          tenant.plan as Plan,
          dbUser.customPermissions,
          dbUser.permissions,
        ),
      };
    });

    const ctx: AuthContext = {
      userId,
      tenantId,
      role: resolved.role,
      email: (payload.email as string) ?? '',
      plan: resolved.plan,
      modules: resolved.modules,
    };
    req.user = ctx;
    return true;
  }

  private extractToken(header?: string): string | null {
    if (!header) return null;
    const [type, value] = header.split(' ');
    return type === 'Bearer' && value ? value : null;
  }
}
