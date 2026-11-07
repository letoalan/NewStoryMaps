# Plan d'Implémentation : StoryMap React & TypeScript

Ce document définit les spécifications techniques et l'architecture pour finaliser la migration complète de StoryMap en React 19, TypeScript et Vite, dans le respect strict de la règle des **$\le$ 200 lignes par fichier**.

---

## 1. Objectifs & Périmètre
1. **Migration Complète** : Remplacer l'ancienne couche vanilla JS (`public/js/`) par une architecture React/TS robuste et typée.
2. **Contrainte Forte** : Tous les fichiers sources (`.ts`, `.tsx`, `.css`, `.md`, `.html`) restent strictement sous la barre des 200 lignes.
3. **Parité Fonctionnelle** :
   - Mode Éditeur visuel avec carte MapLibre GL, inspecteur d'étape et plan hiérarchique.
   - Mode Tableur (`SheetView`) pour édition tabulaire massive et import/export CSV.
   - Mode Lecteur immersif (`Player`) avec lecture automatique, transition fluide de caméra et panneau narratif.
   - Boîtes de dialogue modulaires : Nouveau récit, Paramètres & Styles de carte, Partage & QR Code.
   - Gestion avancée des médias : Extraction EXIF GPS, images locales IndexedDB.
   - Recherche d'adresses (Nominatim) et export HTML 100% autonome.

---

## 2. Architecture des Composants React

```text
src/
├── components/
│   ├── common/       # Header, Modal, Tabs, ThemeToggle
│   ├── dashboard/    # Dashboard, StoryCard, NewStoryDialog
│   ├── editor/       # TopBar, Outline, Canvas, Inspector, SheetView
│   ├── dialogs/      # StylePickerModal, ShareModal, SettingsModal
│   └── player/       # Player, PlayerNarrative, PlayerControls
├── context/          # StoryContext (state, auto-save, undo/redo)
├── core/             # db, defaults, io, publish, geocoder, exif
├── data/             # exampleStory
└── types/            # story, step, map, sheet
```

---

## 3. Gestion d'État & Persistance
- **State global** : `StoryContext` gère le récit actif, l'index de l'étape courante, le mode d'affichage (`edit`, `sheet`, `play`), l'historique (undo/redo), et l'autosave avec debounce vers IndexedDB.
- **Stockage** : `src/core/db.ts` encapsule IndexedDB pour stocker les récits complets et les médias volumineux en Blob.

---

## 4. Documentation Wiki
Chaque nouveau composant et module fait l'objet d'une page dédiée dans `wiki/` et d'une référence dans `wiki/Summary.md`.

