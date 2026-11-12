# NewStoryMaps — Thème partagé, ergonomie et narration animée
Date : 8 novembre 2026 — Statut : spécification à implémenter.
Référence : 6f1cbbe7138929538fe87b3605975a8d0bc4a7b6 (P6V4).
Complète impl2.md, tasks2.md et les rapports de correction ; ne les remplace pas.
Aucune fonction ci-dessous n’est déclarée réalisée ni testée par ce document.

## 1. Intention et périmètre
Améliorer la lisibilité de l’édition, propager l’identité visuelle et animer les déplacements.
Conserver les trois modes existants : StoryMap simple, document enrichi, brochure statique.
La présentation est un profil de lecture des documents, pas un quatrième mode à créer.
La demande de menu pour les modes 3/4 vise ici les ateliers à blocs et leur présentation.
Ne pas réintroduire la vidéo promotionnelle de landing ni un mode de production vidéo.
Autoriser une vidéo de fond narrative dans les sorties web, avec équivalent statique en brochure.
Ne pas réécrire la stack React/TypeScript/MapLibre/Vite ni fragiliser les échanges historiques.
Toute nouveauté inclut édition, sauvegarde, réouverture, publication et adaptation statique.

## 2. Points d’entrée existants à réauditer
- EmptyCellMenu.tsx : menu actuellement absolu, limité à la cellule avec inset:0 et overflow:hidden.
- PageGrid.tsx et BlockContextMenu.tsx : insertion, sélection et propriétés des blocs.
- ProjectBrand : logo, deux polices et trois couleurs ; insuffisant pour un thème complet.
- route.ts : géométrie et styles avion/bateau, pas encore un contrôleur temporel de véhicule.
- Lecteurs React et générateurs HTML/print : vérifier tous les chemins, pas seulement l’aperçu.
Les arcs actuels sont des Bézier en longitude/latitude ; ne pas les appeler géodésiques.
Rebaser la mise en œuvre sur le commit réel et coordonner les autres agents.

## 3. Ordre de livraison
N0 : contrat des rendus, fixtures et baseline de non-régression.
N1 : menu d’insertion flottant et séparation insertion/édition.
N2 : thème commun et propagation à tous les supports.
N3 : hero photographique, surfaces et bordures ; vidéo ensuite.
N4 : véhicules animés sur trajets modes 1/2 et représentation statique.
N5 : recette navigateur, PDF, performances et documentation.
Ne pas attendre N5 pour écrire les tests ; chaque lot possède sa porte de réception.

## 4. N0 — Contrats et compatibilité
Définir des fixtures mode 1, document multi-pages et brochure avec médias et associations.
Lister les capacités de chaque bloc et de chaque support dans une matrice de rendu.
Versionner thème, hero, styles et animations ; fournir migrations et valeurs par défaut.
Ne pas effacer les champs inconnus ; refuser proprement une version non compatible.
Conserver JSON/HTML/ZIP réimportables, identifiants stables et sauvegarde locale.
Distinguer stockage éditable, rendu interactif et document PDF de diffusion.
Ne pas confondre export sans serveur et publication intégralement hors connexion.

## 5. N1 — Insertion flottante et inspecteur
Le + central d’un bloc/cellule vide ouvre une palette hors des limites de la grille.
Utiliser un portail ou équivalent ; ancrage au bouton, placement automatique et limites viewport.
La palette ne doit pas être découpée par les overflow de page ni nécessiter un agrandissement du bloc.
Prévoir taille lisible, groupes Texte/Médias/Carte/Documentation et libellés explicites.
Filtrer par capacités du mode ; la brochure n’offre pas de contenu dynamique sans alternative.
Réutiliser le même catalogue pour insertion et changement de type, sans perte silencieuse.
Gérer clavier, focus initial, Échap, clic extérieur, retour du focus et boutons nommés.
Mobile : panneau inférieur lisible ; ne pas réduire une palette bureau à une miniature.
Fermer/repositionner sur zoom, scroll, redimensionnement et disparition de l’ancre.
Bloc rempli : barre courte Modifier/Remplacer/Style/Lier/Dupliquer/Supprimer.
Les formulaires détaillés sont dans un inspecteur/dialogue, pas entassés dans les petits carrés.
Conserver l’état de sélection et l’historique ; aucun changement au contenu à la simple ouverture.

