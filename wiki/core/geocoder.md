# Module Core : `geocoder.ts`

Source : [`src/core/geocoder.ts`](file:///c:/Users/alano/OneDrive/Documents/GitHub/NewStoryMaps/src/core/geocoder.ts)

## Rôle
Module de recherche de lieux et géocodage basé sur l'API Nominatim d'OpenStreetMap.

## Fonctionnalités
- `searchPlaces(query: string, limit = 5)`: Requête l'endpoint public Nominatim au format JSON.
- Retourne des suggestions structurées (`GeoSearchResult`) contenant :
  - `displayName`: Libellé complet du lieu.
  - `lat`, `lon`: Coordonnées géodésiques WGS84.
  - `bbox`: Boîte englobante pour un cadrage automatique de la vue.
- Gère gracieusement les erreurs et les requêtes trop courtes.

