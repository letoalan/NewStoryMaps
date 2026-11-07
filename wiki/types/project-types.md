# Modèle de Données Unifié des 3 Modes (`src/types/project.ts`)

Le module [`src/types/project.ts`](file:///src/types/project.ts) formalise l'architecture unifiée des trois modes de publication prévus par la spécification `impl2.md`.

## 1. Les Trois Modes (`ProjectMode`)

1. **`storymap` (Mode 1)** : récit interactif guidé classique étape par étape, synchronisé avec la carte MapLibre, mode tableur et export autonome.
2. **`rich-document` (Mode 2)** : document enrichi multipages découpé en grilles de blocs rectangulaires, cartes interactives associées et présentation.
3. **`brochure` (Mode 3)** : brochure statique A4 (portrait/paysage) destinée à l'impression et à l'exportation PDF haute fidélité.

## 2. Entités Principales

- **`UnifiedProject`** : enveloppe racine versionnée (`2.0.0`) intégrant métadonnées, charte graphique (`brand`), données StoryMap ou pages documentaires.
- **`ProjectBrand`** : charte visuelle facultative personnalisable :
  - `logo` : URL du logo ou marqueur visuel
  - `primaryFont` & `secondaryFont` : typographies
  - `colors: [string, string, string]` : palette de 3 couleurs (primaire, secondaire, accent).
- **`Page` & `PageLayout`** : découpage en pages physiques ou écrans (formats A4, 16/9, responsive).
- **`Block` & `BlockType`** : cellules et blocs rectangulaires (`title`, `text`, `image`, `map`, `legend`, `table`, etc.).
- **`NarrativeBinding`** : liaison réversible entre un objet/couche cartographique et un bloc narratif.

