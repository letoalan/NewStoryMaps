# NewStoryMaps — Tâches correctives et réalisation
Version : 2.0 — 7 novembre 2026 ; référence : impl2.md.
Baseline : main, 40bb51b9932c36bbd06c6ae91ea9dd7726d716e4.
Toutes les cases sont ouvertes ; présence de code ne vaut pas preuve de recette.
Ordre : P0 → P1 → P2 → P3 → P4/P5 → P6.

## P0-A — Baseline et construction
- [ ] A01 Sauvegarder baseline historique et React ; coordonner l’agent wiki/refactoring.
- [ ] A02 Recenser fonctions, formats et comportements historiques avec fixtures v1/v2/React.
- [ ] A03 Exécuter npm ci puis npm run build ; consigner Node, navigateur et journaux.
- [ ] A04 Corriger types, dépendances, worker et écarts documentaires React 18/19.
- [ ] A05 Inspecter dist et supprimer le risque de collision entre les deux index.
- [ ] A06 Définir landing, ateliers et accès de secours à l’application historique.
- [ ] A07 Tester sous-chemin GitHub Pages, liens directs et rechargement.
- [ ] A08 Configurer CI avec typecheck, lint et tests adaptés, sans annoncer de commande inexistante.
- [ ] A09 Ajouter contrôle 199 lignes et exemptions explicites ; inclure le périmètre historique réel.
Preuve : build reproductible et artefact ouvrable sous le chemin de déploiement cible.

## P0-B — Compatibilité et stockage
- [ ] B01 Ajouter détecteurs des échanges historiques et du modèle React.
- [ ] B02 Valider profondément données, caméras, références et médias.
- [ ] B03 Adapter ancien format vers le modèle retenu avec rapport des incompatibilités.
- [ ] B04 Garantir export v2 du mode 1 ou maintenir son parcours historique explicitement.
- [ ] B05 Lire atelier-storymap et migrer par copie vers le stockage cible.
- [ ] B06 Tester sauvegarde préalable, collisions, interruption et reprise idempotente.
- [ ] B07 Ne jamais effacer automatiquement l’ancienne base ; fournir récupération/export.
- [ ] B08 Documenter changement de domaine/origine et réimport manuel nécessaire.
- [ ] B09 Conserver préférences et redirections historiques #/edit/.
- [ ] B10 Refuser versions futures inconnues sans normalisation destructrice.
Preuve : anciens projets complets retrouvés et aller-retour normalisé sans perte.

## P0-C — Sauvegarde, erreurs et historique
- [ ] C01 Résoudre les écritures uniquement à transaction.oncomplete.
- [ ] C02 Gérer abort, quota, accès refusé, base bloquée et versionchange.
- [ ] C03 Ajouter états dirty/saving/saved/error et export de secours.
- [ ] C04 Sérialiser les sauvegardes et rattacher confirmation à la version persistée.
- [ ] C05 Flush contrôlé avant navigation/changement de récit ; avertissement avant sortie.
- [ ] C06 Tester édition pendant sauvegarde et fermeture avant expiration du debounce.
- [ ] C07 Restaurer détection multi-onglets et avertissements de conflits.
- [ ] C08 Borne d’historique, regroupement de saisie et cohérence de sélection.
- [ ] C09 Préserver undo natif des champs et supprimer les conflits de raccourcis.
Preuve : aucun échec ne laisse une confirmation Enregistré et aucune écriture périmée n’écrase une plus récente.

## P0-D — Sécurité et licences
- [ ] D01 Assainir HTML commun à l’éditeur, au lecteur et à l’export.
- [ ] D02 Construire les attributs sans concaténation dangereuse et filtrer les URL.
- [ ] D03 Tester XSS importée, attributs hostiles et fermeture script dans le JSON.
- [ ] D04 Borner imports, ressources et décompression ZIP ; erreurs récupérables.
- [ ] D05 Réintégrer avis de licence requis dans les artefacts publiés.
- [ ] D06 Restaurer attributions des fonds, crédits et textes alternatifs.
- [ ] D07 Corriger libellé Offline et documenter toutes les ressources réseau.
Preuve : tests de charges hostiles et inspection des mentions des artefacts.

## P0-E — Exports, parité et réimports
- [ ] E01 Remplacer le lecteur HTML simplifié par un moteur partagé ou assemblé avec contrat testé.
- [ ] E02 Couvrir couches, marqueurs, étapes masquées, apparence, transitions et navigation.
- [ ] E03 Vérifier alignement MapLibre et comportement des médias image/audio/vidéo.
- [ ] E04 Restaurer ZIP de site et ZIP de sauvegarde complète.
- [ ] E05 Restaurer import HTML et ZIP avec images relatives et géodonnées.
- [ ] E06 Tester JSON → réimport et comparaison sémantique.
- [ ] E07 Tester HTML → contexte indépendant → réimport et comparaison.
- [ ] E08 Tester ZIP → extraction → ouverture → réimport et comparaison.
- [ ] E09 Tester archive de plusieurs projets et restauration complète.
- [ ] E10 Tester file:// et serveur statique, CDN absent et fond indisponible.
- [ ] E11 Utiliser Blob/object URL pour gros exports et libérer les ressources.
- [ ] E12 Automatiser ces contrôles et produire rapport P0 au commit testé.
Porte : aucun développement public des nouveaux modes avant réussite P0 ou dérogation explicite documentée.

