import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import {
  type AuthContext,
  type CreateUserInput,
  type UpdateUserInput,
  type UserDto,
} from '@wilinwi/types';
import type { User, TenantTx } from '@wilinwi/db';
import { PrismaService } from '../common/prisma.service';
import { PlanConfigService } from '../common/plan-config.service';
import { ActivityService } from '../common/activity.service';
import { SupabaseAdminService } from './supabase-admin.service';

const PIN_PLACEHOLDER_DOMAIN = '@pin.local';

function toUserDto(u: User, etablissementIds: string[] = [], invitationLink?: string): UserDto {
  return {
    id: u.id,
    nom: u.nom,
    email: u.email.endsWith(PIN_PLACEHOLDER_DOMAIN) ? null : u.email,
    role: u.role,
    poste: u.poste,
    actif: u.actif,
    customPermissions: u.customPermissions,
    permissions: u.permissions,
    hasPin: !!u.pinCode,
    etablissementIds,
    invitationLink,
  };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseAdminService,
    private readonly activity: ActivityService,
    private readonly planConfig: PlanConfigService,
  ) {}

  async list(ctx: AuthContext): Promise<UserDto[]> {
    const users = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.user.findMany({
        where: { tenantId: ctx.tenantId },
        orderBy: { nom: 'asc' },
        include: { etablissements: { select: { etablissementId: true } } },
      }),
    );
    return users.map((u) => toUserDto(u, u.etablissements.map((e) => e.etablissementId)));
  }

  /** Écran « Connexion utilisateur » (PIN) : profils actifs du tenant. */
  async listForPos(ctx: AuthContext) {
    const users = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.user.findMany({
        where: { tenantId: ctx.tenantId, actif: true },
        orderBy: { nom: 'asc' },
        include: {
          etablissements: {
            include: { etablissement: { select: { nom: true, actif: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
    );
    return users.map((u) => ({
      id: u.id,
      nom: u.nom,
      role: u.role,
      poste: u.poste,
      hasPin: !!u.pinCode,
      // Boutiques accessibles (pour l'affichage sous le profil au verrouillage).
      boutiques: u.etablissements
        .filter((e) => e.etablissement.actif)
        .map((e) => e.etablissement.nom),
    }));
  }

  async create(ctx: AuthContext, input: CreateUserInput): Promise<UserDto> {
    // Anti-escalade : seul un OWNER peut créer un autre OWNER.
    if (input.role === 'OWNER' && ctx.role !== 'OWNER') {
      throw new ForbiddenException('Seul le propriétaire peut créer un autre propriétaire.');
    }
    // Limite d'utilisateurs selon l'abonnement (§8) — config pilotable en base.
    const max = (await this.planConfig.getLimits(ctx.plan)).maxUsers;
    const count = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.user.count({ where: { tenantId: ctx.tenantId, actif: true } }),
    );
    if (count >= max) {
      throw new ConflictException(
        `Limite du plan ${ctx.plan} atteinte (${max} utilisateur(s)). Passez à un plan supérieur.`,
      );
    }

    // Email → invitation Supabase (le collaborateur définit son mot de passe via le
    // lien reçu) ; sinon utilisateur PIN-only (id applicatif, login sur poste partagé).
    let userId: string;
    let email: string;
    if (input.email) {
      const res = await this.supabase.inviteByEmail(input.email);
      userId = res.id;
      email = input.email;
    } else {
      userId = randomUUID();
      email = `pin_${userId}${PIN_PLACEHOLDER_DOMAIN}`;
    }

    const pinHash = input.pin ? await bcrypt.hash(input.pin, 10) : null;

    try {
      const { user, etablissementIds } = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
        const user = await tx.user.create({
          data: {
            id: userId,
            tenantId: ctx.tenantId,
            nom: input.nom,
            email,
            role: input.role,
            poste: input.poste ?? null,
            pinCode: pinHash,
            customPermissions: input.customPermissions,
            permissions: input.permissions,
          },
        });
        // Accès établissements : liste fournie (validée tenant), sinon tous les actifs.
        const etablissementIds = await this.resolveEtablissementIds(
          tx,
          ctx.tenantId,
          input.etablissementIds,
        );
        if (etablissementIds.length > 0) {
          await tx.userEtablissement.createMany({
            data: etablissementIds.map((etablissementId) => ({
              tenantId: ctx.tenantId,
              userId,
              etablissementId,
            })),
            skipDuplicates: true,
          });
        }
        return { user, etablissementIds };
      });
      if (input.email) {
        await this.supabase.setClaims(userId, {
          tenantId: ctx.tenantId,
          role: input.role,
          plan: ctx.plan,
        });
      }
      await this.activity.log({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        action: 'USER_CREATE',
        entity: 'user',
        entityId: userId,
        metadata: { nom: input.nom, role: input.role },
      });
      return toUserDto(user, etablissementIds);
    } catch (err) {
      if (input.email) await this.supabase.deleteUser(userId).catch(() => undefined);
      throw err;
    }
  }

  async update(ctx: AuthContext, id: string, input: UpdateUserInput): Promise<UserDto> {
    const { user, etablissementIds } = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const existing = await tx.user.findFirst({ where: { id, tenantId: ctx.tenantId } });
      if (!existing) throw new NotFoundException('Utilisateur introuvable');
      // Anti-escalade : un non-OWNER (gérant) ne peut ni modifier un OWNER,
      // ni promouvoir quiconque au rôle OWNER.
      if (ctx.role !== 'OWNER' && (existing.role === 'OWNER' || input.role === 'OWNER')) {
        throw new ForbiddenException(
          "Un gérant ne peut pas modifier un propriétaire ni attribuer le rôle propriétaire.",
        );
      }
      if (existing.role === 'OWNER' && (input.role || input.actif === false)) {
        throw new BadRequestException('Le propriétaire ne peut pas être rétrogradé ou désactivé');
      }
      const user = await tx.user.update({
        where: { id },
        data: {
          nom: input.nom,
          role: input.role,
          poste: input.poste === undefined ? undefined : input.poste,
          actif: input.actif,
          customPermissions: input.customPermissions,
          permissions: input.permissions,
        },
      });
      // Synchronisation des accès établissements (remplace la liste si fournie).
      if (input.etablissementIds !== undefined) {
        const wanted = await this.resolveEtablissementIds(tx, ctx.tenantId, input.etablissementIds);
        await tx.userEtablissement.deleteMany({
          where: { userId: id, etablissementId: { notIn: wanted.length ? wanted : ['__none__'] } },
        });
        if (wanted.length > 0) {
          await tx.userEtablissement.createMany({
            data: wanted.map((etablissementId) => ({
              tenantId: ctx.tenantId,
              userId: id,
              etablissementId,
            })),
            skipDuplicates: true,
          });
        }
      }
      const access = await tx.userEtablissement.findMany({
        where: { userId: id },
        select: { etablissementId: true },
      });
      return { user, etablissementIds: access.map((a) => a.etablissementId) };
    });
    await this.activity.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'USER_UPDATE',
      entity: 'user',
      entityId: id,
    });
    return toUserDto(user, etablissementIds);
  }

  /**
   * Normalise une liste d'établissements demandée : ne conserve que ceux du
   * tenant courant encore actifs. Liste vide/absente → tous les actifs (défaut).
   */
  private async resolveEtablissementIds(
    tx: TenantTx,
    tenantId: string,
    requested: string[] | undefined,
  ): Promise<string[]> {
    const actifs = await tx.etablissement.findMany({
      where: { tenantId, actif: true },
      select: { id: true },
    });
    const actifIds = actifs.map((e) => e.id);
    if (!requested || requested.length === 0) return actifIds;
    const wanted = new Set(requested);
    return actifIds.filter((id) => wanted.has(id));
  }

  async setPin(ctx: AuthContext, id: string, pin: string): Promise<{ ok: true }> {
    const hash = await bcrypt.hash(pin, 10);
    await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const existing = await tx.user.findFirst({ where: { id, tenantId: ctx.tenantId } });
      if (!existing) throw new NotFoundException('Utilisateur introuvable');
      // Anti-escalade : un gérant ne peut pas réinitialiser le PIN du propriétaire.
      if (ctx.role !== 'OWNER' && existing.role === 'OWNER') {
        throw new ForbiddenException("Un gérant ne peut pas modifier le code PIN du propriétaire.");
      }
      await tx.user.update({ where: { id }, data: { pinCode: hash } });
    });
    await this.activity.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'USER_SET_PIN',
      entity: 'user',
      entityId: id,
    });
    return { ok: true };
  }

  /**
   * Supprime un collaborateur :
   * - Si aucun historique de vente / caisse : suppression définitive physique (DB + Supabase).
   * - Si historique présent : révocation totale des accès (actif=false, PIN effacé, détachement boutiques)
   *   pour préserver l'intégrité comptable et la traçabilité légale.
   */
  async remove(
    ctx: AuthContext,
    id: string,
  ): Promise<{ ok: true; action: 'DELETED' | 'REVOKED'; message: string }> {
    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const existing = await tx.user.findFirst({
        where: { id, tenantId: ctx.tenantId },
        include: {
          _count: {
            select: {
              ventesEffectuees: true,
              openedPosSessions: true,
              closedPosSessions: true,
              inventoriesValid: true,
            },
          },
        },
      });
      if (!existing) throw new NotFoundException('Collaborateur introuvable');

      if (existing.role === 'OWNER') {
        throw new BadRequestException('Le propriétaire principal ne peut pas être supprimé.');
      }
      if (ctx.userId === id) {
        throw new BadRequestException('Vous ne pouvez pas supprimer votre propre compte connecté.');
      }
      if (ctx.role !== 'OWNER') {
        throw new ForbiddenException('Seul le propriétaire peut supprimer un collaborateur.');
      }

      const hasHistory =
        existing._count.ventesEffectuees > 0 ||
        existing._count.openedPosSessions > 0 ||
        existing._count.closedPosSessions > 0 ||
        existing._count.inventoriesValid > 0;

      let action: 'DELETED' | 'REVOKED';
      let message: string;

      if (hasHistory) {
        // Intégrité comptable : le collaborateur a des opérations tracées.
        // On révoque totalement son accès (inactif, PIN effacé, détachement boutiques)
        // et suppression Supabase Auth si présent pour empêcher toute reconnexion.
        await tx.userEtablissement.deleteMany({ where: { userId: id } });
        await tx.user.update({
          where: { id },
          data: {
            actif: false,
            pinCode: null,
            customPermissions: true,
            permissions: [],
          },
        });
        if (existing.email && !existing.email.endsWith(PIN_PLACEHOLDER_DOMAIN)) {
          await this.supabase.deleteUser(id).catch(() => undefined);
        }
        action = 'REVOKED';
        message = `Les accès de ${existing.nom} ont été révoqués et son compte a été désactivé (son historique de vente reste préservé pour la conformité comptable).`;
      } else {
        // Aucun historique comptable : suppression définitive et propre
        await tx.userEtablissement.deleteMany({ where: { userId: id } });
        await tx.user.delete({ where: { id } });
        if (existing.email && !existing.email.endsWith(PIN_PLACEHOLDER_DOMAIN)) {
          await this.supabase.deleteUser(id).catch(() => undefined);
        }
        action = 'DELETED';
        message = `Le collaborateur ${existing.nom} a été définitivement supprimé.`;
      }

      await this.activity.log({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        action: 'USER_DELETE',
        entity: 'user',
        entityId: id,
        metadata: { nom: existing.nom, email: existing.email, action },
      });

      return { ok: true, action, message };
    });
  }
}
