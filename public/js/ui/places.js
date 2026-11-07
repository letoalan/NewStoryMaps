/* ==========================================================================
   StoryMap — fenêtre « Créer des chapitres à partir de données »
   --------------------------------------------------------------------------
   Aperçu des chapitres, choix des champs (titre, texte, image…), images à
   associer par nom de fichier, cadrage, emplacement des chapitres et calque
   des lieux (éventuellement reliés, avec un trajet dessiné au fil du récit).
   ========================================================================== */
(function () {
    'use strict';

    const SM = window.SM;
    const U = SM.util;
    const h = U.h;
    const UI = SM.ui;
    const M = SM.model;
    const PL = SM.places;

    const isImage = f => (f.type || SM.images.mimeForName(f.name) || '').indexOf('image/') === 0;
    const excerpt = (html, n) => U.truncate(U.stripHtml(String(html || '')).replace(/\s+/g, ' ').trim(), n);

    /**
     * Créer des chapitres à partir d'un fichier de lieux (GeoJSON, KML/KMZ,
     * GPX), accompagné ou non de ses images.
     * opts = { files, config : storymap ouverte (absente : nouvelle storymap), current : chapitre sélectionné }
     * @returns {Promise<null | { title, chapters, layer, placement: 'replace' | 'end' | 'after' }>}
     */
    UI.chaptersFromData = async function (opts) {
        const files = Array.from(opts.files || []);
        const dataFile = files.find(f => !isImage(f));
        let images = files.filter(isImage);
        if (!dataFile) {
            UI.toast('Choisissez un fichier de lieux : GeoJSON, KML, KMZ ou GPX. Ses images se choisissent ensuite dans la fenêtre de création.', { type: 'warning' });
            return null;
        }
        const reading = UI.toast('Lecture de « ' + dataFile.name + ' »…', { type: 'loading' });
        let read;
        try {
            read = await SM.geodata.readPlaces(dataFile);
        } catch (e) {
            reading.update(e.message, 'error');
            return null;
        }
        reading.dismiss();
        if (!read.places.length) {
            UI.toast('Aucun lieu (point, ligne ou zone) dans « ' + dataFile.name + ' ».', { type: 'error' });
            return null;
        }
        images = images.concat(read.files);
        const cfg = opts.config || null;
        const total = read.places.length;
        const places = read.places.slice(0, PL.MAX);
        const mapping = PL.guess(places);
        const points = PL.pointCount(places);
        const previews = new Map();   // fichier image → adresse d'aperçu (révoquée à la fermeture)

        /* Introduction */
        const intro = h('div', { class: 'callout callout-info' }, SM.icon('geodata', 16), h('div', {},
            h('p', {}, h('strong', {}, U.plural(total, 'lieu', 'lieux') + ' dans « ' + dataFile.name + ' »'),
                ' : chaque lieu devient un chapitre, la carte centrée sur lui. Vous pourrez ensuite tout modifier.'),
            total > PL.MAX ? h('p', {}, 'Seuls les ' + PL.MAX + ' premiers lieux sont utilisés.') : null,
            read.skipped ? h('p', {}, U.plural(read.skipped, 'élément sans géométrie ignoré', 'éléments sans géométrie ignorés') + '.') : null));

        /* Titre (nouvelle storymap) */
        const titleInput = cfg ? null : UI.textInput({ value: read.name, placeholder: 'Titre de la storymap', label: 'Titre de la storymap' });

        /* Correspondance des champs */
        const options = [{ value: '', label: '— Aucun —' }].concat(PL.fields(places).map(f => ({ value: f.key, label: f.key + ' · ' + excerpt(f.example, 28) })));
        const grid = h('div', { class: 'places-fields' });
        PL.TARGETS.forEach(t => {
            const select = UI.select({
                value: mapping[t.key] || '', options, small: true, label: t.label,
                onChange: v => {
                    if (v) mapping[t.key] = v; else delete mapping[t.key];
                    refresh();
                }
            });
            grid.appendChild(UI.field(t.label, select));
        });

        /* Aperçu */
        const list = h('ol', { class: 'places-preview' });
        const more = h('p', { class: 'field-hint places-more' });
        const imageNote = h('div', { class: 'callout callout-warning', hidden: true });

        const imageStatus = ref => {
            if (!ref) return null;
            if (M.isDataUrl(ref)) return 'data';
            if (M.isRemoteUrl(ref)) return 'remote';
            return SM.io.findImageFile(ref, images) ? 'file' : 'missing';
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
        const zoom = UI.slider({ min: 1, max: 18, step: 0.5, decimals: 1, value: PL.ZOOM, label: 'Zoom sur chaque lieu' });
        let placement = cfg && !M.isBlank(cfg) ? 'end' : 'replace';
        const current = cfg ? opts.current : -1;
        const placementOptions = [{ value: 'replace', label: 'Remplacer les chapitres', short: 'Remplacer' }, { value: 'end', label: 'À la fin' }];
        if (cfg && current >= 0 && current < cfg.chapters.length - 1) placementOptions.push({ value: 'after', label: 'Après le chapitre ' + (current + 1), short: 'Après le ' + (current + 1) });
        const where = cfg ? UI.segmented({ value: placement, options: placementOptions, label: 'Emplacement des chapitres', onChange: v => { placement = v; } }) : null;
        const connect = points >= 2 ? UI.toggle({ checked: false, label: 'Relier les lieux dans l’ordre' }) : null;
        const layer = UI.toggle({ checked: true, label: 'Afficher les lieux sur la carte', onChange: v => { if (connect) connect.disable(!v); } });

        let submitBtn;
        function refresh() {
            U.clear(list);
            const shown = PL.toChapters(places.slice(0, 5), mapping, {});
            shown.forEach(ch => {
                const status = imageStatus(ch.image);
                let thumb = SM.icon(status === 'missing' ? 'image' : 'pin', 16);
                if (status === 'file') thumb = h('img', { src: previewUrl(SM.io.findImageFile(ch.image, images)), alt: '' });
                else if (status === 'data' || status === 'remote') thumb = h('img', { src: ch.image, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' });
                list.appendChild(h('li', { class: 'places-item' },
                    h('span', { class: 'places-thumb' + (status === 'missing' ? ' is-missing' : '') }, thumb),
                    h('span', { class: 'places-text' },
                        h('strong', {}, ch.title || 'Sans titre'),
                        h('span', {}, excerpt(ch.text, 110) || '—')),
                    status === 'missing' ? h('span', { class: 'badge badge-warning', 'data-tip': ch.image }, 'Image à fournir') : null));
            });
            more.textContent = places.length > shown.length ? '… et ' + U.plural(places.length - shown.length, 'autre chapitre', 'autres chapitres') + '.' : '';

            // Images désignées par un nom de fichier, sans fichier correspondant
            const missing = Array.from(new Set(places.map(p => PL.imageRef(mapping.image ? p.fields[mapping.image] : ''))
                .filter(ref => imageStatus(ref) === 'missing')));
            U.clear(imageNote);
            imageNote.hidden = !missing.length;
            if (missing.length) {
                imageNote.append(SM.icon('image', 16), h('div', {},
                    h('p', {}, h('strong', {}, U.plural(missing.length, 'image désignée', 'images désignées') + ' par un nom de fichier'),
                        ' (' + missing.slice(0, 3).join(', ') + (missing.length > 3 ? '…' : '') + ') : choisissez les fichiers pour les intégrer, ou faites-le plus tard (« Intégrer les images »).'),
                    h('div', { class: 'insp-inline-actions', style: 'margin-top:8px' },
                        UI.button({ label: 'Choisir les images…', icon: 'image-plus', size: 'xs', onClick: () => pickImages(false) }),
                        UI.button({ label: 'Choisir un dossier…', icon: 'folder-open', size: 'xs', variant: 'ghost', onClick: () => pickImages(true) }))));
            }
            if (submitBtn) submitBtn.querySelector('.btn-label').textContent = cfg ? 'Créer ' + U.plural(places.length, 'chapitre') : 'Créer la storymap';
        }

        const body = h('div', { class: 'places' },
            intro,
            titleInput ? UI.field('Titre de la storymap', titleInput) : null,
            h('div', { class: 'insp-subhead' }, SM.icon('type', 14), 'Contenu des chapitres'),
            h('p', { class: 'field-hint places-hint' }, 'Champs du fichier utilisés pour chaque chapitre (reconnus automatiquement).'),
            grid,
            h('div', { class: 'insp-subhead' }, SM.icon('book', 14), 'Aperçu'),
            list, more, imageNote,
            h('div', { class: 'insp-subhead' }, SM.icon('sliders', 14), 'Options'),
            points ? UI.field('Zoom sur chaque lieu', zoom, { hint: 'Pour les lieux ponctuels ; les lignes et les zones sont cadrées en entier. Un champ « zoom » du fichier est prioritaire.' }) : null,
            where ? UI.field('Emplacement', where) : null,
            UI.fieldRow('Afficher les lieux sur la carte', layer, { hint: 'Ajoute un calque de données avec les lieux et leurs noms.' }),
            connect ? UI.fieldRow('Relier les lieux dans l’ordre', connect, { hint: 'Le trajet d’un lieu au suivant se dessine au fil des chapitres (arcs sur les longues distances).' }) : null);

        let busy = false;
        const submit = async () => {
            if (busy) return;
            busy = true;
            submitBtn.disabled = true;
            const working = UI.toast('Création des chapitres…', { type: 'loading' });
            try {
                const replace = !cfg || placement === 'replace';
                let chapters = PL.toChapters(places, mapping, { zoom: zoom.get(), usedIds: replace ? [] : cfg.chapters.map(c => c.id) });
                // Images fournies (par nom de fichier) : intégrées, optimisées
                if (images.length) {
                    const res = await SM.io.embedFromFiles({ chapters, footer: '' }, images);
                    chapters = res.config.chapters;
                    if (res.errors.length) UI.toast(res.errors.join(' — '), { type: 'warning', duration: 9000 });
                }
                const data = layer.get() ? PL.toLayer(cfg || M.createConfig({}), places, mapping, read.name, !!(connect && connect.get()), read.icons) : null;
                working.dismiss();
                modal.close({
                    title: titleInput ? titleInput.get().trim() || read.name : null,
                    chapters, layer: data, placement: replace ? 'replace' : placement
                });
            } catch (e) {
                working.update('Création impossible : ' + e.message, 'error');
                busy = false;
                submitBtn.disabled = false;
            }
        };

        const modal = UI.modal({
            title: 'Créer des chapitres à partir de données', subtitle: dataFile.name + (images.length ? ' · ' + U.plural(images.length, 'image fournie', 'images fournies') : ''),
            icon: 'geodata', width: 640, body, className: 'places-modal',
            footer: close => {
                const frag = UI.modalActions(close, [{ label: 'Annuler', value: null }]);
                submitBtn = UI.button({ label: 'Créer', icon: 'plus', variant: 'primary', onClick: submit });
                frag.appendChild(submitBtn);
                return frag;
            },
            onClose: () => previews.forEach(url => URL.revokeObjectURL(url))
        });
        refresh();
        return (await modal.result) || null;
    };
})();
