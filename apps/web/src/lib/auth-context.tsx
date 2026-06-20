'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant Frontend Web : auth-context.tsx
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Plan, Role } from '@wilinwi/types';
import { getSupabase } from './supabase';

export interface SessionUser {
  userId: string;
  email: string;
  tenantId: string;
  role: Role;
  plan: Plan;
}

interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthCtx = createContext<AuthState>({
  user: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
});

function userFromClaims(payload: Record<string, unknown> | undefined): SessionUser | null {
  if (!payload) return null;
  const meta = (payload.app_metadata ?? {}) as Record<string, unknown>;
  if (!payload.sub || !meta.tenant_id) return null;
  return {
    userId: payload.sub as string,
    email: (payload.email as string) ?? '',
    tenantId: meta.tenant_id as string,
    role: (meta.role as Role) ?? 'SELLER',
    plan: (meta.plan as Plan) ?? 'FREE',
  };
}

function decodeJwt(token: string): Record<string, unknown> | undefined {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return undefined;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();

    const apply = (token?: string) => {
      setUser(token ? userFromClaims(decodeJwt(token)) : null);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => apply(data.session?.access_token));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) =>
      apply(session?.access_token),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await getSupabase().auth.signOut();
    setUser(null);
  };

  /**
   * Force un refresh du token Supabase pour que les nouveaux claims (plan, rôle)
   * soient reflétés dans le JWT sans avoir à se reconnecter.
   */
  const refreshUser = async () => {
    const supabase = getSupabase();
    const { data } = await supabase.auth.refreshSession();
    if (data.session?.access_token) {
      setUser(userFromClaims(decodeJwt(data.session.access_token)));
    }
  };

  return <AuthCtx.Provider value={{ user, loading, signOut, refreshUser }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
