# Plan du projet — Admin & Pilotage Wilinwi

> **Objet** : plan détaillé du projet « Administration / Pilotage » — **ce qui est fait** et
> **ce qui reste**, organisé en phases actionnables (tâches, dépendances, effort, critères
> d'acceptation). Complète l'inventaire [pilotage-admin.md](pilotage-admin.md).
>
> Effort : S (≤ 0,5 j) · M (1–3 j) · L (1 sem) · XL (> 1 sem). État : ✅ fait · 🟡 partiel · ⛔ à faire.

---

## 0. Périmètre & vision

Le projet Admin couvre **deux niveaux** :

- **Entreprise (back‑office OWNER/MANAGER)** — piloter SON commerce. **Quasi complet.**
- **Plateforme (super‑admin Nexus)** — exploiter le SaaS (entreprises, facturation, config). **Livrée**
  (console séparée `admin-web`) ; reste la passerelle d'encaissement en ligne (§2.2).

Contrainte transverse : **multi‑tenant + RLS**. Toute lecture cross‑tenant (niveau plateforme)
passe par une fonction `SECURITY DEFINER` du schéma `app`, **réservée au rôle dédié `wilinwi_admin`**
(jamais le rôle applicatif `wilinwi_app`).

---

## 1. ✅ RÉALISÉ — Back‑office Entreprise

### 1.1 Socle multi‑entreprises / multi‑établissements ✅
- `Tenant` = Entreprise ; modèle `Etablissement` (8 types dont ENTREPOT) + `UserEtablissement` (accès employé↔boutique).
- Établissement courant via en‑tête `X‑Etablissement‑Id` (switch instantané, sans reconnexion).
- **Vue globale « Tous les établissements »** (OWNER) : agrégation + écritures bloquées.
- Données transactionnelles scopées par établissement (ventes, stock, trésorerie, inventaire, journal).
- Migration des données existantes + RLS sur les nouvelles tables.

### 1.2 Établissements (CRUD) ✅
- Créer / modifier / désactiver / supprimer (refus si données liées), types, coordonnées.
- Sélecteur header + remontage des pages au changement de boutique (rechargement des données).

### 1.3 Équipe & droits (RBAC) ✅
- 5 rôles, **capacités par module**, permissions personnalisées, **accès par établissement** (cases à cocher).
- Code **PIN** (exactement 4 chiffres) ; écran kiosque « Qui êtes‑vous ? » affichant la/les boutique(s).
- `cash:disburse` : le **caissier peut décaisser les espèces** (CAISSE) ; MoMo/Banque réservés au gérant.
- Invitation par email (Supabase) + anti‑escalade (MANAGER ≠ OWNER).

### 1.4 Abonnement & relance d'impayé (côté entreprise) ✅ / 🟡
- Paliers **STARTER / PRO / BUSINESS / ENTERPRISE** : gating modules réel, limites (établissements,
  utilisateurs, photos), tarifs.
- **Cycle `PAST_DUE`** (J+0 bannière → J+3 restriction rapports → J+7 downgrade Starter + 1 boutique +
  50 produits → J+30 blocage), **réversible**, non destructif. Simulateur de test (Paramètres).
- 🟡 La **mécanique d'effets** existe ; le **déclencheur de facturation** réel n'existe pas (cf. §2.2).

### 1.5 Stock par emplacement ✅
- `ProductStock` (solde matérialisé par produit/variante × établissement) — projection du grand livre.
- Vente vérifie le stock **de la boutique vendeuse**. Seuil de réappro **par établissement**.

### 1.6 Entrepôt & approvisionnement ✅
- Fournisseurs + **dette** + paiements ; bons de commande → **réception** ; **Dispatch** entrepôt→boutique
  (brouillon→validation) ; bannières hors‑ligne.

### 1.7 Trésorerie, CRM, ventes, livraisons ✅
- Comptes (Caisse/MoMo/Banque) par établissement, dépenses, virements, clôtures.
- Clients (partagés entreprise) + dette + plafond ; ventes/retours/annulation ; livraisons.

### 1.8 Pilotage & supervision ✅
- **Tableau de bord** par boutique + **consolidé** (ventes/dépenses par boutique).
- **Journal d'activité** (audit : qui, quoi, établissement, appareil, date).
- **Centre de notifications in‑app** (cloche + non‑lus) : stock bas + impayé, dédup + auto‑résolution.
- **Images produits** (galerie) réservées Business+ (Supabase Storage).

---

## 2. ✅ RÉALISÉ — Plateforme (super‑admin)

> Console séparée `apps/admin-web` (:3001) + module `apps/api/src/platform`. Accès cross‑tenant
> par fonctions `SECURITY DEFINER` du schéma `app` ([platform.sql](../packages/db/prisma/platform.sql)),
> gardées par `@PlatformAdmin`, et **verrouillées au rôle DB `wilinwi_admin`** (cf. §2.6).

### 2.1 Console super‑admin « Entreprises » — ✅ (L)
- **Identité super‑admin** : allowlist `PLATFORM_ADMIN_EMAILS` → `ctx.isPlatformAdmin` + `PlatformAdminGuard`.
- **Accès cross‑tenant** : `app.platform_tenants_overview()` / `app.platform_tenant_etablissements()`
  (`SECURITY DEFINER`, agrégats : plan, statut, échéance, nb users/établissements, modules, créé le).
- **API** `GET /platform/tenants` + `…/:id/etablissements` ; **page** `/platform` (liste, recherche,
  KPI, fiche entreprise). `me` renvoie `isPlatformAdmin`.

### 2.2 Facturation — cœur indépendant du prestataire — ✅ / ⛔ passerelle (XL)
- ✅ **Échéance + cycle** (`subscriptionDueDate`, `billingCycle`), **paiement manuel** (régularise +
  reporte d'un cycle : `app.billing_record_payment`), **détection d'impayés** (`app.billing_run_overdue`
  → `PAST_DUE`), **changer de plan / suspendre / réactiver** (cross‑tenant). UI dans la fiche entreprise.
- La *mécanique d'effets* (`computeDunning`) était déjà là ; le **déclencheur** existe désormais (bouton
  « Lancer la facturation » + fonction relève).
- ⛔ **Reste** : la **passerelle d'encaissement en ligne** (FedaPay / Wave / CB) + webhooks + cron — elle
  viendra simplement brancher un webhook sur `billing_record_payment`. **Bloquée : arbitrage prestataire.**

### 2.3 Plans / tarifs / limites éditables — ✅ (M)
- Table **`plan_configs`** (prix mensuel/annuel, `maxUsers/Etablissements/Devices/Photos`, `-1` = illimité),
  lue au runtime via **`PlanConfigService`** (cache) ; enforcement câblé (users, établissements, photos).
- Édition depuis la console (`PATCH /platform/plans/:plan`) **sans redéploiement** ; prix dynamiques
  côté `/parametres`. Défauts = valeurs du code + tarifs réels du business plan.

### 2.4 Modules premium à la carte — ✅ (M)
- **`Tenant.moduleAddons`** : modules activés **à l'unité** par entreprise, **en plus** du plan ; câblés
  dans le gating (`effectiveModules(…, extraModules)`), **neutralisés si impayé (J+7)**.
- UI toggles dans la fiche entreprise (`PATCH /platform/tenants/:id/modules`), effet immédiat.
- *Feature flags d'expérimentation : non couverts (le socle de config est en place pour les ajouter).*

### 2.5 Audit cross‑tenant + métriques plateforme — ✅ (M)
- **KPIs** (`app.platform_metrics`) : MRR estimé, GMV 30 j, ventes, nouvelles/actives/impayés, users.
- **Flux d'audit cross‑tenant** (`app.platform_recent_activity`) + répartition par plan. Page `/platform`.

### 2.6 Séparation & durcissement sécurité — ✅ (L)
- **Front séparé** : `apps/admin-web` (:3001, login dédié, garde super‑admin) ; **aucune** ligne admin
  dans `apps/web` (route `/platform` + entrée de menu retirées).
- **Verrou base** : rôle **`wilinwi_admin`** (seul à exécuter les `app.*` admin) ; **REVOKE** au rôle
  public `wilinwi_app` ([admin-role.sql.example](../packages/db/prisma/admin-role.sql.example)). Le module
  plateforme se connecte via **`ADMIN_DATABASE_URL`** (`AdminPrismaService`). Vérifié : `wilinwi_app` →
  `permission denied`, RLS intacte.
- **3 barrières indépendantes** : identité (allowlist+guard) · privilège DB (verrou) · réseau (recommandé :
  Cloudflare Access / IP devant `admin-web`, à brancher en prod).

---

## 3. 🟡 RESTE À FAIRE — Finitions back‑office

| Tâche | État | Effort | Détail |
| --- | --- | --- | --- |
| Entrée UI **« Sortie de caisse »** (caissier) | ⛔ | S | Backend autorise déjà `cash:disburse` ; manque un bouton sur le POS (trésorerie gatée PAY côté nav). |
| **Notifications** — élargir | 🟡 | M | Ajouter dette fournisseur, lecture **par utilisateur**, vrai **push** (web‑push) au lieu du polling. |
| **Dépréciation `Product.stock`** | 🟡 | M | Supprimer la double‑écriture après validation en prod (Phase D du modèle stock). |
| Vue consolidée → `ProductStock` | 🟡 | S | `globalStockMaps` lit encore les mouvements (redondant). |
| **Responsivité tutoriel** (`TourGuide`) | ⛔ | S | Pop‑up qui passe en haut/bas selon la position de la case surlignée. |
| **Aides manquantes** | ⛔ | S | Pages Ventes, Livraisons, Paramètres (ContextualHelp). |

---

## 4. Roadmap — état

```
✅ LOT 1 — Config pilotable      §2.3 plan_configs (prix/limites éditables, runtime)
✅ LOT 2 — Console super‑admin   §2.1 entreprises + actions (paiement, plan, suspension) · §2.5 audit/métriques
✅ LOT 4 — Premium               §2.4 modules à la carte par entreprise (moduleAddons)
✅ LOT 5 — Séparation/sécurité   §2.6 admin-web séparée + verrou base (rôle wilinwi_admin)

⛔ LOT 3 — Facturation en ligne  §2.2 passerelle (FedaPay/Wave/CB) + webhooks + cron PAST_DUE
          → BLOQUÉ : arbitrage prestataire + identifiants API

🟡 LOT 0 — Finitions back‑office (cf. §3) : sortie de caisse (POS), tutoriel responsive, aides manquantes
```

---

## 5. Arbitrages restants (décisions attendues)

1. **Prestataire de facturation** (FedaPay / Wave / CB ?) + identifiants API → seul point qui débloque §2.2.
   Le cœur de facturation est prêt : le webhook se branchera sur `app.billing_record_payment`.
2. **Réseau admin** : contrôle d'accès devant `admin-web` (Cloudflare Access / IP) à activer en prod.
3. **Site e‑commerce Enterprise** : prestation dédiée ou futur module standard ?

---

## 6. Synthèse

- **Back‑office entreprise : ~95 % fait** — reliquats = finitions (sortie de caisse, aides, tutoriel, nettoyage technique).
- **Plateforme super‑admin : livrée** — console séparée (`admin-web`), entreprises, **facturation manuelle**
  (échéances, dunning, paiement/plan/suspension), **plans/tarifs/limites éditables**, **modules à la carte**,
  **métriques & audit cross‑tenant**, le tout **verrouillé au niveau base** (rôle `wilinwi_admin`).
- **Seul manque structurant** : la **passerelle d'encaissement en ligne** (LOT 3), en attente de l'arbitrage
  prestataire — tout le reste du circuit d'abonnement fonctionne déjà (paiement enregistré manuellement).
