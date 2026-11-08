# NewStoryMaps — Tâches thème, ergonomie, hero et animations
Date : 8 novembre 2026 — Référence : newplan.md.
Baseline : 6f1cbbe7138929538fe87b3605975a8d0bc4a7b6.
Toutes les tâches sont ouvertes ; aucune exécution ni réalisation présumée.
Ordre : N0 → N1 → N2 → N3 → N4 → N5 ; tests écrits avec chaque lot.
Préserver les trois modes et les correctifs des plans précédents.

## N0 — Baseline et contrats
- [ ] N0.01 Identifier le commit de travail et coordonner les autres agents.
- [ ] N0.02 Sauvegarder fixtures historiques, circuit touristique et document multi-pages.
- [ ] N0.03 Exécuter suites existantes et build ; consigner résultats et erreurs avant modification.
- [ ] N0.04 Cartographier lecteurs React, export mode 1, export enrichi et sortie brochure.
- [ ] N0.05 Définir matrice blocs/capacités/supports et conditions de dégradation statique.
- [ ] N0.06 Versionner les nouveaux champs et tester migration sans changement du rendu ancien.
- [ ] N0.07 Distinguer document éditable, profil de lecture et profil de publication.
Porte N0 : contrats documentés et baseline reproductible, sans régression masquée.

## N1 — Palette flottante et ergonomie d’édition
- [ ] N1.01 Extraire la palette du carré via portail ou couche équivalente.
- [ ] N1.02 Ancrer au + et adapter position aux limites viewport, scroll et zoom.
- [ ] N1.03 Définir taille lisible, groupes et libellés ; aucune coupure par overflow.
- [ ] N1.04 Partager le catalogue entre insertion et remplacement de contenu.
- [ ] N1.05 Filtrer les choix selon mode et alternatives statiques disponibles.
- [ ] N1.06 Gérer Échap, extérieur, focus initial, retour au déclencheur et navigation clavier.
- [ ] N1.07 Fournir un panneau inférieur adapté aux petits écrans.
- [ ] N1.08 Fermer proprement si l’ancre disparaît ou si la page change.
- [ ] N1.09 Ajouter inspecteur/dialogue pour les propriétés détaillées des blocs.
- [ ] N1.10 Conserver barre contextuelle courte et sélection stable.
- [ ] N1.11 Tester cellule unitaire/fusionnée, bords de page et conteneur défilant.
- [ ] N1.12 Vérifier qu’ouvrir/fermer la palette ne modifie ni document ni historique.
Porte N1 : menu lisible et accessible sans agrandir la cellule, en document et brochure.

## N2 — Thème commun et structures
- [ ] N2.01 Définir tokens identité, typographie, couleurs, surfaces et conteneurs.
- [ ] N2.02 Définir héritage application/projet/page/bloc et exceptions explicites.
- [ ] N2.03 Implémenter resolveVisualStyle et tests purs de priorité/fallback.
- [ ] N2.04 Migrer brand/appearance sans deux sources concurrentes.
- [ ] N2.05 Ajouter réglages projet et commande Revenir au style hérité.
- [ ] N2.06 Importer logo local ; référencer crédits et ressources de polices.
- [ ] N2.07 Conserver l’entrée simple deux polices/trois couleurs ; options avancées contextuelles.
- [ ] N2.08 Appliquer titres, textes, légendes, cartouches et fond au mode 1.
- [ ] N2.09 Appliquer les mêmes tokens aux pages/blocs des modes 2/3.
- [ ] N2.10 Raccorder lecteurs, HTML autonome et impression à la même résolution de thème.
- [ ] N2.11 Vérifier que les styles de l’interface ne fuient pas dans les publications.
- [ ] N2.12 Ajouter bordure héritée/personnalisée/absente, rayon, ombre et padding.
- [ ] N2.13 Séparer opacité du fond et opacité du contenu.
- [ ] N2.14 Garder les contours d’édition visibles mais exclus de toutes les sorties.
- [ ] N2.15 Définir modèles de structure distincts des styles visuels.
- [ ] N2.16 Prévisualiser toute transformation de structure, préserver blocs et permettre annulation.
- [ ] N2.17 Mesurer contrastes des préréglages et signaler les combinaisons problématiques.
- [ ] N2.18 Tester changement global avec une exception locale conservée.
- [ ] N2.19 Tester sauvegarde/réouverture et aller-retour JSON/HTML/ZIP du thème complet.
Porte N2 : une charte modifiée se propage aux rendus sans casser les exceptions ni les contenus.

