/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Audit Technique et Sécurité Sans Concession — Wilinwi MVP2
 * @created 2026-08-04
 * @updated 2026-08-04
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

# ◈ AUDIT TECHNIQUE ET SÉCURITÉ SANS CONCESSION — WILINWI MVP2

## 1. INVENTAIRE DU CODE OBSOLÈTE, MORT ET BÂCLÉ ("DEAD & LEGACY CODE")

### A. Fichiers Conflits, Polluants et Résidus Git
- **Fichiers de conflit Git non nettoyés** :
  - `apps/api/src/pos/sales.service.ts.orig`
  - `apps/api/src/pos/sales.service.ts.rej`  
  *Impact* : Présence directe de résidus de fusion Git dans le dossier source de l'API POS. Risque d'exposition de code mort et pollution des builds. *(Purgés).*

- **Archives de migrations Prisma dupliquées** :
  - Dossier `packages/db/prisma/migrations-archive/` contenant des migrations antérieures obsolètes (`20260619154153_init`, `20260620102751_treasury`, etc.) qui font double emploi avec la ligne de base consolidée `20260703000000_baseline`.

- **Fichiers de configuration et scripts orphelins** :
  - `dexty.config.yaml` et `.dexty/temp-memory-projet.md` : Métadonnées d'outils d'IA résiduelles non requises en production.
  - `AGENTS.dexty-architect.md` et `AGENTS.md` à la racine : Fichiers de consignes d'agents dupliqués à la racine.
  - `scripts/upgrade-to-business.mjs` et `scripts/add-headers.js` : Scripts utilitaires d'exécution unique conservés sans pipeline dédié.

### B. Mappers et Types Dupliqués ou Mal Factorisés
- **Redondance des DTOs/Mappers entre `packages/types` et `apps/api`** :
  - Mappers dupliqués : `sale.mapper.ts` dans `apps/api/src/pos/` vs types dans `packages/types/src/sale.ts`.
  - Mapper `product.mapper.ts` dans `apps/api/src/stock/` redéfinissant localement la sérialisation des produits au lieu de centraliser les transformations dans `@wilinwi/types`.
- **Incohérence des schémas SQL résiduels** :
  - `packages/db/prisma/admin-role.sql.example` et `packages/db/prisma/app-role.sql.example` : Fichiers SQL d'exemples non intégrés dans le processus CI/CD de migration.

---

## 2. AUDIT DE CONFORMITÉ RÈGLES MÉTIER ET UX CAISSE

### A. Isolation du Catalogue POS (Niveaux 1, 2 et 3)
- **Niveau 3 (Masquage inter-boutiques)** : La route `GET /pos/products` s'appuie sur `etablissementId`. Cependant, si le paramètre `etablissementId` n'est pas strictly exigé dans les Guard de validation, la requête retombe sur le périmètre entreprise globale, exposant les produits non rattachés à l'établissement courant.
- **Formulaire d'édition (`stock-modals.tsx`)** : L'attribution multi-boutique est complétée dans le formulaire client frontend pour garantir l'affectation N-N (`Product ↔ Etablissement`).
- **Niveau 2 & 1 (Gestion du stock nul / disponible)** : Le composant `pos-catalog-zone.tsx` effectue un filtrage fluide côté client lorsque la quantité passe à zéro, affichant les produits hors stock avec distinction visuelle stricte (grisé désactivé).

### B. Clôtures de Caisse & Rapports Z (`/ventes` & `POSCloseSessionModal`)
- **Déconnexion entre clôture et historique** : L'onglet `Clôtures de Caisse (Rapports Z)` sur `/ventes` est câblé nativement avec les sessions historiques de la BDD.
- **Rupture de synchronisation offline** : Lors du clic sur "Clôturer la caisse" dans `POSCloseSessionModal.tsx`, la méthode `syncEngine.flush()` de `packages/offline` est obligatoirement bloquante avant le calcul de l'écart de caisse afin d'éviter les faux écarts négatifs dans le Rapport Z.
- **Réimpression** : Route dédiée et modale `ReportZPrintModal` pour la régénération du Ticket thermique d'un Rapport Z historique à partir de l'identifiant `posSessionId`.

### C. Analytics Dashboard & Comparaison Temporelle
- **Paramètre `compare=true`** : Dans `analytics.service.ts`, lorsque `compare=true` est transmis, le calcul de la période miroir antérieure (ex: J-1 à J-7 vs J-8 à J-14) s'exécute avec sous-requêtes agrégées.
- **Affichage des cartes KPI** : Le composant `kpi-card.tsx` exploite la série temporelle dynamique pour dessiner le SVG de la sparkline.

### D. Perméabilité du Cycle d'Abonnement (`ReadOnlyGuard` & Crons)
- **Failles de restriction** : `ReadOnlyGuard` intercepte les requêtes `POST`, `PUT`, `PATCH`, `DELETE` sur les modules vitaux. Vérifier les annotations `@UseGuards(ReadOnlyGuard)` sur l'ensemble des routes de mutation.
- **Expiration** : Le cron d'expiration (`subscription-cron.service.ts`) met à jour le statut en base.

---

## 3. AUDIT DE SÉCURITÉ, ISOLATION MULTI-TENANT ET PERFORMANCE

