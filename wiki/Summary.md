# Table des Matières Exhaustive du Projet

Ce document répertorie chaque fichier du projet StoryMap (conservé et nouvellement créé), son rôle, son nombre de lignes et le lien vers sa documentation wiki associée.

## 1. Code Source React & TypeScript (`src/`)

| Fichier | Lignes | Rôle | Documentation |
| :--- | :---: | :--- | :--- |
| [`src/main.tsx`](file:///src/main.tsx) | 17 | Point d'entrée ReactDOM | [Documentation](file:///wiki/components/App.md) |
| [`src/App.tsx`](file:///src/App.tsx) | 68 | Racine, routage modes 1/2/3 | [Documentation](file:///wiki/components/App.md) |
| [`src/types/story.ts`](file:///src/types/story.ts) | 88 | Modèle de données StoryMap | [Documentation](file:///wiki/types/story-types.md) |
| [`src/types/project.ts`](file:///src/types/project.ts) | 115 | Modèle unifié (Project, Page, Block) | [Documentation](file:///wiki/types/project-types.md) |
| [`src/types/grid.ts`](file:///src/types/grid.ts) | 39 | Types grille orthogonale & ratios physiques (V07) | [Documentation](file:///wiki/core/grid.md) |
| [`src/types/context.ts`](file:///src/types/context.ts) | 33 | Types du contexte global | [Documentation](file:///wiki/context/story-context.md) |
| [`src/types/step.ts`](file:///src/types/step.ts) | 51 | Modèle d'étape et caméra | [Documentation](file:///wiki/types/step-types.md) |
| [`src/types/sheet.ts`](file:///src/types/sheet.ts) | 22 | Types du mode tableur | [Documentation](file:///wiki/editor/sheet-view.md) |
| [`src/types/map.ts`](file:///src/types/map.ts) | 36 | Styles cartographiques | [Documentation](file:///wiki/types/map-types.md) |
| [`src/core/grid.ts`](file:///src/core/grid.ts) | 160 | Moteur géométrique de grille & refit sans collision (V06/V07) | [Documentation](file:///wiki/core/grid.md) |
| [`src/core/mapScene.ts`](file:///src/core/mapScene.ts) | 140 | Moteur de scènes & liaisons narratives (P3) | [Documentation](file:///wiki/core/map-scene.md) |
| [`src/core/mapSceneRender.ts`](file:///src/core/mapSceneRender.ts) | 164 | Rendu GeoJSON Point/LineString/Polygon sur MapLibre (V02/V03) | [Documentation](file:///wiki/core/map-scene.md) |
| [`src/core/mapDiagnostics.ts`](file:///src/core/mapDiagnostics.ts) | 62 | Diagnostic de cycle de vie WebGL & MapLibre | [Documentation](file:///wiki/components/Canvas.md) |
| [`src/core/readerNavigation.ts`](file:///src/core/readerNavigation.ts) | 55 | Arbitrage clavier & navigation documentaire (I01-I04, V05) | [Documentation](file:///wiki/components/DocumentReader.md) |
| [`src/core/brochure.ts`](file:///src/core/brochure.ts) | 176 | Restrictions Mode 3, conversion 2→3 et prévol honnête (P5, V09) | [Documentation](file:///wiki/core/brochure.md) |
| [`src/core/publishBrochure.ts`](file:///src/core/publishBrochure.ts) | 155 | Générateur Brochure A4 imprimable & PDF vectoriel (P5 — J04 à J11) | [Documentation](file:///wiki/core/brochure.md) |
| [`src/core/publishDocumentBlocks.ts`](file:///src/core/publishDocumentBlocks.ts) | 134 | Sérialisation sécurisée des blocs & planches contact (V04/V08) | [Documentation](file:///wiki/core/publish.md) |
| [`src/core/publishDocument.ts`](file:///src/core/publishDocument.ts) | 178 | Générateur HTML autonome documents enrichis MapLibre (P4, V01) | [Documentation](file:///wiki/core/publish.md) |
| [`src/core/db.ts`](file:///src/core/db.ts) | 162 | Persistance IndexedDB sécurisée & migration idempotente | [Documentation](file:///wiki/core/db.md) |
| [`src/core/defaults.ts`](file:///src/core/defaults.ts) | 49 | Fabriques de données par défaut | [Documentation](file:///wiki/core/defaults.md) |
| [`src/core/io.ts`](file:///src/core/io.ts) | 165 | Import/export JSON, HTML, Brochure et archives ZIP | [Documentation](file:///wiki/core/io.md) |
| [`src/core/zip.ts`](file:///src/core/zip.ts) | 157 | Moteur natif d'archives ZIP | [Documentation](file:///wiki/core/zip.md) |
| [`src/core/adapter.ts`](file:///src/core/adapter.ts) | 172 | Pont de compatibilité v1/v2/React | [Documentation](file:///wiki/core/adapter.md) |
| [`src/core/sanitize.ts`](file:///src/core/sanitize.ts) | 92 | Assainissement HTML, échappement d'attributs & URLs sûres (V08) | [Documentation](file:///wiki/core/sanitize.md) |
| [`src/core/publish.ts`](file:///src/core/publish.ts) | 148 | Générateur HTML autonome Mode 1 StoryMap | [Documentation](file:///wiki/core/publish.md) |
| [`src/core/geocoder.ts`](file:///src/core/geocoder.ts) | 38 | Recherche d'adresses Nominatim | [Documentation](file:///wiki/core/geocoder.md) |
| [`src/core/exif.ts`](file:///src/core/exif.ts) | 95 | Extraction GPS EXIF JPEG | [Documentation](file:///wiki/core/exif.md) |
| [`src/core/route.ts`](file:///src/core/route.ts) | 140 | Tracé multi-styles & courbes géodésiques | [Documentation](file:///wiki/core/route.md) |
| [`src/core/mapIcons.ts`](file:///src/core/mapIcons.ts) | 74 | Icônes SVG vectorielles sur tracé MapLibre | [Documentation](file:///wiki/core/route.md) |
| [`src/data/exampleStory.ts`](file:///src/data/exampleStory.ts) | 143 | Récit de démonstration | [Documentation](file:///wiki/data/example-story.md) |
| [`src/context/StoryContext.tsx`](file:///src/context/StoryContext.tsx) | 177 | État, révisions & persistance | [Documentation](file:///wiki/context/story-context.md) |
| [`src/context/stepOperations.ts`](file:///src/context/stepOperations.ts) | 40 | Mutations pures d'étapes | [Documentation](file:///wiki/context/story-context.md) |
| [`src/context/useStoryShortcuts.ts`](file:///src/context/useStoryShortcuts.ts) | 41 | Raccourcis clavier & avertissement | [Documentation](file:///wiki/context/story-context.md) |
| [`src/components/common/Header.tsx`](file:///src/components/common/Header.tsx) | 70 | En-tête avec lien historique | [Documentation](file:///wiki/components/Header.md) |
| [`src/components/common/markerElement.ts`](file:///src/components/common/markerElement.ts) | 88 | Marqueurs SVG (pin/avion/navire/numéro) | [Documentation](file:///wiki/dialogs/settings-modal.md) |
| [`src/components/dashboard/Dashboard.tsx`](file:///src/components/dashboard/Dashboard.tsx) | 166 | Tableau de bord avec query param mode | [Documentation](file:///wiki/components/Dashboard.md) |
| [`src/components/dashboard/StoryCard.tsx`](file:///src/components/dashboard/StoryCard.tsx) | 86 | Carte de récit avec badges de mode | [Documentation](file:///wiki/components/StoryCard.md) |
| [`src/components/document/DocumentEditor.tsx`](file:///src/components/document/DocumentEditor.tsx) | 146 | Atelier documentaire modes 2 & 3 | [Documentation](file:///wiki/components/DocumentEditor.md) |
| [`src/components/document/DocumentReader.tsx`](file:///src/components/document/DocumentReader.tsx) | 172 | Lecteur immersif 3 profils (P4, V05) | [Documentation](file:///wiki/components/DocumentReader.md) |
| [`src/components/document/PageGrid.tsx`](file:///src/components/document/PageGrid.tsx) | 181 | Grille interactive & ratios physiques (V07) | [Documentation](file:///wiki/components/PageGrid.md) |
| [`src/components/document/BlockContextMenu.tsx`](file:///src/components/document/BlockContextMenu.tsx) | 140 | Barre d'actions & bouton lier à carte | [Documentation](file:///wiki/components/PageGrid.md) |
| [`src/components/document/BlockRenderer.tsx`](file:///src/components/document/BlockRenderer.tsx) | 26 | Aiguilleur modulaire de rendu | [Documentation](file:///wiki/components/PageGrid.md) |
| [`src/components/document/EmptyCellMenu.tsx`](file:///src/components/document/EmptyCellMenu.tsx) | 91 | Menu d'insertion rapide (+ central & J01) | [Documentation](file:///wiki/components/PageGrid.md) |
| [`src/components/document/blocks/TextBlock.tsx`](file:///src/components/document/blocks/TextBlock.tsx) | 107 | Blocs texte, titre, encadré, source | [Documentation](file:///wiki/components/PageGrid.md) |
| [`src/components/document/blocks/MediaBlock.tsx`](file:///src/components/document/blocks/MediaBlock.tsx) | 122 | Blocs image, carrousel et planche contact (V04) | [Documentation](file:///wiki/components/PageGrid.md) |
| [`src/components/document/blocks/TableBlock.tsx`](file:///src/components/document/blocks/TableBlock.tsx) | 118 | Bloc tableur/tableau éditable | [Documentation](file:///wiki/components/PageGrid.md) |
| [`src/components/document/blocks/MapBlockPreview.tsx`](file:///src/components/document/blocks/MapBlockPreview.tsx) | 112 | Bloc carte MapLibre GL avec géométries & attributions (V02/V03) | [Documentation](file:///wiki/components/PageGrid.md) |
| [`src/components/editor/Editor.tsx`](file:///src/components/editor/Editor.tsx) | 102 | Agencement de l'éditeur mode 1 | [Documentation](file:///wiki/components/Editor.md) |
| [`src/components/editor/TopBar.tsx`](file:///src/components/editor/TopBar.tsx) | 134 | Barre supérieure d'édition | [Documentation](file:///wiki/components/TopBar.md) |
| [`src/components/editor/Outline.tsx`](file:///src/components/editor/Outline.tsx) | 85 | Plan et liste des étapes | [Documentation](file:///wiki/components/Outline.md) |
| [`src/components/editor/Canvas.tsx`](file:///src/components/editor/Canvas.tsx) | 187 | Carte interactive MapLibre | [Documentation](file:///wiki/components/Canvas.md) |
| [`src/components/editor/GeocoderSearch.tsx`](file:///src/components/editor/GeocoderSearch.tsx) | 65 | Recherche de lieux Nominatim | [Documentation](file:///wiki/editor/geocoder-search.md) |
| [`src/components/editor/Inspector.tsx`](file:///src/components/editor/Inspector.tsx) | 174 | Inspecteur de propriétés | [Documentation](file:///wiki/components/Inspector.md) |
| [`src/components/editor/SheetView.tsx`](file:///src/components/editor/SheetView.tsx) | 168 | Mode Tableur d'étapes | [Documentation](file:///wiki/editor/sheet-view.md) |
| [`src/components/editor/RichTextToolbar.tsx`](file:///src/components/editor/RichTextToolbar.tsx) | 60 | Formatage de texte rapide | [Documentation](file:///wiki/editor/richtext-toolbar.md) |
| [`src/components/dialogs/StylePickerModal.tsx`](file:///src/components/dialogs/StylePickerModal.tsx) | 100 | Sélecteur de fonds de carte | [Documentation](file:///wiki/dialogs/dialogs-overview.md) |
| [`src/components/dialogs/ShareModal.tsx`](file:///src/components/dialogs/ShareModal.tsx) | 107 | Partage & Exports v2/modernes | [Documentation](file:///wiki/dialogs/dialogs-overview.md) |
| [`src/components/dialogs/NewStoryModal.tsx`](file:///src/components/dialogs/NewStoryModal.tsx) | 149 | Modale 3 modes, charte et format | [Documentation](file:///wiki/dialogs/dialogs-overview.md) |
| [`src/components/dialogs/SettingsModal.tsx`](file:///src/components/dialogs/SettingsModal.tsx) | 172 | Paramètres & Thème du récit | [Documentation](file:///wiki/dialogs/settings-modal.md) |
| [`src/components/dialogs/MapStudioModal.tsx`](file:///src/components/dialogs/MapStudioModal.tsx) | 191 | Atelier Carte avec tracé multi-sommets (P3, V02) | [Documentation](file:///wiki/dialogs/map-studio.md) |
| [`src/components/dialogs/BindingPickerModal.tsx`](file:///src/components/dialogs/BindingPickerModal.tsx) | 125 | Sélecteur d'association narrative (P3) | [Documentation](file:///wiki/dialogs/binding-picker.md) |
| [`src/components/dialogs/BrochureModal.tsx`](file:///src/components/dialogs/BrochureModal.tsx) | 142 | Prévol, conversion 2→3 et export Brochure A4 / PDF (P5) | [Documentation](file:///wiki/core/brochure.md) |
| [`src/components/player/Player.tsx`](file:///src/components/player/Player.tsx) | 188 | Lecteur immersif plein écran | [Documentation](file:///wiki/components/Player.md) |
| [`src/components/player/PlayerNarrative.tsx`](file:///src/components/player/PlayerNarrative.tsx) | 85 | Panneau narratif sécurisé | [Documentation](file:///wiki/player/player-narrative.md) |

---

## 2. Configuration & Scripts de Recette (`scripts/`)

| Fichier | Lignes | Rôle |
| :--- | :---: | :--- |
| [`package.json`](file:///package.json) | 30 | Dépendances & scripts de test (`test:p0` à `test:p5`) |
| [`scripts/verify-p0.mjs`](file:///scripts/verify-p0.mjs) | 165 | Recette automatisée P0 (compatibilité, ZIP, sécurité) |
| [`scripts/verify-p1.mjs`](file:///scripts/verify-p1.mjs) | 152 | Recette automatisée P1 (F01 à F09) |
| [`scripts/verify-p2.mjs`](file:///scripts/verify-p2.mjs) | 157 | Recette automatisée P2 (G01 à G10 + V06/V07) |
| [`scripts/verify-p3.mjs`](file:///scripts/verify-p3.mjs) | 149 | Recette automatisée P3 (H01 à H09 + V02/V03) |
| [`scripts/verify-p4.mjs`](file:///scripts/verify-p4.mjs) | 151 | Recette automatisée P4 (I01 à I06 + V01/V04/V05/V08/V10) |
| [`scripts/verify-p5.mjs`](file:///scripts/verify-p5.mjs) | 168 | Recette automatisée P5 (J01 à J11 + V09) |
