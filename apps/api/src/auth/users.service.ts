import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import {
  PLAN_LIMITS,
  type AuthContext,
  type CreateUserInput,
  type UpdateUserInput,
  type UserDto,
} from '@wilinwi/types';
import type { User } from '@wilinwi/db';
import { PrismaService } from '../common/prisma.service';
import { ActivityService } from '../common/activity.service';
import { SupabaseAdminService } from './supabase-admin.service';

const PIN_PLACEHOLDER_DOMAIN = '@pin.local';

function toUserDto(u: User): UserDto {
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
  };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseAdminService,
    private readonly activity: ActivityService,
  ) {}

  async list(ctx: AuthContext): Promise<UserDto[]> {
    const users = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.user.findMany({ where: { tenantId: ctx.tenantId }, orderBy: { nom: 'asc' } }),
    );
    return users.map(toUserDto);
  }

  /** Écran « Connexion utilisateur » (PIN) : profils actifs du tenant. */
  async listForPos(ctx: AuthContext) {
    const users = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.user.findMany({
        where: { tenantId: ctx.tenantId, actif: true },
        orderBy: { nom: 'asc' },
      }),
    );
    return users.map((u) => ({
      id: u.id,
      nom: u.nom,
      role: u.role,
      poste: u.poste,
      hasPin: !!u.pinCode,
    }));
  }

  async create(ctx: AuthContext, input: CreateUserInput): Promise<UserDto> {
    // Limite d'utilisateurs selon l'abonnement (§8).
    const max = PLAN_LIMITS[ctx.plan].maxUsers;
    const count = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.user.count({ where: { tenantId: ctx.tenantId, actif: true } }),
    );
    if (count >= max) {
      throw new ConflictException(
        `Limite du plan ${ctx.plan} atteinte (${max} utilisateur(s)). Passez à un plan supérieur.`,
      );
    }

    // Email → compte Supabase ; sinon utilisateur PIN-only (id applicatif).
    let userId: string;
    let email: string;
    if (input.email) {
      userId = await this.supabase.createUser(input.email, `Wlw-${randomUUID().slice(0, 8)}`);
      email = input.email;
    } else {
      userId = randomUUID();
      email = `pin_${userId}${PIN_PLACEHOLDER_DOMAIN}`;
    }

    const pinHash = input.pin ? await bcrypt.hash(input.pin, 10) : null;

    try {
      const user = await this.prisma.forTenant(ctx.tenantId, (tx) =>
        tx.user.create({
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
        }),
      );
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
      return toUserDto(user);
    } catch (err) {
      if (input.email) await this.supabase.deleteUser(userId).catch(() => undefined);
      throw err;
    }
  }

  async update(ctx: AuthContext, id: string, input: UpdateUserInput): Promise<UserDto> {
    const user = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const existing = await tx.user.findFirst({ where: { id, tenantId: ctx.tenantId } });
      if (!existing) throw new NotFoundException('Utilisateur introuvable');
      if (existing.role === 'OWNER' && (input.role || input.actif === false)) {
        throw new BadRequestException('Le propriétaire ne peut pas être rétrogradé ou désactivé');
      }
      return tx.user.update({
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
    });
    await this.activity.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'USER_UPDATE',
      entity: 'user',
      entityId: id,
    });
    return toUserDto(user);
  }

  async setPin(ctx: AuthContext, id: string, pin: string): Promise<{ ok: true }> {
    const hash = await bcrypt.hash(pin, 10);
    await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const existing = await tx.user.findFirst({ where: { id, tenantId: ctx.tenantId } });
      if (!existing) throw new NotFoundException('Utilisateur introuvable');
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
}