## N3 — Hero, photos et vidéo de fond
- [ ] N3.01 Définir hero/section de couverture sans créer un quatrième mode.
- [ ] N3.02 Modéliser couleur, média unique, voile et contenu au-dessus.
- [ ] N3.03 Importer une photo avec crédit, alternative et gestion de ressource portable.
- [ ] N3.04 Ajouter cover/contain, point focal, alignement et hauteur.
- [ ] N3.05 Ajouter voile uni/dégradé et contrôle de lisibilité des cartouches.
- [ ] N3.06 Appliquer les tokens de thème et exceptions hero/page.
- [ ] N3.07 Valider le hero photographique dans les trois modes avant la vidéo.
- [ ] N3.08 Ajouter vidéo web avec poster et commandes pause/reprise.
- [ ] N3.09 Gérer son désactivé par défaut, autoplay refusé et média non pris en charge.
- [ ] N3.10 Suspendre hors section/onglet actif et nettoyer ressources au démontage.
- [ ] N3.11 Respecter réduction des mouvements avec poster comme rendu de repli.
- [ ] N3.12 Exiger image choisie/poster pour la brochure ; signaler son absence.
- [ ] N3.13 Embarquer ressources autorisées en HTML/ZIP et vérifier liens après réimport.
- [ ] N3.14 Tester fond absent, réseau lent, petit écran et contraste réel.
Porte N3 : couverture cohérente web/PDF ; vidéo contrôlable et transposition statique explicite.

## N4 — Parcours animés et véhicules
- [ ] N4.01 Séparer géométrie, style de ligne, véhicule et paramètres temporels dans le modèle.
- [ ] N4.02 Ajouter catalogue avion/bateau/voiture/bus/train/vélo/personnage et licences.
- [ ] N4.03 Définir géométries dessinées/importées ; aucun faux calcul routier implicite.
- [ ] N4.04 Implémenter interpolation selon distance et orientation selon cap local.
- [ ] N4.05 Tester arrêts, doublons, ligne courte, changement de sens et antéméridien.
- [ ] N4.06 Construire contrôleur idle/playing/paused/completed avec horloge temporelle.
- [ ] N4.07 Ajouter play/pause/replay/seek/stop et durée paramétrable.
- [ ] N4.08 Synchroniser le segment animé aux étapes du mode 1.
- [ ] N4.09 Synchroniser le véhicule aux scènes/associations de la carte connectée du mode 2.
- [ ] N4.10 Proposer caméra fixe/accompagnante et suspension lors d’interaction de lecture.
- [ ] N4.11 Ajouter révélation progressive indépendante du style complet de la ligne.
- [ ] N4.12 Annuler les frames sur changement de page/projet, pause et démontage.
- [ ] N4.13 Définir suspension/reprise après onglet masqué sans saut temporel accidentel.
- [ ] N4.14 Restaurer animation et progression après changement de fond/perte WebGL.
- [ ] N4.15 Séparer élément de positionnement MapLibre et animation CSS interne.
- [ ] N4.16 Respecter réduction des mouvements ; position statique par défaut adaptée.
- [ ] N4.17 Exporter le contrôleur commun dans les HTML/ZIP des modes 1/2.
- [ ] N4.18 Définir position statique, tracé et repères de la brochure.
- [ ] N4.19 Tester passage rapide d’étapes, interruption, retour arrière et fin de parcours.
- [ ] N4.20 Vérifier que l’animation ne recrée pas de carte ni de contexte à chaque frame.
Porte N4 : véhicule orienté, pilotable et publié fidèlement ; brochure intelligible sans animation.

## N5 — Recette, performances et documentation
- [ ] N5.01 Compléter tests purs héritage, migrations, interpolation et transposition statique.
- [ ] N5.02 Tester les fonctions de production plutôt que recopier leur logique.
- [ ] N5.03 Exécuter tests navigateur de palette/focus/mobile et média de fond.
- [ ] N5.04 Exécuter une lecture complète avec véhicule, pause et changement de page.
- [ ] N5.05 Tester changement de thème pendant édition et nouvelle publication.
- [ ] N5.06 Ouvrir HTML/ZIP hors de l’éditeur puis réimporter sans perte de ressources.
- [ ] N5.07 Produire un PDF réel ; contrôler cartes, poster, textes, crédits et débordements.
- [ ] N5.08 Tester charge multi-cartes, ressources volumineuses et contextes WebGL libérés.
- [ ] N5.09 Tester réseau absent, médias manquants et récupération après erreur de sauvegarde.
- [ ] N5.10 Rejouer les suites historiques et le build sur le commit livré.
- [ ] N5.11 Comparer circuit touristique et présentation territoriale dans les trois modes.
- [ ] N5.12 Contrôler 195 lignes des sources maintenues avec exemptions documentées.
- [ ] N5.13 Mettre à jour wiki : thème, catalogue, animations, hero, exports et limites.
- [ ] N5.14 Publier rapport avec commit, environnement, journaux, artefacts et non-testés.
Porte finale : aucune promesse visuelle validée par seule présence d’une chaîne dans le HTML.

## Hors périmètre de cette livraison
- Montage vidéo, timeline, export MP4 et nouvelle vidéo promotionnelle de landing.
- Calcul automatique d’itinéraires routiers, ferroviaires ou maritimes.
- Animation articulée des personnages, roues ou pédalage.
- Éditeur libre de couches vidéo arbitraires et parallaxe avancée.
Ces extensions exigent un cadrage distinct avant développement.
