<!--
  @author @hopsyder
  @organization Nexus Partners
  @description DEXTY v2.2 — Anti-Patterns et Pièges Rencontrés
  @created 2026-06-19
  @updated 2026-10-04
  🌐 nexus-partners.xyz
-->

# Anti-Patterns & Pièges à Éviter — Wilinwi

Ce registre répertorie les erreurs réelles survenues au cours du développement du projet afin de ne plus jamais les reproduire.

---

## 🚫 Anti-Pattern 1 : Utilisation de variables shell non exportées
- **Symptôme** : Commande échouant avec `Either --url or --schema must be provided` lors de l'exécution de `prisma db execute --url "$DIRECT_URL"`.
- **Cause** : `$DIRECT_URL` existait dans le `.env` mais n'était pas exporté dans la session shell active, évaluant `--url ""` à vide.
- **Règle** : Pour exécuter du SQL ou des commandes Prisma en CLI, toujours utiliser l'argument `--schema prisma/schema.prisma` (qui lit et charge automatiquement le `.env`) ou injecter explicitement les variables via `env $(grep -v '^#' .env | xargs)`.

---

## 🚫 Anti-Pattern 2 : Déduction de stock brute sur produits au poids/volume
- **Symptôme** : Survente et stock incohérent : vendre 0,25 kg de poisson ne déduisait que 0,00025 unité du stock.
- **Cause** : Les produits `WEIGHT` et `VOLUME` ont leur stock mesuré en milli-unités entières (5 kg = 5000), mais la vente débitait la quantité unitaire brute sans appliquer le facteur d'échelle.
- **Règle** : Toujours utiliser `quantity_scale = 1000` pour convertir la quantité en milli-unités lors du mouvement de stock, et `saleLineAmount()` pour le calcul financier.

---

## 🚫 Anti-Pattern 3 : Arrondi ou troncature prématurée des quantités décimales
- **Symptôme** : Impossibilité de vendre un demi-produit ou décalage de stock lors de la vente fractionnée.
- **Cause** : Utilisation de `parseInt()` au lieu de `parseFloat()` dans les composants de saisie ou les services backend.
- **Règle** : Toute manipulation de quantité doit utiliser `Float`, `parseFloat()`, `step="any"` dans les formulaires et une tolérance de comparaison `STOCK_EPSILON = 1e-6`.

---

## 🚫 Anti-Pattern 4 : Bloquer l'importation sur des champs non essentiels
- **Symptôme** : Rejet systématique des fichiers Excel des commerçants avec erreur `SKU manquant` ou `Quantité de stock invalide`.
- **Cause** : Exiger de manière rigide la présence de colonnes SKU, Catégorie ou Stock initial dans des fichiers qui ne sont souvent que des listes tarifaires.
- **Règle** : Proposer par défaut la génération automatique de SKU uniques (`generateSmartSku`) et permettre de laisser vides la catégorie (`null`) et le stock initial (`0`).

---

## 🚫 Anti-Pattern 5 : Fusion directe sans branche tampon entre branches divergentes
- **Symptôme** : Conflits massifs (35 fichiers cassés) lors d'un `git merge` entre `main-mvp2` et `main`.
- **Cause** : Deux branches développées en parallèle pendant plusieurs mois avec des refontes d'architecture.
- **Règle** : Ne jamais exécuter de merge direct sur `main` en cas de divergence structurelle. Toujours créer une branche tampon d'intégration (`chore/merge-...`), résoudre les conflits méthodiquement par domaine, valider (`typecheck`, `build`), et ne livrer sur `main` qu'une fois la branche 100% verte.
