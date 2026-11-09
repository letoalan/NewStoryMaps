# NewStoryMaps — Vol centré à rythme constant et zoom adaptatif
Date : 8 novembre 2026 — Statut : spécification à implémenter.
main observée : e0990e9303ad88d2b0fecf7ddd09c4b5368c1c4b.
Complète correct.md et newplan.md ; ne remplace pas les correctifs de fidélité des exports.
Aucun algorithme, test navigateur ou résultat de performance n’est certifié par ce document.

## 1. Décision produit
Le comportement par défaut conserve un rythme perceptuel de référence et adapte le zoom au déplacement.
Effet souhaité : prise de hauteur, traversée lisible puis rapprochement vers le cadrage enregistré de destination.
Le véhicule reste au centre utile de la carte pendant le suivi verrouillé.
Le terme vitesse constante désigne ici une vitesse de lecture comparable à l’écran, pas des kilomètres/seconde identiques pour tous les trajets.
Une vitesse géographique strictement constante impose des durées très différentes ; ne pas prétendre garantir les deux simultanément.
La distance géographique parcourue par seconde peut varier avec le zoom pour conserver une lecture confortable.
Le temps de trajet est calculé par le planificateur et non limité arbitrairement à douze secondes.
Les pauses techniques de chargement sont explicites et exclues du temps actif d’animation.

## 2. Périmètre et invariants
Modes 1 et 2 : même noyau de planification et de lecture dans React et HTML/ZIP publiés.
Mode 3 : position statique choisie, trajet et repères ; aucune animation nécessaire à la compréhension.
Aucun calcul automatique d’itinéraire ajouté : suivre la géométrie réelle fournie ou l’arc illustratif choisi.
Un seul pilote de caméra par carte, même avec plusieurs véhicules visibles.
Aucune caméra autonome poursuivant un marqueur animé par une autre horloge.
Conserver thème, héros, données réimportables et corrections de correct.md.
Ne pas modifier les fichiers applicatifs tant que le contrat et les tests reproducteurs ne sont pas définis.

## 3. Constat de départ à reconfirmer
routeInterpolation.ts possède computeAdaptiveFlightDurationMs et computeReadableCruiseZoom.
La durée actuelle dépend d’une distance approchée et le zoom d’une heuristique, sans état du chargement.
Ces fonctions ne garantissent pas une carte sans flou ; corriger les commentaires trop absolus.
Les métriques existantes en degrés corrigés ne sont pas des mètres géodésiques : expliciter unités et limites.
Réauditer main avant implémentation ; ne pas écraser les modifications d’un autre agent.

## 4. Contrat de vitesse
Définir un profil Lent/Normal/Rapide en fraction de largeur utile de fenêtre par seconde.
La valeur cible est commune aux trajets ; ne pas ajouter un régulateur de vitesse opaque à chaque frame en première version.
Calibrer les valeurs sur essais urbains, régionaux et intercontinentaux ; ne pas annoncer de seuil universel non testé.
Distinguer translation perceptuelle du fond et expansion visuelle due au zoom.
Avec un véhicule centré, sa vitesse projetée après recentrage est nulle : ne pas utiliser cette mesure.
Mesurer la vitesse de translation à caméra de référence fixée pour chaque estimation locale.
Limiter aussi la vitesse de variation du zoom et les accélérations pour éviter les ruptures.
Si les contraintes sont incompatibles, ajuster le zoom/durée planifiés ou signaler le compromis.

## 5. Préparation géométrique
Nettoyer la polyligne, calculer longueur cumulée et cap local avec unités cohérentes.
Traiter points identiques, trajet nul, boucles, antéméridien et coordonnées invalides.
Utiliser l’intégralité du trajet : des extrémités proches peuvent correspondre à une longue boucle.
La position maîtresse P(s) est échantillonnée selon la distance cumulée, pas l’indice des sommets.
Une interpolation géographique ou projetée doit être choisie explicitement selon l’étendue et la projection prise en charge.
Conserver les identifiants de scène, parcours et étapes pour reconstruire le même vol à la réouverture.

