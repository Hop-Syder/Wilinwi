<!--
  @author @hopsyder
  @organization Nexus Partners
  @description DEXTY v2.2 — Mémoire Projet Synthétique (Point d'entrée principal)
  @created 2026-06-19
  @updated 2026-10-04
  🌐 nexus-partners.xyz
-->

# DEXTY — Mémoire projet

> Maintenu par DEXTY v2.2 — corrections manuelles autorisées et prioritaires
> — Dernière synchronisation : 2026-10-04
> — Empreintes :
>   - `package.json` : `447d3200`
>   - `turbo.json` : `e08c5eb5`
>   - `packages/db/prisma/schema.prisma` : `e03db6d6`

## État courant
— Nom / type : Wilinwi — SaaS multi-tenant (POS · Stock · Pay · CRM · Livraisons · Trésorerie · Analytics · Configuration)
— Frontend : Next.js 15 (App Router) + React 19 + TailwindCSS 3 — Confiance : VERIFIED
— Backend : NestJS 11 (monolithe modulaire) — Confiance : VERIFIED
— BDD / ORM : Supabase PostgreSQL + Prisma 6 + RLS multi-tenant — Confiance : VERIFIED
— Mobile : PWA Web responsive (mobile, tablette, desktop) — Confiance : VERIFIED
— IA / ML : Module vocal Gemini & transcription audio (branche main) — Confiance : HIGH
— Auth : Supabase Auth (JWKS ES256) + code PIN caissier (HS256) — Confiance : VERIFIED
— Paiements : Mobile Money (MTN, Moov, Wave) via FedaPay / Cash — Confiance : VERIFIED
— DevOps / hébergement : Render (API) + Vercel (Web) + Turborepo + pnpm workspaces — Confiance : VERIFIED
— Tests : Vitest (tests unitaires API & packages) — Confiance : VERIFIED
— Architecture / conventions : Monolithe modulaire multi-tenant, offline-first (Dexie), RLS stricte, système à 4 prix, montants FCFA entiers

## Signature
— Activée : oui — Organisation affichée : Nexus Partners

## Skill registry (8–12 max)
— `senior-fullstack` : Développement fonctionnalités complètes et cohérence transverse
— `clean-code` : Standards de qualité, refactoring et maintenabilité TypeScript
— `api-design-principles` : Conception des endpoints REST NestJS et contrats d'API
— `nextjs-best-practices` : Next.js 15 App Router, Server/Client components, data fetching
— `react-best-practices` : Hooks React 19, gestion d'état, performances
— `ui-ux-pro-max` : Charte UI/UX Wilinwi, palettes contextuelles, micro-interactions
— `tailwind-design-system` : Tokens CSS, design system cohérent
— `nestjs-expert` : Modules, services, guards, interceptors, pipes
— `backend-dev-guidelines` : Architecture découplée et DTOs Zod
— `auth-implementation-patterns` : Double validation JWT + RBAC à 5 rôles
— `prisma-expert` : Schéma, migrations expand/contract, withTenant()
— `systematic-debugging` : Analyse méthodique des anomalies et résolution sans régression

## Contraintes
— Toute donnée appartient à un tenant : `tenant_id` obligatoire partout
— Base de données : accès applicatif via pooler de session (port 5432) avec le rôle `wilinwi_app`
— Migrations : exécutées avec `DIRECT_URL` sur le rôle `postgres`
— Détail des contraintes : voir [constraints.md](file:///mnt/d/Projets/Wilinwi/.dexty/constraints.md)

## Dépendances critiques
— `@prisma/client` : v6.3.1 (ORM et client typé)
— `@nestjs/core` : v11.0.9 (framework backend)
— `next` : v15.1.7 / `react` : v19.0.0 (framework frontend)
— `dexie` : v4.0.11 (moteur IndexedDB offline)
— `@supabase/supabase-js` : v2.48.1 (client Supabase)
— `zod` : v3.24.1 (schémas et validation d'entrées)

## Décisions actives
— [2026-06-19] Monolithe modulaire multi-tenant + RLS stricte → [decisions.md#ADR-001](file:///mnt/d/Projets/Wilinwi/.dexty/decisions.md)
— [2026-06-19] Système à 4 prix étanches anti-fraude → [decisions.md#ADR-002](file:///mnt/d/Projets/Wilinwi/.dexty/decisions.md)
— [2026-08-04] Mode session obligatoire sur pooler Supabase (port 5432) → [decisions.md#ADR-003](file:///mnt/d/Projets/Wilinwi/.dexty/decisions.md)
— [2026-09-17] RBAC 5 rôles et gating strict via capacités → [decisions.md#ADR-004](file:///mnt/d/Projets/Wilinwi/.dexty/decisions.md)
— [2026-09-17] Double validation JWT (JWKS Supabase ES256 + PIN local HS256) → [decisions.md#ADR-005](file:///mnt/d/Projets/Wilinwi/.dexty/decisions.md)
— [2026-10-04] Migration universelle quantités Float / Double Precision → [decisions.md#ADR-006](file:///mnt/d/Projets/Wilinwi/.dexty/decisions.md)
— [2026-10-04] Ventes décimales exactes (Poids/Volume en milli-unités + scale) → [decisions.md#ADR-007](file:///mnt/d/Projets/Wilinwi/.dexty/decisions.md)
— [2026-10-04] Auto-création transparente de session d'inventaire sur point de stock → [decisions.md#ADR-008](file:///mnt/d/Projets/Wilinwi/.dexty/decisions.md)
— [2026-10-04] Assistant import catalogue avec Auto-SKU et options Laisser vide → [decisions.md#ADR-009](file:///mnt/d/Projets/Wilinwi/.dexty/decisions.md)
— [2026-10-04] Kit de marque PDF unique, logo Wilinwi à son ratio réel, montant en lettres → [decisions.md#ADR-010](file:///mnt/d/Projets/Wilinwi/.dexty/decisions.md)

## Known issues
— Divergence de 35 fichiers de conflit entre `main` et `main-mvp2` (fusion prévue via branche tampon) — PLANIFIÉ

## Historique
— [2026-06-19] Initialisation projet Wilinwi MVP1 Le Socle
— [2026-08-05] Achèvement MVP2 (CRM, Trésorerie, Livraisons, Paramètres)
— [2026-09-17] Refonte responsive, Topbar & Sidebar Pro, Auth PIN sécurisée
— [2026-10-04] Support décimal exact & régularisation point de stock
— [2026-10-04] Auto-génération SKU et optimisation import catalogue
— [2026-10-04] Refonte des documents PDF (factures, bons de commande) et logo Wilinwi sur les impressions
