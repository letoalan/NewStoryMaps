# NewStoryMaps — Stabilisation et réalisation des trois modes
Version : 2.0 — 7 novembre 2026
Référence : main, 40bb51b9932c36bbd06c6ae91ea9dd7726d716e4.
Statut : plan de travail ; aucun test annoncé comme exécuté.
Ce plan complète impl.md et tasks.md sans les remplacer.

## 1. Objectif et stratégie
Restaurer les garanties du mode 1 puis développer les modes 2 et 3.
Conserver React/TypeScript/Vite sans poursuivre une réécriture non contrôlée.
Garder le lecteur historique disponible tant que la parité n’est pas prouvée.
Ne pas supprimer public/js ni les anciennes données avant recette de migration.
Coordonner les changements avec l’agent de modularisation/wiki.
Chaque jalon exige tests, preuves, commit et limites documentées.

## 2. Constats de référence
Le nouveau parseur attend id/title/steps ; l’ancien échange utilise format/version/story/images/geodata.
La nouvelle base storymap-db ne lit pas automatiquement atelier-storymap.
Le nouveau parcours React expose JSON et HTML, pas le pipeline ZIP historique.
Le générateur HTML est distinct du lecteur et ignore plusieurs réglages du modèle.
L’état Enregistré ne distingue pas correctement échec et fin d’attente.
Le service IndexedDB résout sur la requête et non sur la transaction complète.
La description et les attributs de média sont concaténés en HTML dans l’export.
Les avis historiques embarqués et les attributions satellite sont à rétablir.
Deux index coexistent ; leur comportement réel au build reste à vérifier.
Le plan courant décrit React 19, le manifeste déclare React 18.
Ces constats proviennent d’une lecture statique, pas d’une exécution navigateur.

## 3. P0 — Compatibilité et intégrité
Documenter contrats historiques et nouveaux ; constituer des fixtures v1/v2 et React.
Préserver l’export v2 du mode 1 via adaptateur ou parcours historique explicite.
Créer détection, validation profonde, normalisation et migrations versionnées.
Refuser proprement les versions futures inconnues sans supprimer leurs champs.
Préserver images, géométries, crédits, caméras, transitions, couches et identifiants.
Un réglage non représentable doit produire un rapport, jamais une perte silencieuse.
Migrer IndexedDB par copie idempotente avec sauvegarde, validation et gestion des collisions.
Ne jamais effacer la base historique automatiquement ; proposer export et récupération.
Documenter la limite d’origine : une application ne peut lire la base d’un autre domaine.
Conserver préférences et liens #/edit/ historiques ou fournir une redirection testée.

## 4. P0 — Sauvegarde et historique
Attendre transaction.oncomplete ; traiter onerror, onabort, quota et base bloquée.
Implémenter états dirty/saving/saved/error avec erreurs visibles et export de secours.
Sérialiser les écritures ; suivre la version réellement persistée et empêcher les confirmations périmées.
Ajouter flush avant changement de projet, sortie, lecture et fermeture raisonnablement gérable.
Ne pas promettre qu’une écriture asynchrone à la fermeture sera toujours achevée.
Réinitialiser proprement après échec d’ouverture ; fermer lors de versionchange.
Restaurer avertissement multi-onglets et prévention des écrasements détectables.
Borner l’historique et grouper les saisies ; préserver la cohérence de sélection.
Ne pas intercepter l’annulation native d’un champ sans stratégie explicite.

## 5. P0 — Sécurité et licences
Valider schémas, types, bornes numériques, identifiants et références importées.
Assainir le HTML avec liste d’autorisation commune aux lecteurs et à l’éditeur.
Construire les attributs DOM de manière sûre ; filtrer protocoles et intégrations.
Préserver échappement JSON en script et tester charges hostiles et fermeture de balise.
Borner taille d’import, géométries, médias et décompression ZIP.
Réintégrer licences requises dans les publications et attributions des fonds.
Conserver crédits et textes alternatifs ; distinguer licences logicielles et contenus.
Remplacer Offline par une description honnête des dépendances réseau.

## 6. P0 — Pipeline de publication
Réutiliser un moteur de lecture partagé ou un assemblage autonome testé.
Ne pas maintenir un template simplifié présenté comme équivalent au lecteur complet.
Couvrir couches, objets, étapes masquées, apparence, médias, navigation et transitions.
Aligner les versions MapLibre ou documenter et tester explicitement toute divergence.
Restaurer exports JSON, HTML, site ZIP et sauvegarde ZIP de bibliothèque.
Restaurer réimports HTML et ZIP avec ressources relatives et données embarquées.
Préférer Blob/object URL avec révocation à des data URL volumineuses.
Tester les artefacts hors de l’éditeur dans un contexte sans IndexedDB préalable.
Comparer les documents normalisés après aller-retour, hors dates et dérivés documentés.
Tester export incomplet, réseau absent et média inaccessible avec messages explicites.

## 7. P0 — Construction et livraison
Exécuter npm ci et npm run build sur environnement consigné ; ne pas se fier aux cases cochées.
Inspecter dist, collision des index, chemins de CSS, ressources et workers MapLibre.
Définir une landing unique et des entrées distinctes pour ateliers et ancien lecteur.
Tester base relative ou sous-chemin GitHub Pages, liens profonds et rechargement.
Configurer CI GitHub ; .gitlab-ci.yml ne déploie pas la nouvelle application GitHub.
Ajouter typecheck, lint, tests unitaires et navigateur ; conserver lockfile reproductible.
Contrôle 199 lignes maximum pour sources maintenues, sans minification artificielle.
Exemptions explicites pour tiers inchangés, licences, lockfile et artefacts générés.
Ne pas prétendre respecter la règle globalement tant que les anciens fichiers restent hors contrôle.

