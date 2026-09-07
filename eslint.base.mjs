/**
 * Configuration ESLint partagée du monorepo Wilinwi (flat config, ESLint 9).
 *
 * Ce fichier est un *module partagé* importé par chaque `eslint.config.mjs` de
 * package (il n'est volontairement PAS nommé `eslint.config.*` pour ne pas être
 * auto-découvert par ESLint et ainsi ne pas « fuiter » dans apps/web / apps/admin-web
 * qui gèrent encore leur lint via `next lint`).
 *
 * Socle volontairement « correct mais silencieux » :
 *  - `@eslint/js` recommended : règles JS de base.
 *  - `typescript-eslint` recommended : règles TypeScript de base.
 *  - Pas de règles stylistiques : le formatage est délégué à Prettier
 *    (cf. .prettierrc.json), conformément à la doctrine du dépôt.
 *
 * Le lint « type-checké » (recommendedTypeChecked / project) est volontairement
 * absent : il imposerait `parserOptions.project` + des `include` tsconfig stricts,
 * ce qui créerait une friction inutile (fichiers de test exclus des tsconfig, etc.).
 *
 * Chaque package déclare une fine `eslint.config.mjs` qui appelle `wilinwiConfig`.
 */
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * @param {object} [options]
 * @param {boolean} [options.browser=false] Ajoute les globals navigateur (DOM, etc.)
 * @param {string[]} [options.ignores=[]] Patterns d'ignorés additionnels.
 */
export function wilinwiConfig({ browser = false, ignores = [] } = {}) {
  return tseslint.config(
    {
      // Dossiers jamais lintés (build, dépendances, coverage, sorties Next).
      ignores: ['dist/**', 'node_modules/**', 'coverage/**', '.next/**', 'build/**', ...ignores],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
      languageOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        globals: {
          // Tous les workspaces ciblés s'exécutent côté serveur ou en build Node ;
          // les packages navigateur ajoutent `browser: true` pour le DOM.
          ...globals.node,
          ...(browser ? globals.browser : {}),
        },
      },
      rules: {
        // Convention du dépôt : `_` préfixé = valeur volontairement inutilisée
        // (ex. `_db` singleton paresseux, `_cout`/`_plancher` écartés via le reste
        // d'une destructuration). On tolère ces identifiants pour ne pas polluer le
        // code de `eslint-disable` sur un idiome assumé.
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            destructuredArrayIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_',
            ignoreRestSiblings: true,
          },
        ],
      },
    },
  );
}
