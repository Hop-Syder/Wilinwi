'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Contexte d'authentification : session (Supabase ou PIN) + permissions effectives
 */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  ACTIVE_DUNNING,
  type DunningState,
  type EtablissementInfrastructure,
  type EtablissementType,
  type ModuleKey,
  type Plan,
  type Role,
  type SubscriptionStatus,
} from '@wilinwi/types';
import { getSupabase } from './supabase';
import {
  apiGet,
  clearPinToken,
  getEtablissementId,
  getPinToken,
  setEtablissementId,
  setPinToken,
} from './api';

export interface SessionEtablissement {
  id: string;
  nom: string;
  type: EtablissementType;
  /** Infrastructure métier (TDR v2) — pilote les capacités de l'établissement.
   *  Optionnelle pour tolérer une réponse d'API antérieure (défaut : RETAIL). */
  infrastructure?: EtablissementInfrastructure;
}

export interface SessionUser {
  userId: string;
  email: string;
  nom?: string;
  tenantId: string;
  role: Role;
  plan: Plan;
  /** Modules effectivement accessibles (rôle ∩ overrides ∩ plan). */
  modules: ModuleKey[];
  boutiqueNom?: string;
  /** Localisation du siège (null tant que l'onboarding Pays & Ville n'est pas fait). */
  pays?: string | null;
  ville?: string | null;
  /** Établissement courant (résolu par le backend, borné à la liste autorisée). */
  etablissementId: string | null;
  /** Établissements accessibles (sélecteur). */
  etablissements: SessionEtablissement[];
  /** Statut d'abonnement + état de relance d'impayé (facturation). */
  subscriptionStatus: SubscriptionStatus;
  dunning: DunningState;
  /** Indique si l'utilisateur est un super-admin plateforme (Nexus super-admin). */
  isPlatformAdmin: boolean;
}

interface MeResponse {
  userId: string;
  email: string;
  tenantId: string;
  role: Role;
  plan: Plan;
  modules: ModuleKey[];
  etablissementId: string | null;
  etablissements?: SessionEtablissement[];
  subscriptionStatus?: SubscriptionStatus;
  dunning?: DunningState;
  isPlatformAdmin?: boolean;
  profile?: {
    nom: string;
    tenant?: {
      nom: string;
      pays?: string | null;
      ville?: string | null;
    };
  };
}

interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<SessionUser | null>;
  /** Bascule de profil par PIN : stocke le jeton minté puis recharge la session. */
  loginWithPin: (accessToken: string) => Promise<void>;
  /** Change l'établissement courant (switch instantané, sans reconnexion). */
  setEtablissement: (id: string) => Promise<void>;
}

const AuthCtx = createContext<AuthState>({
  user: null,
  loading: true,
  signOut: async () => { },
  refreshUser: async () => null,
  loginWithPin: async () => { },
  setEtablissement: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  /** Résout l'utilisateur courant depuis /api/auth/me (rôle + modules frais). */
  const resolve = useCallback(async (): Promise<SessionUser | null> => {
    let hasSession = !!getPinToken();
    if (!hasSession) {
      const { data } = await getSupabase().auth.getSession();
      hasSession = !!data.session;
    }
    if (!hasSession) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const me = await apiGet<MeResponse>('/api/auth/me');
      // Synchronise le localStorage avec l'établissement résolu côté serveur
      // (1ʳᵉ visite, ou si l'établissement stocké n'est plus accessible).
      const etabs = me.etablissements ?? [];
      const isOwner = me.role === 'OWNER';
      const canSeeAll = isOwner && etabs.length >= 2;
      const stored = getEtablissementId();
      const valid =
        (stored && etabs.some((e) => e.id === stored)) ||
        (stored === 'ALL' && canSeeAll);

      if (!valid) setEtablissementId(me.etablissementId);
      const nextUser: SessionUser = {
        userId: me.userId,
        email: me.email,
        nom: me.profile?.nom,
        tenantId: me.tenantId,
        role: me.role,
        plan: me.plan,
        modules: me.modules ?? [],
        boutiqueNom: me.profile?.tenant?.nom,
        pays: me.profile?.tenant?.pays ?? null,
        ville: me.profile?.tenant?.ville ?? null,
        etablissementId: valid ? stored : me.etablissementId,
        etablissements: etabs,
        subscriptionStatus: me.subscriptionStatus ?? 'ACTIVE',
        dunning: me.dunning ?? ACTIVE_DUNNING,
        isPlatformAdmin: me.isPlatformAdmin ?? false,
      };
      setUser(nextUser);
      return nextUser;
    } catch (e) {
      // Appareil révoqué / limite d'appareils : mémorise le motif pour le login.
      const err = e as { status?: number; message?: string };
      if (err?.status === 403 && err.message) {
        try {
          localStorage.setItem('wilinwi_auth_block', err.message);
        } catch {
          /* stockage indisponible : le motif est simplement perdu */
        }
      }
      clearPinToken();
      if (err?.status === 401 || err?.status === 403) {
        void getSupabase().auth.signOut();
      }
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void resolve();
    const { data: sub } = getSupabase().auth.onAuthStateChange((event) => {
      // Évite les boucles de requêtes infinies sur les événements passifs (ex: TOKEN_REFRESHED
      // déclenché par Supabase lors du changement de visibilité de l'onglet/fenêtre).
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        void resolve();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [resolve]);

  const signOut = async () => {
    clearPinToken();
    await getSupabase().auth.signOut();
    setUser(null);
  };

  const refreshUser = async () => {
    return await resolve();
  };

  const loginWithPin = async (accessToken: string) => {
    setPinToken(accessToken);
    await resolve();
  };

  /** Bascule instantanée d'établissement : on pose l'en-tête puis on recharge. */
  const setEtablissement = async (id: string) => {
    setEtablissementId(id);
    // Mise à jour optimiste pour un switch immédiat de l'UI.
    setUser((u) => (u ? { ...u, etablissementId: id } : u));
    await resolve();
  };

  return (
    <AuthCtx.Provider
      value={{ user, loading, signOut, refreshUser, loginWithPin, setEtablissement }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