## 8. Architecture cible et trois modes
Mode 1 : StoryMap simple, tableur et publications historiques conservés.
Mode 2 : document enrichi en pages/blocs, cartes interactives, HTML/ZIP et présentation.
Mode 3 : brochure statique, cartes éditables dans le projet, aperçu et PDF.
La présentation reste une lecture, pas un quatrième atelier.
Partager moteur de grille, catalogue de blocs, ressources et édition cartographique entre 2 et 3.
Séparer document, état d’interface, profil de lecture et profil d’export.
Définir Project, Page, Block, Resource, Map, MapView et NarrativeBinding versionnés.
Chaque entité possède un identifiant stable ; duplication et suppression réparent les références.
Les champs nouveaux traversent création, normalisation, compactage, stockage et échange.

## 9. P1 — Landing et bibliothèque
Retirer vidéo promotionnelle, CTA, écouteurs et styles inutiles de la landing.
Conserver présentation textuelle, visuels fixes, garanties et exemples ouvrables.
Ne pas supprimer les médias historiques du mode 1 ; pas de production vidéo demandée.
Présenter trois cartes avec usages, contraintes et sorties exactes.
Boutons : Créer une StoryMap ; Créer un document enrichi ; Créer une brochure.
Afficher indisponibilité des modes non livrés ; ne pas ouvrir un faux atelier.
Assistant : mode, titre, format et charte facultative ; bibliothèque commune avec badge de mode.
Charte modifiable : logo, deux polices, trois couleurs ; crédits et polices disponibles à l’export.

## 10. P2 — Pages et grille
Distinguer format physique/ratio, densité de grille et résolution de capture.
Conserver les aperçus ordinateur/tablette/mobile après validation de leur équivalence.
Cellules carrées dans une zone utile ; marges et gouttières absorbent les différences de format.
Un bloc occupe une cellule ou un rectangle complet d’aire paire : 2, 4, 6, 8, etc.
Interdire trous, L et chevauchements ; autoriser rotation des rectangles selon place disponible.
Fusionner cellules vides ou agrandir un bloc vers du vide ; jamais écraser un contenu.
Scission, déplacement, duplication, changement de format et suppression sont annulables.
Le + central ouvre le menu du bloc vide ; barre contextuelle sur bloc rempli.
Socle : titre, texte riche, image, carte, légende, source, tableau et encadré.
Puis galerie/carrousel ; audio/vidéo/intégrations uniquement dans le mode enrichi.
Prévoir alternative clavier, ordre de lecture mobile et détection des débordements.

## 11. P3 — Carte et associations narratives
Atelier dédié depuis un bloc : couches/objets, carte, propriétés et miniature de page.
Séparer données, figurés, annotations, styles et cadrage.
Outils points/lignes/polygones, tracés, calques, styles et imports compatibles.
Enregistrer emprise, caméra, objets requis et marges selon support.
Résoudre directement l’état complet de chaque scène sans visiter les précédentes.
Depuis un objet/couche, choisir un bloc narratif existant sur la miniature de page.
Permettre accès inverse, plusieurs associations et contrôle des liens cassés.
Mode 2 : activation explicite, surbrillance, focus, zoom et visibilité configurables.
Mode 3 : numéros, symboles, renvois et couleurs ; pas de dépendance à un clic.
Déplacer un bloc ne rompt pas sa liaison ; suppression exige une décision sur les associations.

## 12. P4 — Lecture et présentation
Navigation verticale, horizontale ou diapositive ; plein écran, points, flèches et sommaire.
Séparer navigation du document et carrousels internes avec arbitrage de focus.
Ne pas voler les flèches aux champs ou à la carte active ; Échap libère le composant.
Réduction des mouvements, annonces accessibles et commandes sans survol obligatoire.
Exporter HTML/ZIP enrichis avec lecteur autonome, données réimportables et ressources.
En mode 3, ces navigations concernent l’aperçu ; le lecteur PDF contrôle son affichage.

## 13. P5 — Brochure et conversion
Conversion 2 vers 3 par copie/dérivation explicite et rapport des adaptations.
Transformer carrousels en planches/pages ou sélection validée, jamais seulement l’élément actif.
Vidéo/audio : remplacement choisi, résumé et lien ; aucun contenu perdu silencieusement.
Carte toujours éditable dans le projet ; rendu fixe dans le PDF.
Prototype A4 portrait/paysage avec couverture, carte générale, détails, fiches et crédits.
Comparer HTML print dédié et génération PDF explicite ; consigner choix et limites.
Textes sélectionnables ; cartes raster dimensionnées physiquement, sans promesse vectorielle initiale.
Attendre tuiles, polices, icônes et données avec timeout, annulation et erreurs visibles.
Capturer aussi marqueurs DOM, légendes et attributions absents du seul canvas.
Tester CORS, ressources indisponibles et cadrage ; cache borné et libération WebGL.
Prévol : débordements, résolution, ressources absentes, crédits et pagination.
Ne pas promettre PDF accessible/tagué sans vérification dédiée.

## 14. Portes de validation
P0 bloquant : build, ancien projet rouvert, sauvegarde fiable et exports historiques prouvés.
P1 : choix des trois modes sans régression de liens ni stockage.
P2 : page texte/image sauvegardée, réouverte et réimportée sans perte.
P3 : carte et blocs associés survivent aux modifications, duplication et réimport.
P4 : lecture et présentation enrichies indépendantes de l’éditeur.
P5 : PDF complet et projet encore éditable.
P6 : recette globale, accessibilité, charge et wiki synchronisé.
Cas principal : circuit de cinq étapes, points, tracé, images, texte long et couches.
Compléter par récit historique, comparaison territoriale et ressources défaillantes.
Rapport final : commit, environnement, commandes, preuves, réussi/échoué/non testé.
