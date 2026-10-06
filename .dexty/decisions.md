<!--
  @author @hopsyder
  @organization Nexus Partners
  @description DEXTY v2.2 — Registre des Décisions d'Architecture (ADR)
  @created 2026-06-19
  @updated 2026-10-04
  🌐 nexus-partners.xyz
-->

# Registre des Décisions d'Architecture (ADR)

## ADR-001 — Monolithe Modulaire Multi-Tenant & RLS Stricte
- **Date** : 2026-06-19
- **Statut** : Accepté / Actif
- **Contexte** : Besoin d'une architecture multi-tenant étanche, simple à opérer et rentable pour le marché ouest-africain sans la complexité d'une flotte de microservices.
- **Décision** : Monolithe modulaire NestJS avec base PostgreSQL unique où chaque table porte `tenant_id` et est protégée au niveau moteur par Row-Level Security (RLS).
- **Conséquences** : Cloisonnement strict garanti au niveau base de données même en cas de faille applicative. Obligation d'utiliser `withTenant()` / `forTenant()` sur toutes les requêtes.

## ADR-002 — Système de Tarification à 4 Prix
- **Date** : 2026-06-19
- **Statut** : Accepté / Actif
- **Contexte** : Pratique courante du marchandage et de la négociation de prix en boutique physique avec risque élevé de coulage ou de vente à perte par les vendeurs.
- **Décision** : Invariant mathématique strict : `prixAchat <= prixPlancher <= prixCatalogue`. Le vendeur peut négocier un `prixReel` à la caisse, mais le système refuse toute vente si `prixReel < prixPlancher`.
- **Conséquences** : Les prix d'achat et plancher sont classés sensibles et filtrés avant transmission au front de caisse.

## ADR-003 — Rôle Applicatif Dédié et Session Pooling Supabase
- **Date** : 2026-08-04
- **Statut** : Accepté / Actif
- **Contexte** : RLS nécessite la commande `SET LOCAL app.current_tenant_id`. En mode transaction pooling (port 6543 de PgBouncer), le contexte de session est réinitialisé entre chaque commande.
- **Décision** : Utilisation du mode Session Pooling (port 5432) avec le rôle restreint `wilinwi_app` pour `DATABASE_URL`. Les migrations DDL utilisent `DIRECT_URL` avec le rôle `postgres`.
- **Conséquences** : Garantie que la variable de session RLS persiste tout au long de la transaction applicative.

## ADR-004 — RBAC à 5 Rôles et Gating par Capacités
- **Date** : 2026-09-17
- **Statut** : Accepté / Actif
- **Contexte** : Les entreprises commerciales emploient des profils distincts (propriétaire, gérant, vendeur, caissier, livreur).
- **Décision** : 5 rôles standardisés (`OWNER`, `MANAGER`, `SELLER`, `CASHIER`, `DELIVERY`). Les routes ne vérifient pas le rôle brut mais des capacités atomiques (`sale:create`, `stock:read`, `treasury:manage`).
- **Conséquences** : Souplesse d'évolution des permissions sans refactorer les contrôleurs API.

## ADR-005 — Authentification Hybride (JWKS ES256 & PIN Local HS256)
- **Date** : 2026-09-17
- **Statut** : Accepté / Actif
- **Contexte** : Besoin de concilier la sécurité des comptes administratifs (emails/mots de passe forts) et la rapidité du passage de relais en caisse physique.
- **Décision** : Double validation dans `AuthGuard` :
  1. Token Supabase vérifié via JWKS asymétrique distant (`ES256`).
  2. Token de caissier validé via secret PIN symétrique (`HS256`) avec verrouillage anti-bruteforce en BDD après 3 échecs.
- **Conséquences** : Expérience fluide pour les caissiers sans compromettre la sécurité globale.

## ADR-006 — Migration Universelle des Quantités en Double Precision (Float)
- **Date** : 2026-10-04
- **Statut** : Accepté / Actif
- **Contexte** : Vente de produits au détail (0,5 kg, 1,5 L, demi-pain, découpe de viande) impossible avec les anciens champs entiers (`integer`).
- **Décision** : Migration de toutes les colonnes de quantité vers `double precision` dans PostgreSQL et `Float` dans Prisma (`stock`, `quantite`, `ecart`, etc.).
- **Conséquences** : Clavier tactile et saisie directe décimale au POS, adaptation des formateurs UI et prise en compte des décimales dans l'inventaire.

## ADR-007 — Ventes Décimales Exactes (Poids/Volume en Milli-Unités & Scale)
- **Date** : 2026-10-04
- **Statut** : Accepté / Actif
- **Contexte** : Risque d'erreur d'arrondi binaire sur les produits au poids/volume stockés en grammes/millilitres.
- **Décision** : Produits `WEIGHT` et `VOLUME` stockés en milli-unités entières (1000 = 1 kg) avec colonne snapshot `sale_items.quantity_scale = 1000`. Produits à l'unité en Float avec tolérance epsilon `1e-6`.
- **Conséquences** : Débits de stock au gramme près, zéro perte de précision, valorisation du CA et des marges exacte.

