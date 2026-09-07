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
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import type { AuthContext, InviteUserInput, PinLoginInput, SignUpInput } from '@wilinwi/types';
import { PrismaService } from '../common/prisma.service';
import { ActivityService } from '../common/activity.service';
import { SupabaseAdminService } from './supabase-admin.service';
import { MAX_PIN_FAILS, PIN_LOCK_MS, resolvePinAttempt } from './pin-lock';

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
          data: { id: tenantId, nom: input.nomBoutique, plan: 'STARTER' },
        });
        // Premier établissement de l'entreprise (= point de vente par défaut).
        const etablissement = await tx.etablissement.create({
          data: {
            tenantId,
            nom: input.nomEtablissement?.trim() || input.nomBoutique,
            type: input.typeEtablissement ?? 'BOUTIQUE',
          },
        });
        await tx.user.create({
          data: {
            id: userId,
            tenantId,
            nom: input.nomComplet,
            email: input.email,
            role: 'OWNER',
            pinCode: await bcrypt.hash('0000', 10),
          },
        });
        // L'owner accède à son premier établissement.
        await tx.userEtablissement.create({
          data: { tenantId, userId, etablissementId: etablissement.id },
        });
      });

      await this.supabase.setClaims(userId, { tenantId, role: 'OWNER', plan: 'STARTER' });
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
    // Anti-escalade : seul un OWNER peut inviter un autre OWNER.
    if (input.role === 'OWNER' && ctx.role !== 'OWNER') {
      throw new ForbiddenException('Seul le propriétaire peut inviter un autre propriétaire.');
    }
    // Invitation par email : le collaborateur définit son mot de passe via le lien reçu.
    const { id: userId } = await this.supabase.inviteByEmail(input.email);

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
        // Par défaut, le membre invité accède à tous les établissements actifs
        // de l'entreprise (l'accès pourra être restreint dans les paramètres).
        const etabs = await tx.etablissement.findMany({
          where: { tenantId: ctx.tenantId, actif: true },
          select: { id: true },
        });
        if (etabs.length > 0) {
          await tx.userEtablissement.createMany({
            data: etabs.map((e) => ({
              tenantId: ctx.tenantId,
              userId,
              etablissementId: e.id,
            })),
            skipDuplicates: true,
          });
        }
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

    return { userId, invited: true };
  }

  /** Profil + contexte de l'utilisateur courant (sans le hash du PIN). */
  async me(ctx: AuthContext) {
    const { user, etablissements } = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const user = await tx.user.findFirst({
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
              pays: true,
              ville: true,
            },
          },
        },
      });
      // Établissements accessibles (pour le sélecteur). On suit la liste effective
      // de l'AuthContext (déjà bornée à l'accès utilisateur + clamp rétrogradation).
      const etablissements = await tx.etablissement.findMany({
        where: { id: { in: ctx.etablissementIds } },
        select: { id: true, nom: true, type: true },
        orderBy: { createdAt: 'asc' },
      });
      return { user, etablissements };
    });
    return { ...ctx, profile: user, etablissements };
  }

  /**
   * Login par PIN sur poste partagé. `ctx` = session tenant déjà valide sur
   * l'appareil (preuve d'appartenance). Vérifie le PIN (hash) puis MINTE un JWT
   * compatible (même secret HS256) pour l'utilisateur cible → bascule de profil.
   * Anti-bruteforce persistant en base (5 échecs → verrou 60 s par utilisateur).
   */
  async pinLogin(ctx: AuthContext, input: PinLoginInput) {
    const now = Date.now();

    const user = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.user.findFirst({
        where: { id: input.userId, tenantId: ctx.tenantId },
        select: {
          id: true,
          nom: true,
          email: true,
          role: true,
          poste: true,
          actif: true,
          pinCode: true,
          pinFailCount: true,
          pinLockedUntil: true,
        },
      }),
    );

    // Utilisateur inconnu : rien à verrouiller (le compteur est porté par la ligne
    // User, déjà scopée au tenant). On rejette sans incrémenter.
    if (!user) {
      throw new UnauthorizedException('PIN invalide');
    }

    const valid = Boolean(
      user.actif && user.pinCode && (await bcrypt.compare(input.pin, user.pinCode)),
    );
    const attempt = resolvePinAttempt(
      { failCount: user.pinFailCount, lockedUntil: user.pinLockedUntil },
      now,
      valid,
    );

    if (attempt.kind === 'locked') {
      throw new UnauthorizedException('Trop de tentatives. Réessayez dans une minute.');
    }

    if (attempt.kind === 'success') {
      // Succès : reset complet du compteur et du verrou.
      await this.prisma.forTenant(ctx.tenantId, (tx) =>
        tx.user.update({
          where: { id: user.id },
          data: { pinFailCount: 0, pinLockedUntil: null },
        }),
      );
    } else {
      // Échec : incrément atomique côté base (pas de read-then-write concurrent),
      // puis verrou si le seuil est atteint.
      await this.prisma.forTenant(ctx.tenantId, async (tx) => {
        const updated = await tx.user.update({
          where: { id: user.id },
          data: { pinFailCount: { increment: 1 } },
          select: { pinFailCount: true },
        });
        if (updated.pinFailCount >= MAX_PIN_FAILS) {
          await tx.user.update({
            where: { id: user.id },
            data: { pinLockedUntil: new Date(now + PIN_LOCK_MS) },
          });
        }
      });
      throw new UnauthorizedException('PIN invalide');
    }

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
