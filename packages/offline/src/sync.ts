/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Gestionnaire de mode offline PWA : sync.ts
 * @created 2026-06-20
 * @updated 2026-09-08
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import type { Table } from 'dexie';
import type { CreateSaleInput, SyncSaleResultRow } from '@wilinwi/types';
import { getDB, type CachedProduct, type PendingSale } from './db.js';

export interface SyncResult {
  synced: number;
  failed: number;
  remaining: number;
}

type Poster = (path: string, body: unknown) => Promise<unknown>;

/** Taille max d'un lot accepté par POST /api/sync/sales (SyncBatchSchema côté API). */
export const MAX_SYNC_BATCH = 200;

/**
 * Découpe la file en lots acceptables par le serveur. Au-delà de la limite, la
 * validation du lot entier échouerait en bloc et bloquerait TOUTE la file en
 * re-tentes infinies — chaque tranche vit et échoue indépendamment.
 */
export function chunkForSync<T>(items: T[], max: number = MAX_SYNC_BATCH): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += max) chunks.push(items.slice(i, i + max));
  return chunks;
}

/**
 * Applique les résultats serveur à la file locale (sémantique du protocole de sync) :
 *  - ok          → 'synced' + serverId ;
 *  - permanent   → 'rejected' + raison (error, kind) : exclu de l'auto-retry, demande
 *                  une action de l'utilisateur (écarter / corriger) ;
 *  - transitoire → 'error' : re-tenté au prochain flush.
 * Idempotent : rejouer les mêmes résultats ne change pas l'état déjà posé, et les
 * ventes inconnues (id absent du lot) ou sans clientGeneratedId sont ignorées.
 * Aucune vente n'est supprimée : un rejet reste consultable et corrigeable.
 */
export async function applySyncResults(
  table: Table<PendingSale, string>,
  pending: PendingSale[],
  results: SyncSaleResultRow[],
): Promise<{ synced: number; failed: number }> {
  let synced = 0;
  let failed = 0;
  for (const r of results) {
    if (!r.clientGeneratedId) continue;
    const local = pending.find((s) => s.id === r.clientGeneratedId);
    if (!local) continue;
    if (r.ok) {
      await table.update(local.id, { status: 'synced', serverId: r.id });
      synced++;
    } else {
      await table.update(local.id, {
        status: r.permanent ? 'rejected' : 'error',
        error: r.error,
        kind: r.kind,
      });
      failed++;
    }
  }
  return { synced, failed };
}

/**
 * Moteur de synchronisation offline. Met en file les ventes créées hors-ligne
 * et vide la file vers l'API quand le réseau revient. Idempotent grâce au
 * clientGeneratedId porté par chaque vente.
 */
export class SyncEngine {
  constructor(private readonly post: Poster) {}

  /** Enregistre une vente localement (toujours, même en ligne) puis tente la sync. */
  async enqueueSale(payload: CreateSaleInput): Promise<PendingSale> {
    const id = payload.clientGeneratedId ?? crypto.randomUUID();
    const sale: PendingSale = {
      id,
      payload: { ...payload, clientGeneratedId: id },
      createdAt: Date.now(),
      status: 'pending',
    };
    await getDB().pendingSales.put(sale);
    return sale;
  }

  /** Nombre d'opérations en attente (pour l'indicateur d'UI). */
  async pendingCount(): Promise<number> {
    return getDB().pendingSales.where('status').anyOf('pending', 'error').count();
  }

  /** Nombre de ventes en échec transitoire (re-tentées automatiquement). */
  async failedCount(): Promise<number> {
    return getDB().pendingSales.where('status').equals('error').count();
  }

  /** Nombre de ventes refusées par le serveur (action utilisateur requise). */
  async rejectedCount(): Promise<number> {
    return getDB().pendingSales.where('status').equals('rejected').count();
  }

  /** Statut courant d'une vente locale (retour visuel par vente). */
  async getSale(id: string): Promise<PendingSale | undefined> {
    return getDB().pendingSales.get(id);
  }

  /** Ventes en échec transitoire (file d'erreurs consultable). */
  async failedSales(): Promise<PendingSale[]> {
    return getDB().pendingSales.where('status').equals('error').toArray();
  }

  /** Ventes refusées (permanentes) — à écarter ou corriger par l'utilisateur. */
  async rejectedSales(): Promise<PendingSale[]> {
    return getDB().pendingSales.where('status').equals('rejected').toArray();
  }

  /** Écarte définitivement une vente locale (supprime de la file). */
  async discard(id: string): Promise<void> {
    await getDB().pendingSales.delete(id);
  }

  /** Ventes déjà synchronisées : purge possible pour ne pas faire grossir IndexedDB. */
  async clearSynced(): Promise<void> {
    await getDB().pendingSales.where('status').equals('synced').delete();
  }

  /** Vide la file vers le serveur. À appeler au retour du réseau. */
  async flush(): Promise<SyncResult> {
    const db = getDB();
    const pending = await db.pendingSales.where('status').anyOf('pending', 'error').toArray();
    if (pending.length === 0) return { synced: 0, failed: 0, remaining: 0 };

    let synced = 0;
    let failed = 0;
    for (const chunk of chunkForSync(pending)) {
      await db.pendingSales.bulkPut(chunk.map((s) => ({ ...s, status: 'syncing' as const })));
      try {
        const res = (await this.post('/api/sync/sales', {
          sales: chunk.map((s) => s.payload),
        })) as { results?: SyncSaleResultRow[] };
        if (!res.results) throw new Error('Réponse de synchronisation invalide');
        const applied = await applySyncResults(db.pendingSales, chunk, res.results);
        synced += applied.synced;
        failed += applied.failed;
      } catch {
        // Réseau toujours indisponible (ou réponse invalide) : on remet CE lot en
        // attente pour réessayer ; les lots déjà confirmés restent 'synced'.
        await db.pendingSales.bulkPut(chunk.map((s) => ({ ...s, status: 'pending' as const })));
        failed += chunk.length;
      }
    }

    return { synced, failed, remaining: await this.pendingCount() };
  }

  /** Met en cache le catalogue pour la vente hors-ligne. */
  async cacheProducts(products: Omit<CachedProduct, 'cachedAt'>[]): Promise<void> {
    const now = Date.now();
    await getDB().products.bulkPut(products.map((p) => ({ ...p, cachedAt: now })));
  }

  async cachedProducts(): Promise<CachedProduct[]> {
    return getDB().products.toArray();
  }
}
