# Pilotage & Administration — Surface de contrôle Wilinwi

> **Objet** : inventaire de **tout ce qui doit être piloté** dans Wilinwi, à deux niveaux —
> la **plateforme** (super‑admin Nexus, exploitation du SaaS) et l'**entreprise** (back‑office
> propriétaire/gérant). Pour chaque levier : ce qu'il faut piloter + l'**état réel** dans le code.
>
> Légende état : ✅ existe · 🟡 partiel · ⛔ à construire.
> Sources de vérité : `apps/api/src/admin`, `(app)/parametres`, `packages/types`, `packages/db`.

---

## 0. Deux niveaux de pilotage

| Niveau | Qui | Périmètre | Support actuel |
| --- | --- | --- | --- |
| **Plateforme** | Nexus Partners (super‑admin) | Exploiter Wilinwi : entreprises, plans, facturation, modules, monitoring | ✅ **console dédiée `apps/admin-web`** (:3001) + module `platform` |
| **Entreprise** | OWNER / MANAGER | Piloter SON commerce : établissements, équipe, catalogue, stock, trésorerie | ✅ back‑office `/parametres` + modules |

> Tout passe par la **RLS** (`app.current_tenant_id`). Le super‑admin opère via des fonctions
> `SECURITY DEFINER` du schéma `app`, **réservées au rôle dédié `wilinwi_admin`** (verrou base :
> `REVOKE` au rôle applicatif `wilinwi_app`), jamais via le rôle public.

---

## 1. Niveau PLATEFORME (super‑admin) — ✅ livré (`apps/admin-web`)

Console séparée `apps/admin-web` (:3001) + module `apps/api/src/platform` (gardé `@PlatformAdmin`,
fonctions `SECURITY DEFINER` verrouillées au rôle `wilinwi_admin`). Reste : passerelle d'encaissement (§1.2).

### 1.1 Entreprises (tenants)

- Lister / rechercher les entreprises, voir plan, statut, échéance, volumétrie (users/établissements/modules). ✅
- **Suspendre / réactiver**, **changer de plan** ✅ ; fiche entreprise + établissements (support) ✅.
- État : ✅ (`GET /platform/tenants` via `app.platform_tenants_overview()` `SECURITY DEFINER`).
  *Suppression RGPD + impersonation encadrée : non couverts (à ajouter si besoin support).*

### 1.2 Abonnements & facturation

- Plan par entreprise + **statut** + `pastDueSince` + **échéance** (`subscriptionDueDate`) + cycle.
- **Cycle d'impayé** (J+0/J+3/J+7/J+30) : *mécanique d'effets* ✅ ([dunning.ts](../packages/types/src/dunning.ts))
  **et** déclencheur ✅ — relève des impayés (`app.billing_run_overdue`, bouton « Lancer la facturation »).
