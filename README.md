# ◈ Wilinwi

**Le système d'exploitation du commerce africain.** — *Gérez. Vendez. Grandissez.*

SaaS multi-tenant de gestion de commerce pour l'Afrique de l'Ouest (POS · Stock ·
Pay · CRM · Market · Analytics · AI), pensé pour les réalités locales : Mobile
Money, vente à crédit, négociation tracée, et **fonctionnement hors-ligne**.

Ce dépôt contient les **fondations + MVP1 « Le Socle »**. Architecture, conventions
et démarrage : voir [CLAUDE.md](CLAUDE.md).

## Stack

NestJS · Next.js (App Router) · PostgreSQL/Supabase (RLS) · Prisma · Tailwind ·
Dexie (offline) · Turborepo + pnpm.

## Démarrage rapide

```bash
pnpm install
cp .env.example .env     # renseigner Supabase
pnpm --filter @wilinwi/db migrate && pnpm --filter @wilinwi/db rls
pnpm dev                 # API :4000 · web :3000
```

Conçu par Nexus Partners · @hopsyder
