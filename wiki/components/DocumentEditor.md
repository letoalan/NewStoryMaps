# Atelier Documentaire (DocumentEditor.tsx)

Le composant `src/components/document/DocumentEditor.tsx` constitue l'atelier d'édition principal dédié aux modes 2 (« Document enrichi ») et 3 (« Brochure A4 »), isolant complètement leur expérience utilisateur de l'éditeur de StoryMap classique.

## Fonctionnalités

1. **Routage dédié et étanche (P1 / P2)** :
   - Invoqué directement depuis `App.tsx` dès lors que `story.mode === 'rich-document'` ou `story.mode === 'brochure'`.
   - Empêche toute confusion visuelle ou perte de contexte avec l'atelier séquentiel à étapes.

2. **Navigation multi-pages (G08)** :
   - Contrôle de pagination avec boutons précédent / suivant et indicateur « Page X / N ».
   - Bouton « + Page » pour créer une nouvelle page dans le document.
   - Bouton de suppression de page (avec verrou de sécurité interdisant la suppression de la dernière page restante).

3. **Sélecteur de format à la volée (G01)** :
   - Permet de basculer entre A4 Portrait, A4 Paysage, Écran 16:9 et Responsive.
   - Met à jour dynamiquement la mise en page tout en conservant les blocs existants.

4. **Persistance et indicateur d'enregistrement (P0-C)** :
   - Affiche en continu l'état de sauvegarde (`saved`, `saving`, `dirty`, `error`).
   - Permet le déclenchement immédiat d'une sauvegarde manuelle via `flushSave()`.

