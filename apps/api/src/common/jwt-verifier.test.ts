/**
 * Régression pinLogin ↔ AuthGuard.
 *
 * Le token PIN est minté en HS256 (secret symétrique) par `pinLogin`, mais
 * l'AuthGuard ne vérifie plus que via le JWKS Supabase (clés ES256). Ce test
 * reproduit le défaut de façon déterministe (aucun appel réseau, JWKS local)
 * puis valide la correction (vérification composite).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { createLocalJWKSet, exportJWK, generateKeyPair, jwtVerify, SignJWT } from 'jose';
import { createAccessTokenVerifier } from './jwt-verifier';

const secret = new TextEncoder().encode('super-secret-pin-jwt');

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const PIN_SUB = '00000000-0000-0000-0000-0000000000aa';
const SUPABASE_SUB = '00000000-0000-0000-0000-0000000000bb';

let jwks: ReturnType<typeof createLocalJWKSet>;
let hs256PinToken: string;
let es256SupabaseToken: string;

beforeAll(async () => {
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const publicJwk = await exportJWK(publicKey);
  publicJwk.alg = 'ES256';
  publicJwk.kid = 'test-key';
  jwks = createLocalJWKSet({ keys: [publicJwk] });

  hs256PinToken = await new SignJWT({
    email: 'seller@wilinwi.app',
    app_metadata: { tenant_id: TENANT_ID, role: 'SELLER' },
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(PIN_SUB)
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(secret);

  es256SupabaseToken = await new SignJWT({
    email: 'owner@wilinwi.app',
    app_metadata: { tenant_id: TENANT_ID, role: 'OWNER' },
  })
    .setProtectedHeader({ alg: 'ES256' })
    .setSubject(SUPABASE_SUB)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);
});

function b64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

describe('régression pinLogin vs AuthGuard', () => {
  it('reproduction — le chemin JWKS-only actuel REJETTE un JWT HS256 (PIN)', async () => {
    // Équivalent déterministe du `jwtVerify(token, this.jwks)` de l'AuthGuard
    // actuel : le résolveur ne fournit que des clés ES256, donc aucun clé ne
    // correspond à l'alg HS256 → rejet.
    await expect(jwtVerify(hs256PinToken, jwks)).rejects.toThrow();
  });

  it('correction — la vérification composite ACCEPTE le JWT HS256 via le secours épinglé', async () => {
    const verify = createAccessTokenVerifier(jwks, secret);
    const payload = await verify(hs256PinToken);
    expect(payload.sub).toBe(PIN_SUB);
    expect(payload.email).toBe('seller@wilinwi.app');
    expect(payload.app_metadata).toEqual({ tenant_id: TENANT_ID, role: 'SELLER' });
  });

  it('les tokens Supabase ES256 restent vérifiés par JWKS (primaire)', async () => {
    const verify = createAccessTokenVerifier(jwks, secret);
    const payload = await verify(es256SupabaseToken);
    expect(payload.sub).toBe(SUPABASE_SUB);
  });

  it("rejette alg:none (pas de confusion d'algorithme)", async () => {
    const verify = createAccessTokenVerifier(jwks, secret);
    const none = `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({ sub: 'x' })}.`;
    await expect(verify(none)).rejects.toThrow();
  });

  it('fail-closed — sans secret HS256, un JWT HS256 est rejeté quand le JWKS échoue', async () => {
    const verify = createAccessTokenVerifier(jwks, null);
    await expect(verify(hs256PinToken)).rejects.toThrow();
  });
});
