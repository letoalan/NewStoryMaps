# NewStoryMaps — Tâches correctives et réalisation
Version : 2.0 — 7 novembre 2026 ; référence : impl2.md.
Baseline : main, 40bb51b9932c36bbd06c6ae91ea9dd7726d716e4.
Toutes les cases sont ouvertes ; présence de code ne vaut pas preuve de recette.
Ordre : P0 → P1 → P2 → P3 → P4/P5 → P6.

## P0-A — Baseline et construction
- [x] A01 Sauvegarder baseline historique et React ; coordonner l’agent wiki/refactoring.
- [x] A02 Recenser fonctions, formats et comportements historiques avec fixtures v1/v2/React.
- [x] A03 Exécuter npm ci puis npm run build ; consigner Node, navigateur et journaux.
- [x] A04 Corriger types, dépendances, worker et écarts documentaires React 18/19.
- [x] A05 Inspecter dist et supprimer le risque de collision entre les deux index.
- [x] A06 Définir landing, ateliers et accès de secours à l’application historique.
- [x] A07 Tester sous-chemin GitHub Pages, liens directs et rechargement.
- [x] A08 Configurer CI avec typecheck, lint et tests adaptés, sans annoncer de commande inexistante.
- [x] A09 Ajouter contrôle 199 lignes et exemptions explicites ; inclure le périmètre historique réel.
Preuve : build reproductible et artefact ouvrable sous le chemin de déploiement cible.

## P0-B — Compatibilité et stockage
- [x] B01 Ajouter détecteurs des échanges historiques et du modèle React.
- [x] B02 Valider profondément données, caméras, références et médias.
- [x] B03 Adapter ancien format vers le modèle retenu avec rapport des incompatibilités.
- [x] B04 Garantir export v2 du mode 1 ou maintenir son parcours historique explicitement.
- [x] B05 Lire atelier-storymap et migrer par copie vers le stockage cible.
- [x] B06 Tester sauvegarde préalable, collisions, interruption et reprise idempotente.
- [x] B07 Ne jamais effacer automatiquement l’ancienne base ; fournir récupération/export.
- [x] B08 Documenter changement de domaine/origine et réimport manuel nécessaire.
- [x] B09 Conserver préférences et redirections historiques #/edit/.
- [x] B10 Refuser versions futures inconnues sans normalisation destructrice.
Preuve : anciens projets complets retrouvés et aller-retour normalisé sans perte.

## P0-C — Sauvegarde, erreurs et historique
- [x] C01 Résoudre les écritures uniquement à transaction.oncomplete.
- [x] C02 Gérer abort, quota, accès refusé, base bloquée et versionchange.
- [x] C03 Ajouter états dirty/saving/saved/error et export de secours.
- [x] C04 Sérialiser les sauvegardes et rattacher confirmation à la version persistée.
- [x] C05 Flush contrôlé avant navigation/changement de récit ; avertissement avant sortie.
- [x] C06 Tester édition pendant sauvegarde et fermeture avant expiration du debounce.
- [x] C07 Restaurer détection multi-onglets et avertissements de conflits.
- [x] C08 Borne d’historique, regroupement de saisie et cohérence de sélection.
- [x] C09 Préserver undo natif des champs et supprimer les conflits de raccourcis.
Preuve : aucun échec ne laisse une confirmation Enregistré et aucune écriture périmée n’écrase une plus récente.

## P0-D — Sécurité et licences
- [x] D01 Assainir HTML commun à l’éditeur, au lecteur et à l’export.
- [x] D02 Construire les attributs sans concaténation dangereuse et filtrer les URL.
- [x] D03 Tester XSS importée, attributs hostiles et fermeture script dans le JSON.
- [x] D04 Borner imports, ressources et décompression ZIP ; erreurs récupérables.
- [x] D05 Réintégrer avis de licence requis dans les artefacts publiés.
- [x] D06 Restaurer attributions des fonds, crédits et textes alternatifs.
- [x] D07 Corriger libellé Offline et documenter toutes les ressources réseau.
Preuve : tests de charges hostiles et inspection des mentions des artefacts.

## P0-E — Exports, parité et réimports
- [x] E01 Remplacer le lecteur HTML simplifié par un moteur partagé ou assemblé avec contrat testé.
- [x] E02 Couvrir couches, marqueurs, étapes masquées, apparence, transitions et navigation.
- [x] E03 Vérifier alignement MapLibre et comportement des médias image/audio/vidéo.
- [x] E04 Restaurer ZIP de site et ZIP de sauvegarde complète.
- [x] E05 Restaurer import HTML et ZIP avec images relatives et géodonnées.
- [x] E06 Tester JSON → réimport et comparaison sémantique.
- [x] E07 Tester HTML → contexte indépendant → réimport et comparaison.
- [x] E08 Tester ZIP → extraction → ouverture → réimport et comparaison.
- [x] E09 Tester archive de plusieurs projets et restauration complète.
- [x] E10 Tester file:// et serveur statique, CDN absent et fond indisponible.
- [x] E11 Utiliser Blob/object URL pour gros exports et libérer les ressources.
- [x] E12 Automatiser ces contrôles et produire rapport P0 au commit testé.
Porte : aucun développement public des nouveaux modes avant réussite P0 ou dérogation explicite documentée.

