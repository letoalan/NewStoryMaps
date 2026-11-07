# Système de Design & Feuilles CSS Modulaires (`public/css/`)

Toutes les feuilles de style CSS ont été refactorisées et modularisées pour satisfaire strictement la règle des **$\le$ 200 lignes par fichier**.

## Découpage par Domaine

### 1. Système de Design Global (`public/css/app/`)
- `app-tokens.css` (80 l.) : Jetons de conception, variables thématiques claire et sombre.
- `app-base.css` (105 l.) : Réinitialisation, balises de base, défilement.
- `app-buttons.css` (118 l.) : Classes `.btn`, variantes primaires, danger, fantôme.
- `app-inputs.css` (152 l.) : Champs de formulaire, textarea, interrupteurs `.switch`.
- `app-controls.css` (158 l.) : Contrôles segmentés, curseurs `.range`, sélecteurs de couleur.
- `app-forms.css` (163 l.) : Grilles de formulaire, badges `.badge`, encadrés `.callout`.
- `app-menus.css` (90 l.) : Menus contextuels et listes d'options.
- `app-modals.css` (100 l.) : Fenêtres de dialogue et animations d'apparition.
- `app-feedback.css` (128 l.) : Toasts de notification et infobulles `.tooltip`.
- `app-misc.css` (107 l.) : Spinners de chargement, séparateurs et règles d'accessibilité.

### 2. Tableau de Bord (`public/css/dashboard/`)
- `dashboard-layout.css` (99 l.) : En-tête, grille principale, barre de recherche.
- `dashboard-cards.css` (181 l.) : Cartes de storymaps, vignettes, badges de statut.
- `dashboard-empty.css` (127 l.) : Présentation d'accueil et zone de glisser-déposer.
- `dashboard-dialogs.css` (174 l.) : Modales de réglages et association d'images.
- `dashboard-responsive.css` (33 l.) : Adaptations pour tablettes et smartphones.

### 3. Éditeur (`public/css/editor/`)
- `editor-topbar.css` (172 l.) : Barre supérieure, titre, statut de sauvegarde.
- `editor-sidebar.css` (128 l.) : Conteneurs des panneaux latéraux.
- `editor-outline.css` (111 l.) : Éléments du plan et réorganisation des chapitres.
- `editor-canvas.css` (148 l.) : Canevas central, zoom et cadrage.
- `editor-hud.css` (146 l.) : Outils cartographiques de surimpression et boussole.
- `editor-geocoder.css` (170 l.) : Recherche d'adresses et guide d'intégration.
- `editor-richtext.css` (94 l.) : Outils de mise en forme du texte.
- `editor-inspector.css` (178 l.) : Panneau d'inspection et accordéons.

### 4. Cadre et Mode Tableur (`public/css/sheet/` & `frame/`)
- Découpage complet des styles de tableur et du cadre WYSIWYG en fichiers de 60 à 150 lignes.

