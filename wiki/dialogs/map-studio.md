# Atelier Carte Dédié (`MapStudioModal.tsx`)

Source : [`src/components/dialogs/MapStudioModal.tsx`](file:///src/components/dialogs/MapStudioModal.tsx)

## Rôle
Atelier modal de modélisation cartographique accessible depuis l'éditeur documentaire (`DocumentEditor.tsx`), permettant de concevoir et paramétrer des scènes cartographiques sans perturber la sélection ni la mise en page du document (H01).

## Fonctionnalités

1. **Multi-cartes et Scènes (H01, H04)** :
   - Sélection parmi les cartes du projet (`story.maps`).
   - Création de nouvelles scènes cartographiques thématiques ou suppression d'une scène superflue.
   - Sélection du fond de plan (Positron clair, Dark Matter sombre, Satellite Esri).

2. **Gestion des Couches et Objets (H02)** :
   - Ajout et masquage/affichage à la volée des couches de la scène.
   - Ajout d'entités vectorielles géolocalisées :
     * **Point** : repère de localisation, monument, arrêt.
     * **LineString** : itinéraire, tracé de frontière, axe routier/fluvial.
     * **Polygon** : zone géographique, quartier, périmètre d'étude.
   - Attribution d'un numéro d'ordre pour les renvois imprimés (Mode 3, Brochure A4).

3. **Préservation du Contexte (H01)** :
   - L'ouverture et la fermeture de l'atelier préservent fidèlement la page courante et le bloc sélectionné dans l'atelier documentaire.

