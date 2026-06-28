# Audit Wilinwi — revue indépendante (Produit · UX · Architecture)

> **Note** : un précédent rapport, [docs/audit-report.md](audit-report.md), existe déjà
> (daté du même jour). Le présent document est une **revue indépendante** issue d'une
> relecture directe du code. Il **confirme** plusieurs constats du précédent (impression de
> ticket simulée, code mort `PriceOverride`, fraude possible via IndexedDB hors-ligne) et
> ajoute des constats absents ou sous-estimés ailleurs — notamment le **gating de plan
> désactivé / l'absence totale de facturation**, qui est selon moi l'angle mort n°1.
>
> **Périmètre** : MVP1 « Le Socle », branche `main`, commit `07c53f0`.
> **Posture** : audit en lecture seule. Aucun fichier de code modifié ; ce rapport est le seul livrable.
> **Date** : 21 juin 2026.
> 
> **Mise à jour post-audit (28 Juin 2026)** : L'architecture de stock a évolué. Le stock n'est plus global par produit. Les réceptions de bons de commande se font uniquement dans un **Magasin central**, suivi d'un transfert (**Dispatch**) vers les boutiques, qui possèdent désormais leur propre stock local.

---

## 0. Hypothèses business (à valider)

1. **Marché** : commerces de détail d'Afrique de l'Ouest (zone UEMOA / FCFA), 1 propriétaire
   + quelques vendeurs/caissiers, souvent peu technophiles.