## 6. N2 — Modèle de thème partagé
Établir une source de vérité et une migration entre brand, appearance et les nouveaux tokens.
Hiérarchie : valeurs application → thème projet → adaptations page/section → exceptions bloc.
Stocker les références héritées ; ne pas recopier tous les styles effectifs dans chaque bloc.
Prévoir Modifier le thème et Revenir au style du projet à chaque niveau pertinent.
La modification globale préserve les exceptions locales explicitement définies.
Fonction pure cible : resolveVisualStyle(project, page, block, outputProfile).
Réutiliser son contrat dans éditeur, lecteurs, HTML publié et brochure ; éviter des valeurs hardcodées divergentes.
Tokens : logo ; polices titres/corps/légendes ; tailles ; interlignages ; couleurs sémantiques.
Surfaces : fond général/page/cartouche ; contraste ; marges internes ; espacements.
Conteneurs : bordure, couleur, épaisseur, rayon, ombre et transparence du seul fond.
Cartographie : couleurs parcours/figurés/surbrillance et véhicule par défaut.
Hero : média, point focal, cadrage, voile et position du contenu.
Importer des fichiers logo ; cataloguer les polices et leurs ressources/licences disponibles à l’export.
Deux polices et trois couleurs restent une entrée simple ; les réglages avancés sont contextuels.
Les CSS de l’interface et le thème du document ne doivent pas se contaminer.
Résoudre les valeurs selon le support ; préserver lisibilité papier et préférences de lecture.
Ne pas certifier les contrastes sans mesure sur les combinaisons effectivement produites.

## 7. Structure narrative et styles
Distinguer thème visuel et modèle de mise en page : une couleur n’est pas une transformation de structure.
Mode 1 : préréglages de panneaux flottants gauche/droite/centrés et juxtaposition si implémentée.
Modes 2/3 : préréglages de pages et cartouches respectant la grille et les contenus existants.
Appliquer une transformation structurelle avec aperçu, rapport de débordement et annulation.
Ne jamais déplacer, réduire ou supprimer silencieusement un contenu lors d’un changement de modèle.
La charte peut suggérer une structure initiale ; sa modification n’impose pas un nouveau placement.

## 8. Bordures et transparence des blocs
Distinguer fond du bloc, bordure publiée et contour technique de sélection dans l’éditeur.
Un bloc sans bordure reste sélectionnable et repérable par une aide d’édition non exportée.
Modes de style : hériter / personnaliser / sans fond ni bordure.
L’opacité de surface ne doit pas rendre texte, images ou commandes translucides.
Prévoir padding, rayon et ombre avec limites raisonnables et aperçu réel.
Le rendu d’impression n’inclut ni +, ni poignées, ni contours techniques.

## 9. N3 — Hero et arrière-plans narratifs
Définir un hero de couverture puis, si nécessaire, des fonds de page utilisant le même modèle.
Pile V1 : couleur → photo OU vidéo → voile de contraste → titre/logo/cartouches.
Ne pas construire un éditeur de montage multicouche arbitraire dans ce jalon.
Ces couches visuelles sont distinctes des calques géographiques de l’atelier carte.
Média : ressource locale importée ou URL, crédit, licence, alternative et poster.
Paramètres : cover/contain, point focal, alignement, hauteur, voile uni/dégradé et opacité.
Photo : commencer par ce parcours complet avant d’ajouter la vidéo.
Vidéo web : muette par défaut, commandes de pause, poster avant chargement, arrêt hors section active.
Gérer refus d’autoplay, erreurs, codecs non pris en charge et reprise sans état incohérent.
Respecter réduction des mouvements ; préférer le poster quand elle est activée.
Budgets médias explicites, chargement différé et libération des URL/ressources.
Brochure : image fixe choisie/poster obligatoire pour toute vidéo ; pas de capture aléatoire implicite.
Ne pas afficher un poster manquant comme une conversion réussie.
Pas de parallaxe dans la première version ; extension séparée si demandée.

