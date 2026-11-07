# Moteur de Scènes Cartographiques (`mapScene.ts`)

Source : [`src/core/mapScene.ts`](file:///src/core/mapScene.ts)

## Rôle
Module central régissant les scènes cartographiques indépendantes du parcours séquentiel et les associations narratives pour les modes Document enrichi (Mode 2) et Brochure A4 (Mode 3) (Phase P3 — Jalons H01 à H09).

## Fonctionnalités Principales

1. **Scènes et Cadrages Autonomes (H03, H04)** :
   - `createDefaultProjectMap(id, name)` : Initialise une scène cartographique dotée de son propre identifiant stable, de son fond vectoriel/satellite et de son emprise (`MapView`).
   - `updateMapView(map, view)` : Ajuste le centre, le zoom, le pitch et le bearing indépendamment de tout chapitre séquentiel.

2. **Couches et Entités Géographiques (H02)** :
   - `addFeatureToLayer` & `deleteFeatureFromLayer` : Permet d'intégrer des points remarquables, des lignes de cheminement ou des polygones de délimitation avec couleur et index de renvoi.

3. **Liaisons Narratives Bloc <-> Carte (H05, H06)** :
   - `bindBlockToFeature(block, mapId, featureId, action, numberIndex)` : Lie n'importe quel bloc documentaire (texte, encadré, tableau, carte) à une entité ou à la vue globale.
   - `unbindBlock(block)` : Dissocie proprement le bloc sans altérer son contenu textuel ou tabulaire.

4. **Résilience et Nettoyage des Références Orphelines (H09)** :
   - `validateNarrativeBindings(pages, maps)` : Scanne l'intégralité du document à chaque modification. Si une carte ou un objet ciblé a été supprimé, la liaison rompue est purgée de façon gracieuse sans provoquer d'erreur d'exécution ou d'incohérence à l'export/réimport.

