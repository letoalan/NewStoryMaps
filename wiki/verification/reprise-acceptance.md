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
