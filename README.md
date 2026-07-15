<!--
/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description README principal détaillant l'architecture, le CI/CD, les déploiements Vercel/Railway et les correctifs DB
 * @created 2026-06-19
 * @updated 2026-06-30
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

Si le conteneur de production Railway crash ou remonte des erreurs d'écarts de schéma Prisma (`P2022` ou valeur d'énumérateur `CashAccount` non reconnue), vous devez exécuter manuellement ce script SQL correctif dans le **SQL Editor** de votre tableau de bord Supabase :

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
3. **Pipeline Turborepo** : Exécution parallèle et optimisée (`pnpm turbo build typecheck test`) des scripts suivants pour toutes les applications et packages du monorepo :
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
  - `NEXT_PUBLIC_API_URL` (L'URL publique du backend hébergé sur Railway)
  - `NEXT_PUBLIC_SUPABASE_URL` (L'URL du projet Supabase)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Clé publique anonyme Supabase)

### 2. Console super-admin (`apps/admin-web`) sur Vercel

Déployée comme un **projet Vercel distinct**, sur un **domaine dédié** (ex. `admin.wilinwi.com`),
idéalement protégé par **Cloudflare Access** ou une allowlist IP.

- **Root Directory** : `apps/admin-web`
- **Build Command** : `cd ../.. && pnpm turbo run build --filter=admin-web`
- **Variables** : `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ⚠️ Ajouter l'origine de `admin-web` à **`CORS_ORIGINS`** de l'API.

### 3. Backend (`apps/api`) sur Railway

L'API NestJS est conçue pour tourner sur **Railway**, offrant un environnement de production stable et auto-scalable, idéal pour les applications Node.js nécessitant un cycle de vie long et stable (APIs RESTful classiques, modules complexes, etc.).

**Configuration Railway :**

- Lier le dépôt GitHub au projet Railway.
- **Root Directory** : Laisser **vide** (ou `/`, la racine du dépôt). _Ne pas mettre `apps/api` sinon Railway ne verra pas le monorepo pnpm._
- **Build Command** : `pnpm turbo run build --filter=api`
- **Start Command** : `pnpm --filter api start:prod`
- **Variables d'environnement requises** :
  - `DATABASE_URL` (pooling session Supabase, port 5432, rôle `wilinwi_app` — indispensable aux transactions `withTenant`)
  - **`ADMIN_DATABASE_URL`** (pooling session 5432, rôle `wilinwi_admin` — module plateforme ; sans elle les routes `/platform` échouent, _fail-closed_)
  - **`PLATFORM_ADMIN_EMAILS`** (allowlist des super-admins, séparés par des virgules)
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `CORS_ORIGINS`
  - `PORT` (injecté automatiquement par Railway)

> [!TIP]
> **Diagnostic & Résolution de problèmes Railway :**
> - **Connexion bloquée dans le terminal :** Si `railway login` se bloque, c'est généralement dû à l'attente de l'ouverture du navigateur. Utilisez le mode sans navigateur :
>   ```bash
>   railway login --browserless
>   ```
> - **Crash de Build (Erreurs de typage TypeScript / Dépendances @wilinwi/db) :** Si le build échoue sur Railway en raison d'erreurs TypeScript, assurez-vous de toujours compiler et générer le client localement avant le commit pour valider le typage :
>   ```bash
>   pnpm db:generate && pnpm build
>   ```

---

> © 2026 - Conçu par **Nexus Partners** | Architecte : **@hopsyder**
