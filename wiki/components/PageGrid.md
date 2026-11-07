# Grille Documentaire Interactive (PageGrid.tsx)

Le composant `src/components/document/PageGrid.tsx` est le moteur de rendu interactif de la page documentaire en cours d'édition.

## Fonctionnalités

1. **Rendu de la grille orthogonale (G01, G02)** :
   - Affiche les colonnes et lignes en grille CSS selon les calculs de `getGridDimensions(format)`.
   - Cellules de fond représentées en pointillés avec bouton central « + » pour les cellules inoccupées.

2. **Menu d'insertion rapide sur cellule vide (G03)** :
   - Le composant `EmptyCellMenu` s'ouvre au clic sur le « + » de la cellule ciblée.
   - Permet d'insérer directement un bloc parmi 9 types : Titre, Texte, Encadré, Image, Galerie, Tableau, Carte, Légende, Source.

3. **Barre contextuelle d'actions (BlockContextMenu, G03, G06)** :
   - Sélection d'un bloc par clic pour faire apparaître sa barre contextuelle flottante.
   - Changement de type sans perte d'emplacement.
   - Agrandissement vers la droite ou vers le bas (`onExpand`).
   - Réduction dimensionnelle (`onShrink`).
   - Duplication automatique dans la première zone libre (`onDuplicate`).
   - Suppression (`onDelete`).

4. **Composants de blocs spécialisés (G07, G09)** :
   - `TextBlock` : gestion des titres, paragraphes, citations/encadrés, légendes et mentions de sources.
   - `MediaBlock` : gestion des images unitaires ou carrousels/galeries multi-images.
   - `TableBlock` : édition tabulaire avec ajout de lignes et colonnes.
   - `MapBlockPreview` : aperçu cartographique avec badge d'action narrative (`NarrativeBinding`).

