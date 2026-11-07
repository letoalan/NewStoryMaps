# Module Core : `publish.ts`

Source : [`src/core/publish.ts`](file:///c:/Users/alano/OneDrive/Documents/GitHub/NewStoryMaps/src/core/publish.ts)

## Rôle
Génère un fichier HTML 100% autonome et autonome (standalone) d'une StoryMap, prêt à être hébergé sur n'importe quel serveur statique ou visualisé localement sans dépendance réseau complexe.

## Caractéristiques
- Embarque l'intégralité du JSON de la StoryMap dans une balise `<script id="storymap-data">`.
- Intègre un visualiseur léger MapLibre GL en HTML/JS vanilla.
- Inclut des styles CSS autonomes (thème sombre/clair, panneau narratif, lecteur fluide).
- Fournit une fonction `downloadStandaloneHTML(story: StoryMap)` déclenchant le téléchargement direct du fichier `.html`.

