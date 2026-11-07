/* ==========================================================================
   StoryMap — persistance IndexedDB
   --------------------------------------------------------------------------
   Base « atelier-storymap » :
     - stories   : { id, schema, config, createdAt, updatedAt } (document complet ;
                   schema 2 = format actuel, absent = ancien format converti
                   à la lecture par SM.library)
     - summaries : { id, title, subtitle, chapterCount, size,    (fiche légère
                     thumbnail, createdAt, updatedAt }            pour la liste)
     - kv        : { key, value }                                (réglages divers)
   ========================================================================== */
(function () {
    'use strict';

    const SM = window.SM;
    // Nom technique hérité de l'ancien nom de l'application (Atelier StoryMap) :
    // le changer créerait une base vide et masquerait les storymaps enregistrées.
    const DB_NAME = 'atelier-storymap';
    const DB_VERSION = 1;

    let dbPromise = null;

    function open() {
        if (dbPromise) return dbPromise;
        dbPromise = new Promise((resolve, reject) => {
            if (!('indexedDB' in window) || !window.indexedDB) {
                reject(new Error('IndexedDB n’est pas disponible dans ce navigateur.'));
                return;
            }
            let req;
            try {
                req = indexedDB.open(DB_NAME, DB_VERSION);
            } catch (e) {
                reject(new Error('Accès à IndexedDB refusé (navigation privée ou stockage bloqué ?).'));
                return;
            }
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains('stories')) db.createObjectStore('stories', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('summaries')) db.createObjectStore('summaries', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', { keyPath: 'key' });
            };
            req.onsuccess = () => {
                const db = req.result;
                db.onversionchange = () => { db.close(); dbPromise = null; };
                resolve(db);
            };
            req.onerror = () => reject(req.error || new Error('Ouverture de la base impossible.'));
            req.onblocked = () => reject(new Error('La base de données est bloquée par un autre onglet. Fermez les autres onglets de l’éditeur puis rechargez.'));
        });
        dbPromise.catch(() => { dbPromise = null; });
        return dbPromise;
    }

    /** Exécute fn(stores) dans une transaction et résout à la fin de celle-ci. */
    async function tx(storeNames, mode, fn) {
        const db = await open();
        return new Promise((resolve, reject) => {
            let result;
            let t;
            try {
                t = db.transaction(storeNames, mode);
            } catch (e) {
                reject(e);
                return;
            }
            const stores = {};
            for (const name of [].concat(storeNames)) stores[name] = t.objectStore(name);
            t.oncomplete = () => resolve(result);
            t.onerror = () => reject(normalizeError(t.error));
            t.onabort = () => reject(normalizeError(t.error || new Error('Transaction annulée.')));
            try {
                const r = fn(stores);
                if (r && typeof r.then === 'function') {
                    r.then(v => { result = v; }, err => { try { t.abort(); } catch (e) { /* déjà terminée */ } reject(err); });
                } else {
                    result = r;
                }
            } catch (e) {
                try { t.abort(); } catch (err) { /* ignore */ }
                reject(e);
            }
        });
    }

    function normalizeError(err) {
        if (err && (err.name === 'QuotaExceededError' || /quota/i.test(err.message || ''))) {
            const e = new Error('Espace de stockage insuffisant. Libérez de l’espace (supprimez ou exportez d’anciennes storymaps) ou réduisez la taille des images.');
            e.name = 'QuotaExceededError';
            return e;
        }
        return err || new Error('Erreur de base de données.');
    }

    const reqP = req => new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });

    SM.db = {
        open,

        async listSummaries() {
            return tx('summaries', 'readonly', s => reqP(s.summaries.getAll()));
        },

        async getStory(id) {
            return tx('stories', 'readonly', s => reqP(s.stories.get(id)));
        },

        async getSummary(id) {
            return tx('summaries', 'readonly', s => reqP(s.summaries.get(id)));
        },

        async getAllStories() {
            return tx('stories', 'readonly', s => reqP(s.stories.getAll()));
        },

        /** Enregistre le document et sa fiche dans une même transaction. */
        async saveStory(story, summary) {
            return tx(['stories', 'summaries'], 'readwrite', s => {
                s.stories.put(story);
                if (summary) s.summaries.put(summary);
            });
        },

        async updateSummary(id, patch) {
            return tx('summaries', 'readwrite', s => new Promise((resolve, reject) => {
                const r = s.summaries.get(id);
                r.onsuccess = () => {
                    if (!r.result) { resolve(false); return; }
                    s.summaries.put(Object.assign({}, r.result, patch));
                    resolve(true);
                };
                r.onerror = () => reject(r.error);
            }));
        },

        async deleteStory(id) {
            return tx(['stories', 'summaries'], 'readwrite', s => {
                s.stories.delete(id);
                s.summaries.delete(id);
            });
        },

        async getKV(key, fallback) {
            const row = await tx('kv', 'readonly', s => reqP(s.kv.get(key)));
            return row ? row.value : fallback;
        },

        async setKV(key, value) {
            return tx('kv', 'readwrite', s => { s.kv.put({ key, value }); });
        },

        async deleteKV(key) {
            return tx('kv', 'readwrite', s => { s.kv.delete(key); });
        },

        /** Estimation de l'espace utilisé / disponible. */
        async estimate() {
            const out = { usage: null, quota: null, persisted: null };
            try {
                if (navigator.storage && navigator.storage.estimate) {
                    const e = await navigator.storage.estimate();
                    out.usage = e.usage;
                    out.quota = e.quota;
                }
                if (navigator.storage && navigator.storage.persisted) out.persisted = await navigator.storage.persisted();
            } catch (e) { /* non pris en charge */ }
            return out;
        },

        /** Demande un stockage persistant (non effacé automatiquement par le navigateur). */
        async requestPersistence() {
            try {
                if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist();
            } catch (e) { /* ignore */ }
            return false;
        }
    };

    /* ---------- Synchronisation entre onglets ---------- */

    let channel = null;
    try { channel = new BroadcastChannel('atelier-storymap'); } catch (e) { channel = null; }
    const listeners = new Set();
    SM.db.tabId = Math.random().toString(36).slice(2);
    SM.db.broadcast = function (msg) {
        if (channel) try { channel.postMessage(Object.assign({ from: SM.db.tabId }, msg)); } catch (e) { /* ignore */ }
    };
    SM.db.onBroadcast = function (fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
    };
    if (channel) channel.onmessage = e => {
        if (!e.data || e.data.from === SM.db.tabId) return;
        for (const fn of listeners) try { fn(e.data); } catch (err) { console.error(err); }
    };
})();
