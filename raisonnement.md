/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Carnet de notes de raisonnement de DEXTY — Évolutions, stratégies cognitives et méthodologies d'excellence
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
──────────────────────────────────

# DEXTY — Notebook de Raisonnement & Évolution

Ce carnet de notes consigne les patterns cognitifs, les stratégies de résolution de problèmes complexes et les décisions architecturales qui ont fait leurs preuves. Il sert de "moteur d'apprentissage" pour guider mes futurs raisonnements et garantir l'excellence à chaque intervention.

---

## 🧠 1. MÉTHODOLOGIE COGNITIVE (COMMENT RAISONNER AVANT D'AGIR)

### A. La cartographie de l'existant (Pas d'intervention aveugle)
* **Règle d'or** : Ne jamais modifier ou ajouter du code sans avoir d'abord lu les fichiers dépendants et compris l'intention initiale du code.
* **Stratégie** :
  1. Identifier les fichiers ouverts par l'utilisateur (métadonnées) pour situer son focus.
  2. Parcourir les types partagés (`packages/types`) et le schéma de base de données (`packages/db/prisma/schema.prisma`) pour comprendre le modèle de données.
  3. Tracer le flux de données complet (ex: du clic sur l'UI vers le middleware, le contrôleur, puis le service).

### B. Le pushback constructif & Propositions d'alternatives
* Si l'utilisateur demande une correction immédiate ou une structure simple mais sous-optimale pour le métier, proposer systématiquement l'approche la plus robuste (ex: au lieu de simplement diminuer la dette d'un client de façon globale, proposer d'associer le paiement à des factures spécifiques en mode FIFO ou lettrage ciblé).
* Toujours expliquer la valeur ajoutée de la complexité métier introduite (sécurité, traçabilité comptable, intégrité des stocks).

### C. La décomposition chirurgicale des modifications
* Limiter au strict minimum les zones de code modifiées pour éviter les régressions collatérales ("Surgical Changes").
* Ne jamais réécrire un fichier complet si une modification ciblée est possible (meilleure lisibilité des diffs et efficacité des jetons).

---

## 🗄️ 2. GESTION DU MULTI-TENANT & ISOLATION BDD (PRISMA + RLS)

### A. L'isolation stricte par transaction temporaire
* **Pattern clé** : L'application utilise PostgreSQL avec RLS (Row-Level Security) de Supabase. Pour garantir qu'aucun locataire (tenant) ne puisse lire ou écrire les données d'un autre :
  - Toujours encapsuler les requêtes de base de données dans la méthode transactionnelle `PrismaService.forTenant(tenantId, tx => ...)` du backend NestJS.
  - Cette méthode positionne la variable locale Postgres `app.current_tenant_id` au niveau de la transaction avant d'exécuter la logique métier, forçant la base à filtrer les lignes.
* **Raisonnement** : Ne jamais utiliser un client Prisma brut ou global sans le lier au contexte du tenant courant.

### B. Gestion de la dérive de schéma (Schema Drift)
* Lorsque l'environnement d'exécution (la sandbox) subit des restrictions réseau l'empêchant d'accéder directement au serveur Supabase pour exécuter les migrations (`migrate deploy`), le raisonnement stratégique impose :
  1. Générer et valider localement la migration Prisma.
  2. Extraire et consolider les requêtes SQL brutes équivalentes.
  3. Fournir le script SQL clair à l'utilisateur pour une exécution manuelle via le tableau de bord cloud (ex: Supabase SQL Editor).
  4. Mettre à jour le document `README.md` pour centraliser ces instructions de synchronisation de production.

---

## 💼 3. PATTERNS MÉTIER SPÉCIFIQUES À L'AFRIQUE DE L'OUEST

### A. Gestion fine de la dette client (CRM & Lettrage)
* **Problématique** : Un client rembourse un montant global de dette. La diminution brute de son solde ne suffit pas, car ses ventes associées restent sous le statut `PENDING_PAYMENT`.
* **Raisonnement stratégique (FIFO & Lettrage ciblé)** :
  1. **Mode Lettrage ciblé** : Si l'utilisateur spécifie une vente à rembourser, le paiement est affecté en priorité à ses tranches de paiement (`SaleInstallment`).
  2. **Mode FIFO automatique** : Si aucun ciblage n'est fourni, l'algorithme doit récupérer chronologiquement les ventes impayées du client et y ventiler le montant du remboursement jusqu'à épuisement.
  3. **Atomicité** : Toutes ces écritures (mise à jour du solde du client, lettrage des ventes, création des lignes de mouvement de caisse) doivent s'exécuter dans la **même transaction PostgreSQL** pour éviter des incohérences de trésorerie en cas de panne intermédiaire.

### B. Trésorerie multi-comptes et Mobile Money (MoMo)
* **Structure** : Dans la région XOF, les flux transitent principalement par la Caisse (physique), MTN MoMo, Moov Money et la Banque.
* **Règles métier de trésorerie** :
  - **Virement de fonds** : Toujours vérifier si le solde théorique du compte source est suffisant avant d'autoriser un transfert (ex: interdire de virer 50 000 FCFA de la Caisse vers la Banque si la Caisse ne contient que 10 000 FCFA).
  - **Dépenses d'urgence** : Permettre d'enregistrer des denses même si le solde est négatif (après alerte visuelle), car dans le commerce réel, des opportunités ou urgences nécessitent de décaisser immédiatement.
  - **Clôture de caisse** : Imposer un motif textuel obligatoire dès qu'un écart théorique/réel est constaté (anti-fraude).

---

## 🛠️ 4. STRATÉGIES DE DEBUGGING & DIAGNOSTIC

### A. Repérage des erreurs silencieuses d'UI (Exemple du POS offline-first)
* **Problème fréquent** : L'interface utilisateur donne l'impression qu'une action est validée avec succès alors que la synchronisation réseau a échoué en tâche de fond.
* **Raisonnement correctif** :
  - Ne jamais masquer le statut de synchronisation à l'utilisateur.
  - Utiliser des badges d'état clairs (`Synchronisé ✓`, `En attente de connexion ⏳`, `Erreur de sync ⚠️`).
  - Permettre à l'utilisateur de consulter l'historique des erreurs de synchronisation et de relancer manuellement le vidage de la file (`syncEngine.flush()`).

### B. Diagnostic d'erreurs de typage TypeScript
* Toujours utiliser le compilateur TypeScript en mode strict (`tsc --noEmit`) pour valider les modifications transversales.
* Si le projet utilise Turborepo avec des packages locaux (ex: `@wilinwi/types` importé par `apps/web`), **toujours recompiler le package partagé** (`pnpm build`) avant de tester les applications consommatrices, sous peine de voir TypeScript utiliser d'anciens fichiers de déclaration (`.d.ts`).
