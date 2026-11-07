# Modèles par Défaut (`src/core/defaults.ts`)

Ce module fournit des fonctions fabriques pour instancier de nouvelles storymaps et de nouvelles étapes avec des valeurs par défaut cohérentes.

- **Fichier source** : [`src/core/defaults.ts`](file:///c:/Users/alano/OneDrive/Documents/GitHub/NewStoryMaps/src/core/defaults.ts)
- **Lignes** : 49

## Fonctions Fabriques

### `createNewStep(index: number = 1): Step`
Génère une nouvelle étape type :
- Identifiant unique généré aléatoirement (`step-xxxxxxx`).
- Titre par défaut : `Étape <index>`.
- Positionnement initial centré sur Paris (`[2.3522, 48.8566]`).
- Marqueur par défaut configuré avec le code couleur officiel de l'application.

### `createNewStory(title: string = 'Nouveau récit'): StoryMap`
Instancie une nouvelle structure de storymap vierge :
- Horodatages `created` et `modified` synchronisés avec l'heure courante.
- Paramètres d'apparence préconfigurés (thème auto, police Inter, couleur `#0b7fb0`).
- Style de fond de carte initialisé sur Positron de CARTO.
- Initialisation avec une première étape prête à être éditée.

