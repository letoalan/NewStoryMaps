# NewStoryMaps — Corrections et réception P0–P5
Date : 8 novembre 2026.
Référence auditée : a310df0a0b5c1e054e2789e89537e8243c4919cd.
Complète verificationP0P4.md, impl2.md et tasks2.md sans les remplacer.
Statut : audit statique et prescriptions ; aucun build, test npm ou test navigateur exécuté indépendamment ici.
Ne pas annoncer une validation intégrale à partir de présence de code ou de recherches de chaînes dans le HTML.

## 1. Verdict et acquis
Les cartes réelles publiées, couches GeoJSON, dessin par sommets, profils de lecture et brochure imprimable sont présents.
L’échappement des attributs, le filtrage URL et le bornage des valeurs ont progressé.
Les diagnostics et la gestion de perte WebGL sont renforcés ; l’aperçu démonte le Canvas d’arrière-plan.
Ces acquis ne prouvent pas la correction de toutes les situations limites ni la qualité d’un PDF réel.
Réception globale non acquise : sécurité contextuelle, saturation de grille, ciblage des cartes et impression restent à corriger.
Ne pas effacer les preuves historiques ni cocher de nouvelles validations sans résultat reproductible.

## 2. Sources examinées
- src/core/publishDocument.ts, publishDocumentBlocks.ts, publishBrochure.ts.
- src/core/grid.ts, brochure.ts, sanitize.ts, mapSceneRender.ts, mapDiagnostics.ts.
- src/components/editor/Canvas.tsx, Editor.tsx et components/player/Player.tsx.
- src/components/dialogs/MapStudioModal.tsx, BrochureModal.tsx.
- src/components/document/PageGrid.tsx et blocks/MapBlockPreview.tsx.
- scripts/verify-p4.mjs et verify-p5.mjs.
La présence de tests ne vaut pas observation de leur exécution sur ce commit.
Les anciens points non relus ne sont pas automatiquement certifiés par ce rapport.

## 3. C01 — Sécurité HTML/JavaScript imbriqués (bloquant publication)
Constat : renderPublishedBlockHTML injecte des identifiants dans onclick après escapeAttr.
Une entité HTML représentant une apostrophe est redécodée dans l’attribut puis interprétée en JavaScript.
Échapper pour HTML ne protège donc pas une chaîne JavaScript incluse dans cet attribut.
Chemins concernés : triggerNarrativeBinding et stepGallery ; identifiants importés à considérer non fiables.
Correction : supprimer les gestionnaires inline dépendant des données ; utiliser data-* et addEventListener.
Séparer validation URL, stockage brut canonique et échappement final au point d’insertion.
Éviter le double échappement des URL déjà traitées par sanitizeSafeUrl.
Critère : URL avec paramètres & conservée ; identifiants avec guillemets/apostrophes inertes et fonctionnels.
Tester les charges hostiles dans un vrai DOM navigateur, pas seulement avec html.includes.

## 4. C02 — Saturation du refit (bloquant intégrité de composition)
Constat : refitBlocksToGrid ajoute le bloc même quand aucune place libre n’existe après réduction à 1×1.
Contre-exemple : deux blocs à replacer dans une grille cible 1×1 ; le second est ajouté en collision.
Correction : retourner placements, non-placés et diagnostics au lieu de masquer l’échec.
Choix explicites : annuler, ajouter des pages ou accepter une adaptation prévisualisée.
Ne pas réduire silencieusement un grand bloc rempli au point de rendre son contenu illisible.
Maintenir l’opération atomique et annulable.
Critère : aucune collision retournée comme réussite, même sur page saturée et grand nombre de blocs.

## 5. C03 — Ciblage et sémantique des associations (bloquant narration)
Constat : triggerNarrativeBinding trouve la scène puis fait flyTo sur toutes les cartes du document.
Les actions highlight/filter ne sont pas implémentées comme comportements distincts dans cette fonction.
Correction : limiter les instances au mapId, puis appliquer une commande propre à l’action.
Highlight doit mettre en évidence l’objet ; filter doit modifier la visibilité prévue ; zoom doit cadrer la cible.
Ne pas déplacer les cartes sans rapport ; gérer carte absente, objet supprimé et page masquée.
Critère : deux cartes de territoires différents restent indépendantes au clic sur un bloc narratif.

