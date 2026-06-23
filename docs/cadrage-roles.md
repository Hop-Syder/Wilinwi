# Cadrage — Socle fonctionnel « Propriétaire + Collaborateurs »

> **Livrable dexty-architect** (méthodologie appliquée par Claude Code, agent non encore enregistré).
> **Profil** : `standard` (cible de confiance **85**, Δ 5, max 4 cycles) · **Profondeur** : complète · **Langue** : fr.
> **But** : VALIDER le périmètre par rôle **avant** d'ajouter des fonctionnalités (et avant la monétisation).
> **Date** : 23 juin 2026 · **Source de vérité RBAC** : [packages/types/src/roles.ts](../packages/types/src/roles.ts).

---

## Phase 1 — Compréhension

- **Objectif métier** : qu'un propriétaire puisse embarquer son commerce *et son équipe* et que chaque rôle ait un parcours complet, sans rupture, dès le premier jour.
- **Périmètre** : les 5 rôles `OWNER / MANAGER / SELLER / CASHIER / DELIVERY`. Hors-périmètre ici : facturation FedaPay (reportée), modules MVP2/3 (Market, IA, Livraison réelle).
- **Hypothèses (À VALIDER)** :
  - H1. Les collaborateurs travaillent surtout sur **poste partagé** (login PIN) ; certains peuvent avoir un **compte email** propre.
  - H2. `DELIVERY` reste hors-scope fonctionnel en MVP1 (le rôle existe, sans écran).
  - H3. Le gating de plan est *neutralisé* pour l'instant (tous modules ouverts) — assumé tant que la monétisation n'est pas traitée.

**Légende statut** : ✅ complet · 🟡 partiel / à fiabiliser · ❌ absent ou cassé.

---

## Phase 2 — Référentiel : capacités attendues par rôle (RBAC réel)

D'après [ROLE_CAPABILITIES](../packages/types/src/roles.ts#L72) :

| Rôle | Capacités clés |
|---|---|
| **OWNER** | toutes (admin tenant, users, abonnement, audit, stock, inventaire, ventes+override+cancel, caisse, CRM complet, trésorerie, rapports complets) |
| **MANAGER** | tout l'opérationnel + audit en lecture ; **PAS** d'admin tenant / users / abonnement |
| **SELLER** | `stock:read`, `sale:create/read`, `client:read` |
| **CASHIER** | `sale:read`, `cash:collect/close`, `client:read/view_credit/collect_payment` |
| **DELIVERY** | `delivery:update` uniquement (aucun module) |

---

## Phase 5 — Matrice RÔLE × FONCTIONNALITÉ (attendu vs présent)

