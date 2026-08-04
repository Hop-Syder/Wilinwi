/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Index général de la documentation technique et fonctionnelle du projet Wilinwi
 * @created 2026-08-04
 * @updated 2026-08-04
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

# 📚 Index de la Documentation Wilinwi (`docs/`)

> **Organisation** : Nexus Partners | **Auteur** : @hopsyder  
> **Plateforme** : Wilinwi — SaaS multi-tenant de gestion de commerce pour l'Afrique de l'Ouest

Ce dossier rassemble l'ensemble des documents d'architecture, de cadrage fonctionnel, de spécifications techniques et de rapports d'audit du projet **Wilinwi**.

---

## 📑 Sommaire des Documents

### 1. Document Majeur de Synthèse
* 📄 **[SYNTHESE_GLOBALE_PROJET.md](SYNTHESE_GLOBALE_PROJET.md)**  
  *Document de référence n°1.* Vue globale du système, bilan d'avancement des livrables (POS, Stock Hub & Spoke, Trésorerie, Multi-Devises, RLS), cartographie complète des fonctions et schéma intégral de la base de données PostgreSQL / Prisma.

---

### 2. Spécifications & Cahier des Charges
* 📄 **[directive-ui-ux-master-mvp2.md](directive-ui-ux-master-mvp2.md)**  
  *Directive de Développement & UI/UX Master — Wilinwi MVP2.* Exigences d'excellence UI/UX, Design System Slate/Emerald, ergonomie caisse Split-Screen 2/3 + 1/3, raccourcis clavier F2/F4, PWA mobile-first, fiche produit 3 onglets et règles d'isolation multi-tenant.
* 📄 **[tdr-specifications-wilinwi.md](tdr-specifications-wilinwi.md)**  
  Termes de Référence (TDR) officiels décrivant les exigences métiers, la sécurité multi-tenant, la résilience offline (IndexedDB / SyncEngine) et les règles financières (devise FCFA sans centimes).
* 📄 **[newplan-tdr.md](newplan-tdr.md)**  
  Feuille de route et plan d'action d'implémentation technique découpé par jalons.

---

### 3. Cadrage Fonctionnel & Rôles
* 📄 **[cadrage-roles.md](cadrage-roles.md)**  
  Matrice RBAC détaillée des 5 rôles métier (`OWNER`, `MANAGER`, `SELLER`, `CASHIER`, `DELIVERY`) et de la délimitation des capacités d'accès.

---

### 4. Console Super-Admin & Administration Plateforme
* 📄 **[plan-projet-admin.md](plan-projet-admin.md)**  
  Architecture et plan d'isolation de l'application super-admin (`apps/admin-web`), politique de sécurité cross-tenant (`wilinwi_admin`) et gestion des abonnements/facturation.
* 📄 **[pilotage-admin.md](pilotage-admin.md)**  
  Guide de pilotage et procédures d'exploitation de la plateforme pour Nexus Partners.

---

### 5. Audits & Évaluations d'Architecture
* 📄 **[audit-report-mvp2.md](audit-report-mvp2.md)**  
  *Audit Technique et Sécurité Sans Concession — Wilinwi MVP2.* Analyse chirurgicale du monorepo, inventaire du code mort, conformité métier POS & Rapports Z, imperméabilité multi-tenant RLS, fuites mémoire et matrice de priorité P0/P1/P2.
* 📄 **[audit-report-independant.md](audit-report-independant.md)**  
  Rapport d'audit indépendant sur la robustesse du code, l'isolation RLS et les performances.
* 📄 **[audit-report.md](audit-report.md)**  
  Revue de code et audit de conformité aux standards DEXTY.

---

## 🌐 Liens Utiles du Monorepo
* 📘 **[README.md à la racine](../README.md)** : Guide de démarrage rapide et instructions de déploiement (Vercel & Railway).
* 📕 **[CLAUDE.md à la racine](../CLAUDE.md)** : Directives pour agents IA, standards de développement et commandes utiles.
* 💻 **[apps/web/README.md](../apps/web/README.md)** : Documentation du frontend SaaS Client Next.js.
* 🛡️ **[apps/admin-web/README.md](../apps/admin-web/README.md)** : Documentation de la console Super-Admin Next.js.
