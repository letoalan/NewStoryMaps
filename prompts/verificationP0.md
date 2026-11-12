La nouvelle livraison est bien visible sur GitHub : j’ai vérifié le commit `5ef3d09e0fa763ae07784368c39b4738bfaafc42` (« Update story.ts », 10:17:45), qui suit `618ac00f` (« POE », 10:17:36).

Il y a de vrais ajouts : exports ZIP, import HTML/ZIP et script de vérification. Mais je ne valide pas encore la clôture de P0 : plusieurs **blocages** subsistent dans le code, et le script de test ne vérifie pas réellement toute la chaîne qu’il annonce couvrir.

## 1. Ce qui a effectivement progressé


| Élément                           | Constat dans la nouvelle livraison           |
|-------------------------------------|----------------------------------------------|
| Export ZIP de site                  | Fonction ajoutée                            |
| Sauvegarde ZIP de bibliothèque     | Fonction ajoutée                            |
| Import HTML                         | Extraction des données embarquées ajoutée |
| Import ZIP                          | Lecture des JSON ou, à défaut, des HTML    |
| Défaillance du fond cartographique | Affichage d’un panneau de repli ajouté    |
| Vérification automatisée          | Nouveau script `scripts/verify-p0.mjs`       |
| Suivi P0                            | Toutes les cases sont désormais cochées    |


Sources examinées : `src/core/io.ts`, `src/core/publish.ts`, `src/core/zip.ts`, `scripts/verify-p0.mjs`, `tasks2.md`.

Ces ajouts répondent à une partie des réserves précédentes. Cependant, les cases cochées ne correspondent pas encore à une validation suffisante.

## 2. L’adaptateur historique reste incorrect

Le fichier `src/core/adapter.ts` utilise toujours les mauvais champs :


| Information | Format historique      | Champ actuellement utilisé |
|-------------|------------------------|-----------------------------|
| Texte       | `chapter.text`         | `chapter.description`       |
| Cadrage     | `chapter.view`         | `chapter.location`          |
| Légende    | `chapter.imageCaption` | `chapter.caption`           |
| Auteur      | `story.byline`         | `story.author`              |


La conversion inverse écrit également `description` et `location`.

Un ancien récit peut donc perdre ses textes et ses cadrages, tandis qu’un export présenté comme « historique v2 » ne respecte toujours pas le contrat d’origine.

Autres points visibles :

- les géodonnées ne sont pas restaurées ;
- les couches sont initialisées à `[]` ;
- les détecteurs historiques ne sont pas utilisés pour refuser systématiquement les documents non reconnus ;
- un objet JSON quelconque peut être transformé en récit de secours au lieu d’être rejeté.

Ce blocage n’a pas été corrigé par la nouvelle livraison.

## 3. Le ZIP de site peut réimporter deux versions du même récit

L’export de site inclut :

```
index.html
storymap.json
v2.storymap.json
LISEZMOI.txt
```

Mais l’import ZIP parcourt tous les JSON non identifiés comme manifeste et ajoute chaque résultat à la liste.

Ainsi, l’archive produite par l’application peut être interprétée comme contenant deux récits :

1. le récit moderne ;
2. sa conversion dite historique, actuellement imparfaite.


Il faut une règle de priorité ou un manifeste : par exemple importer le document moderne canonique et ne pas importer sa variante d’échange comme un autre projet.

Source : `src/core/io.ts`, fonctions `exportStoryToSiteZip()` et `parseZipArchive()`.

### Autre risque : deux projets de même titre

La sauvegarde de bibliothèque nomme les fichiers uniquement à partir du titre normalisé :

```
storymaps/<titre>.json
```

Deux projets portant le même titre produisent donc des entrées de même nom. Cela peut conduire à un écrasement lors d’une extraction avec un outil ZIP classique.

Il faut ajouter un suffixe unique ou utiliser l’identifiant du projet.

