<!--
  @author @hopsyder
  @organization Nexus Partners
  @description DEXTY v2.2 — Contraintes Techniques Durables
  @created 2026-06-19
  @updated 2026-10-04
  🌐 nexus-partners.xyz
-->

# Contraintes Techniques Durables — Wilinwi

Ces contraintes découlent de l'infrastructure réelle, des limites physiques des tiers et des règles métiers absolues de Wilinwi.

---

## 1. Base de données & PostgreSQL (Supabase)

1. **Isolation Multi-tenant (RLS)** :
   - `tenant_id` est non-nullable sur toutes les tables métiers.
   - Ne jamais exécuter de requête brute sans passer par `forTenant()` ou sans définir `SET LOCAL app.current_tenant_id`.
   - Tester périodiquement avec `tsx packages/db/prisma/verify-isolation.ts`.

2. **Connexion et Pooler** :
   - `DATABASE_URL` doit obligatoirement utiliser le **port 5432 (mode Session)** de PgBouncer. Le port 6543 (mode Transaction) casse la RLS.
   - Le rôle `wilinwi_app` ne possède pas le privilège `BYPASSRLS`.
   - `DIRECT_URL` (port direct Supabase avec rôle `postgres`) est réservé exclusivement aux migrations Prisma DDL.

3. **Précision des Quantités et Prix** :
   - Montants en devises locales (FCFA, GNF, etc.) : **toujours des entiers** (pas de centimes).
   - Quantités de stock : `Float` / `double precision`. Comparaisons avec seuil epsilon `1e-6`.
   - Produits `WEIGHT`/`VOLUME` : conversion et débit en milli-unités entières (scale 1000).

---

## 2. Sécurité & Droits d'Accès

1. **Fuite d'Informations Sensibles** :
   - `prixAchat` et `prixPlancher` ne doivent **jamais** apparaître dans les réponses destinées aux rôles `SELLER`, `CASHIER` ou `DELIVERY`.
   - Tout mapping d'objet produit vers le client doit transiter par `toProductDto()` ou `sale.mapper.ts`.

2. **Protection Anti-Bruteforce PIN** :
   - Le code PIN de caisse est hashé en `bcrypt` (10 rounds).
   - Après 3 tentatives infructueuses, la session est verrouillée avec délai de déblocage croissant.

3. **Secrets et Fichiers d'Environnement** :
   - Aucun token Supabase Service Role, clé secrète JWT ou mot de passe BDD ne doit être commité.
   - Les fichiers `.env*` sont strictement ignorés par Git.

---

## 3. Frontend & Expérience Utilisateur

1. **Codes Couleurs Contextuels par Module** :
   - `/pos` : Émeraude (`bg-emerald-600`)
   - `/stock` : Ambre (`bg-amber-600`)
   - `/entrepot` : Sarcelle / Teal (`bg-teal-600`)
   - `/clients` : Violet (`bg-violet-600`)
   - `/tresorerie` : Rose (`bg-rose-600`)
   - `/livraisons` : Ambre (`bg-amber-600`)
   - `/parametres` : Indigo (`bg-indigo-600`)

2. **Chiffres et Tableaux** :
   - Toujours appliquer la classe CSS `.tabular` ou la police monospace dédiée (`DM Mono` / `JetBrains Mono`) pour l'alignement des nombres et montants.
   - Utiliser `formatFCFA()` issu de `@wilinwi/ui`.

3. **Gestion Réseau & Hors-Ligne** :
   - Toute vente initiée au POS doit pouvoir s'enregistrer localement dans `Dexie` en l'absence de réseau.
   - L'interface doit afficher la télémétrie réseau live (`En ligne` / `Hors ligne`).

---

## 4. Git & Procédure de Synchronisation DEXTY

1. **Règle Absolue de Mise à Jour Mémoire** :
   - Avant **tout git push**, le dossier `.dexty/` (`memory.md`, `decisions.md`, `temp-memory-projet.md`) doit être synchronisé avec l'état réel des modifications.
   - Ne jamais écraser le travail non commité de l'utilisateur.

2. **Fusions Sensibles (ex: `main-mvp2` vers `main`)** :
   - Toute fusion majeure présentant des divergences multi-fichiers doit obligatoirement transiter par une branche tampon (`chore/merge-...`) avec tests complets (`typecheck`, `build`) avant intégration définitive.
