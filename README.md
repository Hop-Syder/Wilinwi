<!--
/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description README principal détaillant l'architecture, le CI/CD, les déploiements Vercel/Render et les correctifs DB
 * @created 2026-06-19
 * @updated 2026-09-08
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
──────────────────────────────────
-->

# ◈ Wilinwi

> **Le système d'exploitation du commerce africain.** — _Gérez. Vendez. Grandissez._

SaaS multi-tenant de gestion de commerce pour l'Afrique de l'Ouest (POS, Stock, Pay, CRM, Market, Analytics, IA), pensé pour les réalités locales : Mobile Money, vente à crédit, négociation tracée, et **fonctionnement hors-ligne**.

Ce dépôt contient les **fondations et le MVP1 « Le Socle »**.
Pour en savoir plus sur l'architecture complète, les conventions de code et les instructions de développement approfondies, veuillez consulter [CLAUDE.md](file:///home/hopsyder/Projet/Wilinwi/CLAUDE.md).

---

## 🛠️ Stack Technologique & Architecture Cible

- **Frontends** : Next.js 15 (App Router) · React 19 · TailwindCSS 3
  - `apps/web` — SaaS client (Hub + modules), port **3000**
  - `apps/admin-web` — **console super-admin Nexus** (séparée), port **3001**
- **Backend** : NestJS 11 · architecture modulaire — `auth, etablissement, stock, inventory, pos, crm, treasury, analytics, sync, admin, warehouse, notifications, plans, platform`
- **Base de Données** : PostgreSQL (Supabase) · Prisma ORM · Row-Level Security (RLS)
- **Sécurité plateforme** : double rôle DB — `wilinwi_app` (public, RLS) **vs** `wilinwi_admin` (seul à exécuter les fonctions cross-tenant `app.*`). Voir [§ Console super-admin & sécurité](#-console-super-admin--sécurité).
- **Authentification** : Supabase Auth — tokens **ES256** vérifiés via le **JWKS distant** du projet
  (rotation de clé native, aucun secret partagé pour le login normal). Le login **PIN** sur poste
  partagé (bascule de profil sans reconnexion) mint son propre token **HS256** interne
  (`SUPABASE_JWT_SECRET`) ; `AuthGuard` essaie JWKS puis retombe sur HS256. Anti-bruteforce PIN
  **persistant en base** (`pin_fail_count`/`pin_locked_until` sur `User` — 5 échecs → verrou 60s),
  pas en mémoire (survit aux redémarrages/redeploys).
- **Gating & facturation** : limites numériques par plan (`maxUsers`, `maxEtablissements`,
  `maxProducts`, `maxPhotos`) pilotables en base (`plan_configs`), enforced côté serveur avec
  bypass **grand-père** (`isGrandfathered` — tenants créés avant l'activation globale du gating,
  ou override individuel `Tenant.grandfatheredUntil`). Cron horaire (`ENABLE_BILLING_CRON=true`)
  relance les impayés via `app.billing_run_overdue()`.
- **Logistique** : Architecture "Magasin Central" (Réception globale) avec système de "Dispatch" (transferts internes) vers les boutiques.
- **Offline / Sync** : Dexie.js (IndexedDB) · SyncEngine
- **Tooling & CI/CD** : Turborepo (Monorepo) · pnpm · GitHub Actions

> Détail de l'architecture, des conventions et du modèle de sécurité : [CLAUDE.md](CLAUDE.md).

---

## 🚀 Démarrage Rapide (Développement Local)

Assurez-vous d'avoir [Node.js](https://nodejs.org) (v20+) et [pnpm](https://pnpm.io) (v10) installés.

```bash
# 1. Installer les dépendances (à la racine du monorepo)
pnpm install

# 2. Configurer les variables d'environnement
cp .env.example .env

# 3. Générer le client Prisma et appliquer les migrations + RLS
pnpm --filter @wilinwi/db generate
pnpm --filter @wilinwi/db migrate
pnpm --filter @wilinwi/db rls

# 4. Lancer les serveurs de développement (API + 2 frontends)
pnpm dev
# API NestJS         → http://localhost:4000
# SaaS client (web)  → http://localhost:3000
# Console super-admin → http://localhost:3001
```

> Variables d'environnement clés (`.env` racine) : `DATABASE_URL` (rôle `wilinwi_app`),
> `DIRECT_URL` (rôle `postgres`, migrations), **`ADMIN_DATABASE_URL`** (rôle `wilinwi_admin`,
> module plateforme), **`PLATFORM_ADMIN_EMAILS`** (allowlist des super-admins), `SUPABASE_*`,
> `NEXT_PUBLIC_*`, `CORS_ORIGINS`.

---

## 🔐 Console super-admin & sécurité

La console d'exploitation du SaaS (entreprises, facturation, plans/tarifs, modules à la carte,
métriques) vit dans une **application séparée** (`apps/admin-web`, :3001), **distincte du SaaS
client** : aucune ligne de code admin n'est livrée dans `apps/web`.

