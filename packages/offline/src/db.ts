/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Gestionnaire de mode offline PWA : db.ts
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import Dexie, { type Table } from 'dexie';
import type { CreateSaleInput, ProductDto } from '@wilinwi/types';

/** Vente enregistrée localement, en attente de synchronisation. */
export interface PendingSale {
  /** clientGeneratedId — clé d'idempotence côté serveur. */
  id: string;
  payload: CreateSaleInput;
  createdAt: number;
  /**
   * pending/error = à (re)synchroniser ; syncing = en cours ; synced = confirmée ;
   * rejected = refusée par le serveur (erreur métier permanente) → PAS d'auto-retry.
   */
  status: 'pending' | 'syncing' | 'synced' | 'error' | 'rejected';
  error?: string;
  serverId?: string;
}

/** Produit mis en cache pour le fonctionnement hors-ligne du POS. */
export interface CachedProduct extends ProductDto {
  cachedAt: number;
}

/**
 * Entrée du cache générique « stale-while-revalidate » : on conserve la dernière
 * réponse connue d'un endpoint pour l'afficher instantanément au chargement suivant,
 * pendant qu'une requête réseau la rafraîchit en arrière-plan.
 */
export interface CacheEntry {
  key: string;
  value: unknown;
  cachedAt: number;
}

/**
 * Base locale IndexedDB (§5.4). L'appareil sait toujours travailler seul ;
 * le serveur reste la source de vérité finale.
 */
export class WilinwiOfflineDB extends Dexie {
  pendingSales!: Table<PendingSale, string>;
  products!: Table<CachedProduct, string>;
  cache!: Table<CacheEntry, string>;

  constructor() {
    super('wilinwi-offline');
    this.version(1).stores({
      pendingSales: 'id, status, createdAt',
      products: 'id, nom',
    });
    // v2 : ajout du cache générique des réponses d'API (Dexie migre automatiquement).
    this.version(2).stores({
      pendingSales: 'id, status, createdAt',
      products: 'id, nom',
      cache: 'key, cachedAt',
    });
    // v3 : cache local de session POS pour démarrage déconnecté.
    this.version(3).stores({
      pendingSales: 'id, status, createdAt',
      products: 'id, nom',
      cache: 'key, cachedAt',
      posSessions: 'id, etablissementId, status',
    });
  }
}

let _db: WilinwiOfflineDB | null = null;

/** Singleton paresseux — n'instancie IndexedDB que côté navigateur. */
export function getDB(): WilinwiOfflineDB {
  if (!_db) _db = new WilinwiOfflineDB();
  return _db;
}

/** Lit une valeur du cache générique. `undefined` si absente ou IndexedDB indisponible. */
export async function readCache<T>(key: string): Promise<T | undefined> {
  try {
    const entry = await getDB().cache.get(key);
    return entry ? (entry.value as T) : undefined;
  } catch {
    return undefined; // SSR / navigation privée / quota : on ignore silencieusement.
  }
}

/** Écrit (ou remplace) une valeur dans le cache générique. */
export async function writeCache<T>(key: string, value: T): Promise<void> {
  try {
    await getDB().cache.put({ key, value, cachedAt: Date.now() });
  } catch {
    /* IndexedDB indisponible / quota dépassé : sans gravité, le réseau reste la source. */
  }
}

/** Purge des entrées du cache (toutes, ou par préfixe — ex. au changement de tenant). */
export async function clearCache(prefix?: string): Promise<void> {
  try {
    if (!prefix) {
      await getDB().cache.clear();
      return;
    }
    const keys = await getDB().cache.where('key').startsWith(prefix).primaryKeys();
    await getDB().cache.bulkDelete(keys);
  } catch {
    /* sans gravité */
  }
}
