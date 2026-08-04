/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Directive de Développement & UI/UX Master — Wilinwi MVP2
 * @created 2026-08-04
 * @updated 2026-08-04
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

# ◈ DIRECTIVE DE DÉVELOPPEMENT & UI/UX MASTER — WILINWI MVP2

## 🎯 OBJECTIF GLOBAL
Sublimer et finaliser l'application Wilinwi MVP2 pour en faire un ERP/POS SaaS B2B de niveau professionnel, hautement performant, esthétique et adapté au commerce local et régional en Afrique de l'Ouest (Bénin, Togo, Côte d'Ivoire, Nigeria, etc.).

Le système allie une expérience visuelle moderne et épurée (Design System Slate/Emerald, cartes surélevées, micro-interactions) avec une efficacité opérationnelle maximale pour les caissiers, magasiniers et gérants d'établissements.

---

## 🎨 1. CHARTE VISUELLE & DESIGN SYSTEM PREMIUM

### A. Palette de Couleurs & Hiérarchie Sémantique
- **Arrière-plan principal** : Fond neutre reposant `bg-slate-50` (`#F8FAFC`).
- **Cartes & Conteneurs** : Blanc pur `bg-white`, ombres douces `shadow-sm`, bordures subtiles `border border-slate-200/60`, coins arrondis `rounded-xl`.
- **Couleurs d'état métier** :
  - **Émeraude / Vert (`emerald-600`)** : Encaissements, croissance, stock disponible, validation.
  - **Ambre / Orange (`amber-500`)** : Alertes de stock faible, encours crédits, paiements en attente.
  - **Rose / Rouge (`rose-600`)** : Ruptures de stock, dépenses, écarts négatifs, blocages de crédit, Mode Read-Only.
  - **Bleu / Indigo (`indigo-600`)** : Métriques globales, navigation, informations système.

### B. Micro-Interactions & États Système
- **Chargements (Skeletons UI)** : Proscrire les spinners globaux. Remplacer chaque composant en attente par des conteneurs animés reproduisant fidèlement la forme du widget cible (`SkeletonKpiCard`, `SkeletonDataTable`, `SkeletonChart`).
- **Feedback d'action immédiat** : Lors de l'ajout d'un produit au panier ou d'une saisie de caisse, déclencher une animation visuelle brève (flash vert ou retour haptique PWA).
- **États Vides (`Empty States`)** : Toujours accompagner l'absence de données d'une illustration épurée, d'un message contextuel clair et d'un bouton d'action explicite.
- **Formatage Régional** : Séparer systématiquement les milliers des montants monétaires par des espaces insécables (`1 250 000 FCFA`) pour garantir une lisibilité instantanée.

---

## 🛒 2. ERGONOMIE CAISSE & POINT DE VENTE (`/pos`)

### A. Disposition Split-Screen Fixe (Desktop / Tablette)
- **Zone Gauche (2/3 de l'écran - Catalogue & Recherche)** :
  - **Barre de Recherche Universelle (`Omnibox`)** : Focus automatique au chargement, détection automatique des scans de codes-barres sans nécessiter de clic préalable.
  - **Filtres par Catégorie (`Pills`)** : Bandeau à défilement horizontal fluide avec icônes distinctes.
  - **Grille de Cartes Produits** : Photo produit, nom sur 2 lignes maximum, prix grand format, pastille de stock en temps réel (Vert = Stock confortable, Orange = Stock faible, Gris/Rouge = Épuisé).
- **Zone Droite (1/3 de l'écran - Panier & Encaissement Persistant)** :
  - Panier toujours visible à hauteur d'œil, sans défilement de page.
  - Ajustement rapide des quantités via boutons `[ - ] [ Quantité ] [ + ]` et suppression rapide.

### B. Navigation Caissier Pro & Raccourcis Clavier Globaux
- Activer l'écoute des raccourcis clavier globaux via `useEffect` sécurisé :
  - `F2` : Focus immédiat sur la barre de recherche produit.
  - `F4` : Ouverture rapide de la recherche / création de client CRM.
  - `Entrée` / `Espace` : Déclenchement de la modale d'encaissement.
  - `Échap` : Annulation ou vidage du panier.
- Pavé numérique virtuel accessible d'un clic pour l'utilisation sur écrans tactiles.

### C. Encaissement & Règlement Fractionné (`POSCheckout`)
- **Calculateur d'Espèces** : Boutons de coupures rapides FCFA (`+1 000`, `+2 000`, `+5 000`, `+10 000 FCFA`, *Compte Exact*) et affichage géant en vert de la monnaie exacte à rendre.
- **Paiement Fractionné (*Split Payment*)** : Permettre d'associer deux modes de règlement sur une même transaction.
- **Mobile Money Déclaratif** : Sélection en 1 clic de l'opérateur (MTN, Moov, Wave) avec champ facultatif pour la référence SMS.
- **Contrôle du Crédit Client** : En cas de sélection d'une vente à crédit, afficher le solde débiteur actuel et le plafond autorisé. Bloquer la vente si l'encours dépasse la limite.

---

## 📱 3. RESPONSIVITÉ MOBILE-FIRST & USAGE MAGASINIER (PWA)

### A. Vue Cartes Compactes sur Smartphone
- Sur écran mobile, transformer automatiquement les tableaux complexes en une suite de cartes compactes :
  - Photo miniature du produit à gauche.
  - Nom, catégorie et prix au centre.
  - Badge de stock géant à droite avec indicateur couleur d'alerte.

### B. Raccourci de Scan Mobile Persistant
- Intégrer un bouton flottant persistant en bas à droite de l'écran mobile : `[ 📷 Scanner ]`.
- Ce bouton active instantanément l'appareil photo du smartphone pour scanner le code-barres d'un article en rayon et ouvrir directement sa fiche ou l'ajouter au panier.
- Conserver des zones de frappe et de clic d'au moins 48px pour faciliter l'utilisation tactile sur le terrain.

---

## 📦 4. GESTION DES STOCKS & FICHE PRODUIT (`/stock`)

### A. Dashboard de Synthèse & Tableau des Produits
- **Cartes KPIs du Stock** : Double affichage de la valeur financière — *Valeur au prix d'achat* (capital immobilisé) ET *Valeur au prix de vente* (CA potentiel).
- **Jauges Visuelles de Stock** : Barre de niveau sous la quantité avec code couleur dynamique.
- **Tarification & Marge** : Afficher le Prix d'Achat et le Prix de Vente sur deux lignes superposées dans la même cellule, accompagnés de la pilule colorée de *Marge Nette (%)*.
- **Interrupteur Inline** : Permettre le basculement direct du statut *"Vendable en POS"* depuis chaque ligne du tableau.

### B. Modales de Mouvement & Importation
- **Ajustement Manuel** : Classification visuelle stricte par couleur (*Entrée/Réapprovisionnement* en vert, *Sortie/Perte* en rouge, *Régularisation* en bleu) avec sélection obligatoire du motif.
- **Assistant d'Importation Catalogue** : Processus en 3 étapes : (1) Téléchargement du modèle, (2) Mapping des colonnes, (3) Prévisualisation avec détection d'erreurs.

### C. Fiche Détail Produit par Onglets (`/stock/[id]`)
Organiser la page individuelle du produit via une navigation par onglets :
1. **Onglet "Synthèse & Tarification"** : Visuel principal, prix, marges, variantes (taille, couleur) et unités de mesure.
2. **Onglet "Journal des Mouvements"** : Historique chronologique complet (Date, Type, Quantité, Auteur, Motif / Réf. Reçu).
3. **Onglet "Analyse des Performances"** : Volume vendu sur 30 jours, contribution au CA et vitesse de rotation (*Fast mover* vs *Slow mover*).

---

## 📊 5. DASHBOARD & CLÔTURE DE CAISSE (`/dashboard` & `/ventes`)

### A. Dashboard Analytics
- **Comparaison Temporelle Relative** : Lorsque la case *"vs période précédente"* est cochée, transmettre le filtre à l'API, calculer la période miroir et alimenter les badges de tendance (+X% / -Y%) ainsi que la ligne pointillée comparative du graphique hybride.
- **En-tête Desktop Épuré** : Disposer le titre, le sélecteur d'établissement, l'état du réseau et le filtre temporel sur une seule ligne horizontale.
- **Actions Rapides Opérantes** : Raccorder chaque bouton de la `QuickActionsBar` aux modales et formulaires réels.

### B. Clôtures de Caisse & Rapports Z (`/ventes`)
- **Onglet "Clôtures de Caisse"** : Ajouter la bascule `[ Ventes Individuelles ] | [ Clôtures de Caisse ]` sur la page `/ventes`.
- **Formulaire de Clôture (`POSCloseSessionModal`)** :
  - Déclencher la synchronisation forcée des ventes locales hors-ligne (`syncPendingSales()`) avant la fermeture officielle.
  - Formulaire de comptage par coupures avec déclaration automatique des écarts transmise au journal d'audit.
  - Option d'impression thermique du Rapport Z de fin de journée.

---

## 🔒 6. ISOLATION MULTI-TENANT, SÉCURITÉ & ABONNEMENTS

### A. Étanchéité Multi-Tenant & Isolation du Catalogue
- Appliquer un filtrage strict par `etablissementId` sur la route `GET /pos/products` (Masquage Niveau 3).
- Sécuriser l'ensemble des requêtes Prisma avec l'injection du contexte `entrepriseId` (prévention IDOR).

### B. Cycle de Vie des Abonnements
- Appliquer le cycle d'expiration à 3 niveaux : Échéance $\rightarrow$ Période de grâce (3j) $\rightarrow$ Mode Read-Only.
