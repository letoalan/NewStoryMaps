# NewStoryMaps — Mode 2 : composition web et interactions
Date : 8 novembre 2026 — Statut : spécification avant implémentation.
Référence distante observée : f4b4d18b03c21d24d53d8dd33ee15955f66cce80.
Complète mode3.md, newplan.md, correct.md et zoom.md ; ne les remplace pas.
Aucune fonction ni recette nouvelle n’est déclarée réalisée par ce document.

## 1. Intention et frontières
Faire du mode 2 un atelier de narration web responsive plutôt qu’une page papier réduite à l’écran.
Conserver les trois modes : récit simple, document enrichi, brochure statique.
La présentation est un profil de lecture ; pas de quatrième atelier.
Partager avec le mode 3 sélection, commandes, typographie, images, thème, ressources et inspecteur.
Différencier les sorties : sections adaptatives et interactions web contre pages physiques statiques.
Aucun référentiel de formation, barème ou score pédagogique intégré.
Préserver les projets existants ; toute migration de pages vers sections est explicite et non destructive.

## 2. Diagnostic de référence et principes
Les captures montrent une base hero/photo/citation/carte et des commentaires associés.
Les cadres accentués omniprésents, commandes internes et petits cartouches brouillent la hiérarchie.
Le vide de grille ne doit pas devenir automatiquement un vide publié sans intention éditoriale.
Ne pas déduire d’une capture seule la cause d’un fond cartographique incomplet.
Séparer apparence du document, aides d’édition et état interactif du lecteur.
Vocabulaire publié : Voir sur la carte, Explorer, Afficher ; aucun badge technique highlight/zoom imposé.

## 3. D0 — Contrat documentaire et architecture
Introduire Document → Sections → Blocs sans créer un modèle concurrent de contenus.
Réutiliser les identifiants de blocs et cartes ; ajouter sectionId, ordre de lecture et dispositions par breakpoint.
Conserver les pages existantes comme sections de référence ou via un adaptateur versionné testé.
Une migration ne modifie ni contenu ni association sans aperçu et rapport explicite.
Distinguer configuration persistante et état de lecture temporaire ; aucun clic de visiteur ne réécrit le projet.
Raccorder création, normalisation, compactage, stockage, export et réimport de tous les champs.
Préserver mode 1 et conversion statique vers mode 3.

## 4. D1 — Atelier et grille
Pages/sections à gauche, zone de composition au centre, inspecteur contextuel à droite.
Conserver palette flottante au + ; déplacer les formulaires détaillés hors des petits carrés.
Afficher dimensions du viewport simulé et échelle d’atelier séparément.
Conserver cellules carrées comme ossature guidée ; un bouton ne doit pas remplir tout son cadre.
Proposer largeurs contenue/pleine largeur et hauteur auto, minimale ou liée au viewport selon section.
Le mode grille de référence conserve la composition ; le mode fluide recompose sans supprimer de contenu.
Contrôler débordements, collisions et réserves vides ; pas de compactage automatique destructif.
Aperçu sans outils utilisant le même contrat de rendu que la publication.

## 5. D2 — Modèles de sections
Couverture : média, titre, sous-titre et action Découvrir vers la section suivante.
Texte–image : deux colonnes avec légende, introduction et citation de hauteur adaptée.
Carte–récit : carte lisible et fiches narratives, éventuellement carte persistante au défilement.
Galerie : images et légendes ; informations : tableau, sources et encadrés ; conclusion : synthèse/liens.
Modèles neutres et personnalisables ; aucun contenu touristique obligatoire.
Prévoir une variante carte large/détails locaux plutôt qu’imposer une bande verticale.
Réutiliser les outils du mode 3 mais ne pas imposer A4 ni pagination papier à la lecture web.
Appliquer un modèle avec aperçu, annulation et traitement de tous les contenus excédentaires.

