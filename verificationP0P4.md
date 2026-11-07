# NewStoryMaps — Vérification P0 à P4
Date : 7 novembre 2026, contrôle du soir.
Commit audité : 7634816806a83cb8c56e5131f501925fb23a9ae8 (P4).
Comparaison : 433d55d5e906f3b5e7362b80d4b322016b9aecc8 (P3).
Nature : audit statique du code consulté et des scripts ; aucune exécution indépendante du build ou des tests navigateur.
Ce document ne constitue ni un journal de tests réussis ni une certification de sécurité.
Les constats décrivent le commit indiqué ; une correction ultérieure exige une nouvelle vérification.

## 1. Verdict synthétique
Le projet a progressé : cartes réelles dans l’atelier et les blocs, lecteur documentaire et branchement des exports enrichis.
La chaîne édition → lecture → publication reste toutefois incomplète : le HTML enrichi remplace les cartes par des encadrés.
P0 à P4 sont cochées dans tasks2.md ; cette déclaration doit être distinguée de la réception effective.
P5 et P6 restent ouvertes, conformément à l’absence de chaîne PDF finalisée et de recette globale démontrée.
Recommandation : stabiliser la fidélité des rendus et la sécurité de publication avant d’étendre le PDF.

## 2. Périmètre vérifié
Sources principales : src/App.tsx ; src/context/StoryContext.tsx ; src/core/grid.ts et io.ts.
Cartes : MapStudioModal.tsx ; document/blocks/MapBlockPreview.tsx.
Lecture/publication : DocumentReader.tsx ; src/core/publishDocument.ts ; scripts/verify-p4.mjs.
Préparation PDF : src/core/brochure.ts ; suivi : tasks2.md ; métadonnées du commit.
Les constats antérieurs non relus ne sont pas réputés corrigés ou reconfirmés par ce seul audit.
Pas de modification du code ni des statuts de tâches lors de cette vérification.

## 3. Progrès reconnus depuis P3
- StoryContext récupère une file de sauvegarde rejetée avant l’écriture suivante.
- Historique borné à 50 états et suivi des révisions conservé.
- App attend newStory avant d’ouvrir l’éditeur ; le format est désormais transmis à la création.
- expandBlock saute une aire intermédiaire interdite ; shrinkBlock recherche une aire autorisée.
- MapStudioModal extrait son contenu dans un composant monté à l’ouverture : hooks conditionnels corrigés.
- Atelier MapLibre réel : clic de positionnement, fonds, marqueurs et capture de caméra.
- MapBlockPreview affiche une vraie carte et plusieurs marqueurs, avec focus d’association.
- DocumentReader est routé pour les modes document/brochure.
- Profils internes slide/vertical/horizontal, sommaire et plein écran présents.
- io.ts choisit generateDocumentHTML pour les modes enrichi/brochure, y compris en ZIP.
Ces progrès sont constatés dans les sources ; leur qualité d’usage reste à éprouver en navigateur.

## 4. État par phase
| Phase | Constat | Réception |
| --- | --- | --- |
| P0 | Corrections de persistance et pipeline présents ; parité et recette globale non réexécutées | À consolider, pas de certification intégrale |
| P1 | Modes et routage documentaire présents ; création attendue et format pris en compte | Parcours à tester de bout en bout |
| P2 | Grille réelle, contraintes d’aire améliorées | Adaptation de format et collisions encore à corriger |
| P3 | Carte visible et modèle d’objets utilisable | Dessin/rendu lignes et surfaces incomplets |
| P4 | Lecteur documentaire et export dédiés | Non réceptionnable sans cartes réelles dans la publication |
| P5 | Conversion et prévol amorcés | PDF non livré ; phase ouverte pertinente |
| P6 | Recette globale restant à faire | Phase ouverte pertinente |
Ne pas calculer un pourcentage de complétude à partir des seules cases cochées.

