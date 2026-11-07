/* ==========================================================================
   StoryMap — tableur : fenêtres « Importer un tableau » et « Exporter le
   tableau » (fichiers CSV)
   --------------------------------------------------------------------------
   Import : aperçu des chapitres, colonnes du fichier reconnues (modifiables),
   images à associer par nom de fichier, emplacement des chapitres ; les
   lignes d'un tableau exporté mettent à jour leurs chapitres (identifiant).
   Export : fichier CSV (séparateur au choix) ou archive CSV + images.
   ========================================================================== */
(function () {
    'use strict';

    const SM = window.SM;
    const U = SM.util;
    const h = U.h;
    const UI = SM.ui;
    const M = SM.model;
    const SH = SM.sheet;

    const excerpt = (s, n) => U.truncate(String(s || '').replace(/\s+/g, ' ').trim(), n);
    const letter = k => (k >= 26 ? letter(Math.floor(k / 26) - 1) : '') + String.fromCharCode(65 + k % 26);
    const isImage = f => (f.type || SM.images.mimeForName(f.name) || '').indexOf('image/') === 0;

    /** « lignes 3, 5, 8… » (numéros des lignes du tableur). */
    const lineList = nums => (nums.length > 1 ? 'lignes ' : 'ligne ') + nums.slice(0, 6).join(', ') + (nums.length > 6 ? '…' : '');

    /**
     * Importer un tableau (fichier CSV, ou archive .zip exportée par le
     * tableur) : une ligne par chapitre.
     * opts = { files, config : storymap ouverte (absente : nouvelle storymap), current : chapitre sélectionné }
     * @returns {Promise<null | { title, chapters, placement: 'replace' | 'end' | 'after', stats, errors, fileName }>}
     */
    UI.sheetImport = async function (opts) {
        const reading = UI.toast('Lecture du tableau…', { type: 'loading' });
        let table;
        try {
            table = await SH.readTable(opts.files);
        } catch (e) {
            reading.update(e.message, 'error');
            return null;
        }
        reading.dismiss();
        if (!table.rows.length) {
            UI.toast('« ' + table.fileName + ' » ne contient aucune ligne.', { type: 'error' });
            return null;
        }
        const cfg = opts.config || null;
        const info = cfg ? SH.packInfo(cfg) : null;
        const current = cfg && opts.current >= 0 ? opts.current : -1;
        let images = table.images.slice();
        const previews = new Map(); // fichier image → adresse d'aperçu (révoquée à la fermeture)
        let hasHeader = SH.looksLikeHeader(table.rows[0]);
        let columns = [];
        let data = [];
        let mapping = {};

        /** Colonnes du fichier et correspondance automatique (selon la ligne d'en-tête). */
        function setup() {
            const header = hasHeader ? table.rows[0] : [];
            data = hasHeader ? table.rows.slice(1) : table.rows;
            const width = Math.max(1, ...table.rows.slice(0, 200).map(r => r.length));
            columns = [];
            for (let k = 0; k < width; k++) {
                const name = hasHeader ? String(header[k] || '').trim() : '';
                const sample = data.find(r => String(r[k] || '').trim());
                columns.push({ index: k, name: name || 'Colonne ' + letter(k), example: sample ? sample[k] : '' });
            }
            mapping = hasHeader ? SH.guess(header) : {};
        }
        setup();
        const lineOf = k => k + 1 + (hasHeader ? 1 : 0);

        /* Introduction */
        const intro = h('div', { class: 'callout callout-info' }, SM.icon('file-table', 16), h('div', {},
            h('p', {}, h('strong', {}, 'Une ligne par chapitre'),
                ' : titre, texte, coordonnées, image… Les colonnes du fichier sont reconnues d’après leur nom ; vérifiez-les ci-dessous.')));

        /* Titre (nouvelle storymap) */
        const titleInput = cfg ? null : UI.textInput({ value: table.title, placeholder: 'Titre de la storymap', label: 'Titre de la storymap' });

        /* Correspondance des colonnes */
        const selects = {};
        const columnOptions = () => [{ value: '', label: '— Aucune —' }].concat(columns.map(c => ({
            value: String(c.index), label: c.name + (c.example ? ' · ' + excerpt(c.example, 26) : '')
        })));
        const fieldGrid = group => {
            const grid = h('div', { class: 'places-fields' });
            SH.FIELDS.filter(f => f.group === group).forEach(f => {
                const select = UI.select({
                    value: mapping[f.key] === undefined ? '' : String(mapping[f.key]), options: columnOptions(), small: true, label: f.label,
                    onChange: v => {
                        if (v === '') delete mapping[f.key]; else mapping[f.key] = Number(v);
                        refresh();
                    }
                });
                selects[f.key] = select;
                grid.appendChild(UI.field(f.label, select));
            });
            return grid;
        };
        const contentFields = fieldGrid('content');
        const mapFields = fieldGrid('map');
        const syncSelects = () => {
            for (const key of Object.keys(selects)) selects[key].setOptions(columnOptions(), mapping[key] === undefined ? '' : String(mapping[key]));
        };
        const headerToggle = UI.toggle({
            checked: hasHeader, label: 'La première ligne contient les noms des colonnes',
            onChange: v => { hasHeader = v; setup(); syncSelects(); refresh(); }
        });

        /* Aperçu */
        const list = h('ol', { class: 'places-preview' });
        const more = h('p', { class: 'field-hint places-more' });
        const notes = h('div', { class: 'sheet-import-notes' });

        const imageStatus = ref => {
            if (!ref) return null;
            if (M.isDataUrl(ref)) return 'data';
            if (M.isRemoteUrl(ref)) return 'remote';
            if (SM.io.findImageFile(ref, images)) return 'file';
            return info && info.images[SH.imageKey(ref)] ? 'known' : 'missing';
        };
        const previewUrl = file => {
            if (!previews.has(file)) previews.set(file, URL.createObjectURL(file));
            return previews.get(file);
        };
        const pickImages = async directory => {
            const picked = (await U.pickFiles({ accept: directory ? null : SM.images.ACCEPT, multiple: true, directory })).filter(isImage);
            if (!picked.length) return;
            images = images.concat(picked);
            refresh();
        };

        /* Options */
        const zoom = UI.slider({ min: 1, max: 18, step: 0.5, decimals: 1, value: SH.ZOOM, label: 'Zoom sur chaque lieu', onChange: () => refresh() });
        const zoomField = UI.field('Zoom sur chaque lieu', zoom, { hint: 'Pour les lignes sans zoom (colonne « zoom » absente ou vide).' });
        const matches = () => (cfg && U.isNum(mapping.id)
            ? new Set(data.map(r => SH.cleanId(r[mapping.id])).filter(id => id && cfg.chapters.some(c => c.id === id))).size : 0);
        let placement = !cfg || M.isBlank(cfg) || matches() ? 'replace' : 'end';
        const placementOptions = [{ value: 'replace', label: 'Remplacer les chapitres', short: 'Remplacer' }, { value: 'end', label: 'À la fin' }];
        if (cfg && current >= 0 && current < cfg.chapters.length - 1) placementOptions.push({ value: 'after', label: 'Après le chapitre ' + (current + 1), short: 'Après le ' + (current + 1) });
        const where = cfg ? UI.segmented({ value: placement, options: placementOptions, label: 'Emplacement des chapitres', onChange: v => { placement = v; refresh(); } }) : null;
        const whereHint = h('div', { class: 'field-hint' });
        const optionsHead = h('div', { class: 'insp-subhead' }, SM.icon('sliders', 14), 'Options');

        const build = () => {
            const replace = !cfg || placement === 'replace';
            const before = replace ? null : placement === 'after' ? cfg.chapters[current] : cfg.chapters[cfg.chapters.length - 1];
            return SH.toChapters(data, mapping, {
                config: cfg, merge: replace, info, before, zoom: zoom.get(),
                usedIds: replace ? [] : cfg.chapters.map(c => c.id)
            });
        };

        let submitBtn;
        let result = null;
        function refresh() {
            result = build();
            const res = result;
            const located = U.isNum(mapping.lat) || U.isNum(mapping.lng);

            // Aperçu des premiers chapitres
            U.clear(list);
            res.chapters.slice(0, 5).forEach((ch, k) => {
                const m = res.meta[k];
                const status = imageStatus(ch.image);
                let thumb = SM.icon(status === 'missing' ? 'image' : 'pin', 16);
                if (status === 'file') thumb = h('img', { src: previewUrl(SM.io.findImageFile(ch.image, images)), alt: '' });
                else if (status === 'known') thumb = h('img', { src: info.images[SH.imageKey(ch.image)], alt: '' });
                else if (status === 'data' || status === 'remote') thumb = h('img', { src: ch.image, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' });
                const where2 = m.located || m.updated
                    ? h('span', { class: 'sheet-preview-coords' }, SM.icon('pin', 12), SH.formatCoords(ch.view.center) + ' · zoom ' + SH.formatValue(ch.view.zoom))
                    : h('span', { class: 'sheet-preview-coords is-missing' }, SM.icon('alert', 12), 'Sans coordonnées : cadrage du chapitre précédent');
                list.appendChild(h('li', { class: 'places-item' },
                    h('span', { class: 'places-thumb' + (status === 'missing' ? ' is-missing' : '') }, thumb),
                    h('span', { class: 'places-text' },
                        h('strong', {}, ch.title || 'Sans titre'),
                        h('span', {}, excerpt(SH.htmlToText(ch.text), 110) || '—'),
                        where2),
                    m.updated ? h('span', { class: 'badge badge-accent', 'data-tip': 'Ligne reliée par son identifiant à un chapitre existant : il est mis à jour, ses autres réglages (alignement, transition, couches…) sont conservés.' }, 'Mis à jour') : null,
                    status === 'missing' ? h('span', { class: 'badge badge-warning', 'data-tip': ch.image }, 'Image à fournir') : null));
            });
            more.textContent = res.chapters.length > 5 ? '… et ' + U.plural(res.chapters.length - 5, 'autre chapitre', 'autres chapitres') + '.' : '';
            if (!res.chapters.length) list.appendChild(h('li', { class: 'empty-hint' }, 'Aucune ligne à importer.'));

            // Remarques
            U.clear(notes);
            const note = (tone, icon, ...content) => notes.appendChild(h('div', { class: 'callout callout-' + tone }, SM.icon(icon, 16), h('div', {}, ...content)));
            if (res.stats.skipped) note('warning', 'alert', h('p', {}, 'Seules les ' + SH.MAX + ' premières lignes sont importées (' + U.plural(res.stats.skipped, 'ligne ignorée', 'lignes ignorées') + ').'));
            if (!located && res.stats.created) {
                note('warning', 'pin', h('p', {}, h('strong', {}, 'Aucune colonne de coordonnées'), ' : choisissez les colonnes « Latitude » et « Longitude » ci-dessus, ou complétez ensuite les coordonnées dans le tableur (tapez un nom de lieu dans la colonne « Coordonnées »).'));
            } else if (res.stats.noCoords.length) {
                note('warning', 'pin', h('p', {}, h('strong', {}, U.plural(res.stats.noCoords.length, 'ligne sans coordonnées', 'lignes sans coordonnées')),
                    ' (' + lineList(res.stats.noCoords.map(lineOf)) + ') : la carte y reprend le cadrage du chapitre précédent. Complétez-les ensuite dans le tableur (tapez un nom de lieu dans « Coordonnées »).'));
            }
            if (res.stats.badCoords.length) {
                note('warning', 'alert', h('p', {}, h('strong', {}, U.plural(res.stats.badCoords.length, 'ligne aux coordonnées illisibles', 'lignes aux coordonnées illisibles')),
                    ' (' + lineList(res.stats.badCoords.map(lineOf)) + ') : degrés décimaux attendus (WGS 84), par exemple 48,8566 et 2,3522. Les coordonnées projetées (Lambert 93…) ne sont pas prises en charge.'));
            }
            // Images désignées par un nom de fichier, sans fichier fourni
            const missing = SH.missingImages(res.chapters, images, info ? info.images : null);
            if (missing.length) {
                note('warning', 'image',
                    h('p', {}, h('strong', {}, U.plural(missing.length, 'image désignée', 'images désignées') + ' par un nom de fichier'),
                        ' (' + missing.slice(0, 3).map(U.basename).join(', ') + (missing.length > 3 ? '…' : '') + ') : choisissez les fichiers pour les intégrer, ou faites-le plus tard (« Intégrer les images »).'),
                    h('div', { class: 'insp-inline-actions', style: 'margin-top:8px' },
                        UI.button({ label: 'Choisir les images…', icon: 'image-plus', size: 'xs', onClick: () => pickImages(false) }),
                        UI.button({ label: 'Choisir un dossier…', icon: 'folder-open', size: 'xs', variant: 'ghost', onClick: () => pickImages(true) })));
            }

            // Emplacement : chapitres mis à jour, remplacés
            if (where) {
                const replace = placement === 'replace';
                const updated = res.stats.updated;
                const dropped = replace ? cfg.chapters.length - updated : 0;
                let hint = '';
                if (replace && updated) {
                    hint = U.plural(updated, 'chapitre existant mis à jour', 'chapitres existants mis à jour') + ' (reconnus par leur identifiant) : leurs autres réglages sont conservés.' +
                        (dropped ? ' ' + U.plural(dropped, 'chapitre absent du tableau sera supprimé', 'chapitres absents du tableau seront supprimés') + '.' : '');
                } else if (replace && !M.isBlank(cfg)) {
                    hint = 'Les ' + U.plural(cfg.chapters.length, 'chapitre actuel', 'chapitres actuels') + ' seront remplacés. Pour mettre à jour des chapitres sans perdre leurs réglages, importez un tableau exporté par le tableur (colonne « identifiant »).';
                } else if (!replace) {
                    hint = 'Les chapitres du tableau s’ajoutent aux chapitres existants.';
                }
                whereHint.textContent = hint;
                whereHint.classList.toggle('is-warning', replace && !updated && !M.isBlank(cfg));
            }
            // Zoom proposé : seulement s'il sert (lieux sans zoom)
            const zoomUsed = res.meta.some(m => m.located && !m.updated && (!U.isNum(mapping.zoom) || !isFinite(SH.parseNumber((data[m.row] || [])[mapping.zoom]))));
            zoomField.hidden = !zoomUsed;
            optionsHead.hidden = !zoomUsed && !where;

            if (submitBtn) {
                submitBtn.disabled = !res.chapters.length;
                submitBtn.querySelector('.btn-label').textContent = !cfg ? 'Créer la storymap' : 'Importer ' + U.plural(res.chapters.length, 'ligne');
            }
        }

        const body = h('div', { class: 'places sheet-import' },
            intro,
            titleInput ? UI.field('Titre de la storymap', titleInput) : null,
            h('div', { class: 'insp-subhead' }, SM.icon('columns', 14), 'Colonnes du fichier'),
            UI.fieldRow('La première ligne contient les noms des colonnes', headerToggle),
            h('div', { class: 'sheet-import-group' }, 'Contenu'),
            contentFields,
            h('div', { class: 'sheet-import-group' }, 'Carte'),
            mapFields,
            h('p', { class: 'field-hint places-hint' }, 'Une colonne unique de coordonnées (« 48,8566 ; 2,3522 ») peut servir de latitude et de longitude. L’identifiant relie les lignes d’un tableau exporté à leurs chapitres.'),
            h('div', { class: 'insp-subhead' }, SM.icon('book', 14), 'Aperçu'),
            list, more, notes,
            optionsHead,
            zoomField,
            where ? UI.field('Emplacement', h('div', {}, where.el, whereHint)) : null);

        let busy = false;
        const submit = async () => {
            if (busy || !result || !result.chapters.length) return;
            busy = true;
            submitBtn.disabled = true;
            const working = UI.toast('Import du tableau…', { type: 'loading' });
            try {
                const res = build();
                const embedded = await SH.embedImages(res.chapters, images, info ? info.images : null);
                working.dismiss();
                modal.close({
                    title: titleInput ? titleInput.get().trim() || table.title : null,
                    chapters: embedded.chapters,
                    placement: !cfg ? 'replace' : placement,
                    stats: res.stats,
                    errors: embedded.errors,
                    fileName: table.fileName
                });
            } catch (e) {
                working.update('Import impossible : ' + e.message, 'error');
                busy = false;
                submitBtn.disabled = false;
            }
        };

        const meta = [SM.csv.DELIMITER_LABELS[table.delimiter] ? 'séparateur : ' + SM.csv.DELIMITER_LABELS[table.delimiter] : null, table.encoding,
            U.plural(data.length, 'ligne'), images.length ? U.plural(images.length, 'image fournie', 'images fournies') : null].filter(Boolean);
        const modal = UI.modal({
            title: 'Importer un tableau (CSV)', subtitle: table.fileName + ' · ' + meta.join(' · '),
            icon: 'file-table', width: 680, body, className: 'places-modal',
            footer: close => {
                const frag = UI.modalActions(close, [{ label: 'Annuler', value: null }]);
                submitBtn = UI.button({ label: 'Importer', icon: 'upload', variant: 'primary', onClick: submit });
                frag.appendChild(submitBtn);
                return frag;
            },
            onClose: () => previews.forEach(url => URL.revokeObjectURL(url))
        });
        refresh();
        return (await modal.result) || null;
    };

    /* ---------- Export ---------- */

    const delimiterPref = () => (SM.prefs.get('csvDelimiter') === ',' ? ',' : ';');

    /** Exporter les chapitres en tableau : fichier CSV, ou archive CSV + images. */
    UI.sheetExport = function (config) {
        let delimiter = delimiterPref();
        const base = SM.io.baseName(config);
        const embedded = SH.exportTable(config, {}).images;
        const nImages = Object.keys(embedded).length;

        const run = async kind => {
            modal.close();
            try {
                if (kind === 'csv') {
                    const csv = SH.buildCsv(config, { delimiter });
                    U.download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), base + '.csv');
                    UI.toast('Tableau exporté : ' + U.plural(config.chapters.length, 'ligne') + ' (' + U.formatBytes(SM.io.byteSize(csv)) + ').', { type: 'success' });
                } else {
                    const t = UI.toast('Préparation de l’archive…', { type: 'loading' });
                    const res = await SH.buildZip(config, { delimiter });
                    U.download(res.blob, base + '-tableau.zip');
                    t.update('Archive exportée : tableau et ' + U.plural(res.images, 'image') + ' (' + U.formatBytes(res.blob.size) + ').', 'success');
                }
            } catch (e) {
                UI.toast('Export impossible : ' + e.message, { type: 'error' });
            }
        };
        const card = (icon, title, desc, meta, kind, primary) => {
            const b = h('button', { type: 'button', class: 'export-card' + (primary ? ' primary' : '') },
                h('span', { class: 'export-icon' }, SM.icon(icon, 20)),
                h('span', { class: 'export-text' },
                    h('strong', {}, title),
                    h('span', { class: 'export-desc' }, desc),
                    meta ? h('span', { class: 'export-meta' }, meta) : null),
                SM.icon('download', 17, 'export-dl'));
            b.addEventListener('click', () => run(kind));
            return b;
        };
        const sep = UI.segmented({
            value: delimiter, label: 'Séparateur des colonnes',
            options: [
                { value: ';', label: 'Point-virgule', tip: 'Excel en français, LibreOffice : le fichier s’ouvre directement (virgule décimale : 48,8566)' },
                { value: ',', label: 'Virgule', tip: 'Format international : Google Sheets, Excel en anglais, QGIS, uMap… (point décimal : 48.8566)' }
            ],
            onChange: v => { delimiter = v; SM.prefs.set('csvDelimiter', v); }
        });
        const body = h('div', { class: 'export' },
            nImages ? h('div', { class: 'callout callout-info' }, SM.icon('image', 16),
                h('div', {}, h('p', {}, h('strong', {}, U.plural(nImages, 'image intégrée', 'images intégrées')),
                    ' : un fichier CSV ne contient que du texte, les images y figurent par leur nom de fichier (ex. ' + U.basename(Object.keys(embedded)[0]) + '). ' +
                    'L’archive .zip les contient. Réimporté dans cette storymap, le fichier CSV seul retrouve aussi ses images par leur nom.'))) : null,
            h('div', { class: 'export-grid' },
                card('file-table', 'Fichier CSV (.csv)', 'Une ligne par chapitre : titre, texte, coordonnées, zoom, image, légende, crédit… À modifier dans Excel, LibreOffice ou Google Sheets, puis à réimporter.',
                    U.plural(config.chapters.length, 'ligne') + ' · ' + SH.FIELDS.length + ' colonnes · UTF-8', 'csv', true),
                card('archive', 'CSV et images (.zip)', 'Le fichier CSV et un dossier images/ : un ensemble complet, à réimporter tel quel.',
                    nImages ? U.plural(nImages, 'image') : 'Aucune image intégrée', 'zip', false)),
            UI.field('Séparateur des colonnes', sep, { hint: 'Point-virgule : Excel en français et LibreOffice. Virgule : Google Sheets, Excel en anglais, logiciels de SIG (QGIS, uMap). Les deux se réimportent dans StoryMap.' }),
            h('p', { class: 'field-hint', style: 'margin:0' },
                'Texte mis en forme (gras, liens, listes…) : il figure en HTML dans le fichier, pour être réimporté à l’identique. ',
                h('button', { type: 'button', class: 'link', style: 'background:none;border:0;padding:0;font:inherit', onclick: () => { modal.close(); UI.sheetTemplate(); } }, 'Télécharger un modèle vide')));
        const modal = UI.modal({ title: 'Exporter le tableau', subtitle: config.title || 'Sans titre', icon: 'file-table', width: 620, body });
    };

    /** Modèle de tableau : colonnes attendues et deux lignes d'exemple. */
    UI.sheetTemplate = function () {
        U.download(new Blob([SH.template(delimiterPref())], { type: 'text/csv;charset=utf-8' }), 'modele-storymap.csv');
        UI.toast('Modèle téléchargé : remplissez-le dans votre tableur (une ligne par chapitre), enregistrez-le au format CSV, puis importez-le.', { type: 'success', duration: 7000 });
    };
})();