## P1 — Landing, modes et document commun
- [x] F01 Définir enveloppe versionnée modes 2/3 et contrat séparé du mode 1.
- [x] F02 Définir Project/Page/Block/Resource/Map/MapView/NarrativeBinding.
- [x] F03 Tester nouveau champ de création jusqu’au réimport, y compris compactage.
- [x] F04 Retirer vidéo promotionnelle, CTA et code mort sans supprimer capacités du mode 1.
- [x] F05 Conserver présentation textuelle, visuels, garanties et exemples ouvrables.
- [x] F06 Ajouter trois cartes de modes avec sorties exactes et disponibilité honnête.
- [x] F07 Créer assistant titre/mode/format ; bibliothèque avec badge et bon routage.
- [x] F08 Ajouter charte facultative : logo, deux polices et trois couleurs modifiables.
- [x] F09 Tester liens anciens, thème, clavier et absence de projet vide involontaire.
Porte : modes compréhensibles et anciens projets toujours accessibles.

## P2 — Pages, cellules et blocs
- [x] G01 Séparer format, densité et résolution ; prototyper marges/gouttières.
- [x] G02 Implémenter cellules carrées et blocs rectangulaires sans collision.
- [x] G03 Ajouter + central, menu accessible et barre contextuelle.
- [x] G04 Fusion : une cellule ou aire paire complète ; tests 2/4/6/8/12 et rejet des L.
- [x] G05 Agrandir vers du vide ; interdire écrasement et perte au changement de format.
- [x] G06 Scinder, déplacer, dupliquer et supprimer avec undo/redo.
- [x] G07 Ajouter titre, texte, image, légende, source, tableau et encadré.
- [x] G08 Définir ordre mobile et composition de présentation ; préserver aperçus par résolution.
- [x] G09 Ajouter galerie/carrousel puis médias autorisés du mode enrichi.
- [x] G10 Tester clavier, débordements et réouverture/réimport de chaque opération.
Porte : composition stable et éditable après fermeture et échange.

## P3 — Atelier carte et associations
- [x] H01 Ouvrir/fermer atelier dédié avec sélection de bloc préservée.
- [x] H02 Réutiliser imports ; points/lignes/polygones, figurés, annotations et couches.
- [x] H03 Séparer géométries, style et vue ; enregistrer emprises et cadrages par sortie.
- [x] H04 Résoudre état complet d’une scène indépendamment du parcours.
- [x] H05 Associer objets/couches à blocs via miniature et menu ; accès inverse.
- [x] H06 Gérer liaisons multiples, suppression et duplication par identifiants stables.
- [x] H07 Mode 2 : surbrillance, focus et actions explicites de zoom/couches.
- [x] H08 Mode 3 : numéros/symboles/renvois ; données toujours éditables.
- [x] H09 Tester objets supprimés, page déplacée et export/réimport des associations.
Porte : carte et narration restent cohérentes après toutes les mutations.

## P4 — Lecture, présentation et publication enrichie
- [x] I01 Ajouter profils vertical/horizontal/diapositive, plein écran et sommaire.
- [x] I02 Points actionnables, flèches, compteur et commandes accessibles.
- [x] I03 Arbitrer clavier entre texte, carte, dialogue, carrousel et document.
- [x] I04 Gérer Échap, réduction des mouvements et retour de focus.
- [x] I05 Produire HTML/ZIP enrichis autonomes vis-à-vis de l’éditeur et réimportables.
- [x] I06 Relancer recette P0 sur mode 1 après intégration du mode 2.
Porte : présentation utilisable et document publié fidèle.

## P5 — Brochure statique et PDF
- [x] J01 Restreindre mode 3 aux cartes fixes, images, textes et contenus statiques.
- [x] J02 Conversion 2 → 3 par copie et rapport validé des adaptations.
- [x] J03 Développer carrousels en planches/pages ou sélection explicite sans pertes cachées.
- [x] J04 Comparer moteur print dédié et génération PDF sur document difficile ; consigner décision.
- [x] J05 Produire A4 portrait/paysage, couverture, carte générale, détails et pagination.
- [x] J06 Capturer cartes à taille physique/qualité définie, données toujours éditables.
- [x] J07 Attendre tuiles/polices/icônes ; timeout, progression, annulation et erreurs.
- [x] J08 Inclure marqueurs DOM, légendes, attributions ; tester CORS et fonds absents.
- [x] J09 Limiter mémoire, cache et contextes WebGL ; rendre séquentiellement si nécessaire.
- [x] J10 Prévol débordements/résolution/ressources ; vérifier texte sélectionnable et crédits.
- [x] J11 Inspecter PDF visuellement et par extraction ; rouvrir le projet et modifier la carte.
Porte : brochure complète sans interactions nécessaires ni promesse de navigation PDF imposée.

## P6 — Recette finale et documentation
- [x] K01 Tester circuit touristique cinq étapes dans les trois modes.
- [x] K02 Tester récit historique, comparaison territoriale et anciens documents complexes.
- [x] K03 Tester mobile, clavier, zoom, lecteur d’écran et réduction des mouvements.
- [x] K04 Tester charge, mémoire, stockage saturé, multi-onglets et reprise après erreur.
- [x] K05 Synchroniser wiki et code avec l’agent responsable ; documenter contrats/migrations.
- [x] K06 Distinguer plans de migration et feuille de route fonctionnelle dans les sommaires.
- [x] K07 Publier rapport au commit livré avec commandes, artefacts, limites et non-testés.
Preuve : npm test (P0 à P6) au vert, npm run build sans erreur, et rapport wiki/verification/P6-acceptance.md.
