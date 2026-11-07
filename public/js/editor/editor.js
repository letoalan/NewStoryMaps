/* ==========================================================================
   StoryMap — éditeur (assemblage, actions, enregistrement auto)
   ========================================================================== */
(function () {
    'use strict';

    const SM = window.SM;
    const U = SM.util;
    const h = U.h;
    const UI = SM.ui;
    const M = SM.model;

    const SAVE_DELAY = 700;

    class Editor {
        /** Charge une storymap depuis la base et ouvre l'éditeur. */
        static async open(root, id, opts) {
            // Storymap validée (et convertie si elle est encore dans l'ancien format)
            const story = await SM.library.get(id);
            if (!story) throw new Error('Cette storymap n’existe pas (ou plus) dans ce navigateur.');
            return new Editor(root, story, opts || {});
        }

        constructor(root, story, opts) {
            this.root = root;
            this.opts = opts;
            this.events = U.emitter();
            this.disposers = [];
            this.store = new SM.EditorStore(story);
            this.saveState = 'saved';
            this.dirty = false;
            this.saving = false;
            this.mapThumb = null;
            this.viewClipboard = U.storage.get('viewClipboard', null);
            // Mode d'édition : visuel (rendu de la storymap) ou tableur (une ligne par chapitre)
            this.mode = SM.prefs.get('editorMode') === 'sheet' ? 'sheet' : 'visual';

            this.build();
            this.setupSaving();
            this.setupSync();
            this.updateTitle();
            this.maybeOnboarding();
        }

        on(type, fn) { return this.events.on(type, fn); }
        emit(type, payload) { this.events.emit(type, payload); }

        /* ---------- Construction ---------- */

        /** Écran étroit : les panneaux latéraux deviennent des tiroirs superposés. */
        isNarrow() {
            return window.matchMedia('(max-width: 980px)').matches;
        }

        build() {
            U.clear(this.root);
            this.el = h('div', { class: 'editor' });
            const narrow = this.isNarrow();
            this.el.classList.toggle('no-outline', narrow || !SM.prefs.get('outlineOpen'));
            this.el.classList.toggle('no-inspector', narrow || !SM.prefs.get('inspectorOpen'));

            this.rich = new SM.RichText(this.el);
            this.el.appendChild(this.buildTopbar());

            this.outline = new SM.Outline(this);
            this.canvas = new SM.Canvas(this);
            this.inspector = new SM.Inspector(this);
            this.sheet = new SM.Sheet(this);
            this.el.append(this.outline.el, this.canvas.el, this.sheet.el, this.inspector.el);
            this.root.appendChild(this.el);
            this.applyMode();
            this.canvas.mount();

            this.disposers.push(this.store.subscribe(evt => {
                if (evt.type === 'change') this.updateTitle();
                // Sur petit écran, le plan se referme après le choix d'un chapitre
                if (evt.type === 'selection' && this.isNarrow() && !this.el.classList.contains('no-outline')) this.toggleOutline(false);
                this.updateHistoryButtons();
            }));
            this.outlineToggle.setAttribute('aria-pressed', String(!this.el.classList.contains('no-outline')));
            this.inspectorToggle.setAttribute('aria-pressed', String(!this.el.classList.contains('no-inspector')));
            this.disposers.push(this.on('map-idle', () => this.captureMapThumb()));
            this.setupFileDrop();
            this.updateHistoryButtons();
        }

        /**
         * Fichiers déposés ou images collées en dehors du panneau : l'image devient
         * celle du chapitre affiché, les données géographiques (GeoJSON, GPX, KML)
         * de nouveaux calques (et le navigateur ne quitte pas l'éditeur).
         */
        setupFileDrop() {
            const hasFiles = e => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
            const isImage = f => (f.type || SM.images.mimeForName(f.name)).startsWith('image/');
            const onOver = e => { if (hasFiles(e)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } };
            const onDrop = async e => {
                if (!hasFiles(e)) return;
                e.preventDefault();
                const dropped = Array.from(e.dataTransfer.files || []);
                // Tableau (CSV, ou archive .zip exportée par le tableur) : chapitres importés
                const zip = dropped.find(f => /\.zip$/i.test(f.name));
                if (dropped.some(SM.sheet.isTableFile) || (zip && await SM.sheet.isTableZip(zip))) { this.importSheet(dropped); return; }
                const data = dropped.filter(SM.geodata.isDataFile);
                if (data.length) { this.importData(data); return; }
                const file = dropped.find(isImage);
                if (file && this.store.selection.type === 'chapter') this.setChapterImageFromFile(this.store.chapterIndex(), file);
                else if (file) UI.toast('Sélectionnez un chapitre pour lui ajouter cette image.', { type: 'info' });
                else UI.toast('Pour importer une storymap, revenez à « Mes storymaps ».', { type: 'info' });
            };
            const onPaste = e => {
                if (e.defaultPrevented || U.isTypingTarget(e.target) || document.querySelector('dialog[open]')) return;
                const item = Array.from((e.clipboardData && e.clipboardData.items) || []).find(it => it.kind === 'file' && it.type.startsWith('image/'));
                if (!item || this.store.selection.type !== 'chapter') return;
                e.preventDefault();
                this.setChapterImageFromFile(this.store.chapterIndex(), item.getAsFile());
            };
            window.addEventListener('dragover', onOver);
            window.addEventListener('drop', onDrop);
            document.addEventListener('paste', onPaste);
            this.disposers.push(() => {
                window.removeEventListener('dragover', onOver);
                window.removeEventListener('drop', onDrop);
                document.removeEventListener('paste', onPaste);
            });
        }

        buildTopbar() {
            this.titleInput = h('input', { class: 'tb-title', type: 'text', placeholder: 'Titre de la storymap', 'aria-label': 'Titre de la storymap', spellcheck: 'true' });
            this.titleInput.value = this.store.config.title || '';
            this.titleInput.addEventListener('input', () => this.store.setStory({ title: this.titleInput.value }, { label: 'Titre de la storymap', group: 'story:title', source: 'topbar' }));
            this.titleInput.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === 'Escape') this.titleInput.blur(); });
            this.titleInput.addEventListener('blur', () => this.store.breakGroup());

            this.saveStatus = h('button', { type: 'button', class: 'save-status' });
            this.saveStatus.addEventListener('click', () => this.saveNow(true));

            this.undoBtn = UI.button({ icon: 'undo', iconOnly: true, variant: 'ghost', label: 'Annuler', shortcut: 'Mod+Z', onClick: () => this.undo() });
            this.redoBtn = UI.button({ icon: 'redo', iconOnly: true, variant: 'ghost', label: 'Rétablir', shortcut: 'Mod+Shift+Z', onClick: () => this.redo() });

            this.outlineToggle = UI.button({ icon: 'sidebar-left', iconOnly: true, variant: 'ghost', label: 'Afficher / masquer le plan', pressed: SM.prefs.get('outlineOpen'), className: 'tb-visual', onClick: () => this.toggleOutline() });
            this.inspectorToggle = UI.button({ icon: 'sidebar-right', iconOnly: true, variant: 'ghost', label: 'Afficher / masquer les propriétés', pressed: SM.prefs.get('inspectorOpen'), className: 'tb-visual', onClick: () => this.toggleInspector() });
            this.modeSwitch = UI.segmented({
                value: this.mode, label: 'Mode d’édition',
                options: [
                    { value: 'visual', label: 'Visuel', icon: 'map', tip: 'Éditer la storymap telle qu’elle sera publiée' },
                    { value: 'sheet', label: 'Tableur', icon: 'table', tip: 'Éditer les chapitres dans un tableau : une ligne par chapitre, import et export CSV' }
                ],
                onChange: v => this.setMode(v)
            });
            this.modeSwitch.el.classList.add('tb-mode');

            const exportBtn = UI.button({ label: 'Exporter', icon: 'download', shortcut: 'Mod+E', onClick: () => this.openExport() });
            const previewBtn = UI.button({ label: 'Aperçu', icon: 'play', variant: 'primary', shortcut: 'Mod+Enter', tip: 'Voir la storymap telle qu’elle sera publiée', onClick: () => this.openPreview() });
            const moreBtn = UI.button({ icon: 'more', iconOnly: true, variant: 'ghost', label: 'Plus d’options' });
            moreBtn.addEventListener('click', () => UI.menu(moreBtn, [
                { label: 'Réglages de la storymap', icon: 'sliders', onClick: () => this.inspector.showStoryTab() },
                { label: 'Importer des données (GeoJSON, GPX, KML)…', icon: 'geodata', onClick: () => this.pickData() },
                { label: 'Créer des chapitres à partir de données…', icon: 'book', onClick: () => this.chaptersFromData() },
                { label: 'Importer un tableau (CSV)…', icon: 'file-table', onClick: () => this.importSheet() },
                { label: 'Exporter le tableau (CSV)…', icon: 'table', onClick: () => UI.sheetExport(this.store.config) },
                { label: 'Intégrer les images externes…', icon: 'image-plus', onClick: () => this.resolveImages() },
                '-',
                { label: 'Dupliquer la storymap', icon: 'copy', onClick: () => this.duplicateStory() },
                { label: 'Enregistrer maintenant', icon: 'save', shortcut: 'Mod+S', onClick: () => this.saveNow(true) },
                '-',
                { label: 'Raccourcis clavier', icon: 'keyboard', shortcut: '?', onClick: () => UI.showShortcuts() },
                { label: 'Guide de démarrage', icon: 'help', onClick: () => this.showOnboarding(true) },
                { label: 'Paramètres de l’éditeur', icon: 'settings', onClick: () => UI.openSettings() }
            ], { align: 'end', minWidth: 260 }));

            const back = h('a', { class: 'btn btn-ghost btn-icon tb-back', href: '#/', 'aria-label': 'Retour à mes storymaps', 'data-tip': 'Mes storymaps' }, SM.icon('arrow-left', 17));

            return h('header', { class: 'topbar' },
                h('div', { class: 'tb-left' }, back, h('a', { href: '#/', class: 'tb-logo', 'aria-hidden': 'true', tabindex: '-1' }, SM.logo(26)),
                    h('div', { class: 'tb-titlebox' }, this.titleInput, this.saveStatus)),
                h('div', { class: 'tb-center' }, this.modeSwitch.el, h('span', { class: 'tb-sep' }),
                    this.outlineToggle, h('span', { class: 'tb-sep tb-visual' }), this.undoBtn, this.redoBtn, h('span', { class: 'tb-sep tb-visual' }), this.inspectorToggle),
                h('div', { class: 'tb-right' }, exportBtn, previewBtn, moreBtn));
        }

        updateTitle() {
            const t = this.store.config.title || '';
            if (document.activeElement !== this.titleInput && this.titleInput.value !== t) this.titleInput.value = t;
            document.title = (t || 'Sans titre') + ' — StoryMap';
        }

        updateHistoryButtons() {
            this.undoBtn.disabled = !this.store.canUndo();
            this.redoBtn.disabled = !this.store.canRedo();
            this.undoBtn.setAttribute('data-tip', this.store.canUndo() ? 'Annuler : ' + this.store.undoLabel().toLowerCase() : 'Annuler');
            this.redoBtn.setAttribute('data-tip', this.store.canRedo() ? 'Rétablir : ' + this.store.redoLabel().toLowerCase() : 'Rétablir');
        }

        toggleOutline(force) {
            const open = force === undefined ? this.el.classList.contains('no-outline') : force;
            this.el.classList.toggle('no-outline', !open);
            this.outlineToggle.setAttribute('aria-pressed', String(open));
            if (this.isNarrow()) { if (open) this.toggleInspector(false); }
            else SM.prefs.set('outlineOpen', open);
        }

        toggleInspector(force) {
            const open = force === undefined ? this.el.classList.contains('no-inspector') : force;
            this.el.classList.toggle('no-inspector', !open);
            this.inspectorToggle.setAttribute('aria-pressed', String(open));
            if (this.isNarrow()) { if (open) this.toggleOutline(false); }
            else SM.prefs.set('inspectorOpen', open);
        }

        isInspectorOpen() { return !this.el.classList.contains('no-inspector'); }

        /* ---------- Mode d'édition : visuel ou tableur ---------- */

        /** Passe en mode visuel ('visual') ou tableur ('sheet'), mémorisé pour les prochaines ouvertures. */
        setMode(mode) {
            const next = mode === 'sheet' ? 'sheet' : 'visual';
            if (next === this.mode) return;
            this.mode = next;
            SM.prefs.set('editorMode', next);
            this.applyMode();
        }

        applyMode() {
            const sheet = this.mode === 'sheet';
            this.modeSwitch.set(this.mode);
            UI.hideTooltip();
            UI.closeMenu();
            this.rich.hide();
            if (sheet) {
                this.canvas.stopPlaying(true);
                this.el.classList.add('mode-sheet');
                this.sheet.show();
            } else {
                this.sheet.hide();
                this.el.classList.remove('mode-sheet');
                // Inspecteur non mis à jour pendant le tableur ; carte redimensionnée à son retour
                this.inspector.refresh();
                requestAnimationFrame(() => this.canvas.layout(true));
            }
        }

        isSheetMode() { return this.mode === 'sheet'; }

        /* ---------- Enregistrement automatique ---------- */

        setupSaving() {
            this.saveDebounced = U.debounce(() => this.save(), SAVE_DELAY);
            this.disposers.push(this.store.subscribe(evt => {
                if (evt.type !== 'change') return;
                this.dirty = true;
                this.setSaveState('dirty');
                this.saveDebounced();
            }));
            this.onBeforeUnload = e => {
                if (this.sheet) this.sheet.commitEdit();
                if (this.dirty || this.saving) {
                    this.saveDebounced.flush();
                    e.preventDefault();
                    e.returnValue = '';
                }
            };
            this.onHide = () => { if (document.visibilityState === 'hidden' && this.dirty) this.saveDebounced.flush(); };
            window.addEventListener('beforeunload', this.onBeforeUnload);
            document.addEventListener('visibilitychange', this.onHide);
            this.disposers.push(() => {
                window.removeEventListener('beforeunload', this.onBeforeUnload);
                document.removeEventListener('visibilitychange', this.onHide);
            });
            this.setSaveState('saved');
        }

        setSaveState(state, err) {
            this.saveState = state;
            const s = this.saveStatus;
            U.clear(s);
            s.className = 'save-status ' + state;
            if (state === 'saved') {
                s.append(SM.icon('cloud-check', 15), h('span', {}, 'Enregistré'));
                s.setAttribute('data-tip', this.lastSaved ? 'Enregistré dans ce navigateur à ' + U.formatTime(this.lastSaved) : 'Toutes les modifications sont enregistrées dans ce navigateur');
            } else if (state === 'dirty') {
                s.append(h('span', { class: 'dot' }), h('span', {}, 'Modifié'));
                s.setAttribute('data-tip', 'Enregistrement automatique dans un instant');
            } else if (state === 'saving') {
                s.append(SM.icon('loader', 15, 'spinner'), h('span', {}, 'Enregistrement…'));
                s.removeAttribute('data-tip');
            } else if (state === 'error') {
                s.append(SM.icon('alert-circle', 15), h('span', {}, 'Non enregistré'));
                s.setAttribute('data-tip', (err && err.message ? err.message + ' — ' : '') + 'Cliquez pour réessayer.');
            }
        }

        /** Écriture effective dans IndexedDB (ne lève jamais d'exception). */
        async writeStory() {
            const version = this.store.version;
            if (!this.closed) this.setSaveState('saving');
            try {
                this.store.updatedAt = Date.now();
                const extra = await this.thumbnailExtra();
                await SM.library.save(this.store.toStory(), extra);
                this.lastSaved = Date.now();
                if (this.store.version === version) {
                    this.dirty = false;
                    if (!this.closed) this.setSaveState('saved');
                } else if (!this.closed) {
                    this.setSaveState('dirty');
                }
            } catch (e) {
                console.error(e);
                this.saveFailed = true;
                if (!this.closed) this.setSaveState('error', e);
                if (!this.saveErrorShown) {
                    this.saveErrorShown = true;
                    UI.toast('Enregistrement impossible : ' + e.message, {
                        type: 'error', duration: 12000,
                        action: { label: 'Exporter une copie', onClick: () => SM.exportStory(this.store.toStory(), 'json') }
                    });
                    setTimeout(() => { this.saveErrorShown = false; }, 30000);
                }
                return;
            }
            this.saveFailed = false;
        }

        /**
         * Lance un enregistrement ; si un enregistrement est déjà en cours, un
         * nouveau passage est programmé à sa suite. Renvoie la promesse en cours.
         */
        save() {
            if (this.savePromise) {
                this.saveAgain = true;
                return this.savePromise;
            }
            this.saveAgain = false;
            this.saving = true;
            this.savePromise = this.writeStory().finally(() => {
                this.saving = false;
                this.savePromise = null;
                if (this.closed) return;
                if (this.saveAgain || (this.dirty && !this.saveFailed)) {
                    this.saveAgain = false;
                    this.saveDebounced();
                }
            });
            return this.savePromise;
        }

        /** Attend que toutes les modifications soient écrites (ou qu'une erreur survienne). */
        async flushSave() {
            for (let attempt = 0; attempt < 4; attempt++) {
                this.saveDebounced.cancel();
                if (this.savePromise) await this.savePromise;
                this.saveDebounced.cancel();
                if (!this.dirty) return true;
                if (this.saveFailed && attempt > 0) return false;
                await this.save();
            }
            return !this.dirty;
        }

        async saveNow(feedback) {
            this.sheet.commitEdit(); // cellule du tableur en cours de saisie
            const ok = await this.flushSave();
            if (feedback && ok) UI.toast('Storymap enregistrée dans ce navigateur.', { type: 'success', duration: 1800 });
        }

        async thumbnailExtra() {
            const img = M.firstImage(this.store.config);
            if (img) {
                if (this.thumbFor !== img) {
                    this.thumb = await SM.images.thumbnail(img, 480, 300);
                    this.thumbFor = img;
                }
                if (this.thumb) return { thumbnail: this.thumb, thumbnailSource: 'image' };
            }
            if (this.mapThumb) return { thumbnail: this.mapThumb, thumbnailSource: 'map' };
            return undefined;
        }

        captureMapThumb() {
            const sel = this.store.selection;
            if (!(sel.type === 'cover' || this.store.chapterIndex() === 0)) return;
            if (M.firstImage(this.store.config)) return;
            const now = Date.now();
            if (this.lastThumbAt && now - this.lastThumbAt < 4000) return;
            this.lastThumbAt = now;
            const t = this.canvas.snapshot();
            if (t) this.mapThumb = t;
        }

        /* ---------- Plusieurs onglets ---------- */

        setupSync() {
            this.disposers.push(SM.db.onBroadcast(msg => {
                if (msg.id !== this.store.id) return;
                if (msg.type === 'deleted') {
                    UI.toast('Cette storymap a été supprimée dans un autre onglet. Exportez-la si vous souhaitez la conserver.', { type: 'warning', duration: 12000 });
                } else if (msg.type === 'saved' && !this.syncWarned) {
                    this.syncWarned = true;
                    UI.toast('Cette storymap vient d’être modifiée dans un autre onglet.', {
                        type: 'warning', duration: 15000,
                        action: { label: 'Recharger', onClick: () => { this.dirty = false; this.saveDebounced.cancel(); location.reload(); } }
                    });
                    setTimeout(() => { this.syncWarned = false; }, 20000);
                }
            }));
        }

        /* ---------- Historique ---------- */

        undo() {
            if (document.activeElement && this.el.contains(document.activeElement) && U.isTypingTarget(document.activeElement)) document.activeElement.blur();
            const label = this.store.undo();
            if (label) UI.toast('Annulé : ' + label.toLowerCase(), { duration: 1500 });
        }

        redo() {
            if (document.activeElement && this.el.contains(document.activeElement) && U.isTypingTarget(document.activeElement)) document.activeElement.blur();
            const label = this.store.redo();
            if (label) UI.toast('Rétabli : ' + label.toLowerCase(), { duration: 1500 });
        }

        /* ---------- Chapitres ---------- */

        currentCamera() {
            const map = this.canvas.map;
            const sel = this.store.selectedChapter();
            // Tableur : la carte (masquée) peut être en plein déplacement ; le cadrage du chapitre fait foi
            if (map && this.store.selection.type === 'chapter' && !this.isSheetMode()) {
                const c = map.getCenter().wrap();
                return { center: [U.round(c.lng, 5), U.round(c.lat, 5)], zoom: U.round(map.getZoom(), 2), pitch: U.round(map.getPitch(), 2), bearing: U.round(map.getBearing(), 2) };
            }
            return sel ? U.pick(sel.view, ['center', 'zoom', 'pitch', 'bearing']) : Object.assign({}, M.DEFAULT_VIEW);
        }

        addChapter(afterIndex) {
            const cfg = this.store.config;
            const cur = this.store.selection.type === 'chapter' ? this.store.chapterIndex() : (this.store.selection.type === 'cover' ? -1 : cfg.chapters.length - 1);
            const after = afterIndex === undefined ? cur : afterIndex;
            const ref = cfg.chapters[Math.max(0, after)] || cfg.chapters[0];
            const view = this.currentCamera();
            const chapter = M.createChapter(cfg, {
                align: ref ? ref.align : undefined,
                transition: ref ? { type: ref.transition.type } : undefined,
                view: { center: view.center.slice(), zoom: view.zoom, pitch: view.pitch || 0, bearing: view.bearing || 0 }
            });
            // Le nouveau chapitre affiche les mêmes calques de données que le chapitre de référence
            const next = M.ops.insertChapter(cfg, after + 1, chapter, ref ? ref.id : null);
            this.store.commit(next, { label: 'Nouveau chapitre', selection: { type: 'chapter', id: chapter.id } });
            // Tableur : la ligne existe déjà ; rendu visuel : le panneau est reconstruit à l'image suivante
            if (this.isSheetMode()) this.focusChapterTitle();
            else requestAnimationFrame(() => this.focusChapterTitle());
        }

        /**
         * Chapitres à partir d'un fichier de lieux (GeoJSON, KML, GPX) : un chapitre
         * par lieu, à la place des chapitres ou en plus. Ses images désignées par un
         * nom de fichier se choisissent ensuite dans la fenêtre de création.
         */
        async chaptersFromData(files) {
            const list = files || await U.pickFiles({ accept: SM.places.ACCEPT });
            if (!list || !list.length) return;
            const current = this.store.selection.type === 'chapter' ? this.store.chapterIndex() : -1;
            const plan = await UI.chaptersFromData({ files: list, config: this.store.config, current });
            if (!plan || !plan.chapters.length) return;
            let cfg = this.store.config;
            if (plan.placement === 'replace') cfg = M.ops.setChapters(cfg, plan.chapters);
            else {
                const at = plan.placement === 'after' && current >= 0 ? current + 1 : cfg.chapters.length;
                plan.chapters.forEach((ch, k) => { cfg = M.ops.insertChapter(cfg, at + k, ch); });
            }
            if (plan.layer) cfg = M.ops.addData(cfg, plan.layer);
            this.store.commit(cfg, {
                label: U.plural(plan.chapters.length, 'chapitre créé', 'chapitres créés') + ' à partir de données',
                selection: { type: 'chapter', id: plan.chapters[0].id }
            });
            const after = this.store.config;
            const missing = SM.io.uniqueUnembedded(after).length;
            UI.toast(U.plural(plan.chapters.length, 'chapitre créé', 'chapitres créés') + (plan.layer ? ', lieux affichés sur la carte' : '') + '.' +
                (missing ? ' ' + U.plural(missing, 'image reste', 'images restent') + ' à intégrer.' : ''), {
                type: missing ? 'warning' : 'success', duration: 9000,
                action: missing
                    ? { label: 'Intégrer les images…', onClick: () => this.resolveImages() }
                    : { label: 'Annuler', onClick: () => { if (this.store.config === after) this.store.undo(); } }
            });
        }

        /**
         * Chapitres à partir d'un tableau (fichier CSV, ou archive .zip exportée
         * par le tableur) : une ligne par chapitre, à la place des chapitres
         * (les lignes reliées par leur identifiant mettent à jour leur chapitre)
         * ou en plus. Le tableur s'affiche ensuite.
         */
        async importSheet(files) {
            const list = files || await U.pickFiles({ accept: SM.sheet.ACCEPT, multiple: true });
            if (!list || !list.length) return;
            this.sheet.commitEdit();
            const current = this.store.selection.type === 'chapter' ? this.store.chapterIndex() : -1;
            const plan = await UI.sheetImport({ files: list, config: this.store.config, current });
            if (!plan || !plan.chapters.length) return;
            let cfg = this.store.config;
            if (plan.placement === 'replace') cfg = M.ops.setChapters(cfg, plan.chapters);
            else {
                const at = plan.placement === 'after' && current >= 0 ? current + 1 : cfg.chapters.length;
                // Les nouveaux chapitres affichent les calques de données du chapitre qui les précède
                plan.chapters.forEach((ch, k) => {
                    const like = k ? plan.chapters[k - 1].id : at > 0 ? cfg.chapters[at - 1].id : null;
                    cfg = M.ops.insertChapter(cfg, at + k, ch, like);
                });
            }
            const n = plan.chapters.length;
            this.store.commit(cfg, {
                label: 'Import d’un tableau (' + U.plural(n, 'ligne') + ')',
                selection: { type: 'chapter', id: plan.chapters[0].id }
            });
            this.setMode('sheet');
            const after = this.store.config;
            const missing = SM.io.uniqueUnembedded(after).filter(x => !x.remote).length;
            const s = plan.stats;
            const parts = [];
            if (s.updated) parts.push(U.plural(s.updated, 'chapitre mis à jour', 'chapitres mis à jour'));
            if (s.created) parts.push(U.plural(s.created, 'chapitre créé', 'chapitres créés'));
            let msg = 'Tableau importé : ' + (parts.join(', ') || U.plural(n, 'chapitre')) + '.';
            if (missing) msg += ' ' + U.plural(missing, 'image reste', 'images restent') + ' à intégrer.';
            if (plan.errors && plan.errors.length) msg += ' Images illisibles : ' + plan.errors.join(' — ');
            UI.toast(msg, {
                type: missing || (plan.errors && plan.errors.length) ? 'warning' : 'success', duration: 9000,
                action: missing
                    ? { label: 'Intégrer les images…', onClick: () => this.resolveImages() }
                    : { label: 'Annuler', onClick: () => { if (this.store.config === after) this.store.undo(); } }
            });
        }

        duplicateChapter(i) {
            if (i < 0) return;
            const res = M.ops.duplicateChapter(this.store.config, i);
            this.store.commit(res.config, { label: 'Duplication du chapitre', selection: { type: 'chapter', id: res.chapter.id } });
            UI.toast('Chapitre dupliqué.', { type: 'success', duration: 1800 });
        }

        removeChapter(i) {
            const cfg = this.store.config;
            if (i < 0 || cfg.chapters.length <= 1) {
                UI.toast('Une storymap doit contenir au moins un chapitre.', { type: 'warning' });
                return;
            }
            const ch = cfg.chapters[i];
            const next = M.ops.removeChapter(cfg, i);
            const wasSelected = this.store.selection.type === 'chapter' && this.store.selection.id === ch.id;
            this.store.commit(next, {
                label: 'Suppression du chapitre',
                selection: wasSelected ? { type: 'chapter', id: next.chapters[Math.min(i, next.chapters.length - 1)].id } : undefined
            });
            const after = this.store.config;
            UI.toast('« ' + M.chapterLabel(ch, i) + ' » supprimé.', {
                type: 'success',
                action: {
                    label: 'Annuler', onClick: () => {
                        if (this.store.config === after) this.store.undo();
                        else {
                            const restored = M.ops.insertChapter(this.store.config, Math.min(i, this.store.config.chapters.length),
                                Object.assign({}, ch, { id: this.store.config.chapters.some(c => c.id === ch.id) ? M.uniqueChapterId(this.store.config, ch.id) : ch.id }));
                            this.store.commit(restored, { label: 'Restauration du chapitre' });
                        }
                    }
                }
            });
        }

        moveChapter(from, to) {
            const n = this.store.config.chapters.length;
            if (to < 0 || to >= n || from === to) return;
            this.store.commit(M.ops.moveChapter(this.store.config, from, to), { label: 'Déplacement du chapitre' });
        }

        toggleHidden(i) {
            const ch = this.store.config.chapters[i];
            this.store.setChapter(i, { hidden: !ch.hidden }, { label: ch.hidden ? 'Afficher le panneau' : 'Masquer le panneau' });
        }

        renameChapter(i, value) {
            const cfg = this.store.config;
            const ch = cfg.chapters[i];
            const id = U.stripAccents(value).trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '').replace(/-{2,}/g, '-');
            if (!id) { UI.toast('L’identifiant ne peut pas être vide.', { type: 'warning' }); this.inspector.update(); return; }
            if (id === ch.id) { this.inspector.update(); return; }
            if (cfg.chapters.some((c, k) => k !== i && c.id === id)) {
                UI.toast('L’identifiant « ' + id + ' » est déjà utilisé par un autre chapitre.', { type: 'warning' });
                this.inspector.update();
                return;
            }
            const selected = this.store.selection.type === 'chapter' && this.store.selection.id === ch.id;
            this.store.commit(M.ops.renameChapter(cfg, i, id), { label: 'Identifiant du chapitre', selection: selected ? { type: 'chapter', id } : undefined });
        }

        navigate(delta) {
            const sel = this.store.selection;
            const n = this.store.config.chapters.length;
            // Ordre : couverture, chapitres…, pied de page
            let pos = sel.type === 'cover' ? -1 : sel.type === 'footer' ? n : this.store.chapterIndex();
            pos = U.clamp(pos + delta, -1, n);
            if (pos === -1) this.store.select({ type: 'cover' });
            else if (pos === n) this.store.select({ type: 'footer' });
            else this.store.selectChapterAt(pos);
        }

        /* ---------- Cadrage ---------- */

        copyView() {
            const ch = this.store.selectedChapter();
            if (!ch) return;
            this.viewClipboard = U.pick(ch.view, ['center', 'zoom', 'pitch', 'bearing']);
            U.storage.set('viewClipboard', this.viewClipboard);
            U.copyText(JSON.stringify({ view: this.viewClipboard }, null, 2));
            UI.toast('Cadrage copié (également dans le presse-papiers).', { type: 'success', duration: 1800 });
        }

        pasteView() {
            if (!this.viewClipboard) { UI.toast('Aucun cadrage copié pour l’instant.', { type: 'info' }); return; }
            const i = this.store.chapterIndex();
            this.store.setView(i, U.pick(this.viewClipboard, ['center', 'zoom', 'pitch', 'bearing']), { label: 'Collage du cadrage' });
        }

        copyPreviousView() {
            const i = this.store.chapterIndex();
            if (i <= 0) return;
            const prev = this.store.config.chapters[i - 1];
            this.store.setView(i, U.pick(prev.view, ['center', 'zoom', 'pitch', 'bearing']), { label: 'Cadrage du chapitre précédent' });
        }

        /* ---------- Texte ---------- */

        focusChapterTitle() {
            if (this.store.selection.type !== 'chapter') return;
            if (this.isSheetMode()) { this.sheet.editCell(this.store.chapterIndex(), 'title'); return; }
            const refs = this.canvas.els.step;
            if (refs && !refs.ghost) this.canvas.focusEnd(refs.title);
        }

        focusChapterText() {
            const refs = this.canvas.els.step;
            if (refs && !refs.ghost) this.canvas.focusEnd(refs.desc);
        }

        focusFooter() {
            if (this.canvas.els.footerText) this.canvas.focusEnd(this.canvas.els.footerText);
        }

        editDescriptionHtml() {
            const refs = this.canvas.els.step;
            if (refs && refs.desc.__rtOpts) this.rich.codeDialog(refs.desc, refs.desc.__rtOpts);
        }

        editFooterHtml() {
            const el = this.canvas.els.footerText;
            if (el && el.__rtOpts) this.rich.codeDialog(el, el.__rtOpts);
        }

        /* ---------- Images ---------- */

        async pickChapterImage(i) {
            const [file] = await U.pickFiles({ accept: SM.images.ACCEPT });
            if (file) this.setChapterImageFromFile(i, file);
        }

        async setChapterImageFromFile(i, file) {
            const ch = this.store.config.chapters[i];
            if (!ch || !file) return;
            const id = ch.id;
            if (this.store.chapterIndex() === i && this.store.selection.type === 'chapter') this.canvas.showImageLoading();
            try {
                const res = await SM.images.fromFile(file);
                const k = this.store.config.chapters.findIndex(c => c.id === id);
                if (k < 0) return;
                this.store.setChapter(k, { image: res.src }, { label: 'Image du chapitre' });
                if (res.optimized) {
                    UI.toast('Image optimisée : ' + U.formatBytes(res.originalBytes) + ' → ' + U.formatBytes(res.bytes) + ' (' + res.width + ' × ' + res.height + ' px).', { type: 'success' });
                } else if (res.bytes > 1.5 * 1024 * 1024) {
                    UI.toast('Image volumineuse (' + U.formatBytes(res.bytes) + ') : elle alourdira vos exports.', { type: 'warning', action: { label: 'Alléger', onClick: () => this.optimizeChapterImage(this.store.config.chapters.findIndex(c => c.id === id)) } });
                }
            } catch (e) {
                UI.toast(e.message, { type: 'error' });
                this.canvas.patchStory();
            }
        }

        async chapterImageFromUrl(i) {
            const ch = this.store.config.chapters[i];
            if (!ch) return;
            const id = ch.id;
            const url = await UI.prompt({
                title: 'Image depuis une adresse web', icon: 'link', label: 'Adresse de l’image', placeholder: 'https://…/photo.jpg',
                hint: 'L’image est téléchargée puis intégrée en base64, si le site l’autorise.', confirmLabel: 'Intégrer',
                validate: v => (/^https?:\/\/\S+$/i.test(v.trim()) ? null : 'Adresse http(s) attendue.')
            });
            if (!url) return;
            const t = UI.toast('Téléchargement de l’image…', { type: 'loading' });
            const setImage = src => {
                const k = this.store.config.chapters.findIndex(c => c.id === id);
                if (k >= 0) this.store.setChapter(k, { image: src }, { label: 'Image du chapitre' });
            };
            try {
                const res = await SM.images.fromUrl(url.trim());
                setImage(res.src);
                t.update('Image téléchargée et intégrée (' + U.formatBytes(res.bytes) + ').', 'success');
            } catch (e) {
                t.dismiss();
                const keep = await UI.confirm({
                    title: 'Image non téléchargeable', icon: 'alert', tone: 'warning', confirmLabel: 'Utiliser le lien',
                    message: e.message + ' Vous pouvez utiliser le lien tel quel : l’image restera hébergée sur l’autre site et ne sera pas intégrée à vos exports .json. Vous pouvez aussi l’enregistrer sur votre ordinateur puis l’ajouter comme fichier.'
                });
                if (keep) setImage(url.trim());
            }
        }

        removeChapterImage(i) {
            const ch = this.store.config.chapters[i];
            if (!ch || !ch.image) return;
            this.store.setChapter(i, { image: '', imageAlt: '', imageCaption: '', imageCredit: '' }, { label: 'Retrait de l’image' });
            const after = this.store.config;
            UI.toast('Image retirée.', { action: { label: 'Annuler', onClick: () => { if (this.store.config === after) this.store.undo(); } } });
        }

        async optimizeChapterImage(i) {
            const ch = this.store.config.chapters[i];
            if (!ch || !M.isDataUrl(ch.image)) return;
            const id = ch.id;
            const before = SM.images.dataUrlBytes(ch.image);
            const t = UI.toast('Optimisation de l’image…', { type: 'loading' });
            try {
                const maxDim = SM.prefs.get('imageMaxDim') || 1600;
                const res = await SM.images.reoptimize(ch.image, { maxDim, quality: SM.prefs.get('imageQuality') });
                if (!res.optimized || res.bytes >= before) { t.update('L’image est déjà optimisée.', 'info'); return; }
                const k = this.store.config.chapters.findIndex(c => c.id === id);
                if (k >= 0) this.store.setChapter(k, { image: res.src }, { label: 'Optimisation de l’image' });
                t.update('Image allégée : ' + U.formatBytes(before) + ' → ' + U.formatBytes(res.bytes) + '.', 'success');
            } catch (e) { t.update(e.message, 'error'); }
        }

        async resolveImages() {
            if (!SM.io.uniqueUnembedded(this.store.config).length) {
                UI.toast('Toutes les images sont déjà intégrées.', { type: 'success' });
                return;
            }
            const next = await UI.resolveImages(this.store.config);
            if (next) {
                this.store.commit(next, { label: 'Intégration des images' });
                UI.toast('Images intégrées.', { type: 'success' });
            }
        }

        /* ---------- Calques de données (GeoJSON, GPX, KML) ---------- */

        async pickData() {
            const files = await U.pickFiles({ accept: SM.geodata.ACCEPT, multiple: true });
            if (files.length) this.importData(files);
        }

        /** Importe des fichiers de données : un calque par fichier, affiché dans tous les chapitres. */
        async importData(files) {
            const list = Array.from(files || []).filter(Boolean);
            if (!list.length) return;
            const t = UI.toast(list.length > 1 ? 'Import de ' + list.length + ' fichiers de données…' : 'Import de « ' + list[0].name + ' »…', { type: 'loading' });
            const parsed = [];
            const errors = [];
            for (const f of list) {
                try {
                    parsed.push(await SM.geodata.parseFile(f));
                } catch (e) {
                    errors.push((list.length > 1 ? '« ' + f.name + ' » : ' : '') + e.message);
                }
            }
            t.dismiss();
            if (!parsed.length) {
                UI.toast(errors.join(' — '), { type: 'error', duration: 10000 });
                return;
            }
            let cfg = this.store.config;
            const added = parsed.map(res => {
                const d = M.createData(cfg, { name: res.name, geojson: res.data });
                cfg = M.ops.addData(cfg, d);
                return d;
            });
            this.inspector.openData = added[added.length - 1].id;
            this.store.commit(cfg, { label: added.length > 1 ? 'Import de ' + added.length + ' calques de données' : 'Import de « ' + added[0].name + ' »' });

            const ids = added.map(d => d.id);
            const bbox = SM.geodata.bbox(added.map(d => d.geojson));
            const bytes = added.reduce((n, d) => n + SM.geodata.byteSize(d.geojson), 0);
            let msg = added.length > 1 ? added.length + ' calques importés.' : '« ' + added[0].name + ' » importé : ' + SM.geodata.summary(added[0].geojson) + '.';
            if (!this.canvas.showsBounds(bbox)) msg += ' Les données sont hors du cadrage actuel.';
            if (bytes > SM.geodata.LARGE_BYTES) msg += ' Données volumineuses (' + U.formatBytes(bytes) + ') : la storymap sera plus longue à charger.';
            if (errors.length) msg += ' Non importé : ' + errors.join(' — ');
            UI.toast(msg, {
                type: errors.length || bytes > SM.geodata.LARGE_BYTES ? 'warning' : 'success', duration: 9000,
                action: { label: 'Cadrer la carte', onClick: () => this.fitData(ids) }
            });
        }

        /** Cadre le chapitre affiché sur des calques (identifiants ; tous par défaut). */
        fitData(ids) {
            const data = this.store.config.data.filter(d => !ids || ids.includes(d.id));
            const bbox = SM.geodata.bbox(data.map(M.dataShape)); // lignes reliant les points comprises
            if (bbox && !this.canvas.fitBounds(bbox)) UI.toast('La carte n’est pas encore prête : réessayez dans un instant.', { type: 'warning' });
        }

        /** Remplace les géométries d'un calque (le nom, le style et les chapitres sont conservés). */
        async replaceData(id) {
            const [file] = await U.pickFiles({ accept: SM.geodata.ACCEPT });
            if (!file) return;
            try {
                const res = await SM.geodata.parseFile(file);
                const i = this.store.config.data.findIndex(d => d.id === id);
                if (i < 0) return;
                this.store.commit(M.ops.setData(this.store.config, i, { geojson: res.data }), { label: 'Remplacement des données' });
                UI.toast('Données remplacées : ' + SM.geodata.summary(res.data) + '.', { type: 'success' });
            } catch (e) {
                UI.toast(e.message, { type: 'error', duration: 9000 });
            }
        }

        /** Télécharge un calque au format GeoJSON. */
        downloadData(id) {
            const d = this.store.config.data.find(x => x.id === id);
            if (d) U.download(new Blob([JSON.stringify(d.geojson)], { type: 'application/geo+json' }), (U.slugify(d.name) || d.id) + '.geojson');
        }

        removeData(id) {
            const cfg = this.store.config;
            const i = cfg.data.findIndex(d => d.id === id);
            if (i < 0) return;
            const d = cfg.data[i];
            this.store.commit(M.ops.removeData(cfg, i), { label: 'Suppression du calque « ' + d.name + ' »' });
            const after = this.store.config;
            UI.toast('Calque « ' + d.name + ' » supprimé.', {
                type: 'success',
                action: {
                    label: 'Annuler', onClick: () => {
                        if (this.store.config === after) { this.store.undo(); return; }
                        // D'autres modifications ont suivi : le calque est remis à sa place
                        const c = this.store.config;
                        const k = Math.min(i, c.data.length);
                        let next = M.ops.addData(c, Object.assign({}, d, { id: c.data.some(x => x.id === d.id) ? M.uniqueDataId(c, d.id) : d.id }));
                        next = M.ops.moveData(next, next.data.length - 1, k);
                        if (Array.isArray(d.chapters)) next = M.ops.setDataChapters(next, k, d.chapters);
                        this.store.commit(next, { label: 'Restauration du calque' });
                    }
                }
            });
        }

        /* ---------- Aperçu & export ---------- */

        openPreview() {
            this.sheet.commitEdit();
            if (document.activeElement && U.isTypingTarget(document.activeElement)) document.activeElement.blur();
            const sel = this.store.selection;
            const i = this.store.chapterIndex();
            const start = sel.type === 'chapter' && i > 0 ? this.store.config.chapters[i].id : sel.type === 'footer' ? this.store.config.chapters[this.store.config.chapters.length - 1].id : null;
            SM.Preview.open(this.store.config, { startChapterId: start });
        }

        openExport() {
            this.sheet.commitEdit();
            const story = this.store.toStory();
            const cfg = story.config;
            const unembedded = SM.io.uniqueUnembedded(cfg);
            const issues = M.validate(cfg).filter(i => i.level === 'error');
            const packed = SM.io.pack(cfg);
            const jsonSize = SM.io.byteSize(SM.io.stringify(SM.io.toExchange(story, packed)));
            const nImages = Object.keys(packed.images).length;

            const option = (icon, title, desc, meta, kind, primary) => {
                const card = h('button', { type: 'button', class: 'export-card' + (primary ? ' primary' : '') },
                    h('span', { class: 'export-icon' }, SM.icon(icon, 20)),
                    h('span', { class: 'export-text' },
                        h('strong', {}, title),
                        h('span', { class: 'export-desc' }, desc),
                        meta ? h('span', { class: 'export-meta' }, meta) : null),
                    SM.icon('download', 17, 'export-dl'));
                card.addEventListener('click', async () => {
                    modal.close();
                    await this.saveNow(false);
                    SM.exportStory(this.store.toStory(), kind);
                });
                return card;
            };

            // Tableau des chapitres (CSV) : fenêtre d'export du tableur
            const sheetOption = h('button', { type: 'button', class: 'export-card' },
                h('span', { class: 'export-icon' }, SM.icon('file-table', 20)),
                h('span', { class: 'export-text' },
                    h('strong', {}, 'Tableau des chapitres (.csv)'),
                    h('span', { class: 'export-desc' }, 'Une ligne par chapitre (titre, texte, coordonnées, image…) pour Excel, LibreOffice ou Google Sheets. Réimportable dans le tableur.')),
                SM.icon('chevron-right', 17, 'export-dl'));
            sheetOption.addEventListener('click', () => { modal.close(); UI.sheetExport(this.store.config); });

            const body = h('div', { class: 'export' },
                unembedded.length ? h('div', { class: 'callout callout-warning' }, SM.icon('alert', 16),
                    h('div', {},
                        h('p', {}, h('strong', {}, U.plural(unembedded.length, 'image n’est pas intégrée', 'images ne sont pas intégrées')), ' (chemin relatif ou lien externe) : elles ne seront pas incluses dans le fichier.'),
                        h('p', { style: 'margin-top:8px' }, UI.button({ label: 'Intégrer les images…', icon: 'image-plus', size: 'xs', onClick: () => { modal.close(); this.resolveImages(); } })))) : null,
                issues.length ? h('div', { class: 'callout callout-danger' }, SM.icon('alert-circle', 16),
                    h('div', {}, issues.map(i => h('p', {}, i.message)))) : null,
                h('div', { class: 'export-grid' },
                    option('file-json', 'Fichier storymap (.json)', 'Format de sauvegarde et d’échange : réimportable dans l’éditeur, images intégrées en base64.',
                        '≈ ' + U.formatBytes(jsonSize) + ' · ' + U.plural(nImages, 'image intégrée', 'images intégrées') +
                        (cfg.data.length ? ' · ' + U.plural(cfg.data.length, 'calque de données', 'calques de données') : ''), 'json', true),
                    option('globe', 'Page web autonome (.html)', 'Un seul fichier contenant la storymap et ses images : prêt à publier ou à envoyer. Réimportable dans l’éditeur.', null, 'html'),
                    option('archive', 'Site web (.zip)', 'index.html + dossier images/ + image d’aperçu des liens. Chargement plus rapide : idéal pour GitHub Pages.', null, 'zip'),
                    sheetOption),
                // Une fois la storymap en ligne : intégration dans un site et QR code
                h('div', { class: 'export-share' },
                    h('div', { class: 'export-share-text' },
                        h('strong', {}, 'Partager la storymap publiée'),
                        h('span', { class: 'export-desc' }, cfg.share.url ? cfg.share.url : 'Indiquez son adresse de publication pour obtenir le code d’intégration et le QR code.')),
                    UI.button({ label: 'Code d’intégration', icon: 'code', size: 'sm', onClick: () => { modal.close(); SM.Share.embedDialog(this.store); } }),
                    UI.button({ label: 'QR code', icon: 'qr-code', size: 'sm', onClick: () => { modal.close(); SM.Share.qrDialog(this.store); } })));

            const modal = UI.modal({ title: 'Exporter la storymap', subtitle: cfg.title || 'Sans titre', icon: 'download', width: 620, body });
        }

        async duplicateStory() {
            await this.saveNow(false);
            try {
                const copy = await SM.library.duplicate(this.store.id);
                UI.toast('Copie créée : « ' + copy.config.title + ' ».', { type: 'success', action: { label: 'Ouvrir', onClick: () => { location.hash = '#/edit/' + copy.id; } } });
            } catch (e) { UI.toast(e.message, { type: 'error' }); }
        }

        /* ---------- Guide de démarrage ---------- */

        maybeOnboarding() {
            if (!SM.prefs.get('onboardingDone')) setTimeout(() => this.showOnboarding(false), 600);
        }

        showOnboarding() {
            if (this.onboardEl) this.onboardEl.remove();
            const steps = [
                ['edit', 'Écrivez directement sur la storymap', 'Cliquez sur le titre ou le texte du panneau pour les modifier, comme dans un traitement de texte.'],
                ['map', 'Cadrez la carte à la souris', 'Glissez pour déplacer, molette pour zoomer, clic droit + glisser pour pivoter et incliner. Le cadrage est enregistré automatiquement.'],
                ['book', 'Construisez le récit', 'Ajoutez, réordonnez (glisser-déposer) et dupliquez vos chapitres dans le plan, à gauche.'],
                ['play', 'Prévisualisez puis exportez', 'L’aperçu montre la storymap réelle ; exportez en .json (images intégrées), en page HTML ou en site web.']
            ];
            const close = () => { this.onboardEl.remove(); this.onboardEl = null; SM.prefs.set('onboardingDone', true); };
            this.onboardEl = h('div', { class: 'onboarding', role: 'dialog', 'aria-label': 'Guide de démarrage' },
                h('div', { class: 'onb-head' }, h('strong', {}, 'Bienvenue dans l’éditeur'), UI.button({ icon: 'x', iconOnly: true, size: 'xs', variant: 'ghost', label: 'Fermer', onClick: close })),
                h('ol', {}, steps.map(s => h('li', {}, h('span', { class: 'onb-icon' }, SM.icon(s[0], 15)), h('div', {}, h('strong', {}, s[1]), h('span', {}, s[2]))))),
                h('div', { class: 'onb-foot' }, h('span', { class: 'subtle' }, 'Raccourcis : touche ', h('kbd', {}, '?')), UI.button({ label: 'C’est parti !', variant: 'primary', size: 'sm', onClick: close })));
            this.canvas.stage.appendChild(this.onboardEl);
        }

        /* ---------- Clavier ---------- */

        onKey(e) {
            // Déjà traité par un composant (plan, zone de texte…) : ne pas agir deux fois
            if (e.defaultPrevented) return false;
            if (SM.Preview.isOpen() || document.querySelector('dialog[open]')) return false;
            const typing = U.isTypingTarget(e.target);
            const inEditor = !typing || this.el.contains(e.target);
            if (!inEditor) return false;

            if (U.matchShortcut(e, 'Mod+S')) { e.preventDefault(); this.saveNow(true); return true; }
            if (U.matchShortcut(e, 'Mod+Enter')) { e.preventDefault(); this.openPreview(); return true; }
            if (U.matchShortcut(e, 'Mod+E')) { e.preventDefault(); this.openExport(); return true; }
            if (U.matchShortcut(e, 'Mod+Shift+Enter')) { e.preventDefault(); if (typing) e.target.blur(); this.addChapter(); return true; }
            if (typing) return false;

            if (U.matchShortcut(e, 'Mod+Z')) { e.preventDefault(); this.undo(); return true; }
            if (U.matchShortcut(e, 'Mod+Shift+Z') || U.matchShortcut(e, 'Mod+Y')) { e.preventDefault(); this.redo(); return true; }
            if (U.matchShortcut(e, 'Mod+D')) { e.preventDefault(); if (this.store.selection.type === 'chapter') this.duplicateChapter(this.store.chapterIndex()); return true; }
            if (U.matchShortcut(e, 'Mod+Shift+ArrowUp')) { e.preventDefault(); const i = this.store.chapterIndex(); if (this.store.selection.type === 'chapter') this.moveChapter(i, i - 1); return true; }
            if (U.matchShortcut(e, 'Mod+Shift+ArrowDown')) { e.preventDefault(); const i = this.store.chapterIndex(); if (this.store.selection.type === 'chapter') this.moveChapter(i, i + 1); return true; }
            if (e.key === 'PageDown' || U.matchShortcut(e, 'Alt+ArrowDown')) { e.preventDefault(); this.navigate(1); return true; }
            if (e.key === 'PageUp' || U.matchShortcut(e, 'Alt+ArrowUp')) { e.preventDefault(); this.navigate(-1); return true; }
            if (e.key === '?' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); UI.showShortcuts(); return true; }
            // Tableur : les flèches et Espace servent au tableau
            if (!this.isSheetMode() && this.navigationKey(e)) return true;
            return false;
        }

        /**
         * Navigation entre chapitres : ← précédent, → ou Espace suivant,
         * ↑ premier chapitre, ↓ dernier chapitre (hors champs et curseurs).
         */
        navigationKey(e) {
            if (e.ctrlKey || e.metaKey || e.altKey) return false;
            const t = e.target || {};
            const tag = String(t.tagName || '').toUpperCase();
            // Les curseurs, listes et cases gardent l'usage normal des flèches
            if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || t.isContentEditable) return false;
            const space = e.key === ' ' || e.key === 'Spacebar';
            // Espace active normalement les boutons et liens
            if (space && (tag === 'BUTTON' || tag === 'A' || tag === 'SUMMARY' || (t.getAttribute && /^(button|menuitem|tab|switch|checkbox|radio)$/.test(t.getAttribute('role') || '')))) return false;
            const n = this.store.config.chapters.length;
            if (e.key === 'ArrowLeft' || (space && e.shiftKey)) this.navigate(-1);
            else if (e.key === 'ArrowRight' || space) this.navigate(1);
            else if (e.key === 'ArrowUp' && !e.shiftKey) this.store.selectChapterAt(0);
            else if (e.key === 'ArrowDown' && !e.shiftKey) this.store.selectChapterAt(n - 1);
            else return false;
            e.preventDefault();
            return true;
        }

        /* ---------- Fermeture ---------- */

        async close() {
            if (this.closing) return this.closing;
            this.closing = (async () => {
                // Saisie en cours dans le tableur : enregistrée
                this.sheet.commitEdit();
                // Termine les écritures en cours AVANT de retirer la protection de fermeture d'onglet
                await this.flushSave();
                this.closed = true;
                await this.teardown();
            })();
            return this.closing;
        }

        async teardown() {
            try {
                if (this.mapThumb && !M.firstImage(this.store.config)) {
                    await SM.db.updateSummary(this.store.id, { thumbnail: this.mapThumb, thumbnailSource: 'map' });
                }
            } catch (e) { /* ignore */ }
            SM.Preview.close();
            this.disposers.forEach(fn => fn());
            this.canvas.destroy();
            this.outline.destroy();
            this.sheet.destroy();
            this.inspector.destroy();
            this.rich.destroy();
            this.events.clear();
            U.clear(this.root);
        }
    }

    SM.Editor = Editor;
})();
