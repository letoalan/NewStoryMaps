# NewStoryMaps — Plan de reprise opérationnelle
Date : 11 novembre 2026 — Statut : instructions avant implémentation.
Baseline distante : 819d7f8c64d46f7b5ee4a93e4b1ee3f7faab5b47 (NEXT, 9 novembre).
Suivi exécutable par l’agent : reprise_tasks.md.
Audit de référence statique : aucun build, test npm, navigateur ou PDF reproduit indépendamment par cet audit.
Ce plan ordonne les travaux ; correct.md, zoom.md, mode2.md, mode3.md et leurs suivis restent les spécifications détaillées.
Ne pas considérer une tâche ancienne cochée comme preuve du fonctionnement réel.

## 1. Mission et limites
Livrer des parcours intégrés et vérifiables, pas une collection supplémentaire de modules non raccordés.
Conserver les trois modes : StoryMap simple, document web enrichi, brochure statique/PAO.
Conserver la présentation comme profil de lecture et la nature générique de l’outil.
Aucun référentiel de formation, barème ou score pédagogique intégré.
Ne pas réécrire React/TypeScript/MapLibre/Vite ni introduire un quatrième atelier.
Préserver projets, ressources, identifiants, stockage local et échanges historiques.
Ne pas effacer les anciens rapports ; consigner corrections, limites et preuves au nouveau commit.

## 2. Constats à reproduire avant correction
Le dernier commit ne modifie que PageGrid.tsx ; mode2tasks reste ouvert et mode3tasks ne coche que M0.
Le runtime documentaire lit t dans son intervalle sans déclaration visible : défaut prioritaire de publication.
Plusieurs moteurs de déplacement coexistent dans React et les scripts HTML générés.
Le planificateur utilise une table temps/distance linéaire, pas la régulation perceptuelle décrite dans zoom.md.
Le coordinateur de voyage et le moniteur de tuiles ne sont pas raccordés au lecteur React audité.
L’atelier reste centré sur une grille ; sections responsive, boutons et interface PAO complète sont encore à livrer.
Les proportions de PageGrid doivent être testées en navigateur avec hero et différentes tailles de conteneur.
Revalider ces constats sur le commit réel si main a évolué, sans écraser les travaux parallèles.

## 3. R0 — Baseline et garde-fous
Relever branche, HEAD, état de travail et environnement ; coordonner l’agent avec les autres interventions.
Créer une branche de travail locale dédiée selon le workflow du dépôt ; aucun reset destructif ou force-push.
Exécuter npm ci, npm test et npm run build ; conserver les erreurs initiales sans les masquer.
Archiver trois projets de référence et leurs exports : récit simple, document deux cartes, brochure.
Ajouter tests reproducteurs avant les corrections ; distinguer code présent, testé unitairement et reçu en navigateur.
Configurer une recette navigateur reproductible adaptée à la stack, par exemple Playwright, avec versions documentées.
Si l’environnement empêche navigateur ou PDF, déclarer ces contrôles bloqués/non exécutés plutôt que réussis.

## 4. R1 — Hotfix du runtime documentaire (bloquant)
Reproduire attachLineVehicle avec une LineString et animation activée ; exécuter réellement le callback temporel.
Corriger la variable t non déclarée dans le chemin de production ; ne pas se limiter à une recherche de chaîne.
Tester zéro, une et plusieurs lignes, animation désactivée, réduction des mouvements et page masquée.
Conserver un test qui échoue sur le code initial et passe sur le correctif.
Ce hotfix n’est pas la résolution du problème architectural : poursuivre R2.
Porte : HTML exporté ouvert hors éditeur, sans ReferenceError et avec déplacement observable.

