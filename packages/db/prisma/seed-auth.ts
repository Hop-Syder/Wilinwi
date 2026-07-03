/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Helper partagé des seeds : création/alignement d'un compte
 *   Supabase Auth (API admin GoTrue en fetch, sans dépendance) avec les claims
 *   app_metadata { tenant_id, role, plan } exigés par l'AuthGuard de l'API.
 * @created 2026-07-02
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

export function hasSupabaseEnv(): boolean {
  return !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function supabaseEnv(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis (charger .env : `set -a && . ./.env && set +a`).',
    );
  }
  return { url: url.replace(/\/$/, ''), key };
}

async function adminFetch(path: string, init?: RequestInit): Promise<Response> {
  const { url, key } = supabaseEnv();
  return fetch(`${url}/auth/v1${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
}

/** Cherche un compte auth par email (pagination de l'API admin). */
async function findAuthUserByEmail(email: string): Promise<string | null> {
  for (let page = 1; page <= 20; page++) {
    const res = await adminFetch(`/admin/users?page=${page}&per_page=100`);
    if (!res.ok) throw new Error(`Liste des comptes auth échouée: HTTP ${res.status}`);
    const body = (await res.json()) as { users?: Array<{ id: string; email?: string }> };
    const users = body.users ?? [];
    const match = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match.id;
    if (users.length < 100) return null;
  }
  return null;
}

export interface AuthClaims {
  tenantId: string;
  role: string;
  plan: string;
}

/**
 * Crée (ou récupère) le compte auth confirmé, aligne mot de passe ET
 * app_metadata { tenant_id, role, plan } — sans tenant_id dans le JWT,
 * l'API répond 401 « Profil utilisateur incomplet ».
 */
export async function ensureAuthUser(
  email: string,
  password: string,
  claims: AuthClaims,
): Promise<string> {
  const app_metadata = { tenant_id: claims.tenantId, role: claims.role, plan: claims.plan };
  const res = await adminFetch('/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password, email_confirm: true, app_metadata }),
  });
  if (res.ok) {
    const body = (await res.json()) as { id: string };
    return body.id;
  }

  // Compte déjà existant → on le retrouve et on (ré)aligne mot de passe + claims.
  const existingId = await findAuthUserByEmail(email);
  if (!existingId) {
    const detail = await res.text();
    throw new Error(`Création du compte auth échouée (HTTP ${res.status}): ${detail}`);
  }
  const upd = await adminFetch(`/admin/users/${existingId}`, {
    method: 'PUT',
    body: JSON.stringify({ password, email_confirm: true, app_metadata }),
  });
  if (!upd.ok) throw new Error(`Mise à jour du compte auth échouée: HTTP ${upd.status}`);
  return existingId;
}
