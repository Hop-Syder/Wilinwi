# 🛡️ Wilinwi Admin Web — Console Super-Admin Plateforme (Next.js)

> **Auteur** : @hopsyder | **Organisation** : Nexus Partners  
> **Mission** : Interface d'administration globale, cross-tenant et hautement sécurisée pour superviser et facturer les entreprises sur la plateforme Wilinwi.

---

## 🛠️ Stack Technique

*   **Framework** : [Next.js 15](https://nextjs.org/) (App Router & Server Actions)
*   **Langage** : [TypeScript](https://www.typescriptlang.org/) (Typage strict partagé avec le backend via `@wilinwi/types`)
*   **Styling** : [TailwindCSS](https://tailwindcss.com/) & composants partagés `@wilinwi/ui` (Design Premium *Black Luxury* : tons sombres, accents or/miel et vert émeraude)
*   **Données & Visualisations** : [Recharts](https://recharts.org/) pour les KPI et graphiques d'analyse des revenus et usages.
*   **Authentification & Sécurité** : [Supabase Auth Client](https://supabase.com/docs/guide/auth) avec rôle administrateur restreint par allowlist d'emails (`PLATFORM_ADMIN_EMAILS`).

---

## 📁 Structure des Dossiers

```
apps/admin-web/
├── public/                 # Assets statiques (logos, images, icônes)
├── src/
│   ├── app/                # Routage App Router (Next.js 15)
│   │   ├── (app)/          # Espace connecté d'administration plateforme
│   │   │   └── platform/   # Vue détaillée de la console Plateforme (Boutiques, KPI, facturation)
│   │   ├── layout.tsx      # Layout global avec barre de navigation & gestion des droits administrateurs
│   │   └── page.tsx        # Route d'accueil (Console Hub)
│   ├── components/         # Composants UI d'administration (Recharts, formulaires d'édition)
│   └── lib/                # API client, hook d'authentification super-admin
├── next.config.mjs         # Configuration Next.js (port 3001)
├── tailwind.config.ts      # Configuration Tailwind CSS
└── package.json            # Scripts de build et dépendances
```

---

## ⚙️ Configuration Locale (`.env`)

Créez un fichier `.env.local` dans ce répertoire ou configurez les variables suivantes à la racine du monorepo :

```bash
# Variables exposées publiquement au navigateur (obligatoirement préfixées par NEXT_PUBLIC_)
NEXT_PUBLIC_SUPABASE_URL="https://votre-projet.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="votre-cle-anonyme-supabase"
NEXT_PUBLIC_API_URL="http://localhost:4000" # URL de l'API backend NestJS
```

---

## 🚀 Développement Local

Pour lancer l'application d'administration en mode développement sur le port **3001** :

```bash
# Depuis la racine du monorepo :
pnpm --filter admin-web dev

# Ou directement depuis le dossier apps/admin-web :
pnpm dev
```

L'application est accessible par défaut sur [http://localhost:3001](http://localhost:3001).

---

## 🏗️ Build de Production

Pour valider le typage et générer le build optimisé de production :

```bash
# Typecheck
pnpm --filter admin-web typecheck

# Build
pnpm --filter admin-web build

# Exécuter localement le build généré (port 3001)
pnpm --filter admin-web start
```

---

## ☁️ Déploiement sur Vercel

L'application Next.js 15 `admin-web` est conçue pour être déployée de manière isolée sur **Vercel**.

### Option 1 : Déploiement via l'intégration GitHub (Recommandé)
1. Poussez votre code sur votre dépôt GitHub (ex. `origin/main`).
2. Connectez-vous sur votre dashboard [Vercel](https://vercel.com).
3. Cliquez sur **Add New > Project**, puis importez votre dépôt GitHub.
4. Dans les paramètres de configuration du projet :
   * **Framework Preset** : `Next.js`
   * **Root Directory** : `apps/admin-web` (très important dans un monorepo pnpm)
   * **Build & Development Settings** : Laissez par défaut (Vercel détectera automatiquement les scripts pnpm).
5. Configurez vos variables d'environnement (`Environment Variables`) :
   * `NEXT_PUBLIC_SUPABASE_URL`
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   * `NEXT_PUBLIC_API_URL` (pointez vers l'adresse de production de votre API NestJS)
6. Cliquez sur **Deploy**.

### Option 2 : Déploiement en ligne de commande (CLI Vercel)
Pour un déploiement rapide ou des tests de staging en ligne de commande, utilisez le CLI Vercel :

```bash
# 1. Connectez-vous à votre compte Vercel
pnpm dlx vercel login

# 2. Initialisez le projet (sélectionnez apps/admin-web comme répertoire source)
pnpm dlx vercel link

# 3. Configurez les variables d'environnement sur le dashboard ou via CLI :
pnpm dlx vercel env add NEXT_PUBLIC_SUPABASE_URL production "https://votre-projet.supabase.co"
pnpm dlx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production "votre-cle-anonyme-supabase"
pnpm dlx vercel env add NEXT_PUBLIC_API_URL production "https://api.votre-domaine.com"

# 4. Lancez un déploiement de Staging (Preview)
pnpm dlx vercel

# 5. Lancez le déploiement final en Production
pnpm dlx vercel --prod
```
