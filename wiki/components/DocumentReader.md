# Lecteur Immersif Documentaire (`DocumentReader.tsx`)

Source : [`src/components/document/DocumentReader.tsx`](file:///src/components/document/DocumentReader.tsx)

## Rôle
Composant de lecture et de présentation plein écran dédié aux modes « Document enrichi » et « Brochure A4 » (Phase P4 — Jalons I01 à I04).

## 3 Profils de Présentation (I01)
1. **Diapositive (`slide`)** :
   - Présentation page par page centrée sur l'écran.
   - Puces de navigation directes (dots) et boutons Précédent / Suivant.
2. **Défilement Vertical (`vertical`)** :
   - Lecture linéaire descendante fluide, particulièrement adaptée aux écrans larges et mobiles.
3. **Défilement Horizontal (`horizontal`)** :
   - Feuilletage de gauche à droite type magazine / publication papier.

## Navigation et Accessibilité (I02, I03, I04)
- **Sommaire interactif** : volet latéral rétractable permettant d'accéder instantanément à n'importe quelle page.
- **Raccourcis clavier** : Flèches gauche/droite pour tourner les pages, `Échap` pour fermer le sommaire ou quitter la présentation.
- **Arbitrage du focus** : désactivation des raccourcis de changement de page lors de la saisie dans un champ texte.
- **Plein écran** : bascule native via l'API Fullscreen du navigateur.

