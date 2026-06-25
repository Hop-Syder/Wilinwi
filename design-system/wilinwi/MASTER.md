# Design System — Wilinwi Master File

> **LOGIQUE :** Lors de la construction d'une page spécifique, vérifiez d'abord `design-system/pages/[page-name].md`.
> Si ce fichier existe, ses règles **remplacent** ce fichier Master.
> Sinon, suivez strictement les règles ci-dessous.

---

**Projet :** Wilinwi
**Mise à jour :** 2026-06-25
**Auteur :** @hopsyder | Nexus Partners

---

## 🎨 Palette de Couleurs

### 🔵 Palette Principale

| Rôle | Hex | CSS Variable | Utilisation |
|------|-----|--------------|-------------|
| **Bleu Wilinwi** | `#12355B` | `--color-primary` | Logo principal, Menus, Boutons principaux, Dashboard |
| **Vert Croissance** | `#00A86B` | `--color-emerald` | Validation, Gains, Bénéfices, KPI positifs |
| **Orange Commerce** | `#F59E0B` | `--color-gold` | CTA, Promotions, Notifications importantes |
| **Blanc** | `#FFFFFF` | `--color-white` | Texte principal, Fond clair, Contraste |

### 🟢 Palette Secondaire

| Rôle | Hex | CSS Variable | Utilisation |
|------|-----|--------------|-------------|
| **Bleu Clair** | `#3B82F6` | `--color-info` | Information, badges d'état |
| **Vert Clair** | `#22C55E` | `--color-success-light` | États intermédiaires positifs |
| **Gris Clair** | `#F5F7FA` | `--color-bg-light` | Fond de page secondaire |
| **Gris Texte** | `#64748B` | `--color-text-muted` | Textes secondaires, légendes |
| **Noir Profond** | `#0F172A` | `--color-text` | Texte principal, fond sombre |

---

## 📱 Thèmes & Modes

### ☀️ Mode Clair

| Élément | Couleur |
|---------|---------|
| **Fond principal** | `#FFFFFF` |
| **Fond secondaire** | `#F5F7FA` |
| **Texte principal** | `#0F172A` |
| **Texte secondaire** | `#64748B` |
| **Bouton principal** | `#12355B` |
| **Bouton succès** | `#00A86B` |
| **Bouton alerte** | `#F59E0B` |

### 🌙 Mode Sombre

| Élément | Couleur |
|---------|---------|
| **Fond principal** | `#0F172A` |
| **Carte / Card** | `#1E293B` |
| **Texte principal** | `#FFFFFF` |
| **Texte secondaire** | `#CBD5E1` |
| **Bouton principal** | `#12355B` |
| **Succès** | `#00A86B` |
| **Alerte** | `#F59E0B` |

---

## ✍️ Typographie

- **Titres (Headings) :** `Poppins` (Poids : `700`, `600`)
- **Interface (UI) :** `Inter` (Poids : `400`, `500`, `600`)
- **Données (Data) :** `DM Mono` (Utilisé pour : *Prix*, *Stocks*, *Quantités*, *Références*. Exemple : `25 000 FCFA`, `SKU-002541`)

---

## 🖼️ Style Visuel

### 🔍 Icônes
- **Style :** Outline moderne, épaisseur uniforme, coins légèrement arrondis.
- **Bibliothèque :** Lucide Icons, Heroicons.
- ❌ **Interdiction :** Utiliser des emojis comme icônes d'interface.

### 🎨 Illustrations
- **Style :** Flat Design, moderne, professionnel, inspiré du commerce africain.
- ❌ **À éviter :** Cartoon, effets de relief ou d'ombres excessifs, personnages trop enfantins.

### 📊 Couleurs KPI
- **Succès (Success) :** `#00A86B`
- **Information (Info) :** `#3B82F6`
- **Attention (Warning) :** `#F59E0B`
- **Erreur (Error) :** `#EF4444`

### 💎 Gradient Officiel
- **Pour landing page & marketing :** `linear-gradient(135deg, #12355B 0%, #00A86B 50%, #F59E0B 100%)` (🔵 → 🟢 → 🟠)

---

## 🏷️ Logo

- **Version Principale (Fond clair) :** Logo couleur + Texte bleu `#12355B`
- **Version Sombre (Fond sombre) :** Logo couleur + Texte blanc `#FFFFFF`
- **Version Monochrome (Noir / Blanc) :** Pour impression (ex: reçu thermique).
