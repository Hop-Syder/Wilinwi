import type { Config } from 'tailwindcss';

/**
 * Preset Tailwind partagé — charte officielle Wilinwi (§1.5 / §11.2).
 * Couleurs porteuses de sens, à appliquer sur tout le produit.
 */
const preset: Omit<Config, 'content'> = {
  theme: {
    extend: {
      colors: {
        // Bleu profond — confiance, technologie, stabilité
        brand: {
          DEFAULT: '#12355B',
          50: '#eaf0f7',
          100: '#cddcec',
          200: '#9bb6d6',
          300: '#688fbf',
          400: '#3a6aa3',
          500: '#1f4d80',
          600: '#12355B',
          700: '#0f2c4c',
          800: '#0b2139',
          900: '#071626',
        },
        // Vert émeraude — croissance, argent, réussite
        emerald: {
          DEFAULT: '#00A86B',
          50: '#e6f7f0',
          100: '#c0ebd8',
          500: '#00A86B',
          600: '#008a58',
          700: '#006b45',
        },
        // Orange doré — commerce, énergie, Afrique
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
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
};

export default preset;
