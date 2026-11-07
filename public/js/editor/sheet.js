/* ==========================================================================
   StoryMap — tableur (second mode d'édition des chapitres)
   --------------------------------------------------------------------------
   Les chapitres sous forme de tableau : une ligne par chapitre, une colonne
   par contenu (titre, texte, coordonnées, image ; au choix zoom, légende,
   crédit…). Saisie dans les cellules, navigation et sélection au clavier
   comme dans un tableur, copier-coller avec Excel, LibreOffice ou Google
   Sheets (lignes ajoutées au besoin), import et export CSV. Chaque
   modification passe par le store : annuler / rétablir, enregistrement auto.
   ========================================================================== */
(function () {
    'use strict';

    const SM = window.SM;
    const U = SM.util;
    const h = U.h;
    const UI = SM.ui;
    const M = SM.model;
    const SH = SM.sheet;

    const CLIP_TYPE = 'application/x-storymap-cells'; // copie entre cellules : valeurs exactes (HTML, images intégrées)
    const ROW_TYPE = 'application/x-storymap-row';
    const HEAD_W = 58; // colonne des numéros de ligne

    /**
     * Colonnes : kind = éditeur ; width = largeur par défaut (0 : la place
     * restante, au moins minWidth) ; fixed = toujours affichée.
     */
    const COLUMNS = [
        { key: 'title', label: 'Titre', kind: 'line', width: 220, fixed: true, undo: 'Titre du chapitre' },
        { key: 'text', label: 'Texte', kind: 'rich', width: 0, minWidth: 300, fixed: true, undo: 'Texte du chapitre' },
        {
            key: 'coords', label: 'Coordonnées', kind: 'coords', width: 196, fixed: true, undo: 'Coordonnées du chapitre',
            tip: 'Latitude ; longitude du centre de la carte (marqueur du chapitre). Tapez un nom de lieu pour le rechercher, ou des coordonnées.'
        },
        { key: 'zoom', label: 'Zoom', kind: 'number', width: 86, min: 0, max: 22, undo: 'Zoom' },
        { key: 'image', label: 'Image', kind: 'image', width: 230, fixed: true, undo: 'Image du chapitre' },
        { key: 'imageCaption', label: 'Légende', kind: 'line', width: 200, undo: 'Légende de l’image' },
        { key: 'imageCredit', label: 'Crédit', kind: 'line', width: 200, undo: 'Crédit de l’image' },
        { key: 'imageAlt', label: 'Texte alternatif', kind: 'line', width: 230, undo: 'Texte alternatif', tip: 'Description de l’image pour les personnes malvoyantes (lecteurs d’écran).' },
        { key: 'pitch', label: 'Inclinaison', kind: 'number', width: 104, min: 0, max: M.MAX_PITCH, unit: '°', undo: 'Inclinaison' },
        { key: 'bearing', label: 'Orientation', kind: 'number', width: 108, min: -180, max: 180, unit: '°', undo: 'Orientation' },
        {
            key: 'id', label: 'Identifiant', kind: 'line', width: 170, mono: true, undo: 'Identifiant du chapitre',
            tip: 'Identifiant unique du chapitre : ancre de la page publiée (page.html#identifiant). Il relie aussi les lignes d’un tableau réimporté aux chapitres existants.'
        }
    ];
    const COLUMN = {};
    COLUMNS.forEach(c => { COLUMN[c.key] = c; });

    const isImageFile = f => (f.type || SM.images.mimeForName(f.name) || '').indexOf('image/') === 0;
    const sameCenter = (a, b) => U.round(a[0], 6) === U.round(b[0], 6) && U.round(a[1], 6) === U.round(b[1], 6);

    /* ---------- Valeurs des cellules ---------- */

    /** Valeur d'une cellule dans le modèle. */
    function valueOf(ch, key) {
        switch (key) {
            case 'coords': return ch.view.center;
            case 'zoom': return ch.view.zoom;
            case 'pitch': return ch.view.pitch || 0;
            case 'bearing': return ch.view.bearing || 0;
            default: return ch[key] === undefined || ch[key] === null ? '' : ch[key];
        }
    }

    /** Texte d'une valeur (saisie, presse-papiers). names : noms d'export des images intégrées. */
    function textOfValue(key, v, names) {
        switch (COLUMN[key].kind) {
            case 'rich': return SH.htmlToText(v);
            case 'coords': return Array.isArray(v) ? SH.formatCoords(v) : '';
            case 'number': return SH.formatValue(v);
            case 'image':
                if (!M.isDataUrl(v)) return String(v || '');
                return (names && names.get(v)) || 'image.' + SM.images.extForMime(SM.images.dataUrlMime(v));
            default: return String(v || '');
        }
    }

    const textOf = (ch, key, names) => textOfValue(key, valueOf(ch, key), names);

    /** Libellé d'une image intégrée : format et poids (« JPEG · 245 Ko »). */
    function imageInfo(src) {
        const mime = SM.images.dataUrlMime(src).replace('image/', '').replace('svg+xml', 'svg').toUpperCase();
        return (mime || 'Image') + ' · ' + U.formatBytes(SM.images.dataUrlBytes(src));
    }

    /**
     * Configuration après la saisie de text dans la cellule (i, key) (la même
     * si rien ne change). problems : valeurs refusées ; ctx : images intégrées
     * de la storymap par nom (une image désignée par son nom d'export est reprise).
     */
    function applyText(cfg, i, key, text, problems, ctx) {
        const ch = cfg.chapters[i];
        const col = COLUMN[key];
        const s = String(text === undefined || text === null ? '' : text);
        switch (key) {
            case 'text':
                return SH.sameCell(s, SH.htmlToCell(ch.text)) ? cfg : M.ops.setChapter(cfg, i, { text: SH.cellToHtml(s) });
            case 'coords': {
                if (!s.trim()) return cfg; // un chapitre a toujours une position
                const p = SH.parseCoords(s);
                if (!p) {
                    problems.push('« ' + U.truncate(s.trim(), 40) + ' » : coordonnées non reconnues (latitude ; longitude attendues, ex. 48,8566 ; 2,3522)');
                    return cfg;
                }
                const center = [U.round(p.lng, 6), U.round(p.lat, 6)];
                return sameCenter(center, ch.view.center) ? cfg : M.ops.setChapterGroup(cfg, i, 'view', { center });
            }
            case 'zoom':
            case 'pitch':
            case 'bearing': {
                if (!s.trim()) return key === 'zoom' || !valueOf(ch, key) ? cfg : M.ops.setChapterGroup(cfg, i, 'view', { [key]: 0 });
                const n = SH.parseNumber(s);
                if (!isFinite(n)) {
                    problems.push(col.label + ' : « ' + U.truncate(s.trim(), 20) + ' » n’est pas un nombre');
                    return cfg;
                }
                const v = U.round(key === 'bearing' ? ((n + 180) % 360 + 360) % 360 - 180 : U.clamp(n, col.min, col.max), 2);
                return v === valueOf(ch, key) ? cfg : M.ops.setChapterGroup(cfg, i, 'view', { [key]: v });
            }
            case 'image': {
                const v = SM.places.imageRef(s);
                if (!v) return ch.image ? M.ops.setChapter(cfg, i, { image: '' }) : cfg;
                const local = !M.isRemoteUrl(v) && !M.isDataUrl(v);
                // Nom d'export de l'image intégrée du chapitre : inchangée
                if (local && ctx && M.isDataUrl(ch.image) && SH.imageKey(ctx.names.get(ch.image) || '') === SH.imageKey(v)) return cfg;
                const next = (local && ctx && ctx.byKey[SH.imageKey(v)]) || v;
                return next === ch.image ? cfg : M.ops.setChapter(cfg, i, { image: next });
            }
            case 'id': {
                const id = SH.cleanId(s);
                if (!id || id === ch.id) return cfg;
                if (cfg.chapters.some((c, k) => k !== i && c.id === id)) {
                    problems.push('L’identifiant « ' + id + ' » est déjà utilisé par un autre chapitre');
                    return cfg;
                }
                return M.ops.renameChapter(cfg, i, id);
            }
            default: {
                const v = s.replace(/\s+/g, ' ').trim();
                return v === (ch[key] || '') ? cfg : M.ops.setChapter(cfg, i, { [key]: v });
            }
        }
    }

    /** Configuration après l'affectation d'une valeur exacte (copie entre cellules de même colonne). */
    function applyValue(cfg, i, key, value, problems) {
        const ch = cfg.chapters[i];
        switch (key) {
            case 'coords':
                return Array.isArray(value) && value.length === 2 && U.isNum(value[0]) && U.isNum(value[1]) && !sameCenter(value, ch.view.center)
                    ? M.ops.setChapterGroup(cfg, i, 'view', { center: value.slice() }) : cfg;
            case 'zoom':
            case 'pitch':
            case 'bearing':
                return U.isNum(value) && value !== valueOf(ch, key) ? M.ops.setChapterGroup(cfg, i, 'view', { [key]: value }) : cfg;
            case 'id':
                return applyText(cfg, i, key, value, problems, null);
            case 'text': {
                const html = SM.sanitize.safe(String(value || ''));
                return html === ch.text ? cfg : M.ops.setChapter(cfg, i, { text: html });
            }
            case 'title':
            case 'image':
                return String(value || '') === (ch[key] || '') ? cfg : M.ops.setChapter(cfg, i, { [key]: String(value || '') });
            default: {
                const v = String(value || '').replace(/\s+/g, ' ').trim();
                return v === (ch[key] || '') ? cfg : M.ops.setChapter(cfg, i, { [key]: v });
            }
        }
    }

    /** Configuration après l'effacement de la cellule (i, key) : position, zoom et identifiant sont conservés. */
    function clearCell(cfg, i, key) {
        const ch = cfg.chapters[i];
        if (key === 'coords' || key === 'zoom' || key === 'id') return cfg;
        if (key === 'pitch' || key === 'bearing') return valueOf(ch, key) ? M.ops.setChapterGroup(cfg, i, 'view', { [key]: 0 }) : cfg;
        return ch[key] ? M.ops.setChapter(cfg, i, { [key]: '' }) : cfg;
    }

    /* ---------- Vue ---------- */

    class Sheet {
        constructor(editor) {
            this.editor = editor;
            this.store = editor.store;
            this.uid = U.uid('sh');
            this.rows = new Map();   // identifiant du chapitre → ligne { tr, num, cells, ch, pos }
            this.active = null;      // cellule active { id, key }
            this.anchor = null;      // coin opposé de la sélection
            this.activePos = 0;
            this.painted = [];
            this.edit = null;        // saisie en cours
            this.shown = false;
            this.stale = true;
            this.visible = new Set(SM.prefs.get('sheetColumns') || []);
            this.widths = Object.assign({}, SM.prefs.get('sheetWidths') || {});
            this.disposers = [];
            this.build();
            this.disposers.push(this.store.subscribe(evt => this.onStore(evt)));
            // Presse-papiers (phase de capture : avant le collage d'image de l'éditeur)
            const onCopy = e => this.onCopy(e, false);
            const onCut = e => this.onCopy(e, true);
            const onPaste = e => this.onPaste(e);
            document.addEventListener('copy', onCopy, true);
            document.addEventListener('cut', onCut, true);
            document.addEventListener('paste', onPaste, true);
            this.disposers.push(() => {
                document.removeEventListener('copy', onCopy, true);
                document.removeEventListener('cut', onCut, true);
                document.removeEventListener('paste', onPaste, true);
            });
        }

        destroy() {
            if (this.edit) this.finishEdit(false);
            this.disposers.forEach(fn => fn());
        }

        /* ---------- Construction ---------- */

        build() {
            this.countEl = h('span', { class: 'badge' });
            this.colsBtn = UI.button({
                label: 'Colonnes', icon: 'columns', size: 'sm', variant: 'ghost', trailingIcon: 'chevron-down',
                tip: 'Afficher d’autres colonnes : zoom, légende, crédit, identifiant…', onClick: () => this.columnsMenu()
            });
            this.toolbar = h('div', { class: 'sheet-toolbar' },
                h('h2', { class: 'sheet-title' }, SM.icon('table', 16), 'Chapitres', this.countEl),
                UI.button({ label: 'Nouvelle ligne', icon: 'plus', size: 'sm', variant: 'soft', shortcut: 'Mod+Shift+Enter', tip: 'Ajouter un chapitre après la ligne sélectionnée', onClick: () => this.addRow() }),
                this.colsBtn,
                h('span', { class: 'spacer' }),
                UI.button({ label: 'Importer un CSV…', icon: 'upload', size: 'sm', tip: 'Fichier CSV (Excel, LibreOffice, Google Sheets) : une ligne par chapitre', onClick: () => this.editor.importSheet() }),
                UI.button({ label: 'Exporter en CSV…', icon: 'download', size: 'sm', tip: 'Le tableau des chapitres, pour Excel, LibreOffice ou Google Sheets', onClick: () => { this.commitEdit(); UI.sheetExport(this.store.config); } }));

            // Storymap vierge : mode d'emploi
            this.intro = h('div', { class: 'sheet-intro callout callout-info', hidden: true }, SM.icon('table', 16),
                h('div', {},
                    h('p', {}, h('strong', {}, 'Une ligne par chapitre.'),
                        ' Écrivez directement dans les cellules ; dans « Coordonnées », tapez un nom de lieu pour le trouver, ou « 48,8566 ; 2,3522 ». ' +
                        'Vous pouvez aussi coller des cellules copiées depuis un tableur, ou importer un fichier CSV (Excel, LibreOffice, Google Sheets).'),
                    h('div', { class: 'sheet-intro-actions' },
                        UI.button({ label: 'Importer un fichier CSV…', icon: 'upload', size: 'xs', onClick: () => this.editor.importSheet() }),
                        UI.button({ label: 'Télécharger un modèle', icon: 'download', size: 'xs', variant: 'ghost', tip: 'Fichier CSV avec les colonnes attendues et deux lignes d’exemple, à remplir dans votre tableur', onClick: () => UI.sheetTemplate() }))));

            this.colgroup = h('colgroup');
            this.thead = h('thead');
            this.tbody = h('tbody');
            this.table = h('table', {
                class: 'sheet-table', role: 'grid', tabindex: '0', 'aria-multiselectable': 'true',
                'aria-label': 'Chapitres de la storymap, une ligne par chapitre'
            }, this.colgroup, this.thead, this.tbody);
            this.addRowBtn = h('button', { type: 'button', class: 'sheet-addrow' }, SM.icon('plus', 15), 'Nouvelle ligne');
            this.addRowBtn.addEventListener('click', () => this.addRow(this.store.config.chapters.length - 1));
            this.dropLine = h('div', { class: 'sheet-drop-line', hidden: true });
            this.scroller = h('div', { class: 'sheet-scroll scroll' }, this.table, this.addRowBtn, this.dropLine);

            this.statusSel = h('span', { class: 'sheet-status-sel' });
            const k = t => h('kbd', {}, t);
            this.status = h('div', { class: 'sheet-status' }, this.statusSel,
                h('span', { class: 'sheet-status-hint' },
                    k('Entrée'), ' modifier', h('span', { class: 'sep' }), k('Échap'), ' annuler', h('span', { class: 'sep' }),
                    k('Suppr'), ' effacer', h('span', { class: 'sep' }), k(U.modKey + '+C'), ' ', k(U.modKey + '+V'), ' copier, coller (Excel, Google Sheets…)'));

            this.el = h('section', { class: 'sheet', 'aria-label': 'Tableur' }, this.toolbar, this.intro, this.scroller, this.status);

            this.table.addEventListener('pointerdown', e => this.onPointerDown(e));
            this.table.addEventListener('dblclick', e => this.onDblClick(e));
            this.table.addEventListener('contextmenu', e => this.onContextMenu(e));
            this.table.addEventListener('keydown', e => this.onKey(e));
            this.scroller.addEventListener('scroll', () => { if (this.edit && this.edit.rich) this.editor.rich.position(); }, { passive: true });
            this.tbody.addEventListener('click', e => {
                const b = e.target.closest && e.target.closest('.sheet-rowmenu');
                if (b) { e.stopPropagation(); this.rowMenu(this.posOf(b), b); }
            });
            this.tbody.addEventListener('dragstart', e => this.onDragStart(e));
            this.tbody.addEventListener('dragend', () => this.endRowDrag());
            this.scroller.addEventListener('dragover', e => this.onDragOver(e));
            this.scroller.addEventListener('dragleave', e => { if (!this.scroller.contains(e.relatedTarget)) this.clearDropHints(); });
            this.scroller.addEventListener('drop', e => this.onDrop(e));
        }

        /* ---------- Colonnes ---------- */

        computeColumns() {
            this.cols = COLUMNS.filter(c => c.fixed || this.visible.has(c.key));
            this.colPos = new Map(this.cols.map((c, k) => [c.key, k]));
        }

        colIdx(key) {
            const k = this.colPos.get(key);
            return k === undefined ? -1 : k;
        }

        renderHead() {
            U.clear(this.colgroup);
            U.clear(this.thead);
            this.colgroup.appendChild(h('col', { style: 'width:' + HEAD_W + 'px' }));
            this.colEls = this.cols.map(() => this.colgroup.appendChild(h('col')));
            const corner = h('th', { class: 'sheet-corner', scope: 'col', 'data-tip': 'Tout sélectionner' }, h('span', { class: 'visually-hidden' }, 'Numéro'));
            const heads = this.cols.map(c => h('th', { class: 'sheet-th', scope: 'col', role: 'columnheader', 'data-col': c.key },
                h('span', { class: 'sheet-th-label' }, c.label),
                c.tip ? h('span', { class: 'hint-icon', 'data-tip': c.tip }, SM.icon('help', 13)) : null,
                h('span', { class: 'sheet-resize', 'aria-hidden': 'true' })));
            this.thead.appendChild(h('tr', { role: 'row' }, corner, heads));
            this.table.setAttribute('aria-colcount', String(this.cols.length + 1));
            this.applyWidths();
        }

        applyWidths() {
            let total = HEAD_W;
            let elastic = false;
            this.cols.forEach((c, k) => {
                const w = this.widths[c.key] || c.width;
                this.colEls[k].style.width = w ? w + 'px' : '';
                if (w) total += w;
                else { total += c.minWidth || 200; elastic = true; }
            });
            this.table.style.width = elastic ? 'max(100%, ' + total + 'px)' : total + 'px';
            if (this.edit) this.placeEditor();
        }

        startResize(e, th) {
            e.preventDefault();
            e.stopPropagation();
            const key = th.dataset.col;
            const startX = e.clientX;
            const startW = th.getBoundingClientRect().width;
            const move = ev => {
                this.widths[key] = Math.max(64, Math.round(startW + ev.clientX - startX));
                this.applyWidths();
            };
            const up = () => {
                window.removeEventListener('pointermove', move);
                window.removeEventListener('pointerup', up);
                this.el.classList.remove('is-resizing');
                SM.prefs.set('sheetWidths', Object.assign({}, this.widths));
            };
            this.el.classList.add('is-resizing');
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', up);
        }

        resetWidth(key) {
            delete this.widths[key];
            SM.prefs.set('sheetWidths', Object.assign({}, this.widths));
            this.applyWidths();
        }

        columnsMenu() {
            const items = [{ heading: 'Colonnes affichées' }];
            for (const c of COLUMNS) {
                items.push({
                    label: c.label, checked: c.fixed || this.visible.has(c.key), disabled: c.fixed,
                    desc: c.fixed ? 'Toujours affichée' : null, onClick: () => this.toggleColumn(c.key)
                });
            }
            items.push('-', {
                label: 'Largeurs par défaut', icon: 'refresh', disabled: !Object.keys(this.widths).length,
                onClick: () => { this.widths = {}; SM.prefs.set('sheetWidths', {}); this.applyWidths(); }
            });
            UI.menu(this.colsBtn, items, { minWidth: 240, reserveIcon: true, onClose: () => this.focusGrid() });
        }

        toggleColumn(key) {
            this.commitEdit();
            if (this.visible.has(key)) this.visible.delete(key); else this.visible.add(key);
            SM.prefs.set('sheetColumns', Array.from(this.visible));
            this.renderAll();
            // La colonne affichée devient la cellule active (sur la même ligne)
            if (this.visible.has(key) && this.active) this.select(this.activePos, this.colIdx(key));
        }

        /* ---------- Rendu ---------- */

        renderAll() {
            this.computeColumns();
            this.renderHead();
            this.rows.forEach(row => row.tr.remove());
            this.rows.clear();
            this.patchRows();
            this.fixActive();
            this.paintSelection();
            this.updateStatus();
        }

        createRow(ch) {
            const num = h('span', { class: 'sheet-num' });
            const head = h('th', { class: 'sheet-rowhead', scope: 'row', role: 'rowheader', draggable: 'true' },
                h('span', { class: 'sheet-grip', 'aria-hidden': 'true' }, SM.icon('grip', 13)),
                num,
                h('button', { type: 'button', class: 'sheet-rowmenu', tabindex: '-1', 'aria-label': 'Actions de la ligne', 'data-tip': 'Actions de la ligne' }, SM.icon('more', 15)));
            const tr = h('tr', { class: 'sheet-row', role: 'row', 'data-id': ch.id }, head);
            const cells = {};
            for (const c of this.cols) {
                const td = h('td', {
                    id: this.uid + '-' + ch.id + '-' + c.key, role: 'gridcell', 'data-col': c.key,
                    class: 'sheet-cell is-' + c.kind + (c.mono ? ' mono' : '')
                });
                cells[c.key] = td;
                tr.appendChild(td);
            }
            return { tr, num, cells, ch: null, pos: -1 };
        }

        updateRow(row, ch, i) {
            if (row.pos !== i) {
                row.pos = i;
                row.num.textContent = String(i + 1);
                row.tr.setAttribute('aria-rowindex', String(i + 2));
            }
            if (row.ch === ch) return;
            row.ch = ch;
            row.tr.classList.toggle('is-hidden', !!ch.hidden);
            row.tr.title = ch.hidden ? 'Panneau masqué dans la storymap' : '';
            for (const c of this.cols) this.renderCell(row.cells[c.key], c, ch);
        }

        renderCell(td, col, ch) {
            const v = valueOf(ch, col.key);
            const sig = col.kind === 'coords' ? v[0] + ',' + v[1] : v;
            if (td.__rendered && td.__sig === sig) return;
            td.__rendered = true;
            td.__sig = sig;
            U.clear(td);
            switch (col.kind) {
                case 'rich': {
                    const text = SH.htmlToText(v).replace(/\n{2,}/g, '\n');
                    if (text) td.appendChild(h('div', { class: 'sheet-clamp' }, text));
                    else if (M.hasContent(v)) td.appendChild(h('span', { class: 'sheet-muted' }, SM.icon('image', 13), 'Image ou vidéo'));
                    break;
                }
                case 'coords':
                    td.appendChild(h('span', { class: 'sheet-line sheet-coords' }, SH.formatCoords(v)));
                    break;
                case 'number':
                    td.textContent = SH.formatValue(v) + (col.unit || '');
                    break;
                case 'image':
                    if (v) this.renderImage(td, v);
                    break;
                default:
                    if (v) td.appendChild(h('span', { class: 'sheet-line' }, v));
            }
        }

        renderImage(td, src) {
            const embedded = M.isDataUrl(src);
            const remote = M.isRemoteUrl(src);
            const thumb = h('span', { class: 'sheet-thumb' });
            if (embedded || remote) {
                const img = h('img', { src, alt: '', loading: 'lazy', decoding: 'async', draggable: 'false', referrerpolicy: 'no-referrer' });
                img.addEventListener('error', () => {
                    U.clear(thumb);
                    thumb.classList.add('is-broken');
                    thumb.setAttribute('data-tip', 'Image introuvable');
                    thumb.appendChild(SM.icon('alert', 14));
                });
                thumb.appendChild(img);
            } else {
                thumb.classList.add('is-missing');
                thumb.appendChild(SM.icon('image', 15));
            }
            const badge = embedded ? null : h('span', {
                class: 'badge ' + (remote ? 'badge-accent' : 'badge-warning'), 'data-action': 'resolve',
                'data-tip': remote ? 'Image en ligne, non intégrée : cliquez pour l’intégrer (si le site l’autorise)' : 'Image désignée par un nom de fichier : cliquez pour fournir le fichier'
            }, remote ? 'En ligne' : 'À intégrer');
            td.appendChild(h('div', { class: 'sheet-image-cell' }, thumb,
                h('span', { class: 'sheet-image-text' }, h('span', { class: 'sheet-line' }, embedded ? imageInfo(src) : U.basename(src) || src), badge)));
        }

        /** Lignes du tableau : créées, mises à jour, déplacées ou retirées selon les chapitres. */
        patchRows() {
            const chapters = this.store.config.chapters;
            const alive = new Set();
            let prevTr = null;
            chapters.forEach((ch, i) => {
                alive.add(ch.id);
                let row = this.rows.get(ch.id);
                if (!row) {
                    row = this.createRow(ch);
                    this.rows.set(ch.id, row);
                }
                this.updateRow(row, ch, i);
                const expected = prevTr ? prevTr.nextSibling : this.tbody.firstChild;
                if (row.tr !== expected) this.tbody.insertBefore(row.tr, expected);
                prevTr = row.tr;
            });
            for (const [id, row] of this.rows) {
                if (!alive.has(id)) { row.tr.remove(); this.rows.delete(id); }
            }
            this.countEl.textContent = String(chapters.length);
            this.table.setAttribute('aria-rowcount', String(chapters.length + 1));
            this.intro.hidden = !M.isBlank(this.store.config);
        }

        /* ---------- Affichage du mode ---------- */

        show() {
            this.shown = true;
            if (this.stale || !this.cols) {
                this.stale = false;
                this.renderAll();
            }
            // Ligne du chapitre sélectionné dans l'éditeur
            const i = this.store.chapterIndex();
            const chapters = this.store.config.chapters;
            if (i >= 0 && (!this.active || this.active.id !== chapters[i].id)) {
                this.active = { id: chapters[i].id, key: this.active ? this.active.key : this.cols[0].key };
                this.anchor = this.active;
            }
            this.fixActive();
            this.paintSelection();
            this.updateStatus();
            this.scrollToActive();
            this.focusGrid();
        }

        hide() {
            if (this.edit) this.finishEdit(true);
            this.shown = false;
        }

        focusGrid() {
            if (this.shown && !this.edit) this.table.focus({ preventScroll: true });
        }

        /* ---------- Store ---------- */

        onStore(evt) {
            if (!this.shown) { this.stale = true; return; }
            if (evt.type === 'change') {
                const pos = this.activePos;
                this.patchRows();
                this.fixActive();
                this.paintSelection();
                this.updateStatus();
                // Ligne active déplacée (monter / descendre, annulation…) : elle reste visible
                if (this.activePos !== pos && !this.edit) this.scrollToActive();
                if (this.edit) {
                    if (!this.rows.has(this.edit.id)) this.finishEdit(false); // chapitre supprimé
                    else this.placeEditor();
                }
            } else if (evt.type === 'selection') {
                const sel = evt.selection;
                if (sel.type !== 'chapter' || !this.active || sel.id === this.active.id || !this.rows.has(sel.id)) return;
                if (this.edit) {
                    const session = this.edit;
                    setTimeout(() => { if (this.edit === session) this.finishEdit(true); }, 0);
                }
                this.active = { id: sel.id, key: this.active.key };
                this.anchor = this.active;
                this.activePos = this.rows.get(sel.id).pos;
                this.paintSelection();
                this.scrollToActive();
                this.updateStatus();
            }
        }

        /* ---------- Sélection ---------- */

        posOf(el) {
            const tr = el && el.closest ? el.closest('tr.sheet-row') : null;
            const row = tr ? this.rows.get(tr.dataset.id) : null;
            return row ? row.pos : -1;
        }

        rowPos(id) {
            const row = id ? this.rows.get(id) : null;
            return row ? row.pos : -1;
        }

        cellEl(id, key) {
            const row = this.rows.get(id);
            return row ? row.cells[key] || null : null;
        }

        /** Cellule active (indices), ou null. */
        activeRC() {
            if (!this.active) return null;
            const r = this.rowPos(this.active.id);
            const c = this.colIdx(this.active.key);
            return r < 0 || c < 0 ? null : { r, c };
        }

        range() {
            const a = this.activeRC();
            if (!a) return null;
            let r2 = this.rowPos(this.anchor && this.anchor.id);
            let c2 = this.colIdx(this.anchor ? this.anchor.key : '');
            if (r2 < 0 || c2 < 0) { r2 = a.r; c2 = a.c; }
            return { r0: Math.min(a.r, r2), r1: Math.max(a.r, r2), c0: Math.min(a.c, c2), c1: Math.max(a.c, c2) };
        }

        /** La cellule active et l'ancre désignent des cellules existantes (après une modification des chapitres). */
        fixActive() {
            const chapters = this.store.config.chapters;
            if (!chapters.length || !this.cols) return;
            if (!this.active || this.rowPos(this.active.id) < 0) {
                const sel = this.store.selection;
                const id = sel.type === 'chapter' && this.rows.has(sel.id) ? sel.id : chapters[U.clamp(this.activePos, 0, chapters.length - 1)].id;
                this.active = { id, key: this.active ? this.active.key : this.cols[0].key };
                this.anchor = this.active;
            }
            if (this.colIdx(this.active.key) < 0) this.active = { id: this.active.id, key: this.cols[0].key };
            if (!this.anchor || this.rowPos(this.anchor.id) < 0 || this.colIdx(this.anchor.key) < 0) this.anchor = this.active;
            this.activePos = this.rowPos(this.active.id);
        }

        /**
         * Rend active la cellule (r, c). extend : la sélection s'étend depuis
         * l'ancre. opts = { scroll (true), sync (true) : chapitre sélectionné dans l'éditeur }
         */
        select(r, c, extend, opts) {
            opts = opts || {};
            const chapters = this.store.config.chapters;
            r = U.clamp(r, 0, chapters.length - 1);
            c = U.clamp(c, 0, this.cols.length - 1);
            const cell = { id: chapters[r].id, key: this.cols[c].key };
            this.anchor = extend ? (this.anchor || this.active || cell) : cell;
            this.active = cell;
            this.activePos = r;
            this.paintSelection();
            if (opts.scroll !== false) this.scrollToCell(r, c);
            this.updateStatus();
            if (opts.sync !== false) this.syncSelection();
        }

        /** Sélectionne un rectangle : (r0, c0) cellule active, (r1, c1) coin opposé. */
        selectRange(r0, c0, r1, c1) {
            const chapters = this.store.config.chapters;
            this.select(r0, c0, false, { scroll: false });
            this.anchor = { id: chapters[U.clamp(r1, 0, chapters.length - 1)].id, key: this.cols[U.clamp(c1, 0, this.cols.length - 1)].key };
            this.paintSelection();
            this.updateStatus();
        }

        selectAll() {
            this.selectRange(0, 0, this.store.config.chapters.length - 1, this.cols.length - 1);
        }

        /** Le chapitre de la cellule active devient le chapitre sélectionné de l'éditeur. */
        syncSelection() {
            if (!this.active) return;
            const sel = this.store.selection;
            if (sel.type !== 'chapter' || sel.id !== this.active.id) this.store.select({ type: 'chapter', id: this.active.id });
        }

        paintSelection() {
            for (const el of this.painted) {
                el.classList.remove('is-selected', 'is-active', 'is-inrange');
                if (el.tagName === 'TD') el.removeAttribute('aria-selected');
            }
            this.painted = [];
            const rg = this.range();
            if (!rg) { this.table.removeAttribute('aria-activedescendant'); return; }
            const chapters = this.store.config.chapters;
            const multi = rg.r0 !== rg.r1 || rg.c0 !== rg.c1;
            const ths = this.thead.querySelectorAll('th.sheet-th');
            for (let c = rg.c0; c <= rg.c1; c++) {
                if (ths[c]) { ths[c].classList.add('is-inrange'); this.painted.push(ths[c]); }
            }
            for (let r = rg.r0; r <= rg.r1; r++) {
                const row = this.rows.get(chapters[r].id);
                if (!row) continue;
                const head = row.tr.firstChild;
                head.classList.add('is-inrange');
                this.painted.push(head);
                for (let c = rg.c0; c <= rg.c1; c++) {
                    const td = row.cells[this.cols[c].key];
                    td.setAttribute('aria-selected', 'true');
                    if (multi) td.classList.add('is-selected');
                    this.painted.push(td);
                }
            }
            const act = this.cellEl(this.active.id, this.active.key);
            if (act) {
                act.classList.add('is-active');
                this.table.setAttribute('aria-activedescendant', act.id);
            }
        }

        scrollToActive() {
            const a = this.activeRC();
            if (a) this.scrollToCell(a.r, a.c);
        }

        /** Fait défiler le tableau pour montrer la cellule (sous l'en-tête et à droite des numéros, fixes). */
        scrollToCell(r, c) {
            const ch = this.store.config.chapters[r];
            const td = ch && this.cols[c] ? this.cellEl(ch.id, this.cols[c].key) : null;
            if (!td) return;
            const s = this.scroller;
            const sr = s.getBoundingClientRect();
            const cr = td.getBoundingClientRect();
            const top = sr.top + this.thead.offsetHeight;
            const bottom = sr.top + s.clientHeight;
            const left = sr.left + HEAD_W;
            const right = sr.left + s.clientWidth;
            if (cr.top < top) s.scrollTop -= top - cr.top;
            else if (cr.bottom > bottom) s.scrollTop += cr.bottom - bottom;
            if (cr.width > right - left || cr.left < left) s.scrollLeft -= left - cr.left;
            else if (cr.right > right) s.scrollLeft += cr.right - right;
        }

        updateStatus() {
            const rg = this.range();
            if (!rg) { this.statusSel.textContent = ''; return; }
            const rows = rg.r1 - rg.r0 + 1;
            const cols = rg.c1 - rg.c0 + 1;
            if (rows === 1 && cols === 1) {
                this.statusSel.textContent = 'Ligne ' + (rg.r0 + 1) + ' · ' + this.cols[rg.c0].label;
            } else {
                this.statusSel.textContent = U.plural(rows, 'ligne') + ' × ' + U.plural(cols, 'colonne') + ' sélectionnées';
            }
        }

        /* ---------- Souris ---------- */

        onPointerDown(e) {
            const t = e.target;
            if (e.pointerType === 'mouse' && e.button !== 0) return; // clic droit : menu contextuel
            const resize = t.closest('.sheet-resize');
            if (resize) { this.startResize(e, resize.closest('th')); return; }
            if (t.closest('.sheet-rowmenu')) return;
            const td = t.closest('td.sheet-cell');
            const rowHead = t.closest('th.sheet-rowhead');
            const colHead = t.closest('th.sheet-th');
            const corner = t.closest('th.sheet-corner');
            if (!td && !rowHead && !colHead && !corner) return;
            if (this.edit) this.finishEdit(true);
            if (!rowHead) e.preventDefault(); // pas de sélection de texte ; le glisser d'une ligne reste possible
            this.table.focus({ preventScroll: true });
            const last = { r: this.store.config.chapters.length - 1, c: this.cols.length - 1 };
            if (td) {
                const r = this.posOf(td);
                const c = this.colIdx(td.dataset.col);
                const a = this.activeRC();
                const wasActive = a && a.r === r && a.c === c && !e.shiftKey;
                this.select(r, c, e.shiftKey);
                if (t.closest('[data-action="resolve"]')) { this.editor.resolveImages(); return; }
                if (e.pointerType === 'touch' || e.pointerType === 'pen') {
                    if (wasActive) this.startEdit(); // deuxième appui : saisie
                    return;
                }
                this.dragSelect();
            } else if (rowHead) {
                const r = this.posOf(rowHead);
                const a = this.activeRC();
                if (e.shiftKey && a) this.selectRange(a.r, 0, r, last.c);
                else this.selectRange(r, 0, r, last.c);
            } else if (colHead) {
                const c = this.colIdx(colHead.dataset.col);
                const a = this.activeRC();
                if (e.shiftKey && a) this.selectRange(0, a.c, last.r, c);
                else this.selectRange(0, c, last.r, c);
            } else {
                this.selectAll();
            }
        }

        /** Glisser sur les cellules : la sélection s'étend jusqu'à la cellule survolée. */
        dragSelect() {
            let moved = false;
            const move = ev => {
                const el = document.elementFromPoint(ev.clientX, ev.clientY);
                const td = el && el.closest ? el.closest('td.sheet-cell') : null;
                if (!td || !this.tbody.contains(td)) return;
                const r = this.posOf(td);
                const c = this.colIdx(td.dataset.col);
                const a = this.activeRC();
                if (a && a.r === r && a.c === c) return;
                moved = true;
                this.select(r, c, true, { sync: false });
            };
            const up = () => {
                window.removeEventListener('pointermove', move);
                window.removeEventListener('pointerup', up);
                window.removeEventListener('pointercancel', up);
                if (moved) this.syncSelection();
            };
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', up);
            window.addEventListener('pointercancel', up);
        }

        onDblClick(e) {
            const resize = e.target.closest('.sheet-resize');
            if (resize) { this.resetWidth(resize.closest('th').dataset.col); return; }
            const td = e.target.closest('td.sheet-cell');
            if (!td || e.target.closest('[data-action]')) return;
            this.select(this.posOf(td), this.colIdx(td.dataset.col));
            this.startEdit();
        }

        onContextMenu(e) {
            const td = e.target.closest('td.sheet-cell');
            const head = e.target.closest('th.sheet-rowhead');
            if (!td && !head) return;
            e.preventDefault();
            if (this.edit) this.finishEdit(true);
            const r = this.posOf(td || head);
            const rg = this.range();
            const c = td ? this.colIdx(td.dataset.col) : 0;
            // Clic droit hors de la sélection : la cellule devient la sélection
            if (!rg || r < rg.r0 || r > rg.r1 || (td && (c < rg.c0 || c > rg.c1))) {
                if (td) this.select(r, c); else this.selectRange(r, 0, r, this.cols.length - 1);
            }
            this.table.focus({ preventScroll: true });
            this.rowMenu(r, { x: e.clientX, y: e.clientY }, true);
        }

        /* ---------- Clavier ---------- */

        onKey(e) {
            if (this.edit || e.target !== this.table || e.defaultPrevented) return;
            const a = this.activeRC();
            if (!a) return;
            const mod = U.isMac ? e.metaKey : e.ctrlKey;
            const key = e.key;
            const lastR = this.store.config.chapters.length - 1;
            const lastC = this.cols.length - 1;
            if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
                // Ctrl+Maj+↑ / ↓ : monter / descendre le chapitre (raccourci de l'éditeur)
                if (e.altKey || (mod && e.shiftKey && (key === 'ArrowUp' || key === 'ArrowDown'))) return;
                e.preventDefault();
                let r = a.r;
                let c = a.c;
                const dr = key === 'ArrowUp' ? -1 : key === 'ArrowDown' ? 1 : 0;
                const dc = key === 'ArrowLeft' ? -1 : key === 'ArrowRight' ? 1 : 0;
                if (mod) {
                    if (dr) r = dr < 0 ? 0 : lastR;
                    if (dc) c = dc < 0 ? 0 : lastC;
                } else {
                    r += dr;
                    c += dc;
                }
                this.select(r, c, e.shiftKey);
                return;
            }
            if (key === 'Tab') {
                if (mod || e.altKey) return;
                let r = a.r;
                let c = a.c + (e.shiftKey ? -1 : 1);
                if (c > lastC) { c = 0; r++; } else if (c < 0) { c = lastC; r--; }
                if (r < 0 || r > lastR) return; // première / dernière cellule : le focus quitte le tableau
                e.preventDefault();
                this.select(r, c);
                return;
            }
            if (key === 'Home' || key === 'End') {
                e.preventDefault();
                const end = key === 'End';
                this.select(mod ? (end ? lastR : 0) : a.r, end ? lastC : 0, e.shiftKey);
                return;
            }
            if (key === 'PageUp' || key === 'PageDown') {
                e.preventDefault();
                const rowH = (this.tbody.firstChild && this.tbody.firstChild.offsetHeight) || 52;
                const page = Math.max(1, Math.floor((this.scroller.clientHeight - this.thead.offsetHeight) / rowH) - 1);
                this.select(a.r + (key === 'PageUp' ? -page : page), a.c, e.shiftKey);
                return;
            }
            if (key === 'Enter' || key === 'F2') {
                if (mod || e.altKey) return; // Ctrl+Entrée : aperçu ; Ctrl+Maj+Entrée : nouveau chapitre
                e.preventDefault();
                this.startEdit();
                return;
            }
            if (key === 'Escape') {
                const rg = this.range();
                if (rg.r0 !== rg.r1 || rg.c0 !== rg.c1) {
                    e.preventDefault();
                    this.anchor = this.active;
                    this.paintSelection();
                    this.updateStatus();
                }
                return;
            }
            if (key === 'Delete' || key === 'Backspace') {
                if (mod || e.altKey) return;
                e.preventDefault();
                this.clearRange(this.range(), 'Cellules effacées');
                return;
            }
            if (mod && !e.shiftKey && !e.altKey && key.toLowerCase() === 'a') {
                e.preventDefault();
                this.selectAll();
                return;
            }
            // Un caractère : la saisie commence et remplace le contenu de la cellule.
            // Sans preventDefault, le caractère s'inscrit dans le champ qui reçoit le focus
            // (y compris un accent à composer) ; les raccourcis de l'éditeur (« ? ») ne le voient pas.
            const printable = (key.length === 1 || key === 'Dead' || key === 'Process') && !e.metaKey && (!e.ctrlKey || e.altKey);
            if (printable) {
                e.stopPropagation();
                this.startEdit({ replace: true });
            }
        }

        /* ---------- Saisie ---------- */

        /** Modifie une cellule : sélection puis saisie (nouveau chapitre, par exemple). */
        editCell(r, key) {
            const c = this.colIdx(key);
            if (r < 0 || c < 0) return;
            this.select(r, c);
            this.startEdit();
        }

        /** opts = { replace : la saisie commence vide (touche frappée sur la cellule) } */
        startEdit(opts) {
            opts = opts || {};
            if (this.edit) this.finishEdit(true);
            const a = this.activeRC();
            if (!a) return;
            const col = this.cols[a.c];
            const ch = this.store.config.chapters[a.r];
            this.anchor = this.active;
            this.paintSelection();
            this.updateStatus();
            this.scrollToCell(a.r, a.c);
            if (col.kind === 'image' && !opts.replace) { this.imageMenu(a.r); return; }
            const session = { id: ch.id, key: col.key, col, dirty: false, closing: false };
            if (col.kind === 'rich') this.richEditor(session, ch, opts);
            else if (col.kind === 'coords') this.coordsEditor(session, ch, opts);
            else this.inputEditor(session, ch, opts);
            this.edit = session;
            this.scroller.appendChild(session.box);
            this.placeEditor();
            session.focus(opts.replace);
            if (session.rich) this.revealEditor();
        }

        /** Fait défiler le tableau pour montrer toute la zone de saisie (texte), sans cacher sa première ligne. */
        revealEditor() {
            const ed = this.edit;
            if (!ed) return;
            const s = this.scroller;
            const sr = s.getBoundingClientRect();
            const br = ed.box.getBoundingClientRect();
            const bottom = sr.top + s.clientHeight;
            if (br.bottom > bottom) s.scrollTop += Math.max(0, Math.min(br.bottom - bottom, br.top - sr.top - this.thead.offsetHeight));
        }

        /** Place la zone de saisie sur sa cellule. */
        placeEditor() {
            const ed = this.edit;
            const td = ed ? this.cellEl(ed.id, ed.key) : null;
            if (!td) return;
            const s = this.scroller;
            const sr = s.getBoundingClientRect();
            const r = td.getBoundingClientRect();
            const box = ed.box;
            const width = ed.rich ? Math.max(Math.round(r.width), 400) : Math.round(r.width);
            let left = Math.round(r.left - sr.left + s.scrollLeft);
            // Zone de texte plus large que sa cellule : elle reste dans la partie visible
            if (ed.rich) left = Math.max(s.scrollLeft + HEAD_W, Math.min(left, s.scrollLeft + s.clientWidth - width - 2));
            box.style.top = Math.round(r.top - sr.top + s.scrollTop) + 'px';
            box.style.left = left + 'px';
            box.style.width = width + 'px';
            box.style.minHeight = Math.round(r.height) + 'px';
            if (ed.geo) {
                // Résultats de la recherche au-dessus de la cellule s'il n'y a pas la place en dessous
                box.classList.toggle('drop-up', r.bottom + 300 > sr.bottom && r.top - 300 > sr.top);
            }
            if (ed.rich) this.editor.rich.position();
        }

        /** Saisie sur une ligne : titre, légende, crédit, texte alternatif, identifiant, nombres, image (nom ou adresse). */
        inputEditor(session, ch, opts) {
            const col = session.col;
            const r = this.rowPos(ch.id);
            const original = textOf(ch, col.key, col.kind === 'image' ? this.imageContext().names : null);
            const input = h('input', {
                type: 'text', class: 'sheet-input' + (col.mono ? ' mono' : '') + (col.kind === 'number' ? ' is-number' : ''),
                spellcheck: col.kind === 'line' && col.key !== 'id' ? 'true' : 'false', autocomplete: 'off',
                inputmode: col.kind === 'number' ? 'decimal' : null,
                placeholder: col.kind === 'image' ? 'Nom de fichier ou adresse web de l’image' : '',
                'aria-label': col.label + ', ligne ' + (r + 1)
            });
            input.value = opts.replace ? '' : original;
            session.box = h('div', { class: 'sheet-editor' }, input);
            session.focus = replace => {
                input.focus({ preventScroll: true });
                if (!replace) input.setSelectionRange(input.value.length, input.value.length);
            };
            session.apply = reason => {
                if (input.value === original) return true;
                const i = this.rowPos(session.id);
                if (i < 0) return true;
                const problems = [];
                const next = applyText(this.store.config, i, col.key, input.value, problems, this.imageContext());
                if (problems.length) {
                    UI.toast(problems[0] + '.', { type: 'warning' });
                    if (reason === 'blur') return true; // valeur abandonnée
                    input.setAttribute('aria-invalid', 'true');
                    return false;
                }
                this.commit(next, col.undo);
                return true;
            };
            input.addEventListener('keydown', e => {
                const mod = U.isMac ? e.metaKey : e.ctrlKey;
                if (e.key === 'Enter' && !e.altKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.finishEdit(true, mod ? null : e.shiftKey ? 'up' : 'down');
                } else if (e.key === 'Tab') {
                    e.preventDefault();
                    this.finishEdit(true, e.shiftKey ? 'left' : 'right');
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.finishEdit(false);
                } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && opts.replace && !e.shiftKey && !mod) {
                    // Saisie commencée au clavier : les flèches valident et changent de ligne
                    e.preventDefault();
                    this.finishEdit(true, e.key === 'ArrowUp' ? 'up' : 'down');
                }
            });
            input.addEventListener('input', () => { session.dirty = true; input.removeAttribute('aria-invalid'); });
            input.addEventListener('blur', () => this.deferBlur(session));
        }

        /** Coordonnées : recherche d'un lieu (Photon / Nominatim) ou coordonnées saisies. */
        coordsEditor(session, ch, opts) {
            const r = this.rowPos(ch.id);
            const original = SH.formatCoords(ch.view.center);
            const geo = new SM.Geocoder({
                placeholder: 'Lieu, ou latitude ; longitude',
                onSelect: res => this.applyPlace(session, res)
            });
            geo.input.setAttribute('aria-label', 'Coordonnées, ligne ' + (r + 1) + ' : lieu ou latitude ; longitude');
            geo.input.value = opts.replace ? '' : original;
            session.geo = geo;
            session.box = h('div', { class: 'sheet-editor sheet-editor-geo' }, geo.el);
            session.focus = replace => {
                geo.input.focus({ preventScroll: true });
                if (!replace) geo.input.select();
            };
            const coords = () => SH.parseCoords(geo.input.value);
            session.apply = reason => {
                const v = geo.input.value.trim();
                if (!v || v === original) return true;
                const p = coords();
                if (!p) {
                    if (reason === 'blur') return true; // lieu tapé mais non choisi : abandonné
                    UI.toast('Choisissez un lieu dans la liste, ou tapez des coordonnées : latitude ; longitude (ex. 48,8566 ; 2,3522).', { type: 'info' });
                    return false;
                }
                const i = this.rowPos(session.id);
                if (i >= 0) this.commit(applyText(this.store.config, i, 'coords', v, [], null), COLUMN.coords.undo);
                return true;
            };
            // Avant les touches de la recherche (phase de capture)
            geo.el.addEventListener('keydown', e => {
                const open = geo.list.classList.contains('open');
                if (e.key === 'Escape') {
                    if (open) return; // ferme d'abord la liste des résultats
                    e.preventDefault();
                    e.stopPropagation();
                    this.finishEdit(false);
                    return;
                }
                if (e.key !== 'Enter' && e.key !== 'Tab') return;
                const mod = U.isMac ? e.metaKey : e.ctrlKey;
                session.move = e.key === 'Tab' ? (e.shiftKey ? 'left' : 'right') : mod ? null : 'down';
                const v = geo.input.value.trim();
                const choice = open && geo.results.length && geo.active >= 0;
                if (choice && !coords()) {
                    if (e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); geo.choose(geo.active); }
                    return; // Entrée : la recherche choisit le résultat actif (onSelect)
                }
                e.preventDefault();
                e.stopPropagation();
                if (!v || v === original || coords()) { this.finishEdit(true, session.move); return; }
                if (e.key === 'Enter') { geo.search(); return; } // nom de lieu : recherche
                this.finishEdit(false, session.move);
            }, true);
            geo.input.addEventListener('input', () => { session.dirty = true; });
            geo.input.addEventListener('blur', () => this.deferBlur(session));
        }

        /** Lieu choisi dans la recherche : position (et zoom adapté au type de lieu) ; titre s'il est vide. */
        applyPlace(session, res) {
            if (this.edit !== session) return;
            const i = this.rowPos(session.id);
            if (i >= 0) {
                let cfg = this.store.config;
                const ch = cfg.chapters[i];
                const view = { center: [U.round(res.center[0], 6), U.round(res.center[1], 6)] };
                if (res.zoom) view.zoom = U.round(U.clamp(res.zoom, 1, 18), 2);
                cfg = M.ops.setChapterGroup(cfg, i, 'view', view);
                const place = res.type !== 'Coordonnées';
                if (place && !String(ch.title || '').trim() && res.label) cfg = M.ops.setChapter(cfg, i, { title: res.label });
                this.commit(cfg, place ? 'Lieu du chapitre' : COLUMN.coords.undo);
            }
            this.finishEdit(false, session.move === undefined ? 'down' : session.move);
        }

        /** Texte du chapitre : zone de texte riche (barre de mise en forme de l'éditeur). */
        richEditor(session, ch, opts) {
            const r = this.rowPos(ch.id);
            const original = ch.text || '';
            const el = h('div', { class: 'sheet-rich' });
            if (!opts.replace) el.innerHTML = SM.sanitize.safe(original);
            session.rich = el;
            session.box = h('div', { class: 'sheet-editor sheet-editor-rich' }, el,
                h('div', { class: 'sheet-rich-hint' },
                    h('kbd', {}, 'Entrée'), ' nouvelle ligne', h('span', { class: 'sep' }),
                    h('kbd', {}, 'Tab'), ' ou ', h('kbd', {}, U.modKey + '+Entrée'), ' valider', h('span', { class: 'sep' }),
                    h('kbd', {}, 'Échap'), ' annuler'));
            session.focus = () => {
                el.focus({ preventScroll: true });
                const range = document.createRange();
                range.selectNodeContents(el);
                range.collapse(false);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            };
            session.apply = () => {
                if (!session.dirty) return true;
                const html = SM.sanitize.cleanEditable(el);
                const i = this.rowPos(session.id);
                if (i >= 0 && html !== original) this.commit(M.ops.setChapter(this.store.config, i, { text: html }), COLUMN.text.undo);
                return true;
            };
            // Touches du tableur, avant celles de la zone de texte riche
            el.addEventListener('keydown', e => {
                const mod = U.isMac ? e.metaKey : e.ctrlKey;
                if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    this.finishEdit(false);
                } else if (e.key === 'Tab') {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    this.finishEdit(true, e.shiftKey ? 'left' : 'right');
                } else if (e.key === 'Enter' && mod) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    this.finishEdit(true);
                }
            });
            el.addEventListener('input', () => { session.dirty = true; });
            this.editor.rich.bind(el, {
                rich: true, placeholder: 'Texte du chapitre…', label: 'Texte, ligne ' + (r + 1),
                bounds: () => this.scroller.getBoundingClientRect(),
                getValue: () => SM.sanitize.cleanEditable(el),
                onChange: () => { session.dirty = true; },
                onCode: html => { el.innerHTML = html; session.dirty = true; el.focus({ preventScroll: true }); },
                codeTitle: 'Code HTML du texte du chapitre',
                onCommit: () => this.deferBlur(session)
            });
        }

        /**
         * Perte du focus : la saisie est validée, sauf si le focus reste dans la
         * zone de saisie ou part vers la mise en forme (barre d'outils, lien,
         * code HTML, sélecteur de fichiers…).
         */
        deferBlur(session) {
            setTimeout(() => {
                if (this.edit !== session || session.closing) return;
                const a = document.activeElement;
                if (session.box.contains(a)) return;
                if (document.querySelector('dialog[open]') || !document.hasFocus()) return;
                if (a && a.closest && a.closest('.rt-toolbar, .rt-color-menu, .menu')) return;
                this.finishEdit(true, null, 'blur');
            }, 0);
        }

        /**
         * Termine la saisie. commit : valeur enregistrée (sinon abandonnée) ;
         * move : cellule suivante ('down', 'up', 'right', 'left') ; reason : 'blur'.
         */
        finishEdit(commit, move, reason) {
            const session = this.edit;
            if (!session || session.closing) return;
            session.closing = true;
            if (commit && session.apply(reason) === false) {
                session.closing = false;
                session.focus(false);
                return;
            }
            this.edit = null;
            const hadFocus = session.box.contains(document.activeElement);
            if (session.rich && this.editor.rich.active === session.rich) {
                this.editor.rich.active = null;
                this.editor.rich.hide();
            }
            if (session.geo) session.geo.cancelSearch();
            if (hadFocus || reason !== 'blur') this.focusGrid();
            session.box.remove();
            if (move) this.moveFrom(session, move);
        }

        commitEdit() {
            if (this.edit) this.finishEdit(true);
        }

        /** Cellule suivante après une saisie (Entrée, Tab…). */
        moveFrom(session, move) {
            // Identifiant modifié : la ligne a changé d'identifiant, la cellule active la suit
            const r = this.rows.has(session.id) ? this.rowPos(session.id) : this.activePos;
            const c = this.colIdx(session.key);
            if (r < 0 || c < 0) return;
            const lastC = this.cols.length - 1;
            const lastR = this.store.config.chapters.length - 1;
            if (move === 'down') this.select(r + 1, c);
            else if (move === 'up') this.select(r - 1, c);
            else if (move === 'right') { if (c < lastC) this.select(r, c + 1); else if (r < lastR) this.select(r + 1, 0); }
            else if (move === 'left') { if (c > 0) this.select(r, c - 1); else if (r > 0) this.select(r - 1, lastC); }
        }

        commit(next, label) {
            if (next && next !== this.store.config) this.store.commit(next, { label, source: 'sheet' });
        }

        /** Images intégrées de la storymap : nom d'export de chacune (data URL → nom) et par nom. */
        imageContext() {
            const cfg = this.store.config;
            if (this.imagesFor === cfg) return this.images;
            const packed = SM.io.pack(cfg);
            const names = new Map();
            cfg.chapters.forEach((ch, i) => {
                const pc = packed.story.chapters[i];
                if (M.isDataUrl(ch.image) && pc && pc.image) names.set(ch.image, pc.image);
            });
            const byKey = {};
            for (const name of Object.keys(packed.images)) byKey[SH.imageKey(name)] = packed.images[name];
            this.images = { names, byKey };
            this.imagesFor = cfg;
            return this.images;
        }

        /* ---------- Image d'une ligne ---------- */

        imageMenu(r) {
            const ch = this.store.config.chapters[r];
            const td = ch ? this.cellEl(ch.id, 'image') : null;
            if (!td) return;
            const ed = this.editor;
            const embedded = M.isDataUrl(ch.image);
            UI.menu(td, [
                { label: ch.image ? 'Remplacer l’image…' : 'Choisir une image…', icon: 'image-plus', desc: 'Ou glissez-déposez une image sur la ligne', onClick: () => ed.pickChapterImage(r) },
                { label: 'Depuis une adresse web…', icon: 'link', onClick: () => ed.chapterImageFromUrl(r) },
                ch.image && !embedded ? { label: 'Intégrer les images…', icon: 'download', onClick: () => ed.resolveImages() } : null,
                embedded && SM.images.dataUrlBytes(ch.image) > 600 * 1024 ? { label: 'Alléger l’image', icon: 'sparkles', onClick: () => ed.optimizeChapterImage(r) } : null,
                ch.image ? '-' : null,
                ch.image ? { label: 'Retirer l’image', icon: 'trash', danger: true, desc: 'Avec sa légende, son crédit et son texte alternatif', onClick: () => ed.removeChapterImage(r) } : null
            ], { minWidth: 260, keyboard: true, onClose: () => this.focusGrid() });
        }

        /* ---------- Presse-papiers ---------- */

        gridFocused() {
            return this.shown && !this.edit && document.activeElement === this.table;
        }

        onCopy(e, cut) {
            if (!this.gridFocused() || !e.clipboardData) return;
            const rg = this.range();
            if (!rg) return;
            const cfg = this.store.config;
            const names = this.imageContext().names;
            const text = [];
            const raw = [];
            for (let r = rg.r0; r <= rg.r1; r++) {
                const ch = cfg.chapters[r];
                const t = [];
                const v = [];
                for (let c = rg.c0; c <= rg.c1; c++) {
                    const key = this.cols[c].key;
                    t.push(textOf(ch, key, names));
                    v.push(valueOf(ch, key));
                }
                text.push(t);
                raw.push(v);
            }
            e.preventDefault();
            e.clipboardData.setData('text/plain', SM.csv.stringify(text, { delimiter: SM.csv.TAB, bom: false, trailing: false }));
            try {
                e.clipboardData.setData(CLIP_TYPE, JSON.stringify({ keys: this.cols.slice(rg.c0, rg.c1 + 1).map(c => c.key), rows: raw }));
            } catch (err) { /* type de données non pris en charge : texte seul */ }
            const n = (rg.r1 - rg.r0 + 1) * (rg.c1 - rg.c0 + 1);
            if (cut) this.clearRange(rg, 'Cellules coupées');
            this.flashStatus(cut ? U.plural(n, 'cellule coupée', 'cellules coupées') : U.plural(n, 'cellule copiée', 'cellules copiées'));
        }

        onPaste(e) {
            if (!this.gridFocused() || !e.clipboardData) return;
            const cd = e.clipboardData;
            const text = cd.getData('text/plain') || '';
            const a = this.activeRC();
            if (!a) return;
            e.preventDefault();
            e.stopPropagation();
            // Image collée : image du chapitre de la cellule active
            const file = Array.from(cd.items || []).find(it => it.kind === 'file' && it.type.indexOf('image/') === 0);
            if (file && !text.trim()) {
                this.editor.setChapterImageFromFile(a.r, file.getAsFile());
                return;
            }
            // Cellules copiées dans ce tableur : valeurs exactes
            let data = null;
            try { data = JSON.parse(cd.getData(CLIP_TYPE) || 'null'); } catch (err) { data = null; }
            if (data && Array.isArray(data.keys) && Array.isArray(data.rows) && data.rows.length) {
                this.pasteValues(data);
                return;
            }
            if (!text) return;
            const html = cd.getData('text/html') || '';
            const rg = this.range();
            const single = rg.r0 === rg.r1 && rg.c0 === rg.c1;
            // Texte d'un document (sans tabulation) collé dans une cellule de texte : un seul contenu, mise en forme comprise
            if (single && this.cols[rg.c0].kind === 'rich' && text.indexOf('\t') < 0 && !/<table/i.test(html)) {
                const value = html ? SM.sanitize.paste(html) : SH.cellToHtml(text);
                this.applyCells([{ r: rg.r0, c: rg.c0, value }], 'Cellule collée');
                return;
            }
            this.pasteRows(SM.csv.parse(text.replace(/(\r\n|\r|\n)$/, ''), { delimiter: SM.csv.TAB }));
        }

        /** Colle des lignes de texte (tabulations entre les cellules) à partir de la sélection. */
        pasteRows(rows) {
            const rg = this.range();
            const cells = [];
            const multi = rg.r0 !== rg.r1 || rg.c0 !== rg.c1;
            if (rows.length === 1 && rows[0].length === 1 && multi) {
                // Une valeur, plusieurs cellules sélectionnées : chacune la reçoit
                for (let r = rg.r0; r <= rg.r1; r++) for (let c = rg.c0; c <= rg.c1; c++) cells.push({ r, c, text: rows[0][0] });
            } else {
                rows.forEach((row, dr) => {
                    let c = rg.c0;
                    for (let j = 0; j < row.length && c < this.cols.length; j++, c++) {
                        let text = row[j];
                        // Latitude et longitude dans deux colonnes : une cellule de coordonnées
                        if (this.cols[c].kind === 'coords' && !SH.parseCoords(text) && j + 1 < row.length &&
                            isFinite(SH.parseAngle(text)) && isFinite(SH.parseAngle(row[j + 1]))) {
                            text = row[j] + ' ; ' + row[j + 1];
                            j++;
                        }
                        cells.push({ r: rg.r0 + dr, c, text });
                    }
                });
            }
            this.applyCells(cells, cells.length > 1 ? 'Cellules collées' : 'Cellule collée');
        }

        /** Colle des cellules copiées dans le tableur (valeurs exactes pour une même colonne). */
        pasteValues(data) {
            const rg = this.range();
            const names = this.imageContext().names;
            const cells = [];
            const put = (r, c, key, value) => {
                if (!COLUMN[key]) return;
                if (this.cols[c].key === key) cells.push({ r, c, value });
                else cells.push({ r, c, text: textOfValue(key, value, names) });
            };
            const multi = rg.r0 !== rg.r1 || rg.c0 !== rg.c1;
            if (data.rows.length === 1 && data.rows[0].length === 1 && multi) {
                for (let r = rg.r0; r <= rg.r1; r++) for (let c = rg.c0; c <= rg.c1; c++) put(r, c, data.keys[0], data.rows[0][0]);
            } else {
                data.rows.forEach((row, dr) => {
                    row.forEach((value, dc) => {
                        const c = rg.c0 + dc;
                        if (c < this.cols.length) put(rg.r0 + dr, c, data.keys[dc], value);
                    });
                });
            }
            this.applyCells(cells, cells.length > 1 ? 'Cellules collées' : 'Cellule collée');
        }

        /**
         * Enregistre des cellules { r, c, text | value } en une seule étape de
         * l'historique ; des lignes (chapitres) sont ajoutées au besoin.
         */
        applyCells(cells, label) {
            if (!cells.length) return;
            let cfg = this.store.config;
            const n0 = cfg.chapters.length;
            const need = Math.min(Math.max.apply(null, cells.map(x => x.r)) + 1, n0 + SH.MAX);
            if (need > n0) cfg = this.appendRows(cfg, need - n0);
            const problems = [];
            const ctx = this.imageContext();
            for (const cell of cells) {
                if (cell.r >= cfg.chapters.length || !this.cols[cell.c]) continue;
                const key = this.cols[cell.c].key;
                cfg = cell.text !== undefined ? applyText(cfg, cell.r, key, cell.text, problems, ctx) : applyValue(cfg, cell.r, key, cell.value, problems);
            }
            if (need > n0) cfg = this.nameRows(cfg, n0);
            this.commit(cfg, label);
            // Les cellules collées forment la nouvelle sélection
            const rows = cells.map(x => x.r).filter(r => r < this.store.config.chapters.length);
            const cols = cells.map(x => x.c);
            if (rows.length) this.selectRange(Math.min.apply(null, rows), Math.min.apply(null, cols), Math.max.apply(null, rows), Math.max.apply(null, cols));
            this.syncSelection();
            const msgs = [];
            if (need > n0) msgs.push(U.plural(need - n0, 'ligne ajoutée', 'lignes ajoutées') + ' (nouveaux chapitres).');
            if (problems.length) msgs.push(problems.slice(0, 2).join(' ; ') + (problems.length > 2 ? ' ; …' : '') + '.');
            if (msgs.length) UI.toast(msgs.join(' '), { type: problems.length ? 'warning' : 'success', duration: problems.length ? 9000 : 4000 });
        }

        /** Ajoute count chapitres à la fin, sur le modèle du dernier (cadrage, alignement, transition, calques). */
        appendRows(cfg, count) {
            for (let k = 0; k < count; k++) {
                const ref = cfg.chapters[cfg.chapters.length - 1];
                const ch = M.createChapter(cfg, {
                    align: ref.align, transition: { type: ref.transition.type },
                    view: { center: ref.view.center.slice(), zoom: ref.view.zoom, pitch: ref.view.pitch || 0, bearing: ref.view.bearing || 0 }
                });
                cfg = M.ops.insertChapter(cfg, cfg.chapters.length, ch, ref.id);
            }
            return cfg;
        }

        /** Chapitres ajoutés par un collage : identifiant tiré du titre (ancre lisible). */
        nameRows(cfg, from) {
            const used = new Set(cfg.chapters.map(c => c.id));
            for (let i = from; i < cfg.chapters.length; i++) {
                const ch = cfg.chapters[i];
                const slug = U.slugify(ch.title, 40);
                if (!slug) continue;
                used.delete(ch.id);
                cfg = M.ops.renameChapter(cfg, i, SH.uniqueId(slug, used));
            }
            return cfg;
        }

        clearRange(rg, label) {
            if (!rg) return;
            let cfg = this.store.config;
            for (let r = rg.r0; r <= rg.r1; r++) {
                for (let c = rg.c0; c <= rg.c1; c++) cfg = clearCell(cfg, r, this.cols[c].key);
            }
            this.commit(cfg, label);
        }

        flashStatus(text) {
            this.statusSel.textContent = text;
            clearTimeout(this.statusTimer);
            this.statusTimer = setTimeout(() => this.updateStatus(), 1600);
        }

        /* ---------- Lignes ---------- */

        /** Nouveau chapitre après la ligne after (par défaut : la ligne active), titre en saisie. */
        addRow(after) {
            this.commitEdit();
            const a = this.activeRC();
            const i = after === undefined ? (a ? a.r : this.store.config.chapters.length - 1) : after;
            this.editor.addChapter(i);
        }

        removeRows(r0, r1) {
            let cfg = this.store.config;
            const ids = cfg.chapters.slice(r0, r1 + 1).map(c => c.id);
            if (ids.length >= cfg.chapters.length) {
                UI.toast('Une storymap doit contenir au moins un chapitre.', { type: 'warning' });
                return;
            }
            for (const id of ids) cfg = M.ops.removeChapter(cfg, cfg.chapters.findIndex(c => c.id === id));
            this.commit(cfg, 'Suppression de ' + U.plural(ids.length, 'chapitre'));
            const after = this.store.config;
            UI.toast(U.plural(ids.length, 'chapitre supprimé', 'chapitres supprimés') + '.', {
                type: 'success',
                action: { label: 'Annuler', onClick: () => { if (this.store.config === after) this.store.undo(); } }
            });
        }

        /** Menu d'une ligne (bouton « ⋯ » ou clic droit ; cells : actions des cellules en plus). */
        rowMenu(i, anchor, cells) {
            if (i < 0) return;
            const ed = this.editor;
            const cfg = this.store.config;
            const ch = cfg.chapters[i];
            const n = cfg.chapters.length;
            const rg = this.range();
            const many = rg && rg.r1 > rg.r0 && i >= rg.r0 && i <= rg.r1 ? rg.r1 - rg.r0 + 1 : 1;
            const items = [];
            if (cells) {
                items.push(
                    { label: 'Couper', icon: 'scissors', shortcut: 'Mod+X', onClick: () => this.clipboardAction('cut') },
                    { label: 'Copier', icon: 'copy', shortcut: 'Mod+C', onClick: () => this.clipboardAction('copy') },
                    { label: 'Coller', icon: 'paste', shortcut: 'Mod+V', onClick: () => this.pasteFromClipboard() },
                    { label: 'Effacer', icon: 'x', shortcut: 'Delete', onClick: () => this.clearRange(this.range(), 'Cellules effacées') },
                    '-');
            }
            items.push(
                { label: 'Insérer une ligne au-dessus', icon: 'insert-above', onClick: () => this.addRow(i - 1) },
                { label: 'Insérer une ligne en dessous', icon: 'insert-below', shortcut: 'Mod+Shift+Enter', onClick: () => this.addRow(i) },
                { label: 'Dupliquer la ligne', icon: 'copy', shortcut: 'Mod+D', onClick: () => ed.duplicateChapter(i) },
                '-',
                { label: 'Monter', icon: 'move-up', shortcut: 'Mod+Shift+ArrowUp', disabled: i === 0, onClick: () => ed.moveChapter(i, i - 1) },
                { label: 'Descendre', icon: 'move-down', shortcut: 'Mod+Shift+ArrowDown', disabled: i === n - 1, onClick: () => ed.moveChapter(i, i + 1) },
                '-',
                { label: 'Voir dans l’éditeur visuel', icon: 'map', onClick: () => { this.store.select({ type: 'chapter', id: ch.id }); ed.setMode('visual'); } },
                { label: ch.hidden ? 'Afficher le panneau' : 'Masquer le panneau', icon: ch.hidden ? 'eye' : 'eye-off', onClick: () => ed.toggleHidden(i) },
                '-',
                many > 1
                    ? { label: 'Supprimer les ' + many + ' lignes', icon: 'trash', danger: true, disabled: many >= n, onClick: () => this.removeRows(rg.r0, rg.r1) }
                    : { label: 'Supprimer la ligne', icon: 'trash', danger: true, disabled: n <= 1, onClick: () => ed.removeChapter(i) });
            UI.menu(anchor, items, { align: anchor instanceof Element ? 'end' : undefined, minWidth: 260, onClose: () => setTimeout(() => this.focusGrid(), 0) });
        }

        /** Copier / couper depuis le menu : commande du navigateur (événement copy / cut du tableau). */
        clipboardAction(kind) {
            this.table.focus({ preventScroll: true });
            let ok = false;
            try { ok = document.execCommand(kind); } catch (e) { ok = false; }
            if (!ok) UI.toast('Utilisez le raccourci ' + U.modKey + '+' + (kind === 'cut' ? 'X' : 'C') + '.', { type: 'info' });
        }

        /** Coller depuis le menu : texte du presse-papiers (autorisation du navigateur). */
        async pasteFromClipboard() {
            try {
                const text = await navigator.clipboard.readText();
                this.table.focus({ preventScroll: true });
                if (text) this.pasteRows(SM.csv.parse(text.replace(/(\r\n|\r|\n)$/, ''), { delimiter: SM.csv.TAB }));
            } catch (e) {
                UI.toast('Le navigateur n’autorise pas la lecture du presse-papiers : utilisez le raccourci ' + U.modKey + '+V.', { type: 'info' });
            }
        }

        /* ---------- Glisser-déposer ---------- */

        onDragStart(e) {
            const head = e.target.closest && e.target.closest('th.sheet-rowhead');
            if (!head) return;
            const tr = head.parentNode;
            this.dragId = tr.dataset.id;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData(ROW_TYPE, this.dragId);
            try { e.dataTransfer.setDragImage(tr, 24, tr.offsetHeight / 2); } catch (err) { /* image par défaut */ }
            tr.classList.add('is-dragging');
            UI.hideTooltip();
        }

        endRowDrag() {
            const row = this.dragId ? this.rows.get(this.dragId) : null;
            if (row) row.tr.classList.remove('is-dragging');
            this.dragId = null;
            this.clearDropHints();
        }

        clearDropHints() {
            this.dropLine.hidden = true;
            this.el.classList.remove('is-dropping');
            if (this.dropRow) { this.dropRow.classList.remove('is-drop-target'); this.dropRow = null; }
        }

        /** Position d'insertion d'une ligne glissée : index et bord de ligne. */
        dropTarget(clientY) {
            const trs = Array.from(this.tbody.children);
            for (let k = 0; k < trs.length; k++) {
                const r = trs[k].getBoundingClientRect();
                if (clientY < r.top + r.height / 2) return { index: k, y: r.top };
            }
            const last = trs[trs.length - 1];
            return { index: trs.length, y: last ? last.getBoundingClientRect().bottom : 0 };
        }

        onDragOver(e) {
            const types = Array.from(e.dataTransfer.types || []);
            if (this.dragId && types.includes(ROW_TYPE)) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                const t = this.dropTarget(e.clientY);
                const sr = this.scroller.getBoundingClientRect();
                this.dropLine.style.top = Math.round(t.y - sr.top + this.scroller.scrollTop - 1) + 'px';
                this.dropLine.style.width = this.table.offsetWidth + 'px';
                this.dropLine.hidden = false;
                return;
            }
            if (!types.includes('Files')) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            // Image : la ligne survolée ; tableau (CSV) : tout le tableur
            const tr = e.target.closest && e.target.closest('tr.sheet-row');
            if (tr !== this.dropRow) {
                if (this.dropRow) this.dropRow.classList.remove('is-drop-target');
                this.dropRow = tr || null;
                if (tr) tr.classList.add('is-drop-target');
            }
            this.el.classList.toggle('is-dropping', !tr);
        }

        onDrop(e) {
            const types = Array.from(e.dataTransfer.types || []);
            if (this.dragId && types.includes(ROW_TYPE)) {
                e.preventDefault();
                e.stopPropagation();
                const from = this.rowPos(this.dragId);
                let to = this.dropTarget(e.clientY).index;
                this.endRowDrag();
                if (from < 0) return;
                if (to > from) to--;
                if (to !== from) this.editor.moveChapter(from, to);
                return;
            }
            const tr = e.target.closest && e.target.closest('tr.sheet-row');
            this.clearDropHints();
            const files = Array.from(e.dataTransfer.files || []);
            if (!files.length) return;
            const table = files.find(f => SH.isTableFile(f) || /\.(zip|txt)$/i.test(f.name || ''));
            if (table) {
                e.preventDefault();
                e.stopPropagation();
                this.editor.importSheet(files);
                return;
            }
            const img = files.find(isImageFile);
            if (img && tr) {
                e.preventDefault();
                e.stopPropagation();
                const r = this.posOf(tr);
                const c = this.colIdx('image');
                this.select(r, c < 0 ? 0 : c);
                this.editor.setChapterImageFromFile(r, img);
            }
            // Autres fichiers (données géographiques…) : gérés par l'éditeur
        }
    }

    Sheet.COLUMNS = COLUMNS;
    SM.Sheet = Sheet;
})();
