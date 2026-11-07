# Import et Export (`src/core/io.ts`)

Ce module gère la sérialisation, la validation et le téléchargement des fichiers de récits StoryMap au format JSON.

- **Fichier source** : [`src/core/io.ts`](file:///c:/Users/alano/OneDrive/Documents/GitHub/NewStoryMaps/src/core/io.ts)
- **Lignes** : 21

## Fonctions Définies

### `exportStoryToJSON(story: StoryMap): void`
Convertit l'objet StoryMap en chaîne JSON formatée (indentation de 2 espaces) et déclenche un téléchargement automatique dans le navigateur via la création d'un élément d'ancrage virtuel. Le nom du fichier généré est automatiquement nettoyé en slug (ex : `tour-du-monde.storymap.json`).

### `parseStoryJSON(jsonString: string): StoryMap`
Parse une chaîne JSON importée par l'utilisateur et vérifie la conformité minimale requise (présence d'un `id`, d'un `title` et d'un tableau `steps`). Lève une exception claire en cas de format invalide.