## 5. V01 — Blocage : cartes absentes du HTML enrichi
Source : src/core/publishDocument.ts, branche b.type === 'map'.
Le générateur écrit un encadré sombre avec titre et mention de liaison.
Aucune carte MapLibre n’est créée par ce lecteur publié.
Le JSON embarqué peut conserver les données sans que la page les représente.
Impact : une carte visible dans l’éditeur/lecteur disparaît visuellement à l’export HTML ou ZIP.
Correction : partager un moteur cartographique exportable ou embarquer son assemblage autonome.
Réception : ouvrir hors de l’éditeur une publication contenant carte, objets, couches et associations.

## 6. V02 — Rendu incomplet des lignes et polygones
Sources : MapStudioModal.tsx ; MapBlockPreview.tsx.
Le formulaire construit désormais des coordonnées de LineString/Polygon, mais le rendu extrait un premier point et pose un marqueur.
Une géométrie stockée n’est donc pas une ligne ou une surface affichée.
Les formes sont prédéfinies autour du clic, pas dessinées sommet par sommet.
Correction : sources GeoJSON, couches line/fill/symbol et outils de création/modification de sommets.
Réception : tracer, modifier, sauvegarder, rouvrir et publier une vraie ligne et un vrai polygone.

## 7. V03 — Synchronisation des vues et crédits cartographiques
Source : MapBlockPreview.tsx.
L’initialisation du bloc utilise centre/zoom mais pas l’ensemble pitch/bearing/bounds de la scène.
Une capture de nouvelle vue ne déclenche pas une synchronisation complète à elle seule.
attributionControl est désactivé sans remplacement visible dans le composant lu.
Correction : synchroniser caméra/étendue et rétablir les attributions requises dans tous les rendus.
Réception : une même vue enregistrée apparaît de façon cohérente dans atelier, bloc et publication.

## 8. V04 — Divergence lecteur interne / lecteur publié
Sources : DocumentReader.tsx ; publishDocument.ts.
Le lecteur interne offre trois profils ; l’export montre seulement une page à la fois.
L’export ne reprend pas le même sommaire ni toutes les capacités de blocs.
Les types non gérés explicitement passent dans une représentation textuelle générique.
Correction : contrat de rendu commun et matrice de prise en charge par type de bloc/support.
Tout contenu non restituable doit être signalé, jamais omis silencieusement.
Réception : vérifier contenu et comportement de chaque type de bloc, pas seulement présence dans le JSON.

## 9. V05 — Navigation et accessibilité partielles
Source : DocumentReader.tsx et script du HTML enrichi.
Les points sont des div cliquables, sans sémantique de bouton ni commande clavier équivalente explicite.
Le filtre clavier ignore input/textarea/select mais ne traite pas suffisamment carte active et contenteditable.
En profils vertical/horizontal, le sommaire change l’index sans défiler vers la page correspondante.
Le plein écran n’est pas synchronisé avec fullscreenchange et ses échecs réels.
Gestion explicite de la réduction des mouvements à compléter dans ces parcours.
Correction : boutons nommés, aria-current, focus, arbitrage clavier et scroll vers la cible.
Réception : parcours intégral au clavier, focus dans carte/carrousel, Échap et lecteur d’écran.

## 10. V06 — Collision lors du changement de format
Source : src/core/grid.ts, refitBlocksToGrid.
Chaque bloc est ramené individuellement dans les limites sans détection collective des chevauchements.
Deux blocs valides dans le format initial peuvent se superposer dans un format plus étroit.
Correction : placement global, diagnostic des conflits et choix explicite de l’auteur ; opération annulable.
Réception : pages remplies converties entre portrait/paysage/responsive sans perte ni superposition cachée.

## 11. V07 — Formats physiques non garantis
Source : getGridDimensions dans src/core/grid.ts.
A4 et 16:9 restent des préréglages de cellules en pixels, avec marges en millimètres.
Ces paramètres ne garantissent ni une page A4 exacte ni un cadre au ratio annoncé.
Correction : définir cadre physique/ratio, zone utile, gouttières et résolution séparément.
Réception : dimensions de page vérifiées dans le PDF et cadrage de présentation contrôlé.

