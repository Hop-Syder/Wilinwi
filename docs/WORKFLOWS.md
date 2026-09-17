# Wilinwi — Workflows système (branche `main-mvp2`, référence déployée)

> Document généré par analyse directe du code (`apps/api`, `apps/web`, `apps/admin-web`,
> `packages/types`, `packages/db`, `packages/offline`) sur `main-mvp2` — la branche que
> Render déploie en production. Chaque affirmation est ancrée à un fichier réel ; là où
> le code contredit `CLAUDE.md`, c'est signalé explicitement (§11).

---

## 1. Vue d'ensemble

Wilinwi est un SaaS multi-tenant (POS · Stock · Pay · CRM · Analytics) pour commerces
ouest-africains. Deux frontends Next.js (`apps/web` client, `apps/admin-web` console
super-admin séparée) + un backend NestJS monolithique modulaire + PostgreSQL/Supabase
avec Row-Level Security. Isolation stricte : **toute** requête métier passe par
`PrismaService.forTenant(tenantId, tx => …)`, qui pose `app.current_tenant_id` en
variable de session Postgres avant d'exécuter la transaction — sans ça, la RLS ne
laisse rien remonter (fail-closed, pas fail-open).

---

## 2. Le modèle RBAC — deux axes indépendants qui se combinent

### 2.1 Axe rôle (`packages/types/src/roles.ts`)

5 rôles : `OWNER, MANAGER, SELLER, CASHIER, DELIVERY`.

| Rôle | Capacités | Modules par défaut | Résumé du workflow |
|---|---|---|---|
| **OWNER** | Toutes (24 capacités) | Tous | Pilote l'ensemble : configuration, utilisateurs, abonnement, données sensibles complètes. |
| **MANAGER** | = OWNER sauf `subscription:manage` | POS, STOCK, PAY, CRM, ANALYTICS, DELIVERY | Gère l'opérationnel complet sans toucher à la facturation de l'abonnement. Anti-escalade (ne peut pas modifier/rétrograder un OWNER) appliquée **côté service**, pas dans la matrice. |
| **SELLER** | `stock:read, sale:create, sale:read, client:read` | POS, STOCK | Consulte le stock, vend, identifie un client — pas de caisse, pas de données sensibles. |
| **CASHIER** | `sale:create, sale:read, sale:return, cash:collect, cash:close, cash:disburse, client:read, client:view_credit, client:collect_payment` | POS, CRM | Vend, encaisse, ouvre/ferme sa caisse, gère retours et remboursements de dette — jamais prix d'achat ni marge. |
| **DELIVERY** | `delivery:update` uniquement | DELIVERY | Met à jour le statut de ses livraisons assignées. Rien d'autre. |

Sécurité au niveau champ, appliquée à un seul point de sortie par entité (jamais dupliquée) :
- `canSeeSensitivePricing(role)` = a `reports:read_full` → seuls OWNER/MANAGER voient `prixAchat`/`coutUnitaire`/marge/valorisation d'achat.
- `canSeeClientCredit(role)` = a `client:view_credit` → OWNER/MANAGER/CASHIER voient `soldeCredit`/`plafondCredit`.
- `prixPlancher` est **toujours visible par tous** (donnée de négociation) — seule la vente en dessous est bloquée serveur.

`effectiveCapabilities` = `ROLE_CAPABILITIES[role]` filtrées aux modules effectifs ; `effectiveModules` = (overrides personnalisés par utilisateur, sinon défaut du rôle) ∩ (modules du plan ∪ add-ons `Tenant.moduleAddons`).

### 2.2 Axe infrastructure d'établissement (`packages/types/src/capabilities.ts`)

Chaque établissement porte une **infrastructure métier** (`RETAIL/FOOD/HEALTH/SERVICE/WHOLESALE`, indépendante de son `type` physique boutique/entrepôt), qui active un jeu de capacités fines :

| Infrastructure | Capacités de base |
|---|---|
| RETAIL | `pos.standard, stock.simple, inventory.basic, pricing.floor` |
| FOOD | `pos.touch, food.tables, food.kitchen, stock.simple, recipes.basic` |
| HEALTH | `pos.standard, stock.simple, stock.batches, stock.expiry, stock.fefo` |
| SERVICE | `pos.service, appointments.basic, staff.commissions, stock.consumables` |
| WHOLESALE | `pos.wholesale, stock.simple, stock.unitConversions, crm.creditAdvanced, deliveries.advanced` |

