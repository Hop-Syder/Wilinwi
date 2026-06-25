/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Charte graphique et spécifications UI/UX Master (Concept 5 — Fintech Next)
 * @created 2026-06-25
 * @updated 2026-06-26
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
──────────────────────────────────

# Wilinwi — Master Design System (Concept 5 — Fintech Next)

Ce document définit les standards visuels, comportementaux et techniques pour l'interface de **Wilinwi**, intégrant notre charte de couleurs inspirée de Stripe, Linear et Flutterwave pour un rendu fintech moderne et ultra-professionnel.

---

## 🎨 Palette de Couleurs & Variables CSS

Le design system utilise des variables sémantiques dynamiques pour garantir une cohérence visuelle parfaite entre les modes clair et sombre.

### ☀️ Mode Clair (Défaut)
* **Arrière-plan principal** : `#F4F7FC` (`--background`) — Un gris-bleu très doux, frais et moderne.
* **Surface des cartes/contenants** : `#FFFFFF` (`--surface`) — Blanc pur.
* **Survol des surfaces** : `#edf1f9` (`--surface-hover`)
* **Bordures** : `#DDE6F3` (`--border`) — Lignes de bordure fines bleutées.
* **Couleurs thématiques** :
  - **Primary (Fintech Blue)** : `#2962FF` (`--color-primary`) / Hover : `#1545d8` (`--color-primary-hover`)
  - **Success (Green)** : `#00C853` (`--color-success`)
  - **Warning (Yellow)** : `#FFB300` (`--color-warning`)
  - **Danger** : `#E53935` (`--color-danger`)
  - **Info** : `#2962FF` (`--color-info`)
  - **Purple AI** : `#6200EA` (`--color-ai`) — Violet exclusif aux fonctionnalités IA.
* **Textes** :
  - **Principal** : `#111827` (`--text-primary`) — Slate-900 pour un contraste optimal.
  - **Secondaire** : `#4b5563` (`--text-secondary`)

### 🌙 Mode Sombre (Classe `.dark`)
* **Arrière-plan principal** : `#0f172a` (`--background`) — Bleu nuit profond.
* **Surface** : `rgba(30, 41, 59, 0.7)` (`--surface`) — Verre fumé avec flou d'arrière-plan.
* **Survol** : `rgba(51, 65, 85, 0.8)` (`--surface-hover`)
* **Bordures** : `rgba(255, 255, 255, 0.08)` (`--border`)
* **Couleurs thématiques** :
  - **Primary (Fintech Blue)** : `#2962FF` (`--color-primary`)
  - **Success** : `#00C853` (`--color-success`)
  - **Warning** : `#FFB300` (`--color-warning`)
  - **Danger** : `#ef5350` (`--color-danger`)
  - **Info** : `#60a5fa` (`--color-info`)
  - **Purple AI** : `#7c4dff` (`--color-ai`)
* **Textes** :
  - **Principal** : `#f8fafc` (`--text-primary`)
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
  - `primary` : Fond Fintech Blue (`bg-primary`), texte blanc, hover bleu foncé, ombre de focus bleue.
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