## 5. R2 — Un seul moteur de déplacement et catalogue
Inventorier vehicleController, travelCoordinator, flightPlanner et toutes les boucles inline d’export.
Choisir un coordinateur public unique ou une façade unique réutilisant les modules existants.
Partager géométrie, catalogue SVG, horloge et états entre React et publications modes 1/2.
Assembler le runtime autonome ; ne pas recopier des formules dans des templates parallèles.
Préserver avion/bateau/voiture/bus/train/vélo/personnage, licences et configuration sélectionnée.
Respecter enabled, loop, durée/rythme, orientation, suivi caméra et commandes explicites.
Un seul pilote caméra par carte ; suspendre les autres suivis lors d’une exploration ou action narrative.
Pages masquées : contrôleurs suspendus ; sortie/projet : frames, timers, marqueurs et écouteurs libérés.
Conserver deux niveaux DOM pour positionnement moteur et rotation/animation de l’icône.
Ne pas relancer globalement toutes les vidéos depuis updateUI ; respecter page active et pause utilisateur.
Conserver une politique de pause commune pour médias natifs et une alternative déclarée pour intégrations non pilotables.
Porte : même véhicule, trajet, commandes et progression sur lecteur React et HTML/ZIP indépendants.

## 6. R3 — Zoom et coordinateur réellement raccordés
Conserver les invariants de zoom.md : position maîtresse commune, véhicule centré dans la zone utile et destination exacte.
Ne pas présenter speedPxPerSec comme vitesse mesurée si seule une valeur cible est renvoyée.
Remplacer la table linéaire par une planification cohérente avec projection, zoom et viewport utile.
Prendre en compte longueur complète, emprise, hauteur/largeur utiles et panneaux ; traiter boucles et antéméridien.
Séparer cap du véhicule et orientation caméra ; transitions angulaires lissées et unités explicites.
Ne pas promettre vitesse géographique, durée fixe et vitesse visuelle constante simultanément.
À la fin : émettre le cadrage final avant arrêt ou autoriser explicitement son application en état completed.
Après exploration : resumeFollow doit réarmer les frames si la boucle a cessé.
Définir stop/pause/seek/masquage/destroy sans reprise automatique contraire à l’intention utilisateur.
Distinguer originalEvent utilisateur et mouvements caméra programmés pour ne pas suspendre son propre suivi.
Relier effectivement le moniteur aux événements et états des sources nécessaires de la carte active.
Utiliser une seule horloge monotone ; ne pas mélanger Date.now et timestamps requestAnimationFrame.
Ne pas compter aveuglément notifications source non chargée/chargée comme événements de tuiles symétriques.
Attente initiale, pause technique, reprise avec hystérésis et erreur/timeout visibles ; pas d’accélération de rattrapage.
Ne pas attendre idle à chaque frame d’un mouvement continu.
Restaurer trajet, symboles, véhicule et progression après changement de style ou reconstruction WebGL.
Porte : centrage et durée active mesurés en navigateur, réseau ralenti et erreurs explicitement gérées.

## 7. R4 — Première tranche complète du mode 2
S’appuyer sur D0/D1 et D3–D5 de mode2tasks ; ne pas annoncer toute la refonte comme terminée.
Livrer une section carte–récit avec deux fiches et un bouton configuré par texte → action → cible → Tester.
Commencer par zoom/surbrillance et vue générale ; contrat d’actions versionné et identifiants stables.
Clic en édition sélectionne ; Tester utilise un état temporaire ; lecture exécute sans réécrire le document.
Proposer deux cartes indépendantes pour prouver le ciblage, une disposition bureau et un ordre mobile explicite.
Une migration de page vers section ne supprime aucun bloc ni association ; conserver les projets existants.
Noyau d’exécution commun React/export, URL validées, data-* et écouteurs sans JavaScript auteur.
Vue générale et retour de focus compréhensibles ; aucun badge technique imposé dans la publication.
Porte : créer, sauvegarder, rouvrir, publier HTML/ZIP, activer le bouton puis réimporter sans perte.
Le reste du catalogue et les commandes composites restent dans le backlog détaillé, non cochés d’avance.

