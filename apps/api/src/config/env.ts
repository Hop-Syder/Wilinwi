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

function decodeJwtRole(value: string): string | null {
  const [, payload] = value.split('.');
  if (!payload) return null;
  try {
    const json = Buffer.from(payload, 'base64url').toString('utf8');
    const decoded = JSON.parse(json) as { role?: unknown };
    return typeof decoded.role === 'string' ? decoded.role : null;
  } catch {
    return null;
  }
}

function looksLikeJwt(value: string): boolean {
  return value.split('.').length === 3;
}

/** Validation de l'environnement au démarrage (fail-fast). */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  /** Connexion du module plateforme via le rôle `wilinwi_admin` (seul habilité à
   *  appeler les fonctions cross-tenant `app.*`). Sépare le privilège admin du rôle
   *  applicatif public. Si absent, les routes /platform échouent (fail-closed). */
  ADMIN_DATABASE_URL: z.string().optional(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1)
    .refine((value) => decodeJwtRole(value) === 'service_role', {
      message: 'doit être la clé Supabase service_role, pas la clé anon',
    }),
  SUPABASE_JWT_SECRET: z.string().min(1).refine((value) => !looksLikeJwt(value), {
    message: 'doit être le JWT Secret brut Supabase, pas une clé anon/service_role',
  }),
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
