# Wilinwi — Guide du dépôt

> **Le système d'exploitation du commerce africain.** SaaS multi-tenant de gestion
> de commerce (POS · Stock · Pay · CRM · Market · Analytics · AI), vendu par
> abonnement. Voir `Wilinwi_Plan_Projet.docx` pour le cahier des charges complet.

Ce dépôt couvre **les fondations + MVP1 « Le Socle »** : vendre et suivre son stock
dès le premier jour, même hors-ligne.

## Architecture — monolithe modulaire

Un **seul backend** (NestJS) découpé en modules internes + **une seule base
PostgreSQL** (Supabase) protégée par **Row-Level Security**. **Deux frontends** Next.js :
le SaaS client (Hub + un onglet par module) et la **console super-admin séparée**.

```
apps/
  api/        NestJS — modules: auth, etablissement, stock, inventory, pos, crm, treasury,
              analytics, ai, sync, admin, warehouse, notifications, plans, platform
  web/        Next.js (App Router) :3000 — Hub + /pos /stock /dashboard /ventes /clients
              /tresorerie /entrepot /parametres  (SaaS client ; AUCUN code admin)
  admin-web/  Next.js (App Router) :3001 — console super-admin Nexus (/platform) + login dédié
packages:
  types/      Zod schemas + rôles/capacités + gating (source de vérité partagée)
  db/         Prisma schema + RLS (prisma/rls.sql) + fonctions plateforme (prisma/platform.sql)
              + verrou rôle admin (prisma/admin-role.sql.example) + seed + client withTenant()
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
- **Sécurité au niveau champ** : `prix_achat` (coût → marge) n'est JAMAIS renvoyé à
  SELLER/CASHIER/DELIVERY. En revanche `prix_plancher` EST visible par tous (donnée
  de négociation) — la vente sous le plancher reste refusée par le backend. Unique
  point de sortie des produits : [toProductDto()](apps/api/src/stock/product.mapper.ts).
  Idem pour le dashboard (bénéfice/valeur d'achat masqués).
- **Système à 4 prix** : `prixAchat ≤ prixPlancher ≤ prixCatalogue` (produit) +
  `prixReel` (par ligne de vente). Vente sous le plancher → **opération strictement refusée** 
  par le backend et l'UI (anti-fraude absolu, l'état PENDING_APPROVAL n'est plus actif).
- **Architecture de Stock Centralisé (Hub & Spoke)** : 
  - Les commandes fournisseurs sont réceptionnées **uniquement** dans un `Magasin` (Entrepôt central).
  - Le stock est tracé par localisation géographique via un modèle dédié (`ProductStock`), et non plus globalement.
  - L'approvisionnement des boutiques se fait via des transferts internes (**Dispatch**) depuis le Magasin.
- **Offline-first** : le POS enregistre en IndexedDB et synchronise via
  `POST /api/sync/sales` (idempotent par `clientGeneratedId`). Le serveur reste la
  source de vérité finale.
- **Assistant vocal Wilinwi AI** : couche d'interface au-dessus du système existant, jamais
  un accès direct — principe non négociable « Gemini propose, Wilinwi vérifie ». Chaîne :
  voix → transcription → Gemini (interprétation en intention structurée, schéma Zod
  **fermé** — [packages/types/src/ai.ts](packages/types/src/ai.ts)) → backend résout contre
  les données/permissions réelles → confirmation utilisateur explicite → seulement alors
  l'opération est enregistrée. Gemini n'écrit **jamais** en base lui-même ; `AiService`
  ([apps/api/src/ai/](apps/api/src/ai/)) ne fait que dispatcher vers les services de domaine
  existants (stock, ventes, dispatch), chacun avec sa propre vérification de capacité par
  intention (pas seulement au niveau de la route — plusieurs intentions partagent une même
  route). Capacité `ai:use`, module `AI` (réservé au plan ENTERPRISE ou add-on) — voir
  `ROLE_MODULES`/`CAP_MODULE` dans [roles.ts](packages/types/src/roles.ts).
- **Console plateforme (super-admin) + séparation** : l'exploitation du SaaS (entreprises,
  facturation, plans/tarifs, modules à la carte, métriques) vit dans `apps/admin-web` (app
  séparée) et le module `apps/api/src/platform`. Trois barrières **indépendantes** :
  1. **Identité** : allowlist `PLATFORM_ADMIN_EMAILS` → `ctx.isPlatformAdmin` ; routes gardées par
     `@PlatformAdmin` (`PlatformAdminGuard`).
  2. **Accès cross-tenant** : uniquement via des fonctions `SECURITY DEFINER` du schéma `app`
     ([packages/db/prisma/platform.sql](packages/db/prisma/platform.sql)), non exposées par PostgREST.
     Appelées avec le **client brut** (`$queryRaw`), jamais `forTenant`.
  3. **Verrou base** : ces fonctions sont **réservées au rôle `wilinwi_admin`** et **révoquées** au
     rôle public `wilinwi_app` (cf. [admin-role.sql.example](packages/db/prisma/admin-role.sql.example)).
     Le module plateforme se connecte via `ADMIN_DATABASE_URL` (`AdminPrismaService`) ; tout le reste
     de l'API garde `DATABASE_URL` (`PrismaService`, RLS). Exception : `app.current_tenant_id()` (helper
     RLS) reste exécutable par tous. Tarifs/limites pilotables → table `plan_configs` (lue par
     `PlanConfigService`, cache) ; modules « à la carte » par entreprise → `Tenant.moduleAddons`.
- **Authentification (double mécanisme)** : `AuthGuard` vérifie d'abord les tokens Supabase
  (**ES256**, clés asymétriques via le **JWKS distant** du projet — `createRemoteJWKSet`,
  rotation native) ; en cas d'échec il retombe sur **HS256** (`SUPABASE_JWT_SECRET`) — le chemin
  des tokens **PIN** mintés par `AuthService.pinLogin()` (bascule de profil sur poste partagé,
  jamais émis par Supabase donc jamais dans son JWKS). Voir
  [jwt-verifier.ts](apps/api/src/common/jwt-verifier.ts). Anti-bruteforce PIN **persistant en
  base** (`User.pinFailCount`/`pinLockedUntil`, pas en mémoire) via
  [pin-lock.ts](apps/api/src/auth/pin-lock.ts) — 5 échecs → verrou 60s.
- **Gating numérique & grand-père** : les limites par plan (`maxUsers`, `maxEtablissements`,
  `maxProducts`, `maxPhotos`) sont enforced côté serveur (services `auth`, `users`,
  `etablissement`, `stock`), sauf pour les tenants **grand-père** — `ctx.isGrandfathered`
  (calculé dans `AuthGuard` via [grandfather.ts](apps/api/src/common/grandfather.ts)) : vrai si
  le gating n'a jamais été activé globalement (`plan_configs.activated_at` NULL), si le tenant a
  été créé avant cette activation, ou si `Tenant.grandfatheredUntil` (override individuel) est
  dans le futur. Activation globale → `app.platform_set_gating_activated()` (SQL, synchronise
  `activated_at` sur les 4 plans en une transaction — ne jamais poser la date plan par plan).
  Cron horaire `BillingCronService` (`ENABLE_BILLING_CRON=true`) relance les impayés via
  `app.billing_run_overdue()`.

## Démarrer

```bash
pnpm install
cp .env.example .env            # renseigner Supabase + DATABASE_URL/DIRECT_URL

