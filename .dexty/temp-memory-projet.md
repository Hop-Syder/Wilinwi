# DEXTY — Mémoire Projet

> Généré automatiquement — Ne pas éditer manuellement
> @author @hopsyder | Nexus Partners

## 📌 Méta-projet

- **Nom** : Wilinwi
- **Type** : SaaS multi-tenant (POS · Stock · Pay · CRM · Analytics)
- **Initialisé le** : 2026-06-19
- **Dernière mise à jour** : 2026-08-03

## 🛠️ Stack détectée

- **Frontend** : Next.js 15 (App Router) + React 19 + TailwindCSS 3
- **Backend** : NestJS 11 (monolithe modulaire : auth, stock, inventory, pos, analytics, sync)
- **Base de données** : Supabase (PostgreSQL) + Prisma ORM + RLS (Row-Level Security)
- **Mobile** : N/A (MVP1 — app Flutter prévue en MVP3)
- **DevOps** : Turborepo (monorepo) + pnpm workspaces + GitHub Actions (`.github/`)
- **IA/ML** : N/A (prévu MVP3)
- **Paiements** : FedaPay (prévu MVP2) + Supabase Auth pour l'identité

## 🎯 Skills actifs pour ce projet

> Skills pré-sélectionnés à charger selon la tâche demandée

### Toujours disponibles (core)

- `senior-fullstack` — Architecture et fonctionnalités métier full-stack
- `clean-code` — Standards et qualité de code TypeScript
- `api-design-principles` — Conception API REST NestJS

### Frontend / UI

- `nextjs-best-practices` — Next.js 15 App Router, RSC, data fetching
- `react-best-practices` — Composants React 19, hooks, patterns
- `ui-ux-pro-max` — Design system Wilinwi (couleurs charte, Inter/Poppins)
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

Wilinwi est le **système d'exploitation du commerce africain** : un SaaS multi-tenant de gestion de commerce (POS, Stock, Pay, CRM, Market, Analytics, IA) vendu par abonnement. L'objectif du MVP1 (« Le Socle ») est de permettre de vendre et de suivre son stock dès le premier jour, même hors-ligne.

### Structure du monorepo

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

### Patterns architecturaux

- **Multi-tenant + RLS** : toute donnée porte `tenant_id`. Côté backend, **toute** opération passe par `PrismaService.forTenant(tenantId, tx => …)`.
- **RBAC à 5 rôles** : `OWNER / MANAGER / SELLER / CASHIER / DELIVERY` → matrice de capacités dans `packages/types/src/roles.ts`. Routes gardées par `@RequireCapabilities(...)` + `CapabilitiesGuard`.
- **Sécurité au niveau champ** : `prix_achat` et `prix_plancher` jamais renvoyés à SELLER/CASHIER/DELIVERY. Point de sortie unique : `toProductDto()` dans `apps/api/src/stock/product.mapper.ts`.
- **Système à 4 prix** : `prixAchat ≤ prixPlancher ≤ prixCatalogue` (produit) + `prixReel` (par ligne de vente). Vente sous le plancher → preuve obligatoire + validation gérant (`PriceOverride`).
- **Offline-first** : POS enregistre en IndexedDB (Dexie) + sync via `POST /api/sync/sales` (idempotent par `clientGeneratedId`).

### Conventions spéciales

- Montants en **FCFA** = entiers (pas de centimes)
- Charte couleurs : `#12355B` (bleu) · `#00A86B` (vert) · `#F59E0B` (orange)
- Typographie : Inter/Poppins + DM Mono pour les chiffres (classe `.tabular`)
- TypeScript partout. Validation des entrées avec **Zod** (`ZodValidationPipe` côté API)
- Packages `types`/`db` compilent en CommonJS ; `ui`/`offline` transpilés par Next

### Dépendances critiques

- `@nestjs/*` ^11 — Backend NestJS
- `next` ^15.1.6 + `react` ^19 — Frontend
- `@supabase/supabase-js` ^2.48 — Auth + RLS
- `prisma` / `@prisma/client` — ORM + migrations
- `zod` ^3.24 — Validation schemas partagés (packages/types)
- `dexie` — IndexedDB offline (packages/offline)
- `jose` ^5.9 — JWT côté API
- `turbo` ^2.5 — Build orchestration monorepo
- `pnpm` ^10.24 — Package manager

## ⚠️ Notes importantes

- **`DATABASE_URL`** doit pointer sur le rôle `wilinwi_app` via **pooler en mode session (port 5432)** — pas le mode transaction (6543). Les transactions interactives de `withTenant()` l'exigent.
- **`DIRECT_URL`** (migrations) → reste sur le rôle `postgres` (propriétaire) qui bypasse la RLS.
- Le rôle `postgres` contourne la RLS — ne jamais utiliser `DIRECT_URL` en production.
- Vérifier l'isolation RLS : `pnpm --filter @wilinwi/db exec tsx prisma/verify-isolation.ts` → doit afficher "✅ RLS ENFORCÉE".
- **Hors périmètre MVP1** : Fournisseurs, livraisons, Market WhatsApp, fidélité, abonnements FedaPay, notifications, multi-boutiques, app Flutter, IA.
- Toujours utiliser `PrismaService.forTenant()` — ne jamais requêter en dehors de ce contexte.
- **[AUDIT QA - 2026-06-19]** : L'architecture NestJS/Prisma implémentée par Claude est robuste et respecte les contraintes DEXTY. La fuite de marge a été colmatée via `sale.mapper.ts`. Le `PriceOverride` est bloquant (statut `PENDING_APPROVAL`).
- **[AUDIT CRM - 2026-06-20]** : Refonte complète du module CRM client et de la gestion des dettes. Intégration d'un encaissement ciblé / FIFO automatique mettant à jour `SaleInstallment`, `Sale`, `Client` et `CashMovement` au sein d'une même transaction Prisma isolée par tenant. KPIs financiers et historique de vente complet intégrés à l'UI double-colonne.
- **[DEXTY RULES]** : Les signatures Dexty sont désormais présentes sur les fichiers critiques (`prisma.service.ts`, `sale.mapper.ts`, `sales.service.ts`, `roles.ts`, `schema.prisma`, `clients.service.ts`, `client.mapper.ts`).
