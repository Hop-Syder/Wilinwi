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
| **Plateforme** | Nexus Partners (super‑admin) | Exploiter Wilinwi : entreprises, plans, facturation, modules, monitoring | ⛔ pas de console dédiée (quelques endpoints `admin/*` détournés) |
| **Entreprise** | OWNER / MANAGER | Piloter SON commerce : établissements, équipe, catalogue, stock, trésorerie | ✅ back‑office `/parametres` + modules |

> Tout passe par la **RLS** (`app.current_tenant_id`) : un super‑admin plateforme devra opérer
> avec un rôle/contexte distinct (BYPASSRLS contrôlé), jamais via le rôle applicatif `wilinwi_app`.

---

## 1. Niveau PLATEFORME (super‑admin) — ⛔ à construire

Aucune console web super‑admin n'existe. Voici ce qu'elle doit piloter.

### 1.1 Entreprises (tenants)

- Lister / rechercher les entreprises, voir plan, statut d'abonnement, date de création, volumétrie.
- Créer, **suspendre**, réactiver, supprimer une entreprise (RGPD / résiliation).
- Voir les établissements, utilisateurs et l'activité d'une entreprise (support).
- **Impersonation / accès support** encadré (audité).
- État : ⛔ (la table `tenants` existe ✅, pas d'écran ni d'API cross‑tenant).

### 1.2 Abonnements & facturation

- Plan par entreprise + **statut** (`ACTIVE / TRIALING / PAST_DUE / CANCELLED`) + `pastDueSince`.
- **Cycle d'impayé** (J+0/J+3/J+7/J+30) : déclenchement, avancement, régularisation. La *mécanique d'effets* existe ✅ ([dunning.ts](../packages/types/src/dunning.ts)), le **déclencheur de facturation** ⛔.
- Encaissement des abonnements (FedaPay / Wave / Mobile Money / CB), factures, reçus, historique des règlements, relances. ⛔
- État : 🟡 (changement de plan + simulation d'impayé via `PATCH /admin/tenant/plan` et `/admin/tenant/subscription` ✅ ; facturation réelle ⛔).

### 1.3 Plans, tarifs & limites

- Définir les **paliers** (`STARTER/PRO/BUSINESS/ENTERPRISE`), **prix** (mensuel/annuel), **limites**
  (établissements, utilisateurs, photos), **matrice modules** par plan.
- État : 🟡 — codé en dur dans [common.ts](../packages/types/src/common.ts) (`PLANS`, `PLAN_LIMITS`,
  `PLAN_MODULES`) ✅ mais **non éditable** sans déploiement ⛔.

### 1.4 Modules & feature flags

- Activer/désactiver un module par plan ; **modules premium à la carte** (AI, Market, Payroll, Analytics+, API).
- Flags d'expérimentation / déploiement progressif par entreprise.
- État : 🟡 (gating par plan ✅ ; achat à l'unité + flags ⛔).

### 1.5 Monitoring, sécurité & support

- Santé API, erreurs, métriques d'usage (ventes, volumétrie par tenant), quotas.
- **Journal d'audit cross‑tenant**, alertes (impayés, abus, anomalies de stock).
- Rotation des secrets, vérification RLS (`verify-isolation`), rôles DB.
- État : ⛔ (audit par tenant ✅ ; vue plateforme ⛔).

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

## 3. Priorités de construction (ce qui manque pour « tout piloter »)

1. **Console super‑admin plateforme** (⛔) : entreprises, abonnements, monitoring, support — le plus gros manque.
2. **Facturation en ligne réelle** (⛔) + cron qui *déclenche* le `PAST_DUE` (la mécanique d'effets existe).
3. **Plans/tarifs/limites éditables** (🟡) : sortir `PLAN_LIMITS`/`PLAN_MODULES` du code vers une config pilotable.
4. **Modules premium à la carte** (🟡) + feature flags par entreprise.
5. **Notifications in‑app** (⛔) : pousser les alertes (stock bas, impayé, dette) au lieu d'un affichage à la demande.
6. **Audit cross‑tenant** + métriques d'usage plateforme (⛔).

---

## 4. Synthèse

- **Niveau entreprise** : la surface de pilotage est **largement couverte** (établissements, équipe/RBAC,
  catalogue, stock par emplacement, entrepôt, trésorerie, CRM, analytics, audit). Reliquats : relances marketing, notifications poussées.
- **Niveau plateforme** : **à construire** — c'est là que se joue l'exploitation SaaS (entreprises, facturation,
  plans pilotables, monitoring). Les fondations DB/types existent ; il manque la console et la facturation.
