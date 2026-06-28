/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Service métier pour supabase-admin
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import type { Plan, Role } from '@wilinwi/types';

/** Opérations d'administration Supabase Auth (service role). */
@Injectable()
export class SupabaseAdminService {
  private readonly client: SupabaseClient;

  constructor(private readonly config: ConfigService) {
    this.client = createClient(
      config.getOrThrow<string>('SUPABASE_URL'),
      config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
      {
        auth: { autoRefreshToken: false, persistSession: false },
        // Node < 22 n'a pas de WebSocket natif ; on fournit `ws` (realtime non utilisé).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        realtime: { transport: WebSocket as any },
      },
    );
  }

  /** Crée un compte auth confirmé et renvoie son id. */
  async createUser(email: string, password: string): Promise<string> {
    const { data, error } = await this.client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) {
      throw new Error(`Création du compte échouée: ${error?.message ?? 'inconnue'}`);
    }
    return data.user.id;
  }

  /**
   * Invite un collaborateur par email : Supabase crée le compte (sans mot de passe)
   * et envoie un email d'invitation pointant vers la page `/set-password` où le
   * collaborateur définit son mot de passe à la 1ʳᵉ connexion. Renvoie son id et le lien.
   */
  async inviteByEmail(email: string): Promise<{ id: string; link?: string }> {
    const base = (this.config.get<string>('WEB_BASE_URL') ?? 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
    const { data: inviteData, error: inviteError } = await this.client.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${base}/set-password`,
    });
    if (inviteError || !inviteData.user) {
      throw new Error(`Invitation par email échouée: ${inviteError?.message ?? 'inconnue'}`);
    }

    let link: string | undefined;
    try {
      const { data: linkData, error: linkError } = await this.client.auth.admin.generateLink({
        type: 'invite',
        email,
        options: {
          redirectTo: `${base}/set-password`,
        },
      });
      if (!linkError && linkData?.properties?.action_link) {
        link = linkData.properties.action_link;
      }
    } catch {
      // Ignorer si la génération échoue
    }

    return { id: inviteData.user.id, link };
  }

  /** Injecte tenant_id/role/plan dans app_metadata → présents dans le JWT (SSO). */
  async setClaims(
    userId: string,
    claims: { tenantId: string; role: Role; plan: Plan },
  ): Promise<void> {
    const { error } = await this.client.auth.admin.updateUserById(userId, {
      app_metadata: { tenant_id: claims.tenantId, role: claims.role, plan: claims.plan },
    });
    if (error) throw new Error(`Mise à jour des claims échouée: ${error.message}`);
  }

  async deleteUser(userId: string): Promise<void> {
    await this.client.auth.admin.deleteUser(userId);
  }
}
