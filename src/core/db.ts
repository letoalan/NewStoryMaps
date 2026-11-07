/**
 * StoryMap — Service de persistance IndexedDB robuste et migration v1/v2
 */

import { StoryMap, StoryListItem } from '../types/story';
import { convertLegacyToModern } from './adapter';

const DB_NAME = 'storymap-db';
const DB_VERSION = 1;
const STORE_STORIES = 'stories';
const LEGACY_DB_NAME = 'atelier-storymap';

class StoryDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private migrated = false;

  private async getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_STORIES)) {
            const store = db.createObjectStore(STORE_STORIES, { keyPath: 'id' });
            store.createIndex('modified', 'modified', { unique: false });
          }
        };
        req.onsuccess = () => {
          const db = req.result;
          db.onversionchange = () => {
            db.close();
            this.dbPromise = null;
          };
          resolve(db);
        };
        req.onerror = () => reject(req.error || new Error('Erreur ouverture IndexedDB'));
        req.onblocked = () => {
          reject(new Error('La base IndexedDB est bloquée par un autre onglet.'));
        };
      });
    }

    const db = await this.dbPromise;
    if (!this.migrated) {
      this.migrated = true;
      await this.tryMigrateLegacy(db).catch((err) =>
        console.warn('Migration atelier-storymap ignorée:', err)
      );
    }
    return db;
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
          return resolve();
        }

        const ltx = legacyDB.transaction('stories', 'readonly');
        const lstore = ltx.objectStore('stories');
        const getAllReq = lstore.getAll();

        getAllReq.onsuccess = async () => {
          const legacyItems = (getAllReq.result || []) as Array<Record<string, unknown>>;
          legacyDB.close();
          if (legacyItems.length === 0) return resolve();

          const ctx = currentDB.transaction(STORE_STORIES, 'readwrite');
          const cstore = ctx.objectStore(STORE_STORIES);

          for (const item of legacyItems) {
            try {
              const adapted = convertLegacyToModern(item.config || item);
              adapted.id = (item.id as string) || adapted.id;
              cstore.put(adapted);
            } catch (err) {
              console.warn('Erreur migration item:', err);
            }
          }

          ctx.oncomplete = () => resolve();
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
      store.put({ ...story, modified: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Erreur sauvegarde'));
      tx.onabort = () => reject(tx.error || new Error('Transaction annulée'));
    });
  }

  async deleteStory(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_STORIES, 'readwrite');
      const store = tx.objectStore(STORE_STORIES);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Erreur suppression'));
      tx.onabort = () => reject(tx.error || new Error('Transaction annulée'));
    });
  }
}

export const db = new StoryDatabase();
