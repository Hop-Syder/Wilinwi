'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Contexte d'authentification : session (Supabase ou PIN) + permissions effectives
 */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ModuleKey, Plan, Role } from '@wilinwi/types';
import { getSupabase } from './supabase';
import { apiGet, clearPinToken, getPinToken, setPinToken } from './api';

export interface SessionUser {
  userId: string;
  email: string;
  tenantId: string;
  role: Role;
  plan: Plan;
  /** Modules effectivement accessibles (rôle ∩ overrides ∩ plan). */
  modules: ModuleKey[];
}

interface MeResponse {
  userId: string;
  email: string;
  tenantId: string;
  role: Role;
  plan: Plan;
  modules: ModuleKey[];
}

interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  /** Bascule de profil par PIN : stocke le jeton minté puis recharge la session. */
  loginWithPin: (accessToken: string) => Promise<void>;
}

const AuthCtx = createContext<AuthState>({
  user: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
  loginWithPin: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  /** Résout l'utilisateur courant depuis /api/auth/me (rôle + modules frais). */
  const resolve = useCallback(async () => {
    let hasSession = !!getPinToken();
    if (!hasSession) {
      const { data } = await getSupabase().auth.getSession();
      hasSession = !!data.session;
    }
    if (!hasSession) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await apiGet<MeResponse>('/api/auth/me');
      setUser({
        userId: me.userId,
        email: me.email,
        tenantId: me.tenantId,
        role: me.role,
        plan: me.plan,
        modules: me.modules ?? [],
      });
    } catch {
      clearPinToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void resolve();
    const { data: sub } = getSupabase().auth.onAuthStateChange(() => {
      void resolve();
    });
    return () => sub.subscription.unsubscribe();
  }, [resolve]);

  const signOut = async () => {
    clearPinToken();
    await getSupabase().auth.signOut();
    setUser(null);
  };

  const refreshUser = async () => {
    await resolve();
  };

  const loginWithPin = async (accessToken: string) => {
    setPinToken(accessToken);
    await resolve();
  };

  return (
    <AuthCtx.Provider value={{ user, loading, signOut, refreshUser, loginWithPin }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