- **Paiement manuel** ✅ (`app.billing_record_payment` : régularise + reporte d'un cycle) ; changer de plan /
  suspendre / réactiver ✅ (cross‑tenant).
- État : ✅ pour le cœur ; ⛔ **encaissement en ligne** (FedaPay / Wave / CB + webhooks + factures) — le webhook
  se branchera sur `billing_record_payment`. **Bloqué : arbitrage prestataire.**

### 1.3 Plans, tarifs & limites

- Paliers, **prix** (mensuel/annuel), **limites** (établissements, utilisateurs, appareils, photos).
- État : ✅ — table **`plan_configs`** lue au runtime (`PlanConfigService`), **éditable sans déploiement**
  (`PATCH /platform/plans/:plan`) ; défauts = valeurs du code + tarifs réels.

### 1.4 Modules & feature flags

- **Modules premium à la carte** par entreprise (au‑delà du plan).
- État : ✅ — **`Tenant.moduleAddons`** câblé au gating (neutralisé si impayé J+7), toggles dans la fiche
  entreprise (`PATCH /platform/tenants/:id/modules`). *Feature flags d'expérimentation : non couverts.*

### 1.5 Monitoring, sécurité & support

- **Métriques plateforme** ✅ (`app.platform_metrics` : MRR, GMV 30 j, actives/impayés, users) + répartition par plan.
- **Journal d'audit cross‑tenant** ✅ (`app.platform_recent_activity`).
- **Sécurité** ✅ : vérification RLS (`verify-isolation`), rôles DB séparés (`wilinwi_app` / `wilinwi_admin`),
  verrou des fonctions admin. Alertes/seuils plateforme avancés : 🟡 (impayés visibles ; pas encore d'alerting actif).

---

## 2. Niveau ENTREPRISE (back‑office OWNER/MANAGER)

Accès `/parametres` + modules. Capacités d'admin : `tenant:configure`, `users:manage`,
`subscription:manage`, `activity:read`, `supplier:manage`.

### 2.1 Entreprise & établissements

| À piloter | État |
| --- | --- |
| Nom de l'entreprise, plan courant | ✅ [parametres](<../apps/web/src/app/(app)/parametres/page.tsx>) |
| Établissements : créer / modifier / désactiver / supprimer, type (boutique, entrepôt…) | ✅ [parametres/etablissements](<../apps/web/src/app/(app)/parametres/etablissements/page.tsx>) |
| Vue globale « Tous les établissements » (consolidée, OWNER) | ✅ |
| Coordonnées par établissement (ville, adresse, téléphone) | ✅ |

### 2.2 Équipe & droits (RBAC)

| À piloter | État |
| --- | --- |
| Collaborateurs : créer / modifier / désactiver, poste | ✅ [parametres/utilisateurs](<../apps/web/src/app/(app)/parametres/utilisateurs/page.tsx>) |
| Rôle (`OWNER/MANAGER/SELLER/CASHIER/DELIVERY`) + permissions par module | ✅ |
| **Accès par établissement** (quel employé voit quelle boutique) | ✅ |
| Code **PIN** (poste partagé) — exactement 4 chiffres | ✅ |
| Décaissement espèces (caisse) ouvert au caissier (`cash:disburse`) | ✅ |
| Invitation par email (Supabase) | ✅ |

### 2.3 Abonnement (côté entreprise)

| À piloter | État |
| --- | --- |
| Voir / changer de plan, voir statut | ✅ (changement = `PATCH /admin/tenant/plan`) |
| Régulariser un impayé, voir l'étape de relance | 🟡 (bandeau + simulateur ✅ ; paiement réel ⛔) |

### 2.4 Catalogue & prix

| À piloter | État |
| --- | --- |
| Produits : créer / modifier / archiver, SKU, catégorie, variantes | ✅ |
| **Système à 4 prix** (`prixAchat ≤ prixPlancher ≤ prixCatalogue` + prix réel) | ✅ |
| **Photos produits** (galerie) — réservé Business+ | ✅ |
| Sécurité champ : `prixAchat`/marge masqués aux rôles non autorisés | ✅ |

### 2.5 Stock (par établissement)

| À piloter | État |
| --- | --- |
| Stock **par emplacement** (`ProductStock`) + vue consolidée | ✅ |
| Mouvements (entrée/sortie/ajustement) | ✅ |
| **Seuil de réappro par établissement** + alertes stock bas | ✅ |
| Inventaires (comptage → validation → écarts) | ✅ |
| Transfert simple entre établissements | ✅ |

### 2.6 Entrepôt & approvisionnement

| À piloter | État |
| --- | --- |
| Fournisseurs : CRUD + **dette** + paiements | ✅ |
| Bons de commande → **réception** (ravitaillement) | ✅ |
| **Dispatch** entrepôt → boutique (brouillon → validation) | ✅ |
| Réception/dispatch bloqués hors‑ligne (bandeau) | ✅ |

### 2.7 Trésorerie (Wilinwi Pay)

| À piloter | État |
| --- | --- |
| Comptes (Caisse / Mobile Money / Banque), soldes par établissement | ✅ |
| Dépenses, virements inter‑comptes, clôtures de caisse (motif d'écart) | ✅ |
| Qui décaisse la caisse (caissier inclus pour les espèces) | ✅ |

### 2.8 CRM, ventes & livraisons

| À piloter | État |
| --- | --- |
| Clients (partagés entreprise), dette, **plafond de crédit** | ✅ |
| Encaissement de remboursement (lettrage / FIFO) | ✅ |
| Ventes : historique, **retours** (avoir / remboursement), annulation | ✅ |
| Livraisons : assignation livreur, statut | ✅ |
| Relances de dettes (WhatsApp/SMS pré‑rempli) | ⛔ (module Market, prévu) |

### 2.9 Analytics & audit

| À piloter | État |
| --- | --- |
| Tableau de bord (CA, marge, dépenses) — par boutique & consolidé | ✅ |
| Rapports historiques + export CSV (suspendus en impayé J+3) | ✅ |
| **Journal d'activité** (audit : qui, quoi, établissement, appareil, date) | ✅ [parametres/journal](<../apps/web/src/app/(app)/parametres/journal/page.tsx>) |

---

## 3. Priorités restantes (pour « tout piloter »)

1. ✅ ~~Console super‑admin plateforme~~ — livrée (`admin-web` + module `platform`, séparés et verrouillés).
2. ⛔ **Facturation en ligne réelle** : passerelle (FedaPay/Wave/CB) + webhooks + cron. Le cœur (paiement
   manuel, relève d'impayés, échéances) est fait ✅. **Bloqué : arbitrage prestataire.**
3. ✅ ~~Plans/tarifs/limites éditables~~ — table `plan_configs`, runtime + édition console.
4. ✅ ~~Modules premium à la carte~~ — `Tenant.moduleAddons`. *(Feature flags d'expérimentation : non couverts.)*
5. ✅ ~~Notifications in‑app~~ — centre de notifications (cloche + non‑lus). *(Push web : à venir.)*
6. ✅ ~~Audit cross‑tenant + métriques~~ — `platform_metrics` + `platform_recent_activity`.
7. 🟡 **Réseau admin** : contrôle d'accès (Cloudflare Access / IP) devant `admin-web` en prod.

---

## 4. Synthèse

- **Niveau entreprise** : surface de pilotage **largement couverte** (établissements, équipe/RBAC, catalogue,
  stock par emplacement, entrepôt, trésorerie, CRM, analytics, audit, notifications). Reliquats : relances
  marketing, push web, finitions UX.
- **Niveau plateforme** : **livré** — console séparée (`admin-web`), entreprises, facturation manuelle,
  plans/tarifs/limites éditables, modules à la carte, métriques & audit cross‑tenant, **verrou base**
  (`wilinwi_admin`). **Seul manque structurant** : la passerelle d'encaissement en ligne (arbitrage prestataire).
