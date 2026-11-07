# Module Core : `exif.ts`

Source : [`src/core/exif.ts`](file:///src/core/exif.ts)

## Rôle
Parseur binaire autonome pour extraire les coordonnées géographiques (latitude, longitude) des métadonnées EXIF contenues dans les fichiers photographiques JPEG (`image/jpeg`).

## Fonctionnalités
- Lecture directe sans dépendance externe via l'API `DataView`.
- Détection du marqueur APP1 (EXIF).
- Décodage des tags GPS (Latitude, LatitudeRef, Longitude, LongitudeRef) et conversion en degrés décimaux WGS84.
- Recalage automatique de la caméra cartographique sur le lieu de prise de vue.

