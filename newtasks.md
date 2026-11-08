# NewStoryMaps — Tâches thème, ergonomie, hero et animations
Date : 8 novembre 2026 — Référence : newplan.md.
Baseline : 6f1cbbe7138929538fe87b3605975a8d0bc4a7b6 / 3e388fed11bd9ceb03d89f33ad44efaa52f6038b.
Statut : Lots N0 à N5 implémentés et vérifiés par scripts automatisés (`npm test` & `npm run build`).
Ordre : N0 → N1 → N2 → N3 → N4 → N5 ; tests écrits avec chaque lot.
Préserver les trois modes et les correctifs des plans précédents.

## N0 — Baseline et contrats
- [x] N0.01 Identifier le commit de travail et coordonner les autres agents.
- [x] N0.02 Sauvegarder fixtures historiques, circuit touristique et document multi-pages (`src/core/canonicalFixtures.ts`).
- [x] N0.03 Exécuter suites existantes et build ; consigner résultats et erreurs avant modification.
- [x] N0.04 Cartographier lecteurs React, export mode 1, export enrichi et sortie brochure.
- [x] N0.05 Définir matrice blocs/capacités/supports et conditions de dégradation statique (`src/core/renderMatrix.ts`).
- [x] N0.06 Versionner les nouveaux champs (`schemaVersion`) et tester migration sans changement du rendu ancien.
- [x] N0.07 Distinguer document éditable, profil de lecture et profil de publication (`OutputProfile`).
Porte N0 : contrats documentés et baseline reproductible, sans régression masquée (`scripts/verify-n0.mjs`).

## N1 — Palette flottante et ergonomie d’édition
- [x] N1.01 Extraire la palette du carré via portail (`createPortal` dans `src/components/document/EmptyCellMenu.tsx`).
- [x] N1.02 Ancrer au + et adapter position aux limites viewport, scroll et zoom (`computeFloatingPalettePosition`).
- [x] N1.03 Définir taille lisible, groupes et libellés ; aucune coupure par overflow.
- [x] N1.04 Partager le catalogue entre insertion et remplacement de contenu (`src/core/blockCatalog.ts`).
- [x] N1.05 Filtrer les choix selon mode et alternatives statiques disponibles (`getAvailableCatalogItems`).
- [x] N1.06 Gérer Échap, extérieur, focus initial, retour au déclencheur et navigation clavier.
- [x] N1.07 Fournir un panneau inférieur (`bottom-sheet`) adapté aux petits écrans (< 640px).
- [x] N1.08 Fermer proprement si l’ancre disparaît ou si la page change.
- [x] N1.09 Ajouter inspecteur/dialogue pour les propriétés détaillées des blocs (`src/components/dialogs/BlockInspectorModal.tsx`).
- [x] N1.10 Conserver barre contextuelle courte et sélection stable (`src/components/document/BlockContextMenu.tsx`).
- [x] N1.11 Tester cellule unitaire/fusionnée, bords de page et conteneur défilant.
- [x] N1.12 Vérifier qu’ouvrir/fermer la palette ne modifie ni document ni historique.
Porte N1 : menu lisible et accessible sans agrandir la cellule, en document et brochure (`scripts/verify-n1.mjs`).

