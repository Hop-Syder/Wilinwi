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
- **Plateforme (super‑admin Nexus)** — exploiter le SaaS (entreprises, facturation, config). **À bâtir.**

Contrainte transverse : **multi‑tenant + RLS**. Toute lecture cross‑tenant (niveau plateforme)
exige un accès contrôlé (fonction `SECURITY DEFINER` ou rôle dédié), jamais le rôle applicatif.

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

## 2. ⛔ RESTE À FAIRE — Plateforme (super‑admin)

### 2.1 Console super‑admin « Entreprises » — ⛔ (L)
**But** : un opérateur Nexus pilote toutes les entreprises.
- **Identité super‑admin** : allowlist d'emails (env `PLATFORM_ADMIN_EMAILS`) + `@PlatformAdmin` guard.
- **Accès cross‑tenant contrôlé** : fonction `app.platform_tenants_overview()` `SECURITY DEFINER`
  (lecture seule, agrégats : plan, statut, nb établissements/users/ventes, créé le).
- **API** `GET /platform/tenants` + **page** `/platform` (liste, recherche, fiche entreprise).
- `me` renvoie `isPlatformAdmin` ; entrée nav conditionnelle.
- **Critères** : isolation respectée (aucune donnée sensible cross‑tenant), gating strict, audité.
- **Dépendances** : aucune. **Risque** : sécurité (fuite cross‑tenant) → revue obligatoire.

### 2.2 Facturation en ligne + déclencheur d'impayé — ⛔ (XL)
- Intégration prestataire (**FedaPay / Wave / Mobile Money / CB**) : paiement d'abonnement, webhooks,
  factures/reçus, historique des règlements.
- **Cron quotidien** qui fait *entrer* en `PAST_DUE` (échéance impayée) et avancer les étapes — la
  mécanique d'effets existe déjà (`computeDunning`).
- **Dépendances** : §2.1 (back‑office facturation) + **arbitrage prestataire** (businessplan.md).

### 2.3 Plans / tarifs / limites éditables — 🟡 (M)
- Sortir `PLAN_LIMITS` / `PLAN_MODULES` / tarifs du **code** vers une **config en base** pilotable
  (table `plan_configs` lue au runtime), éditable depuis la console super‑admin.
- **Critères** : changer un prix/limite sans redéploiement ; valeurs par défaut = actuelles.
- **Dépendances** : §2.1 (écran d'édition).

### 2.4 Modules premium à la carte + feature flags — 🟡 (M)
- Activer/désactiver un module **à l'unité** par entreprise (AI, Market, Payroll, Analytics+, API).
- Flags d'expérimentation / déploiement progressif.
- **Dépendances** : §2.3 (modèle de config).

### 2.5 Audit cross‑tenant + métriques plateforme — ⛔ (M)
- Vue agrégée du journal d'activité + métriques d'usage (ventes, volumétrie, santé API) par entreprise.
- Alertes plateforme (impayés, anomalies, abus).
- **Dépendances** : §2.1.

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

## 4. Roadmap recommandée

```
LOT 0 — Finitions rapides (S, ~1 j)
  ├─ Sortie de caisse (POS) · responsivité tutoriel · aides Ventes/Livraisons/Paramètres
  └─ Commit propre du gros lot (tout est en local non commité)

LOT 1 — Config pilotable (M)
  └─ §2.3 Plans/limites éditables en base (socle de la console + facturation)

LOT 2 — Console super‑admin (L)
  └─ §2.1 Entreprises (read) → puis actions (suspendre, changer plan) → §2.5 audit/métriques

LOT 3 — Facturation (XL, après arbitrage prestataire)
  └─ §2.2 Paiement abonnement + webhooks + cron PAST_DUE

LOT 4 — Premium & flags (M)
  └─ §2.4 Modules à la carte + feature flags
```

---

## 5. Arbitrages bloquants (décisions attendues)

1. **Prestataire de facturation** (FedaPay / Wave / CB ?) + cycle (mensuel/annuel) → débloque §2.2.
2. **Périmètre super‑admin** : lecture seule d'abord, ou actions (suspendre / changer plan / impersonation) → cadre §2.1.
3. **Site e‑commerce Enterprise** : prestation dédiée ou futur module standard ?

---

## 6. Synthèse

- **Back‑office entreprise : ~95 % fait** — il ne reste que des finitions (sortie de caisse, aides, tutoriel, nettoyage technique).
- **Plateforme super‑admin : à bâtir** — c'est le cœur du « projet admin » restant : console entreprises,
  facturation, config pilotable, métriques. Les fondations (DB, types, RLS, dunning) sont prêtes.
- **Prochain pas conseillé** : LOT 0 (finitions + commit), puis LOT 1 (config pilotable) comme socle.
