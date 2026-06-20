'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant Frontend Web : api.ts
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { getSupabase } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// ─── Jeton de session PIN (poste partagé) — prioritaire sur la session Supabase ───
const PIN_TOKEN_KEY = 'wilinwi_pin_token';

function jwtExp(token: string): number {
  try {
    const p = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof p.exp === 'number' ? p.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

export function setPinToken(token: string): void {
  if (typeof window !== 'undefined') localStorage.setItem(PIN_TOKEN_KEY, token);
}
export function clearPinToken(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(PIN_TOKEN_KEY);
}
export function getPinToken(): string | null {
  if (typeof window === 'undefined') return null;
  const t = localStorage.getItem(PIN_TOKEN_KEY);
  if (t && jwtExp(t) > Date.now()) return t;
  if (t) localStorage.removeItem(PIN_TOKEN_KEY); // expiré → purge
  return null;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

/** Appel à l'API Wilinwi avec le JWT Supabase courant en Authorization. */
export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  // Priorité au jeton PIN (poste partagé) ; sinon session Supabase.
  let token = getPinToken();
  if (!token) {
    const {
      data: { session },
    } = await getSupabase().auth.getSession();
    token = session?.access_token ?? null;
  }

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const body = res.status === 204 ? null : await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(res.status, (body?.message as string) ?? res.statusText, body);
  }
  return body as T;
}

export const apiGet = <T>(path: string) => api<T>(path);
export const apiPost = <T>(path: string, data: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(data) });
export const apiPatch = <T>(path: string, data: unknown) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(data) });

export { API_URL };
