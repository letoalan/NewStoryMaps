# Moteur de Grille Documentaire (grid.ts)

Le module `src/core/grid.ts` implémente le moteur mathématique de placement sur grille orthogonale pour les modes « Document enrichi » et « Brochure A4 » (Phase P2, jalons G01 à G06).

## Principes et Contrats de Calcul

1. **Cellules rigoureusement carrées (G01)** :
   - `getGridDimensions(format)` renvoie un objet `GridDimensions` où `cellWidthPx === cellHeightPx`.
   - `a4-portrait` : 6 colonnes × 8 lignes (110×110 px).
   - `a4-landscape` : 8 colonnes × 6 lignes (120×120 px).
   - `screen-16-9` : 8 colonnes × 5 lignes (130×130 px).
   - `responsive` : 4 colonnes × 8 lignes (140×140 px).
   - Marges de page minimales de 10 à 15 mm et gouttières (gap) de 10 à 12 px.

2. **Règles d'aire et géométrie stricte (G02, G04)** :
   - Une cellule unitaire individuelle (aire = 1) est autorisée.
   - Toute fusion de cellules doit former un rectangle d'aire paire complète (2, 4, 6, 8, 12...).
   - Les formes en « L » ou découpes non rectangulaires sont strictement rejetées par `isRectValid`.

3. **Détection et évitement des collisions (G02, G05)** :
   - `hasCollision(rect, blocks, ignoreBlockId)` garantit qu'aucun bloc ne peut chevaucher l'espace d'un autre.
   - L'adjacence stricte (partage d'une arête externe) est reconnue et autorisée sans conflit.

4. **Manipulations unitaires (G05, G06)** :
   - `addBlock` : valide l'aire et l'absence d'obstacle avant insertion.
   - `expandBlock` : agrandit vers la droite ou le bas si l'espace est libre et si la nouvelle aire respecte la parité.
   - `shrinkBlock` : réduit les dimensions en respectant un seuil minimal de 1×1.
   - `findFirstFreeCell` & `duplicateBlock` : identifie le premier espace contigu libre pour cloner un bloc avec identifiant unique.
   - `deleteBlock` : supprime le bloc de la collection.

