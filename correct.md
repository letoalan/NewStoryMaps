# NewStoryMaps — Correctif de fidélité des rendus et réception N0–N5
Date : 8 novembre 2026.
Audit de référence : 1523f1360c9ca2c80c9678bc6a2b9aa56f2673f8 (P6+MODIF).
main observée à la préparation : a5e95ec2bce45d376ae7fe9bdd711f9582cc58b3.
Le contenu de ce nouveau commit n’a pas été réaudité : reconfirmer chaque défaut avant correction.
Statut : prescriptions pour l’agent de codage, pas correctif applicatif déjà exécuté.
Complète newplan.md, newtasks.md et correctionP0P5.md sans les remplacer.
Aucun résultat de build, test navigateur ou PDF n’est certifié par ce document.

## 1. Objectif et acquis à préserver
Conserver palette flottante, thème résolu, hero éditable, marqueurs à deux niveaux et contrôleur de véhicule.
Rétablir un contrat identique entre application React et publications HTML/ZIP.
Conserver les trois modes ; la brochure reste une représentation statique explicite.
Ne pas développer de nouvelles fonctions avant de stabiliser les parcours déjà annoncés.
Respecter les échanges historiques, la persistance et les corrections antérieures.

## 2. F0 — Revalidation préalable et baseline
Comparer main à l’audit de référence et classer chaque observation : corrigée / confirmée / non reproduite.
Lire les nouvelles sources avant modification pour ne pas écraser le travail parallèle.
Exécuter npm ci, npm test et npm run build dans un environnement consigné.
Archiver fixtures et journaux ; une case cochée ne remplace pas une preuve.
Créer un scénario deux pages, deux véhicules distincts, hero vidéo, thème et exception de bloc.
Utiliser ce même scénario dans React, HTML autonome, ZIP et brochure.

## 3. F1 — Un seul moteur d’animation (priorité haute)
Constat de référence : React utilise vehicleController ; les exports utilisent des boucles setInterval distinctes.
Les véhicules exportés utilisent un pictogramme générique au lieu du catalogue sélectionné.
Les runtimes avancent par incréments fixes et interpolation par indice plutôt que distance cumulée.
Correction : extraire un noyau indépendant React/MapLibre pour horloge, états et interpolation.
Partager aussi catalogue et géométrie ; placer MapLibre dans un adaptateur de rendu.
Assembler ce noyau pour les publications avec un bundle ou une factory autonome vérifiable.
Ne pas recopier manuellement une seconde implémentation dans une chaîne de template.
Conserver licences, sécurité des SVG et indépendance des scripts de l’éditeur.
Critère : avion, bateau, bus et vélo restent distincts et suivent le même trajet sur tous les rendus web.

## 4. F2 — Commandes et cycle de vie temporel
Respecter enabled, loop, durationSec, orientToRoute et cameraFollow sans valeurs implicites divergentes.
Ne pas activer l’autoplay des chapitres si l’utilisateur ne l’a pas demandé.
Distinguer pause du récit, pause du véhicule et pause liée à la visibilité ; documenter leur coordination.
Suspendre les animations des pages masquées ; libérer frames, intervalles, marqueurs et écouteurs au retrait.
Définir une politique caméra lorsqu’une carte comporte plusieurs trajets animés : un seul pilote actif.
Une action narrative doit pouvoir interrompre ou remplacer le suivi selon une règle visible.
Conserver un registre des contrôleurs actifs et une destruction idempotente.
Critère : navigation rapide et ouvertures répétées ne multiplient ni boucles ni ressources WebGL.

## 5. F3 — Suivi caméra et interruptions utilisateur
Constat de référence : zoomstart peut être déclenché par les mouvements programmatiques du suivi lui-même.
Ne suspendre le suivi que pour une interaction utilisateur réellement identifiée.
Utiliser originalEvent lorsque pertinent ou un mécanisme explicite distinguant commande interne et geste utilisateur.
Prévoir une commande Reprendre le suivi ; ne pas forcer la caméra après un geste sans consentement.
Restaurer source, couches, symboles, véhicule et progression après style.load ou reconstruction WebGL.
Critère : une animation qui modifie son propre zoom n’annule pas son suivi ; un geste utilisateur le suspend.

## 6. F4 — Horloge, visibilité et commandes concurrentes
Définir précisément le temps actif utilisé et le comportement en cas de ralentissement du rendu.
Réexaminer le plafond de 250 ms par tick : il peut étirer la durée effective sous forte charge.
Si ce plafond est conservé pour lisibilité, documenter la différence entre durée cible et durée réelle.
Tester pause/stop/seek/destroy pendant que l’onglet est masqué.
Effacer les drapeaux de reprise lorsqu’une commande explicite annule la lecture.
Garantir qu’aucun callback de caméra ne survient après destroy.
Critère : temps simulé, changements de visibilité et commandes entrelacées produisent un état déterministe.

## 7. F5 — Vidéo : respecter l’intention de lecture (priorité haute)
Constat de référence : HeroSection appelle play à plusieurs chargements, et updateUI relance toutes les vidéos.
Remplacer les appels dispersés par une politique commune de lecture.
Décision : autoplay autorisé ET média actif ET page/onglet visible ET absence de pause explicite.
Un clic Pause doit rester prioritaire sur navigation, rerender et loadedmetadata/canplay.
Changement de page : arrêter les vidéos sortantes ; ne démarrer que celles dont la politique le permet.
Gérer refus d’autoplay, erreurs et poster sans relance surprise au prochain clic global.
Nettoyer les écouteurs de reprise et les promesses tardives au démontage.
Réduction des mouvements : poster ou lecture explicitement sollicitée, sans animation forcée.
Critère : pause conservée après changement de profil ; vidéo cachée inactive ; autoplay=false respecté.

