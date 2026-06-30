/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant Backend API : env.ts
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { z } from 'zod';

/** Validation de l'environnement au démarrage (fail-fast). */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),
  /** Connexion du module plateforme via le rôle `wilinwi_admin` (seul habilité à
   *  appeler les fonctions cross-tenant `app.*`). Sépare le privilège admin du rôle
   *  applicatif public. Si absent, les routes /platform échouent (fail-closed). */
  ADMIN_DATABASE_URL: z.string().optional(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(1),
  /** Origines autorisées par CORS (séparées par des virgules). Vide = permissif. */
  CORS_ORIGINS: z.string().optional(),
  /** URL de base du frontend (lien d'invitation → /set-password). Déf. localhost:3000. */
  WEB_BASE_URL: z.string().url().optional(),
  /** Allowlist des emails d'administration plateforme, séparés par des virgules. */
  PLATFORM_ADMIN_EMAILS: z.string().default(''),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = EnvSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(
      `Configuration d'environnement invalide:\n${parsed.error.issues
        .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
        .join('\n')}`,
    );
  }
  return parsed.data;
}
