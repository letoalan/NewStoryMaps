# NewStoryMaps — Mode 3 : atelier PAO générique
Date : 8 novembre 2026 — Statut : spécification avant implémentation.
Référence distante observée : ccbfdd6d23de7c20ab9a66fa5d26a098916bc57b.
Périmètre validé : points 1 à 9 de la proposition de design magazine/brochure.
Le point 10 est exclu : aucun référentiel pédagogique, barème, score esthétique ou évaluation intégrée.
L’outil s’adapte à plusieurs formations, disciplines et usages professionnels.
Complète newplan.md, correct.md et les contrats existants ; ne remplace pas leur stabilisation.
Aucun test ni résultat applicatif n’est réputé acquis par ce document.

## 1. Intention et frontières
Faire du mode 3 un atelier de composition éditoriale, pas seulement une grille à remplir.
Permettre brochure, magazine, dossier illustré, fiche informative et document cartographique.
Les cartes sont un atout différenciant mais ne sont pas obligatoires sur toutes les pages.
Conserver les trois modes ; la présentation n’est pas un quatrième atelier.
Partager les primitives de blocs avec le mode 2 sans y imposer toutes les contraintes papier.
Mode 3 : contenus statiques ; tout contenu dynamique importé exige une transposition explicite.
Ne pas transformer le projet en clone complet de Canva/InDesign ni réécrire la stack.
Préserver sauvegardes, réimports, ressources, charte et corrections déjà intégrées.

## 2. M1 — Interface d’atelier séparée du document
Barre supérieure : document, annuler/rétablir, zoom, aperçu, contrôler et exporter.
À gauche : pages, miniatures et navigation ; au centre : plan de travail ; à droite : propriétés contextuelles.
Plan de travail neutre, page clairement distincte de son environnement et de ses outils.
Déplacer les formulaires détaillés hors des petites cellules.
Inspecteur : contenu, typographie, image, apparence, position et sources selon sélection.
Aperçu sans outils immédiat ; aucun +, poignée, formulaire ou contour technique dans les sorties.
Gérer panneaux repliables et accès clavier ; prévoir une organisation mobile adaptée.
Conserver la palette flottante de newplan.md, sans la réenfermer dans la cellule.

## 3. M2 — Trame discrète et précision progressive
Conserver les cellules carrées comme ossature guidée, pas comme esthétique imposée au document.
Afficher/masquer marges, colonnes, gouttières, repères et aimantation.
Niveau guidé : gabarits et grandes cellules ; niveau avancé : sous-grille plus fine, activée explicitement.
Définir avant codage la granularité et les règles d’aire de la sous-grille ; ne pas assouplir silencieusement le format existant.
Distinguer zone utile, cadre physique et résolution de rendu ; utiliser un modèle commun aux aperçus et à l’impression.
Les zooms d’atelier changent l’affichage, pas les dimensions éditoriales ni la qualité des images.
Préserver toutes les données lors de changement de format avec aperçu des adaptations et annulation.
Sur saturation, créer autant de pages de suite que nécessaire ou annuler ; ne jamais omettre un bloc.

## 4. M3 — Gestes de composition
Ajouter sélection multiple, déplacement, redimensionnement et commandes de position précises.
Proposer aligner gauche/droite/haut/bas/centres et distribuer les espacements.
Définir la référence : sélection, objet clé, page ou zone utile ; afficher les opérations impossibles.
Dupliquer, grouper/dégrouper, verrouiller/déverrouiller et organiser avant/arrière.
Distinguer ordre visuel de superposition et ordre de lecture documentaire.
Versionner zIndex, groupId, verrouillage et placements ; identifiants stables après duplication.
Les chevauchements intentionnels du niveau avancé sont explicites, pas des collisions tolérées accidentellement.
Niveau guidé : préserver les contraintes de placement ; niveau avancé : politique de superposition documentée.
Toutes les actions sont annulables et réalisables sans glisser-déposer obligatoire.
Ne pas confondre réduction d’un cadre et suppression de son contenu.

## 5. M4 — Typographie structurée
Styles génériques : titre de couverture, titre de rubrique, chapô, intertitre, corps, légende, crédit, info et appel à l’action.
Styles éditables au niveau projet, hérités par blocs et déclinables avec exception explicite.
Réutiliser le moteur de thème, les polices et leur gestion de ressources/licences.
Paramètres : police, graisse, taille, interlignage, alignement et espaces avant/après.
Conserver sémantique et ordre des titres indépendamment de leur seule taille visuelle.
Ne pas réduire automatiquement les caractères pour masquer un débordement.
Détecter les débordements réels une fois polices et dimensions stabilisées.
Proposer raccourcir, agrandir ou déplacer ; une zone défilante n’est pas une solution d’impression.
Préserver texte sélectionnable dans le PDF lorsque le moteur de sortie le permet, avec contrôle réel.

## 6. M5 — Images et cadres
Recadrage non destructif : image source conservée, transformation et point focal stockés séparément.
Déplacer l’image dans son cadre ; conserver le ratio ; aucune déformation par défaut.
Distinguer remplir le cadre et montrer toute l’image ; zoom de recadrage réversible.
Ajustements simples luminosité/contraste avec réinitialisation, sans remplacer la retouche spécialisée.
Séparer légende, crédit, licence et texte alternatif ; un crédit ne remplace pas une alternative.
Calculer la résolution effective à la taille d’impression selon pixels source et recadrage réellement utilisés.
Seuils de qualité configurables ; avertissement contextualisé plutôt qu’un verdict esthétique.
Aperçu à taille de lecture et alerte sur les infographies trop denses ; garder la décision à l’auteur.
Appliquer les mêmes transformations en éditeur, HTML et PDF ; vérifier orientation des images.

