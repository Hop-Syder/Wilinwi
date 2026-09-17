# DEXTY — Mémoire Projet

> Généré automatiquement — Ne pas éditer manuellement
> @author @hopsyder | Nexus Partners

## 📌 Méta-projet

- **Nom** : Wilinwi
- **Type** : SaaS multi-tenant (POS · Stock · Pay · CRM · Livraisons · Analytics · Configuration)
- **Initialisé le** : 2026-06-19
- **Dernière mise à jour** : 2026-08-05

## 🛠️ Stack détectée

- **Frontend** : Next.js 15 (App Router) + React 19 + TailwindCSS 3
- **Backend** : NestJS 11 (monolithe modulaire : auth, stock, inventory, pos, crm, tresorerie, delivery, admin, sync)
- **Base de données** : Supabase (PostgreSQL) + Prisma ORM + RLS (Row-Level Security)
- **Mobile** : N/A (MVP1/MVP2 web PWA — app Flutter prévue en MVP3)
- **DevOps** : Turborepo (monorepo) + pnpm workspaces + GitHub Actions (`.github/`)
- **Paiements** : Mobile Money (MTN, Moov, Wave), FedaPay + Supabase Auth pour l'identité

## 🎯 Skills actifs pour ce projet

> Skills pré-sélectionnés à charger selon la tâche demandée

### Toujours disponibles (core)

- `senior-fullstack` — Architecture et fonctionnalités métier full-stack
- `clean-code` — Standards et qualité de code TypeScript
- `api-design-principles` — Conception API REST NestJS

### Frontend / UI

- `nextjs-best-practices` — Next.js 15 App Router, RSC, data fetching
- `react-best-practices` — Composants React 19, hooks, patterns
- `ui-ux-pro-max` — Design system Wilinwi (couleurs charte contextuelles, Inter/Poppins)
- `tailwind-design-system` — TailwindCSS preset + tokens de la charte

### Backend

- `nestjs-expert` — Modules NestJS, guards, pipes, interceptors
- `backend-dev-guidelines` — Architecture modules, DTOs, services
- `auth-implementation-patterns` — Supabase Auth + JWT + RBAC (5 rôles)
- `api-security-best-practices` — RLS, guards `@RequireCapabilities`, field-level security

### Base de données

- `prisma-expert` — Prisma schema, migrations, `withTenant()` pattern
- `supabase-automation` — RLS policies, Supabase client, realtime
- `database-design` — Schéma multi-tenant, `tenant_id` sur toutes les tables

### DevOps / CI-CD

- `cicd-automation-workflow-automate` — GitHub Actions (`.github/workflows/`)

### Tests

- `systematic-debugging` — Debug méthodique avant tout correctif
- `tdd-workflow` — Vitest (tests unitaires, API + web)

## 📁 Contexte projet

### Description

Wilinwi est le **système d'exploitation du commerce africain** : un SaaS multi-tenant de gestion de commerce (POS, Stock, Trésorerie, CRM, Livraisons, Analytics, Configuration) vendu par abonnement.

### Structure du monorepo

```
apps/
  api/        NestJS — modules: auth, stock, inventory, pos, crm, tresorerie, delivery, admin, sync
  web/        Next.js (App Router) — Hub + /pos /stock /entrepot /clients /tresorerie /livraisons /parametres
packages/
  types/      Zod schemas + rôles/capacités + gating (source de vérité partagée)
  db/         Prisma schema + RLS (prisma/rls.sql) + seed + client withTenant()
  ui/         Design system Wilinwi (Tailwind preset + composants brandés)
  offline/    IndexedDB (Dexie) + file de synchronisation (SyncEngine)
```

### Patterns architecturaux

- **Multi-tenant + RLS** : toute donnée porte `tenant_id`. Côté backend, **toute** opération passe par `PrismaService.forTenant(tenantId, tx => …)`.
- **RBAC à 5 rôles** : `OWNER / MANAGER / SELLER / CASHIER / DELIVERY` → matrice de capacités dans `packages/types/src/roles.ts`. Routes gardées par `@RequireCapabilities(...)` + `CapabilitiesGuard`.
- **Sécurité au niveau champ** : `prix_achat` et `prix_plancher` jamais renvoyés à SELLER/CASHIER/DELIVERY. Point de sortie unique : `toProductDto()` et `sale.mapper.ts`.
- **Système à 4 prix** : `prixAchat ≤ prixPlancher ≤ prixCatalogue` (produit) + `prixReel` (par ligne de vente). Vente sous le plancher → refusée strictement (anti-fraude).
- **Offline-first** : POS enregistre en IndexedDB (Dexie) + sync via `SyncEngine` (idempotent par `clientGeneratedId`).

### Conventions spéciales

- Montants en **FCFA** = entiers (pas de centimes)
- Charte couleurs contextuelle par module :
  - `/pos` ➔ Emerald (`bg-emerald-600`)
  - `/stock` ➔ Amber (`bg-amber-600`)
  - `/entrepot` ➔ Teal (`bg-teal-600`)
  - `/clients` ➔ Violet (`bg-violet-600`)
  - `/tresorerie` ➔ Rose (`bg-rose-600`)
  - `/livraisons` ➔ Amber (`bg-amber-600`)
  - `/parametres` ➔ Indigo (`bg-indigo-600`)
- Typographie : Inter/Poppins + DM Mono pour les chiffres (classe `.tabular`)
- TypeScript partout. Validation des entrées avec **Zod** (`ZodValidationPipe` côté API)

## ⚠️ Notes importantes

- **`DATABASE_URL`** doit pointer sur le rôle `wilinwi_app` via **pooler en mode session (port 5432)** — pas le mode transaction (6543).
- **`DIRECT_URL`** (migrations) → reste sur le rôle `postgres` (propriétaire) qui bypasse la RLS.
- Vérifier l'isolation RLS : `pnpm --filter @wilinwi/db exec tsx prisma/verify-isolation.ts` → doit afficher "✅ RLS ENFORCÉE".
- **[REFONTE CRM - 2026-08-04]** : Refonte UI/UX `/clients` (Violet) : Top cards KPIs, Annuaire, Carnet de dettes, Drawer slide-over 3 onglets, modale de remboursement et reçu thermique de dette.
- **[REFONTE TRÉSORERIE - 2026-08-04]** : Refonte UI/UX `/tresorerie` (Rose) : Cartes de solde multi-comptes, modale dépense OPEX, transferts neutres inter-comptes, pointage solde MoMo/Banque.
- **[REFONTE LIVRAISONS - 2026-08-05]** : Refonte UI/UX `/livraisons` (Amber) : 4 KPIs, Pipeline Kanban 4 colonnes, transmissions WhatsApp livreur pré-remplies, appel 1-clic et modale pointage COD livreur.
- **[REFONTE PARAMÈTRES - 2026-08-05]** : Refonte UI/UX `/parametres` (Indigo) : Tabs UI 5 onglets, branding reçu & live thermal preview, sécurité équipe & PIN 4 chiffres, établissements, journal d'audit CSV.
- **[AUDIT GLOBAL MVP2 - 2026-08-05]** : Audit 5 couches complété (RLS, RBAC, IndexedDB, NestJS API, Next.js UI) avec 0 erreur de typage (`tsc`) et 0 warning de linter (`eslint`).
