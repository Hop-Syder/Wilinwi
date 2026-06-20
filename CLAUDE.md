# Wilinwi — Guide du dépôt

> **Le système d'exploitation du commerce africain.** SaaS multi-tenant de gestion
> de commerce (POS · Stock · Pay · CRM · Market · Analytics · AI), vendu par
> abonnement. Voir `Wilinwi_Plan_Projet.docx` pour le cahier des charges complet.

Ce dépôt couvre **les fondations + MVP1 « Le Socle »** : vendre et suivre son stock
dès le premier jour, même hors-ligne.

## Architecture — monolithe modulaire

Un **seul backend** (NestJS) découpé en modules internes + **une seule base
PostgreSQL** (Supabase) protégée par **Row-Level Security**. Plusieurs frontends
possibles ; pour MVP1, une seule app Next.js avec une section par module + un
**Hub** (portail SSO) au-dessus.

```
apps/
  api/        NestJS — modules: auth, stock, inventory, pos, analytics, sync
  web/        Next.js (App Router) — Hub + sections /pos /stock /dashboard
packages/
  types/      Zod schemas + rôles/capacités + gating (source de vérité partagée)
  db/         Prisma schema + RLS (prisma/rls.sql) + seed + client withTenant()
  ui/         Design system Wilinwi (Tailwind preset + composants brandés)
  offline/    IndexedDB (Dexie) + file de synchronisation (SyncEngine)
```

## Concepts clés (à respecter)

- **Multi-tenant + RLS** : toute donnée porte `tenant_id`. Côté backend, **toute**
  opération passe par `PrismaService.forTenant(tenantId, tx => …)` qui ouvre une
  transaction avec `app.current_tenant_id` → la RLS isole les données. Ne jamais
  requêter en dehors de ce contexte.
- **5 rôles** (`OWNER/MANAGER/SELLER/CASHIER/DELIVERY`) → matrice de capacités dans
  [packages/types/src/roles.ts](packages/types/src/roles.ts). Les routes sont gardées
  par `@RequireCapabilities(...)` + `CapabilitiesGuard`.
- **Sécurité au niveau champ** : `prix_achat` et `prix_plancher` ne sont JAMAIS
  renvoyés à SELLER/CASHIER/DELIVERY. Unique point de sortie des produits :
  [toProductDto()](apps/api/src/stock/product.mapper.ts). Idem pour le dashboard
  (bénéfice/valeur d'achat masqués).
- **Système à 4 prix** : `prixAchat ≤ prixPlancher ≤ prixCatalogue` (produit) +
  `prixReel` (par ligne de vente). Vente sous le plancher → **preuve obligatoire +
  validation gérant** (`PriceOverride`, voir [sales.service.ts](apps/api/src/pos/sales.service.ts)).
- **Offline-first** : le POS enregistre en IndexedDB et synchronise via
  `POST /api/sync/sales` (idempotent par `clientGeneratedId`). Le serveur reste la
  source de vérité finale.

## Démarrer

```bash
pnpm install
cp .env.example .env            # renseigner Supabase + DATABASE_URL/DIRECT_URL

# Base de données (charger d'abord .env : `set -a && . ./.env && set +a`)
pnpm --filter @wilinwi/db exec prisma migrate dev --name init   # crée les tables
pnpm --filter @wilinwi/db exec prisma db execute --url "$DIRECT_URL" --file prisma/rls.sql  # RLS
pnpm --filter @wilinwi/db seed                                  # boutique démo

# Dev (API :4000, web :3000)
pnpm dev
```

### RLS & rôles de connexion (important)

Le rôle `postgres` du pooler Supabase **contourne la RLS**. Pour que les policies
soient un vrai garde-fou, l'app doit se connecter avec un rôle dédié **sans
`BYPASSRLS`** :

1. Créer le rôle une fois : adapter `packages/db/prisma/app-role.sql.example`
   (mot de passe), puis `prisma db execute --url "$DIRECT_URL" --file ...`.
2. **`DATABASE_URL`** (app) → rôle `wilinwi_app` via le **pooler en mode session
   (port 5432)** — les transactions interactives de `withTenant()` exigent le mode
   session, pas le mode transaction (6543).
3. **`DIRECT_URL`** (migrations) → reste sur le rôle `postgres` (propriétaire).

Vérifier l'isolation : `pnpm --filter @wilinwi/db exec tsx prisma/verify-isolation.ts`
(doit afficher « ✅ RLS ENFORCÉE »).

## Commandes

| Commande                           | Effet                             |
| ---------------------------------- | --------------------------------- |
| `pnpm dev`                         | API + web en watch                |
| `pnpm build`                       | Build de tout le monorepo (Turbo) |
| `pnpm typecheck`                   | Vérification de types             |
| `pnpm test`                        | Tests unitaires (Vitest)          |
| `pnpm --filter @wilinwi/db studio` | Prisma Studio                     |

## Conventions

- TypeScript partout. Validation des entrées avec **Zod** (`ZodValidationPipe` côté API).
- Montants en **FCFA** = entiers (pas de centimes).
- Les packages partagés `types`/`db` compilent en CommonJS (consommés par l'API
  Node) ; `ui`/`offline` sont transpilés par Next (`transpilePackages`).
- Charte : `#12355B` (bleu), `#00A86B` (vert), `#F59E0B` (orange) ; Inter/Poppins +
  DM Mono pour les chiffres (classe `.tabular`).

## Hors périmètre (MVP2/3)

Trésorerie, dettes avancées, fournisseurs, livraisons, Market WhatsApp, fidélité,
abonnements FedaPay, notifications, multi-boutiques, app Flutter, IA. Le découpage
modulaire les anticipe sans réécriture.