## 8. F6 — Vidéos intégrées et transposition statique
Ne pas présenter une iframe sans interaction comme équivalente à une vidéo native contrôlable.
Choisir un support explicite : API fournisseur avec pause/reprise, lecteur avec commandes accessibles ou poster ouvrable.
Préserver transparence sur dépendances réseau, services tiers et ressources non embarquables.
Ne pas neutraliser les commandes nécessaires par pointer-events:none sans alternative fonctionnelle.
Brochure : image de remplacement choisie/poster, crédit et éventuel lien ; pas de vidéo active.
Critère : même intention pause/reprise pour fichier natif et intégration ; poster présent au PDF.

## 9. F7 — Thème et ressources typographiques
Conserver resolveVisualStyle comme contrat commun ; inventorier les valeurs encore figées dans les générateurs.
Propager surfaces, ombres, espacements et couleurs sémantiques sans confondre thème et structure.
Charger ou embarquer réellement les polices sélectionnées dans les publications selon leurs licences.
Si indisponibles, proposer une substitution déclarée ; le nom CSS seul n’est pas une ressource portable.
Vérifier logo, polices, posters et médias après export/réimport dans un profil navigateur vierge.
Conserver les exceptions locales lors d’une modification globale de charte.
Critère : police non installée et thème personnalisé restent cohérents dans l’éditeur et les sorties.

## 10. F8 — Remettre la recette au niveau du contrat
Constat : la VM N5 utilise querySelectorAll retournant [] et des timers inertes.
Elle valide une partie de la navigation, pas le chargement des cartes ni une animation réelle.
Conserver ces tests comme tests de script/navigation, sans les appeler réception navigateur complète.
Ajouter une horloge contrôlée avec exécution des callbacks et des instances de carte simulées observables.
Puis ajouter des tests navigateur du lecteur React et des artefacts exportés.
Tester pause, boucle, changement de page, geste utilisateur, vidéo, média absent et perte/reprise WebGL.
Le roundtrip JSON prouve des données, pas le rendu ni les interactions.

## 11. F9 — Rapport de validation et performances
Aligner budget du rapport et seuil du script : l’audit observe un rapport à 5 ms et un test acceptant 250 ms.
Séparer microbenchmark CPU, fluidité visuelle, mémoire et nombre de contextes WebGL.
Consigner navigateur, Node, système, commit exact, commandes, journaux et artefacts.
Produire un PDF réel et inspecter pages, textes, posters, crédits et cartes.
Ne pas déclarer la recette PDF complète sur simple présence de @page dans un HTML.
Le contrôle actuel des lignes src/scripts ne prouve pas celui de toute la documentation : préciser le périmètre.
Sources maintenues : 195 lignes maximum ; exemptions explicites pour tiers, licences et artefacts générés.

## 12. Ordre d’exécution
F0 baseline → F1 moteur partagé → F2/F3/F4 lecture et caméra.
F5/F6 lecture média → F7 propagation complète → F8/F9 réception.
Écrire les tests reproducteurs avec chaque correctif et relancer les suites historiques.
Préserver les acquis ; ne pas multiplier les demandes fonctionnelles au-delà de newplan.md.

## 13. Checklist de réception
- [ ] R01 Défauts reconfirmés sur le commit réel, avec comparaison aux corrections déjà intégrées.
- [ ] R02 Même catalogue et même noyau temporel dans React et exports modes 1/2.
- [ ] R03 Véhicules sélectionnés reconnaissables, durée/boucle/pause conformes partout.
- [ ] R04 Pages masquées sans animation active ; aucun timer orphelin après sortie.
- [ ] R05 Suivi caméra non interrompu par ses propres mouvements ; geste utilisateur respecté.
- [ ] R06 Pause/stop/seek/visibilité/reconstruction WebGL testés avec une horloge contrôlée.
- [ ] R07 Vidéo explicitement arrêtée non relancée par navigation ou chargement ; iframe contrôlable ou alternative déclarée.
- [ ] R08 Thème et polices vérifiés hors du poste de développement ; exceptions locales conservées.
- [ ] R09 Artefacts HTML/ZIP ouverts dans un vrai navigateur et réimportés sans perte.
- [ ] R10 PDF produit et inspecté ; distinction entre fichier source éditable et PDF diffusé maintenue.
- [ ] R11 npm test et build exécutés au commit livré ; rapports et seuils cohérents.
- [ ] R12 Wiki et newtasks.md corrigés selon preuves, avec non-testés explicitement maintenus.
Aucune case pré-cochée : cette checklist n’atteste pas d’une exécution déjà réalisée.

## 14. Scénario manuel minimal
Créer deux pages avec charte, police non installée, exception locale, hero vidéo et deux véhicules distincts.
Naviguer en lecture React, interrompre le suivi, mettre en pause puis changer de profil et de page.
Masquer l’onglet et revenir ; vérifier que les commandes explicites restent prioritaires.
Exporter HTML/ZIP, ouvrir hors de l’éditeur et refaire exactement la même séquence.
Contrôler icônes, trajets, durée, pause, médias actifs et consommation des contextes.
Imprimer la brochure avec poster et véhicule statique puis inspecter le PDF.
Archiver résultat attendu/observé et reproduction des éventuels écarts.
