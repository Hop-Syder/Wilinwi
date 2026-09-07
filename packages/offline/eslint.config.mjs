/**
 * Lint du package offline PWA (IndexedDB/Dexie, DOM navigateur).
 * Réutilise la config partagée de la racine.
 */
import { wilinwiConfig } from '../../eslint.base.mjs';

export default wilinwiConfig({ browser: true });
