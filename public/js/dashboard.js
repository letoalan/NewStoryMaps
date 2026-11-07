/* ==========================================================================
   StoryMap — tableau de bord (« Mes storymaps »)
   ========================================================================== */
(function () {
    'use strict';

    const SM = window.SM;
    const U = SM.util;
    const h = U.h;
    const UI = SM.ui;
    const M = SM.model;

    const SORTS = {
        updated: { label: 'Dernière modification', fn: (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0) },
        created: { label: 'Date de création', fn: (a, b) => (b.createdAt || 0) - (a.createdAt || 0) },
        title: { label: 'Titre (A → Z)', fn: (a, b) => (a.title || '').localeCompare(b.title || '', 'fr', { sensitivity: 'base' }) }
    };

    /** Charge l'exemple fourni (fichier .json intégré, images comprises) à la demande. */
    SM.loadExample = async function () {
        if (!SM.EXAMPLE) await U.loadScript('js/data/exemple.js');
        return SM.io.fromObject(SM.EXAMPLE, 'exemple')[0].config;
    };

    /** Barre d'en-tête commune. */
    SM.appHeader = function (extra) {
        return h('header', { class: 'app-header' },
            h('a', { class: 'brand', href: '#/' },
                SM.logo(30),
                h('span', { class: 'brand-text' },
                    h('span', { class: 'brand-name' }, 'StoryMap'),
                    h('span', { class: 'brand-tag' }, 'Éditeur visuel de storymaps'))),
            h('div', { class: 'spacer' }),
            extra || null,
            UI.button({ icon: 'keyboard', iconOnly: true, variant: 'ghost', label: 'Raccourcis clavier', shortcut: '?', onClick: () => UI.showShortcuts() }),
            UI.button({ icon: 'settings', iconOnly: true, variant: 'ghost', label: 'Paramètres', onClick: () => UI.openSettings() }));
    };

    /* ---------- Création d'une storymap ---------- */

    /**
     * Nouvelle storymap à partir d'un fichier de lieux (GeoJSON, KML, GPX) et
     * de ses images éventuelles : un chapitre par lieu.
     * @returns {Promise<object|null>} storymap créée
     */
    SM.createStoryFromData = async function (files) {
        const plan = await UI.chaptersFromData({ files });
        if (!plan) return null;
        let config = M.ops.setChapters(M.createConfig({ title: plan.title || 'Ma storymap' }), plan.chapters);
        if (plan.layer) config = M.ops.addData(config, plan.layer);
        return SM.library.create(config);
    };

    /**
     * Nouvelle storymap à partir d'un tableau (fichier CSV, ou archive .zip
     * exportée par le tableur), ouverte dans le tableur.
     * @returns {Promise<object|null>} storymap créée
     */
    SM.createStoryFromSheet = async function (files) {
        const plan = await UI.sheetImport({ files });
        if (!plan) return null;
        const config = M.ops.setChapters(M.createConfig({ title: plan.title || 'Ma storymap' }), plan.chapters);
        const story = await SM.library.create(config);
        SM.prefs.set('editorMode', 'sheet');
        const missing = SM.io.uniqueUnembedded(config).filter(x => !x.remote).length;
        UI.toast(U.plural(plan.chapters.length, 'chapitre créé', 'chapitres créés') + ' à partir du tableau.' +
            (missing ? ' ' + U.plural(missing, 'image reste', 'images restent') + ' à intégrer (menu « ⋯ » › Intégrer les images externes).' : ''),
            { type: missing ? 'warning' : 'success', duration: 7000 });
        return story;
    };

    /** Illustration d'un tableau (une ligne par chapitre). */
    function sheetArt() {
        const rows = [0, 1, 2, 3].map(k => {
            const y = 30 + k * 16;
            return '<rect x="14" y="' + y + '" width="132" height="16" fill="' + (k % 2 ? '#f7f8fa' : '#ffffff') + '"/>' +
                '<text x="19.5" y="' + (y + 11) + '" font-family="Arial, sans-serif" font-size="7" font-weight="700" fill="#858e9e">' + (k + 1) + '</text>' +
                '<rect x="32" y="' + (y + 5.5) + '" width="' + [26, 22, 30, 18][k] + '" height="5" rx="1.5" fill="#4d5667"/>' +
                '<rect x="68" y="' + (y + 5.5) + '" width="' + [34, 28, 38, 24][k] + '" height="5" rx="1.5" fill="#ccd2db"/>' +
                '<circle cx="118" cy="' + (y + 8) + '" r="3.2" fill="#e8590c"/>' +
                '<rect x="126" y="' + (y + 3) + '" width="14" height="10" rx="1.5" fill="' + ['#a9cdd6', '#dcebd0', '#f6c98d', '#c9d3da'][k] + '"/>';
        }).join('');
        const tpl = document.createElement('template');
        tpl.innerHTML = '<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
            '<rect width="160" height="100" fill="#e9edf2"/>' +
            '<rect x="14" y="14" width="132" height="16" fill="#e2e8ef"/>' +
            '<rect x="32" y="20" width="20" height="4.5" rx="1.5" fill="#0b7fb0"/><rect x="68" y="20" width="20" height="4.5" rx="1.5" fill="#0b7fb0"/>' +
            '<rect x="108" y="20" width="32" height="4.5" rx="1.5" fill="#0b7fb0"/>' + rows +
            '<path d="M14 14h132v80H14zM28 14v80M62 14v80M104 14v80" fill="none" stroke="#ccd2db" stroke-width=".8"/></svg>';
        return tpl.content.firstChild;
    }

    SM.newStoryDialog = function () {
        let choice = 'blank';
        let titleTouched = false;
        const titleInput = UI.textInput({ value: 'Ma storymap', placeholder: 'Titre de la storymap', blurOnEnter: false });
        titleInput.input.addEventListener('input', () => { titleTouched = true; });

        const mkChoice = (value, art, title, desc) => {
            const btn = h('button', { type: 'button', class: 'choice', role: 'radio', 'aria-checked': String(value === choice) },
                h('div', { class: 'choice-art' }, art),
                h('strong', {}, title),
                h('span', { class: 'choice-desc' }, desc),
                h('span', { class: 'choice-check' }, SM.icon('check', 14)));
            btn.addEventListener('click', () => select(value));
            btn.addEventListener('dblclick', () => { select(value); submit(); });
            btn.dataset.value = value;
            return btn;
        };
        const voyager = M.STYLE_PRESETS[0].colors;
        const blankArt = UI.miniMap(voyager);
        const exampleArt = UI.storyArt(voyager, { theme: 'dark' });
        // Lieux reliés : un chapitre par lieu du fichier
        const dataArt = UI.miniMap(voyager);
        dataArt.insertAdjacentHTML('beforeend', '<g stroke="#fff" stroke-width="1.6"><path d="M26 66 Q 46 26 76 44 T 136 26" fill="none" stroke="#e8590c" stroke-width="3" stroke-linecap="round"/>' +
            '<circle cx="26" cy="66" r="5.5" fill="#e8590c"/><circle cx="76" cy="44" r="5.5" fill="#e8590c"/><circle cx="136" cy="26" r="5.5" fill="#e8590c"/></g>');
        const choices = [
            mkChoice('blank', blankArt, 'Storymap vierge', 'Un premier chapitre prêt à être personnalisé.'),
            mkChoice('sheet', sheetArt(), 'Tableur', 'Une ligne par chapitre : titre, texte, coordonnées, image. À saisir, ou à importer d’un fichier CSV.'),
            mkChoice('example', exampleArt, 'Exemple : tour du monde', 'Cinq capitales, de Washington à Tokyo, reliées par un trajet qui se dessine au fil des chapitres.'),
            mkChoice('data', dataArt, 'À partir de données', 'Un chapitre par lieu d’un fichier GeoJSON, KML ou GPX, avec ses textes et ses images.')
        ];
        const titleField = UI.field('Titre', titleInput);
        const select = value => {
            choice = value;
            choices.forEach(c => c.setAttribute('aria-checked', String(c.dataset.value === value)));
            // À partir de données : le titre se choisit avec le fichier
            titleField.hidden = value === 'data';
            if (!titleTouched && value !== 'data') titleInput.input.value = value === 'example' ? 'Le tour du monde en cinq capitales' : 'Ma storymap';
            const label = modal && modal.footer ? modal.footer.querySelector('.btn-primary .btn-label') : null;
            if (label) label.textContent = value === 'data' ? 'Choisir le fichier…' : 'Créer la storymap';
        };

        const body = h('div', {},
            titleField,
            h('div', { class: 'field' }, h('div', { class: 'field-label' }, 'Point de départ'),
                h('div', { class: 'choice-grid', role: 'radiogroup' }, choices)));

        let modal;
        let busy = false;
        const submit = async () => {
            // Un seul envoi (double-clic, Entrée + clic, chargement de l'exemple…)
            if (busy) return;
            busy = true;
            const createBtn = modal && modal.footer ? modal.footer.querySelector('.btn-primary') : null;
            if (createBtn) createBtn.disabled = true;
            const title = titleInput.get().trim();
            const release = () => { busy = false; if (createBtn) createBtn.disabled = false; };
            try {
                if (choice === 'data') {
                    // Fichier de lieux : fenêtre de création des chapitres (ses images s'y choisissent)
                    const files = await U.pickFiles({ accept: SM.places.ACCEPT });
                    const story = files.length ? await SM.createStoryFromData(files) : null;
                    if (story) modal.close(story); else release();
                    return;
                }
                let config;
                if (choice === 'example') {
                    config = await SM.loadExample();
                    if (title) config = Object.assign({}, config, { title });
                } else {
                    config = M.createConfig({ title: title || 'Ma storymap' });
                }
                const story = await SM.library.create(config);
                // Tableur : l'éditeur s'ouvre sur le tableau des chapitres (sinon sur le rendu)
                SM.prefs.set('editorMode', choice === 'sheet' ? 'sheet' : 'visual');
                modal.close(story);
            } catch (e) {
                UI.toast('Création impossible : ' + e.message, { type: 'error' });
                busy = false;
                if (createBtn) createBtn.disabled = false;
            }
        };
        titleInput.input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });

        modal = UI.modal({
            title: 'Nouvelle storymap', icon: 'sparkles', width: 860, body,
            footer: close => UI.modalActions(close, [
                { label: 'Annuler', value: null },
                { label: 'Créer la storymap', variant: 'primary', icon: 'plus', onClick: () => { submit(); return false; } }
            ])
        });
        setTimeout(() => { titleInput.input.focus(); titleInput.input.select(); }, 40);
        return modal.result;
    };

    /* ---------- Exports depuis le tableau de bord ---------- */

    SM.exportStory = async function (story, kind) {
        const t = UI.toast('Préparation de l’export…', { type: 'loading' });
        try {
            let size;
            if (kind === 'json') size = SM.io.exportJson(story);
            else if (kind === 'html') size = SM.io.exportHtml(story);
            else if (kind === 'zip') size = await SM.io.exportZip(story);
            t.update('Export téléchargé (' + U.formatBytes(size) + ').', 'success');
        } catch (e) {
            t.update('Export impossible : ' + e.message, 'error');
        }
    };

    /* ---------- Tableau de bord ---------- */

    class Dashboard {
        constructor(root, opts) {
            this.root = root;
            this.onOpen = opts.onOpen;
            this.summaries = [];
            this.loaded = false;
            this.query = '';
            this.sort = SM.prefs.get('dashboardSort');
            if (!SORTS[this.sort]) this.sort = 'updated';
            this.disposers = [];
            this.build();
            this.load();
            this.disposers.push(SM.db.onBroadcast(msg => { if (msg.type === 'saved' || msg.type === 'deleted') this.load(); }));
            this.setupDrop();
            const refresh = setInterval(() => this.renderGrid(), 60000);
            this.disposers.push(() => clearInterval(refresh));
            document.title = 'Mes storymaps — StoryMap';
        }

        build() {
            U.clear(this.root);
            this.countEl = h('span', { class: 'count' });
            this.searchInput = h('input', { type: 'search', class: 'input', placeholder: 'Rechercher une storymap…', 'aria-label': 'Rechercher une storymap' });
            this.searchInput.addEventListener('input', U.debounce(() => { this.query = this.searchInput.value.trim(); this.renderGrid(); }, 120));
            const sortSelect = UI.select({
                value: this.sort, label: 'Trier par',
                options: Object.keys(SORTS).map(k => ({ value: k, label: 'Trier : ' + SORTS[k].label.toLowerCase() })),
                onChange: v => { this.sort = v; SM.prefs.set('dashboardSort', v); this.renderGrid(); }
            });
            this.toolbar = h('div', { class: 'dash-toolbar' },
                h('div', { class: 'input-affix' }, SM.icon('search', 15), this.searchInput),
                h('div', { class: 'spacer' }),
                sortSelect.el);
            this.grid = h('div', { class: 'story-grid', role: 'list' });
            this.footer = h('footer', { class: 'dash-footer' });

            this.el = h('div', { class: 'dash' },
                SM.appHeader(),
                h('main', { class: 'dash-main' },
                    h('div', { class: 'dash-head' },
                        h('div', {},
                            h('h1', { class: 'dash-title' }, 'Mes storymaps', this.countEl),
                            h('p', { class: 'dash-sub' }, 'Enregistrées automatiquement dans ce navigateur. Exportez-les en .json (images intégrées) pour les sauvegarder ou les partager.')),
                        h('div', { class: 'dash-actions' },
                            UI.button({ label: 'Importer', icon: 'upload', onClick: () => this.pickImport(), tip: 'Storymap (.json, .html ou .zip exportés par l’éditeur), fichier de lieux (GeoJSON, KML, GPX) ou tableau (.csv)' }),
                            UI.button({ label: 'Nouvelle storymap', icon: 'plus', variant: 'primary', onClick: () => this.create() }))),
                    this.toolbar,
                    this.grid,
                    this.footer));
            this.dropOverlay = h('div', { class: 'drop-overlay' },
                h('div', { class: 'drop-box' }, SM.icon('upload', 30), 'Déposez vos fichiers pour les importer', h('span', {}, '.json, .html, .zip, .csv, GeoJSON, KML, GPX')));
            this.el.appendChild(this.dropOverlay);
            this.root.appendChild(this.el);
        }

        async load() {
            try {
                this.summaries = await SM.db.listSummaries();
                this.dbError = null;
            } catch (e) {
                this.summaries = [];
                this.dbError = e;
            }
            this.loaded = true;
            this.renderGrid();
            this.renderFooter();
        }

        filtered() {
            const q = U.slugify(this.query).replace(/-/g, ' ');
            let list = this.summaries.slice();
            if (q) {
                list = list.filter(s => U.slugify([s.title, s.subtitle, s.byline].join(' ')).replace(/-/g, ' ').includes(q));
            }
            return list.sort(SORTS[this.sort].fn);
        }

        renderGrid() {
            if (!this.loaded) return;
            U.clear(this.grid);
            const total = this.summaries.length;
            this.countEl.textContent = total ? '(' + total + ')' : '';
            this.toolbar.style.display = total > 1 ? '' : 'none';

            if (this.dbError) {
                this.grid.style.display = 'block';
                this.grid.appendChild(h('div', { class: 'callout callout-danger' }, SM.icon('alert-circle', 18),
                    h('div', {}, h('p', {}, h('strong', {}, 'Le stockage local est indisponible. ')),
                        h('p', {}, this.dbError.message + ' Vous pouvez tout de même importer et exporter des fichiers, mais rien ne sera conservé.'))));
                return;
            }
            if (!total) {
                this.grid.style.display = 'block';
                this.grid.appendChild(this.renderEmpty());
                return;
            }
            const list = this.filtered();
            if (!list.length) {
                this.grid.style.display = 'block';
                this.grid.appendChild(h('div', { class: 'no-results' }, 'Aucune storymap ne correspond à « ' + this.query + ' ».'));
                return;
            }
            this.grid.style.display = '';
            for (const s of list) this.grid.appendChild(this.card(s));
            if (!this.query) {
                const add = h('div', { class: 'story-card new-card', role: 'listitem', tabindex: '0' },
                    h('div', { class: 'new-card-icon' }, SM.icon('plus', 22)),
                    h('strong', {}, 'Nouvelle storymap'),
                    h('span', {}, 'Vierge, en tableur, à partir de l’exemple…'));
                add.addEventListener('click', () => this.create());
                add.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.create(); } });
                this.grid.appendChild(add);
            }
        }

        renderEmpty() {
            const art = UI.storyArt(M.STYLE_PRESETS[0].colors, { theme: 'dark' });
            return h('section', { class: 'dash-empty' },
                h('div', {},
                    h('h2', {}, 'Racontez vos histoires sur une carte'),
                    h('p', {}, 'Créez des récits interactifs sur une carte sans écrire une ligne de code : vous éditez directement le rendu final.'),
                    h('ol', { class: 'steps' },
                        h('li', {}, h('span', { class: 'num' }, '1'), h('span', {}, 'Ajoutez des chapitres et écrivez vos textes directement sur la carte.')),
                        h('li', {}, h('span', { class: 'num' }, '2'), h('span', {}, 'Déplacez la carte pour cadrer chaque chapitre : la vue est enregistrée automatiquement.')),
                        h('li', {}, h('span', { class: 'num' }, '3'), h('span', {}, 'Prévisualisez, puis exportez en .json, en page HTML ou en site web.'))),
                    h('div', { class: 'empty-actions' },
                        UI.button({ label: 'Créer une storymap', icon: 'plus', variant: 'primary', size: 'lg', onClick: () => this.create() }),
                        UI.button({ label: 'Importer un fichier', icon: 'upload', size: 'lg', onClick: () => this.pickImport() }))),
                h('div', { class: 'dash-empty-art' }, art));
        }

        thumb(s) {
            const wrap = h('div', { class: 'story-thumb' });
            if (s.thumbnail) {
                wrap.appendChild(h('img', { src: s.thumbnail, alt: '', loading: 'lazy', decoding: 'async' }));
            } else {
                const preset = M.STYLE_PRESETS.find(p => p.id === s.styleId);
                wrap.appendChild(UI.storyArt(preset ? preset.colors : null, { theme: s.theme, satellite: preset && preset.satellite }));
            }
            wrap.appendChild(h('div', { class: 'thumb-badges' },
                h('span', { class: 'badge' }, SM.icon('book', 12), U.plural(s.chapterCount || 0, 'chapitre'))));
            wrap.appendChild(h('div', { class: 'thumb-open' }, h('span', {}, SM.icon('edit', 14), 'Ouvrir dans l’éditeur')));
            return wrap;
        }

        card(s) {
            const menuBtn = UI.button({ icon: 'more', iconOnly: true, variant: 'ghost', size: 'sm', label: 'Actions', className: 'card-menu' });
            menuBtn.setAttribute('aria-haspopup', 'menu');
            menuBtn.addEventListener('click', e => { e.stopPropagation(); this.openMenu(s, menuBtn); });
            const title = (s.title || '').trim();
            const card = h('article', { class: 'story-card', role: 'listitem', tabindex: '0', 'aria-label': title || 'Storymap sans titre' },
                this.thumb(s),
                h('div', { class: 'story-info' },
                    h('div', { class: 'story-title-row' },
                        h('h3', { class: 'story-title' + (title ? '' : ' untitled') }, title || 'Sans titre'),
                        menuBtn),
                    s.subtitle ? h('div', { class: 'story-subtitle' }, s.subtitle) : null,
                    h('div', { class: 'story-meta' },
                        h('span', { 'data-tip': 'Modifiée le ' + U.formatDateTime(s.updatedAt) }, 'Modifiée ' + U.relativeTime(s.updatedAt)),
                        s.size ? h('span', { class: 'dot' }) : null,
                        s.size ? h('span', { 'data-tip': 'Poids de la storymap (images comprises)' }, U.formatBytes(s.size)) : null)));
            card.addEventListener('click', () => this.onOpen(s.id));
            card.addEventListener('keydown', e => {
                if (e.target !== card) return;
                if (e.key === 'Enter') { e.preventDefault(); this.onOpen(s.id); }
                if (e.key === 'Delete') { e.preventDefault(); this.remove(s); }
                if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) { e.preventDefault(); this.openMenu(s, menuBtn); }
            });
            card.addEventListener('contextmenu', e => { e.preventDefault(); this.openMenu(s, { x: e.clientX, y: e.clientY }); });
            return card;
        }

        openMenu(s, anchor) {
            const withStory = fn => async () => {
                let story;
                try { story = await SM.library.get(s.id); } catch (e) { UI.toast('Storymap illisible : ' + e.message, { type: 'error' }); return; }
                if (!story) { UI.toast('Storymap introuvable.', { type: 'error' }); this.load(); return; }
                fn(story);
            };
            UI.menu(anchor, [
                { label: 'Ouvrir dans l’éditeur', icon: 'edit', onClick: () => this.onOpen(s.id) },
                { label: 'Aperçu', icon: 'play', onClick: withStory(story => SM.Preview.open(story.config)) },
                { label: 'Dupliquer', icon: 'copy', onClick: () => this.duplicate(s) },
                '-',
                { heading: 'Exporter' },
                { label: 'Fichier .json', desc: 'Images intégrées en base64', icon: 'file-json', onClick: withStory(story => SM.exportStory(story, 'json')) },
                { label: 'Page HTML autonome', desc: 'Un seul fichier prêt à publier', icon: 'globe', onClick: withStory(story => SM.exportStory(story, 'html')) },
                { label: 'Site web (.zip)', desc: 'index.html et dossier d’images', icon: 'archive', onClick: withStory(story => SM.exportStory(story, 'zip')) },
                '-',
                { label: 'Supprimer…', icon: 'trash', danger: true, onClick: () => this.remove(s) }
            ], { align: 'end', minWidth: 250 });
        }

        async create() {
            const story = await SM.newStoryDialog();
            if (story) this.onOpen(story.id);
        }

        async duplicate(s) {
            try {
                const copy = await SM.library.duplicate(s.id);
                UI.toast('« ' + (copy.config.title || 'Sans titre') + ' » créée.', { type: 'success', action: { label: 'Ouvrir', onClick: () => this.onOpen(copy.id) } });
                this.load();
            } catch (e) { UI.toast(e.message, { type: 'error' }); }
        }

        async remove(s) {
            const name = s.title || 'Sans titre';
            const ok = await UI.confirm({
                title: 'Supprimer « ' + name + ' » ?', danger: true, confirmLabel: 'Supprimer',
                message: 'La storymap et ses images seront supprimées de ce navigateur. Pensez à l’exporter si vous souhaitez en garder une copie.'
            });
            if (!ok) return;
            try {
                const story = await SM.db.getStory(s.id);
                const summary = await SM.db.getSummary(s.id);
                await SM.library.remove(s.id);
                this.load();
                UI.toast('« ' + name + ' » supprimée.', {
                    type: 'success', action: story ? {
                        label: 'Annuler', onClick: async () => {
                            await SM.db.saveStory(story, summary);
                            SM.db.broadcast({ type: 'saved', id: story.id });
                            this.load();
                        }
                    } : null
                });
            } catch (e) { UI.toast('Suppression impossible : ' + e.message, { type: 'error' }); }
        }

        async pickImport() {
            const files = await U.pickFiles({ accept: SM.io.ACCEPT + ',' + SM.places.ACCEPT + ',' + SM.csv.ACCEPT, multiple: true });
            if (files.length) this.handleFiles(files);
        }

        /**
         * Fichiers importés ou déposés : storymaps (.json, .html, .zip) et, pour un
         * fichier de lieux (GeoJSON, KML, GPX) ou un tableau (CSV, archive .zip du
         * tableur), nouvelle storymap avec un chapitre par lieu ou par ligne (les
         * images déposées avec lui sont associées par nom).
         */
        async handleFiles(files) {
            const all = Array.from(files);
            const isImage = f => (f.type || SM.images.mimeForName(f.name) || '').indexOf('image/') === 0;
            let places = null;
            let table = all.find(SM.sheet.isTableFile) || null;
            for (const f of all) {
                if (f === table || isImage(f)) continue;
                if (!places && await SM.places.isGeoJsonFile(f)) places = f;
                else if (!table && await SM.sheet.isTableZip(f)) table = f;
            }
            const stories = all.filter(f => f !== places && f !== table && SM.io.FILE_RE.test(f.name));
            if (!places && !table && !stories.length) {
                UI.toast('Formats acceptés : storymaps (.json, .html, .zip exportés par l’éditeur), fichiers de lieux (GeoJSON, KML, KMZ, GPX) et tableaux (.csv).', { type: 'warning', duration: 8000 });
                return;
            }
            if (stories.length) await this.importFiles(stories);
            const create = async (fn, main) => {
                try {
                    const story = await fn([main].concat(all.filter(isImage)));
                    if (story) this.onOpen(story.id);
                    return !!story;
                } catch (e) {
                    UI.toast('Création impossible : ' + e.message, { type: 'error' });
                    return false;
                }
            };
            if (table && await create(SM.createStoryFromSheet, table)) return;
            if (places) await create(SM.createStoryFromData, places);
        }

        async importFiles(files) {
            const t = UI.toast(files.length > 1 ? 'Import de ' + files.length + ' fichiers…' : 'Import de « ' + files[0].name + ' »…', { type: 'loading' });
            const report = await SM.library.importFiles(files);
            t.dismiss();
            await this.load();
            const ok = report.filter(r => r.ok);
            const clean = ok.length && ok.length === report.length && ok.every(r => !r.warnings.length && !r.unembedded.length);
            if (clean && ok.length === 1) {
                UI.toast('« ' + (ok[0].story.config.title || 'Sans titre') + ' » importée.', { type: 'success', action: { label: 'Ouvrir', onClick: () => this.onOpen(ok[0].story.id) } });
                return;
            }
            UI.showImportReport(report, {
                onOpen: story => this.onOpen(story.id),
                onResolveImages: story => this.resolveImages(story)
            });
        }

        async resolveImages(story) {
            const next = await UI.resolveImages(story.config);
            if (!next) return;
            const updated = Object.assign({}, story, { config: next, updatedAt: Date.now() });
            const thumbnail = await SM.library.thumbnailFor(next);
            await SM.library.save(updated, thumbnail ? { thumbnail, thumbnailSource: 'image' } : undefined);
            UI.toast('Images intégrées et enregistrées.', { type: 'success' });
            this.load();
        }

        async renderFooter() {
            U.clear(this.footer);
            const est = await SM.db.estimate();
            const totalSize = this.summaries.reduce((s, x) => s + (x.size || 0), 0);
            this.footer.appendChild(h('span', { class: 'item' }, SM.icon('database', 14),
                this.summaries.length ? U.plural(this.summaries.length, 'storymap') + ' · ' + U.formatBytes(totalSize) : 'Aucune storymap enregistrée'));
            if (est.persisted !== null) {
                this.footer.appendChild(h('span', { class: 'item', 'data-tip': est.persisted ? 'Le navigateur ne supprimera pas vos données automatiquement.' : 'Le navigateur pourrait effacer les données en cas de manque d’espace. Ouvrez les paramètres pour demander un stockage persistant.' },
                    SM.icon(est.persisted ? 'shield' : 'alert', 14), est.persisted ? 'Stockage persistant' : 'Stockage non persistant'));
            }
            this.footer.appendChild(h('span', { class: 'spacer' }));
            if (this.summaries.length) {
                this.footer.appendChild(h('button', {
                    type: 'button', class: 'link', style: 'background:none;border:0;font:inherit;padding:0', onclick: async () => {
                        const t = UI.toast('Préparation de la sauvegarde…', { type: 'loading' });
                        try {
                            const stories = await SM.library.getAll();
                            const size = await SM.io.exportBackup(stories);
                            t.update('Sauvegarde téléchargée (' + U.formatBytes(size) + ').', 'success');
                        } catch (e) { t.update(e.message, 'error'); }
                    }
                }, 'Tout sauvegarder (.zip)'));
            }
            this.footer.appendChild(h('span', {}, 'StoryMap ' + SM.VERSION));
        }

        setupDrop() {
            let depth = 0;
            const hasFiles = e => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
            const onEnter = e => { if (!hasFiles(e)) return; e.preventDefault(); depth++; this.dropOverlay.classList.add('show'); };
            const onOver = e => { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; };
            const onLeave = e => { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) this.dropOverlay.classList.remove('show'); };
            const onDrop = e => {
                if (!hasFiles(e)) return;
                e.preventDefault();
                depth = 0;
                this.dropOverlay.classList.remove('show');
                this.handleFiles(Array.from(e.dataTransfer.files || []));
            };
            window.addEventListener('dragenter', onEnter);
            window.addEventListener('dragover', onOver);
            window.addEventListener('dragleave', onLeave);
            window.addEventListener('drop', onDrop);
            this.disposers.push(() => {
                window.removeEventListener('dragenter', onEnter);
                window.removeEventListener('dragover', onOver);
                window.removeEventListener('dragleave', onLeave);
                window.removeEventListener('drop', onDrop);
            });
        }

        onKey(e) {
            if (U.isTypingTarget(e.target)) return false;
            if (U.matchShortcut(e, 'Mod+F') || e.key === '/') { e.preventDefault(); this.searchInput.focus(); return true; }
            return false;
        }

        destroy() {
            this.disposers.forEach(fn => fn());
            this.disposers = [];
            U.clear(this.root);
        }
    }

    SM.Dashboard = Dashboard;
})();
