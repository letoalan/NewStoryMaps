# Module Core : `route.ts`

Source : [`src/core/route.ts`](file:///src/core/route.ts)

## Rôle
Génère une géométrie GeoJSON de type `LineString` reliant les coordonnées de caméra des étapes ordonnées d'une StoryMap.

## Fonctionnalités
- `createRouteGeoJSON(steps: Step[])`: Filtre les étapes visibles et produit une `FeatureCollection` contenant le tracé continu du parcours.
- Utilisable pour dessiner le fil conducteur géographique du voyage sur la carte MapLibre GL.

