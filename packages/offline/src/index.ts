/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Gestionnaire de mode offline PWA : index.ts
 * @created 2026-06-20
 * @updated 2026-09-08
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

export {
  getDB,
  WilinwiOfflineDB,
  readCache,
  writeCache,
  clearCache,
  type PendingSale,
  type CachedProduct,
  type CacheEntry,
} from './db.js';
export {
  SyncEngine,
  applySyncResults,
  chunkForSync,
  MAX_SYNC_BATCH,
  type SyncResult,
} from './sync.js';
