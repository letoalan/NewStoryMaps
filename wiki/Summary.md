# Table des Matières Exhaustive du Projet

Ce document répertorie chaque fichier du projet StoryMap (conservé et nouvellement créé), son rôle, son nombre de lignes et le lien vers sa documentation wiki associée.

## 1. Code Source React & TypeScript (`src/`)

| Fichier | Lignes | Rôle | Documentation |
| :--- | :---: | :--- | :--- |
| [`src/main.tsx`](file:///src/main.tsx) | 17 | Point d'entrée ReactDOM | [Documentation](file:///wiki/components/App.md) |
| [`src/App.tsx`](file:///src/App.tsx) | 68 | Racine, routage modes 1/2/3 | [Documentation](file:///wiki/components/App.md) |
| [`src/types/story.ts`](file:///src/types/story.ts) | 88 | Modèle de données StoryMap | [Documentation](file:///wiki/types/story-types.md) |
| [`src/types/project.ts`](file:///src/types/project.ts) | 115 | Modèle unifié (Project, Page, Block) | [Documentation](file:///wiki/types/project-types.md) |
| [`src/types/grid.ts`](file:///src/types/grid.ts) | 35 | Types grille orthogonale (G01/G02) | [Documentation](file:///wiki/core/grid.md) |
| [`src/types/context.ts`](file:///src/types/context.ts) | 33 | Types du contexte global | [Documentation](file:///wiki/context/story-context.md) |
| [`src/types/step.ts`](file:///src/types/step.ts) | 51 | Modèle d'étape et caméra | [Documentation](file:///wiki/types/step-types.md) |
| [`src/types/sheet.ts`](file:///src/types/sheet.ts) | 22 | Types du mode tableur | [Documentation](file:///wiki/editor/sheet-view.md) |
| [`src/types/map.ts`](file:///src/types/map.ts) | 36 | Styles cartographiques | [Documentation](file:///wiki/types/map-types.md) |
| [`src/core/grid.ts`](file:///src/core/grid.ts) | 124 | Moteur géométrique de grille | [Documentation](file:///wiki/core/grid.md) |
| [`src/core/mapScene.ts`](file:///src/core/mapScene.ts) | 150 | Moteur de scènes & liaisons narratives (P3) | [Documentation](file:///wiki/core/map-scene.md) |
| [`src/core/db.ts`](file:///src/core/db.ts) | 187 | Persistance IndexedDB sécurisée | [Documentation](file:///wiki/core/db.md) |
| [`src/core/defaults.ts`](file:///src/core/defaults.ts) | 49 | Fabriques de données par défaut | [Documentation](file:///wiki/core/defaults.md) |
| [`src/core/io.ts`](file:///src/core/io.ts) | 179 | Import/export JSON, ZIP et réintégration | [Documentation](file:///wiki/core/io.md) |
| [`src/core/zip.ts`](file:///src/core/zip.ts) | 178 | Moteur natif d'archives ZIP | [Documentation](file:///wiki/core/zip.md) |
| [`src/core/adapter.ts`](file:///src/core/adapter.ts) | 190 | Pont de compatibilité v1/v2/React | [Documentation](file:///wiki/core/adapter.md) |
| [`src/core/sanitize.ts`](file:///src/core/sanitize.ts) | 64 | Assainissement HTML sécurisé | [Documentation](file:///wiki/core/sanitize.md) |
| [`src/core/publish.ts`](file:///src/core/publish.ts) | 161 | Générateur HTML autonome sécurisé | [Documentation](file:///wiki/core/publish.md) |
| [`src/core/geocoder.ts`](file:///src/core/geocoder.ts) | 38 | Recherche d'adresses Nominatim | [Documentation](file:///wiki/core/geocoder.md) |
| [`src/core/exif.ts`](file:///src/core/exif.ts) | 95 | Extraction GPS EXIF JPEG | [Documentation](file:///wiki/core/exif.md) |
| [`src/core/route.ts`](file:///src/core/route.ts) | 140 | Tracé multi-styles & courbes géodésiques | [Documentation](file:///wiki/core/route.md) |
| [`src/data/exampleStory.ts`](file:///src/data/exampleStory.ts) | 143 | Récit de démonstration | [Documentation](file:///wiki/data/example-story.md) |
| [`src/context/StoryContext.tsx`](file:///src/context/StoryContext.tsx) | 193 | État, révisions & persistance | [Documentation](file:///wiki/context/story-context.md) |
| [`src/context/stepOperations.ts`](file:///src/context/stepOperations.ts) | 40 | Mutations pures d'étapes | [Documentation](file:///wiki/context/story-context.md) |
| [`src/context/useStoryShortcuts.ts`](file:///src/context/useStoryShortcuts.ts) | 41 | Raccourcis clavier & avertissement | [Documentation](file:///wiki/context/story-context.md) |
| [`src/components/common/Header.tsx`](file:///src/components/common/Header.tsx) | 70 | En-tête avec lien historique | [Documentation](file:///wiki/components/Header.md) |
| [`src/components/common/markerElement.ts`](file:///src/components/common/markerElement.ts) | 88 | Marqueurs SVG (pin/avion/navire/numéro) | [Documentation](file:///wiki/dialogs/settings-modal.md) |
| [`src/components/dashboard/Dashboard.tsx`](file:///src/components/dashboard/Dashboard.tsx) | 181 | Tableau de bord avec query param mode | [Documentation](file:///wiki/components/Dashboard.md) |
| [`src/components/dashboard/StoryCard.tsx`](file:///src/components/dashboard/StoryCard.tsx) | 86 | Carte de récit avec badges de mode | [Documentation](file:///wiki/components/StoryCard.md) |
| [`src/components/document/DocumentEditor.tsx`](file:///src/components/document/DocumentEditor.tsx) | 119 | Atelier documentaire modes 2 & 3 | [Documentation](file:///wiki/components/DocumentEditor.md) |
| [`src/components/document/PageGrid.tsx`](file:///src/components/document/PageGrid.tsx) | 194 | Grille interactive & menus de blocs | [Documentation](file:///wiki/components/PageGrid.md) |
| [`src/components/document/BlockContextMenu.tsx`](file:///src/components/document/BlockContextMenu.tsx) | 140 | Barre d'actions & bouton lier à carte | [Documentation](file:///wiki/components/PageGrid.md) |
| [`src/components/document/BlockRenderer.tsx`](file:///src/components/document/BlockRenderer.tsx) | 26 | Aiguilleur modulaire de rendu | [Documentation](file:///wiki/components/PageGrid.md) |
| [`src/components/document/EmptyCellMenu.tsx`](file:///src/components/document/EmptyCellMenu.tsx) | 87 | Menu d'insertion rapide (+ central) | [Documentation](file:///wiki/components/PageGrid.md) |
| [`src/components/document/blocks/TextBlock.tsx`](file:///src/components/document/blocks/TextBlock.tsx) | 107 | Blocs texte, titre, encadré, source | [Documentation](file:///wiki/components/PageGrid.md) |
| [`src/components/document/blocks/MediaBlock.tsx`](file:///src/components/document/blocks/MediaBlock.tsx) | 108 | Blocs image et galerie/carrousel | [Documentation](file:///wiki/components/PageGrid.md) |
| [`src/components/document/blocks/TableBlock.tsx`](file:///src/components/document/blocks/TableBlock.tsx) | 118 | Bloc tableur/tableau éditable | [Documentation](file:///wiki/components/PageGrid.md) |
| [`src/components/document/blocks/MapBlockPreview.tsx`](file:///src/components/document/blocks/MapBlockPreview.tsx) | 57 | Bloc carte avec liaison narrative | [Documentation](file:///wiki/components/PageGrid.md) |
| [`src/components/editor/Editor.tsx`](file:///src/components/editor/Editor.tsx) | 100 | Agencement de l'éditeur mode 1 | [Documentation](file:///wiki/components/Editor.md) |
| [`src/components/editor/TopBar.tsx`](file:///src/components/editor/TopBar.tsx) | 146 | Barre supérieure d'édition | [Documentation](file:///wiki/components/TopBar.md) |
| [`src/components/editor/Outline.tsx`](file:///src/components/editor/Outline.tsx) | 85 | Plan et liste des étapes | [Documentation](file:///wiki/components/Outline.md) |
| [`src/components/editor/Canvas.tsx`](file:///src/components/editor/Canvas.tsx) | 160 | Carte interactive MapLibre | [Documentation](file:///wiki/components/Canvas.md) |
| [`src/components/editor/GeocoderSearch.tsx`](file:///src/components/editor/GeocoderSearch.tsx) | 65 | Recherche de lieux Nominatim | [Documentation](file:///wiki/editor/geocoder-search.md) |
| [`src/components/editor/Inspector.tsx`](file:///src/components/editor/Inspector.tsx) | 175 | Inspecteur de propriétés | [Documentation](file:///wiki/components/Inspector.md) |
| [`src/components/editor/SheetView.tsx`](file:///src/components/editor/SheetView.tsx) | 170 | Mode Tableur d'étapes | [Documentation](file:///wiki/editor/sheet-view.md) |
| [`src/components/editor/RichTextToolbar.tsx`](file:///src/components/editor/RichTextToolbar.tsx) | 60 | Formatage de texte rapide | [Documentation](file:///wiki/editor/richtext-toolbar.md) |
| [`src/components/dialogs/StylePickerModal.tsx`](file:///src/components/dialogs/StylePickerModal.tsx) | 100 | Sélecteur de fonds de carte | [Documentation](file:///wiki/dialogs/dialogs-overview.md) |
| [`src/components/dialogs/ShareModal.tsx`](file:///src/components/dialogs/ShareModal.tsx) | 107 | Partage & Exports v2/modernes | [Documentation](file:///wiki/dialogs/dialogs-overview.md) |
| [`src/components/dialogs/NewStoryModal.tsx`](file:///src/components/dialogs/NewStoryModal.tsx) | 164 | Modale 3 modes, charte et format | [Documentation](file:///wiki/dialogs/dialogs-overview.md) |
| [`src/components/dialogs/SettingsModal.tsx`](file:///src/components/dialogs/SettingsModal.tsx) | 185 | Paramètres & Thème du récit | [Documentation](file:///wiki/dialogs/settings-modal.md) |
| [`src/components/dialogs/MapStudioModal.tsx`](file:///src/components/dialogs/MapStudioModal.tsx) | 155 | Atelier Carte & Scènes (P3) | [Documentation](file:///wiki/dialogs/map-studio.md) |
| [`src/components/dialogs/BindingPickerModal.tsx`](file:///src/components/dialogs/BindingPickerModal.tsx) | 125 | Sélecteur d'association narrative (P3) | [Documentation](file:///wiki/dialogs/binding-picker.md) |
| [`src/components/player/Player.tsx`](file:///src/components/player/Player.tsx) | 160 | Lecteur immersif plein écran | [Documentation](file:///wiki/components/Player.md) |
| [`src/components/player/PlayerNarrative.tsx`](file:///src/components/player/PlayerNarrative.tsx) | 85 | Panneau narratif sécurisé | [Documentation](file:///wiki/player/player-narrative.md) |

---

## 2. Configuration & Structure du Projet

| Fichier | Lignes | Rôle |
| :--- | :---: | :--- |
| [`package.json`](file:///package.json) | 28 | Dépendances & scripts de test (`test:p0`, `test:p1`, `test:p2`, `test:p3`) |
| [`tsconfig.json`](file:///tsconfig.json) | 24 | Configuration TypeScript strict |
| [`vite.config.ts`](file:///vite.config.ts) | 16 | Configuration du bundler Vite (`base: './'`) |
| [`index.html`](file:///index.html) | 16 | Page HTML d'amorce React |
