# Types TypeScript — Modèle Story (`src/types/story.ts`)

Ce fichier définit les structures fondamentales représentant une StoryMap complète et ses métadonnées.

- **Fichier source** : [`src/types/story.ts`](file:///c:/Users/alano/OneDrive/Documents/GitHub/NewStoryMaps/src/types/story.ts)
- **Lignes** : 47

## Interfaces et Types Définis

### `StoryMap`
Représente un récit complet :
- `id`: Identifiant unique (UUID ou chaîne générée).
- `version`: Version du schéma (`2.0.0`).
- `title`: Titre principal de la storymap.
- `subtitle`: Sous-titre ou description courte.
- `author`: Auteur du récit.
- `created` / `modified`: Horodatages millisecondes.
- `appearance`: Paramètres d'apparence (`StoryAppearance`).
- `mapStyle`: URL du style cartographique MapLibre.
- `layers`: Calques vectoriels ou GeoJSON additionnels (`MapLayer[]`).
- `steps`: Tableau ordonné des chapitres/étapes (`Step[]`).

### `StoryAppearance`
Options de présentation visuelle :
- `theme`: `'light' | 'dark' | 'auto'`
- `font`: Police sélectionnée (`'Inter' | 'Lora' | ...`)
- `accentColor`: Couleur d'accentuation CSS (ex: `#0b7fb0`).
- `panelPosition`: Positionnement du panneau (`'left' | 'right' | 'center'`).
- `showProgress`: Affichage de la barre de progression.
- `autoplayInterval`: Délai en millisecondes pour le défilement automatique.

### `StoryListItem`
Format allégé utilisé par le tableau de bord pour lister les storymaps sans surcharger la mémoire.

