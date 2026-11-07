# Sélecteur de Liaison Narrative (`BindingPickerModal.tsx`)

Source : [`src/components/dialogs/BindingPickerModal.tsx`](file:///src/components/dialogs/BindingPickerModal.tsx)

## Rôle
Fenêtre modale permettant d'associer un bloc de contenu quelconque (paragraphe, titre, encadré, tableau, miniature de carte) à un élément ou à une scène cartographique (H05).

## Options de Liaison

1. **Choix de la Carte Cible (H05)** :
   - Sélection parmi les scènes du projet (`ProjectMap`).

2. **Élément Cartographique Associé (H05, H06)** :
   - Choix d'un objet précis au sein d'une couche ou sélection de la vue globale de la carte.

3. **Actions Interactives Mode 2 (H07)** :
   - `highlight` : mise en surbrillance chromatique de l'objet au survol ou au clic sur le bloc narratif.
   - `zoom` : recentrage dynamique et zoom ciblé sur l'objet.
   - `filter` : affichage exclusif des couches pertinentes associées au thème du bloc.

4. **Numérotation et Renvois Mode 3 (H08)** :
   - Saisie d'un `numberIndex` pour générer des puces et renvois numérotés sur les tirages brochure A4.

5. **Dissociation (Unbind)** :
   - Bouton permettant de supprimer la liaison sans modifier le contenu du bloc.

