/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Charte graphique et spécifications UI/UX Master (Concept 3 — Black Luxury)
 * @created 2026-06-25
 * @updated 2026-06-25
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
──────────────────────────────────

# Wilinwi — Master Design System (Concept 3 — Black Luxury)

Ce document définit les standards visuels, comportementaux et techniques pour l'interface de **Wilinwi Enterprise** selon le concept **Black Luxury**. Un design d'excellence, très haut de gamme, mariant la modernité des SaaS occidentaux aux racines et symboles africains.

---

## 🎨 Palette de Couleurs & Variables CSS

Le design system repose sur des variables sémantiques adaptatives pour le mode clair et le mode sombre, avec une prédominance ultra-premium du mode sombre.

### ☀️ Mode Clair (Défaut)
* **Arrière-plan principal** : `#f8fafc` (`--background`) — Un gris-bleu très doux et aéré.
* **Surface des cartes/contenants** : `#ffffff` (`--surface`) — Blanc pur.
* **Survol des surfaces** : `#f1f5f9` (`--surface-hover`)
* **Bordures** : `#e5e7eb` (`--border`) — Lignes grises fines et discrètes.
* **Couleurs thématiques** :
  - **Primaire (Or Commerce)** : `#C79A2B` (`--color-primary`) / Hover : `#b58921` (`--color-primary-hover`)
  - **Secondaire (Bleu Profond)** : `#2563EB` (`--color-secondary`)
  - **Success (Vert Prospérité)** : `#00a86b` (`--color-success`)
  - **Warning (Orange Gold)** : `#f59e0b` (`--color-warning`)
  - **Danger** : `#ef4444` (`--color-danger`)
  - **Info** : `#3b82f6` (`--color-info`)
* **Textes** :
  - **Principal** : `#0b0b0c` (`--text-primary`) — Noir mat.
  - **Secondaire** : `#4b5563` (`--text-secondary`) — Gris foncé texturé.

### 🌙 Mode Sombre Enterprise (Black Luxury — Recommandé)
* **Arrière-plan principal** : `#0B0B0C` (`--background`) — Noir pur et absolu de luxe.
* **Surface** : `rgba(22, 22, 24, 0.7)` (`--surface`) — Effet de verre dépoli avec un léger flou de fond (`backdrop-blur`).
* **Survol** : `rgba(34, 34, 37, 0.8)` (`--surface-hover`)
* **Bordures** : `rgba(255, 255, 255, 0.08)` (`--border`) — Bordures translucides ultra-fines.
* **Couleurs thématiques** :
  - **Primaire (Or Commerce)** : `#C79A2B` (`--color-primary`) / Hover : `#b58921` (`--color-primary-hover`)
  - **Secondaire (Bleu Profond)** : `#2563EB` (`--color-secondary`)
  - **Success (Vert Prospérité)** : `#10b981` (`--color-success`)
  - **Warning (Orange Gold)** : `#fbbf24` (`--color-warning`)
  - **Danger** : `#f87171` (`--color-danger`)
  - **Info (Bleu Accent)** : `#60a5fa` (`--color-info`)
  - **Wilinwi AI** : `#8B5CF6` (Violet réservé aux fonctionnalités d'IA)
* **Textes** :
  - **Principal** : `#FFFFFF` (`--text-primary`) — Blanc pur contrasté.
  - **Secondaire** : `#9CA3AF` (`--text-secondary`) — Gris moyen.

---

## 🧬 ADN Visuel (Black Luxury)

* **Coins arrondis** : Tous les composants utilisent un rayon de **12px** (`--radius: 0.75rem`), apportant douceur et modernité haut de gamme.
* **Ombres** : Micro-ombres ultra-douces et diffuses, réduisant la fatigue visuelle et ajoutant de la profondeur.
* **Effet de Verre (Glassmorphism)** : Les conteneurs du dashboard sombre possèdent un effet de flou d'arrière-plan (`backdrop-blur-md bg-surface/70`) évoquant des plaques de verre fumé de luxe.
* **Motifs culturels** : Motifs africains géométriques et symboles Adinkra subtilement intégrés en filigrane à **2% d'opacité** sur les pages d'accueil et les espaces vides.
* **Animations** : Transitions et micro-interactions ultra-fluides cadencées entre **150ms et 200ms**.

---

## 📦 Spécifications des Composants Core

### 1. Boutons (`Button`)
* **Radius** : `rounded-xl` (12px) pour correspondre au concept.
* **Variantes** :
  - `primary` : Fond Or (`bg-primary`), texte blanc ou noir mat, hover doré plus sombre, ombre de focus dorée.
  - `outline` : Bordure `--border`, fond `--surface`, texte `--text-primary`, hover `--surface-hover`.
  - `ghost` : Hover transparent à 10%.
  - `danger` / `emerald` / `gold` : Fonds thématiques correspondants à la palette sémantique.

### 2. Cartes (`Card`)
* **Structure** : `rounded-xl border border-border bg-surface p-5 shadow-sm transition-all duration-200 hover:shadow-md backdrop-blur-md`.

### 3. Badges (`Badge`)
* **Style** : Coins `rounded-xl` (12px), fond coloré ultra-léger (5% d'opacité) et bordure assortie à 10% d'opacité (ex: `bg-success/5 text-success border-success/10`).

### 4. Saisie (`Input` & `Select`)
* **Dimensions** : Hauteur calée sur `h-10` avec des coins `rounded-xl` (12px).
* **Interactions** : Bordure par défaut `--border`, focus ring dorée subtile (`focus:ring-2 focus:ring-primary/20`) lors du focus.
