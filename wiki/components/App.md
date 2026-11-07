# Composants — App & Point d'Entrée (`src/App.tsx`, `src/main.tsx`)

Composants d'initialisation et de routage d'état de l'application StoryMap.

- **Fichiers sources** :
  - [`src/App.tsx`](file:///c:/Users/alano/OneDrive/Documents/GitHub/NewStoryMaps/src/App.tsx) (51 lignes)
  - [`src/main.tsx`](file:///c:/Users/alano/OneDrive/Documents/GitHub/NewStoryMaps/src/main.tsx) (17 lignes)

## Architecture de Routage Déclaratif
L'application adopte un routage basé sur un état interne fluide :
- `'dashboard'` : Affiche la liste des récits et l'accueil.
- `'editor'` : Bascule sur l'environnement complet de création et d'édition.
- `'player'` : Active le lecteur immersif plein écran.

Le composant `StoryProvider` enveloppe l'arborescence, garantissant que les données du récit sélectionné restent accessibles dans toutes les vues sans rechargement de page.