Trois barrières **indépendantes** protègent les opérations cross-tenant :

1. **Identité** — accès réservé aux e-mails de `PLATFORM_ADMIN_EMAILS` ; le backend calcule
   `isPlatformAdmin` et garde les routes avec `@PlatformAdmin` (`PlatformAdminGuard`).
2. **Privilège base (verrou)** — les fonctions cross-tenant `app.*` (qui **contournent la RLS**)
   sont **réservées au rôle `wilinwi_admin`** et **révoquées** au rôle applicatif public
   `wilinwi_app`. Même une API publique compromise ne peut pas déclencher d'opération cross-tenant.
   → rôle créé via [`packages/db/prisma/admin-role.sql.example`](packages/db/prisma/admin-role.sql.example) ;
   le module `platform` se connecte via `ADMIN_DATABASE_URL` (`AdminPrismaService`).
3. **Réseau (recommandé en prod)** — placer `admin-web` derrière un contrôle d'accès (Cloudflare
   Access / allowlist IP), sur un domaine dédié.

```bash
# Créer le rôle admin + appliquer le verrou (une fois, après les fonctions plateforme) :
#   1. copier admin-role.sql.example → y mettre un mot de passe fort
#   2. prisma db execute --url "$DIRECT_URL" --file admin-role.sql
#   3. renseigner ADMIN_DATABASE_URL (pooler session 5432, rôle wilinwi_admin)
```

> Le module plateforme s'appuie sur des fonctions `SECURITY DEFINER` du schéma `app`
> ([`packages/db/prisma/platform.sql`](packages/db/prisma/platform.sql)) — non exposées par
> PostgREST. Vérifier le verrou : `wilinwi_app` doit recevoir `permission denied` sur `app.platform_*`.

---

## ⚙️ Corrections & Migrations en Production (Supabase)

> Les migrations récentes (anti-bruteforce PIN persistant, gating/billing — plans, limites
> numériques, grand-père) suivent le flux standard : `pnpm --filter @wilinwi/db exec prisma
> migrate deploy` contre `DATABASE_URL`/`DIRECT_URL` de prod. Le script SQL ci-dessous est un
> correctif ponctuel historique (dérive de schéma avant que les migrations Prisma ne soient
> systématiquement commitées) — conservé pour référence, pas la méthode à suivre pour de
> nouveaux changements de schéma.

Si le service de production (Render) crash ou remonte des erreurs d'écarts de schéma Prisma (`P2022` ou valeur d'énumérateur `CashAccount` non reconnue), vous devez exécuter manuellement ce script SQL correctif dans le **SQL Editor** de votre tableau de bord Supabase :

