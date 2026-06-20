<!--
/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description README principal détaillant l'architecture, le CI/CD et les déploiements Vercel/Railway
 * @created 2026-06-19
 * @updated 2026-06-19
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
──────────────────────────────────
-->

# ◈ Wilinwi

> **Le système d'exploitation du commerce africain.** — *Gérez. Vendez. Grandissez.*

SaaS multi-tenant de gestion de commerce pour l'Afrique de l'Ouest (POS, Stock, Pay, CRM, Market, Analytics, IA), pensé pour les réalités locales : Mobile Money, vente à crédit, négociation tracée, et **fonctionnement hors-ligne**.

Ce dépôt contient les **fondations et le MVP1 « Le Socle »**. 
Pour en savoir plus sur l'architecture complète, les conventions de code et les instructions de développement approfondies, veuillez consulter [CLAUDE.md](file:///home/hopsyder/Projet/Wilinwi/CLAUDE.md).

---

## 🛠️ Stack Technologique

- **Frontend** : Next.js 15 (App Router) · React 19 · TailwindCSS 3
- **Backend** : NestJS 11 · Architecture modulaire
- **Base de Données** : PostgreSQL (Supabase) · Prisma ORM · Row-Level Security (RLS)
- **Offline / Sync** : Dexie.js (IndexedDB) · SyncEngine
- **Tooling & CI/CD** : Turborepo (Monorepo) · pnpm · GitHub Actions

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

# 4. Lancer les serveurs de développement (Frontend & Backend)
pnpm dev
# L'API NestJS sera disponible sur http://localhost:4000
# L'application Next.js sera disponible sur http://localhost:3000
```

---

## ⚙️ Intégration Continue (GitHub Actions)

L'intégration continue est automatisée via le fichier `.github/workflows/ci.yml`. À chaque `push` sur la branche `main` et pour chaque `pull_request`, les étapes suivantes sont exécutées :

1. **Setup de l'environnement** : Initialisation d'Ubuntu, de pnpm v10 et Node.js v20 avec mise en cache.
2. **Installation & Génération** : Installation stricte des dépendances (`pnpm install --frozen-lockfile`) et génération du client Prisma.
3. **Pipeline Turborepo** : Exécution parallèle et optimisée (`pnpm turbo build typecheck test`) des scripts suivants pour toutes les applications et packages du monorepo :
   - **Build** : Compilation du code TypeScript (Frontend et Backend).
   - **Typecheck** : Vérification statique des types.
   - **Test** : Exécution de la suite de tests unitaires via Vitest.

*Note : Les variables d'environnement de connexion à Supabase utilisées par la CI sont des valeurs factices car le pipeline (`build`, `typecheck`, `test`) ne nécessite pas de connexion active à la base de données.*

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

### 2. Backend (`apps/api`) sur Railway

L'API NestJS est conçue pour tourner sur **Railway**, offrant un environnement de production stable et auto-scalable, idéal pour les applications Node.js nécessitant un cycle de vie long et stable (APIs RESTful classiques, modules complexes, etc.).

**Configuration Railway :**
- Lier le dépôt GitHub au projet Railway.
- **Root Directory** : Laisser **vide** (ou `/`, la racine du dépôt). *Ne pas mettre `apps/api` sinon Railway ne verra pas le monorepo pnpm.*
- **Build Command** : `pnpm turbo run build --filter=api`
- **Start Command** : `pnpm --filter api start:prod`
- **Variables d'environnement requises** :
  - `DATABASE_URL` (URL de pooling session Supabase : port 5432, indispensable pour la bonne exécution des transactions Prisma `withTenant`)
  - `PORT` (Injecté automatiquement par Railway, NestJS doit écouter sur ce port dynamiquement)
  - Toutes les autres variables de sécurité et d'authentification nécessaires au fonctionnement de l'API.

---

> © 2026 - Conçu par **Nexus Partners** | Architecte : **@hopsyder**
