/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Service métier pour auth
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import type { AuthContext, InviteUserInput, PinLoginInput, SignUpInput } from '@wilinwi/types';
import { PrismaService } from '../common/prisma.service';
import { ActivityService } from '../common/activity.service';
import { SupabaseAdminService } from './supabase-admin.service';

// Anti-bruteforce PIN (en mémoire) : 5 échecs → verrou 60 s par (tenant,user).
const pinFails = new Map<string, { count: number; until: number }>();
const MAX_PIN_FAILS = 5;
const LOCK_MS = 60_000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret: Uint8Array;

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseAdminService,
    private readonly config: ConfigService,
    private readonly activity: ActivityService,
  ) {
    this.jwtSecret = new TextEncoder().encode(this.config.getOrThrow<string>('SUPABASE_JWT_SECRET'));
  }

  /**
   * Inscription d'un propriétaire : crée le compte auth, la boutique (tenant)
   * et l'utilisateur OWNER, puis pose les claims SSO. Le tenant_id est généré
   * côté app pour satisfaire la RLS dès la première insertion.
   */
  async signUp(input: SignUpInput) {
    const userId = await this.supabase.createUser(input.email, input.password);
    const tenantId = randomUUID();

    try {
      await this.prisma.forTenant(tenantId, async (tx) => {
        await tx.tenant.create({
          data: { id: tenantId, nom: input.nomBoutique, plan: 'FREE' },
        });
        await tx.user.create({
          data: {
            id: userId,
            tenantId,
            nom: input.nomComplet,
            email: input.email,
            role: 'OWNER',
          },
        });
      });

      await this.supabase.setClaims(userId, { tenantId, role: 'OWNER', plan: 'FREE' });
    } catch (err) {
      // Compensation : on supprime le compte auth si la transaction échoue.
      await this.supabase.deleteUser(userId).catch(() => undefined);
      this.logger.error('Échec inscription, rollback du compte auth', err as Error);
      throw err;
    }

    return { userId, tenantId };
  }

  /**
   * Invitation d'un membre par un OWNER/MANAGER (capacité users:manage).
   * Renvoie un mot de passe temporaire à transmettre au membre, qui pourra se
   * connecter immédiatement (puis le changer). NB : un flux d'invitation par
   * email/lien est l'évolution de production naturelle.
   */
  async inviteUser(ctx: AuthContext, input: InviteUserInput) {
    const tempPassword = `Wlw-${randomBytes(4).toString('hex')}`;
    const userId = await this.supabase.createUser(input.email, tempPassword);

    try {
      await this.prisma.forTenant(ctx.tenantId, async (tx) => {
        const exists = await tx.user.findFirst({
          where: { tenantId: ctx.tenantId, email: input.email },
        });
        if (exists) throw new ConflictException('Cet email existe déjà dans la boutique');
        await tx.user.create({
          data: {
            id: userId,
            tenantId: ctx.tenantId,
            nom: input.nomComplet,
            email: input.email,
            role: input.role,
          },
        });
      });

      await this.supabase.setClaims(userId, {
        tenantId: ctx.tenantId,
        role: input.role,
        plan: ctx.plan,
      });
    } catch (err) {
      await this.supabase.deleteUser(userId).catch(() => undefined);
      throw err;
    }

    return { userId, temporaryPassword: tempPassword };
  }

  /** Profil + contexte de l'utilisateur courant (sans le hash du PIN). */
  async me(ctx: AuthContext) {
    const user = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.user.findFirst({
        where: { id: ctx.userId, tenantId: ctx.tenantId },
        select: {
          id: true,
          nom: true,
          email: true,
          role: true,
          poste: true,
          actif: true,
          customPermissions: true,
          permissions: true,
          tenant: {
            select: {
              nom: true,
            },
          },
        },
      }),
    );
    return { ...ctx, profile: user };
  }

  /**
   * Login par PIN sur poste partagé. `ctx` = session tenant déjà valide sur
   * l'appareil (preuve d'appartenance). Vérifie le PIN (hash) puis MINTE un JWT
   * compatible (même secret HS256) pour l'utilisateur cible → bascule de profil.
   */
  async pinLogin(ctx: AuthContext, input: PinLoginInput) {
    const key = `${ctx.tenantId}:${input.userId}`;
    const lock = pinFails.get(key);
    if (lock && lock.until > Date.now()) {
      throw new UnauthorizedException('Trop de tentatives. Réessayez dans une minute.');
    }

    const user = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.user.findFirst({ where: { id: input.userId, tenantId: ctx.tenantId } }),
    );
    const ok = user && user.actif && user.pinCode && (await bcrypt.compare(input.pin, user.pinCode));
    if (!user || !user.actif || !user.pinCode || !ok) {
      const count = (lock?.count ?? 0) + 1;
      pinFails.set(key, {
        count,
        until: count >= MAX_PIN_FAILS ? Date.now() + LOCK_MS : 0,
      });
      throw new UnauthorizedException('PIN invalide');
    }
    pinFails.delete(key);

    const accessToken = await new SignJWT({
      email: user.email,
      app_metadata: { tenant_id: ctx.tenantId, role: user.role },
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime('12h')
      .sign(this.jwtSecret);

    await this.activity.log({
      tenantId: ctx.tenantId,
      userId: user.id,
      action: 'PIN_LOGIN',
      entity: 'user',
      entityId: user.id,
    });

    return {
      access_token: accessToken,
      user: { id: user.id, nom: user.nom, role: user.role, poste: user.poste },
    };
  }
}