## N2 — Thème commun et structures
- [x] N2.01 Définir tokens identité, typographie, couleurs, surfaces et conteneurs (`SharedThemeTokens`).
- [x] N2.02 Définir héritage application/projet/page/bloc et exceptions explicites (`BlockVisualOverride`, `PageVisualOverride`).
- [x] N2.03 Implémenter `resolveVisualStyle` et tests purs de priorité/fallback (`src/core/themeResolver.ts`).
- [x] N2.04 Migrer `brand`/`appearance`/`themeTokens` sans deux sources concurrentes (`extractProjectThemeTokens`).
- [x] N2.05 Ajouter réglages projet et commande Revenir au style hérité (`resetBlockStyleToInherited`).
- [x] N2.06 Importer logo local ; référencer crédits et ressources de polices (`FONT_CATALOG`).
- [x] N2.07 Conserver l’entrée simple deux polices/trois couleurs ; options avancées contextuelles (`SettingsModal.tsx`).
- [x] N2.08 Appliquer titres, textes, légendes, cartouches et fond au mode 1 (`PlayerNarrative.tsx`, `publish.ts`).
- [x] N2.09 Appliquer les mêmes tokens aux pages/blocs des modes 2/3 (`PageGrid.tsx`, `publishDocumentBlocks.ts`).
- [x] N2.10 Raccorder lecteurs, HTML autonome et impression à la même résolution de thème.
- [x] N2.11 Vérifier que les styles de l’interface ne fuient pas dans les publications.
- [x] N2.12 Ajouter bordure héritée/personnalisée/absente (`frameless`), rayon, ombre et padding.
- [x] N2.13 Séparer opacité du fond (`hexToRgba`) et opacité du contenu.
- [x] N2.14 Garder les contours d’édition visibles mais exclus de toutes les sorties (`showEditorGuide`).
- [x] N2.15 Définir modèles de structure distincts des styles visuels (`src/core/layoutTemplates.ts`).
- [x] N2.16 Prévisualiser toute transformation de structure (`previewStructuralTemplate`), préserver blocs et permettre annulation.
- [x] N2.17 Mesurer contrastes des préréglages (`measureColorContrast`) et signaler les combinaisons problématiques.
- [x] N2.18 Tester changement global avec une exception locale conservée.
- [x] N2.19 Tester sauvegarde/réouverture et aller-retour JSON/HTML/ZIP du thème complet.
Porte N2 : une charte modifiée se propage aux rendus sans casser les exceptions ni les contenus (`scripts/verify-n2.mjs`).

## N3 — Hero, photos et vidéo de fond
- [x] N3.01 Définir hero/section de couverture sans créer un quatrième mode (`HeroConfig`).
- [x] N3.02 Modéliser couleur, média unique, voile et contenu au-dessus (`src/core/heroRenderer.ts`).
- [x] N3.03 Importer une photo avec crédit, alternative et gestion de ressource portable.
- [x] N3.04 Ajouter cover/contain, point focal, alignement et hauteur (`objectPositionCss`).
- [x] N3.05 Ajouter voile uni/dégradé et contrôle de lisibilité des cartouches.
- [x] N3.06 Appliquer les tokens de thème et exceptions hero/page.
- [x] N3.07 Valider le hero photographique dans les trois modes avant la vidéo.
- [x] N3.08 Ajouter vidéo web avec poster et commandes pause/reprise (`HeroSection.tsx`, `publishDocumentRuntime.ts`).
- [x] N3.09 Gérer son désactivé par défaut (`muted`), autoplay refusé et média non pris en charge.
- [x] N3.10 Suspendre hors section/onglet actif (`visibilitychange`) et nettoyer ressources au démontage.
- [x] N3.11 Respecter réduction des mouvements (`prefers-reduced-motion`) avec poster comme rendu de repli.
- [x] N3.12 Exiger image choisie/poster pour la brochure (`MISSING_VIDEO_POSTER` dans `brochurePreflight.ts`) ; signaler son absence.
- [x] N3.13 Embarquer ressources autorisées en HTML/ZIP et vérifier liens après réimport (`resolveRelativeImages` dans `io.ts`).
- [x] N3.14 Tester fond absent, réseau lent, petit écran et contraste réel.
Porte N3 : couverture cohérente web/PDF ; vidéo contrôlable et transposition statique explicite (`scripts/verify-n3.mjs`).