## 8. R5 — Première tranche complète du mode 3
S’appuyer sur M1/M2 de mode3tasks ; réutiliser les primitives PAO déjà écrites.
Livrer miniatures/pages à gauche, page distincte du plan de travail et inspecteur contextuel à droite.
Sortir formulaires des petits cadres ; conserver palette flottante et aperçu sans aides.
Ajouter déplacement et alignement réels dans l’interface avec alternative clavier et undo/redo.
Raccorder zIndex et verrouillage au rendu ; distinguer superposition volontaire et collision non autorisée.
Vérifier groupement/distribution préparés avant de les exposer ; tests des bornes et objets verrouillés.
Corriger le calcul DPI pour tenir compte des deux dimensions, du recadrage et de la taille physique utilisée.
Préserver les ressources et styles à la fermeture/réouverture et à l’export.
Porte : composer une fiche générique, déplacer/aligner, annuler, sauvegarder et produire une sortie fidèle.
Ne pas déclarer M3–M8 reçus sur la seule présence de fonctions de fondation.

## 9. R6 — Géométrie, hero et ergonomie transversale
Tester PageGrid en portrait/paysage/16:9, hero séparé et hero dans un bloc, petit et grand conteneur.
Mesurer dimensions calculées, hauteur des lignes 1fr, débordements et place réellement disponible.
Comparer édition/aperçu/export au même viewport ; aucune confiance dans aspectRatio seul.
Distinguer zoom d’atelier, viewport simulé et dimensions physiques de brochure.
Réduire la barre contextuelle aux commandes fréquentes, reste dans Plus/inspecteur ; vérifier cellules 1×1 et bords de page.
RÀZ de contenu distinct de Revenir au style hérité ; annulation sûre et avertissement selon le risque.
Vérifier polices réellement chargées sur poste vierge, charte propagée et exceptions conservées.
Ne pas annoncer brochure haute résolution sans dimensions raster et résultat final contrôlés.

## 10. R7 — Publications et réception de bout en bout
Édition → lecture → HTML/ZIP hors application → réimport → brochure : tester la même fixture et ses ressources.
Tests purs : état temporel, géométrie, saturation, références, migrations et commandes de composition.
Tests d’intégration : vrais exports/imports, sans logique recopiée ni timers inertes pour les scénarios temporels.
Tests navigateur : cartes présentes, callback exécuté, pause/reprise, clavier, responsive et reconstruction WebGL.
Tester deux cartes, plusieurs véhicules, vidéos, fonds indisponibles et réseau lent.
Produire PDF multi-pages réel : dimensions, texte extrait, images, cartes, crédits et absence d’aides d’édition.
Conserver le projet JSON/HTML/ZIP rééditable séparé du PDF de diffusion.
Rejouer les quinze suites déclarées et le build, mais ne pas les confondre avec une recette visuelle complète.
Contrôler 195 lignes des sources maintenues ; exemptions tracées pour tiers, licences, lockfile et artefacts générés.
Ne pas minifier artificiellement les lignes ni découper sans respecter les responsabilités.

## 11. Gestion des tâches et preuves
reprise_tasks.md est le task manager de cette livraison, avec ID, priorité, dépendance, statut et preuve.
Statuts : TODO / DOING / BLOCKED / REVIEW / DONE ; au plus une tâche de fond DOING par agent.
DONE exige critère satisfait et preuve rattachée au commit ; sinon REVIEW ou BLOCKED avec motif.
Reporter dans les anciens suivis uniquement les éléments effectivement réalisés et vérifiés.
Créer un rapport de livraison dans wiki/verification/reprise-acceptance.md avec résultats et limites.
Le rapport peut référencer journaux/artefacts de CI ; ne pas inventer les fichiers ou résultats manquants.
Commits petits et descriptifs ; isoler hotfix, moteur partagé, zoom, mode 2, mode 3 et recette.
Ne pas publier automatiquement release, issue ou PR sans suivre le workflow et les autorisations en vigueur.

## 12. Instruction de lancement pour l’agent
Lire reprise.md et reprise_tasks.md, puis les spécifications associées selon le lot.
Commencer par R0 et un test reproducteur de l’animation exportée ; ne pas commencer par de nouvelles options graphiques.
Avancer jusqu’à la prochaine porte validée, conserver les tests et actualiser le task manager après chaque tâche.
En cas de blocage, consigner cause, tentative, état des données et action nécessaire ; ne pas cocher en succès.
À la fin, fournir commits, commandes exécutées, preuves navigateur/PDF et non-testés.