### 👑 OWNER (Propriétaire)
| Fonctionnalité attendue | Statut | Preuve / Écart |
|---|---|---|
| Créer la boutique + compte | ✅ | [signup](../apps/web/src/app/signup/page.tsx) → [auth.service.signUp](../apps/api/src/auth/auth.service.ts#L51) |
| Gérer l'équipe (créer, rôle, PIN, permissions/module) | 🟡 | UI [utilisateurs](../apps/web/src/app/(app)/parametres/utilisateurs/page.tsx) + [users.service](../apps/api/src/auth/users.service.ts) OK — **mais** voir R1 (credentials email) |
| Inviter un collaborateur par email | ❌ | `users.create` génère un mot de passe `Wlw-…` **jamais renvoyé** ([users.service.ts:85](../apps/api/src/auth/users.service.ts#L85)) → le collaborateur email ne peut pas se connecter (R1) |
| Voir marges / coûts / trésorerie | ✅ | `reports:read_full` + masquage par rôle ([analytics.service.ts:84](../apps/api/src/analytics/analytics.service.ts#L84)) |
| Journal d'activité (qui fait quoi) | 🟡 | [journal](../apps/web/src/app/(app)/parametres/journal/page.tsx) existe ; libellés bruts (`POST /api/...`) peu lisibles (R4) |
| Onboarding / activation 1ᵉʳ jour | ❌ | aucun wizard ; Hub vide au démarrage (R2) |
| Rapports historiques (semaine/mois) + export | ❌ | seul le **jour** est calculé ([analytics.service.ts](../apps/api/src/analytics/analytics.service.ts)) (R5) |
| Gérer l'abonnement / plan | 🟡 | self-service sans paiement ([admin.controller.ts:43](../apps/api/src/admin/admin.controller.ts#L43)) — hors-scope (monétisation) |

### 🧑‍💼 MANAGER (Gérant)
| Fonctionnalité attendue | Statut | Preuve / Écart |
|---|---|---|
| Stock, inventaire, ventes, annulation, override | ✅ | capacités présentes + écrans |
| Caisse / clôture, CRM complet, trésorerie | ✅ | écrans dédiés |
| Rapports complets (marges) | ✅ | `reports:read_full` |
| **Ne doit PAS** gérer users / abonnement | 🟡 | la nav affiche **« Paramètres »** au MANAGER (`canSee('ADMIN')` = OWNER \|\| MANAGER, [layout.tsx:78](../apps/web/src/app/(app)/layout.tsx#L78)) alors que `users:manage` est **OWNER-only** → liens visibles mais **403** côté API (R3) |

### 🛒 SELLER (Vendeur)
| Fonctionnalité attendue | Statut | Preuve / Écart |
|---|---|---|
| Vendre au POS (offline inclus) | ✅ | [pos](../apps/web/src/app/(app)/pos/page.tsx) + sync fiabilisée |
| Négocier le prix réel | 🟡 | le **plancher est masqué** au vendeur → il peut saisir sous le plancher ; désormais **refus explicite** (corrigé), mais pas de garde-fou visuel *avant* l'encaissement (R6) |
| Consulter le stock (sans coûts) | ✅ | `toProductDto` masque `prixAchat/prixPlancher` |
| Voir l'identité client | ✅ | `client:read` |

### 💰 CASHIER (Caissier)
| Fonctionnalité attendue | Statut | Preuve / Écart |
|---|---|---|
| Encaisser, rendre la monnaie | ✅ | [pos-checkout](../apps/web/src/components/pos-checkout.tsx) |
| Crédit / acompte + remboursement (lettrage/FIFO) | ✅ | [clients.service.recordPayment](../apps/api/src/crm/clients.service.ts#L90) |
| Clôture de caisse (motif si écart) | ✅ | [treasury.service.close](../apps/api/src/treasury/treasury.service.ts#L247) |
| Voir le crédit client | ✅ | `client:view_credit` |
| Ne peut ni annuler ni faire un retour | 🟡 | `sale:cancel` réservé MANAGER/OWNER — **à valider** : est-ce le bon arbitrage métier ? (R7) |

### 🚚 DELIVERY (Livreur)
| Fonctionnalité attendue | Statut | Preuve / Écart |
|---|---|---|
| Tout écran | ❌ | `ROLE_MODULES.DELIVERY = []` ([roles.ts:166](../packages/types/src/roles.ts#L166)) → **Hub vide** à la connexion (R8) |

---

## Ruptures prioritaires (synthèse)

| # | Rupture | Gravité | Rôles |
|---|---|---|---|
| **R1** | Collaborateur **email** créé via l'UI sans moyen d'obtenir ses identifiants (mot de passe jamais affiché, pas de lien d'invitation, pas de reset) | 🔴 Élevée | OWNER → tous |
| **R2** | Aucun **onboarding/activation** : Hub vide, pas de wizard, pas de données démo / états vides | 🔴 Élevée | OWNER + équipe |
| **R3** | Le MANAGER voit **« Paramètres »** (admin) mais les actions users renvoient 403 → fausse promesse / confusion | 🟠 Moyenne | MANAGER |
| **R4** | Journal d'activité **peu lisible** (libellés `POST /api/…`) → supervision faible | 🟠 Moyenne | OWNER |
| **R5** | Pas de **rapports historiques** (semaine/mois) ni export | 🟠 Moyenne | OWNER/MANAGER |
| **R6** | Le SELLER négocie **sans voir le plancher** → friction (refus a posteriori) | 🟠 Moyenne | SELLER |
| **R7** | CASHIER sans `sale:cancel`/retour — arbitrage à **valider** | 🟢 Faible | CASHIER |
| **R8** | Rôle **DELIVERY sans écran** (Hub vide) | 🟢 Faible (MVP2) | DELIVERY |

---

## Phase 6 — Roadmap priorisée (ordres de travail)

### P0 — Indispensables (débloquent l'embarquement de l'équipe)
- **OT-1 · Flux d'invitation propre (R1)**
  - *Objectif* : un OWNER invite un collaborateur ; celui-ci reçoit de quoi se connecter.
  - *Option simple (reco)* : à la création d'un user email, **afficher une fois** les identifiants + un **lien de connexion copiable** (WhatsApp/SMS) ; pour les PIN-only, afficher le PIN défini.
  - *Option robuste* : email d'invitation Supabase (`inviteUserByEmail`) → 1ʳᵉ connexion = définition du mot de passe.
  - *Critères* : (a) après création email, l'OWNER obtient un moyen de transmission ; (b) le collaborateur se connecte sans intervention technique ; (c) rien de sensible n'est loggé.
- **OT-2 · Onboarding propriétaire (R2)**
  - Wizard post-signup : *créer 1ᵉʳ produit → 1ʳᵉ vente test → inviter l'équipe* + **états vides** pédagogiques (Stock/POS/Clients) + (option) **jeu de données démo** effaçable.
  - *Critères* : (a) au 1ᵉʳ login OWNER, une checklist d'activation s'affiche ; (b) chaque étape mène à l'écran concerné ; (c) checklist persistée et masquable.

### P1 — Cohérence & supervision
- **OT-3 · Cohérence des accès MANAGER (R3)** : masquer (ou désactiver avec mention) les actions `users:manage` pour le MANAGER dans la nav et la page Paramètres ; ne montrer que ce qu'il peut faire.
  - *Critères* : un MANAGER ne voit aucun lien menant à un 403.
- **OT-4 · Journal d'activité lisible (R4)** : libellés humains (« Vente créée », « Utilisateur ajouté », « Connexion PIN »), filtres par utilisateur/action, lien vers l'entité.
- **OT-6 · Repère plancher pour le SELLER (R6)** : sans révéler le chiffre, afficher un indicateur « prix minimum atteint » + bloquer la saisie sous le plancher *avant* l'encaissement.

### P2 — Confort / périmètre élargi
- **OT-5 · Rapports historiques + export (R5)** : agrégats semaine/mois, top produits, export CSV.
- **OT-7 · Arbitrage retours CASHIER (R7)** : décision métier (capacité `sale:return` distincte ?).
- **OT-8 · Écran DELIVERY (R8)** : MVP2 — liste de livraisons assignées (anticipé par l'archi).

---

## Phase 8 — Décisions validées (23/06) & implications

| Réf | Décision | Implication architecturale (ADR à acter) |
|---|---|---|
| **D1 (R1)** | Invitation par **email Supabase** | Utiliser `auth.admin.inviteUserByEmail` / `generateLink({type:'invite'})` au lieu de créer un mot de passe. **Dépendances** : (a) **SMTP configuré** dans Supabase (l'email par défaut est limité/brandé) ; (b) **page `/onboarding`/`/set-password`** côté web pour la 1ʳᵉ connexion ; (c) `redirectTo` whitelisté. |
| **D2 (R3)** | MANAGER = **mêmes droits que l'OWNER, sauf abonnement** | Étendre `ROLE_CAPABILITIES.MANAGER` avec `users:manage` + `tenant:configure` (PAS `subscription:manage`). ⚠️ **Garde anti-escalade obligatoire** : un MANAGER ne peut **ni créer/éditer un OWNER**, ni se promouvoir OWNER. À enforcer côté `users.service`. |
| **D3 (R7)** | CASHIER peut faire des **retours** | Introduire une capacité **`sale:return`** distincte de `sale:cancel` ; la donner à CASHIER/MANAGER/OWNER et garder `sale:cancel` (annulation totale) pour MANAGER/OWNER. Re-garder l'endpoint retour sur `sale:return`. |
| **D4 (R8)** | DELIVERY : **écran minimal** | ⚠️ *Pushback* : il n'existe **aucun modèle livraison** en MVP1. Version minimale viable = marquer une vente « à livrer » (statut/flag) + écran livreur **lecture seule** des ventes qui lui sont assignées + action `delivery:update` (livré). Introduit un mini-domaine — à garder volontairement étroit. |

- **Score de confiance : 88/100** (≥ cible 85) — les décisions lèvent l'essentiel de l'incertitude. Risque résiduel : dépendance SMTP (D1) externe, et périmètre D4 à contenir.

> *Auto-réflexion (cycle 2)* : lentille 🛡️ Robuste/🗡️ Attaquant → **D2 crée un risque d'escalade de privilèges** ; mitigé par la garde anti-escalade (un MANAGER ne touche pas aux OWNER). Δ < 5 → stabilisé.

---

## Roadmap finale (ordonnée par dépendances/valeur)

| Ordre | OT | Nature | Dépendance | Effort |
|---|---|---|---|---|
| 1 | ✅ **OT-3 · RBAC MANAGER = OWNER (sauf abonnement) + anti-escalade** (D2) — *livré 23/06, tests verts* | Code pur (types + guard) | — | Faible |
| 2 | ✅ **OT-7 · Capacité `sale:return` pour CASHIER** (D3) — *livré 23/06* | Code pur (types + controller) | — | Faible |
| 3 | **OT-1 · Invitation email Supabase + page set-password** (D1) | Back + front + **config SMTP** | SMTP Supabase | Moyen |
| 4 | ✅ **OT-2 · Onboarding propriétaire** — *livré 23/06 : checklist d'activation (Hub) + états vides Stock & POS. Données démo (back) reportées (optionnel).* | Front | — | Moyen |
| 5 | ✅ **OT-4 · Journal d'activité lisible** — *livré 23/06 : auteur nommé (back) + libellés humains + filtre (front)* | Front + libellés | — | Faible |
| 6 | ✅ **OT-6 · Plancher visible au vendeur** (D5) — *livré 23/06 : `prix_plancher` exposé à tous (coût toujours masqué), min/clamp/indicateur rouge POS + « Encaisser » bloqué sous le plancher. CLAUDE.md mis à jour.* | Front + mapper | — | Faible |
| 7 | ✅ **OT-5 · Rapports historiques + export** — *livré 23/06 : endpoint `/analytics/report` (période, tendance, top produits, paiements ; marge protégée) + page `/dashboard/rapports` (sélecteur période, KPIs, barres, export CSV).* | Back + front | — | Moyen |
| 8 | ✅ **OT-8 · Écran livreur minimal** (D4) — *livré 23/06 : 4 champs livraison sur `sales` + module `DELIVERY` + endpoints assign/liste/livré + page `/livraisons` (livreur & gérant) + Hub livreur dédié. ⚠️ migration SQL à appliquer sur Supabase (cf. README §4).* | Modèle + back + front | Mini-modèle livraison | Moyen+ |

---

## ⏭️ Prochaine action recommandée

Commencer par **OT-3 + OT-7** : ce sont des changements **RBAC purs (code), rapides et sans dépendance externe**, qui appliquent immédiatement tes décisions D2/D3. Ensuite **OT-1** (invitation) — le vrai bloqueur métier — dès que le **SMTP Supabase** est confirmé. **OT-8** (livreur) en dernier, volontairement minimal.