## N4 — Parcours animés et véhicules
- [x] N4.01 Séparer géométrie, style de ligne, véhicule et paramètres temporels dans le modèle (`RouteAnimationConfig`).
- [x] N4.02 Ajouter catalogue avion/bateau/voiture/bus/train/vélo/personnage et licences (`src/core/vehicleCatalog.ts`).
- [x] N4.03 Définir géométries dessinées/importées ; aucun faux calcul routier implicite.
- [x] N4.04 Implémenter interpolation selon distance et orientation selon cap local (`src/core/routeInterpolation.ts`).
- [x] N4.05 Tester arrêts, doublons, ligne courte, changement de sens et antiméridien (`shortestDeltaLng`).
- [x] N4.06 Construire contrôleur `idle/playing/paused/completed` avec horloge temporelle (`src/core/vehicleController.ts`).
- [x] N4.07 Ajouter `play/pause/replay/seek/stop` et durée paramétrable.
- [x] N4.08 Synchroniser le segment animé aux étapes du mode 1 (`Player.tsx`, `publish.ts`).
- [x] N4.09 Synchroniser le véhicule aux scènes/associations de la carte connectée du mode 2 (`publishDocumentRuntime.ts`).
- [x] N4.10 Proposer caméra fixe/accompagnante et suspension lors d’interaction de lecture (`notifyUserMapInteraction`).
- [x] N4.11 Ajouter révélation progressive indépendante du style complet de la ligne (`slicePathByProgress`).
- [x] N4.12 Annuler les frames sur changement de page/projet, pause et démontage (`destroy`).
- [x] N4.13 Définir suspension/reprise après onglet masqué sans saut temporel accidentel (`notifyVisibilityChange`).
- [x] N4.14 Restaurer animation et progression après changement de fond/perte WebGL.
- [x] N4.15 Séparer élément de positionnement MapLibre et animation CSS interne (`.vehicle-marker-wrap` + `.vehicle-marker-icon`).
- [x] N4.16 Respecter réduction des mouvements ; position statique par défaut adaptée.
- [x] N4.17 Exporter le contrôleur commun dans les HTML/ZIP des modes 1/2.
- [x] N4.18 Définir position statique, tracé et repères de la brochure (`static-print-vehicle` dans `publishBrochureRuntime.ts`).
- [x] N4.19 Tester passage rapide d’étapes, interruption, retour arrière et fin de parcours.
- [x] N4.20 Vérifier que l’animation ne recrée pas de carte ni de contexte à chaque frame.
Porte N4 : véhicule orienté, pilotable et publié fidèlement ; brochure intelligible sans animation (`scripts/verify-n4.mjs`).

## N5 — Recette, performances et documentation
- [x] N5.01 Compléter tests purs héritage, migrations, interpolation et transposition statique.
- [x] N5.02 Tester les fonctions de production plutôt que recopier leur logique.
- [x] N5.03 Exécuter tests DOM/runtime de palette/focus/mobile et média de fond.
- [x] N5.04 Exécuter une lecture complète avec véhicule, pause et changement de page en VM.
- [x] N5.05 Tester changement de thème pendant édition et nouvelle publication.
- [x] N5.06 Ouvrir HTML/ZIP hors de l’éditeur puis réimporter sans perte de ressources.
- [x] N5.07 Vérifier la brochure HTML A4 imprimable, poster, textes, crédits et verrouillage avant impression (note : rastérisation PDF finale déléguée au pilote d'impression navigateur).
- [x] N5.08 Tester charge multi-cartes, ressources volumineuses et contextes WebGL libérés.
- [x] N5.09 Tester réseau absent, médias manquants et récupération après erreur de sauvegarde.
- [x] N5.10 Rejouer les suites historiques (`test:p0` à `test:p6`) et le build sur le commit livré.
- [x] N5.11 Comparer circuit touristique et présentation territoriale dans les trois modes.
- [x] N5.12 Contrôler $\le 195$ lignes des sources maintenues.
- [x] N5.13 Mettre à jour wiki : thème, catalogue, animations, hero, exports et limites (`wiki/verification/N5-acceptance.md`).
- [x] N5.14 Publier rapport avec commit, environnement, journaux, artefacts et non-testés.
Porte finale : validée par `scripts/verify-n5.mjs`, `npm test` et `npm run build`.
