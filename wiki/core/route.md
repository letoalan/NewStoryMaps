# Module Core : `route.ts`

Source : [`src/core/route.ts`](file:///src/core/route.ts)

## Rôle
Génère la géométrie GeoJSON et les configurations graphiques MapLibre GL pour relier les étapes ordonnées d'une StoryMap avec une variété de styles de tracé et d'animations.

## Styles de Tracé Disponibles
- `solid` : Ligne pleine continue.
- `dashed` : Ligne pointillée standard.
- `dotted` : Petits points fins avec terminaisons arrondies.
- `curved` : Trajectoire incurvée par interpolation géodésique / spline de Bézier quadratique entre points d'étapes.
- `arrow` : Tirets directionnels guidant le sens de lecture géographique.
- `double-arrow` : Motif bi-directionnel avec répétition de tirets longs et courts.
- `airplane` : Style Indiana Jones avec tracé rouge brique dynamique et symbole d'avion.
- `ship` : Style Croisière maritime outremer / cyan avec tirets espacés et symbole de navire.
- `none` : Masquage complet du fil conducteur.

## Fonctions Principales
- `createRouteGeoJSON(steps, options)` : Génère la `FeatureCollection` GeoJSON avec ou sans interpolation de courbe.
- `getRouteLayerConfig(style, color)` : Renvoie les propriétés `paint` et `layout` adaptées à MapLibre GL.
