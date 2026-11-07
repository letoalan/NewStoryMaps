# Gestionnaire d'État — StoryContext (`src/context/StoryContext.tsx`)

Le contexte `StoryContext` centralise tout l'état applicatif en cours d'édition, les sélections d'étapes actives et la persistance automatique.

- **Fichier source** : [`src/context/StoryContext.tsx`](file:///c:/Users/alano/OneDrive/Documents/GitHub/NewStoryMaps/src/context/StoryContext.tsx)
- **Lignes** : 120

## État Fourni
- `story`: Instance `StoryMap` actuellement en cours d'édition (ou `null`).
- `activeStepIndex`: Index du chapitre/étape actuellement sélectionné.
- `isSaving`: Indicateur visuel d'opération d'écriture en cours dans IndexedDB.

## Méthodes et Actions
- `updateStoryTitle(title)`: Met à jour le titre principal et le timestamp de modification.
- `updateStep(index, partialStep)`: Met à jour partiellement les champs d'une étape (titre, média, caméra, etc.).
- `addStep()`: Ajoute une nouvelle étape en fin de récit et la sélectionne automatiquement.
- `deleteStep(index)`: Supprime une étape en préservant au minimum une étape valide.
- `reorderSteps(startIndex, endIndex)`: Réordonne les étapes lors des déplacements par glisser-déposer ou flèches.
- `saveCurrentStory()`: Déclenche une sauvegarde immédiate dans IndexedDB.
- `loadStory(id)`: Charge un récit depuis la base et bascule l'étape active à la première.
- `newStory()`: Initialise un récit vierge.

## Autosauvegarde
Un hook `useEffect` écoute les mutations de l'objet `story` et déclenche une sauvegarde debouncée de 1,2 seconde pour éviter les écritures disques répétées lors de la saisie utilisateur.