2. **Matériel** : smartphone/tablette en caisse, parfois **poste partagé** (d'où le login PIN) ;
   connectivité **intermittente** → l'offline est une exigence vitale.
3. **Monétisation visée** : SaaS par abonnement `FREE / PRO / BUSINESS` avec gating de modules.
   **Hypothèse contredite par le code** (cf. §5 — le gating est neutralisé).
4. **Conformité** : pas d'obligation de facture fiscale normalisée supposée à ce stade
   (le reçu n'est pas une facture légale). **À confirmer** par pays cible.
5. **Canaux** : WhatsApp/Mobile Money centraux dans l'usage, mais pas encore des intégrations.

---

## Phase 1 — Exploration : ce qui a été réellement inspecté

Monorepo Turborepo/pnpm propre, conforme à [CLAUDE.md](../CLAUDE.md).

- **Backend** [apps/api/](../apps/api/src/) : NestJS 11, 11 modules, ~3 800 lignes.
- **Frontend** [apps/web/](../apps/web/src/) : Next.js 15 (App Router) / React 19, ~5 600 lignes.
- **Partagés** : [types](../packages/types/src/) (Zod + RBAC + gating = source de vérité),
  [db](../packages/db/) (Prisma + RLS), [offline](../packages/offline/src/) (Dexie + SyncEngine),
  [ui](../packages/ui/src/).
- **Données** : [schema.prisma](../packages/db/prisma/schema.prisma) (20 modèles, multi-tenant),
  RLS dans [rls.sql](../packages/db/prisma/rls.sql) (`FORCE ROW LEVEL SECURITY`).
- **CI** : [ci.yml](../.github/workflows/) — `build · typecheck · test` sur push/PR.

**Points forts confirmés par lecture (pas seulement déclarés) :**

- **Isolation multi-tenant réelle** : tout passe par [withTenant()](../packages/db/src/index.ts#L44)
  qui pose `app.current_tenant_id` dans une transaction ; policies en `FORCE` (le rôle applicatif
  lui-même est soumis à la RLS). Conception robuste.
- **Sécurité au niveau champ** centralisée : [toProductDto()](../apps/api/src/stock/product.mapper.ts#L20)
  (retire `prixAchat`/`prixPlancher`), masquage marge dans [analytics.service.ts:84](../apps/api/src/analytics/analytics.service.ts#L84),
  masquage crédit client dans le mapper CRM.
- **RBAC** matrice unique [roles.ts](../packages/types/src/roles.ts#L72), appliquée par 2 gardes
  globaux ([common.module.ts:31](../apps/api/src/common/common.module.ts#L31)).
- **Révocation immédiate** : l'`AuthGuard` relit l'utilisateur en base à chaque requête et
  refuse si `actif = false` ([auth.guard.ts:73](../apps/api/src/common/auth.guard.ts#L73)) — un compte
  désactivé est coupé sans attendre l'expiration du JWT. Bien vu.
- **Anti-fraude prix** : vente sous plancher refusée en dur ([sales.service.ts:108](../apps/api/src/pos/sales.service.ts#L108)).
- **Offline-first** : [SyncEngine](../packages/offline/src/sync.ts) + idempotence `clientGeneratedId`
  (contrainte unique + rattrapage `P2002`, [sales.service.ts:47](../apps/api/src/pos/sales.service.ts#L47)).
- **Atomicité métier** : finalisation de vente, lettrage FIFO crédit, virements trésorerie sont
  encapsulés dans une même transaction Postgres.

---

## Phase 2 — Inventaire des fonctionnalités

**Complet** (codé + branché + cohérent) · **Partiel** (incomplet/non branché/angle mort) · **Absent**.

| Module | Fonctionnalité | Statut | Emplacement |
|---|---|---|---|
| Auth | Inscription propriétaire + tenant atomique | Complet | [auth.service.ts:51](../apps/api/src/auth/auth.service.ts#L51) |
| Auth | SSO JWT Supabase + rôle source de vérité DB | Complet | [auth.guard.ts](../apps/api/src/common/auth.guard.ts) |
| Auth | Login PIN poste partagé (bcrypt + anti-bruteforce) | Partiel | [auth.service.ts:147](../apps/api/src/auth/auth.service.ts#L147) — rate-limit **en mémoire** (perdu au redémarrage / inopérant multi-instance) |
| Auth | Invitation membre | Partiel | [auth.service.ts:88](../apps/api/src/auth/auth.service.ts#L88) — renvoie un mot de passe temporaire à recopier ; **pas d'email/lien** |
| Auth | Reset mot de passe / vérification email | Absent | `email_confirm:true` court-circuite la vérif |
| Stock | CRUD produits + variantes, 4 prix, seuil | Complet | [stock.service.ts](../apps/api/src/stock/stock.service.ts) |
| Stock | Invariant `achat ≤ plancher ≤ catalogue` | Partiel | [product.ts:70](../packages/types/src/product.ts#L70) — **non vérifié** sur update partiel (commentaire l.85) |
| Stock | Import/export catalogue (CSV/Excel) | Absent | onboarding d'un gros stock = saisie manuelle |
| Stock | Alerte rupture par seuil produit | Partiel | UI OK, mais le **dashboard ignore** `seuilAlerte` (constante figée `LOW_STOCK_THRESHOLD=5`, [analytics.service.ts:16](../apps/api/src/analytics/analytics.service.ts#L16)) |
| Inventaire | Comptage + validation + écarts | Complet | [inventory.controller.ts](../apps/api/src/inventory/inventory.controller.ts) |
| POS | Panier, recherche, Cmd+K, négociation | Complet | [pos/page.tsx](../apps/web/src/app/(app)/pos/page.tsx) |
| POS | Encaissement CASH/MoMo/Banque/Crédit/Acompte + rendu monnaie | Complet | [pos-checkout.tsx](../apps/web/src/components/pos-checkout.tsx) |
| POS | Vente offline + file de sync + reprise | Partiel | succès affiché **avant** confirmation serveur (angle mort #2) |
| POS | Impression ticket | **Partiel/factice** | [pos-checkout.tsx:207](../apps/web/src/components/pos-checkout.tsx#L207) — bouton = `alert(...)` |
| POS | Partage WhatsApp du reçu | **Partiel/factice** | [pos-checkout.tsx:217](../apps/web/src/components/pos-checkout.tsx#L217) — message générique, **sans destinataire ni lien de reçu**, n'utilise pas `PublicReceipt` |
| POS | Reçu public QR (`/r/<code>`) | Complet | [public.controller.ts](../apps/api/src/public/public.controller.ts), [r/[code]/page.tsx](../apps/web/src/app/r/[code]/page.tsx) |
| POS | Annulation (reversal stock + caisse + dette) | Complet | [sales.service.ts:392](../apps/api/src/pos/sales.service.ts#L392) |
| POS | Retour partiel (avoir / remboursement) | Partiel | [sales.service.ts:473](../apps/api/src/pos/sales.service.ts#L473) — endpoint **sans validation Zod** + casts `as any` ([sales.controller.ts:100](../apps/api/src/pos/sales.controller.ts#L100)) |
| POS | Validation vente sous plancher (`PENDING_APPROVAL`) | **Mort** | flux désactivé ([sales.service.ts:133](../apps/api/src/pos/sales.service.ts#L133)) ; endpoints `pending`/`approve` + `PriceOverride` subsistent |
| CRM | CRUD clients, plafond, KPIs | Complet | [clients.service.ts](../apps/api/src/crm/clients.service.ts) |
| CRM | Remboursement lettrage ciblé + FIFO atomique | Complet | [clients.service.ts:90](../apps/api/src/crm/clients.service.ts#L90) |
| CRM | Contrôle du plafond crédit à la vente | Complet | [sales.service.ts:669](../apps/api/src/pos/sales.service.ts#L669) |
| Trésorerie | Soldes multi-comptes, virements (vérif solde), dépenses | Complet | [treasury.service.ts](../apps/api/src/treasury/treasury.service.ts) |
| Trésorerie | Clôture caisse, motif obligatoire sur écart | Complet | [treasury.service.ts:247](../apps/api/src/treasury/treasury.service.ts#L247) |
| Analytics | Dashboard du jour, marge masquée par rôle | Complet | [analytics.service.ts](../apps/api/src/analytics/analytics.service.ts) |
| Analytics | Rapports historiques / tendances / export | Absent | seul le « jour » est calculé |
| Admin | Journal d'activité + intercepteur auto + UI | Complet | [activity.service.ts](../apps/api/src/common/activity.service.ts), [journal](../apps/web/src/app/(app)/parametres/journal/page.tsx) |
| Admin | Gestion utilisateurs/rôles/permissions fines | Complet | [users.service.ts](../apps/api/src/auth/users.service.ts) |
| Admin | Changement de plan | Partiel | [admin.controller.ts:43](../apps/api/src/admin/admin.controller.ts#L43) — **self-service sans paiement** (outil de test) |
| **Facturation** | Paiement abonnement, trial, dunning | **Absent** | aucune intégration ; `subscriptionStatus` non appliqué |
| **Gating plan** | Modules limités par plan | **Désactivé** | [common.ts:33](../packages/types/src/common.ts#L33) — tous les plans donnent **tous** les modules |
| Notifications | Email / SMS / WhatsApp / push | Absent | aucun canal réel |
| PWA | Service worker (coquille offline) | Complet | [sw.js](../apps/web/public/sw.js) |
| Onboarding | Tour guidé + aide contextuelle | Partiel | [tour-guide.tsx](../apps/web/src/components/tour-guide.tsx) — POS uniquement, pas de wizard 1ʳᵉ config |

---

## Phase 3 — Parcours utilisateurs actuels (tels que codés)

### Propriétaire (OWNER)
`/signup` → tenant + OWNER créés, connexion auto, **Hub** ([signup/page.tsx:34](../apps/web/src/app/signup/page.tsx#L34)).
- **Rupture** : Hub vide (0 produit/0 client), aucun guidage, pas de wizard, pas d'import
  catalogue. Le tour guidé n'existe que **dans** le POS. Le « premier succès » (1ʳᵉ vente)
  n'est pas mis en scène.
- **Rupture** : inviter un membre = recopier un mot de passe temporaire et l'envoyer à la main.

### Vendeur (SELLER) — l'angle mort de la boucle quotidienne
Connexion email **ou** bascule PIN (cadenas header, [layout.tsx:116](../apps/web/src/app/(app)/layout.tsx#L116)) → POS → vente.
- **Rupture critique** : le SELLER **ne voit pas le plancher** (masqué), or c'est lui qui
  négocie. S'il descend sous le plancher, la vente est mise en file locale et un modal
  **« Vente terminée »** s'affiche **immédiatement** ([pos-checkout.tsx:196](../apps/web/src/components/pos-checkout.tsx#L196),
  déclenché juste après [enqueueSale, pos/page.tsx:195](../apps/web/src/app/(app)/pos/page.tsx#L195)) ;
  la synchro échoue ensuite **silencieusement** côté serveur. Le vendeur croit avoir vendu.
  → contredit la doctrine anti-« erreur silencieuse » de [raisonnement.md](../raisonnement.md).

### Caissier (CASHIER)
POS + CRM, voit le crédit, encaisse remboursements (lettrage/FIFO). Cohérent.
- **Rupture** : « Imprimer le ticket » = `alert(...)`. Pour imprimer réellement, il faut passer
  par l'historique ([TodaySalesPanel](../apps/web/src/app/(app)/pos/page.tsx)). « Partager WhatsApp »
  envoie un texte générique sans lien de reçu.

### Gérant (MANAGER) / Livreur (DELIVERY)
- MANAGER : accès large et cohérent.
- DELIVERY : `ROLE_MODULES.DELIVERY = []` ([roles.ts:166](../packages/types/src/roles.ts#L166)) → **Hub vide**.
  Le rôle existe sans aucun écran (livraison = MVP2).

### Transverse
- Compteur `pending` global présent, mais **pas d'historique d'erreurs de sync ni de rejouer
  par vente** dans l'UI (pourtant recommandés dans [raisonnement.md](../raisonnement.md)).
- Gestion d'erreur hétérogène : plusieurs `catch(() => [])` avalent l'erreur (ex. [pos/page.tsx:99](../apps/web/src/app/(app)/pos/page.tsx#L99)).

---

## Phase 4 — Le workflow UX professionnel cible

1. **Acquisition / 1ʳᵉ impression** — landing + **mode démo** sans compte + données d'exemple
   au signup (ne jamais montrer un Hub vide).
2. **Onboarding / activation (< 5 min)** — wizard : *créer 1ᵉʳ produit → 1ʳᵉ vente test →
   inviter l'équipe* + **import Excel** + checklist d'activation persistante sur le Hub.
3. **Boucle quotidienne** — POS rapide, offline **avec statut par vente** (✓ / ⏳ / ⚠️ +
   rejouer), impression ticket réelle (ESC/POS Bluetooth) + reçu WhatsApp **lié au QR existant**,
   clôture de caisse. Cœur déjà à ~80 %.
4. **Administration** — équipe/PIN/permissions ✓ ; appliquer `PLAN_LIMITS.maxDevices` (défini,
   non appliqué).
5. **Facturation / monétisation** — choix de plan + paiement **Mobile Money** (FedaPay/PayDunya/
   Wave) + essai réel + dunning sur `PAST_DUE` + gating effectif. **Inexistant aujourd'hui.**
6. **Notifications multi-canal** — reçu **WhatsApp/SMS** (l'infra `PublicReceipt` est prête à
   être poussée), alerte rupture, rappel d'échéance crédit, récap quotidien propriétaire.
7. **Support / aide** — étendre l'aide contextuelle au-delà du POS, base de connaissances,
   canal WhatsApp support.
8. **Croissance** — parrainage, upsell à la limite de plan (point d'accroche déjà là :
   [users.service.ts:75](../apps/api/src/auth/users.service.ts#L75)), intégrations futures (Market, IA).

---

## Phase 5 — Écarts à combler

**C** = complexité (Faible/Moyenne/Élevée) · **I** = impact business.

### A. Indispensables (bloquent une expérience pro)

| # | Manque | Pourquoi | C | I |
|---|---|---|---|---|
| A1 | **Feedback de sync par vente + rejouer + file d'erreurs** ; ne plus afficher « Vente terminée » avant confirmation | Le « faux succès » offline fait perdre de l'argent et la confiance — risque produit n°1 | Moyenne | Élevé |
| A2 | **Validation Zod + suppression des `as any`** sur le retour partiel | Mutation financière non validée ([sales.controller.ts:100](../apps/api/src/pos/sales.controller.ts#L100)) | Faible | Élevé |
| A3 | **Tests du cœur métier** | `SalesService` (725 l.), trésorerie, FIFO : **0 test** ; `test` tourne en `--passWithNoTests` | Moyenne | Élevé |
| A4 | **Sécurité HTTP** : `helmet`, `@nestjs/throttler`, **CORS restreint** (`origin:true`, [main.ts:20](../apps/api/src/main.ts#L20)) | Surface d'attaque ouverte | Faible | Élevé |
| A5 | **Brancher l'impression ticket réelle** (ESC/POS / `window.print` ciblé) | Besoin physique quotidien en boutique | Moyenne | Élevé |
| A6 | **Rate-limit PIN persistant** (Redis) au lieu d'en mémoire | Verrou perdu au redémarrage / multi-instance | Moyenne | Moyen |
| A7 | **États chargement/erreur homogènes** (remplacer `catch(()=>[])`) | UX pro = pas d'échec muet | Faible | Moyen |
| A8 | **Invariant prix sur update partiel** ([product.ts:85](../packages/types/src/product.ts#L85)) | Un update isolé peut casser `achat ≤ plancher ≤ catalogue` | Faible | Moyen |
| A9 | **Monitoring/observabilité** (Sentry + logs structurés + healthcheck DB) | Exploiter un SaaS multi-tenant | Faible | Moyen |

### B. Différenciantes (MVP → produit pro)

| # | Manque | Pourquoi | C | I |
|---|---|---|---|---|
| B1 | **Facturation + paiement Mobile Money** + trial + dunning | Sans cela, **pas de revenu** : c'est le modèle économique | Élevée | Élevé |
| B2 | **Gating réel des plans** (revoir [PLAN_MODULES](../packages/types/src/common.ts#L33)) | Aujourd'hui FREE = BUSINESS : aucune incitation à payer | Faible | Élevé |
| B3 | **Reçu & alertes WhatsApp/SMS** branchés sur le QR/`PublicReceipt` existant | Canal roi en Afrique de l'Ouest ; viralité + rétention | Moyenne | Élevé |
| B4 | **Onboarding wizard + import Excel + données démo + états vides** | Active les comptes, réduit le churn d'activation | Moyenne | Élevé |
| B5 | **Scanner code-barres par caméra** | Accélère la saisie sans douchette | Moyenne | Moyen |
| B6 | **Rapports multi-périodes + export CSV/PDF** | Valeur perçue propriétaire | Moyenne | Moyen |
| B7 | **Multi-langue (i18n)** | Élargit le marché ; chaînes en dur aujourd'hui | Moyenne | Moyen |
| B8 | **Nettoyer le flux mort `PENDING_APPROVAL`/`PriceOverride`** (ou le réactiver proprement) | Réduit la dette et le risque de régression | Faible | Faible |

### C. Techniques / non-fonctionnelles négligées

| # | Manque | Pourquoi | C | I |
|---|---|---|---|---|
| C1 | **RLS vérifiée en CI** (le script [verify-isolation.ts](../packages/db/prisma/verify-isolation.ts) existe mais reste manuel) + sauvegardes/PITR documentées | L'isolation est la promesse n°1 du produit | Faible | Élevé |
| C2 | **Durcir le contrôle au flush** (re-vérif plancher/stock) + **ne pas stocker `prixPlancher`/`prixAchat` en clair dans IndexedDB** | Un employé peut éditer Dexie pour vendre sous le plancher ; la marchandise part avant le rejet serveur | Moyenne | Élevé |
| C3 | **Scalabilité agrégats** : soldes trésorerie recalculés par `groupBy` sur tout l'historique ([treasury.service.ts:61](../apps/api/src/treasury/treasury.service.ts#L61)) ; dashboard charge tout en mémoire | Dégradation linéaire par tenant ; prévoir snapshots | Moyenne | Moyen |
| C4 | **Pagination réelle** (caps `take: 100/200/500`, pas de curseur) | Données tronquées silencieusement | Faible | Moyen |
| C5 | **Migrations propres en prod** (le README documente des correctifs SQL manuels `P2022`/enum) | Symptôme de dérive de schéma ; risque opérationnel | Moyenne | Moyen |
| C6 | **Conformité légale** (facture normalisée si requise, CGU, confidentialité, TVA) | Risque réglementaire par pays UEMOA | Moyenne | Moyen |
| C7 | **Accessibilité** (focus, contrastes, statut pas seulement par couleur, clavier) | Inclusion + qualité perçue | Moyenne | Faible |
| C8 | **Hygiène dépôt** : `sales.service.ts.orig`, `scratch.patch`, `add-headers.js` suivis dans git | Bruit / confusion / divergence | Faible | Faible |
| C9 | **Documentation API (OpenAPI/Swagger)** | Onboarding dev, futurs webhooks/intégrateurs | Faible | Faible |

---

## Phase 6 — Priorisation

### Palier 1 — Gains rapides (< 1 semaine)
- **A1** statut de sync par vente + rejouer + retrait du faux modal de succès.
- **A2** Zod sur `POST /pos/sales/:id/return` (+ retrait `as any`).
- **A4** `helmet` + `@nestjs/throttler` + CORS allowlist.
- **A8** invariant prix sur update + **B2** réactiver un vrai `PLAN_MODULES`.
- **A5/B3** brancher l'impression et le **partage WhatsApp sur le reçu QR existant** (haute
  valeur, faible coût car l'infra `PublicReceipt` est déjà là).
- **C8** purge des fichiers parasites + **B8** suppression du flux `PENDING_APPROVAL` mort.

### Palier 2 — Version pro (1–2 mois)
- **A3** tests `SalesService`/`TreasuryService`/CRM + **C1** RLS vérifiée en CI.
- **A6** rate-limit PIN Redis + **A9** Sentry/logs/healthcheck DB.
- **B4** onboarding wizard + import Excel + données démo + états vides.
- **B3/B5** notifications WhatsApp/SMS + scanner caméra ; **B6** rapports + export ; **C4** pagination.
- **C2** durcissement anti-fraude offline.

### Palier 3 — Vision long terme (trimestre+)
- **B1** facturation + paiement Mobile Money + trial + dunning (cœur du business model).
- **C3** refonte agrégats trésorerie/analytics (snapshots) pour l'échelle.
- **B7** i18n, **C6** conformité par pays, **C7** accessibilité, **C9** OpenAPI/webhooks.
- Modules MVP2/3 déjà anticipés par l'archi : Market WhatsApp, Livraison, IA, multi-boutiques, Flutter.

---

## Phase 7 — Angles morts possibles (relecture critique)

1. **Modèle économique** — le produit est techniquement « gratuit pour toujours » : gating
   neutralisé ([common.ts:33](../packages/types/src/common.ts#L33)), aucun paiement, `subscriptionStatus`
   décoratif. **Angle mort n°1** : un excellent produit sans moyen de le monétiser.
2. **« Faux succès » offline** — risque produit le plus dangereux (perte de vente + de confiance),
   contredit la doctrine de l'équipe.
3. **Fraude offline** — `prixPlancher`/`prixAchat` en clair dans IndexedDB ; édition possible
   par un employé pour vendre sous le plancher (rejet serveur *après* sortie de marchandise).
4. **Conformité légale locale** — facture fiscale, CGU, confidentialité, TVA non traités.
5. **Faible connectivité** — coquille PWA + file OK, mais pas de **retry périodique avec backoff**
   (reprise dépend de l'event `online` ou d'une nouvelle vente) ni de **décrément local du stock**
   (sur-vente offline possible).
6. **Sécurité des paiements** — à traiter *avant* d'encaisser des abonnements (idempotence des
   webhooks Mobile Money, anti-rejeu).
7. **Support client** — aucun canal in-app.
8. **Scalabilité multi-tenant** — isolation excellente, mais agrégats recalculés à chaque requête
   et pas de pagination réelle → à surveiller à la montée en charge.

---

## Résumé exécutif (≤ 5 lignes)

Wilinwi MVP1 est un **socle technique remarquablement propre** : isolation multi-tenant RLS
réelle, sécurité au niveau champ, RBAC centralisé, offline-first idempotent, logique métier
(4 prix, crédit/lettrage, trésorerie) riche et atomique. Les manques sont surtout
**produit/business** : aucune facturation ni gating de plan effectif (le modèle d'abonnement
n'existe pas encore), onboarding embryonnaire, zéro notification multi-canal, impression/partage
de reçu factices, et un risque UX majeur de « faux succès » de vente hors-ligne. Côté technique :
tests du cœur métier quasi absents, sécurité HTTP (helmet/CORS/throttling) et observabilité à
mettre en place. **Maturité : MVP solide** — proche du « prêt pour la croissance » côté ingénierie,
mais il manque la couche monétisation + activation + fiabilité offline pour y prétendre réellement.

---

*Revue indépendante générée le 21 juin 2026 — audit en lecture seule, aucun fichier de code modifié.*
*Emplacement : `docs/audit-report-independant.md` (le rapport antérieur reste dans `docs/audit-report.md`).*
