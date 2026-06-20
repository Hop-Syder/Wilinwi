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
  status: 'pending' | 'syncing' | 'synced' | 'error';
  error?: string;
  serverId?: string;
}

/** Produit mis en cache pour le fonctionnement hors-ligne du POS. */
export interface CachedProduct extends ProductDto {
  cachedAt: number;
}

/**
 * Base locale IndexedDB (§5.4). L'appareil sait toujours travailler seul ;
 * le serveur reste la source de vérité finale.
 */
export class WilinwiOfflineDB extends Dexie {
  pendingSales!: Table<PendingSale, string>;
  products!: Table<CachedProduct, string>;

  constructor() {
    super('wilinwi-offline');
    this.version(1).stores({
      pendingSales: 'id, status, createdAt',
      products: 'id, nom',
    });
  }
}

let _db: WilinwiOfflineDB | null = null;

/** Singleton paresseux — n'instancie IndexedDB que côté navigateur. */
export function getDB(): WilinwiOfflineDB {
  if (!_db) _db = new WilinwiOfflineDB();
  return _db;
}
