# Service de Persistance — IndexedDB (`src/core/db.ts`)

Ce module encapsule l'API `indexedDB` du navigateur sous une interface moderne basée sur des promesses asynchrones.

- **Fichier source** : [`src/core/db.ts`](file:///c:/Users/alano/OneDrive/Documents/GitHub/NewStoryMaps/src/core/db.ts)
- **Lignes** : 80

## Méthodes Exposées par l'Instance `db`

### `getAllStories(): Promise<StoryListItem[]>`
Récupère l'ensemble des récits stockés dans la base locale, extrait les métadonnées légères nécessaires au tableau de bord et les trie par date de dernière modification décroissante.

### `getStory(id: string): Promise<StoryMap | null>`
Charge une storymap complète à partir de son identifiant unique. Retourne `null` si le document n'existe pas.

### `saveStory(story: StoryMap): Promise<void>`
Enregistre ou met à jour une storymap dans le magasin d'objets `stories`. Met à jour automatiquement la propriété `modified` avec l'horodatage courant.

### `deleteStory(id: string): Promise<void>`
Supprime définitivement un récit de la base de données locale.

