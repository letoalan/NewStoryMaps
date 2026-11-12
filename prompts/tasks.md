# Liste des Tâches : Migration StoryMap React & TypeScript

- [x] **Phase 1 : Socle technique React & TypeScript**
  - [x] Initialisation de Vite, TypeScript et configuration du compilateur.
  - [x] Typage du modèle de données (`story.ts`, `step.ts`, `map.ts`).
  - [x] Implémentation du moteur de persistance IndexedDB (`db.ts`).
  - [x] Intégration de la carte interactive MapLibre GL (`Canvas.tsx`, `Player.tsx`).
  - [x] Correction de l'import nommé MapLibre GL (TS1192).

- [x] **Phase 2 : Mode Tableur (SheetView)**
  - [x] Définition des types du tableur (`types/sheet.ts`).
  - [x] Composant `SheetView.tsx` pour l'édition tabulaire en grille des étapes.
  - [x] Intégration de la bascule Éditeur Carte / Tableur dans `Editor.tsx`.

- [x] **Phase 3 : Boîtes de dialogue & Modales**
  - [x] Modal de choix des styles cartographiques (`StylePickerModal.tsx`).
  - [x] Modal de partage et d'exportation (`ShareModal.tsx`).
  - [x] Modal de création d'un récit avec modèles guidés (`NewStoryModal.tsx`).

- [x] **Phase 4 : Enrichissements Fonctionnels**
  - [x] Barre d'outils de formatage Markdown rapide dans `Inspector.tsx`.
  - [x] Gestionnaire d'historique Undo / Redo dans `StoryContext.tsx`.
  - [x] Extraction des coordonnées GPS EXIF des photographies (`core/exif.ts`).

- [x] **Phase 5 : Documentation Wiki & Validation**
  - [x] Rédaction des fiches documentaires dans `wiki/` pour chaque nouveau composant.
  - [x] Mise à jour du sommaire général `wiki/Summary.md`.
  - [x] Contrôle strict de la règle des 200 lignes par fichier.
  - [x] Validation du build de production (`npm run build`).
