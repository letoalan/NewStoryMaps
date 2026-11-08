# Types TypeScript — Cartographie & Styles (`src/types/map.ts`)

Ce fichier référence les styles de fonds de carte vectoriels et raster compatibles MapLibre GL JS et leurs fournisseurs.

- **Fichier source** : [`src/types/map.ts`](file:///c:/Users/alano/OneDrive/Documents/GitHub/NewStoryMaps/src/types/map.ts)

## Constantes & Types

### `MapStyleOption`
- `id`: Identifiant technique du style (ex: `positron`, `voyager`, `satellite`).
- `name`: Libellé affiché dans le sélecteur.
- `url`: URL du fichier de style JSON ou identifiant raster (`esri-satellite`, `esri-hybrid`).
- `provider`: Nom du fournisseur (`CARTO`, `OpenFreeMap`, `Esri`).

### Styles Fournis par Défaut (10 Fonds de Carte Disponibles dans les 3 Modes)
1. **Positron (Clair)** (CARTO) : Minimaliste clair pour valoriser les récits.
2. **Voyager (Coloré)** (CARTO) : Coloré, lisible et riche en repères urbains.
3. **Dark Matter (Sombre)** (CARTO) : Thème sombre et élégant.
4. **Liberty (3D)** (OpenFreeMap) : Tuiles vectorielles mondiales détaillées avec bâtiments 3D.
5. **Bright (Contraste)** (OpenFreeMap) : Vif et contrasté.
6. **Positron (OFM)** (OpenFreeMap) : Clair et épuré.
7. **Dark (OFM)** (OpenFreeMap) : Sombre et minimaliste.
8. **Fiord (Bleu Nuit)** (OpenFreeMap) : Tonalité bleue profonde.
9. **Satellite** (Esri World Imagery) : Imagerie aérienne et satellite haute résolution.
10. **Satellite Hybride** (Esri World Imagery) : Imagerie aérienne avec frontières et toponymes.

### Fonctions Utilitaires
- `resolveMapStyle(urlOrId)` : Résout dynamiquement n'importe quel identifiant court (`positron`, `dark-matter`, `voyager`, etc.) ou objet `StyleSpecification` en URL absolue sécurisée ou objet raster pour MapLibre GL sans erreur 404.
- `getMapStyleId(urlOrId)` : Identifie le style canonique à partir d'un identifiant ou d'une URL de tuiles.