## P1 — Landing, modes et document commun
- [ ] F01 Définir enveloppe versionnée modes 2/3 et contrat séparé du mode 1.
- [ ] F02 Définir Project/Page/Block/Resource/Map/MapView/NarrativeBinding.
- [ ] F03 Tester nouveau champ de création jusqu’au réimport, y compris compactage.
- [ ] F04 Retirer vidéo promotionnelle, CTA et code mort sans supprimer capacités du mode 1.
- [ ] F05 Conserver présentation textuelle, visuels, garanties et exemples ouvrables.
- [ ] F06 Ajouter trois cartes de modes avec sorties exactes et disponibilité honnête.
- [ ] F07 Créer assistant titre/mode/format ; bibliothèque avec badge et bon routage.
- [ ] F08 Ajouter charte facultative : logo, deux polices et trois couleurs modifiables.
- [ ] F09 Tester liens anciens, thème, clavier et absence de projet vide involontaire.
Porte : modes compréhensibles et anciens projets toujours accessibles.

## P2 — Pages, cellules et blocs
- [ ] G01 Séparer format, densité et résolution ; prototyper marges/gouttières.
- [ ] G02 Implémenter cellules carrées et blocs rectangulaires sans collision.
- [ ] G03 Ajouter + central, menu accessible et barre contextuelle.
- [ ] G04 Fusion : une cellule ou aire paire complète ; tests 2/4/6/8/12 et rejet des L.
- [ ] G05 Agrandir vers du vide ; interdire écrasement et perte au changement de format.
- [ ] G06 Scinder, déplacer, dupliquer et supprimer avec undo/redo.
- [ ] G07 Ajouter titre, texte, image, légende, source, tableau et encadré.
- [ ] G08 Définir ordre mobile et composition de présentation ; préserver aperçus par résolution.
- [ ] G09 Ajouter galerie/carrousel puis médias autorisés du mode enrichi.
- [ ] G10 Tester clavier, débordements et réouverture/réimport de chaque opération.
Porte : composition stable et éditable après fermeture et échange.

## P3 — Atelier carte et associations
- [ ] H01 Ouvrir/fermer atelier dédié avec sélection de bloc préservée.
- [ ] H02 Réutiliser imports ; points/lignes/polygones, figurés, annotations et couches.
- [ ] H03 Séparer géométries, style et vue ; enregistrer emprises et cadrages par sortie.
- [ ] H04 Résoudre état complet d’une scène indépendamment du parcours.
- [ ] H05 Associer objets/couches à blocs via miniature et menu ; accès inverse.
- [ ] H06 Gérer liaisons multiples, suppression et duplication par identifiants stables.
- [ ] H07 Mode 2 : surbrillance, focus et actions explicites de zoom/couches.
- [ ] H08 Mode 3 : numéros/symboles/renvois ; données toujours éditables.
- [ ] H09 Tester objets supprimés, page déplacée et export/réimport des associations.
Porte : carte et narration restent cohérentes après toutes les mutations.

## P4 — Lecture, présentation et publication enrichie
- [ ] I01 Ajouter profils vertical/horizontal/diapositive, plein écran et sommaire.
- [ ] I02 Points actionnables, flèches, compteur et commandes accessibles.
- [ ] I03 Arbitrer clavier entre texte, carte, dialogue, carrousel et document.
- [ ] I04 Gérer Échap, réduction des mouvements et retour de focus.
- [ ] I05 Produire HTML/ZIP enrichis autonomes vis-à-vis de l’éditeur et réimportables.
- [ ] I06 Relancer recette P0 sur mode 1 après intégration du mode 2.
Porte : présentation utilisable et document publié fidèle.

## P5 — Brochure statique et PDF
- [ ] J01 Restreindre mode 3 aux cartes fixes, images, textes et contenus statiques.
- [ ] J02 Conversion 2 → 3 par copie et rapport validé des adaptations.
- [ ] J03 Développer carrousels en planches/pages ou sélection explicite sans pertes cachées.
- [ ] J04 Comparer moteur print dédié et génération PDF sur document difficile ; consigner décision.
- [ ] J05 Produire A4 portrait/paysage, couverture, carte générale, détails et pagination.
- [ ] J06 Capturer cartes à taille physique/qualité définie, données toujours éditables.
- [ ] J07 Attendre tuiles/polices/icônes ; timeout, progression, annulation et erreurs.
- [ ] J08 Inclure marqueurs DOM, légendes, attributions ; tester CORS et fonds absents.
- [ ] J09 Limiter mémoire, cache et contextes WebGL ; rendre séquentiellement si nécessaire.
- [ ] J10 Prévol débordements/résolution/ressources ; vérifier texte sélectionnable et crédits.
- [ ] J11 Inspecter PDF visuellement et par extraction ; rouvrir le projet et modifier la carte.
Porte : brochure complète sans interactions nécessaires ni promesse de navigation PDF imposée.

## P6 — Recette finale et documentation
- [ ] K01 Tester circuit touristique cinq étapes dans les trois modes.
- [ ] K02 Tester récit historique, comparaison territoriale et anciens documents complexes.
- [ ] K03 Tester mobile, clavier, zoom, lecteur d’écran et réduction des mouvements.
- [ ] K04 Tester charge, mémoire, stockage saturé, multi-onglets et reprise après erreur.
- [ ] K05 Synchroniser wiki et code avec l’agent responsable ; documenter contrats/migrations.
- [ ] K06 Distinguer plans de migration et feuille de route fonctionnelle dans les sommaires.
- [ ] K07 Publier rapport au commit livré avec commandes, artefacts, limites et non-testés.
Règle : une case n’est cochée qu’avec preuve ; build seul ne prouve pas la parité.
