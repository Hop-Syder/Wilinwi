'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Hook « stale-while-revalidate » : affiche instantanément la dernière
 *   réponse connue (IndexedDB) puis rafraîchit en arrière-plan → latence perçue nulle.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { readCache, writeCache } from '@wilinwi/offline';
import { useAuth } from './auth-context';

export interface CachedQuery<T> {
  /** Données affichables (cache d'abord, puis réseau). */
  data: T | null;
  /** true uniquement tant qu'AUCUNE donnée n'est dispo (ni cache ni réseau). */
  loading: boolean;
  /** Rafraîchissement réseau en cours alors que des données sont déjà affichées. */
  refreshing: boolean;
  error: Error | null;
  /** Relance le fetch réseau (à appeler après une mutation). */
  refetch: () => Promise<void>;
}

/**
 * @param key      Identifiant stable de la donnée (ex. 'dashboard', 'stock/products').
 *                 Passez `null` pour désactiver (ex. en attendant l'utilisateur).
 * @param fetcher  Fonction qui va chercher la donnée fraîche sur le réseau.
 */
export function useCachedQuery<T>(key: string | null, fetcher: () => Promise<T>): CachedQuery<T> {
  const { user } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Clé namespacée par tenant + utilisateur + établissement → isolation multi-tenant,
  // par rôle ET par établissement courant (le switch rafraîchit automatiquement
  // les données, sans collision de cache entre établissements).
  const scopedKey =
    key && user ? `${user.tenantId}:${user.userId}:${user.etablissementId ?? 'none'}:${key}` : null;

  // On garde le dernier fetcher sans relancer l'effet à chaque rendu.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async () => {
    if (!scopedKey) return;
    setRefreshing(true);
    setError(null);
    try {
      const fresh = await fetcherRef.current();
      setData(fresh);
      setLoading(false);
      void writeCache(scopedKey, fresh);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Erreur de chargement'));
      // On conserve les données du cache déjà affichées ; on cesse juste le « loading ».
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  }, [scopedKey]);

  useEffect(() => {
    if (!scopedKey) return;
    let cancelled = false;
    setLoading(true);
    setData(null);

    // 1) Affichage instantané depuis le cache local (n'écrase pas le réseau s'il arrive avant).
    void readCache<T>(scopedKey).then((cached) => {
      if (cancelled || cached === undefined) return;
      setData((prev) => (prev != null ? prev : cached));
      setLoading(false);
    });

    // 2) Revalidation réseau (source de vérité).
    void run();

    return () => {
      cancelled = true;
    };
  }, [scopedKey, run]);

  return { data, loading, refreshing, error, refetch: run };
}