# Base de données (charger d'abord .env : `set -a && . ./.env && set +a`)
pnpm --filter @wilinwi/db exec prisma migrate dev --name init   # crée les tables
pnpm --filter @wilinwi/db exec prisma db execute --url "$DIRECT_URL" --file prisma/rls.sql  # RLS
pnpm --filter @wilinwi/db exec prisma db execute --url "$DIRECT_URL" --file prisma/platform.sql  # fonctions plateforme
pnpm --filter @wilinwi/db seed                                  # boutique démo

# Dev (API :4000, web :3000, admin-web :3001)
pnpm dev
```

### Console plateforme — rôle admin & verrou (important)

Le module `platform` exige le rôle `wilinwi_admin` (seul habilité aux fonctions `app.*`) :

1. Créer le rôle + appliquer le verrou : adapter `packages/db/prisma/admin-role.sql.example`
   (mot de passe), puis `prisma db execute --url "$DIRECT_URL" --file admin-role.sql`.
2. **`ADMIN_DATABASE_URL`** → rôle `wilinwi_admin` via le **pooler session (5432)**.
3. **`PLATFORM_ADMIN_EMAILS`** → e-mails autorisés à ouvrir `admin-web` (:3001).

Vérifier le verrou : `wilinwi_app` doit recevoir `permission denied` sur `app.platform_metrics()`,
tandis que `wilinwi_admin` l'exécute. La RLS reste vérifiée par `prisma/verify-isolation.ts`.

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
- Charte : `#0005ea` (bleu), `#00A86B` (vert), `#F59E0B` (orange) ; Inter/Poppins +
  DM Mono pour les chiffres (classe `.tabular`).

## Déjà livré au-delà du MVP1 « Socle »

Multi-établissements (entreprise → établissements + accès par employé), entrepôt &
approvisionnement (fournisseurs/dette, commandes, réception, **Dispatch**), stock par
emplacement (`ProductStock`), livraisons, **centre de notifications** in-app, et toute la
**console super-admin** : entreprises, facturation manuelle (échéances, dunning, paiement),
plans/tarifs/limites éditables (`plan_configs`), modules à la carte, métriques & audit cross-tenant.
**Gating numérique par plan + grand-père**, cron de relance d'impayés, et anti-bruteforce PIN
persistant (voir § Concepts clés), ainsi que l'**assistant vocal Wilinwi AI** (panier vocal en
caisse, questions vocales au dashboard, brouillons de réapprovisionnement — voir § Concepts
clés). Backend déployé sur **Render** (Blueprint
[render.yaml](render.yaml)), frontends sur **Vercel** — voir [README.md](README.md#☁️-déploiement)
pour la configuration détaillée.

## Hors périmètre (à venir)

**Passerelle de paiement** réelle pour les abonnements (FedaPay/Wave/CB + webhooks + cron
`PAST_DUE`) — différée, en attente de l'arbitrage prestataire. Market WhatsApp, fidélité,
app Flutter. Le découpage modulaire les anticipe sans réécriture.