`resolveEffectiveCapabilities(infrastructure, plan, role, dunning, addOns)` — résolution en 5 couches, **même resolver utilisé côté web et API** :

1. `dunning.posBlocked` (impayé J+30) → court-circuit total, `[]`.
2. Plan effectif = `STARTER` si `dunning.downgraded` (J+7), sinon plan réel.
3. Base = capacités de l'infrastructure (`planAllowsInfrastructure` est **toujours permissif aujourd'hui** — l'arbitrage tarifaire n'est pas tranché).
4. Union avec les add-ons.
5. Si `dunning.suspendNonVital` (J+3) → retrait de `deliveries.advanced, crm.creditAdvanced, staff.commissions, appointments.basic`.
6. Filtre final : chaque capacité d'infra exige une capacité de rôle sous-jacente (ex. `pos.standard`→`sale:create`, `stock.simple`→`stock:read`).

**Exemple concret** — établissement WHOLESALE, plan BUSINESS, rôle CASHIER, dunning J+3 (`suspendNonVital: true`) :
base `[pos.wholesale, stock.simple, stock.unitConversions, crm.creditAdvanced, deliveries.advanced]` → retrait non-vital `[pos.wholesale, stock.simple, stock.unitConversions]` → filtre rôle (CASHIER n'a pas `stock:read`) → **résultat final : `[pos.wholesale]` seul**. Le caissier peut vendre en mode gros mais pas consulter le stock.

*Capacités déclarées mais non exploitées par une route API aujourd'hui* : `appointments.basic`, `staff.commissions`, `food.kitchen`, `stock.consumables`, `stock.expiry` — câblées dans la matrice, aucun `@RequireInfraCapability` correspondant trouvé dans le code.

### 2.3 Chaîne de guards backend (ordre d'exécution réel)

`ThrottlerGuard` (300 req/min/IP) → `AuthGuard` (JWT + calcul complet de l'`AuthContext`) → `CapabilitiesGuard` (`@RequireCapabilities`) → `InfraCapabilitiesGuard` (`@RequireInfraCapability`/`@RequireAnyInfraCapability`) → `NonVitalGuard` (bloque les routes `@NonVital()` dès dunning J+3) → `ReadOnlyGuard` (bloque toute écriture dès dunning J+3). Routes `@Public()` court-circuitent tout sauf le throttle.

---

## 3. Authentification — double mécanisme

### 3.1 Connexion initiale (Supabase, email + mot de passe)

1. Le navigateur appelle directement le SDK Supabase Auth (hors backend Wilinwi) → JWT **ES256** signé par Supabase.
2. `AuthGuard` (`apps/api/src/common/auth.guard.ts`) décode l'en-tête du token : `ES256` → vérifié via `createRemoteJWKSet` (JWKS distant du projet Supabase, cache 10 min, warm-up au démarrage du module) ; en cas d'échec, repli `HS256` avec `SUPABASE_JWT_SECRET` local.
3. Le payload porte `tenant_id`/`sub` (posés à l'inscription par `SupabaseAdminService.setClaims()`), mais **le rôle réel est toujours relu en base** à chaque requête — jamais fait confiance au JWT pour l'autorisation.

### 3.2 Bascule PIN (poste de caisse partagé)

Prérequis : une session tenant déjà valide sur l'appareil (JWT existant, sert de preuve d'appartenance — ce n'est **pas** un login autonome depuis zéro).

`POST /auth/pin-login {userId, pin}` → `AuthService.pinLogin()` :
- Vérifie un verrou anti-bruteforce **en mémoire** (`Map` clé `${tenantId}:${userId}`) : au 5ᵉ échec, verrou de 60 secondes (`UnauthorizedException`).
- Succès → compare au hash bcrypt, reset le compteur, **mint** un nouveau JWT HS256 (`jose`/`SignJWT`), expiration **12h**, mêmes claims `tenant_id`/`role`.
- Le frontend remplace simplement le token courant — bascule de profil instantanée, sans requête réseau supplémentaire vers Supabase.

### 3.3 Limite d'appareils (commerciale, pas sécurité)

`touchDevice()` applique `maxDevices` du plan à chaque `GET /auth/me` avec `X-Device-Id` : nouvel appareil au-delà du quota → 403, **sauf pour l'OWNER** (pour ne jamais se retrouver verrouillé dehors). Appareil révoqué → 403 pour tous. Inactivité > 30 jours → libère automatiquement la place.

---

## 4. Workflows par rôle — parcours concrets dans l'app cliente (`apps/web`, port 3000)

### 4.0 Shell commun

Navigation desktop (sidebar) / mobile (bottom-tab-bar 4 items + drawer "Plus"), filtrée par `canSee()` : accès aux modules (`ADMIN` = OWNER/MANAGER codé en dur pour `/entrepot` et `/parametres`), capacités d'infrastructure, et masquage systématique de `/pos` en vue "Tous les établissements". Le **sélecteur d'établissement** (`EtablissementSwitcher`) permet à un OWNER avec ≥2 boutiques de basculer entre une boutique précise et une vue globale consolidée (lecture seule, `isGlobalView`) — bascule instantanée, sans reconnexion.

Écrans bloquants globaux (avant tout accès) : onboarding pays/ville obligatoire pour un OWNER sans localisation ; `DunningBlock` plein écran si `dunning.posBlocked` (J+30), sauf OWNER sur `/parametres` pour régulariser ; `PinSwitchModal` si connecté sans token PIN valide sur un poste multi-utilisateurs.

### 4.1 OWNER / MANAGER — parcours complet

Accès à tout le SaaS client : Hub (`/`), Dashboard + Rapports historiques, Stock (catalogue, fiches produit, import CSV, transferts), Caisse (`/pos`, ouverture/fermeture de session, ventes, retours), Ventes (historique, clôtures, annulation réservée à ce rôle), Clients (CRM, encaissement dettes), Entrepôt (fournisseurs, bons de commande, réceptions, Dispatch — **réservé OWNER/MANAGER**), Trésorerie (dépenses, virements, clôtures de compte), Livraisons (assignation + pointage fonds livreur, réservé à ce rôle), Paramètres (utilisateurs, établissements, journal d'audit *[OWNER strict]*, appareils).

Différence OWNER/MANAGER : seul OWNER gère l'abonnement (`subscription:manage`), voit le breakdown de stock par établissement en vue consolidée, accède au Journal d'audit (`/parametres/journal`), et ne peut jamais être rétrogradé/désactivé — même par un autre OWNER.

### 4.2 SELLER — parcours

Accès : Hub, Stock (lecture), Caisse (vente uniquement — pas de clôture, pas de retour). Pas de Dashboard, pas de CRM avancé, pas de Trésorerie, pas d'Entrepôt. Ne voit jamais prix d'achat/marge ni crédit client.

### 4.3 CASHIER — parcours (le rôle caisse pur)

Accès : Hub, Caisse complète (ouverture de session, vente, checkout, **clôture avec Rapport Z**, retours partiels), Clients (lecture + encaissement de remboursement de dette). Décision produit explicite (« TDR v2 ») : le caissier **vend lui-même** — ce n'est pas qu'un rôle d'encaissement passif. Ne voit jamais prix d'achat/marge. Dans `/treasury`, ne peut décaisser (`cash:disburse`) que le compte **CAISSE** (espèces) — Mobile Money/Banque réservés à qui a `treasury:write` (OWNER/MANAGER).

### 4.4 DELIVERY — parcours (le plus restreint)

**Le Hub le redirige directement vers `/livraisons`, son seul espace** (`ROLE_MODULES.DELIVERY = ['DELIVERY']` — aucune autre entrée de navigation visible ; `/pos` le redirige aussi vers `/livraisons` s'il y accède par URL directe). Là : bascule Kanban (À Préparer/En Transit/Livrée/Échec) ↔ Tableau, change le statut de ses livraisons (`POST /pos/sales/:id/delivered`), appel direct client/livreur, lien WhatsApp pré-rempli. Les actions de gestion (assignation, pointage fonds) restent réservées à OWNER/MANAGER. Le filtrage strict "un livreur ne voit que ses propres livraisons" est appliqué **côté API** (`delivery:update` + comparaison `livreurId`), pas visible dans le code frontend.

### 4.5 Réglages — un point d'attention réel

La page `/parametres` principale (5 onglets) est **en grande partie une maquette non branchée** — la plupart des sous-composants (Équipe&PIN, Établissements, Journal) affichent du **state local pré-rempli de données factices**, sans réelle persistance serveur (seul l'onglet Entreprise sauvegarde réellement). En parallèle, **4 sous-routes réellement fonctionnelles et branchées à l'API** existent mais sont **quasi orphelines de la navigation** : `/parametres/utilisateurs` (seule linkée, depuis le Hub), `/parametres/etablissements`, `/parametres/journal` (réel, réservé OWNER strict), `/parametres/appareils` (réel, accessible seulement par URL directe, aucun lien nulle part). À corriger : soit brancher la page principale sur ces vraies routes, soit les exposer dans la navigation.

---

## 5. Console plateforme super-admin (`apps/admin-web`, port 3001) — équipe Wilinwi uniquement

Séparée du SaaS client à trois niveaux indépendants :

1. **Identité** — allowlist `PLATFORM_ADMIN_EMAILS` (variable d'env) → `ctx.isPlatformAdmin`, posé après authentification normale.
2. **Accès cross-tenant** — uniquement via des fonctions Postgres `SECURITY DEFINER` du schéma `app` (`app.platform_tenants_overview()`, `app.billing_set_plan()`, etc.), appelées en `$queryRaw`/`$executeRaw`, **jamais** via `forTenant`/RLS classique.
3. **Verrou base** — ces fonctions sont réservées au rôle Postgres `wilinwi_admin`, révoquées au rôle applicatif public `wilinwi_app`. Connexion séparée via `ADMIN_DATABASE_URL` (`AdminPrismaService`) ; absence de la variable → repli fail-closed sur le rôle public (403, jamais de contournement silencieux).

Parcours super-admin : Cockpit (MRR, GMV, impayés, abonnements arrivant à échéance) → **Entreprises** (page la plus riche : changer de plan en un clic, enregistrer un règlement manuel, suspendre/réactiver un abonnement, activer des modules à la carte, **supprimer définitivement** un tenant avec confirmation par saisie du nom) → Utilisateurs cross-tenant (bloquer un compte, réinitialiser PIN/mot de passe) → Abonnements (éditer les 4 plans et leurs limites, tarifer les surcoûts d'infrastructure) → Revenus (MRR/ARR/ARPU/churn — approximations instantanées, pas un calcul temporel réel) → Analytics (funnel d'activation : ≥10 produits ET ≥1 vente) → Alertes (anomalies cross-tenant type stock négatif, conflits de lots — lecture seule, résolution laissée à l'entreprise) → Journaux (audit complet, lecture seule).

`POST /platform/billing/run-overdue` déclenche manuellement la même bascule que le cron automatique (§6.7).

---

## 6. Événements système — flux métier transverses

### 6.1 Cycle de vente POS (le cœur du produit)

**Session de caisse (Rapport Z)** : ouverture (`POST /pos/sessions/open`, fond initial, idempotente) → ventes rattachées automatiquement → clôture (`POST /pos/sessions/close`) qui **recalcule les totaux depuis les ventes réelles en base** (pas des compteurs incrémentaux, pour éviter toute dérive) : `soldeTheorique = fondInitial + totalEspeces`, `ecart = soldeReel déclaré − soldeTheorique`. Un écart négatif génère automatiquement une notification de gestion (pas de blocage). Une vente sans session ouverte auto-crée une session à fond 0.

**Création de vente** (`POST /pos/sales`, garde `sale:create` + au moins une capacité `pos.*` d'infrastructure active) — ordre de validation :
1. Produit exclu de la boutique ou non vendable en caisse → refus (404 non-révélateur pour l'exclusion, afin de ne pas divulguer son existence).
2. Précontrôle de stock **seulement** si le type de produit l'exige (`saleStockBehavior` — voir §7) — jamais pour SERVICE/MANUFACTURED, jamais au précontrôle pour BATCHED (géré par FEFO à la finalisation).
3. **Anti-fraude absolu** : `prixReel < prixPlancher` → refus immédiat, **aucun flux d'approbation** (entièrement supprimé du produit — pas de `PENDING_APPROVAL`, pas de `sale:override_floor_price`).
4. Résolution/création automatique du client par téléphone si fourni sans ID.
5. **Plafond de crédit** vérifié si paiement Crédit/Acompte : refuse si `soldeCredit + detteProjetée > plafondCredit`.
6. Vente finalisée **dans la même transaction** (pas de flux asynchrone) : décrément de stock selon le type de produit, résolution du paiement (5 modes : Espèces/Mobile Money/Banque/Crédit/Acompte, avec paiement mixte espèces+autre mode), ventilation en trésorerie par compte, génération d'un reçu public accessible sans authentification (QR → `/api/public/receipt/:code`).

**Retours et annulations** : l'annulation (`sale:cancel`, réservée OWNER/MANAGER) inverse exactement la finalisation — ré-entrée stock, reversal trésorerie et dette client bornés à ce qui a réellement été affecté. Le retour partiel (`sale:return`, accessible au CASHIER) recrédite proportionnellement et propose remboursement cash (borné à ce qui a été réellement encaissé) ou avoir client.

### 6.2 Cycle Hub & Spoke — approvisionnement (`/entrepot`)

Fournisseur (avec dette suivie) → **Bon de commande** — règle centrale : si l'entreprise possède un établissement de type Entrepôt, tout bon de commande DOIT le cibler comme destination (commander directement vers une boutique physique est refusé tant qu'un entrepôt existe) → **Réception** (potentiellement partielle, plusieurs passages possibles ; solde impayé ajouté automatiquement à la dette fournisseur) → stock disponible à l'entrepôt → **Dispatch** (transfert entrepôt→boutique) : un brouillon peut être créé puis validé séparément, ou créé+validé en un appel ; la validation déplace le stock **définitivement et atomiquement** (décrément source + incrément destination + deux mouvements de traçabilité) — il n'existe pas d'étape "réception boutique" séparée dans le code actuel, contrairement à ce que le vocabulaire pourrait suggérer.

### 6.3 Inventaire physique

Workflow en 3 étapes avec séparation des pouvoirs délibérée : comptage lancé (`inventory:count`, fige le stock théorique) → saisie des quantités réelles → **validation** (`inventory:validate`, capacité **distincte**, en pratique OWNER/MANAGER) qui seule applique les écarts comme mouvements d'ajustement réels.

### 6.4 Crédit client et recouvrement

Encaissement d'un remboursement : si une vente précise est ciblée, elle est soldée en priorité ; le reste est appliqué **FIFO strict** aux ventes impayées du client (les plus anciennes dettes en premier). Le plafond (`plafondCredit`, `null` = illimité) est vérifié à la création de la vente, pas à l'encaissement.

### 6.5 Trésorerie

3 comptes (Caisse/Mobile Money/Banque) par établissement. Dépense, virement neutre inter-comptes (refusé si solde source insuffisant), et **clôture de compte** qui compare solde théorique calculé au solde réel déclaré — un écart non nul exige un motif obligatoire, puis le solde système est réaligné par un mouvement d'ajustement égal à l'écart.

### 6.6 Notifications automatiques

Générées dynamiquement (pas stockées en dur) à chaque consultation : stock bas par (produit×établissement), auto-résolues dès le retour au-dessus du seuil ; impayé tant que le tenant n'est pas `ACTIVE` ; écart de caisse négatif à la clôture de session.

### 6.7 Dunning / facturation — cascade complète

Purement dérivé d'une date (`pastDueSince`), recalculé à chaque requête sans cache de session :

| Palier | Délai | Effet |
|---|---|---|
| ACTIVE | — | Aucune restriction. |
| WARNING | J+0 | Notification seulement. |
| RESTRICTED | J+1 à J+3 | Période de grâce. |
| READ_ONLY | J+3 | Toute écriture bloquée (`ReadOnlyGuard`) ; rapports avancés suspendus (`NonVitalGuard`) ; capacités non-vitales retirées (livraisons avancées, crédit CRM avancé, commissions staff, rendez-vous). |
| DOWNGRADED | J+7 | Plan effectif ramené à STARTER partout ; catalogue bridé aux 50 articles les plus anciens (jamais supprimés, juste masqués — restauration instantanée au paiement) ; établissements accessibles réduits à 1 si multi-boutique ; add-ons neutralisés. |
| BLOCKED | J+30 | `posBlocked` → **aucune vente possible nulle part**, même côté serveur (court-circuit total des capacités d'infrastructure). |

Déclenchement : cron applicatif toutes les 12h (`SubscriptionCronService`) **ou** déclenchement manuel super-admin (`POST /platform/billing/run-overdue`) — deux voies redondantes vers le même effet SQL. Régularisation (`POST /platform/tenants/:id/payment`) : réactive immédiatement et reporte l'échéance d'un cycle.

**Pattern « grand-père » observé partout** : à la baisse d'un quota (downgrade ou dunning), rien n'est jamais supprimé — seules les nouvelles créations sont bloquées ou l'affichage est replié/tronqué.

### 6.8 Synchronisation offline (vente hors-ligne)

Le POS enregistre **toujours localement d'abord** (IndexedDB/Dexie) et débite immédiatement le stock du cache local (anti-oversell entre deux ventes offline successives). Au retour réseau, envoi par lot à `/api/sync/sales`, qui délègue à **exactement le même chemin métier** que la vente en ligne (mêmes gardes, mêmes règles — « la sync offline n'est pas une porte dérobée »). Idempotence garantie par `clientGeneratedId` (double protection : vérification applicative + contrainte unique en base, avec récupération de la vente existante en cas de course).

Statuts possibles côté client : `pending → syncing → synced` (succès) ou `error` (échec transitoire réseau/5xx, retenté automatiquement) ou `rejected` (échec métier permanent, ex. stock insuffisant — sort de l'auto-retry, l'utilisateur doit corriger ou écarter, ce qui recrédite le stock local).

### 6.9 Isolation multi-tenant (RLS)

`app.current_tenant_id()` lit une variable de session Postgres. `PrismaService.forTenant()` ouvre une transaction, pose cette variable localement (`set_config(..., true)`), exécute la logique métier, puis elle disparaît au commit. Les policies RLS sont posées avec `FORCE ROW LEVEL SECURITY` — appliquées même au rôle propriétaire de la table, donc non contournables applicativement. Toute requête qui ne passerait pas par `forTenant()` ne verrait aucune ligne (fail-closed).

---

## 7. Types de produit et politique de stock (`packages/types/src/product.ts`)

4 types : `STANDARD, BATCHED, MANUFACTURED, SERVICE`. Comportement de vente (`saleStockBehavior`) :

| Type × Politique | Précontrôle stock | Décrément |
|---|---|---|
| SERVICE / MANUFACTURED | Jamais | Jamais (vendable sans stock ; MANUFACTURED décrémente ses ingrédients à la place, non bloquant si déficit) |
| STANDARD/BATCHED + STRICT | Oui | Oui (bloque si insuffisant) |
| STANDARD/BATCHED + ALLOW_NEGATIVE | Non | Oui (jamais bloqué, lève une alerte d'audit si le solde passe sous 0) |
| STANDARD/BATCHED + NO_STOCK | Jamais | Jamais |

BATCHED (lots/péremption) n'entre en stock **que** par réception de lot tracée (jamais de stock initial direct), et se consomme en FEFO (premier périmé, premier sorti) à la vente — un déficit devient une alerte critique, jamais un blocage de vente.

---

## 8. Invariants transverses à ne jamais casser

1. **Vente sous le prix plancher = refus absolu**, sans exception, sans flux d'approbation.
2. **Le stock ne se modifie jamais directement** — toujours via un mouvement tracé qui maintient en même temps la colonne globale et la projection par établissement.
3. **BATCHED n'entre en stock que par réception de lot tracée.**
4. **Le prix d'achat n'est jamais visible par SELLER/CASHIER/DELIVERY** — un seul point de sortie par entité.
5. **Toute opération métier passe par `PrismaService.forTenant()`** — la RLS Postgres est la frontière réelle, pas juste applicative.
6. **Le dunning est purement dérivé d'une date**, recalculé à chaque requête, jamais mis en cache dans une session.
7. **La synchronisation offline emprunte exactement le même chemin métier que la vente en ligne** — aucune règle affaiblie pour le mode déconnecté.

---

## 9. Écarts constatés vs. documentation existante (`CLAUDE.md`)

`CLAUDE.md` affirme (au moment de la rédaction de ce document) que BATCHED (lots/péremption), les recettes Food et le multi-conditionnement Wholesale sont *« schema-ready mais PAS activés »*. **C'est inexact dans le code actuel de `main-mvp2`** : les trois sont pleinement câblés et actifs — réception/ajustement de lots avec consommation FEFO réelle à la vente, recettes avec décrément réel des ingrédients, conversions d'unités utilisées dans le panier POS. À corriger dans `CLAUDE.md`.

---

## 10. Sources

Document assemblé à partir d'une exploration directe de `main-mvp2` (commit `879828415e39a3151fd5826ab9604d4d62b782ba` au moment de la rédaction) : tous les modules de `apps/api/src/`, toutes les routes de `apps/web/src/app/(app)/` et `apps/admin-web/src/app/platform/`, `packages/types/src/{roles,capabilities,dunning,product}.ts`, `packages/db/prisma/rls.sql`, `packages/offline/src/{db,sync}.ts`. Chemins de fichiers précis disponibles sur demande.
