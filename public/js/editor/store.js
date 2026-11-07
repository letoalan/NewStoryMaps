/* ==========================================================================
   StoryMap — état de l'éditeur et historique (annuler / rétablir)
   --------------------------------------------------------------------------
   La configuration est immuable : chaque modification produit un nouvel
   objet qui partage les parties inchangées (images comprises). L'historique
   ne stocke donc que des références, sans dupliquer les données en mémoire.
   ========================================================================== */
(function () {
    'use strict';

    const SM = window.SM;
    const M = SM.model;

    const MAX_HISTORY = 250;
    const GROUP_DELAY = 1600; // ms : saisies successives regroupées en une seule étape

    class EditorStore {
        constructor(story) {
            this.id = story.id;
            this.createdAt = story.createdAt;
            this.updatedAt = story.updatedAt;
            this.config = story.config;
            this.past = [];
            this.future = [];
            this.lastGroup = null;
            this.lastTime = 0;
            this.version = 0;
            this.listeners = new Set();
            this.selection = { type: 'chapter', id: this.config.chapters[0].id };
            this.selIndexHint = 0;
        }

        subscribe(fn) {
            this.listeners.add(fn);
            return () => this.listeners.delete(fn);
        }

        emit(evt) {
            for (const fn of Array.from(this.listeners)) {
                try { fn(evt); } catch (e) { console.error(e); }
            }
        }

        /* ---------- Sélection ---------- */

        /** Index du chapitre affiché (la couverture montre le chapitre 1, le pied de page le dernier). */
        chapterIndex(sel) {
            const s = sel || this.selection;
            const chapters = this.config.chapters;
            if (s.type === 'cover') return 0;
            if (s.type === 'footer') return chapters.length - 1;
            const i = chapters.findIndex(c => c.id === s.id);
            return i;
        }

        selectedChapter() {
            const i = this.chapterIndex();
            return i >= 0 ? this.config.chapters[i] : null;
        }

        isChapterSelected() {
            return this.selection.type === 'chapter';
        }

        select(sel) {
            const cur = this.selection;
            if (cur.type === sel.type && cur.id === sel.id) return;
            const prev = this.selection;
            this.selection = sel;
            const i = this.chapterIndex(sel);
            if (i >= 0) this.selIndexHint = i;
            this.lastGroup = null;
            this.emit({ type: 'selection', selection: sel, prevSelection: prev });
        }

        selectChapterAt(index) {
            const chapters = this.config.chapters;
            const i = Math.max(0, Math.min(chapters.length - 1, index));
            this.select({ type: 'chapter', id: chapters[i].id });
        }

        /** Garantit que la sélection désigne un élément existant. */
        fixSelection() {
            const s = this.selection;
            if (s.type !== 'chapter') return false;
            const chapters = this.config.chapters;
            if (chapters.some(c => c.id === s.id)) {
                this.selIndexHint = chapters.findIndex(c => c.id === s.id);
                return false;
            }
            const i = Math.max(0, Math.min(chapters.length - 1, this.selIndexHint));
            this.selection = { type: 'chapter', id: chapters[i].id };
            return true;
        }

        /* ---------- Modifications ---------- */

        /**
         * Applique une nouvelle configuration.
         * @param {object} next
         * @param {object} [opts] { label, group, source, selection }
         */
        commit(next, opts) {
            opts = opts || {};
            if (!next || next === this.config) return false;
            const now = Date.now();
            const merge = opts.group && opts.group === this.lastGroup && (now - this.lastTime) < GROUP_DELAY;
            if (!merge) {
                this.past.push({ config: this.config, selection: this.selection, label: opts.label || 'Modification' });
                if (this.past.length > MAX_HISTORY) this.past.shift();
            }
            this.future = [];
            this.lastGroup = opts.group || null;
            this.lastTime = now;
            const prev = this.config;
            const prevSelection = this.selection;
            this.config = next;
            this.version++;
            if (opts.selection) this.selection = opts.selection;
            const selChanged = this.fixSelection() || opts.selection !== undefined;
            this.emit({ type: 'change', config: next, prev, source: opts.source || null, label: opts.label });
            if (selChanged && (prevSelection.type !== this.selection.type || prevSelection.id !== this.selection.id)) {
                this.emit({ type: 'selection', selection: this.selection, prevSelection });
            }
            return true;
        }

        /** Termine le regroupement en cours (ex. à la perte de focus d'un champ). */
        breakGroup() {
            this.lastGroup = null;
        }

        canUndo() { return this.past.length > 0; }
        canRedo() { return this.future.length > 0; }
        undoLabel() { return this.past.length ? this.past[this.past.length - 1].label : ''; }
        redoLabel() { return this.future.length ? this.future[this.future.length - 1].label : ''; }

        undo() {
            if (!this.past.length) return null;
            const entry = this.past.pop();
            this.future.push({ config: this.config, selection: this.selection, label: entry.label });
            return this.restore(entry);
        }

        redo() {
            if (!this.future.length) return null;
            const entry = this.future.pop();
            this.past.push({ config: this.config, selection: this.selection, label: entry.label });
            return this.restore(entry);
        }

        restore(entry) {
            const prev = this.config;
            const prevSelection = this.selection;
            this.config = entry.config;
            this.selection = entry.selection;
            this.lastGroup = null;
            this.version++;
            this.fixSelection();
            this.emit({ type: 'change', config: this.config, prev, source: 'history', label: entry.label });
            if (prevSelection.type !== this.selection.type || prevSelection.id !== this.selection.id) {
                this.emit({ type: 'selection', selection: this.selection, prevSelection });
            }
            return entry.label;
        }

        /* ---------- Raccourcis d'édition ---------- */

        setStory(patch, opts) {
            return this.commit(M.ops.set(this.config, patch), opts);
        }

        /** Réglages groupés de la storymap : panels, marker, inset, terrain. */
        setGroup(key, patch, opts) {
            return this.commit(M.ops.setGroup(this.config, key, patch), opts);
        }

        setChapter(index, patch, opts) {
            if (index < 0 || index >= this.config.chapters.length) return false;
            return this.commit(M.ops.setChapter(this.config, index, patch), opts);
        }

        /** Réglages groupés d'un chapitre : view, transition, layers. */
        setChapterGroup(index, key, patch, opts) {
            if (index < 0 || index >= this.config.chapters.length) return false;
            return this.commit(M.ops.setChapterGroup(this.config, index, key, patch), opts);
        }

        setView(index, patch, opts) {
            return this.setChapterGroup(index, 'view', patch, opts);
        }

        toStory() {
            return { id: this.id, config: this.config, createdAt: this.createdAt, updatedAt: this.updatedAt };
        }
    }

    SM.EditorStore = EditorStore;
})();
