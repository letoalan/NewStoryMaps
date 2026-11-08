# Moteur Brochure Statique A4 & Impression PDF (P5 — J01 à J11)

Cette page documente l'architecture du **Mode 3 Brochure statique & PDF** répartie entre [`src/core/brochure.ts`](file:///src/core/brochure.ts), [`src/core/publishBrochure.ts`](file:///src/core/publishBrochure.ts) et [`src/components/dialogs/BrochureModal.tsx`](file:///src/components/dialogs/BrochureModal.tsx).

## 1. Décision d'architecture J04 : Moteur Print CSS `@page` vs Rastérisation PDF JS

Conformément au jalon **J04**, deux approches ont été comparées sur des documents complexes (multi-pages A4, tableaux, textes longs, cartes MapLibre GL et marqueurs DOM numérotés) :

| Critère | Rastérisation JS (`html2canvas` + `jsPDF`) | Moteur Print CSS `@page` + MapLibre `preserveDrawingBuffer` (Retenu) |
| :--- | :--- | :--- |
| **Texte sélectionnable (J10)** | Non (converti en image bitmap floue au zoom) | **Oui (100 % vectoriel, sélectionnable et indexable)** |
| **Césure & tableaux** | Fragile, coupures arbitraires | **Natif navigateur (`break-after: page`, grille CSS A4)** |
| **Mémoire & WebGL (J09)** | Risque de dépassement mémoire sur > 5 pages | **Faible empreinte, attente événement `idle` + timeout `4000ms`** |
| **Réimportabilité (J11)** | Impossible depuis un PDF binaire | **Totale via `#storymap-data` dans le fichier `.brochure.html`** |

**Décision J04** : Le générateur [`generateBrochurePrintHTML`](file:///src/core/publishBrochure.ts) produit un document paginé A4 (`210×297 mm` ou `297×210 mm`) utilisant `@page { size: A4 portrait|landscape; margin: 0; }` et `preserveDrawingBuffer: true` sur chaque carte MapLibre avec synchronisation sur l'événement `idle` (J07).

## 2. Contrats et Fonctions Clés

- **`isBlockAllowedInBrochure(type)` (J01)** : Autorise uniquement les blocs statiques (`title`, `text`, `callout`, `image`, `table`, `map`, `legend`, `source`) et exclut les carrousels dynamiques (`gallery`) dans [`EmptyCellMenu.tsx`](file:///src/components/document/EmptyCellMenu.tsx).
- **`convertRichDocumentToBrochure(source)` (J02, J03, V09)** :
  - Crée une copie indépendante (`mode: 'brochure'`) sans modifier le projet Mode 2 d'origine.
  - Transforme chaque `gallery` (`data.items` ou `data.images`) en planche contact statique (`isContactSheet: true`, `contactSheetItems`) sans perte de vues ni de légendes.
  - Convertit automatiquement les liaisons narratives en renvois numérotés (`#1, #2...`).
- **`runBrochurePreflight(story)` (J10, V09)** :
  - Inspecte honnêtement les pages et retourne les alertes `NON_A4_FORMAT`, `DYNAMIC_GALLERY`, `TEXT_OVERFLOW`, `MISSING_MEDIA_URL`, `MISSING_MAP_ATTRIBUTION` et `UNNUMBERED_BINDING`.
  - Calcule `attributionsPresent` en vérifiant que chaque carte possède une attribution ou un bloc `source` sur la page.

