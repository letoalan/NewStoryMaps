# Module Core : `adapter.ts`

Source : [`src/core/adapter.ts`](file:///src/core/adapter.ts)

## Rôle
Pont de compatibilité bidirectionnel entre le format historique StoryMap (versions 1 et 2) et le modèle typé React 2.0.

## Fonctionnalités
- Détection automatique du schéma : `isModernStoryMap`, `isLegacyV2Story`, `isLegacyV1Story`.
- `convertLegacyToModern` : Convertit les anciens fichiers d'échange (`story`, `chapters`, table `images`, géométries `geodata`) vers le modèle `StoryMap` unifié.
- `convertModernToLegacyV2` : Rétro-compatibilité permettant d'exporter un récit moderne sous le format historique StoryMap v2.

