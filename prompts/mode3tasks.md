# NewStoryMaps — Suivi de l’atelier PAO générique
Date : 8 novembre 2026 — Référence : mode3.md.
Baseline distante observée : ccbfdd6d23de7c20ab9a66fa5d26a098916bc57b.
Toutes les tâches sont ouvertes ; aucune réalisation ni exécution présumée.
Périmètre : points 1–9 validés ; point 10 et toute évaluation pédagogique exclus.
Coordonner correct.md, newplan.md et zoom.md ; préserver les trois modes.

## M0 — Contrats et baseline
- [x] M0.01 Réauditer main et identifier les primitives réutilisables et travaux parallèles (validé par verify-mode3 Test 1).
- [x] M0.02 Constituer fixtures : brochure, magazine et document non touristique (validé par editorialFixtures.ts).
- [x] M0.03 Exécuter tests/build existants et archiver le comportement de référence (validé par suite npm test).
- [x] M0.04 Versionner sélection, groupes, verrouillage, ordre de lecture et transformations d’images (validé par Block dans project.ts & editorial.ts).
- [x] M0.05 Formaliser placement guidé/avancé et superpositions autorisées sans changement silencieux (validé par editorialLayout.ts).
- [x] M0.06 Définir matrice de rendu éditeur/présentation/HTML/PDF et contrats de migration (validé par editorialGabarits.ts).
Porte M0 : architecture documentée, pas de deuxième modèle concurrent ni dépendance à une formation.

## M1 — Interface d’atelier
- [ ] M1.01 Organiser pages à gauche, plan de travail au centre et propriétés à droite.
- [ ] M1.02 Retirer des cadres les formulaires qui encombrent le document.
- [ ] M1.03 Réutiliser palette flottante ; focus, clavier, Échap et ancrage hors cellule.
- [ ] M1.04 Ajouter aperçu sans outils, zoom d’atelier et panneau contextuel repliable.
- [ ] M1.05 Exclure poignées, +, formulaires et guides des publications.
- [ ] M1.06 Tester petit écran et navigation sans souris.
Porte M1 : composition finale lisible sans confusion avec les commandes d’édition.

## M2 — Trame et commandes
- [ ] M2.01 Définir cadres physiques, marges, colonnes, gouttières et sous-grille avancée.
- [ ] M2.02 Ajouter repères masquables et aimantation désactivable.
- [ ] M2.03 Ajouter sélection multiple et déplacement avec alternative clavier.
- [ ] M2.04 Ajouter redimensionnement et coordonnées/dimensions précises.
- [ ] M2.05 Aligner et distribuer selon sélection/page/zone utile/objet clé.
- [ ] M2.06 Dupliquer, grouper/dégrouper et verrouiller/déverrouiller.
- [ ] M2.07 Gérer avant/arrière indépendamment de l’ordre de lecture.
- [ ] M2.08 Détecter les collisions non autorisées et distinguer superpositions intentionnelles.
- [ ] M2.09 Prévisualiser changement de format et traiter toutes les pages de suite sans perte.
- [ ] M2.10 Rendre chaque commande composée atomique et annulable.
- [ ] M2.11 Tester duplication et rechargement des identifiants, groupes et placements.
Porte M2 : aucune perte cachée au déplacement, changement de format ou réimport.

## M3 — Typographie
- [ ] M3.01 Définir styles génériques : couverture/rubrique/chapô/intertitre/corps/légende/crédit/info/action.
- [ ] M3.02 Raccorder héritage projet et exceptions locales au moteur de thème.
- [ ] M3.03 Ajouter tailles, graisses, interlignage, alignement et espaces avant/après.
- [ ] M3.04 Préserver sémantique des titres et ordre de lecture.
- [ ] M3.05 Détecter débordement réel après chargement des polices ; localiser le cadre concerné.
- [ ] M3.06 Proposer correction sans réduction automatique illisible ni texte masqué à l’impression.
- [ ] M3.07 Tester polices non installées, paragraphes longs et aller-retour de styles.
Porte M3 : hiérarchie cohérente et absence de coupe silencieuse sur le document publié.

