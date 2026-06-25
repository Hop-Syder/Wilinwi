/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Charte graphique et spécifications UI/UX Master (Vibrant Modern Palette)
 * @created 2026-06-25
 * @updated 2026-06-26
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
──────────────────────────────────

# Wilinwi — Master Design System (Spécifications Actuelles)

Ce document définit les standards visuels, comportementaux et techniques pour l'interface de **Wilinwi**, intégrant notre charte de couleurs moderne, vibrante et hautement accessible.

---

## 🎨 Palette de Couleurs & Variables CSS

Le design system utilise des variables sémantiques dynamiques pour garantir une cohérence visuelle parfaite entre les modes clair et sombre.

### ☀️ Mode Clair (Défaut)
* **Arrière-plan principal** : `#F5F8FC` (`--background`) — Un gris-bleu très doux, frais et moderne.
* **Surface des cartes/contenants** : `#FFFFFF` (`--surface`) — Blanc pur.
* **Survol des surfaces** : `#eef2f8` (`--surface-hover`)
* **Bordures** : `#e2e8f0` (`--border`) — Lignes fines et épurées.
* **Couleurs thématiques** :
  - **Primary (Bleu Royal)** : `#006DFF` (`--color-primary`) / Hover : `#0056c7` (`--color-primary-hover`)
  - **Secondary (Vert Vibrant)** : `#00C389` (`--color-secondary`)
  - **Success (Vert)** : `#00C389` (`--color-success`)
  - **Warning (Orange Accent)** : `#FF8A00` (`--color-warning`)
  - **Danger** : `#ef4444` (`--color-danger`)
  - **Info** : `#006DFF` (`--color-info`)
  - **Purple AI** : `#7C3AED` (`--color-ai`) — Violet exclusif aux fonctionnalités IA.
* **Textes** :
  - **Principal** : `#0B132B` (`--text-primary`) — Bleu nuit ultra-sombre pour un contraste parfait.
  - **Secondaire** : `#475569` (`--text-secondary`)

### 🌙 Mode Sombre (Classe `.dark`)
* **Arrière-plan principal** : `#0B132B` (`--background`) — Bleu nuit profond et prestigieux.
* **Surface** : `rgba(22, 29, 49, 0.7)` (`--surface`) — Verre fumé avec flou d'arrière-plan.
* **Survol** : `rgba(34, 45, 75, 0.8)` (`--surface-hover`)
* **Bordures** : `rgba(255, 255, 255, 0.08)` (`--border`)
* **Couleurs thématiques** :
  - **Primary (Bleu Royal)** : `#006DFF` (`--color-primary`)
  - **Secondary (Vert Vibrant)** : `#00C389` (`--color-secondary`)
  - **Success** : `#00C389` (`--color-success`)
  - **Warning** : `#FF8A00` (`--color-warning`)
  - **Danger** : `#f87171` (`--color-danger`)
  - **Info** : `#60a5fa` (`--color-info`)
  - **Purple AI** : `#9061f9` (`--color-ai`)
* **Textes** :
  - **Principal** : `#F5F8FC` (`--text-primary`)
  - **Secondaire** : `#94a3b8` (`--text-secondary`)

---

## 🧬 ADN Visuel

* **Coins arrondis** : Coins à **12px** (`--radius: 0.75rem`) sur tous les composants pour un rendu premium et consistant.
* **Ombres** : Micro-ombres douces inspirées de Stripe (`shadow-sm` / `shadow-md`).
* **Animations** : Interactions réactives et fluides cadencées de **150ms à 200ms**.

---

## 📦 Spécifications des Composants Core

### 1. Boutons (`Button`)
* **Radius** : `rounded-xl` (12px).
* **Variantes** :
  - `primary` : Fond Bleu Royal (`bg-primary`), texte blanc, hover bleu foncé, ombre de focus bleue.
  - `outline` : Bordure `--border`, fond `--surface`, texte `--text-primary`, hover `--surface-hover`.
  - `ghost` : Hover transparent léger.
  - `danger` / `emerald` / `gold` : Fonds thématiques correspondants à la palette sémantique.

### 2. Cartes (`Card`)
* **Structure** : `rounded-xl border border-border bg-surface p-5 shadow-sm transition-all duration-200 hover:shadow-md`.

### 3. Badges (`Badge`)
* **Style** : Coins `rounded-xl` (12px), fond coloré à 5% d'opacité et bordure à 10% d'opacité.

### 4. Saisie (`Input` & `Select`)
* **Dimensions** : Hauteur calée sur `h-10` avec des coins `rounded-xl` (12px).
* **Interactions** : Bordure par défaut `--border`, focus ring bleu subtil (`focus:ring-2 focus:ring-primary/20`) lors du focus.
