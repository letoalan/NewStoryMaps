/**
 * StoryMap — Service de persistance IndexedDB sécurisé
 */

import { StoryMap, StoryListItem } from '../types/story';
import { convertLegacyToModern } from './adapter';

const DB_NAME = 'storymap-db';
const DB_VERSION = 1;
const STORE_STORIES = 'stories';
const LEGACY_DB_NAME = 'atelier-storymap';
const MIGRATION_KEY = 'storymap:legacy_migration_done';

export class DatabaseService {
  private db: IDBDatabase | null = null;
  private isMigrating = false;

  async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_STORIES)) {
          db.createObjectStore(STORE_STORIES, { keyPath: 'id' });
        }
      };

      request.onsuccess = async (event: Event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.db = db;

        db.onversionchange = () => {
          db.close();
          this.db = null;
        };

        if (!this.isMigrating && localStorage.getItem(MIGRATION_KEY) !== 'true') {
          this.isMigrating = true;
          try {
            await this.tryMigrateLegacy(db);
          } finally {
            this.isMigrating = false;
          }
        }
        resolve(db);
      };

      request.onerror = () => reject(request.error);
      request.onblocked = () => console.warn('Ouverture de la base bloquée.');
    });
  }

  private async tryMigrateLegacy(currentDB: IDBDatabase): Promise<void> {
    return new Promise((resolve) => {
      let legacyReq: IDBOpenDBRequest;
      try {
        legacyReq = indexedDB.open(LEGACY_DB_NAME, 1);
      } catch {
        return resolve();
      }

      legacyReq.onupgradeneeded = () => {
        legacyReq.transaction?.abort();
        resolve();
      };

      legacyReq.onsuccess = () => {
        const legacyDB = legacyReq.result;
        if (!legacyDB.objectStoreNames.contains('stories')) {
          legacyDB.close();
          localStorage.setItem(MIGRATION_KEY, 'true');
          return resolve();
        }

        const ltx = legacyDB.transaction('stories', 'readonly');
        const lstore = ltx.objectStore('stories');
        const getAllReq = lstore.getAll();

        getAllReq.onsuccess = () => {
          const legacyItems = (getAllReq.result || []) as Array<Record<string, unknown>>;
          legacyDB.close();
          if (legacyItems.length === 0) {
            localStorage.setItem(MIGRATION_KEY, 'true');
            return resolve();
          }

          const ctx = currentDB.transaction(STORE_STORIES, 'readwrite');
          const cstore = ctx.objectStore(STORE_STORIES);

          for (const item of legacyItems) {
            try {
              const itemId = (item.id as string) || '';
              // Vérification d'intégrité : ne JAMAIS écraser un projet moderne existant
              const checkReq = cstore.get(itemId);
              checkReq.onsuccess = () => {
                if (!checkReq.result) {
                  const adapted = convertLegacyToModern(item.config || item);
                  adapted.id = itemId || adapted.id;
                  cstore.put(adapted);
                }
              };
            } catch (err) {
              console.warn('Erreur migration item:', err);
            }
          }

          ctx.oncomplete = () => {
            localStorage.setItem(MIGRATION_KEY, 'true');
            resolve();
          };
          ctx.onerror = () => resolve();
        };

        getAllReq.onerror = () => {
          legacyDB.close();
          resolve();
        };
      };

      legacyReq.onerror = () => resolve();
    });
  }

  async getAllStories(): Promise<StoryListItem[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_STORIES, 'readonly');
      const store = tx.objectStore(STORE_STORIES);
      const req = store.getAll();
      req.onsuccess = () => {
        const stories = (req.result || []) as StoryMap[];
        const list: StoryListItem[] = stories.map((s) => ({
          id: s.id,
          title: s.title,
          subtitle: s.subtitle,
          mode: s.mode || 'storymap',
          modified: s.modified,
          stepCount: s.steps ? s.steps.length : 0,
          coverImage: s.coverImage,
        }));
        list.sort((a, b) => b.modified - a.modified);
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getStory(id: string): Promise<StoryMap | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_STORIES, 'readonly');
      const store = tx.objectStore(STORE_STORIES);
      const req = store.get(id);
      req.onsuccess = () => resolve((req.result as StoryMap) || null);
      req.onerror = () => reject(req.error);
    });
  }

  async saveStory(story: StoryMap): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_STORIES, 'readwrite');
      const store = tx.objectStore(STORE_STORIES);
      store.put(story);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(new Error('Transaction interrompue'));
    });
  }

  async deleteStory(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_STORIES, 'readwrite');
      const store = tx.objectStore(STORE_STORIES);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(new Error('Transaction interrompue'));
    });
  }
}

export const db = new DatabaseService();