## 10. N4 — Véhicules animés et trajets
Séparer géométrie, style de ligne, véhicule et comportement temporel.
Catalogue : avion, bateau, voiture, bus, train, vélo et personnage marcheur.
V1 : icône SVG orientée mobile ; roues, pédalage ou marche articulée hors périmètre initial.
Employer des ressources locales fiables avec licences conservées ; assainir les SVG importés ou limiter au catalogue.
Un véhicule suit le segment actif plutôt qu’un simple motif répété sur la ligne.
Évaluer l’interpolation selon la distance le long de la ligne, pas seulement selon le numéro de sommet.
Orientation selon le cap local ; traiter points identiques, arrêts, changement de sens et antéméridien.
Avion : arc illustratif ou trajet fourni ; bateau/route/rail : géométrie dessinée/importée.
Ne pas inventer un itinéraire routable en choisissant voiture/train ; calcul d’itinéraire hors périmètre.
Contrôleur commun aux lecteurs modes 1/2 et au runtime publié, sans dépendance à l’éditeur.
États : idle/playing/paused/completed ; play/pause/replay/seek/stop ; durée configurée.
Horloge fondée sur le temps ; annuler requestAnimationFrame au démontage et changement de document.
Suspendre hors page/onglet actif ; définir explicitement la reprise, sans saut temporel accidentel.
Synchroniser départ/arrivée avec chapitre ou association ; définir les transitions interrompues.
Caméra : fixe ou accompagnante ; pas de mouvement forcé pendant une interaction utilisateur.
Option de tracé révélé progressivement indépendante de la visibilité du trajet complet.
Réduction des mouvements : pas de déplacement non essentiel ; représentation statique lisible.
Conserver un élément de positionnement MapLibre distinct de toute animation CSS interne.
Ne pas recréer une carte par frame ; réutiliser source/symbole ou marqueur existant.
Restaurer véhicule, progression et couches après changement de fond ou reconstruction WebGL.
Brochure : trajet, repères et position choisie/départ/arrivée ; aucune animation nécessaire à la compréhension.

## 11. Publications et ressources
Chaque lot couvre mode 1, mode 2, présentation et mode 3 selon ses capacités.
Conserver les médias locaux dans les exports transportables, sans dépendance aux URL blob de session.
Prévoir poster vidéo et ressources typographiques dans le paquet selon licences.
Ne pas insérer du code provenant de données dans des attributs onclick ; utiliser data-* et écouteurs.
Valider URL, valeurs CSS, identifiants, nombres et types avant résolution/publication.
Signaler toute capacité non prise en charge avec conversion choisie, jamais suppression silencieuse.
PDF : vérifier sortie réelle, sélection de texte, crédits et images ; HTML imprimable n’est pas à lui seul une preuve.
Conserver une sauvegarde JSON/ZIP pour réédition, distincte du PDF diffusé.

## 12. Recette et définition de terminé
Tests purs : héritage/exceptions, migration, interpolation, pause/reprise et projection statique.
Tests d’intégration : export/réimport préserve thème, modèles, hero, ressources et animations.
Tests navigateur : palette non coupée, clavier, mobile, fond vidéo, trajet animé et changement de page.
Tester plusieurs cartes, ouvertures répétées, perte WebGL, réseau absent et médias manquants.
Comparer visuellement une même production dans éditeur, présentation, HTML autonome et PDF.
Un projet ancien garde son rendu par défaut ; aucune modification forcée à son ouverture.
Livrer un circuit touristique et une présentation territoriale déclinés sur les trois modes.
Limiter les sources maintenues à 195 lignes ; exemptions explicites pour tiers/licences/artefacts.
Mettre à jour le wiki, les contrats et les limites réseau au fur et à mesure.
Rapport : commit, environnement, commandes, journaux, artefacts, résultats et non-testés.
Ne pas appeler tests de bout en bout une simple recherche de chaînes dans le HTML.
