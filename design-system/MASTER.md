/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Charte graphique et spécifications UI/UX Master pour le projet Wilinwi
 * @created 2026-06-25
 * @updated 2026-06-25
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
──────────────────────────────────

# Wilinwi — Master Design System

Ce document définit les standards visuels, comportementaux et techniques pour l'interface de **Wilinwi**, le système d'exploitation du commerce africain.

---

## 🎨 Palette de Couleurs (Couleurs Sacrées)

Les couleurs de Wilinwi évoquent la confiance, la croissance et le dynamisme du commerce.

| Rôle | Couleur Hex | Classe Tailwind | Utilisation |
| :--- | :--- | :--- | :--- |
| **Primaire (Bleu Trust)** | `#12355B` | `bg-[#12355B]` / `text-[#12355B]` | En-têtes, boutons principaux, branding fort. |
| **Secondaire (Vert Growth)**| `#00A86B` | `bg-[#00A86B]` / `text-[#00A86B]` | Succès, badges de statut, montants positifs (gains). |
| **Accent (Orange Warning)** | `#F59E0B` | `bg-[#F59E0B]` / `text-[#F59E0B]` | Alertes, actions secondaires, avertissements de stock faible. |
| **Arrière-plan (Sombre/Clair)**| Variable | Variable | Double-thème avec contrastes soignés. |

---

## ✍️ Typographie & Hiérarchie

Pour maximiser la lisibilité et l'impact visuel :

1. **Titres (Headings)** : **Poppins** (Sans-serif géométrique, moderne et accueillant).
2. **Corps de texte (Body)** : **Inter** (Néo-grotesque neutre, optimal pour les interfaces denses).
3. **Chiffres financiers & POS** : **DM Mono** avec la classe CSS `.tabular` (chiffres à largeur fixe) pour éviter les sauts de texte lors des calculs dynamiques.

---

## 📦 Règles de Layout & Composants

### 1. Structure Globale
- **Navbar flottante** : Espacement constant des bords (`top-4 left-4 right-4`).
- **Conteneur POS** : Disposition double-colonne pour l'encaissement et le panier.
- **Grilles responsives** : `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6`.

### 2. Interaction & Micro-animations
- **Transitions** : Utiliser systématiquement `transition-all duration-200 ease-in-out` sur les boutons et cartes.
- **Curseur** : Classe `cursor-pointer` explicite pour tout élément interactif.
- **Feedback visuel** : Changement d'opacité, de couleur de fond ou ajout d'une bordure subtile sur le hover.

---

## 🛡️ Anti-patterns à éviter
- ❌ **Pas d'émojis comme icônes** dans le produit de production (utiliser des SVG exclusifs comme Lucide ou Heroicons).
- ❌ **Pas d'instant-state transitions** sans délai de lissage (animations brusques à proscrire).
- ❌ **Pas de contrastes trop bas en Light Mode** (utiliser au moins `text-slate-900` pour le corps de texte principal).
