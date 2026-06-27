/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant UI partagé (Design System) : tailwind-preset.ts
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import type { Config } from 'tailwindcss';

/**
 * Preset Tailwind partagé — charte officielle Wilinwi (§1.5 / §11.2).
 * Couleurs porteuses de sens, à appliquer sur tout le produit.
 */
const preset: Omit<Config, 'content'> = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
        },
        secondary: 'var(--color-secondary)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
        info: 'var(--color-info)',
        background: 'var(--background)',
        surface: {
          DEFAULT: 'var(--surface)',
          hover: 'var(--surface-hover)',
        },
        border: 'var(--border)',
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
        },
        // Bleu vibrant — confiance, technologie, stabilité (Legacy compatibility)
        brand: {
          DEFAULT: '#0005ea',
          50: '#e6e6ff',
          100: '#ccccff',
          200: '#9999ff',
          300: '#6666ff',
          400: '#3333ff',
          500: '#0000ff',
          600: '#0005ea',
          700: '#0004c8',
          800: '#0003b0',
          900: '#000290',
        },
        // Vert émeraude — croissance, argent, réussite (Legacy compatibility)
        emerald: {
          DEFAULT: '#00A86B',
          50: '#e6f7f0',
          100: '#c0ebd8',
          500: '#00A86B',
          600: '#008a58',
          700: '#006b45',
        },
        // Orange doré — commerce, énergie, Afrique (Legacy compatibility)
        gold: {
          DEFAULT: '#F59E0B',
          50: '#fef6e7',
          100: '#fde8c2',
          500: '#F59E0B',
          600: '#d4870a',
          700: '#a86a08',
        },
      },
      fontFamily: {
        // Inter / Poppins pour titres & interface ; DM Mono pour les chiffres.
        sans: ['var(--font-sans, Inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display, Poppins)', 'var(--font-sans, Inter)', 'sans-serif'],
        mono: ['var(--font-mono, "DM Mono")', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
    },
  },
  plugins: [],
};

export default preset;