## ADR-008 — Auto-Création Transparente de Session d'Inventaire
- **Date** : 2026-10-04
- **Statut** : Accepté / Actif
- **Contexte** : Lors de la régularisation de stock au point de vente, les gérants étaient bloqués si aucune session d'inventaire formelle n'avait été ouverte manuellement.
- **Décision** : Le backend vérifie l'existence d'une session active lors de la réconciliation. Si aucune n'existe, il l'ouvre automatiquement, y associe les lignes comptées et clôture avec génération du PV.
- **Conséquences** : Zéro friction opérationnelle sur le terrain, traçabilité complète préservée.

## ADR-009 — Assistant d'Importation avec Auto-SKU et Tolérance aux Données Partielles
- **Date** : 2026-10-04
- **Statut** : Accepté / Actif
- **Contexte** : Les catalogues Excel fournis par les commerçants ne contiennent souvent ni code SKU, ni catégorie, ni quantité de stock initiale.
- **Décision** :
  1. Option `🪄 Générer automatiquement (Auto-SKU)` par défaut si colonne SKU absente, générant des codes uniques lisibles (`PREFIX-001`).
  2. Options `Laisser vide` pour le stock (fixé à 0), la catégorie (`null`) et le prix d'achat.
- **Conséquences** : Taux d'abandon à l'import divisé par 3, conformité totale avec le schéma d'import backend.

## ADR-010 — Kit de Marque PDF Unique & Logo Wilinwi à son Ratio Réel
- **Date** : 2026-10-04
- **Statut** : Accepté / Actif
- **Contexte** : Factures et bons de commande jugés médiocres : logo horizontal (1229×363) forcé dans un carré 15×15 mm (illisible), palette teal hors charte, cartouches à hauteur fixe (textes longs débordants), fausses mentions « HT / TVA 0 % / TTC », QR non compressé (330 Ko), police `helvetica/mono` inexistante, mention « montant en lettres » absente, lien QR du reçu thermique sans `/r/` (404).
- **Décision** :
  1. `apps/web/src/lib/pdf/brand-kit.ts` = SEULE source de mise en page PDF (palette charte, en-tête logo + émetteur, cartouches dynamiques, totaux, montant en lettres, signatures, pied « Propulsé par Wilinwi », rappel sur pages de suite).
  2. Logos d'impression dédiés recadrés/allégés : `public/brand/wilinwi-logo-print.png` (760×198, 20 Ko) et `wilinwi-mark-print.png` (356×240, 9 Ko) ; ratio lu dans l'en-tête PNG → jamais déformé.
  3. `amountInWords` / `fcfaInWords` dans `@wilinwi/types` (orthographe traditionnelle, 27 tests) pour la mention « Arrêtée la présente facture à la somme de… ».
  4. `publicReceiptUrl()` (`apps/web/src/lib/public-receipt-url.ts`) = source unique des liens/QR de reçu.
  5. `<PrintBrandLogo />` (chargement `priority`) pour les documents imprimés via `window.print`.
- **Conséquences** : PDF ~66 Ko au lieu de 330 Ko ; tout nouveau document PDF doit réutiliser le kit (pas de `doc.rect`/couleurs en dur).

## ADR-011 — Fourchette de Prix à la Caisse & Suivi des Remises (nom du client obligatoire)
- **Date** : 2026-10-06
- **Statut** : Accepté / Actif
- **Contexte** : Dépôt de boissons — casier de grande Béninoise acheté 5 800, vendu 6 000 aux clients de passage et 5 900 aux habitués. Le plancher existait mais n'était ni visible ni réglable à la caisse ; rien n'empêchait de vendre AU-DESSUS du prix de vente ; le plancher d'un casier ne pouvait être que plancher × 12 (5 900 / 12 = 491,67 F, non entier).
- **Décision** :
  1. Fourchette `minimum ≤ prix ≤ prix de vente`, règle unique `salePriceBounds()` / `checkSalePrice()` (`packages/types/src/product.ts`) utilisée par le POS (sélecteur de prix) ET le serveur (refus en dessous comme au-dessus).
  2. `ProductUnit.floorPrice` (nullable) : minimum propre à un conditionnement ; il ne descend jamais sous `prixAchat × facteur` (vente à perte refusée à l'enregistrement).
  3. Vente sous le prix de vente → **nom du client obligatoire** (fiche CRM ou nom seul d'un client de passage, figé dans `Sale.clientNom`). Le téléphone reste exigé uniquement pour le crédit et la livraison.
  4. `SaleItem.prixReference` (prix affiché au moment de la vente) → rapport `GET /api/analytics/discounts` (par caissier, par client, détail, CSV), onglet « Remises accordées » de /ventes (OWNER/MANAGER).
- **Conséquences** : migration `20261006090000_price_range_discounts` à appliquer (3 colonnes nullables, idempotente). Lignes antérieures sans `prixReference` exclues du suivi. Vérifié par `apps/api/scripts/simulate-price-range.ts` (17/17).
