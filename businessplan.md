# Modèle économique de Wilinwi

> **Le système d'exploitation du commerce africain.**
> Document de référence — modèle de revenus, paliers d'abonnement et offre commerciale.
> Sert de source de vérité produit pour le gating des plans (`packages/types`).

---

## 1. Vision

Wilinwi est une plateforme **SaaS de gestion commerciale** conçue pour accompagner les
commerçants africains dans leur transformation numérique.

Notre ambition : devenir **l'infrastructure numérique de référence du commerce africain** —
une solution moderne, simple et évolutive, adaptée aussi bien aux petites entreprises qu'aux
réseaux de plusieurs établissements.

Le modèle repose sur une idée simple :

> **La valeur créée par Wilinwi grandit avec l'entreprise de nos clients.**

Plus une entreprise se développe (établissements, utilisateurs, modules), plus elle tire de
valeur de la plateforme — et plus elle monte naturellement en gamme.

---

## 2. Sources de revenus

Le modèle s'appuie principalement sur un **abonnement SaaS récurrent**, complété par des
**modules premium à la carte** et des **services professionnels** à forte valeur ajoutée.

| Source | Nature | Récurrence |
| --- | --- | --- |
| Abonnements SaaS | Forfaits par palier | Mensuelle / annuelle |
| Modules premium | Options activables à l'unité | Mensuelle |
| Services professionnels | Prestations (déploiement, migration, formation…) | Ponctuelle |

**Principe fondateur :** Wilinwi **ne prélève aucune commission** sur les ventes réalisées par
les commerçants. Les encaissements clients restent 100 % gérés par le commerçant avec ses
propres moyens. Wilinwi vend l'outil, pas une part du chiffre d'affaires.

---

## 3. Abonnements SaaS

Quatre paliers, du gratuit au sur-mesure.

### Tableau comparatif

| Palier | Cible | Établissements | Utilisateurs | Appareils | Photos/produit | Produits | Mensuel | Annuel |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Starter** | Entrepreneurs, petites boutiques | 1 | 1 | 1 | 0 (désactivé) | 100 | **Gratuit** | — |
| **Pro** | PME | 2 | 5 | 5 | 0 (désactivé) | Illimité | **5 000 FCFA** | **50 000 FCFA** |
| **Business** | Entreprises en croissance | Illimité | Illimité | 30 | 6 | Illimité | **15 000 FCFA** | **150 000 FCFA** |
| **Enterprise** | Grandes entreprises / réseaux | Illimité | Illimité | Illimité | 12 | Illimité | **Sur devis** | **Sur devis** |

### Détail des paliers

**Starter — Gratuit**
Destiné aux entrepreneurs et petites boutiques. *Objectif : permettre de découvrir Wilinwi sans
friction.*

- 1 utilisateur, 1 établissement, 1 appareil
- 100 produits maximum
- Photos produits désactivées
- Fonctionnalités essentielles
- Ventes illimitées
- Mode hors-ligne
- Tableau de bord de base

**Pro — 5 000 FCFA/mois (ou 50 000 FCFA/an)**
Destiné aux PME.

- 5 utilisateurs, 2 établissements, 5 appareils
- Produits illimités
- Photos produits désactivées
- Rapports avancés
- Gestion des dépenses
- Gestion des créances
- Sauvegardes automatiques
- Assistance prioritaire

**Business — 15 000 FCFA/mois (ou 150 000 FCFA/an)**
Pour les entreprises en croissance.

- Utilisateurs illimités, établissements illimités, 30 appareils
- 6 photos par produit
- Transferts de stock
- CRM
- Tableaux de bord avancés
- API
- Intégrations

**Enterprise — sur devis**
Pour les grandes entreprises.

- Utilisateurs illimités, établissements illimités, appareils illimités
- 12 photos par produit
- Site e-commerce personnalisé
- Personnalisation
- Intégrations spécifiques
- SLA
- Accompagnement dédié

### Créances (Pro) vs CRM (Business) — où tracer la ligne

La frontière entre les deux paliers est **financière vs relationnelle**.

#### Pro — Gestion des créances (financier pur)

- Fiche client simplifiée (nom, téléphone)
- Enregistrement d'une dette sur une vente (« ardoise »)
- Suivi des remboursements et solde global du client

