# Composant — Editor (`src/components/editor/Editor.tsx`)

Composant d'orchestration de l'interface d'édition, structurant la disposition en grille à 3 volets.

- **Fichier source** : [`src/components/editor/Editor.tsx`](file:///c:/Users/alano/OneDrive/Documents/GitHub/NewStoryMaps/src/components/editor/Editor.tsx)
- **Lignes** : 60

## Agencement en Grille CSS
- **Haut** : `TopBar.tsx` (barre supérieure, titre, statut de sauvegarde, boutons d'action).
- **Gauche** : `Outline.tsx` (liste ordonnée des étapes, ajout, réorganisation).
- **Centre** : `Canvas.tsx` (carte interactive MapLibre, cadrage caméra, marqueurs).
- **Droite** : `Inspector.tsx` (propriétés détaillées de l'étape active).

## Modal d'Aperçu
Intègre un état `isPreviewOpen` permettant d'ouvrir un modal plein écran embarquant le composant `Player.tsx` sans quitter le contexte d'édition.