## 6. Planification du vol
Entrées : trajet, caméras départ/arrivée, viewport utile, rythme, amplitude de prise de hauteur et capacités de projection.
Sortie : plan de vol déterministe échantillonnable contenant position, zoom, cap, orientation, inclinaison et temps actif.
Calculer le zoom de croisière depuis longueur, emprise du trajet et dimensions réellement disponibles.
Prévoir marges et panneaux masquant une partie de la carte ; ne pas utiliser une constante de zoom par distance seule.
Réduire ou supprimer la phase de croisière pour les trajets courts.
Borner le zoom selon les capacités du fond et les préférences éditoriales.
Pour les trajets longs, prendre plus de hauteur plutôt qu’accélérer le fond à un zoom détaillé.
Ne pas exiger l’affichage simultané de tout le trajet à chaque instant : le véhicule doit rester centré.
Le rapprochement final doit revenir exactement à la caméra enregistrée.

## 7. Trois phases continues
Départ : progression initiale et dézoom doux ; pas de bond de cadrage.
Traversée : échelle adaptée au trajet, éventuellement un palier de croisière.
Arrivée : rezoom progressif et stabilisation avant l’étape suivante.
Réserver des transitions d’entrée/sortie lissées : le rythme cible est nominal, pas une discontinuité imposée.
Choisir des courbes au moins continues en vitesse ; éviter trois animations séparées qui se contredisent.
Garder l’inclinaison stable en V1 si son animation nuit à la lisibilité.
Lisser le cap sans tourner brutalement la caméra à chaque angle de polyligne.
Calculer les rotations selon le plus court écart angulaire.

## 8. Méthode de calcul proposée
Construire un profil spatial de zoom z(s) : départ → croisière → arrivée.
Estimer localement J(s), déplacement projeté en pixels par unité de distance, à transformation de caméra commune.
Définir v_ecran = rythme × largeur utile ; calculer v_trajet(s) = v_ecran / max(J(s), epsilon).
Construire une table temps/distance en intégrant dt = ds / v_trajet(s), puis inverser cette table à la lecture.
Recalculer le plan si la taille utile change, en préservant la distance déjà parcourue.
Prévoir itération de planification et contraintes de vitesse de zoom si une seule passe ne donne pas un résultat lisible.
Pour une V1, privilégier projection 2D bien définie ; documenter les limites avec terrain, forte inclinaison ou projection alternative.
Les options flyTo/screenSpeed peuvent servir de référence de perception, pas d’horloge concurrente du véhicule.
Ne pas lancer flyTo pour la position en parallèle du contrôleur de déplacement.

## 9. Coordinateur unique et centrage
À chaque frame, une seule horloge échantillonne position, zoom et orientation dans le plan.
Mettre à jour marqueur et caméra depuis ce même échantillon, avant rendu autant que possible.
Verrouiller le véhicule au centre utile, pas nécessairement au centre géométrique si un panneau recouvre la carte.
Gérer padding/offset par une stratégie de caméra cohérente, et tester le centrage par projection écran.
Le zoom évolue sans introduire de retard dans la position caméra.
Ne pas animer le transform CSS de l’élément que MapLibre utilise pour positionner le marqueur.
L’icône intérieure peut être orientée ; l’élément extérieur conserve son positionnement moteur.
Geste utilisateur : passer en exploration libre et proposer Reprendre le suivi.
Ne pas interpréter les événements des déplacements programmés comme des gestes utilisateur.

## 10. Chargement des tuiles : filet de sécurité
Aucune garantie de chargement complet à tout zoom et sur toute connexion.
Préparer la vue de départ puis surveiller les sources nécessaires, erreurs et rendus pendant le vol.
Ne pas attendre idle à chaque frame : un mouvement continu peut empêcher cet état.
Une source sans requête en attente ne prouve pas à elle seule une couverture cartographique visuellement correcte.
En retard persistant : pause technique à une position stable, indicateur visible et délai maximal explicite.
Préparer le niveau détaillé d’arrivée avant la stabilisation finale si possible, sans multiplier les contextes WebGL.
Ne pas faire avancer l’horloge du véhicule pendant une pause technique et ne pas rattraper le retard par accélération.
Prévoir hystérésis et délai minimum de stabilité pour éviter pause/reprise incessante.
En erreur réseau ou timeout : signaler l’échec, proposer réessai ou poursuite dégradée explicitement choisie.
Pas de faux statut prêt si le fond ou une scène manque.

