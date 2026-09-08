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
      // Échelle d'espacement/typographie du cahier des charges UI/UX
      // responsive : la config Tailwind par défaut la couvre déjà, aucun
      // token dédié à créer (évite une échelle parallèle qui dérive).
      //   Spacing (4/8/12/16/20/24/32/40/48/64) = p-1/p-2/p-3/p-4/p-5/p-6/p-8/p-10/p-12/p-16
      //   Titres mobiles (24–28px) = text-2xl(24)…text-3xl(30)
      //   Titres desktop (28–40px) = text-3xl(30)…text-4xl(36)
      //   Corps de texte (14–16px) = text-sm(14)/text-base(16)
      //
      // Breakpoint additif (ne remplace PAS sm/md/lg/xl/2xl — Tailwind
      // fusionne `extend.screens` avec les valeurs par défaut) pour le
      // « petit mobile » du cahier des charges (320–359px vs 360px+).
      screens: {
        xs: '360px',
      },
      // Largeur max du contenu principal (grand écran, cahier des charges §7/§27).
      maxWidth: {
        app: '1440px',
      },
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
      // Animations d'ouverture Modal/BottomSheet — 150–250ms (§34 : courtes,
      // jamais permanentes). `prefers-reduced-motion` déjà géré globalement
      // dans styles.css.
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { transform: 'translateY(16px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          from: { transform: 'scale(0.96)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 200ms ease-out',
        'scale-in': 'scale-in 150ms ease-out',
      },
    },
  },
  plugins: [],
};

export default preset;
