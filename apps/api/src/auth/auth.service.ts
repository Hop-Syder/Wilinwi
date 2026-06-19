import {
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthContext, InviteUserInput, SignUpInput } from '@wilinwi/types';
import { PrismaService } from '../common/prisma.service';
import { SupabaseAdminService } from './supabase-admin.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseAdminService,
  ) {}

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

  /** Invitation d'un membre par un OWNER/MANAGER (capacité users:manage). */
  async inviteUser(ctx: AuthContext, input: InviteUserInput) {
    const tempPassword = randomUUID();
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

    return { userId };
  }

  /** Profil + contexte de l'utilisateur courant. */
  async me(ctx: AuthContext) {
    const user = await this.prisma.forTenant(ctx.tenantId, (tx) =>
      tx.user.findFirst({ where: { id: ctx.userId, tenantId: ctx.tenantId } }),
    );
    return { ...ctx, profile: user };
  }
}