## 4. Les images relatives des anciennes archives ne sont pas réintégrées

Le nouvel import ZIP lit les JSON et les HTML, mais ne résout pas les références aux images stockées à côté de ces fichiers.

Une ancienne archive contenant :

```
index.html
images/etape-1.jpg
```

ne bénéficie donc pas encore du mécanisme historique qui retrouvait puis intégrait l’image depuis les entrées de l’archive.

La restauration de l’import ZIP est réelle, mais elle reste partielle par rapport à la tâche E05.

## 5. Le script de recette ne teste pas le véritable export HTML

C’est le problème principal dans les preuves de validation.

Dans `scripts/verify-p0.mjs`, le test HTML fabrique lui-même une chaîne simplifiée :

```
const html = `<!DOCTYPE html> ...`;
```

Il vérifie ensuite :

- la présence de `map-fallback` ;
- la présence de la balise de données ;
- la possibilité de relire son propre JSON par expression régulière.

Il n’appelle pas :

```
generateStandaloneHTML()
extractStoryFromHTML()
parseStoryFile()
```

Ce test peut donc réussir même si le véritable générateur ou le véritable importeur est défectueux.

### Même limite pour la sauvegarde multiple

Le test construit manuellement une archive avec deux noms différents. Il ne teste pas `exportAllStoriesBackupZip()` ni le cas de deux titres identiques.

### Ce que ce script prouve réellement

Il vérifie utilement une partie du moteur ZIP et quelques propriétés de chaînes fabriquées dans le test.

Il ne démontre pas :

- l’ouverture d’un véritable HTML exporté dans un navigateur ;
- sa fidélité au lecteur ;
- un aller-retour via les fonctions de production ;
- la migration IndexedDB ;
- la compatibilité avec une véritable fixture historique ;
- les comportements réseau et l’ouverture `file://`.

Le message final « VALIDATION COMPLETE AVEC SUCCES » est donc trop large par rapport à la couverture réelle.

## 6. La sécurité du HTML publié reste insuffisante

Le générateur conserve :

```
html += step.description || '';
document.getElementById('step-body').innerHTML = html;
```

Il concatène également l’URL du média et le titre dans une balise image.

La couleur d’accent est toujours interpolée directement dans du CSS et du JavaScript générés. Le générateur lu n’importe pas le module d’assainissement.

Ces chemins doivent être sécurisés à la frontière d’export, y compris pour un document moderne importé. Il ne suffit pas de supposer que tout contenu a été créé dans l’éditeur.

Source : `src/core/publish.ts`.

## 7. Le lecteur exporté reste une implémentation simplifiée

Le nouveau fichier ajoute un repli réseau et un extracteur de données, mais conserve son propre lecteur dans un template.

Il ne traite toujours pas les couches du projet, les marqueurs multiples ou les étapes masquées. Les tests ajoutés ne vérifient pas ces éléments.

La validation de la parité annoncée en E01–E02 reste donc prématurée.

## Décision

Je qualifierais cette livraison ainsi :

>
> P0-E a progressé fonctionnellement, mais P0 n’est pas encore recevable : compatibilité historique incorrecte, réimport ZIP ambigu, ressources relatives non restaurées et recette insuffisamment reliée au code de production.
>

### Corrections minimales avant de passer à P1

1. Corriger les champs historiques et tester avec un fichier réel du clone initial.
2. Définir un document canonique dans chaque ZIP de site.
3. Garantir des noms uniques dans les sauvegardes de bibliothèque.
4. Réintégrer les images relatives à l’import des anciennes archives.
5. Sécuriser les données injectées dans le HTML publié.
6. Faire appeler les véritables fonctions de production par les tests.
7. Ajouter une recette navigateur du véritable fichier exporté.


Je n’ai pas exécuté ces tests dans cet environnement : il s’agit d’une vérification statique du nouveau commit. Aucun fichier n’a été modifié.

 
