/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Vérification composite des tokens d'accès (JWKS ES256 + secours HS256)
 * @created 2026-09-07
 * @updated 2026-09-07
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { jwtVerify, type JWTVerifyGetKey } from 'jose';

export type AccessTokenVerifier = (token: string) => Promise<Record<string, unknown>>;

/**
 * Construit le vérificateur de tokens d'accès de l'API.
 *
 * Stratégie composite :
 *  1. **Primaire** — JWKS Supabase (clés asymétriques ES256, rotation native).
 *     C'est le chemin des tokens émis par Supabase Auth.
 *  2. **Secours** — HS256 avec `SUPABASE_JWT_SECRET`, uniquement si le primaire
 *     échoue ET que le secret symétrique est configuré. C'est le chemin des
 *     tokens PIN mintés par `AuthService.pinLogin` (poste partagé).
 *
 * Sécurité :
 *  - L'algorithme du secours est **explicitement épinglé à HS256** (`algorithms`),
 *    ce qui interdit `alg: none` et toute confusion d'algorithme.
 *  - **Fail-closed** : si le primaire échoue et qu'aucun secret HS256 n'est
 *    disponible, le token est rejeté (aucun chemin de contournement).
 */
export function createAccessTokenVerifier(
  jwks: JWTVerifyGetKey,
  hs256Secret: Uint8Array | null,
): AccessTokenVerifier {
  return async (token: string) => {
    try {
      const verified = await jwtVerify(token, jwks);
      return verified.payload as Record<string, unknown>;
    } catch {
      if (!hs256Secret) throw new Error('Token invalide');
      const verified = await jwtVerify(token, hs256Secret, { algorithms: ['HS256'] });
      return verified.payload as Record<string, unknown>;
    }
  };
}
