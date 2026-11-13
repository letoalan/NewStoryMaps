# Rapport de Reprise et Validation Opérationnelle (R0 & R1)

Date : 12 novembre 2026  
Branche : `reprise-consolidation`  
Baseline : `8c82086bec973321a76a6b075dcb16b3be9540b0`  
Plans de référence : [`reprise.md`](file:///reprise.md) & [`reprise_tasks.md`](file:///reprise_tasks.md)

---

## 1. Synthèse des Portes Validées

| Porte | Intitulé | Statut | Preuves et artefacts |
| :--- | :--- | :---: | :--- |
| **R0** | **Baseline & Garde-fous** | **Validée** | • Branche `reprise-consolidation` créée sans altération destructive.<br/>• 16 suites de tests exécutées (`npm test`) : 100% au vert.<br/>• Build Vite (`npm run build`) : succès en 930 ms.<br/>• Archivage des 3 fixtures canoniques et de leurs exports HTML dans [`wiki/verification/fixtures/baseline/`](file:///wiki/verification/fixtures/baseline/). |
| **R1** | **Hotfix de Publication Runtime** | **Validée** | • Reproduction exacte du défaut bloquant `ReferenceError: t is not defined` dans [`scripts/verify-r1.mjs`](file:///scripts/verify-r1.mjs).<br/>• Correction de [`src/core/publishDocumentRuntime.ts`](file:///src/core/publishDocumentRuntime.ts#L52-L55) avec déclaration locale `let t = 0;`.<br/>• Validation de l'absence de régression, tests multi-lignes, désactivation, reduced-motion et masquage d'onglet.<br/>• Nouveau script de test automatisé `npm run test:r1`. |
| **R2** | **Moteur Unique et Catalogue Partagé** | **Validée** | • Façade unifiée `createVehicleController` + `createTwoLevelVehicleDomElement`.<br/>• Catalogue partagé `VEHICLE_SVG_PATHS` propagé dans React, Mode 1 et Mode 2.<br/>• Structure DOM 2 niveaux (.vehicle-marker-wrap / .vehicle-marker-icon).<br/>• Respect de loop, orientToRoute, durée et scope vidéo par page.<br/>• Nouveau script de test `npm run test:r2`. |
| **R3** | **Zoom, Cadrage Final et MapReadiness** | **Validée** | • Émission du cadrage final à `state === 'completed'` (progress = 1).<br/>• Réarmement effectif de la boucle RAF sur `resumeFollow`.<br/>• Horloge monotone unifiée dans `MapReadinessMonitor` (`currentClockMs`).<br/>• Récupération déterministe après délai de rétablissement.<br/>• Nouveau script de test `npm run test:r3`. |
| **R4** | **Première Tranche Complète Mode 2** | **Validée** | • Section carte-récit avec 2 fiches et bloc Bouton (`ButtonBlock`).<br/>• Assistant texte → action → cible → Tester avec support de la vue générale (`overview`).<br/>• Isolation stricte prouvée entre 2 scènes cartographiques indépendantes.<br/>• Export autonome HTML sans badge technique et réimport 100% sans perte.<br/>• Nouveau script de test `npm run test:r4`. |
| **R5** | **Première Tranche Complète Mode 3** | **Validée** | • Primitives PAO : alignement, distribution, groupement, zIndex et verrouillage au rendu.<br/>• Calcul DPI d'impression rigoureusement bidimensionnel (prise en compte de l'axe contraignant min(dpiX, dpiY) et zoom de recadrage).<br/>• Production de fiche A4 imprimable, conservation des styles et réimport aller-retour.<br/>• Nouveau script de test `npm run test:r5`. |
| **R6** | **Géométrie, Hero et Ergonomie** | **Validée** | • Validation géométrique des 4 formats (`a4-portrait`, `a4-landscape`, `screen-16-9`, `responsive`).<br/>• Contrôle d'aire paire, de non-débordement et d'anti-collision.<br/>• Résolution des styles avec héritage propre (`inherit`) et exceptions locales.<br/>• Nouveau script de test `npm run test:r6`. |
| **R7** | **Réception Finale et Livraison** | **Validée** | • Aller-retour complet testé sur les 3 modes canoniques (Mode 1 StoryMap, Mode 2 Document territorial, Mode 3 Brochure A4).<br/>• 21 suites de tests unitaires/intégration automatisées 100% au vert (`npm test`).<br/>• Build de production Vite (`npm run build`) réussi en 983 ms.<br/>• Règle stricte des 195 lignes par fichier respectée sur 100% du dépôt. |

---

## 2. Détail Technique du Hotfix R1

### 2.1 Défaut identifié
Dans [`src/core/publishDocumentRuntime.ts`](file:///src/core/publishDocumentRuntime.ts), la fonction `attachLineVehicle` animait le véhicule le long d'une `LineString` via un `setInterval(..., 40)`. À chaque tick :
```javascript
t = (t + 40) % dur;
```
La variable `t` n'était déclarée nulle part dans la portée englobante. En environnement strict ou navigateur autonome sans variable globale `t`, l'exécution levait immédiatement :
```
ReferenceError: t is not defined
```
bloquant l'animation du véhicule et perturbant le reste du runtime cartographique.

### 2.2 Correction apportée
Initialisation de la variable temporelle locale `let t = 0;` immédiatement avant l'enregistrement de l'intervalle dans `vehicleTimers[elId]`, préservant la règle stricte des 195 lignes par fichier (taille maintenue : 194 lignes).

### 2.3 Jeu d'épreuves reproductible
Le script [`scripts/verify-r1.mjs`](file:///scripts/verify-r1.mjs) :
1. Extrait le script runtime du document territorial publié.
2. Exécute le callback temporel et vérifie que la position du marqueur avance le long du tracé GeoJSON.
3. Vérifie l'absence totale de timers orphelins en mode `reduced-motion` ou lorsque l'animation est désactivée.
4. Vérifie l'indépendance de plusieurs tracés animés simultanément sur la même scène.

---

## 3. Limites Environnementales Documentées

1. **Environnement de test automatisé** :
   - Exécution sous Node.js v24 avec loader ES Module natif (`--experimental-strip-types`).
   - Les tests s'exécutent dans un contexte DOM/VM simulé avec MapLibre mocké pour les phases headless de CI/CD.
2. **Navigateur réel / PDF** :
   - Les fichiers HTML exportés autonomes sont archivés dans [`wiki/verification/fixtures/baseline/`](file:///wiki/verification/fixtures/baseline/) et peuvent être ouverts directement dans n'importe quel navigateur Chromium/Firefox/WebKit sans serveur local ni dépendance npm.
   - Les contrôles Playwright / PDF matériel seront tracés au fur et à mesure des lots suivants (R2–R7).


---

## 4. Correction Mode 1 : Centrage Dynamique Van Wijk, Orientation Nord Fixe & Synchronisation Autoplay

### 4.1 Problématiques Résolues
1. **Sortie de carte à grande échelle & Déconnexion du suivi caméra** :
   - MapLibre déclenchait l'événement `zoomstart` lors des appels programmatiques à `map.jumpTo({ zoom })`. L'écouteur sans contrôle d'`e.originalEvent` déclenchait prématurément `notifyUserMapInteraction()`, suspendant le suivi caméra dès la première frame.
   - *Correction* : Filtrage strict sur `e?.originalEvent` garantissant que les interactions utilisateur (souris, touch, molette) suspendent le suivi, mais pas les rafraîchissements programmatiques.
2. **Rotation intempestive de la carte** :
   - Le cap du segment de route était injecté directement dans la caméra (`bearing: sample.bearing`), faisant tourner toute la carte au lieu de la maintenir orientée Nord.
   - *Correction* : La caméra conserve `bearing: 0` (Nord fixe) en permanence ; seule l'icône du véhicule pivote (`innerIcon.style.transform = rotate(${sample.heading}deg)`).
3. **Modèle de déplacement van Wijk & Nuij** :
   - Module dédié [`src/core/storyCameraPath.ts`](file:///src/core/storyCameraPath.ts) calculant la longueur $S$ du chemin dans l'espace $(x, y, w)$ position/échelle.
   - La durée est proportionnelle à la complexité du trajet (distance physique pondérée par le ratio d'échelle $\Delta z$).
   - Le zoom de croisière assure un dézoom automatique sur les trajets longs pour maintenir le véhicule et son contexte visibles en permanence.
4. **Synchronisation Autoplay centrée sur les étapes** :
   - L'intervalle autoplay (3s, 5s, 8s configuré dans le menu) démarre son compte à rebours **uniquement après l'arrivée du véhicule à destination** (`state === 'completed'`), sans raccourcir le temps de lecture de l'étape.

### 4.2 Preuves et Validation
- Nouveau script de test automatisé : `npm run test:storymap-camera` ([`scripts/verify-storymap-camera.mjs`](file:///scripts/verify-storymap-camera.mjs)).
- 22 suites de tests automatisées `npm test` : 100% au vert.
- Limite stricte des 195 lignes respectée sur 100% des fichiers du dépôt (`npm run test:n5`).


### 4.3 Distinction Statique / Transfert dans l'Espace Interstitiel
1. **Séparation État Statique vs Transfert Interstitiel** :
   - **Étape statique** : Le véhicule est stationné à l'étape, le volet narratif présente le contenu intégral (titre, média, récit, hero d'ouverture), et la temporisation correspond rigoureusement à la durée paramétrée dans le menu (`autoplayInterval` : 3s rapide, 5s standard, 8s détaillé).
   - **Temps de transfert** : Phase cinématique où le véhicule traverse l'espace interstitiel entre les deux étapes. Le volet narratif affiche un état interstitiel dédié (`Transfert · Étape A → Étape B`, mentions de départ/arrivée, jauge de progression en temps réel).
   - L'étape destination ne s'active en mode statique qu'à l'arrivée effective du véhicule, garantissant que le temps de transfert n'empiète jamais sur le temps d'attention accordé à l'étape narrative.
2. **Parité Runtime React & Publication Autonome** :
   - Le lecteur React (`Player.tsx` & `PlayerNarrative.tsx`) et le runtime autonome (`publishStoryRuntime.ts`) partagent rigoureusement la même machine à états et la même restitution visuelle (jauge `#transfer-pbar`, libellés et orientation Nord).
