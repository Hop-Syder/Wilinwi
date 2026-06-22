/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Gestionnaire de mode offline PWA : sync.ts
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import type { CreateSaleInput } from '@wilinwi/types';
import { getDB, type CachedProduct, type PendingSale } from './db.js';

export interface SyncResult {
  synced: number;
  failed: number;
  remaining: number;
}

type Poster = (path: string, body: unknown) => Promise<unknown>;

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

    await db.pendingSales.bulkPut(pending.map((s) => ({ ...s, status: 'syncing' as const })));

    let synced = 0;
    let failed = 0;
    try {
      const res = (await this.post('/api/sync/sales', {
        sales: pending.map((s) => s.payload),
      })) as {
        results: {
          clientGeneratedId?: string;
          ok: boolean;
          id?: string;
          error?: string;
          permanent?: boolean;
        }[];
      };

      for (const r of res.results) {
        const local = pending.find((s) => s.id === r.clientGeneratedId);
        if (!local) continue;
        if (r.ok) {
          await db.pendingSales.update(local.id, { status: 'synced', serverId: r.id });
          synced++;
        } else {
          // Échec permanent (validation serveur) → 'rejected' : exclu de l'auto-retry,
          // demande une action de l'utilisateur (écarter / corriger).
          await db.pendingSales.update(local.id, {
            status: r.permanent ? 'rejected' : 'error',
            error: r.error,
          });
          failed++;
        }
      }
    } catch (err) {
      // Réseau toujours indisponible : on remet en attente pour réessayer.
      await db.pendingSales.bulkPut(pending.map((s) => ({ ...s, status: 'pending' as const })));
      failed = pending.length;
      void err;
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
