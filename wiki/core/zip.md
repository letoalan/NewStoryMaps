# Moteur d'Archives ZIP (`src/core/zip.ts`)

Le module [`src/core/zip.ts`](file:///src/core/zip.ts) fournit les opérations de création et de lecture d'archives ZIP au standard PKZip sans aucune dépendance externe lourde.

## 1. Fonctionnalités

- **Calcul CRC32 optimisé** : table précalculée pour un hachage binaire rapide.
- **Écriture sans compression (Store)** : méthode idéale pour les images déjà compressées (JPEG, PNG, WebP) et la réactivité du navigateur.
- **En-têtes PKZip conformes** :
  - En-tête de fichier local (`0x04034b50`)
  - Répertoire central (`0x02014b50`)
  - Fin de répertoire central EOCD (`0x06054b50`)
  - Horodatage DOS compatible
- **Décompression native** : utilise l'API standard du navigateur `DecompressionStream('deflate-raw')` pour décompresser les entrées zippées avec deflate (méthode 8), et copie brute pour méthode 0.
- **Résilience** : rejet explicite des fichiers tronqués ou corrompus.

## 2. Interface TypeScript

```typescript
export interface ZipEntry {
  name: string;
  data: string | Blob | Uint8Array | ArrayBuffer;
}

export interface ZipReadEntry {
  name: string;
  bytes: () => Promise<Uint8Array>;
  text: () => Promise<string>;
}

export function crc32(bytes: Uint8Array): number;
export function createZip(entries: ZipEntry[]): Promise<Blob>;
export function readZip(source: Blob | ArrayBuffer | Uint8Array): Promise<ZipReadEntry[]>;
```

