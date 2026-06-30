'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Console admin : contexte d'auth (session Supabase → /api/auth/me).
 *   N'expose que ce dont la console a besoin : identité + drapeau super-admin.
 * 🌐 ceo.nexuspartners.xyz
 */
// ──────────────────────────────────

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getSupabase } from './supabase';
import { apiGet } from './api';

export interface AdminUser {
  userId: string;
  email: string;
  isPlatformAdmin: boolean;
}

interface MeResponse {
  userId: string;
  email: string;
  isPlatformAdmin?: boolean;
}

interface AuthState {
  user: AdminUser | null;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const resolve = useCallback(async () => {
    const { data } = await getSupabase().auth.getSession();
    if (!data.session) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await apiGet<MeResponse>('/api/auth/me');
      setUser({
        userId: me.userId,
        email: me.email,
        isPlatformAdmin: me.isPlatformAdmin ?? false,
      });
    } catch {
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
    await getSupabase().auth.signOut();
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, signOut, refreshUser: resolve }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
