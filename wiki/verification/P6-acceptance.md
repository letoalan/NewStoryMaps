# Rapport de Réception Finale P6 (K01 à K07)

Ce document consigne la recette finale et les preuves d'exécution du jalon **P6**, conformément à [`impl2.md`](file:///impl2.md) et [`tasks2.md`](file:///tasks2.md).

## 1. Environnement d'Exécution et Commandes

- **Plateforme** : Windows 11 x64 / Node.js v24.14.1 / PowerShell
- **Moteur de build** : Vite v8.3.6, TypeScript v5.6.3, React 18.3.1
- **Commande de recette globale** :
  ```bash
  npm test
  # Exécute séquentiellement : test:p0, test:p1, test:p2, test:p3, test:p4, test:p5, test:p6
  ```
- **Commande de compilation de production** :
  ```bash
  npm run build
  # Résultat : tsc && vite build -> ✓ built in 1.51s, 0 erreurs, 0 avertissements TS
  ```

---

## 2. Preuves de Recette par Tâche (K01 à K07)

### K01 — Circuit touristique cinq étapes dans les trois modes
- **Données** : Parcours parisien 5 étapes (Tour Eiffel, Invalides, Louvre, Notre-Dame, Montmartre) avec coordonnées GPS, tracés, légendes et couches vectorielles.
- **Mode 1 (StoryMap classique)** :
  - Génération HTML autonome via [`generateStandaloneHTML`](file:///src/core/publish.ts).
  - Validation aller-retour : `extractStoryFromHTML` restitue les 5 étapes et leurs caméras exactes.
  - Export/import v2 historique vérifié sans dégradation.
- **Mode 2 (Document enrichi)** :
  - Génération HTML autonome multi-profils via [`generateDocumentHTML`](file:///src/core/publishDocument.ts).
  - Vérification des liaisons narratives `data-action="narrative-binding"` vers l'étape #1.
  - Réimportation et intégrité de la scène cartographique prouvées.
- **Mode 3 (Brochure statique A4)** :
  - Conversion via [`convertRichDocumentToBrochure`](file:///src/core/brochure.ts).
  - Prévol [`runBrochurePreflight`](file:///src/core/brochurePreflight.ts) validé (`ready: true`).
  - Sortie imprimable A4 [`generateBrochurePrintHTML`](file:///src/core/publishBrochure.ts) avec blocage d'impression avant stabilisation cartographique (`readiness`).

### K02 — Récit historique, comparaison territoriale et anciens formats
- **Comparaison territoriale** : Deux scènes distinctes (`map-1850` et `map-2026`) avec couches et caméras isolées. Les manipulations sur l'une n'altèrent en rien l'autre.
- **Formats anciens** : Normalisation éprouvée des formats V1 (`maplibre-storymap` sans steps) et V2 (`story.chapters`, `byline`) avec valeurs de repli robustes.

### K03 — Mobile, clavier, accessibilité ARIA et réduction des mouvements
- **Arbitrage clavier** : [`shouldIgnoreReaderKeyEvent`](file:///src/core/readerNavigation.ts) protège les champs de saisie, les cartes MapLibre en interaction et les contrôles carrousel.
- **Navigation bornée** : `computeNextPageIndex` garantit le respect strict des bornes `[0, total - 1]`.
- **Accessibilité ARIA** : Vérification des attributs `aria-current="page"`, `aria-label`, `aria-expanded` et rôles sémantiques.
- **Réduction des mouvements** : Prise en charge native de `prefers-reduced-motion: reduce` avec transitions instantanées (`duration: 0`).

### K04 — Charge, saturation de grille et intégrité
- **Saturation de grille** : Test de 10 blocs soumis à une grille 2×2 (capacité 4). [`refitBlocksDetailed`](file:///src/core/grid.ts) place exactement 4 blocs et isole les 6 blocs excédentaires dans `unplaced` avec **zéro collision**.
- **Séquence de révisions** : Les révisions de sauvegarde (`revisionRef` / `savedRevisionRef`) empêchent tout écrasement ou faux statut « Enregistré ».

### K05 & K06 — Documentation et distinction migration vs roadmap
- Le wiki reflète l'architecture des 3 modes, la décomposition modulaire ($\le 195$ lignes) et la table des matières exhaustive [`wiki/Summary.md`](file:///wiki/Summary.md).
- Les mécanismes de migration (IndexedDB par copie, adaptateurs v1/v2) sont rigoureusement distingués de la feuille de route fonctionnelle.

### K07 — Limites documentées et points non testés
- **Pilote d'impression PDF** : La sélection vectorielle finale dépend du moteur d'impression PDF du navigateur client ; le prévol certifie la présence du flux textuel sans fausse promesse vectorielle.
- **WebGL multi-cartes** : La brochure borne les contextes actifs et libère la mémoire à la fermeture (`unload`).