## 6. D3 — Responsive et thème
Définir dispositions desktop/tablette/mobile plutôt qu’une simple réduction uniforme.
Stocker un contenu commun et un ordre de lecture explicite ; éviter trois copies indépendantes.
Mobile : image puis texte, carte de hauteur utilisable et commandes sans petits carrés illisibles.
Carte persistante seulement quand l’espace le permet ; alternative empilée sur petits écrans.
Gérer changement de breakpoint avec redimensionnement des cartes et conservation de l’état utile.
Styles de surfaces hérités : neutre, accent discret, mise en évidence et sans cadre.
Réutiliser themeResolver ; contour d’édition distinct de bordure publiée.
Propager polices, couleurs, fonds et exceptions locales dans lecteurs et exports.
Ne pas remplir les zones vides par du contenu inventé ni changer automatiquement l’ordre sémantique.

## 7. D4 — Composants de boutons
Ajouter un bloc Boutons : une ou plusieurs actions, disposition verticale/horizontale/grille et largeur auto/pleine largeur.
Ajouter des actions intégrées aux fiches : titre, texte, image éventuelle et bouton déplacés ensemble.
Permettre une tuile entièrement interactive pour une seule action, sans contrôles interactifs imbriqués.
Ne pas rendre toute une carte manipulable ou un lecteur média cliquable comme une tuile de navigation.
Les boutons héritent du thème : principal, secondaire, discret ou lien textuel ; exceptions limitées.
États : normal, survol, focus, actif, indisponible ; icône facultative avec libellé compréhensible.
Publier une navigation URL comme lien et une commande de page comme bouton natif.

## 8. D5 — Paramétrage simple
Assistant : texte visible → action → cible → options contextuelles → Tester → Valider.
Aucun identifiant technique, filtre JSON ou code à saisir par l’auteur dans le parcours simple.
Afficher une phrase de synthèse : Au clic sur X, faire Y sur Z.
Choisir dans la page : surligner uniquement les cibles compatibles puis sélectionner visuellement.
Carte : préciser vue, objet, couche ou cadrage enregistré dans un second choix.
Proposer aussi listes recherchables nommées pour accès clavier et projets longs.
Un trait de liaison temporaire peut matérialiser l’association en édition, jamais en publication.
Options avancées repliées : transition, bascule, état initial et retour à l’état de référence.

## 9. D6 — Catalogue d’actions et états
Socle carte : voir un lieu, repérer un objet, afficher une couche, isoler un site et vue générale.
Navigation : section, page ou URL ; contenu : déplier un texte, ouvrir une fiche, changer une vue de galerie.
Lecture : lecture/pause et rejouer un parcours via les contrôleurs partagés, sans second moteur temporel.
V1 prioritaire : navigation, zoom, surbrillance, couche et réinitialisation ; enrichissements ensuite.
Distinguer commande ponctuelle, bascule, choix exclusif et réinitialisation.
Bascule : libellé stable et état actif visible/aria-pressed ; dépliage : aria-expanded et cible contrôlée.
Choix exclusifs : modèle de groupe accessible adapté, pas plusieurs bascules contradictoires.
Vue générale restaure cadrage et états explicitement définis sans altérer les données de l’auteur.
Action sur un lieu : cibler le couple mapId/featureId ; aucune action ne pilote une autre carte implicitement.
Ne pas confondre mettre en évidence, filtrer les objets et activer une couche entière.

## 10. D7 — Commande composite encadrée
Proposer Explorer un lieu : sélectionner le repère, appliquer son cadrage et ouvrir la fiche associée.
Définir des sous-actions ordonnées et un comportement si la cible manque ; rapport clair à l’auteur.
Éviter en V1 un constructeur libre de scénarios et des enchaînements arbitraires de scripts.
Arbitrer le pilote caméra : suspendre le suivi véhicule selon zoom.md avant une exploration explicite.
Ne pas déclencher deux animations caméra concurrentes ; conserver une commande Reprendre le suivi.
Actions rapides répétées : annuler/remplacer proprement la commande précédente et borner les callbacks.

