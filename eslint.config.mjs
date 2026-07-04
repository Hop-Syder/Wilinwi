/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Config ESLint partagée du monorepo (flat config, ESLint v9).
 *   Volontairement minimale et non stylistique : le formatage reste à l'éditeur,
 *   ESLint attrape les vrais problèmes (variables inutilisées, cas oubliés…).
 *   Chaque package lance `eslint src` — la résolution flat remonte jusqu'ici.
 * @created 2026-07-04
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/node_modules/**',
      '**/*.d.ts',
      '**/coverage/**',
      'packages/db/prisma/migrations/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Le code existant utilise `any` aux frontières (Prisma includes, DTO legacy) —
      // à resserrer progressivement, pas un gate aujourd'hui.
      '@typescript-eslint/no-explicit-any': 'off',
      // `_` = intentionnellement inutilisé (hooks de gating, params d'interface).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // Les modules NestJS utilisent des classes déclarées avant usage (décorateurs).
      '@typescript-eslint/no-use-before-define': 'off',
      // `require()` reste utilisé dans les configs Node (tailwind preset, etc.).
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