## 7. M6 — Carte comme document éditorial
Préréglages : situation, carte principale, détail, accès, circuit numéroté et comparaison.
Cadre de carte : cadrage spécifique, titre, légende, sources, crédits et repères associés.
Échelle et orientation facultatives selon le besoin, calculées pour la vue effectivement publiée.
Proposer carte large et détails locaux plutôt qu’une bande verticale imposée.
Ne pas modifier les données communes quand seul le cadrage éditorial d’un bloc change.
Conserver les cartes éditables dans le projet mais publier un résultat statique fiable en brochure.
Réutiliser l’atelier carte existant ; borner les contextes WebGL lors des rendus multi-pages.
Animations du mode 2 transposées en tracés, positions et repères lisibles sans interaction.

## 8. M7 — Gabarits professionnels génériques
Bibliothèque neutre, catégories et libellés configurables, sans dépendance au BTS Tourisme.
Socle : couverture, fiche informative, double page magazine, parcours/circuit et document promotionnel.
Variantes : destination, excursion, étude territoriale ou dossier disciplinaire comme exemples facultatifs.
Chaque gabarit associe des rôles de contenu, pas un texte institutionnel ni une grille d’évaluation.
Autoriser création depuis une page blanche, duplication et enregistrement d’un gabarit personnel.
Préserver les contenus lorsqu’un gabarit est appliqué à un document existant : aperçu, correspondance et rapport.
Double page : affichage de composition ; export en pages individuelles dans le bon ordre par défaut.
Définir page de couverture, pagination, éléments répétés et comportement des marges intérieures.
Pas d’imposition d’imprimerie automatisée dans la première livraison.

## 9. M8 — Contrôle de publication générique
Panneau de contrôle technique/editorial, jamais notation pédagogique ou jugement esthétique automatique.
Erreurs : texte effectivement coupé, ressource requise absente, scène manquante, bloc hors page, poster requis absent.
Avertissements : définition faible, petits caractères, contraste, crédits incomplets, liens à vérifier et styles incohérents.
Définir pour chaque contrôle son niveau de preuve : mesuré, heuristique ou non vérifié.
Ne pas annoncer lien/QR valide sans vérification correspondante ; ne pas assimiler crédit présent et licence autorisée.
Localiser le problème dans la page et offrir une action de correction ou une dérogation tracée lorsque possible.
Ne pas appeler anomalie une superposition explicitement autorisée dans un gabarit avancé.
Pas de score, compétence, référentiel de formation, barème ni bon à tirer pédagogique imposé.

## 10. M9 — Sorties et fidélité
PDF de diffusion et impression courante en première intention, avec dimensions physiques vérifiées.
Ne pas promettre PDF/X, CMJN, fonds perdus, accessibilité taguée ou conformité imprimeur sans réalisation dédiée.
HTML/JSON/ZIP restent des sources rééditables ; le PDF de diffusion n’est pas annoncé comme source éditable.
Tester page simple, double page, portrait/paysage, textes longs et images recadrées sur les sorties réelles.
Conserver sources, médias et styles dans le paquet portable, sans URL blob de session persistante.
Prendre en charge crédits et polices ; annoncer toute dépendance réseau résiduelle.
Ne pas considérer une recherche de chaînes dans le HTML comme preuve de la mise en page ou du PDF.

## 11. Modèle et architecture
Étendre les contrats existants plutôt que créer une seconde représentation des pages.
Conserver contenu sémantique, rectangle, ordre de lecture, superposition et style comme dimensions séparées.
Services suggérés : SelectionModel, LayoutCommands, TextStyles, ImageFrameTransform, PublicationChecks.
Commandes pures testables et contrôleur d’historique pour chaque opération composée.
Migration sans perte des projets antérieurs et validation des champs/nombres/ressources importés.
Réutiliser themeResolver, palette, catalogue, studio cartographique et exporteurs existants après audit.
Coordonner ce plan avec correct.md et zoom.md ; aucune régression du mode 1 pour satisfaire la PAO.
Sources maintenues : 195 lignes maximum ; exemptions explicites pour tiers/licences/artefacts.

## 12. Livraison et définition de terminé
Ordre : interface → trame/commandes → typographie/images → cartes/gabarits → contrôles/recette.
Tests écrits avec chaque lot ; ne pas attendre la fin pour vérifier sauvegarde et export.
Définir fixtures : brochure touristique, magazine culturel et fiche scientifique ou informative non touristique.
Contrôler clavier, petits écrans, annulation, sauvegarde, réouverture et réimport.
Produire des PDF réels ; contrôler dimensions, texte extrait, crédits, images et absence de coupes.
Rapport par commit : environnement, commandes, journaux, artefacts, résultats et non-testés.
L’outil reste générique : toute utilisation pédagogique dépend de l’enseignant, pas d’un référentiel intégré.

## 13. Hors périmètre explicite
Point 10 de la proposition antérieure : toute fonction d’évaluation pédagogique intégrée.
Score esthétique, notation de compétences, suivi individuel d’étudiants et référentiel imposé.
PAO professionnelle complète, retouche avancée, routage touristique automatique et imposition d’imprimeur.
Une extension future exige une nouvelle validation ; ne pas la glisser dans cette livraison.