## 11. D8 — Édition, test et maintenance
En édition, clic sélectionne ; l’exécution passe par Tester ou l’aperçu.
Le test est temporaire, réinitialisable et ne modifie pas le contenu ni l’historique documentaire.
Panneau Interactions : déclencheur, action, cible nommée, état et diagnostic des références cassées.
Renommer/déplacer ne casse pas les liens ; duplication remappe les références internes et conserve les externes selon politique explicite.
Suppression de cible : avertissement et choix réparer/désactiver/supprimer, jamais changement silencieux de carte.
Import/réimport : validation des types et cibles ; actions inconnues conservées inactives ou import refusé explicitement.
Bouton non résolu : message utile en édition ; retour compréhensible et sûr en lecture.

## 12. D9 — Accessibilité et lecture mobile
Activation clavier/tactile, focus visible, nom accessible et absence d’interaction réservée au survol.
Aucun bouton dans un autre bouton ; aucune tuile interactive entourant des liens/contrôles actifs.
Ouverture de fiche/dialogue : focus géré, fermeture Échap et retour au déclencheur.
Défilement vers carte/section sur mobile sans déplacement de focus injustifié ; retour à la fiche disponible.
Respecter réduction des mouvements et préférences de lecture.
Distinguer commandes du hero, du document et du véhicule : une pause doit indiquer son périmètre.
Hero court/moyen/immersif, voile, point focal et pause discrète ; ne pas confondre navigation et lecture du fond.

## 13. D10 — Exécution partagée et sécurité
Contrat : Trigger → Action typée → Target stable → Parameters → State.
Noyau/exécuteur commun aux composants React et HTML publié ; adaptateurs DOM/MapLibre séparés.
Stocker des données validées, jamais du JavaScript auteur ; utiliser data-* et écouteurs non inline.
Valider protocoles URL, types, valeurs numériques et références avant publication.
Limiter les commandes aux capacités autorisées ; pas d’accès arbitraire au DOM ou à des services externes.
Conserver caméra, états temporaires, médias et animations dans un registre de lecture nettoyable.
Tester le véritable runtime publié avec cibles présentes, pas uniquement un DOM dont querySelectorAll retourne [].

## 14. D11 — Conversion et publications
HTML/ZIP : mêmes cartes, boutons, sections, profils et état initial que l’aperçu de référence.
Embarquer les ressources locales nécessaires ; aucune URL blob de session comme dépendance persistante.
Mode 3 : zoom devient renvoi numéroté ; dépliage devient texte/fiches ; couche devient carte dédiée ou sélection explicite.
Lien externe : lien PDF/URL, QR facultatif vérifié ; média : poster/résumé ; parcours : tracé et repères.
Présenter un rapport de conversion : conservé, transformé, à compléter ; aucune interaction cachant du contenu perdu.
Ne pas imprimer un bouton inopérant sans équivalent documentaire.
Le PDF est diffusé ; JSON/HTML/ZIP gardent la réédition selon les contrats existants.

## 15. Livraison et recette
Ordre : contrats → sections/atelier → responsive/thème → boutons → actions → parité/export → recette réelle.
Rester générique pour formations et usages ; pas de référentiel ni notation intégrée.
Tester deux cartes indépendantes, plusieurs couches, texte dépliable et galerie sur deux sections.
Tester clavier, mobile, retour de focus, suppression/duplication de cibles et actions rapides.
Comparer éditeur, aperçu et export ouvert hors application au même viewport et au même état initial.
Produire une brochure de transposition et vérifier l’absence de contenu perdu.
Sources maintenues : 195 lignes maximum avec exemptions documentées ; wiki mis à jour au fil de l’implémentation.
Rapport au commit livré : commandes, environnement, artefacts, résultats et non-testés ; aucune case sans preuve.
