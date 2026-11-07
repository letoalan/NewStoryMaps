# Table des Matières Exhaustive du Projet

Ce document répertorie chaque fichier du projet StoryMap (conservé et nouvellement créé), son rôle, son nombre de lignes et le lien vers sa documentation wiki associée.

## 1. Code Source React & TypeScript (`src/`)

| Fichier | Lignes | Rôle | Documentation |
| :--- | :---: | :--- | :--- |
| [`src/main.tsx`](file:///src/main.tsx) | 17 | Point d'entrée ReactDOM | [Documentation](file:///wiki/components/App.md) |
| [`src/App.tsx`](file:///src/App.tsx) | 51 | Composant racine et routage | [Documentation](file:///wiki/components/App.md) |
| [`src/types/story.ts`](file:///src/types/story.ts) | 47 | Modèle de données StoryMap | [Documentation](file:///wiki/types/story-types.md) |
| [`src/types/step.ts`](file:///src/types/step.ts) | 41 | Modèle d'étape et caméra | [Documentation](file:///wiki/types/step-types.md) |
| [`src/types/sheet.ts`](file:///src/types/sheet.ts) | 22 | Types du mode tableur | [Documentation](file:///wiki/editor/sheet-view.md) |
| [`src/types/map.ts`](file:///src/types/map.ts) | 36 | Styles cartographiques | [Documentation](file:///wiki/types/map-types.md) |
| [`src/core/db.ts`](file:///src/core/db.ts) | 80 | Persistance IndexedDB | [Documentation](file:///wiki/core/db.md) |
| [`src/core/defaults.ts`](file:///src/core/defaults.ts) | 49 | Fabriques de données | [Documentation](file:///wiki/core/defaults.md) |
| [`src/core/io.ts`](file:///src/core/io.ts) | 55 | Import et export JSON/HTML/Blob | [Documentation](file:///wiki/core/io.md) |
| [`src/core/adapter.ts`](file:///src/core/adapter.ts) | 160 | Pont de compatibilité v1/v2/React | [Documentation](file:///wiki/core/adapter.md) |
| [`src/core/sanitize.ts`](file:///src/core/sanitize.ts) | 65 | Assainissement HTML sécurisé | [Documentation](file:///wiki/core/sanitize.md) |
| [`src/core/publish.ts`](file:///src/core/publish.ts) | 170 | Générateur HTML autonome | [Documentation](file:///wiki/core/publish.md) |
| [`src/core/geocoder.ts`](file:///src/core/geocoder.ts) | 38 | Recherche d'adresses Nominatim | [Documentation](file:///wiki/core/geocoder.md) |
| [`src/core/exif.ts`](file:///src/core/exif.ts) | 95 | Extraction GPS EXIF JPEG | [Documentation](file:///wiki/core/exif.md) |
| [`src/core/route.ts`](file:///src/core/route.ts) | 35 | Tracé GeoJSON des étapes | [Documentation](file:///wiki/core/route.md) |
| [`src/data/exampleStory.ts`](file:///src/data/exampleStory.ts) | 143 | Récit de démonstration | [Documentation](file:///wiki/data/example-story.md) |
| [`src/context/StoryContext.tsx`](file:///src/context/StoryContext.tsx) | 193 | État, Undo/Redo & Sauvegarde | [Documentation](file:///wiki/context/story-context.md) |
| [`src/components/common/Header.tsx`](file:///src/components/common/Header.tsx) | 70 | En-tête avec lien historique | [Documentation](file:///wiki/components/Header.md) |
| [`src/components/dashboard/Dashboard.tsx`](file:///src/components/dashboard/Dashboard.tsx) | 165 | Tableau de bord des récits | [Documentation](file:///wiki/components/Dashboard.md) |
| [`src/components/dashboard/StoryCard.tsx`](file:///src/components/dashboard/StoryCard.tsx) | 73 | Carte individuelle de récit | [Documentation](file:///wiki/components/StoryCard.md) |
| [`src/components/editor/Editor.tsx`](file:///src/components/editor/Editor.tsx) | 100 | Agencement de l'éditeur | [Documentation](file:///wiki/components/Editor.md) |
| [`src/components/editor/TopBar.tsx`](file:///src/components/editor/TopBar.tsx) | 146 | Barre supérieure d'édition | [Documentation](file:///wiki/components/TopBar.md) |
| [`src/components/editor/Outline.tsx`](file:///src/components/editor/Outline.tsx) | 85 | Plan et liste des étapes | [Documentation](file:///wiki/components/Outline.md) |
| [`src/components/editor/Canvas.tsx`](file:///src/components/editor/Canvas.tsx) | 170 | Carte interactive MapLibre | [Documentation](file:///wiki/components/Canvas.md) |
| [`src/components/editor/GeocoderSearch.tsx`](file:///src/components/editor/GeocoderSearch.tsx) | 65 | Recherche de lieux Nominatim | [Documentation](file:///wiki/editor/geocoder-search.md) |
| [`src/components/editor/Inspector.tsx`](file:///src/components/editor/Inspector.tsx) | 175 | Inspecteur de propriétés | [Documentation](file:///wiki/components/Inspector.md) |
| [`src/components/editor/SheetView.tsx`](file:///src/components/editor/SheetView.tsx) | 170 | Mode Tableur d'étapes | [Documentation](file:///wiki/editor/sheet-view.md) |
| [`src/components/editor/RichTextToolbar.tsx`](file:///src/components/editor/RichTextToolbar.tsx) | 60 | Formatage de texte rapide | [Documentation](file:///wiki/editor/richtext-toolbar.md) |
| [`src/components/dialogs/StylePickerModal.tsx`](file:///src/components/dialogs/StylePickerModal.tsx) | 100 | Sélecteur de fonds de carte | [Documentation](file:///wiki/dialogs/dialogs-overview.md) |
| [`src/components/dialogs/ShareModal.tsx`](file:///src/components/dialogs/ShareModal.tsx) | 107 | Partage & Exports v2/modernes | [Documentation](file:///wiki/dialogs/dialogs-overview.md) |
| [`src/components/dialogs/NewStoryModal.tsx`](file:///src/components/dialogs/NewStoryModal.tsx) | 115 | Création de récit & modèles | [Documentation](file:///wiki/dialogs/dialogs-overview.md) |
| [`src/components/dialogs/SettingsModal.tsx`](file:///src/components/dialogs/SettingsModal.tsx) | 125 | Paramètres & Thème du récit | [Documentation](file:///wiki/dialogs/settings-modal.md) |
| [`src/components/player/Player.tsx`](file:///src/components/player/Player.tsx) | 150 | Lecteur immersif plein écran | [Documentation](file:///wiki/components/Player.md) |
| [`src/components/player/PlayerNarrative.tsx`](file:///src/components/player/PlayerNarrative.tsx) | 85 | Panneau narratif sécurisé | [Documentation](file:///wiki/player/player-narrative.md) |

---

## 2. Configuration & Structure du Projet

| Fichier | Lignes | Rôle |
| :--- | :---: | :--- |
| [`package.json`](file:///package.json) | 23 | Dépendances (React, MapLibre, Lucide, Vite) |
| [`tsconfig.json`](file:///tsconfig.json) | 24 | Configuration TypeScript strict |
| [`vite.config.ts`](file:///vite.config.ts) | 16 | Configuration du bundler Vite |
| [`index.html`](file:///index.html) | 16 | Page HTML d'amorce React |

---

## 3. Feuilles de Style CSS Modulaires (`public/css/`)

Toutes les feuilles CSS sont découpées en sous-fichiers de 30 à 180 lignes :
- `public/css/app/` (10 modules, tous $\le$ 163 lignes)
- `public/css/dashboard/` (5 modules, tous $\le$ 181 lignes)
- `public/css/editor/` (8 modules, tous $\le$ 178 lignes)
- `public/css/sheet/` (5 modules, tous $\le$ 154 lignes)
- `public/css/landing/` (5 modules, tous $\le$ 130 lignes)
- `public/css/frame/` (2 modules, tous $\le$ 152 lignes)

Pour le détail des styles, consultez le [Guide des Styles](file:///wiki/styles/styles-overview.md).

