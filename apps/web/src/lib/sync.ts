'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant Frontend Web : sync.ts
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { SyncEngine } from '@wilinwi/offline';
import { apiPost } from './api';

/** Instance unique du moteur de synchronisation offline. */
export const syncEngine = new SyncEngine((path, body) => apiPost(path, body));