## M4 — Images
- [ ] M4.01 Conserver original et paramètres de recadrage non destructif.
- [ ] M4.02 Ajouter déplacement dans le cadre, zoom, point focal et ratio conservé.
- [ ] M4.03 Ajouter modes remplir/montrer entièrement et réinitialisation.
- [ ] M4.04 Proposer luminosité/contraste simples avec rendu identique à l’export.
- [ ] M4.05 Séparer légende, crédit, licence et texte alternatif.
- [ ] M4.06 Calculer définition effective selon cadre physique et pixels réellement utilisés après crop.
- [ ] M4.07 Ajouter avertissement configurable et aperçu à taille de lecture pour contenus denses.
- [ ] M4.08 Tester orientation, petits médias, recadrages et rechargement sans altérer l’original.
Porte M4 : image non déformée, source conservée et qualité de sortie honnêtement indiquée.

## M5 — Cartographie éditoriale
- [ ] M5.01 Ajouter préréglages situation/principale/détail/accès/circuit/comparaison.
- [ ] M5.02 Séparer cadrage du bloc et données cartographiques communes.
- [ ] M5.03 Raccorder titre, légende, sources, crédits et renvois aux cartes.
- [ ] M5.04 Proposer échelle/orientation lorsque pertinentes et cohérentes avec le rendu final.
- [ ] M5.05 Vérifier grande carte et détails locaux dans les gabarits.
- [ ] M5.06 Transposer animations en repères/tracés statiques ; conserver cartes éditables dans le projet.
- [ ] M5.07 Tester préparation multi-cartes, mémoire et contextes WebGL bornés.
Porte M5 : la carte est un document lisible, pas seulement une décoration de fond.

## M6 — Gabarits neutres
- [ ] M6.01 Créer couverture, fiche informative, double page magazine, parcours et promotion.
- [ ] M6.02 Prévoir exemples touristiques facultatifs et exemples d’autres domaines.
- [ ] M6.03 Autoriser page blanche, duplication et gabarits personnels.
- [ ] M6.04 Appliquer un gabarit existant avec aperçu, correspondance de contenus et annulation.
- [ ] M6.05 Définir couvertures, pagination, éléments répétés et marges intérieures.
- [ ] M6.06 Exporter une double page en pages individuelles par défaut, sans imposition implicite.
Porte M6 : modèles réutilisables sans vocabulaire ni référentiel de formation imposé.

## M7 — Contrôle de publication
- [ ] M7.01 Définir erreurs, avertissements et contrôles non vérifiés, sans score esthétique.
- [ ] M7.02 Contrôler texte coupé, ressource requise absente, scène absente et cadre hors page.
- [ ] M7.03 Contrôler poster statique requis lors de conversion d’un contenu dynamique.
- [ ] M7.04 Avertir sur définition faible, petit texte, contraste, crédits et styles incohérents.
- [ ] M7.05 Ne pas prétendre vérifier une licence ou un lien sur simple présence textuelle.
- [ ] M7.06 Localiser l’anomalie et proposer action ou dérogation explicite selon sa nature.
- [ ] M7.07 Vérifier absence de barème, référentiel, suivi étudiant et bon à tirer pédagogique imposé.
Porte M7 : contrôle documentaire générique, niveaux de preuve honnêtes et aucune notation intégrée.

## M8 — Exports et réception
- [ ] M8.01 Produire PDF réel portrait/paysage et contrôler dimensions physiques.
- [ ] M8.02 Vérifier texte extrait, images recadrées, légendes, cartes et crédits dans le PDF.
- [ ] M8.03 Comparer éditeur, aperçu, HTML et PDF ; absence d’aides d’édition dans les sorties.
- [ ] M8.04 Tester ZIP avec ressources, styles, groupes et réimport dans un contexte indépendant.
- [ ] M8.05 Rejouer suites historiques et build ; tester annuler/sauver/fermer/rouvrir.
- [ ] M8.06 Tester pages saturées, textes longs, petits écrans et ressources indisponibles.
- [ ] M8.07 Vérifier brochure touristique, magazine culturel et fiche scientifique/informative.
- [ ] M8.08 Limiter les sources maintenues à 195 lignes avec exemptions documentées.
- [ ] M8.09 Mettre à jour wiki et aide génériques sans référentiel pédagogique.
- [ ] M8.10 Publier rapport au commit livré avec environnement, commandes, artefacts et non-testés.
Porte finale : réception sur livrables réels ; aucun succès visuel déduit d’une seule chaîne HTML.

## Exclusions à conserver
Pas de notation, score esthétique, référentiel de compétences ni évaluation intégrée.
Pas de promesse imprimeur professionnel sans chaîne dédiée (PDF/X, CMJN, fonds perdus, imposition).
Pas de réécriture de stack ni d’abandon des correctifs de stabilité en cours.
