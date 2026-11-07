# Types TypeScript — Cartographie & Styles (`src/types/map.ts`)

Ce fichier référence les styles de fonds de carte vectoriels et raster compatibles MapLibre GL JS et leurs fournisseurs.

- **Fichier source** : [`src/types/map.ts`](file:///c:/Users/alano/OneDrive/Documents/GitHub/NewStoryMaps/src/types/map.ts)

## Constantes & Types

### `MapStyleOption`
- `id`: Identifiant technique du style (ex: `positron`, `voyager`, `satellite`).
- `name`: Libellé affiché dans le sélecteur.
- `url`: URL du fichier de style JSON ou identifiant raster (`esri-satellite`, `esri-hybrid`).
- `provider`: Nom du fournisseur (`CARTO`, `OpenFreeMap`, `Esri`).

### Styles Fournis par Défaut
1. **Positron (Clair)** (CARTO) : Minimaliste clair pour valoriser les récits.
2. **Voyager (Coloré)** (CARTO) : Coloré, lisible et riche en repères urbains.
3. **Dark Matter (Sombre)** (CARTO) : Thème sombre et élégant.
4. **Liberty (3D)** (OpenFreeMap) : Tuiles vectorielles mondiales détaillées avec bâtiments 3D.
5. **Bright (Contraste)** (OpenFreeMap) : Vif et contrasté.
6. **Fiord (Bleu Nuit)** (OpenFreeMap) : Tonalité bleue profonde.
7. **Satellite** (Esri World Imagery) : Imagerie aérienne et satellite haute résolution.
8. **Satellite Hybride** (Esri World Imagery) : Imagerie aérienne avec frontières et toponymes.

### Fonction `resolveMapStyle(urlOrId)`
Résout dynamiquement les identifiants textuels en objets `StyleSpecification` natifs ou en URL de tuiles vectorielles distantes.