## 6. C04 — Préparation d’impression : états trompeurs (bloquant P5)
Constat : le statut passe à Prêt après 4000 ms, y compris si les cartes sont encore en chargement.
L’absence de MapLibre et les erreurs peuvent également aboutir à un statut prêt.
Plusieurs événements error d’une même carte peuvent décrémenter plusieurs fois pending.
Le bouton window.print reste actif pendant la préparation.
Correction : état par ressource et règlement unique par carte ; préparation/ready/error/timeout/cancelled.
Attendre cartes, images, polices et dimensions stabilisées ; afficher erreurs détaillées.
Désactiver l’impression avant readiness ; traiter aussi le raccourci d’impression et le prévol.
Un timeout doit signaler un résultat incomplet, pas certifier une réussite.
Critère : réseau lent ou CDN absent ne produit jamais un faux statut prêt.

## 7. C05 — Cartes statiques haute résolution non démontrées (bloquant promesse PDF)
Constat : preserveDrawingBuffer est activé mais aucune capture en image ni résolution physique cible n’est calculée.
Les cartes WebGL restent montées simultanément ; ni rendu séquentiel ni libération après capture dans le générateur lu.
Correction : choisir/documenter capture statique ou impression WebGL et leurs limites réelles.
Pour une capture : largeur/hauteur physiques × résolution cible, attente réelle, image finale et libération de map.
Intégrer marqueurs DOM, légendes et crédits séparément s’ils sont absents du canvas capturé.
Prévoir cache borné, progression, annulation et borne du nombre de contextes actifs.
Critère : mesurer les dimensions raster du résultat et inspecter un PDF multi-cartes imprimé.
Ne pas appeler haute résolution un simple réglage preserveDrawingBuffer.

## 8. C06 — Numérotation carte/texte incohérente (bloquant sens documentaire)
Constat : la conversion numérote les bindings alors que les marqueurs utilisent feature.numberIndex.
Les deux compteurs ne sont pas synchronisés ; un renvoi peut désigner le mauvais numéro.
Correction : table de correspondance stable par couple mapId/featureId et politique explicite de numérotation.
Préserver les numéros existants valides ; gérer plusieurs blocs associés au même objet.
Critère : chaque renvoi imprimé désigne le bon objet et reste stable après réouverture.

## 9. C07 — Prévol : présence textuelle n’est pas conformité
Constat : une légende quelconque ou un bloc source non vide peut suffire pour attributionsPresent.
Les crédits OSM/CARTO sont codés en dur même si le fournisseur réel diffère.
selectableTextGuaranteed reste déduit de la présence de texte, non d’une inspection du PDF.
Correction : résoudre attributions par fond/couche/ressource ; afficher vérifié/non vérifié/échec.
Conserver les textes requis et leurs liens quand ils doivent apparaître dans la publication.
Ne pas présenter la sélection de texte comme garantie avant extraction du PDF final.
Critère : fond alternatif et médias licenciés conservent leurs crédits exacts ; texte PDF extractible.

## 10. C08 — Réimportabilité : distinguer HTML, projet et PDF
Constat : storymap-data est intégré au HTML imprimable, pas démontré comme pièce éditable du PDF.
Le test de réouverture extrait ce HTML puis modifie un objet en mémoire.
Correction : annoncer PDF pour diffusion ; projet JSON/ZIP ou HTML pour réédition.
Proposer téléchargement conjoint du projet source et de la publication.
Si un PDF avec source embarquée est souhaité, spécifier et implémenter cette capacité séparément.
Critère : parcours réel réimportant le fichier annoncé comme éditable, avec cartes et médias intacts.

## 11. C09 — Cohérence grille écran / brochure physique
Constat : PageGrid garde des cellules carrées fixes en pixels ; la brochure utilise 1fr dans un cadre A4 physique.
AspectRatio autour d’un contenu fixe ne garantit pas des proportions ou retours à la ligne identiques.
Correction : modèle commun cadre/zone utile/marges/gouttières et stratégie explicite de transposition.
Prévisualiser les changements de format sans perte ni superposition ; contrôler les débordements réels.
Critère : comparer même page dans éditeur, présentation et PDF sur textes longs, images et cartes.

