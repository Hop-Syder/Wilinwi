# 🌐 Wilinwi Frontend — Console d'Administration Web (Next.js)

> **Auteur** : @hopsyder | **Organisation** : Nexus Partners  
> **Mission** : Interface d'administration web moderne, performante et offline-first pour la plateforme SaaS multi-tenant Wilinwi.

---

## 🛠️ Stack Technique

*   **Framework** : [Next.js 14](https://nextjs.org/) (App Router & Server Actions)
*   **Langage** : [TypeScript](https://www.typescriptlang.org/) (Typage strict partagé avec le backend via `@wilinwi/types`)
*   **Styling** : [TailwindCSS](https://tailwindcss.com/) & composants partagés `@wilinwi/ui` (Design Premium *Black Luxury* : tons sombres, accents or/miel et vert émeraude)
*   **Client Base de données & Offline** : [Dexie.js](https://dexie.org/) (IndexedDB) pour la résilience hors-ligne totale (synchronisation bidirectionnelle avec le backend)
*   **Authentification & Sécurité** : [Supabase Auth Client](https://supabase.com/docs/guide/auth) & JWT (SSO multi-tenant cloisonné via RLS)
*   **Icônes** : [Lucide React](https://lucide.dev/)

---

## 📁 Structure des Dossiers

```
apps/web/
├── public/                 # Assets statiques (logos, images, icônes)
├── src/
│   ├── app/                # Routage App Router (Next.js)
│   │   ├── (app)/          # Espace connecté de l'application (dashboard, POS, stock, etc.)
│   │   │   └── platform/   # Console super-admin d'administration plateforme
│   │   ├── (auth)/         # Écrans d'authentification (login, signup, reset-password)
│   │   ├── layout.tsx      # Layout global avec barre de navigation & gestion des droits
│   │   └── page.tsx        # Route d'accueil (Hub)
│   ├── components/         # Composants d'interface utilisateur locaux (modales, widgets)
│   └── lib/                # Bibliothèques partagées, API client, contexte d'authentification
├── next.config.mjs         # Configuration Next.js
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

Pour lancer l'application frontend en mode développement :

```bash
# Depuis la racine du monorepo :
pnpm --filter web dev

# Ou directement depuis le dossier apps/web :
pnpm dev
```

L'application est accessible par défaut sur [http://localhost:3000](http://localhost:3000).

---

## 🏗️ Build de Production

Pour valider le typage et générer le build optimisé de production :

```bash
# Typecheck
pnpm --filter web typecheck

# Build
pnpm --filter web build

# Exécuter localement le build généré
pnpm --filter web start
```

---

## ☁️ Déploiement sur Vercel

L'application frontend Next.js de Wilinwi est optimisée pour être déployée sur la plateforme de cloud **Vercel**.

### Option 1 : Déploiement via l'intégration GitHub (Recommandé)
1. Poussez votre code sur votre dépôt GitHub (ex. `origin/main`).
2. Connectez-vous sur votre dashboard [Vercel](https://vercel.com).
3. Cliquez sur **Add New > Project**, puis importez votre dépôt GitHub.
4. Dans les paramètres de configuration du projet :
   * **Framework Preset** : `Next.js`
   * **Root Directory** : `apps/web` (très important dans un monorepo pnpm)
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

# 2. Initialisez le projet (sélectionnez apps/web comme répertoire source)
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
