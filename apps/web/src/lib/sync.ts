'use client';

import { SyncEngine } from '@wilinwi/offline';
import { apiPost } from './api';

/** Instance unique du moteur de synchronisation offline. */
export const syncEngine = new SyncEngine((path, body) => apiPost(path, body));