## 12. C10 — WebGL : distinguer correction et preuve
Acquis : positionnement explicite, ResizeObserver, retrait des écouteurs et map.remove, Canvas démonté pendant aperçu.
Limite : ResizeObserver est installé après création et ne garantit pas une taille positive à l’initialisation.
Correction : attendre un conteneur mesurable ou reporter explicitement la création ; observer les changements.
Le module lu journalise [StoryMap:...] et canvas.width/height, pas window.__STORYMAP_DIAG__ ni drawingBufferWidth/Height.
Aligner l’annonce sur le code ou ajouter réellement le journal structuré et les dimensions du contexte.
Limiter les contextes dans blocs, profils multi-pages, exports et brochure, pas seulement dans l’aperçu du mode 1.
Critère : journal et captures sur séquences répétées édition/aperçu/lecture et charge multi-cartes.
L’explication interne de map.remove doit être vérifiée sur la version effectivement utilisée avant affirmation causale définitive.

## 13. C11 — Reconstruction après perte de contexte
Constat : reloadKey recrée la carte mais n’est pas une dépendance des effets de restitution du trajet.
Une reconstruction peut laisser une instance sans tous les contenus précédents.
Correction : cycle unique de montage/réinstallation des sources, couches, symboles, marqueurs et état de vue.
Utiliser une révision d’instance ou un contrôleur qui déclenche toute la restitution après load/style.load.
Critère : perte simulée puis reconstruction conserve trajet, symboles et marqueurs sans édition supplémentaire.
Tester aussi changement de fond, démontage et callbacks asynchrones tardifs.

## 14. C12 — Couverture de tests et preuves de livraison
Acquis : les tests appellent davantage de fonctions réelles.
Limite : présence de @page, idle, preserveDrawingBuffer et textes dans une chaîne ne prouve pas le résultat navigateur/PDF.
Un aller-retour JSON n’est pas une preuve de rendu cartographique ni de sécurité d’un gestionnaire inline.
Ajouter tests de saturation de grille, ciblage multi-cartes, numérotation et encodage unique des URL.
Ajouter tests navigateur pour cartes réelles, profils, clavier, impression et erreurs réseau.
Produire un PDF réel, contrôler taille des pages, texte extrait, ressources et rendu visuel.
Consigner npm ci, build et suites p0–p5 avec version Node, navigateur, plateforme, commit et journaux.
Ne pas annoncer une non-régression absolue sur quelques assertions d’objets.

## 15. Ordre de réalisation
1. C01 sécurité ; C02 intégrité des compositions ; C03 associations ciblées.
2. C04 readiness ; C05 capture/résolution/contextes ; C06 numérotation.
3. C07 prévol ; C08 promesses de réédition ; C09 fidélité des formats.
4. C10/C11 recette et restauration WebGL ; C12 preuves de tests de bout en bout.
Préserver mode 1 et ses échanges historiques ; relancer sa recette après chaque modification partagée.
Les tests peuvent être développés en parallèle des correctifs ; aucune validation sans preuve.
Sources maintenues : 199 lignes maximum, exemptions documentées pour tiers/licences/lockfile/artefacts.

## 16. Checklist de réception
- [ ] R01 Aucun code de données interpolé dans un gestionnaire inline ; tests navigateur hostiles réussis.
- [ ] R02 Refit saturé renvoie un diagnostic ou des pages supplémentaires sans chevauchement caché.
- [ ] R03 Deux cartes indépendantes : zoom/highlight/filter corrects sur la seule cible.
- [ ] R04 Impression indisponible avant chargement complet ; erreurs et timeout explicitement bloquants.
- [ ] R05 Résolution cartographique calculée et vérifiée ; contextes bornés et libérés.
- [ ] R06 Numéros des objets et renvois identiques dans toutes les pages.
- [ ] R07 Attributions réelles et texte PDF inspectés ; pas de garantie calculée par simple présence.
- [ ] R08 HTML/projet réimportables distingués du PDF de diffusion dans l’interface.
- [ ] R09 Mise en page comparée entre écran et A4, sans contenu coupé ou silencieusement réduit.
- [ ] R10 Tests de perte/restauration WebGL avec réinstallation complète des contenus.
- [ ] R11 Build et suites p0–p5 exécutés et journaux rattachés au commit corrigé.
- [ ] R12 PDF multi-pages produit et contrôlé ; recette navigateur du mode 1 sans régression.
Aucune case pré-cochée : ce rapport décrit le travail de réception restant, pas son exécution.

## 17. Statut de sortie attendu
Distinguer implémenté, testé unitairement, testé en navigateur et reçu sur livrable final.
Conserver les corrections constatées de V01–V10 et P5 sans en déduire une clôture intégrale.
Réviser tasks2.md et le wiki seulement après preuve, en conservant les limitations explicites.
Le jalon est clos quand les publications et la brochure réelles satisfont le contrat, pas quand le HTML contient les mots attendus.
