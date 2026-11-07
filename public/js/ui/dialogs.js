/* ==========================================================================
   StoryMap — boîtes de dialogue
   ========================================================================== */
(function () {
    'use strict';

    const SM = window.SM;
    const U = SM.util;
    const h = U.h;
    const UI = SM.ui;

    /* ---------- Confirmation / saisie / information ---------- */

    UI.confirm = function (o) {
        const m = UI.modal({
            title: o.title,
            icon: o.icon || (o.danger ? 'alert' : 'help'),
            tone: o.danger ? 'danger' : o.tone,
            width: o.width || 440,
            body: typeof o.message === 'string' ? h('p', {}, o.message) : o.message,
            footer: close => UI.modalActions(close, [
                { label: o.cancelLabel || 'Annuler', value: false },
                { label: o.confirmLabel || 'Confirmer', variant: o.danger ? 'danger' : 'primary', value: true }
            ])
        });
        return m.result.then(v => v === true);
    };

    UI.alert = function (o) {
        const m = UI.modal({
            title: o.title, icon: o.icon || 'info', tone: o.tone, width: o.width || 460,
            body: typeof o.message === 'string' ? h('p', {}, o.message) : o.message,
            footer: close => UI.modalActions(close, [{ label: o.okLabel || 'Compris', variant: 'primary', value: true }])
        });
        return m.result;
    };

    UI.prompt = function (o) {
        const input = UI.textInput({ value: o.value || '', placeholder: o.placeholder, multiline: o.multiline, rows: o.rows, code: o.code, blurOnEnter: false });
        const error = h('div', { class: 'field-hint', style: 'color:var(--danger);display:none' });
        const body = h('div', {},
            o.message ? h('p', {}, o.message) : null,
            UI.field(o.label, input, { hint: o.hint }),
            error);
        let modal;
        const submit = () => {
            const v = input.get();
            const err = o.validate ? o.validate(v) : null;
            if (err) {
                error.textContent = err;
                error.style.display = 'block';
                input.input.setAttribute('aria-invalid', 'true');
                input.input.focus();
                return false;
            }
            modal.close(v);
            return true;
        };
        if (!o.multiline) input.input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
        modal = UI.modal({
            title: o.title, icon: o.icon || 'edit', width: o.width || 460, body,
            footer: close => UI.modalActions(close, [
                { label: 'Annuler', value: null },
                { label: o.confirmLabel || 'Valider', variant: 'primary', onClick: () => { submit(); return false; } }
            ])
        });
        setTimeout(() => { input.input.focus(); if (input.input.select && !o.multiline) input.input.select(); }, 40);
        return modal.result.then(v => (v === undefined ? null : v));
    };

    /* ---------- Rapport d'import ---------- */

    UI.showImportReport = function (report, opts) {
        opts = opts || {};
        const ok = report.filter(r => r.ok);
        const failed = report.filter(r => !r.ok);
        const list = h('ul', { class: 'report-list' });
        for (const r of report) {
            if (r.ok) {
                const hasWarn = r.warnings && r.warnings.length;
                const missing = r.unembedded ? r.unembedded.length : 0;
                const li = h('li', { class: 'report-item ' + (hasWarn || missing ? 'warn' : 'ok') },
                    SM.icon(hasWarn || missing ? 'alert' : 'check-circle', 16),
                    h('div', { style: 'flex:1;min-width:0' },
                        h('div', { class: 'report-title' }, r.story.config.title || 'Sans titre'),
                        h('div', { class: 'subtle', style: 'font-size:12px' }, r.file + ' · ' + U.plural(r.story.config.chapters.length, 'chapitre')),
                        hasWarn ? h('ul', {}, r.warnings.slice(0, 6).map(w => h('li', {}, w)), r.warnings.length > 6 ? h('li', {}, '… et ' + (r.warnings.length - 6) + ' autre(s) remarque(s).') : null) : null,
                        missing ? h('div', { style: 'margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap' },
                            h('span', { class: 'badge badge-warning' }, SM.icon('image', 12), U.plural(missing, 'image non intégrée', 'images non intégrées')),
                            UI.button({
                                label: 'Associer les images…', size: 'xs', icon: 'image-plus',
                                onClick: () => { modal.close(); if (opts.onResolveImages) opts.onResolveImages(r.story); }
                            })) : null),
                    opts.onOpen ? UI.button({ label: 'Ouvrir', size: 'sm', onClick: () => { modal.close(); opts.onOpen(r.story); } }) : null);
                list.appendChild(li);
            } else {
                list.appendChild(h('li', { class: 'report-item error' }, SM.icon('x-circle', 16),
                    h('div', { style: 'flex:1;min-width:0' },
                        h('div', { class: 'report-title' }, r.file),
                        h('div', { class: 'muted', style: 'font-size:12.5px' }, r.error))));
            }
        }
        const title = !ok.length ? 'Import impossible' : ok.length === 1 && !failed.length ? 'Storymap importée' : U.plural(ok.length, 'storymap importée', 'storymaps importées');
        const modal = UI.modal({
            title, icon: ok.length ? 'check-circle' : 'alert-circle', tone: ok.length ? null : 'danger', width: 560,
            subtitle: failed.length && ok.length ? U.plural(failed.length, 'fichier n’a pas pu être importé', 'fichiers n’ont pas pu être importés') + '.' : null,
            body: list,
            footer: close => UI.modalActions(close, [{ label: 'Fermer', variant: 'primary' }])
        });
        return modal.result;
    };

    /* ---------- Association des images non intégrées ---------- */

    /**
     * Permet d'intégrer en base64 les images référencées par un chemin ou une URL.
     * @returns {Promise<object|null>} configuration mise à jour, ou null si inchangée
     */
    UI.resolveImages = function (config, opts) {
        opts = opts || {};
        let working = config;
        const listEl = h('ul', { class: 'img-resolve-list' });
        const summary = h('div', { class: 'callout callout-info' });
        const remoteBtn = UI.button({ label: 'Télécharger les images en ligne', icon: 'download', size: 'sm' });
        let applyBtn;

        const render = () => {
            const items = SM.io.uniqueUnembedded(working);
            const initial = SM.io.uniqueUnembedded(config).length;
            U.clear(listEl);
            for (const it of items) {
                const thumb = h('span', { class: 'img-resolve-thumb' }, SM.icon('image', 16));
                if (it.remote) {
                    const img = h('img', { alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' });
                    img.onload = () => { U.clear(thumb); thumb.appendChild(img); };
                    img.src = it.src;
                }
                const where = it.kind === 'chapter' ? 'Image du chapitre ' + (it.index + 1) : it.kind === 'footer' ? 'Pied de page' : 'Texte du chapitre ' + (it.index + 1);
                listEl.appendChild(h('li', {},
                    thumb,
                    h('div', { class: 'img-resolve-text' },
                        h('div', { class: 'img-resolve-name', title: it.src }, U.basename(it.src) || it.src),
                        h('div', { class: 'subtle' }, where + (it.count > 1 ? ' (+' + (it.count - 1) + ')' : '') + ' · ' + (it.remote ? 'lien externe' : 'chemin relatif'))),
                    h('span', { class: 'badge ' + (it.remote ? 'badge-accent' : 'badge-warning') }, it.remote ? 'En ligne' : 'À fournir')));
            }
            U.clear(summary);
            const done = initial - items.length;
            summary.appendChild(SM.icon(items.length ? 'info' : 'check-circle', 16));
            summary.appendChild(h('div', {},
                items.length
                    ? h('p', {}, h('strong', {}, U.plural(items.length, 'image reste à intégrer', 'images restent à intégrer')),
                        done > 0 ? ' — ' + U.plural(done, 'image intégrée', 'images intégrées') + ' pour l’instant.' : '.')
                    : h('p', {}, h('strong', {}, 'Toutes les images sont intégrées.'), ' Cliquez sur « Appliquer » pour enregistrer.'),
                h('p', { class: 'muted' }, 'Sélectionnez les fichiers image (ou le dossier qui les contient) : ils sont associés automatiquement par nom de fichier et intégrés en base64.')));
            remoteBtn.style.display = items.some(i => i.remote) ? '' : 'none';
            if (applyBtn) applyBtn.disabled = working === config;
        };

        const runFiles = async directory => {
            const files = await U.pickFiles({ accept: directory ? null : SM.images.ACCEPT, multiple: true, directory });
            const images = files.filter(f => (f.type || SM.images.mimeForName(f.name)).startsWith('image/'));
            if (!images.length) return;
            const t = UI.toast('Intégration des images…', { type: 'loading' });
            try {
                const res = await SM.io.embedFromFiles(working, images);
                working = res.config;
                t.update(res.matched ? U.plural(res.matched, 'image associée', 'images associées') + '.' : 'Aucun fichier ne correspond aux images manquantes.', res.matched ? 'success' : 'warning');
                if (res.errors.length) UI.toast(res.errors.join(' — '), { type: 'error' });
            } catch (e) {
                t.update(e.message, 'error');
            }
            render();
        };

        remoteBtn.addEventListener('click', async () => {
            remoteBtn.disabled = true;
            const t = UI.toast('Téléchargement des images…', { type: 'loading' });
            try {
                const res = await SM.io.embedRemote(working, (i, n) => t.update('Téléchargement des images… (' + i + '/' + n + ')'));
                working = res.config;
                if (res.failed.length) {
                    t.update(U.plural(res.ok, 'image téléchargée', 'images téléchargées') + ', ' + res.failed.length + ' en échec (le site n’autorise pas le téléchargement). Enregistrez-les puis fournissez les fichiers.', 'warning');
                } else t.update(U.plural(res.ok, 'image téléchargée et intégrée', 'images téléchargées et intégrées') + '.', 'success');
            } catch (e) { t.update(e.message, 'error'); }
            remoteBtn.disabled = false;
            render();
        });

        const body = h('div', { class: 'img-resolve' },
            summary,
            h('div', { class: 'img-resolve-actions' },
                UI.button({ label: 'Choisir des fichiers…', icon: 'image-plus', size: 'sm', onClick: () => runFiles(false) }),
                UI.button({ label: 'Choisir un dossier…', icon: 'folder-open', size: 'sm', onClick: () => runFiles(true) }),
                remoteBtn),
            listEl);

        const modal = UI.modal({
            title: 'Intégrer les images', icon: 'image-plus', width: 600,
            subtitle: opts.subtitle || 'Pour qu’elles soient incluses dans vos exports (.json avec images en base64).',
            body,
            footer: close => {
                const frag = UI.modalActions(close, [{ label: 'Annuler', value: null }]);
                applyBtn = UI.button({ label: 'Appliquer', variant: 'primary', disabled: true, onClick: () => close(working) });
                frag.appendChild(applyBtn);
                return frag;
            }
        });
        render();
        return modal.result.then(v => (v && v !== config ? v : null));
    };

    /* ---------- Raccourcis clavier ---------- */

    UI.SHORTCUTS = [
        { heading: 'Général' },
        { keys: 'Mod+S', label: 'Enregistrer maintenant' },
        { keys: 'Mod+Z', label: 'Annuler' },
        { keys: 'Mod+Shift+Z', label: 'Rétablir', alt: 'Mod+Y' },
        { keys: 'Mod+Enter', label: 'Aperçu de la storymap' },
        { keys: 'Mod+E', label: 'Exporter' },
        { keys: '?', label: 'Afficher cette aide' },
        { heading: 'Navigation (hors saisie de texte)' },
        { keys: 'ArrowLeft', label: 'Chapitre précédent', alt: ['PageUp'] },
        { keys: 'ArrowRight', label: 'Chapitre suivant', alt: ['Space', 'PageDown'] },
        { keys: 'ArrowUp', label: 'Premier chapitre' },
        { keys: 'ArrowDown', label: 'Dernier chapitre' },
        { heading: 'Chapitres' },
        { keys: 'Mod+Shift+ArrowUp', label: 'Monter le chapitre' },
        { keys: 'Mod+Shift+ArrowDown', label: 'Descendre le chapitre' },
        { keys: 'Mod+D', label: 'Dupliquer le chapitre' },
        { keys: 'Mod+Shift+Enter', label: 'Nouveau chapitre après celui-ci' },
        { keys: 'Delete', label: 'Supprimer le chapitre (liste des chapitres)' },
        { heading: 'Texte' },
        { keys: 'Mod+B', label: 'Gras' },
        { keys: 'Mod+I', label: 'Italique' },
        { keys: 'Mod+U', label: 'Souligné' },
        { keys: 'Mod+K', label: 'Insérer un lien' },
        { keys: 'Shift+Enter', label: 'Saut de ligne dans une liste' },
        { heading: 'Carte' },
        { keys: 'Glisser', label: 'Déplacer la carte (la vue du chapitre est enregistrée)', raw: true },
        { keys: 'Clic droit + glisser', label: 'Pivoter et incliner la carte', raw: true },
        { keys: 'Molette', label: 'Zoomer', raw: true },
        { heading: 'Tableur' },
        { keys: 'Enter', label: 'Modifier la cellule (ou tapez directement)', alt: 'F2' },
        { keys: 'Enter', label: 'Valider et passer à la ligne suivante (en saisie)' },
        { keys: 'Tab', label: 'Valider et passer à la cellule suivante', alt: 'Shift+Tab' },
        { keys: 'Escape', label: 'Annuler la saisie' },
        { keys: 'Shift+ArrowDown', label: 'Étendre la sélection (ou glisser sur les cellules)' },
        { keys: 'Mod+C', label: 'Copier les cellules (vers Excel, Google Sheets…)' },
        { keys: 'Mod+V', label: 'Coller des cellules (lignes ajoutées au besoin)' },
        { keys: 'Delete', label: 'Effacer les cellules sélectionnées' },
        { keys: 'Mod+A', label: 'Tout sélectionner' }
    ];

    UI.showShortcuts = function () {
        const grid = h('div', { class: 'shortcuts' });
        for (const s of UI.SHORTCUTS) {
            if (s.heading) { grid.appendChild(h('h4', {}, s.heading)); continue; }
            grid.appendChild(h('div', {}, s.label));
            const keys = h('div', { class: 'keys' });
            if (s.raw) keys.appendChild(h('kbd', {}, s.keys));
            else {
                U.shortcutParts(s.keys).forEach(k => keys.appendChild(h('kbd', {}, k)));
                for (const alt of [].concat(s.alt || [])) {
                    keys.appendChild(h('span', { class: 'subtle', style: 'padding:0 2px' }, 'ou'));
                    U.shortcutParts(alt).forEach(k => keys.appendChild(h('kbd', {}, k)));
                }
            }
            grid.appendChild(keys);
        }
        UI.modal({ title: 'Raccourcis clavier', icon: 'keyboard', width: 520, body: grid });
    };

    /* ---------- Paramètres ---------- */

    UI.openSettings = function () {
        const P = SM.prefs;
        const body = h('div', { class: 'settings' });

        const group = (title, icon, ...content) => h('section', { class: 'settings-group' },
            h('h3', {}, SM.icon(icon, 16), title), ...content);

        // Apparence
        const theme = UI.segmented({
            value: P.get('uiTheme'),
            options: [{ value: 'auto', label: 'Automatique', icon: 'contrast' }, { value: 'light', label: 'Clair', icon: 'sun' }, { value: 'dark', label: 'Sombre', icon: 'moon' }],
            onChange: v => P.set('uiTheme', v)
        });
        body.appendChild(group('Apparence de l’éditeur', 'palette', UI.field('Thème de l’interface', theme)));

        // Images
        const opt = UI.toggle({ checked: P.get('imageOptimize'), onChange: v => { P.set('imageOptimize', v); refreshImg(); } });
        const maxDim = UI.select({
            value: String(P.get('imageMaxDim')),
            options: [{ value: '1200', label: '1 200 px (léger)' }, { value: '1600', label: '1 600 px (recommandé)' }, { value: '2048', label: '2 048 px' }, { value: '2560', label: '2 560 px (haute définition)' }, { value: '0', label: 'Aucune limite' }],
            onChange: v => P.set('imageMaxDim', Number(v))
        });
        const quality = UI.slider({ min: 0.5, max: 0.95, step: 0.01, decimals: 2, value: P.get('imageQuality'), onChange: v => P.set('imageQuality', v) });
        const imgDetails = h('div', {}, UI.field('Dimension maximale', maxDim), UI.field('Qualité JPEG', quality, { hint: '0,85 offre un très bon compromis entre qualité et poids.' }));
        const refreshImg = () => { imgDetails.style.opacity = P.get('imageOptimize') ? '' : '.45'; imgDetails.style.pointerEvents = P.get('imageOptimize') ? '' : 'none'; };
        refreshImg();
        body.appendChild(group('Images', 'image',
            UI.fieldRow('Optimiser les images ajoutées', opt, { hint: 'Redimensionne et recompresse les photos volumineuses avant de les intégrer en base64. Les images légères sont conservées telles quelles.' }),
            imgDetails));

        // Carte
        const anim = UI.toggle({ checked: P.get('animateNavigation'), onChange: v => P.set('animateNavigation', v) });
        const geocoder = UI.select({
            value: P.get('geocoder'),
            options: [{ value: 'photon', label: 'Photon (Komoot) — suggestions pendant la saisie' }, { value: 'nominatim', label: 'Nominatim (OpenStreetMap)' }],
            onChange: v => P.set('geocoder', v)
        });
        body.appendChild(group('Carte', 'map',
            UI.fieldRow('Animer la carte lors du changement de chapitre', anim),
            UI.field('Recherche de lieux', geocoder)));

        // Données
        const usage = h('div', { class: 'storage-meter' });
        const persistRow = h('div', { style: 'margin-top:10px' });
        const refreshData = async () => {
            const est = await SM.db.estimate();
            U.clear(usage);
            if (est.usage !== null && est.quota) {
                const pct = Math.min(100, est.usage / est.quota * 100);
                usage.appendChild(h('div', { class: 'storage-bar' }, h('span', { style: 'width:' + Math.max(1, pct) + '%' })));
                usage.appendChild(h('div', { class: 'subtle', style: 'font-size:12px;margin-top:6px' },
                    U.formatBytes(est.usage) + ' utilisés sur ' + U.formatBytes(est.quota) + ' disponibles pour ce site.'));
            } else {
                usage.appendChild(h('div', { class: 'subtle' }, 'Estimation de l’espace de stockage indisponible dans ce navigateur.'));
            }
            U.clear(persistRow);
            if (est.persisted) {
                persistRow.appendChild(h('div', { class: 'callout callout-info' }, SM.icon('shield', 16),
                    h('div', {}, h('p', {}, h('strong', {}, 'Stockage persistant activé.'), ' Le navigateur ne supprimera pas vos storymaps automatiquement.'))));
            } else {
                persistRow.appendChild(h('div', { class: 'callout callout-warning' }, SM.icon('alert', 16),
                    h('div', {},
                        h('p', {}, h('strong', {}, 'Stockage non persistant.'), ' En cas de manque d’espace disque, le navigateur pourrait effacer les données de l’éditeur. Exportez régulièrement vos storymaps.'),
                        h('p', { style: 'margin-top:8px' }, UI.button({
                            label: 'Demander un stockage persistant', icon: 'shield', size: 'sm', onClick: async () => {
                                const ok = await SM.db.requestPersistence();
                                UI.toast(ok ? 'Stockage persistant accordé.' : 'Le navigateur a refusé la demande (elle peut être accordée automatiquement si vous utilisez souvent l’éditeur ou l’installez).', { type: ok ? 'success' : 'warning' });
                                refreshData();
                            }
                        })))));
            }
        };
        refreshData();
        body.appendChild(group('Données', 'database',
            h('p', { class: 'muted', style: 'margin:0 0 10px' }, 'Vos storymaps sont enregistrées uniquement dans ce navigateur (IndexedDB). Rien n’est envoyé sur Internet.'),
            usage, persistRow,
            h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;margin-top:12px' },
                UI.button({
                    label: 'Sauvegarder toutes les storymaps (.zip)', icon: 'archive', size: 'sm', onClick: async () => {
                        const t = UI.toast('Préparation de la sauvegarde…', { type: 'loading' });
                        try {
                            const stories = await SM.library.getAll();
                            if (!stories.length) { t.update('Aucune storymap à sauvegarder.', 'info'); return; }
                            const size = await SM.io.exportBackup(stories);
                            t.update('Sauvegarde téléchargée (' + U.plural(stories.length, 'storymap') + ', ' + U.formatBytes(size) + ').', 'success');
                        } catch (e) { t.update(e.message, 'error'); }
                    }
                }))));

        body.appendChild(group('À propos', 'info',
            h('p', { class: 'muted', style: 'margin:0' },
                'StoryMap ' + SM.VERSION + ' — éditeur visuel de storymaps. Cartographie : ',
                h('a', { class: 'link', href: 'https://maplibre.org/', target: '_blank', rel: 'noopener' }, 'MapLibre GL JS'),
                '. Recherche de lieux : Photon / Nominatim (© contributeurs OpenStreetMap).')));

        UI.modal({
            title: 'Paramètres', icon: 'settings', width: 600, body,
            footer: close => UI.modalActions(close, [
                { label: 'Réinitialiser les préférences', variant: 'ghost', onClick: () => { P.reset(); close(); UI.toast('Préférences réinitialisées.', { type: 'success' }); } },
                'spacer',
                { label: 'Fermer', variant: 'primary' }
            ])
        });
    };
})();
