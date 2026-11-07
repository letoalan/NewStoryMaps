# Wiki StoryMap (React & TypeScript)

Bienvenue dans la documentation officielle du projet **StoryMap**, migré vers **React 18** et **TypeScript 5** pour garantir une stabilité maximale, un typage statique strict et une évolutivité pérenne.

## 🎯 Objectifs de la Migration
1. **Robustesse et Stabilité** : Remplacement du code impératif par une architecture déclarative React avec validation TypeScript à la compilation.
2. **Modularité Stricte** : Chaque fichier du projet respecte scrupuleusement la règle des **$\le$ 200 lignes**.
3. **Persistance Locale Moderne** : Stockage asynchrone des storymaps via IndexedDB (`src/core/db.ts`).
4. **Intégration Cartographique** : Moteur MapLibre GL JS unifié entre l'éditeur (`Canvas.tsx`) et le visualiseur immersif (`Player.tsx`).

## 🚀 Démarrage Rapide

```bash
# Installation des dépendances
npm install

# Lancement du serveur de développement (Vite)
npm run dev

# Compilation de production (vérification TypeScript + bundle Vite)
npm run build
```

## 📚 Sommaire de la Documentation
- [Architecture Globale](file:///wiki/Architecture.md)
- **Types & Modèles** : [Story](file:///wiki/types/story-types.md) · [Step](file:///wiki/types/step-types.md) · [Map](file:///wiki/types/map-types.md)
- **Noyau & Services** : [IndexedDB](file:///wiki/core/db.md) · [Modèles par défaut](file:///wiki/core/defaults.md) · [Import/Export](file:///wiki/core/io.md)
- **Gestion de l'État** : [StoryContext](file:///wiki/context/story-context.md)
- **Composants** : [Dashboard](file:///wiki/components/Dashboard.md) · [Editor](file:///wiki/components/Editor.md) · [Canvas](file:///wiki/components/Canvas.md) · [Inspector](file:///wiki/components/Inspector.md) · [Player](file:///wiki/components/Player.md)
- **Styles** : [Système de design modulaire](file:///wiki/styles/styles-overview.md)
- [Table des matières complète](file:///wiki/Summary.md)