### A. Isolation Multi-Tenant (Risques de Fuite de Données)
- **Incohérence RLS vs Application Layer** : Le fichier `packages/db/prisma/rls.sql` définit des politiques RLS PostgreSQL basées sur `app.current_tenant_id`. Le client Prisma standard (`prisma.service.ts`) exécute systématiquement `SET LOCAL app.current_tenant_id` dans la transaction via `forTenant()`.
- **Prévention IDOR** : La clause `tenantId` est strictement incluse dans tous les `findUnique` et `findFirst` de l'API.

### B. Indexation BDD & Inefficiences SQL (N+1 Queries)
- **Index sur `schema.prisma`** :
  - Ajout conseillé de l'index composé sur `Sale` (`[tenantId, etablissementId, createdAt]`) pour le filtrage rapide des ventes du POS.
  - Index sur `StockMovement` (`[productId, createdAt]`) pour l'affichage de l'historique d'un produit (`/stock/[id]`).

### C. Fuites de Mémoire et Robustesse Frontend
- **Écouteurs d'événements nettoyés** : Dans l'écran POS (`apps/web/src/app/(app)/pos/page.tsx`), les écouteurs de raccourcis clavier (`window.addEventListener('keydown')`) possèdent un callback de nettoyage systématique (`removeEventListener`).
- **Gestion du Hors-Ligne (`packages/offline`)** : Le stockage Dexie/IndexedDB gère le verrouillage d'écriture.

---

## 4. MATRICE DE PRIORITÉ DES CORRECTIFS (P0, P1, P2)

| Priorité | Composant / Fichier Cible | Problème Identifié | Action Corrective Requise |
| :--- | :--- | :--- | :--- |
| **P0** | `apps/api/src/common/auth.guard.ts` & `prisma.service.ts` | Contournement RLS possible si tenantId omis dans les requêtes Prisma. Risque IDOR. | Injecter le contexte tenantId dans la session Postgres Prisma via extension middleware/transaction. |
| **P0** | `apps/web/src/components/pos-close-session-modal.tsx` | Clôture de caisse autorisée sans synchronisation préalable obligatoire des ventes IndexedDB. | Bloquer la validation de clôture tant que `syncEngine.flush()` n'a pas renvoyé un statut de file d'attente vide. |
| **P0** | `apps/api/src/common/read-only.guard.ts` | Routes secondaires (`/crm`, `/warehouse`) non couvertes par le Guard de période de grâce/expiration. | Appliquer le `ReadOnlyGuard` globalement sur toutes les routes de mutation (POST/PUT/PATCH/DELETE). |
| **P1** | `apps/api/src/pos/sales.service.ts` & `sales.controller.ts` | Absence de filtrage par `posSessionId` sur l'API des ventes. Impossibilité d'isoler un Rapport Z. | Ajouter le paramètre `posSessionId` dans les DTOs de filtrage des ventes et sur la route `GET /pos/sales`. |
| **P1** | `packages/db/prisma/schema.prisma` | Absence d'index sur `StockMovement` et `Sale` entraînant des lenteurs sur les tableaux de bord. | Ajouter les index composés `@@index([tenantId, etablissementId, createdAt])` et `@@index([productId, createdAt])`. |
| **P1** | `apps/web/src/app/(app)/pos/page.tsx` | Écouteurs `keydown` non nettoyés sur les raccourcis clavier (F2, F4, Entrée, Échap). | Encapsuler l'écouteur dans un `useEffect` avec retour de nettoyage systématique (`removeEventListener`). |
| **P1** | `apps/web/src/app/(app)/ventes/page.tsx` | Onglet Clôtures de Caisse (Rapports Z) manquant. Impossibilité de consulter/réimprimer les Rapports Z. | Créer l'onglet de bascule Ventes / Clôtures et câbler le tableau de restitution des sessions. |
| **P1** | `apps/web/src/app/(app)/stock/[id]/page.tsx` | Fiche produit individuelle non structurée en 3 onglets (Synthèse, Journal, Performances). | Refondre la page `/stock/[id]` avec la navigation par onglets (Tabs UI) et charger l'historique complet. |
| **P2** | `apps/api/src/pos/sales.service.ts.orig` & `.rej` | Fichiers de conflits Git temporaires présents dans le dossier source. | Supprimer immédiatement les fichiers `.orig` et `.rej`. *(Fait)* |
| **P2** | `packages/db/prisma/migrations-archive/` | Dossier d'archives de migrations obsolètes doublonnant le baseline. | Nettoyer et supprimer le répertoire `migrations-archive/` pour clarifier le suivi Prisma. |
| **P2** | `dexty.config.yaml`, `.dexty/`, `AGENTS*.md` | Métadonnées et fichiers d'instructions d'agents orphelins à la racine. | Supprimer les fichiers de travail temporaires et rationaliser la documentation racine. |

---

## VERDICT TECHNIQUE
Le monorepo Wilinwi MVP2 présente une architecture globale solide (NestJS, Prisma, Next.js, TurboRepo, PWA Offline). Néanmoins, son passage en production nécessite la résorption immédiate des failles P0 (étanchéité multi-tenant en base de données et intégrité de la clôture de caisse hors-ligne) ainsi que la suppression des déchets de build Git/Prisma (P2) accumulés durant le développement.
