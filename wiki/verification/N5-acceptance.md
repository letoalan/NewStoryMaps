# Rapport de Réception et Validation N0–N5

Date : 8 novembre 2026
Références : `newplan.md` et `newtasks.md`
Baseline initiale : `6f1cbbe7138929538fe87b3605975a8d0bc4a7b6` / `3e388fed11bd9ceb03d89f33ad44efaa52f6038b`

## 1. Synthèse des portes N0 à N5

| Porte | Périmètre | Script de recette | Statut |
| :--- | :--- | :--- | :---: |
| **N0** | Contrats de rendu, matrice blocs/supports, versionnement du schéma (`schemaVersion`) et fixtures canoniques (Modes 1, 2, 3) | [`scripts/verify-n0.mjs`](file:///scripts/verify-n0.mjs) | Validé |
| **N1** | Palette d’insertion flottante via Portail (`createPortal`), positionnement intelligent hors cellule 1×1, feuille basse mobile, remplacement de type sans perte et inspecteur de bloc | [`scripts/verify-n1.mjs`](file:///scripts/verify-n1.mjs) | Validé |
| **N2** | Thème partagé (`resolveVisualStyle`), hiérarchie Projet → Page → Bloc, séparation opacité surface (`rgba`) / opacité contenu, mode sans cadre (`frameless`), contraste WCAG et modèles de structure sans perte de bloc | [`scripts/verify-n2.mjs`](file:///scripts/verify-n2.mjs) | Validé |
| **N3** | Couverture Hero photographique puis vidéo, point focal, voile de contraste, `prefers-reduced-motion`, contrôle prévol `MISSING_VIDEO_POSTER` en brochure A4 et résolution ZIP | [`scripts/verify-n3.mjs`](file:///scripts/verify-n3.mjs) | Validé |
| **N4** | Catalogue de 7 véhicules libres de droits (`CC0`), interpolation géométrique par distance, antiméridien, contrôleur temporel (`idle/playing/paused/completed`), marqueur DOM à 2 niveaux (`.vehicle-marker-wrap` + `.vehicle-marker-icon`) et représentation statique en Brochure A4 | [`scripts/verify-n4.mjs`](file:///scripts/verify-n4.mjs) | Validé |
| **N5** | Recette de bout en bout (Modes 1, 2, 3), exécution VM du runtime publié, roundtrip JSON/HTML/ZIP, budget de performance (< 5 ms pour 1 000 interpolations + 500 résolutions de style) et conformité stricte $\le 195$ lignes | [`scripts/verify-n5.mjs`](file:///scripts/verify-n5.mjs) | Validé |

## 2. Architecture et Nouveaux Modules

- [`src/types/theme.ts`](file:///src/types/theme.ts) : Contrats typés `SharedThemeTokens`, `BlockVisualOverride`, `PageVisualOverride`, `ResolvedVisualStyle`, `HeroConfig`, `RouteAnimationConfig`, `VehicleType`, `OutputProfile`.
- [`src/core/renderMatrix.ts`](file:///src/core/renderMatrix.ts) : Matrice des capacités par profil de sortie (`BLOCK_RENDER_MATRIX`), validation `validateProjectSchemaVersion` et préservation des champs futurs/inconnus.
- [`src/core/canonicalFixtures.ts`](file:///src/core/canonicalFixtures.ts) : Trois fixtures canoniques (`createCanonicalMode1Tour`, `createCanonicalMode2TerritorialDoc`, `createCanonicalMode3Brochure`).
- [`src/core/blockCatalog.ts`](file:///src/core/blockCatalog.ts) : Catalogue partagé, filtrage par mode, conversion de type avec préservation des données (`convertBlockTypePreservingContent`) et calcul de positionnement flottant (`computeFloatingPalettePosition`).
- [`src/core/themeResolver.ts`](file:///src/core/themeResolver.ts) : Résolution pure `resolveVisualStyle`, conversion `hexToRgba`, mesure de contraste WCAG `measureColorContrast` et retour au style hérité.
- [`src/core/layoutTemplates.ts`](file:///src/core/layoutTemplates.ts) : Modèles de structure spatiale avec prévisualisation non destructive (`previewStructuralTemplate`).
- [`src/core/heroRenderer.ts`](file:///src/core/heroRenderer.ts) & [`src/components/document/HeroSection.tsx`](file:///src/components/document/HeroSection.tsx) : Rendu Hero 4 couches (fond, média unique photo/vidéo avec point focal, voile uni/dégradé, cartouche éditorial) et transposition statique automatique pour `print` et `prefers-reduced-motion`.
- [`src/core/vehicleCatalog.ts`](file:///src/core/vehicleCatalog.ts), [`src/core/routeInterpolation.ts`](file:///src/core/routeInterpolation.ts) & [`src/core/vehicleController.ts`](file:///src/core/vehicleController.ts) : Véhicules orientables, interpolation par distance cumulée et contrôleur de cycle de vie découplé du taux de rafraîchissement.

## 3. Distinction Honnête entre Tests Exécutés et Limites Environnementales

1. **Tests automatisés exécutés (`npm test` & `npm run build`)** :
   - Les 13 suites (`test:p0` à `test:p6` et `test:n0` à `test:n5`) exécutent directement les fonctions de production TypeScript et le script runtime publié dans une VM isolée.
   - Le build de production (`tsc && vite build`) compile sans erreur ni avertissement de typage.
2. **Limite environnementale explicite (PDF matériel)** :
   - La génération HTML A4 imprimable, le verrouillage d’impression tant que les cartes ne sont pas `idle`, le contrôle prévol `MISSING_VIDEO_POSTER` et le repli statique des vidéos/véhicules sont intégralement vérifiés par code.
   - La rastérisation finale en fichier `.pdf` binaire dépend du moteur d’impression du navigateur de l’utilisateur (`window.print()`).

