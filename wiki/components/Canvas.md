# Composant — Canvas (`src/components/editor/Canvas.tsx`)

Cœur cartographique de l'éditeur intégrant l'instance **MapLibre GL JS**.

- **Fichier source** : [`src/components/editor/Canvas.tsx`](file:///c:/Users/alano/OneDrive/Documents/GitHub/NewStoryMaps/src/components/editor/Canvas.tsx)
- **Lignes** : 125

## Capacités Cartographiques
- **Cycle de Vie MapLibre** : Instanciation propre dans un conteneur HTML avec nettoyage (`map.remove()`) au démontage du composant.
- **Synchronisation Automatique** : Lors du changement d'étape active dans l'inspecteur ou le plan, la carte anime la transition vers le nouveau cadrage (`flyTo`).
- **Marqueur Interactif** : Affiche et synchronise la pastille de localisation à la position de l'étape.
- **Capture de Vue** : Le bouton `Capturer cette vue` enregistre la position, le zoom, l'orientation et l'inclinaison actuels de la carte dans l'étape active.
- **Commandes HUD** : Boutons de zoom avant/arrière et réorientation rapide vers le Nord.

