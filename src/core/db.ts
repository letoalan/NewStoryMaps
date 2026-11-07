/**
 * StoryMap — Service de persistance IndexedDB
 */

import { StoryMap, StoryListItem } from '../types/story';

const DB_NAME = 'storymap-db';
const DB_VERSION = 1;
const STORE_STORIES = 'stories';

class StoryDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
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
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return this.dbPromise;
  }

  async getAllStories(): Promise<StoryListItem[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_STORIES, 'readonly');
      const store = tx.objectStore(STORE_STORIES);
      const req = store.getAll();
      req.onsuccess = () => {
        const stories = req.result as StoryMap[];
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
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async saveStory(story: StoryMap): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_STORIES, 'readwrite');
      const store = tx.objectStore(STORE_STORIES);
      const req = store.put({ ...story, modified: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async deleteStory(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_STORIES, 'readwrite');
      const store = tx.objectStore(STORE_STORIES);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

export const db = new StoryDatabase();

