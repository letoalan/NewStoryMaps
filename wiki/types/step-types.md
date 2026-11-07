# Types TypeScript — Modèle Étape (`src/types/step.ts`)

Ce fichier décrit chaque étape ou chapitre individuel composant une storymap.

- **Fichier source** : [`src/types/step.ts`](file:///c:/Users/alano/OneDrive/Documents/GitHub/NewStoryMaps/src/types/step.ts)
- **Lignes** : 41

## Interfaces Clés

### `Step`
- `id`: Identifiant unique de l'étape.
- `title`: Titre de l'étape (affiché dans le panneau et le plan).
- `description`: Contenu HTML ou texte mis en forme décrivant les événements.
- `media`: Média facultatif (`StepMedia`) associé à l'étape (image, vidéo, audio).
- `camera`: Positionnement géographique précis (`CameraView`).
- `markers`: Liste des marqueurs cartographiques affichés lors de cette étape.
- `activeLayers`: Identifiants des couches de données actives à cette étape.
- `hidden`: Booléen masquant éventuellement l'étape de la navigation publique.

### `CameraView`
- `center`: Coordonnées `[longitude, latitude]`.
- `zoom`: Niveau de zoom cartographique (0 à 22).
- `pitch`: Inclinaison en degrés de la vue 3D (0 à 60°).
- `bearing`: Orientation / rotation par rapport au Nord en degrés (0 à 360°).

### `StepMedia`
- `type`: Type de ressource (`'image' | 'video' | 'audio'`).
- `url`: Lien vers le fichier média.
- `caption`: Légende affichée sous le média.
- `credit`: Crédits photographiques ou droits d'auteur.