```sql
-- 1. Ajout de la colonne seuil_alerte dans la table products si elle n'existe pas
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "seuil_alerte" INTEGER NOT NULL DEFAULT 5;

-- 2. Ajout de la colonne quantite_retournee dans la table sale_items si elle n'existe pas
ALTER TABLE "sale_items" ADD COLUMN IF NOT EXISTS "quantite_retournee" INTEGER NOT NULL DEFAULT 0;

-- 3. Ajout des valeurs MTN_MOMO et MOOV_MONEY à l'énumération CashAccount (si non existantes)
-- Note: PostgreSQL nécessite d'ajouter les valeurs d'énumération en dehors de transactions
ALTER TYPE "CashAccount" ADD VALUE IF NOT EXISTS 'MTN_MOMO';
ALTER TYPE "CashAccount" ADD VALUE IF NOT EXISTS 'MOOV_MONEY';

-- 4. Livraisons (OT-8) : champs de livraison sur la table sales (déjà sous RLS).
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "a_livrer" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "livreur_id" UUID;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "adresse_livraison" TEXT;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "livre_le" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "sales_tenant_id_livreur_id_idx" ON "sales" ("tenant_id", "livreur_id");
DO $$ BEGIN
  ALTER TABLE "sales" ADD CONSTRAINT "sales_livreur_id_fkey"
    FOREIGN KEY ("livreur_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

> En local, `prisma migrate dev` génère cette migration automatiquement depuis le schéma.
> En production (sandbox sans accès DB), exécuter la section 4 ci-dessus dans le SQL Editor Supabase.

---

## ⚙️ Intégration Continue (GitHub Actions)

L'intégration continue est automatisée via le fichier `.github/workflows/ci.yml`. À chaque `push` sur la branche `main` et pour chaque `pull_request`, les étapes suivantes sont exécutées :

1. **Setup de l'environnement** : Initialisation d'Ubuntu, de pnpm v10 et Node.js v20 avec mise en cache.
2. **Installation & Génération** : Installation stricte des dépendances (`pnpm install --frozen-lockfile`) et génération du client Prisma.
3. **Lint** : `pnpm lint` — ESLint (config plate partagée, [eslint.base.mjs](eslint.base.mjs)) sur
   `api`, `@wilinwi/types`, `@wilinwi/ui`, `@wilinwi/offline` (`--max-warnings 0`). `apps/web` et
   `apps/admin-web` restent sur `next lint`, non encore intégré à ce step CI.
4. **Pipeline Turborepo** : Exécution parallèle et optimisée (`pnpm turbo build typecheck test`) des scripts suivants pour toutes les applications et packages du monorepo :
   - **Build** : Compilation du code TypeScript (Frontend et Backend).
   - **Typecheck** : Vérification statique des types.
   - **Test** : Exécution de la suite de tests unitaires via Vitest.

---

## ☁️ Déploiement

Le projet utilise une architecture distribuée pour séparer la couche présentation (Frontend) de la logique métier (Backend).

### 1. Frontend (`apps/web`) sur Vercel

Le Frontend Next.js est optimisé pour être hébergé sur **Vercel**, ce qui garantit des temps de réponse rapides grâce à l'Edge Network et une intégration CI/CD sans effort pour des applications Next.js.

**Configuration Vercel :**

- **Framework Preset** : Next.js
- **Root Directory** : `apps/web`
- **Build Command** : Turborepo gère automatiquement le build depuis la racine. Vercel lancera par défaut la commande adéquate (inférée automatiquement : `cd ../.. && pnpm turbo run build --filter=web`).
- **Variables d'environnement requises** :
  - `NEXT_PUBLIC_API_URL` (L'URL publique du backend hébergé sur Render, ex. `https://projet-wilinwi.onrender.com`)
  - `NEXT_PUBLIC_SUPABASE_URL` (L'URL du projet Supabase)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Clé publique anonyme Supabase)

### 2. Console super-admin (`apps/admin-web`) sur Vercel

Déployée comme un **projet Vercel distinct**, sur un **domaine dédié** (ex. `admin.wilinwi.com`),
idéalement protégé par **Cloudflare Access** ou une allowlist IP.

- **Root Directory** : `apps/admin-web`
- **Build Command** : `cd ../.. && pnpm turbo run build --filter=admin-web`
- **Variables** : `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ⚠️ Ajouter l'origine de `admin-web` à **`CORS_ORIGINS`** de l'API.

### 3. Backend (`apps/api`) sur Render

L'API NestJS tourne sur **Render** (Web Service Node), via le Blueprint versionné
[`render.yaml`](render.yaml) à la racine du dépôt — Render le détecte automatiquement
lors de la création d'un service depuis ce repo (New → Blueprint).

**Configuration (déjà figée dans `render.yaml`) :**

- **Root Directory** : racine du dépôt (`.`) — nécessaire pour le contexte pnpm workspaces/Turborepo.
- **Build Command** : `pnpm install --frozen-lockfile && pnpm turbo run build --filter=api`
  (Turborepo résout automatiquement `@wilinwi/db` → `@wilinwi/types` → `api` via `dependsOn: ["^build"]`
  dans [turbo.json](turbo.json) — ne pas remplacer `build` par `generate` sur `@wilinwi/db`,
  ça ne compile pas `dist/` et casse les imports `@wilinwi/db` côté API).
- **Start Command** : `node apps/api/dist/main.js`
- **Health Check** : `GET /api/health`
- **`NODE_VERSION`** : fixé à `20` (sinon Render peut prendre une version Node très récente et non testée).
- **Variables d'environnement requises** (déclarées `sync: false` dans `render.yaml` — à
  saisir manuellement dans le dashboard Render au premier déploiement) :
  - `DATABASE_URL` (pooling **session** Supabase, port **5432**, rôle `wilinwi_app` — indispensable
    aux transactions interactives de `forTenant()` ; le pooler **transaction** (6543) casse la RLS)
  - `DIRECT_URL` (rôle `postgres`, migrations)
  - **`ADMIN_DATABASE_URL`** (pooling session 5432, rôle `wilinwi_admin` — module plateforme ; sans elle les routes `/platform` échouent, _fail-closed_)
  - **`PLATFORM_ADMIN_EMAILS`** (allowlist des super-admins, séparés par des virgules)
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `CORS_ORIGINS`, `WEB_BASE_URL`
  - `PORT` (injecté automatiquement par Render)

> ⚠️ **CORS** : `CORS_ORIGINS` doit lister explicitement chaque domaine frontend en prod
> (`apps/web` et `apps/admin-web`, ex. `https://wilinwi.nexus-partners.xyz,https://wilinwi-admin-web.vercel.app`)
> — pas de wildcard, correspondance exacte de chaîne. Un oubli se traduit par une absence
> silencieuse du header `Access-Control-Allow-Origin` (le navigateur bloque, l'API répond pourtant `200`).
> Toute modification de variable d'environnement nécessite un **redémarrage** du service
> (lue une seule fois au boot dans `main.ts`, pas relue à chaud).

---

> © 2026 - Conçu par **Nexus Partners** | Architecte : **@hopsyder**
