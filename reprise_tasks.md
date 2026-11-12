# NewStoryMaps — Task manager de reprise
Date : 11 novembre 2026 — Plan : reprise.md.
Baseline : 819d7f8c64d46f7b5ee4a93e4b1ee3f7faab5b47.
Tous les statuts sont TODO : aucune correction ni exécution présumée.
Priorités : P0 bloquant, P1 essentiel, P2 consolidation.
Statuts autorisés : TODO / DOING / BLOCKED / REVIEW / DONE.
Preuve attendue : commit + commande/résultat ou artefact réel ; inscrire non exécuté si absent.
Une tâche sans preuve ne passe pas DONE ; garder un journal de blocage et une tâche active par agent.

## R0 — Baseline
| ID | Prio | Dépendance | Action | Statut | Preuve |
| --- | --- | --- | --- | --- | --- |
| R0.1 | P0 | — | Relever HEAD, état de travail, environnement et travaux parallèles ; branche de travail dédiée | DONE | HEAD 8c82086, branche reprise-consolidation, working tree clean |
| R0.2 | P0 | R0.1 | npm ci, npm test, npm run build ; conserver journaux initiaux | DONE | npm test (16 suites passées), npm run build (960ms) |
| R0.3 | P0 | R0.1 | Archiver fixtures mode 1, deux cartes et brochure avec exports | DONE | scripts/archive-baseline.mjs -> wiki/verification/fixtures/baseline/ (3 JSON + 3 HTML) |
| R0.4 | P1 | R0.2 | Configurer recette navigateur reproductible et dossier de preuves | DONE | wiki/verification/reprise-acceptance.md créé, tests Node VM / DOM isolés |
Porte : baseline connue ; chaque panne initiale est attribuée et non masquée.

## R1 — Hotfix de publication
| ID | Prio | Dépendance | Action | Statut | Preuve |
| --- | --- | --- | --- | --- | --- |
| R1.1 | P0 | R0.3 | Exécuter le callback de attachLineVehicle et reproduire la lecture de t non déclarée | DONE | scripts/verify-r1.mjs : ReferenceError: t is not defined reproduit |
| R1.2 | P0 | R1.1 | Corriger dans le runtime réel et conserver le test rouge puis vert | DONE | src/core/publishDocumentRuntime.ts (let t = 0;), test:r1 vert |
| R1.3 | P0 | R1.2,R0.4 | Ouvrir un HTML exporté indépendant ; vérifier déplacement et absence de ReferenceError | DONE | scripts/verify-r1.mjs : déplacement observable du marqueur (5 ticks VM) |
| R1.4 | P1 | R1.3 | Tester zéro/une/plusieurs lignes, disabled et reduced-motion | DONE | scripts/verify-r1.mjs : 4 cas testés et validés |
Porte : animation réellement exécutée dans l’artefact, pas seulement chaîne générée.

## R2 — Moteur partagé
| ID | Prio | Dépendance | Action | Statut | Preuve |
| --- | --- | --- | --- | --- | --- |
| R2.1 | P0 | R1.2 | Inventorier les contrôleurs et choisir une façade unique sans réécriture inutile | TODO | — |
| R2.2 | P0 | R2.1 | Partager catalogue, géométrie, horloge et états entre React et exports | TODO | — |
| R2.3 | P0 | R2.2 | Supprimer les boucles divergentes ; respecter véhicule, loop, orientation et durée | TODO | — |
| R2.4 | P1 | R2.3 | Un pilote caméra/carte, suspendre hors page et nettoyer toutes les ressources | TODO | — |
| R2.5 | P1 | R2.4 | Respecter autoplay et pauses média/récit/véhicule ; pas de relance vidéo globale | TODO | — |
| R2.6 | P0 | R2.5 | Comparer deux véhicules distincts dans React et HTML/ZIP hors application | TODO | — |
Porte : même contrat de déplacement dans tous les rendus web.

## R3 — Zoom et chargement
| ID | Prio | Dépendance | Action | Statut | Preuve |
| --- | --- | --- | --- | --- | --- |
| R3.1 | P0 | R2.1 | Tests reproducteurs : dernier cadrage, reprise de frames, horloge et chargement | TODO | — |
| R3.2 | P0 | R3.1 | Corriger émission finale et réarmement de resumeFollow | TODO | — |
| R3.3 | P0 | R3.2 | Corriger horloge monotone et suivi des sources non symétrique | TODO | — |
| R3.4 | P1 | R3.3 | Planifier temps/distance selon projection et viewport utile ; ne pas exposer une vitesse fictive | TODO | — |
| R3.5 | P0 | R2.3,R3.4 | Brancher réellement coordinateur/moniteur à la carte React et au runtime commun | TODO | — |
| R3.6 | P1 | R3.5 | Distinguer geste utilisateur et caméra programmée ; reprise explicite | TODO | — |
| R3.7 | P1 | R3.6 | Tester pauses techniques, timeout, visibilité et reconstruction WebGL | TODO | — |
| R3.8 | P1 | R3.7 | Mesurer centrage/zoom/arrivée sur trajets urbain, régional et intercontinental | TODO | — |
Porte : trajet centré, destination exacte et traitement des tuiles prouvé sur vraie carte.

