# Composant — StoryCard (`src/components/dashboard/StoryCard.tsx`)

Composant individuel représentant une carte de récit dans la grille du tableau de bord.

- **Fichier source** : [`src/components/dashboard/StoryCard.tsx`](file:///c:/Users/alano/OneDrive/Documents/GitHub/NewStoryMaps/src/components/dashboard/StoryCard.tsx)
- **Lignes** : 73

## Propriétés (`StoryCardProps`)
- `item`: Données allégées de la storymap (`StoryListItem`).
- `onOpen(id)`: Déclenché lors du clic pour ouvrir l'éditeur.
- `onPlay(id)`: Déclenché lors du clic sur l'icône de lecture pour lancer le lecteur.
- `onDelete(id)`: Déclenché pour supprimer le récit avec confirmation utilisateur.

## Éléments Visuels
- Vignette de couverture ou icône cartographique par défaut.
- Badge affichant le nombre d'étapes.
- Date de dernière modification formatée en français.
- Overlay animé au survol invitant à ouvrir l'éditeur.