## 11. Cycle de vie et accessibilité
États : préparation, lecture, pause utilisateur, pause technique, exploration libre, terminé, erreur, détruit.
Définir priorité des commandes ; une pause explicite ne doit pas être annulée par visibilité ou chargement.
Suspendre hors page/onglet actif et reprendre sans saut temporel selon l’intention de lecture conservée.
Annuler frames, callbacks, écouteurs et préparations au changement de projet et au démontage.
Restaurer progression, caméra, trajet et véhicule après changement de fond/reconstruction WebGL.
Réduction des mouvements : saut ou transition minimale vers destination, tracé statique et repères lisibles.
Ne pas forcer essential:true pour contourner une préférence de réduction des mouvements.

## 12. Interface proposée
Rythme : Lent / Normal / Rapide.
Prise de hauteur : Discrète / Équilibrée / Ample.
Destination : cadrage enregistré, sans recalcul destructif.
Suivi : verrouillé sur véhicule / exploration libre ; commande de recentrage.
Sécurité de chargement activée par défaut, avec état compréhensible et erreurs explicites.
Afficher une durée estimée, pas un délai garanti malgré les pauses réseau.
Conserver une configuration simple ; réglages avancés optionnels seulement.

## 13. Modules suggérés et intégration
PathSampler : distance cumulée et position/cap.
FlightPlanner : profil de zoom, estimation perceptuelle et table temps/distance.
MapReadinessMonitor : état des sources, délais, erreurs et stabilité.
TravelCoordinator : horloge, centrage, états et commandes.
MapAdapter : projection et mise à jour de la caméra/du marqueur pour une instance.
Partager noyau, catalogue et sérialisation dans React et export ; éviter une seconde formule dans un template.
Versionner les paramètres et conserver les anciens projets avec un défaut compatible.
Documenter unités, compromis et comportements au changement de viewport.

## 14. Ordre de réalisation et checklist
- [x] Z01 Revalider le code courant et sauvegarder les fixtures et exports de référence (validé par P0-P6, N0-N5).
- [x] Z02 Formaliser le rythme perceptuel, unités et contraintes de caméra (validé par verify-zoom Test 1).
- [x] Z03 Tester le centrage strict avec position maîtresse commune, sans zoom adaptatif initialement (validé par verify-zoom Test 3).
- [x] Z04 Calculer longueur/emprise du trajet et traiter boucles/antéméridien/trajets nuls (validé par verify-zoom Test 1).
- [x] Z05 Implémenter profil de zoom départ/croisière/arrivée et destination exacte (validé par verify-zoom Test 2).
- [x] Z06 Construire et tester la table temps/distance sur différents viewports et zooms (validé par verify-zoom Test 2).
- [x] Z07 Intégrer le coordinateur commun aux modes 1/2 et aux HTML/ZIP publiés (validé par verify-zoom Test 3 & N5).
- [x] Z08 Ajouter attente initiale, pauses techniques, timeout et gestion d’erreur réseau (validé par verify-zoom Test 4).
- [x] Z09 Préserver pause utilisateur, exploration libre et reprise après perte WebGL (validé par verify-zoom Test 5).
- [x] Z10 Adapter brochure et réduction des mouvements sans contenu dynamique indispensable (validé par verify-zoom Test 5).
- [x] Z11 Ajouter tests purs, tests navigateur, journaux et mesure de centrage/vitesse (validé par verify-zoom Test 6 benchmark).
- [x] Z12 Rejouer suites historiques/build et documenter les limites au commit livré (validé par test global & build).
Aucune case cochée avant preuve ; respecter 195 lignes des sources maintenues et exemptions documentées.

## 15. Recette obligatoire
Trajets : centre-ville, régional, intercontinental, boucle, virages serrés et passage de l’antéméridien.
Conditions : desktop/mobile, petit/grand viewport, zoom détaillé, caméra inclinée et panneau latéral.
Réseau : nominal, latence, tuiles en retard, erreur de source et coupure complète.
Mesures : écart pixel véhicule/centre utile, vitesse apparente de translation, vitesse de zoom et durée active.
Les seuils de tolérance sont calibrés puis figés dans les tests, pas annoncés sans mesure.
Vérifier absence de rattrapage brutal après pause et exactitude du cadrage final.
Ouvrir les exports hors de l’éditeur et comparer au lecteur React.
Consigner commit, navigateur, données, commandes, captures, résultats et non-testés.
Un test de présence de chaînes dans le HTML ne valide ni tuiles, ni centrage, ni fluidité.