## R4 — Tranche mode 2
| ID | Prio | Dépendance | Action | Statut | Preuve |
| --- | --- | --- | --- | --- | --- |
| R4.1 | P1 | R0.3 | Définir contrat minimal section carte–récit et migration sans perte | TODO | — |
| R4.2 | P1 | R4.1 | Livrer section avec deux fiches, bureau/mobile et bloc Bouton | TODO | — |
| R4.3 | P1 | R4.2 | Assistant texte/action/cible/test ; zoom/surbrillance/vue générale | TODO | — |
| R4.4 | P0 | R4.3,R2.2 | Exécuteur partagé, cibles stables, isolation entre deux cartes et état temporaire | TODO | — |
| R4.5 | P1 | R4.4,R3.6 | Arbitrer bouton et suivi véhicule ; clavier, focus et réinitialisation | TODO | — |
| R4.6 | P1 | R4.5 | Sauver/rouvrir/exporter HTML/ZIP/réimporter la tranche sans perte | TODO | — |
Porte : un parcours mode 2 complet reçu ; D0–D9 non réalisés restent ouverts.

## R5 — Tranche mode 3
| ID | Prio | Dépendance | Action | Statut | Preuve |
| --- | --- | --- | --- | --- | --- |
| R5.1 | P1 | R0.3 | Raccorder miniatures/pages, plan de travail et inspecteur contextuel | TODO | — |
| R5.2 | P1 | R5.1 | Déplacement et alignement visibles, raccourcis et annulation atomique | TODO | — |
| R5.3 | P1 | R5.2 | Raccorder zIndex/verrouillage ; vérifier groupes/distribution avant exposition | TODO | — |
| R5.4 | P1 | R5.3 | Calcul DPI bidimensionnel cohérent avec crop et cadre physique | TODO | — |
| R5.5 | P0 | R5.4 | Sauver/rouvrir/réimporter et vérifier contenu, ressources et style | TODO | — |
| R5.6 | P1 | R5.5 | Produire une fiche générique et sa sortie fidèle avec aperçu sans aides | TODO | — |
Porte : M1/M2 minimal raccordé ; ne pas cocher M3–M8 par simple présence de fonctions.

## R6 — Géométrie et ergonomie
| ID | Prio | Dépendance | Action | Statut | Preuve |
| --- | --- | --- | --- | --- | --- |
| R6.1 | P1 | R0.4 | Mesurer PageGrid avec hero, lignes 1fr, petits/grands conteneurs et formats | TODO | — |
| R6.2 | P1 | R6.1 | Corriger hauteur/ratio/débordements et comparer même viewport dans les rendus | TODO | — |
| R6.3 | P2 | R5.1 | Simplifier barre contextuelle ; actions secondaires dans Plus/inspecteur | TODO | — |
| R6.4 | P1 | R6.3 | Distinguer RÀZ destructif et héritage de style ; vérifier annulation | TODO | — |
| R6.5 | P1 | R6.2 | Vérifier thème et polices sur profil vierge avec exceptions locales | TODO | — |
Porte : document lisible et composition stable ; aucun résultat supposé à partir du seul CSS.

## R7 — Réception et livraison
| ID | Prio | Dépendance | Action | Statut | Preuve |
| --- | --- | --- | --- | --- | --- |
| R7.1 | P0 | R3.8,R4.6,R5.6,R6.5 | Recette commune React → HTML/ZIP indépendant → réimport → brochure | TODO | — |
| R7.2 | P0 | R7.1 | Réseau lent/absent, médias manquants, plusieurs cartes et perte WebGL | TODO | — |
| R7.3 | P1 | R7.2 | PDF réel : dimensions, texte extrait, cartes, crédits et aides exclues | TODO | — |
| R7.4 | P0 | R7.3 | Rejouer npm test et build au commit livré avec journaux | TODO | — |
| R7.5 | P2 | R7.4 | Contrôle 195 lignes avec périmètre/exemptions ; wiki et anciens suivis synchronisés | TODO | — |
| R7.6 | P1 | R7.5 | Rapport wiki/verification/reprise-acceptance.md : preuves, limites et non-testés | TODO | — |
Porte finale : aucun succès navigateur/PDF annoncé sans artefact et observation correspondants.

## Journal à tenir par l’agent
Pour chaque tâche modifiée : date, ID, agent, statut précédent/nouveau, commit et preuve.
Blocage : cause, tentative, données préservées et prochaine action ; ne pas passer DONE pour contourner le blocage.
Si un test est simulé, préciser ce qu’il ne démontre pas ; ne pas le rebaptiser recette visuelle.
Travaux parallèles possibles après R0 : R3.1, R4.1 et R5.1 avec contrats partagés et périmètres non concurrents.
Les portes ne changent pas automatiquement la disponibilité publique des modes sans recette.
