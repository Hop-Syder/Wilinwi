'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Console admin : appels API authentifiés par la session Supabase.
 *   Version épurée (pas de PIN ni d'établissement — l'admin n'en a pas besoin).
 * 🌐 ceo.nexuspartners.xyz
 */
// ──────────────────────────────────

import { getSupabase } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

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
  const {
    data: { session },
  } = await getSupabase().auth.getSession();
  const token = session?.access_token ?? null;

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

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
