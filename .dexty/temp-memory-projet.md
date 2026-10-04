# DEXTY — Mémoire Projet

> Généré automatiquement — Ne pas éditer manuellement
> @author @hopsyder | Nexus Partners

## 📌 Méta-projet

- **Nom** : Wilinwi
- **Type** : SaaS multi-tenant (POS · Stock · Pay · CRM · Livraisons · Analytics · Configuration)
- **Initialisé le** : 2026-06-19
- **Dernière mise à jour** : 2026-10-04

```yaml
task_context:
  previous:
    id: "CATALOG-IMPORT-AUTO-SKU-AND-OPTIONAL-FIELDS"
    status: "COMPLETED"
    result: "Assistant d'importation catalogue enrichi : Auto-génération intelligente de SKU (nom + index unique), options 'Laisser vide' pour catégorie, stock (fixé à 0) et prix d'achat"
    files_changed:
      - "apps/web/src/components/stock/catalog-import-wizard.tsx"
    important_decisions:
      - "SKU : Option '-1' par défaut si colonne SKU absente dans le fichier Excel/CSV, avec génération déterministe et unique (ex: RIZ-PAR-001)"
      - "Catégorie : Option 'Laisser vide' (-1) pour importer sans catégorie préalable et classer ultérieurement"
      - "Stock : Option 'Laisser vide (Stock à 0)' (-1) pour éviter le blocage de stock manquant et permettre les inventaires ultérieurs"
      - "Prix d'achat : Option 'Laisser vide' (-1) pour gérer les catalogues de vente purs"
      - "Aperçu Step 3 : Affichage du badge '🪄 Auto' pour les SKU auto-générés et rendu propre des catégories"

  current:
    id: "CATALOG-IMPORT-WIZARD-ENHANCEMENT"
    objective: "Permettre l'import fluide de fichiers Excel sans SKU, stock ou catégorie requis"
    branch: "main-mvp2"
    status: "COMPLETED"
    files_in_scope:
      - "apps/web/src/components/stock/catalog-import-wizard.tsx"
    constraints:
      - "Garantir la conformité avec le schéma Zod de l'API /api/stock/import (sku non vide, stock positif ou 0)"
      - "Préserver l'intégrité et la réversibilité"

  future:
    known_tasks:
      - id: "MERGE-MVP2-INTO-MAIN"
        objective: "Fusionner main-mvp2 dans main via branche tampon et résolution ordonnée des 35 fichiers de conflits"
        dependency: "CATALOG-IMPORT-AUTO-SKU-AND-OPTIONAL-FIELDS"
        status: "PLANNED"

  cross_branch:
    inspected_branches: ["main", "main-mvp2"]
    relevant_changes: ["Auto-SKU & champs optionnels import catalogue", "Conflits identifiés sur 35 fichiers lors du dry-run merge-tree"]
    conflicts: ["35 fichiers de conflit entre main et main-mvp2 (API, Web, Types, Offline, DB)"]
    decisions_found: ["Ne pas fusionner directement vers main sans branche tampon de validation"]

  temporary_memory:
    facts:
      - "Base Supabase migrée en double precision pour les quantités"
      - "Prisma client régénéré avec Float"
      - "Validation point de stock auto-ouvre une session d'inventaire si nécessaire"
      - "Règle mémoire inscrite dans GEMINI.md et AGENTS.md"
    decisions:
      - "Double precision préféré aux entiers fixes pour souplesse maximale tous secteurs (vrac, boisson, découpe, agro)"
    discoveries:
      - "sales.service déduisait -1 au lieu de -item.quantite pour les produits non sérialisés/sans lot"
      - "La confirmation d'inventaire bloquait si l'utilisateur n'avait pas cliqué sur Démarrer une session"
    blockers: []
    pending_actions:
      - "Push final sur origin/main-mvp2"
```

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
- **[OPTIMISATION RESPONSIVE MOBILE - 2026-09-17]** : Audit complet des 24 routes web. Optimisation chirurgicale des barres d'onglets (Tabs UI) scrollables horizontalement (`/clients`, `/tresorerie`, `/ventes`, `/livraisons`, `/parametres`), conversion des en-têtes en `flex-col sm:flex-row`, correction des tables en `overflow-x-auto` (`/entrepot`, `/entrepot/reception/[id]`, modales fournisseurs et PO) et ajustement de la grille des actions rapides du Hub (`/`). 0 erreur `tsc` et 0 warning `eslint`.
- **[ÉLARGISSEMENT LAYOUT DESKTOP - 2026-09-17]** : Réduction des marges latérales gauche et droite via le passage du conteneur de `max-w-[1536px]` à `max-w-[1800px]` (avec `lg:px-8`) dans le header et le layout principal (`apps/web/src/app/(app)/layout.tsx`), offrant un étalement de travail élargi sur grands écrans.
- **[REFONTE SIDEBAR PRO - 2026-09-17]** : Refonte UI/UX complète de la barre latérale desktop (`apps/web/src/components/collapsible-sidebar.tsx`) : 4 groupes sémantiques métier (*Ventes*, *Stocks*, *Finances*, *Pilotage*), thèmes de couleurs contextuelles par module (Emerald, Amber, Teal, Violet, Rose, Blue, Indigo), dots d'activité, raccourcis clavier automatiques (`F2`, `F3`, `F4`, `Ctrl+B`), rich tooltips flottants en mode compact (72px) et bouton Vente Rapide POS intégré. 0 erreur `tsc` et 0 warning `eslint`.
- **[REFONTE TOPBAR PRO - 2026-09-17]** : Refonte UI/UX complète de la barre de navigation supérieure (`apps/web/src/components/app-topbar.tsx` et intégration dans `apps/web/src/app/(app)/layout.tsx`) selon le design Fintech Next : ligne de crête de marque (Or #F59E0B, Bleu #2563EB, Émeraude #10B981), verre dépoli `backdrop-blur-xl`, palette de commande centrale interactive (`⌘K` / `Ctrl+K`) avec navigation au clavier et raccourcis d'action, télémétrie réseau live (`En ligne` avec pulsation / `OfflineIndicator` d'urgence), profil utilisateur avec pastille d'activité temps réel et badge de rôle thématique (`OWNER` en or, `MANAGER` en indigo, `CAISSIER` en émeraude), actions rapides de verrouillage de session PIN et déconnexion sécurisée. 0 erreur `tsc` et 0 warning `eslint`.
- **[UNIFICATION PARAMÈTRES UX & SUPPRESSION MOCKS - 2026-09-17]** : Élimination complète de la divergence Frontend ≠ Backend. Remplacement des faux tableaux en mémoire par un `layout.tsx` partagé à onglets persistants (`/parametres`, `/utilisateurs`, `/etablissements`, `/appareils`, `/abonnement`, `/journal` réservé OWNER). Connexion directe à l'API réelle `/api/admin/tenant`, création de l'espace `/parametres/abonnement` (quotas, dunning J+0..J+30, plan actif).
- **[WORKFLOW INVITATION & SECRET PERSONNEL - 2026-09-17]** : Implémentation du cycle d'onboarding bancaire/confidentiel : l'admin invite par nom/email/rôle sans fixer de secret. Ajout de `POST /users/me/pin` dans l'API backend. Sur `/set-password`, le collaborateur définit lui-même son mot de passe et son code PIN de caisse à 4 chiffres (hashé bcrypt). Ajout du partage WhatsApp direct du lien d'invitation pour le terrain ouest-africain.
- **[CENTRE DE RÉSOLUTION DES CONFLITS OFFLINE - 2026-09-17]** : Extension de `useSync` (`rejectedCount`, `rejectedSales`, `discardSale`, `retrySale`). Création de `SyncConflictsModal` et intégration d'un badge d'alerte animé cliquable dans la Topbar (`AppTopbar`) et `OfflineBanner` pour traiter les rejets serveur (ex. oversell hors-ligne sur stock épuisé) avec option d'écarter (recrédit stock local) ou de réessayer.
- **[SUPPORT UNIVERSEL DES NOMBRES DÉCIMAUX (FLOAT) - 2026-10-04]** :
  - **Base de données PostgreSQL (Supabase)** : Migration de toutes les colonnes de quantité de `integer` vers `double precision` (`products.stock`, `product_stock.quantite`, `stock_movements.quantite`, `sale_items.quantite`, `inventory_items.quantite_theorique`, `inventory_items.quantite_comptee`, `inventory_items.ecart`, `purchase_order_items.quantite_commandee`, `purchase_order_items.quantite_recue`).
  - **Prisma ORM (`packages/db/prisma/schema.prisma`)** : Typage de toutes les quantités en `Float` et régénération de `@prisma/client`.
  - **Backend API NestJS (`apps/api/src/pos/sales.service.ts`)** : Correction critique de la déduction de stock lors des ventes POS fractionnées (`0.25`, `0.5`, `0.75`, `1.5`, etc.) pour déduire exactement `item.quantite` et non une quantité tronquée ou `-1`.
  - **Frontend Web & UI** :
    - `packages/ui/src/utils/formatters.ts` : Adaptation de `formatQty` avec `maximumFractionDigits: 3` pour formater élégamment les décimales sans zéros inutiles.
    - `apps/web/src/components/pos/cart-quantity-input.tsx` : Saisie libre et directe au clavier de tout nombre décimal (virgule `,` ou point `.`), synchronisation avec le store panier POS, gestion stable du focus/blur pour permettre la saisie fluide sans écrasement prématuré.
    - `apps/web/src/components/stock/stock-adjust-modal.tsx` : Remplacement de `parseInt` par `parseFloat` avec `step="any"` pour les ajustements de stock manuels.
- **[RÉGULARISATION POINT DE STOCK & HISTORIQUE DES SESSIONS - 2026-10-04]** :
  - **Auto-création transparente de session d'inventaire** : Correction du blocage silencieux sur "Confirmer la régularisation". Désormais, si aucune session d'inventaire n'est préalablement ouverte sur l'établissement, le système crée automatiquement la session (`POST /inventory/sessions`), enregistre les lignes (`POST /inventory/sessions/:id/lines`) puis procède à la réconciliation (`POST /inventory/sessions/:id/reconcile`).
  - **Onglet Historique & PV imprimable (`apps/web/src/app/(app)/stock/inventaire/page.tsx`)** : Implémentation d'une vue à onglets ("Point de stock" / "Historique des inventaires"). L'historique permet d'inspecter les sessions clôturées, les métriques d'écarts (quantités et valorisation financière), et d'ouvrir une modale détaillée avec impression du Procès-Verbal (PV) de réconciliation.
  - **Correctif d'affichage** : Élévation du z-index de la boîte de dialogue de confirmation en `z-[100]` pour garantir sa visibilité au-dessus de la navigation.
- **[MODALE SÉLECTION DU CONDITIONNEMENT POS - 2026-10-04]** : Ajout de `ProductSelectModal` au POS pour permettre de sélectionner le conditionnement de vente (ex. vente au casier complet ou à la bouteille individuelle) dès le clic sur le produit.
- **[SYNCHRONISATION MÉMOIRE DEXTY SYSTÉMATIQUE - 2026-10-04]** : Règle absolue inscrite dans `GEMINI.md` (règle 12.4) et `AGENTS.md` (règle cardinale 9) : toujours mettre à jour `.dexty/temp-memory-projet.md` avec l'ensemble des paramètres, décisions et statuts avant tout push Git, assurant une mémoire d'agent permanente et prévenant toute régression.
- **[VENTES DÉCIMALES EXACTES — POIDS/VOLUME + FUSION FLOAT - 2026-10-04]** :
  - **Bug constaté (simulation Prestige Store)** : pour un produit « Au poids/Au volume », le stock est en milli-unités (5 kg = 5000) mais la vente débitait la quantité brute → 0,25 kg ne retirait que 0,00025 kg, survente acceptée, Σ mouvements ≠ stock vendu.
  - **Décision** : fusion des deux approches. Poids/volume → milli-unités ENTIÈRES (§19.1, exact, sans flottant) ; « À l'unité » → fraction permise (½ poisson) en Float bornée au millième + tolérance `STOCK_EPSILON = 1e-6` sur les comparaisons de stock.
  - **Schéma** : `sale_items.quantity_scale` (snapshot 1000/1). Migration `20261004120000_sale_item_quantity_scale` (contient aussi les ALTER Float, idempotents si `db push` déjà fait). ⚠️ À appliquer sur Supabase : `prisma db execute --url "$DIRECT_URL" --file prisma/migrations/20261004120000_sale_item_quantity_scale/migration.sql`.
  - **Encodage `DEC:` abandonné en écriture** : les lignes legacy (`DEC:q:prix:libellé`, « 0,5 kg ») sont décodées à la lecture par `toDisplayItem()` (`apps/api/src/pos/sale.mapper.ts`), point de sortie unique (historique, client, reçu public, analytics, remboursement).
  - **Helpers partagés (`packages/types/src/product.ts`)** : `saleLineAmount(prix, qté)` (même arrondi POS ↔ serveur ↔ reçu) et `saleQuantityStep(kind)` (¼ kg/L, ½ casier, 1 pièce).
  - **Analytics/valorisation** : marge, CA et valeur de stock ramenés au kg/L (avant : ×1000 pour les produits au poids).
  - **POS web** : modale décimale pour poids/volume (¼, ½, 1, 2), stock affiché « 4,75 kg », garde-fou stock insuffisant, prix « / kg » dans le panier, retours par pas de 0,25.
  - **Vérification** : `DATABASE_URL=… tsx apps/api/scripts/simulate-decimal-sales.ts` → 37/37 contrôles (poisson kg, huile L, poisson fumé pièce ; Σ mouvements exacte, survente refusée, retour/annulation exacts).
