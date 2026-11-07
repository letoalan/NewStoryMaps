# Composant : `SettingsModal.tsx`

Source : [`src/components/dialogs/SettingsModal.tsx`](file:///src/components/dialogs/SettingsModal.tsx)

## Rôle
Fenêtre modale de personnalisation globale du récit et de ses paramètres visuels, cartographiques et ergonomiques.

## Options Configurables

### 1. Tracé Cartographique Reliant les Marqueurs
- **Styles de tracé** :
  * *Ligne pointillée* (`dashed`)
  * *Ligne pleine* (`solid`)
  * *Petits points fins* (`dotted`)
  * *Ligne incurvée / Arc* (`curved`)
  * *Flèches directrices* (`arrow`)
  * *Doubles flèches* (`double-arrow`)
  * *Avion (Indiana Jones)* (`airplane`)
  * *Navire (Croisière)* (`ship`)
  * *Aucun tracé* (`none`)

### 2. Forme des Marqueurs d'Étapes
- **Formes disponibles** :
  * *Épingle classique* (`pin`)
  * *Numéroté avec compteur d'étape* (`number`, 1, 2, 3...)
  * *Pastille circulaire* (`circle`)
  * *Diamant / Carré* (`square`)
  * *Avion* (`airplane` ✈️)
  * *Navire* (`ship` 🚢)
  * *Drapeau* (`flag` 🚩)
  * *Étoile* (`star` ⭐)
- **Affichage des marqueurs** : option pour afficher tous les marqueurs du parcours ou uniquement l'étape courante.

### 3. Apparence Générale & Navigation
- **Couleur d'accentuation** : palette chromatique personnalisant marqueurs et tracés.
- **Typographie narrative** : `Inter`, `Lora`, `Merriweather`, `Roboto`, `Cinzel`.
- **Position du volet narratif** : à gauche ou à droite.
- **Intervalle de lecture automatique** : 3s, 5s, 8s, 12s.
