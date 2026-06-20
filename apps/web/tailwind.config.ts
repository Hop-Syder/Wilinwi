/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant Frontend Web : tailwind.config.ts
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import type { Config } from 'tailwindcss';
import preset from '@wilinwi/ui/tailwind-preset';

const config: Config = {
  presets: [preset],
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
};

export default config;