## 12. V08 — Sécurité du nouveau générateur documentaire
Source : src/core/publishDocument.ts.
URL d’image et attribut alt sont interpolés dans du HTML ; sanitizeHTML ne remplace pas un échappement d’attribut.
Niveau de titre, coordonnées/dimensions de grille et valeurs de liaison exigent validation de type et de domaine.
Correction : valider les URL/protocoles ; échapper les attributs ; borner les nombres et niveaux 1–6.
Conserver l’assainissement pour les seuls contenus HTML explicitement autorisés.
Ne pas confondre sécurisation du mode 1 et sécurisation du nouveau générateur.
Réception : tests de documents importés hostiles et vérification de l’artefact dans un navigateur isolé.

## 13. V09 — Brochure : garanties prématurées
Source : src/core/brochure.ts.
runBrochurePreflight renvoie toujours selectableTextGuaranteed=true et attributionsPresent=true.
Ces valeurs ne résultent pas d’une inspection de document produit.
La conversion de galerie conserve contactSheetItems et place la première image dans url.
Le générateur documentaire lu ne rend pas contactSheetItems : la planche annoncée n’est pas démontrée.
Correction : statuts vérifié/non vérifié/échec et rendu réel de tous les éléments conservés.
Ne pas annoncer une conversion sans perte avant une recette visuelle complète.
Réception : toutes les images attendues sont présentes et les crédits sont contrôlés dans la sortie finale.

## 14. V10 — Couverture des tests P4 trop large dans son annonce
Source : scripts/verify-p4.mjs.
Les profils sont testés via un tableau local ; la pagination et le filtre clavier sont recopiés dans le test.
Le roundtrip appelle le véritable générateur mais vérifie surtout chaînes et données extraites.
Il n’ouvre pas les composants ni le fichier produit dans un navigateur.
Le test peut réussir quand la carte publiée n’est qu’un encadré.
Correction : tests unitaires des fonctions réelles, tests de composants et scénarios navigateur d’artefacts.
Le succès du roundtrip JSON n’est pas la preuve d’un rendu fidèle ni d’une accessibilité fonctionnelle.

## 15. Ordre de correction conseillé
1. Rendre les cartes réelles dans la publication enrichie et conserver données/associations réimportables.
2. Sécuriser attributs et URL du générateur avant diffusion de documents importés.
3. Afficher réellement les lignes/surfaces, synchroniser les cadrages et crédits.
4. Empêcher les collisions de format et définir des cadres A4/16:9 exacts.
5. Unifier les capacités lecteur interne/export et fiabiliser clavier/sommaire/plein écran.
6. Tester en navigateur l’éditeur, la présentation et les exports indépendants.
7. Poursuivre ensuite capture statique, pagination et génération PDF.
Aucune modification automatique de tasks2.md : réviser ses statuts avec preuves de recette.

## 16. Scénario minimal de réception P0–P4
- Créer un projet enrichi de deux pages avec texte, image, tableau et carte.
- Dessiner un point, une ligne et un polygone ; associer deux blocs narratifs à des objets.
- Enregistrer une caméra avec orientation/inclinaison ; vérifier son rappel.
- Sauvegarder pendant une nouvelle modification puis simuler une erreur et une reprise.
- Fermer/rouvrir ; vérifier données, pages, géométries et liaisons.
- Changer de format sur une page chargée ; vérifier collisions et annulation.
- Lire en slide/vertical/horizontal ; tester clavier, sommaire, focus et plein écran.
- Exporter HTML et ZIP ; ouvrir hors de l’application avec une origine sans stockage préalable.
- Vérifier que cartes, lignes, surfaces, médias, crédits et associations restent réellement utilisables.
- Réimporter les artefacts et comparer les documents normalisés.
- Tester défaillance CDN/fond et au moins un ancien projet de référence du mode 1.
- Consigner commit, environnement, commandes, résultats et artefacts reproductibles.

## 17. Critère de clôture
Distinguer implémenté, testé automatiquement, vérifié manuellement et non testé.
Conserver les acquis de cette livraison sans assimiler ses cases cochées à une certification.
P4 pourra être réceptionnée quand le document publié préservera réellement les cartes et les fonctions promises.
Ce rapport est une base de correction ; il ne remplace pas la recette finale P6.
