# NewStoryMaps — Suivi mode 2 : web responsive et interactions
Date : 8 novembre 2026 — Référence : mode2.md.
Baseline distante observée : f4b4d18b03c21d24d53d8dd33ee15955f66cce80.
Toutes les tâches sont ouvertes ; aucune exécution ni réalisation présumée.
Coordination : mode3.md, newplan.md, correct.md, zoom.md et contrats historiques.

## D0 — Baseline et modèle
- [ ] D0.01 Réauditer main et coordonner les modifications parallèles.
- [ ] D0.02 Constituer fixtures : deux sections, deux cartes, couches et médias.
- [ ] D0.03 Rejouer tests/build existants avec journaux et sauvegardes de projets.
- [ ] D0.04 Définir sections et dispositions responsive sans modèle de contenu concurrent.
- [ ] D0.05 Versionner migrations pages/sections en préservant blocs et identifiants.
- [ ] D0.06 Définir Trigger/Action/Target/Parameters/State et séparer état de lecture du document.
- [ ] D0.07 Tester les champs nouveaux sur toute la chaîne stockage/export/réimport.
Porte D0 : contrat documenté et anciens projets réouverts sans transformation silencieuse.

## D1 — Atelier et sections
- [ ] D1.01 Organiser navigation sections, composition et inspecteur contextuel.
- [ ] D1.02 Sortir les formulaires des cellules ; conserver palette flottante et commandes courtes.
- [ ] D1.03 Afficher viewport simulé et échelle d’atelier distincts.
- [ ] D1.04 Ajouter sections couverture, texte–image, carte–récit, galerie, informations et conclusion.
- [ ] D1.05 Paramétrer largeur contenue/pleine largeur, espacements et hauteur selon contenu.
- [ ] D1.06 Proposer carte large et fiches compactes avec variantes de disposition.
- [ ] D1.07 Gérer repères/cellules vides en édition sans réserves publiées involontaires.
- [ ] D1.08 Tester changement de modèle avec aperçu, annulation et zéro perte de blocs.
Porte D1 : document composé en sections lisibles, sans imposer un format A4 au web.

## D2 — Responsive, thème et hero
- [ ] D2.01 Définir dispositions desktop/tablette/mobile et ordre de lecture explicite.
- [ ] D2.02 Préserver le contenu commun sans copies divergentes par breakpoint.
- [ ] D2.03 Ajouter carte persistante si espace suffisant, variante empilée sinon.
- [ ] D2.04 Redimensionner les cartes et préserver les états au changement de largeur.
- [ ] D2.05 Définir surfaces neutre/accent discret/mise en évidence/sans cadre via thème.
- [ ] D2.06 Propager les polices, couleurs et exceptions dans tous les rendus.
- [ ] D2.07 Affiner hero court/moyen/immersif, point focal, voile et action Découvrir.
- [ ] D2.08 Distinguer pause vidéo, pause du récit et pause du véhicule.
- [ ] D2.09 Comparer aperçu et éditeur au même viewport ; aucun outil dans la lecture.
Porte D2 : lecture mobile recomposée, pas simple miniaturisation de la grille bureau.

## D3 — Composants de boutons
- [ ] D3.01 Ajouter bloc Boutons et actions intégrées aux fiches narratives.
- [ ] D3.02 Proposer dispositions verticale/horizontale/grille et largeur auto/pleine largeur.
- [ ] D3.03 Ajouter tuile à action unique sans interactions imbriquées.
- [ ] D3.04 Hériter styles principal/secondaire/discret/lien du thème et gérer états de focus/actif.
- [ ] D3.05 Publier navigation URL en lien et commande locale en bouton natif.
- [ ] D3.06 Préserver sélection et contenu lors d’un remplacement de type de bloc.
Porte D3 : commandes lisibles dans cellules unitaires ou fusionnées, sans bouton forcé à remplir son cadre.

## D4 — Assistant de configuration
- [ ] D4.01 Créer texte → action → cible → options → test → validation.
- [ ] D4.02 Afficher une phrase de synthèse compréhensible pour chaque interaction.
- [ ] D4.03 Sélectionner visuellement les cibles compatibles ; alternative par liste recherchable.
- [ ] D4.04 Ajouter choix carte/vue/objet/couche/cadrage sans saisie d’identifiants techniques.
- [ ] D4.05 Replier les réglages avancés et afficher les options propres à l’action.
- [ ] D4.06 Clic en édition sélectionne ; Tester exécute temporairement avec réinitialisation.
- [ ] D4.07 Montrer les liaisons d’édition sans les publier comme décor technique.
Porte D4 : une interaction se configure sans JavaScript, expression de filtre ni vocabulaire moteur obligatoire.

