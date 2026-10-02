/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Service métier pour supabase-admin
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 nexus-partners.xyz
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
   * collaborateur définit son mot de passe à la 1ʳᵉ connexion. Renvoie son id.
   *
   * NB : on n'appelle PAS `generateLink()` en plus — chez Supabase, chaque génération
   * de lien de confirmation écrase la précédente pour cet utilisateur, ce qui
   * invaliderait le lien qui vient d'être envoyé dans l'email par `inviteUserByEmail`.
   */
  async inviteByEmail(email: string): Promise<{ id: string }> {
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

    return { id: inviteData.user.id };
  }

  /** Recherche un compte auth par email (insensible à la casse, paginé). */
  async findUserByEmail(email: string): Promise<{ id: string } | null> {
    const target = email.trim().toLowerCase();
    const perPage = 1000;
    for (let page = 1; page <= 10; page++) {
      const { data, error } = await this.client.auth.admin.listUsers({ page, perPage });
      if (error || !data?.users) return null;
      const found = data.users.find((u) => (u.email ?? '').toLowerCase() === target);
      if (found) return { id: found.id };
      if (data.users.length < perPage) break;
    }
    return null;
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

  /** Redéfinit le mot de passe d'un compte auth existant (récupération doublon). */
  async updatePassword(userId: string, password: string): Promise<void> {
    const { error } = await this.client.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    if (error) throw new Error(`Mise à jour du mot de passe échouée: ${error.message}`);
  }

  async deleteUser(userId: string): Promise<void> {
    await this.client.auth.admin.deleteUser(userId);
  }

  /** Définit un nouveau mot de passe (réinitialisation par le super-admin). */
  async setPassword(userId: string, password: string): Promise<void> {
    const { error } = await this.client.auth.admin.updateUserById(userId, { password });
    if (error) throw new Error(`Réinitialisation du mot de passe échouée: ${error.message}`);
  }
}
