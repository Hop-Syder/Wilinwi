/**
 * Lint du Design System UI (React/TSX, DOM navigateur).
 * Réutilise la config partagée de la racine.
 */
import { wilinwiConfig } from '../../eslint.base.mjs';

export default wilinwiConfig({ browser: true });