## D5 — Actions de première livraison
- [ ] D5.01 Aller à une section/page avec comportement selon le profil de lecture.
- [ ] D5.02 Ouvrir une URL validée avec indication claire du changement de contexte.
- [ ] D5.03 Zoomer sur un lieu/cadrage et mettre en évidence un objet, actions séparées.
- [ ] D5.04 Afficher/masquer une couche précisément identifiée.
- [ ] D5.05 Isoler un objet et fournir une réinitialisation explicite.
- [ ] D5.06 Restaurer une vue générale enregistrée avec états définis.
- [ ] D5.07 Ajouter commande/bascule/choix exclusif et états initiaux cohérents.
- [ ] D5.08 Implémenter l’exécuteur commun React/runtime publié, sans duplication manuelle.
- [ ] D5.09 Tester deux cartes indépendantes ; aucun effet sur une carte non ciblée.
Porte D5 : commandes déterministes et état visible, réversible et identique à la publication.

## D6 — Enrichissements encadrés
- [ ] D6.01 Déplier du texte et ouvrir une fiche avec fermeture/retour de focus.
- [ ] D6.02 Piloter une galerie par son contrôleur et sa cible stable.
- [ ] D6.03 Piloter lecture/pause/rejeu via contrôleurs existants sans moteur concurrent.
- [ ] D6.04 Ajouter Explorer un lieu : repère, cadrage et fiche dans un ordre défini.
- [ ] D6.05 Arbitrer exploration et suivi véhicule ; proposer Reprendre le suivi.
- [ ] D6.06 Tester commandes répétées, interruption et callbacks tardifs.
Porte D6 : interaction composite explicable, sans constructeur libre de scripts ou de scénarios arbitraires.

## D7 — Maintenance et sécurité
- [ ] D7.01 Ajouter panneau Interactions avec déclencheurs, cibles, états et diagnostics.
- [ ] D7.02 Préserver liens au renommage/déplacement ; remapper duplication selon références internes/externes.
- [ ] D7.03 Traiter suppression de cible par choix explicite, jamais substitution silencieuse de carte.
- [ ] D7.04 Valider types d’actions, URL, valeurs et références à l’import/publication.
- [ ] D7.05 Utiliser data-* et événements sans code auteur ou gestionnaires inline construits depuis les données.
- [ ] D7.06 Isoler les essais et états visiteurs de la persistance du document.
- [ ] D7.07 Nettoyer animations, médias et écouteurs à la sortie/changement de projet.
Porte D7 : aucune référence cassée ne provoque perte de contenu ou action sur une autre cible.

## D8 — Accessibilité et conversion statique
- [ ] D8.01 Tester clavier/tactile, focus visible, libellés et absence de survol obligatoire.
- [ ] D8.02 Exposer bascules via aria-pressed ; dépliages via aria-expanded et cible contrôlée.
- [ ] D8.03 Gérer groupes exclusifs avec sémantique adaptée et état perceptible.
- [ ] D8.04 Défilement mobile vers carte/fiche sans perte de repère ; retour disponible.
- [ ] D8.05 Respecter réduction des mouvements et arbitrage clavier carte/carrousel/document.
- [ ] D8.06 Définir équivalent statique de chaque action : renvoi, texte développé, carte dédiée, poster ou lien.
- [ ] D8.07 Présenter rapport de conversion mode 2 → 3 avec adaptations à valider.
- [ ] D8.08 Vérifier qu’aucun contenu n’est perdu derrière un bouton dans la brochure.
Porte D8 : commandes accessibles et brochure compréhensible sans interaction.

## D9 — Publications et réception
- [ ] D9.01 Exporter sections, cartes, boutons et profils avec les ressources nécessaires en HTML/ZIP.
- [ ] D9.02 Réimporter avec identifiants, associations, style et état initial conservés.
- [ ] D9.03 Exécuter tests purs et intégration sur les fonctions réelles, pas logique recopiée.
- [ ] D9.04 Exécuter une recette navigateur avec cartes présentes, clics, filtres et médias.
- [ ] D9.05 Tester mobile, deux cartes, cible absente, actions rapides et erreurs réseau.
- [ ] D9.06 Comparer éditeur, aperçu et artefact ouvert hors application au même viewport.
- [ ] D9.07 Produire une brochure et inspecter les équivalents documentaires des interactions.
- [ ] D9.08 Rejouer suites historiques/build et préserver mode 1.
- [ ] D9.09 Contrôler 195 lignes des sources maintenues avec exemptions ; mettre à jour wiki générique.
- [ ] D9.10 Publier rapport de commit avec environnement, commandes, preuves, artefacts et non-testés.
Porte finale : fidélité de lecture et des commandes vérifiée sur livrables réels, sans notation pédagogique intégrée.