#### Business — CRM & marketing (croissance)

- Profils clients complets (historique d'achats détaillé, préférences, anniversaires)
- Segmentation (clients VIP, inactifs, endettés…)
- Relances de dettes semi-automatiques (message WhatsApp/SMS pré-rempli)
- Programmes de fidélité et statistiques de vente par client

> **Note technique :** le modèle `Client` (`soldeCredit`, `plafondCredit`) couvre déjà l'ardoise.
> La segmentation est **dérivable des ventes existantes** ; seuls anniversaires/préférences sont
> des champs neufs. Les relances « semi-automatiques » = lien `wa.me` pré-rempli (**aucune
> intégration API** ; l'envoi réellement automatique relève du module Market).

---

## 4. Paiement des abonnements

Les abonnements sont réglés **directement en ligne**. Moyens de paiement envisagés :

- MTN Mobile Money
- Moov Money
- Orange Money
- Wave
- Carte bancaire
- Autres solutions partenaires

> ⚠️ **À distinguer :** ces moyens servent à payer **l'abonnement Wilinwi**. Les encaissements
> faits par les commerçants auprès de **leurs** clients restent gérés par eux via leurs propres
> moyens. Côté produit, ces derniers sont regroupés sous « Mobile Money » dans l'enum des ventes
> — c'est un sujet **indépendant** de la facturation des abonnements.

### Cycle de vie d'un abonnement impayé (`PAST_DUE`)

**Principe fondateur :** ne **jamais** bloquer brutalement l'encaissement physique en magasin en
pleine journée — cela ruinerait la réputation de Wilinwi auprès du commerçant. La pression est
**progressive** et **entièrement réversible** au paiement.

| Étape | Déclencheur | Effet | Caisse (POS) |
| --- | --- | --- | --- |
| **J+0** | Facture impayée → statut `PAST_DUE` | Bannière d'avertissement **non bloquante**, visible **OWNER/MANAGER uniquement** (jamais le caissier) | ✅ Pleinement active |
| **J+3** | Toujours impayé | Notification quotidienne persistante. Suspension du **non-vital** : rapports avancés, exports comptables | ✅ Active |
| **J+7** | Toujours impayé | **Rétrogradation automatique vers Starter** : 1 établissement actif, multi-utilisateur suspendu, catalogue bridé aux 50 premiers articles. Rappel persistant **non bloquant** | ✅ Active (niveau Starter) |
| **J+30** | Toujours impayé | Écran de régularisation **bloquant**, en dernier recours | ⛔ Bloquée |

> **Choix retenu (J+7) :** rétrogradation *réelle* vers Starter — caisse fonctionnelle — plutôt
> qu'un blocage immédiat (qui contredirait le principe fondateur). Le **blocage dur** est repoussé
> au **dernier recours (J+30)**. *(Variante d'origine : blocage dès J+7 — à rebasculer ici si tu
> préfères.)*

**Garde-fous impératifs (non négociables) :**

- **Aucune destruction de données.** Le bridage à 50 produits **masque/archive** les articles 51+
  (jamais supprimés) ; restauration instantanée au paiement. Idem pour le multi-utilisateur
  (suspendu, pas effacé).
- **Multi-établissements :** un Business multi-établissements rétrogradé conserve **1 établissement
  actif** ; les autres et leurs ventes passent en **lecture seule**, intégralement préservés.
- **L'OWNER garde toujours l'accès** pour régulariser — jamais auto-verrouillé par la suspension
  du multi-utilisateur.
- **Réversibilité totale :** au paiement, retour immédiat au plan d'origine et à toutes les données.

> **Technique :** `subscriptionStatus` (enum existant `ACTIVE/TRIALING/PAST_DUE/CANCELLED`) à
> porter dans l'`AuthContext`, + un **cron quotidien** qui fait avancer J+0 → J+3 → J+7 → J+30.

---

## 5. Modules premium

Fonctionnalités avancées proposées **à la carte** : chaque entreprise ne paie que ce dont elle a
réellement besoin.

- Wilinwi AI
- Wilinwi Market
- Wilinwi Payroll
- Wilinwi Analytics+
- Wilinwi API
- Connecteurs ERP et comptables
- Sauvegardes avancées
- Rapports décisionnels

---

## 6. Services professionnels

Prestations complémentaires pour les besoins spécifiques :

- Accompagnement au déploiement
- Migration de données
- Personnalisation de l'application
- Intégration avec des logiciels tiers
- Formation des équipes
- Support premium

---

## 7. Vision long terme

À terme, Wilinwi ne sera plus seulement un logiciel de gestion commerciale, mais une **plateforme
complète** :

- Gestion commerciale
- Gestion des stocks
- CRM
- Comptabilité
- Ressources humaines
- Intelligence artificielle
- Marketplace d'applications
- API pour développeurs
- Écosystème de partenaires

**Objectif :** construire le **système d'exploitation du commerce africain**, capable
d'accompagner une entreprise de sa première boutique jusqu'à un réseau de centaines
d'établissements répartis dans plusieurs pays.

---

## 8. Correspondance avec l'implémentation (à câbler)

Cette section fait le **pont entre le modèle commercial et le code** — elle liste les écarts à
résorber pour que les paliers deviennent une réalité technique. *(Aucune de ces lignes n'est
encore branchée ; c'est le backlog de monétisation.)*

| Élément modèle | Source de vérité (code) | État actuel | Cible |
| --- | --- | --- | --- |
| Paliers | `PLANS` — [common.ts](packages/types/src/common.ts) | `FREE / PRO / BUSINESS` | `STARTER / PRO / BUSINESS / ENTERPRISE` |
| Gating des modules | `PLAN_MODULES` — [common.ts](packages/types/src/common.ts) | Tous les modules sur tous les plans (aucun cloisonnement) | Matrice réelle (Starter = essentiels ; CRM/transferts/API = Business) |
| Limite d'établissements | *(inexistante)* — [etablissement.service.ts](apps/api/src/etablissement/etablissement.service.ts) | Création illimitée pour tous | Starter = 1 · Pro = 2 · Business/Enterprise = illimité (bloqué à la création) |
| Limite d'utilisateurs | `PLAN_LIMITS` — [common.ts](packages/types/src/common.ts) | FREE 1 / PRO 5 / BUSINESS 30 | Starter = 1 · Pro/Business/Enterprise = illimité |
| Images produits | `Product.photos` (déjà en base) — gating à ajouter | Disponible pour tous | Business+ uniquement |
| Site e-commerce personnalisé | *(non modélisé)* | — | Enterprise (prestation dédiée) |
| Créances vs CRM | Module CRM unique — [clients.service.ts](apps/api/src/crm/clients.service.ts) | Tout exposé | Pro = ardoise/solde · Business = profils, segmentation, relances, fidélité |
| Cycle d'impayé `PAST_DUE` | `subscriptionStatus` (enum existant) ; pas porté dans l'`AuthContext` | Aucun cycle de relance | Cron quotidien J+0 → J+3 → J+7 → J+30 + dégradations réversibles |
| Tarifs affichés | [parametres/page.tsx](apps/web/src/app/(app)/parametres/page.tsx) | PRO 15 000 / BUSINESS 35 000 | Pro 7 500 / Business 20 000 (+ tarifs annuels) |
| Modules premium à l'unité | *(non modélisé)* | Inclus dans le plan | Activation à la carte (facturation séparée) |
| Facturation en ligne | *(non modélisé)* | Aucun paiement d'abonnement | FedaPay / Wave / Mobile Money / CB |

**Décisions arrêtées :**

- **Pro** : 2 établissements, utilisateurs illimités.
- **Business** : ajoute les images produits.
- **Enterprise** : ajoute un site e-commerce personnalisé (prestation dédiée).
- **Créances vs CRM** : Pro = financier (ardoise/solde) · Business = relationnel (profils, segmentation, relances `wa.me`, fidélité).
- **Impayés** : cycle progressif et réversible J+0 / J+3 / J+7 / J+30 (cf. §4) ; downgrade Starter non bloquant à J+7, blocage dur réservé à J+30.

**Points encore à arbitrer :**

1. Stratégie de facturation : prestataire (FedaPay/Wave…), cycle de facturation, déclenchement exact du compteur `PAST_DUE`.
2. Site e-commerce Enterprise : prestation sur-mesure ou futur module standard ?
3. Images produits : couper totalement aux paliers < Business, ou garder 1 photo pour tous et réserver la **galerie** à Business+ ?
