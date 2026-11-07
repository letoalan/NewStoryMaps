/* ==========================================================================
   StoryMap — inspecteur (propriétés et réglages)
   ========================================================================== */
(function () {
    'use strict';

    const SM = window.SM;
    const U = SM.util;
    const h = U.h;
    const UI = SM.ui;
    const M = SM.model;

    const MARKER_COLORS = ['#3FB1CE', '#e03131', '#f08c00', '#fcc419', '#2f9e44', '#1c7ed6', '#7048e8', '#212529', '#ffffff'];
    const INSET_COLORS = ['orange', '#ff6b6b', '#e03131', '#3FB1CE', '#2f9e44', '#1c7ed6', '#7048e8', '#000000'];

    class Inspector {
        constructor(editor) {
            this.editor = editor;
            this.store = editor.store;
            this.tab = 'item';
            this.controls = [];
            this.layers = [];
            this.openData = null; // calque de données déplié dans les réglages de la storymap
            this.pendingRender = false;
            this.build();
            this.render();
            this.unsubs = [
                this.store.subscribe(evt => this.onStore(evt)),
                editor.on('style-layers', layers => { this.layers = layers; this.updateLayerList(); })
            ];
            this.el.addEventListener('focusout', () => {
                if (!this.pendingRender) return;
                setTimeout(() => {
                    if (this.pendingRender && !this.el.contains(document.activeElement)) { this.pendingRender = false; this.render(); }
                }, 0);
            });
        }

        destroy() {
            this.unsubs.forEach(fn => fn());
        }

        build() {
            this.tabs = h('div', { class: 'insp-tabs', role: 'tablist' });
            this.body = h('div', { class: 'insp-body scroll' });
            this.datalist = h('datalist', { id: U.uid('layers') });
            this.el = h('aside', { class: 'inspector', 'aria-label': 'Propriétés' }, this.tabs, this.body, this.datalist);
        }

        showStoryTab(section) {
            if (this.editor.isSheetMode()) this.editor.setMode('visual');
            if (!this.editor.isInspectorOpen()) this.editor.toggleInspector(true);
            this.tab = 'story';
            this.render();
            if (section) {
                const el = this.body.querySelector('[data-section="' + section + '"]');
                if (el) {
                    if (!el.classList.contains('open')) el.querySelector('.insp-section-toggle').click();
                    el.scrollIntoView({ block: 'start', behavior: 'smooth' });
                }
            }
        }

        showItemTab() {
            this.tab = 'item';
            this.render();
        }

        /** Reconstruit l'inspecteur s'il a manqué des modifications (retour du tableur). */
        refresh() {
            if (!this.stale) return;
            this.stale = false;
            this.render();
        }

        /* ---------- Cycle de rendu ---------- */

        structureKey() {
            const cfg = this.store.config;
            const sel = this.store.selection;
            const ch = this.store.selectedChapter();
            const parts = [this.tab, sel.type, sel.id];
            if (this.tab === 'story') {
                const route = M.routeData(cfg);
                parts.push(typeof cfg.style === 'string' ? cfg.style : 'obj:' + JSON.stringify(cfg.style).length,
                    cfg.marker.show, cfg.marker.icon, cfg.route.show, cfg.route.progressive, route ? route.stops.length : 0,
                    cfg.inset.show, cfg.terrain.show, this.terrainPresetId(cfg), cfg.theme,
                    cfg.autoplay, !!M.firstImage(cfg), JSON.stringify(M.validate(cfg).map(i => i.message)),
                    // Calques de données : réglages proposés selon les géométries, calque déplié, chapitres
                    cfg.data.map(d => { const s = SM.geodata.stats(d.geojson); return d.id + ':' + [s.lines, s.polygons, s.points, s.points > 1, s.named, s.colors.length, d.style.fileColors !== false, s.icons.length, d.style.fileIcons !== false, d.connect, d.progressive].map(Boolean).join(''); }).join(','),
                    this.openData, cfg.chapters.map(c => c.id).join(','));
            } else if (ch && sel.type === 'chapter') {
                parts.push(ch.transition.type, ch.layers.enter.length, ch.layers.exit.length, ch.image ? (M.isDataUrl(ch.image) ? 'data' : 'url') + ch.image.length : 'none',
                    this.store.config.chapters.length, cfg.autoplay, cfg.marker.show || cfg.inset.show, cfg.route.show, cfg.data.map(d => d.id + (M.isTraced(d) ? '*' : '')).join(','));
            }
            return parts.join('|');
        }

        onStore(evt) {
            // Tableur : l'inspecteur est masqué, il sera reconstruit à son retour
            if (this.editor.isSheetMode()) {
                if (evt.type === 'selection') this.tab = 'item';
                this.stale = true;
                return;
            }
            if (evt.type === 'selection') {
                if (this.tab !== 'item') this.tab = 'item';
                this.render();
                return;
            }
            if (evt.type !== 'change') return;
            if (this.structureKey() !== this.renderedKey) {
                const active = document.activeElement;
                if (active && this.el.contains(active) && U.isTypingTarget(active)) { this.pendingRender = true; this.update(); return; }
                this.render();
            } else {
                this.update();
            }
        }

        render() {
            const scroll = this.body.scrollTop;
            const sameView = this.renderedView === this.tab + ':' + this.store.selection.type + ':' + this.store.selection.id;
            this.controls = [];
            U.clear(this.body);
            this.renderTabs();
            if (this.tab === 'story') this.renderStory();
            else if (this.store.selection.type === 'cover') this.renderCover();
            else if (this.store.selection.type === 'footer') this.renderFooter();
            else this.renderChapter();
            this.renderedKey = this.structureKey();
            this.renderedView = this.tab + ':' + this.store.selection.type + ':' + this.store.selection.id;
            this.update();
            this.body.scrollTop = sameView ? scroll : 0;
        }

        update() {
            const cfg = this.store.config;
            const ch = this.store.selectedChapter();
            for (const c of this.controls) {
                try { c(cfg, ch); } catch (e) { console.error(e); }
            }
        }

        /** Enregistre une fonction de mise à jour d'un contrôle. */
        bind(fn) { this.controls.push(fn); }

        renderTabs() {
            U.clear(this.tabs);
            const sel = this.store.selection;
            const itemLabel = sel.type === 'cover' ? 'Couverture' : sel.type === 'footer' ? 'Pied de page' : 'Chapitre';
            const mk = (id, label, icon) => {
                const b = h('button', { type: 'button', role: 'tab', class: 'insp-tab', 'aria-selected': String(this.tab === id) }, SM.icon(icon, 15), label);
                b.addEventListener('click', () => { if (this.tab !== id) { this.tab = id; this.render(); } });
                return b;
            };
            this.tabs.append(
                mk('item', itemLabel, sel.type === 'chapter' ? 'book' : sel.type === 'cover' ? 'type' : 'panel-full'),
                mk('story', 'Storymap', 'sliders'));
        }

        section(o) {
            const s = UI.section(o);
            if (o.key) s.el.dataset.section = o.key;
            this.body.appendChild(s.el);
            return s.body;
        }

        idx() { return this.store.chapterIndex(); }

        setCh(patch, label, group) {
            const i = this.idx();
            const ch = this.store.config.chapters[i];
            this.store.setChapter(i, patch, { label, group: group ? group + ':' + ch.id : null, source: 'inspector' });
        }

        /* ---------- Chapitre ---------- */

        renderChapter() {
            const cfg = this.store.config;
            const i = this.idx();
            const ch = cfg.chapters[i];
            if (!ch) return;

            this.body.appendChild(h('div', { class: 'insp-head' },
                h('div', { class: 'insp-kicker' }, 'Chapitre ' + (i + 1) + ' sur ' + cfg.chapters.length),
                h('div', { class: 'insp-nav' },
                    UI.button({ icon: 'chevron-left', iconOnly: true, size: 'xs', variant: 'ghost', label: 'Chapitre précédent', shortcut: 'PageUp', disabled: i === 0, onClick: () => this.store.selectChapterAt(i - 1) }),
                    UI.button({ icon: 'chevron-right', iconOnly: true, size: 'xs', variant: 'ghost', label: 'Chapitre suivant', shortcut: 'PageDown', disabled: i === cfg.chapters.length - 1, onClick: () => this.store.selectChapterAt(i + 1) }))));

            // Contenu
            let body = this.section({ id: 'ch-content', key: 'content', title: 'Contenu', icon: 'type' });
            const title = UI.textInput({ value: ch.title, placeholder: 'Titre du chapitre', onInput: v => this.setCh({ title: v }, 'Titre du chapitre', 'title') });
            title.input.addEventListener('blur', () => {
                const c = this.store.selectedChapter();
                if (c && c.title !== c.title.trim()) this.setCh({ title: c.title.trim() }, 'Titre du chapitre', 'title');
                this.store.breakGroup();
            });
            this.bind((cfg2, c) => c && title.set(c.title));
            body.appendChild(UI.field('Titre', title));
            body.appendChild(this.imageField(ch));
            if (ch.image) this.imageTextFields(body);
            body.appendChild(UI.field('Texte', h('div', { class: 'insp-inline-actions' },
                UI.button({ label: 'Écrire dans le panneau', icon: 'edit', size: 'sm', onClick: () => this.editor.focusChapterText() }),
                UI.button({ label: 'Code HTML…', icon: 'code', size: 'sm', variant: 'ghost', onClick: () => this.editor.editDescriptionHtml() })),
                { hint: 'Cliquez directement dans le texte du panneau, sur la carte, pour l’écrire et le mettre en forme.' }));

            // Disposition
            body = this.section({ id: 'ch-layout', key: 'layout', title: 'Disposition', icon: 'panel-left' });
            const align = UI.segmented({
                value: ch.align, large: true, label: 'Alignement du panneau',
                options: M.ALIGNMENTS.map(a => ({ value: a.value, label: a.label, short: a.short, icon: a.icon, tip: a.label })),
                onChange: v => this.setCh({ align: v }, 'Alignement du panneau')
            });
            this.bind((c2, c) => c && align.set(c.align));
            body.appendChild(UI.field('Position du panneau', align, { hint: 'Sur mobile, le panneau occupe toujours 90 % de la largeur.' }));
            const hidden = UI.toggle({ checked: ch.hidden, onChange: v => this.setCh({ hidden: v }, v ? 'Masquer le panneau' : 'Afficher le panneau') });
            this.bind((c2, c) => c && hidden.set(c.hidden));
            body.appendChild(UI.fieldRow('Masquer le panneau', hidden, { hint: 'Le texte est invisible mais la carte se déplace quand le lecteur atteint ce chapitre.' }));

            // Cadrage
            body = this.section({ id: 'ch-view', key: 'view', title: 'Cadrage de la carte', icon: 'map' });
            body.appendChild(h('div', { class: 'callout callout-info insp-tip' }, SM.icon('info', 15),
                h('p', {}, 'Déplacez, zoomez ou inclinez directement la carte : le cadrage est enregistré automatiquement.')));
            const view = () => (this.store.selectedChapter() || ch).view;
            const setGroup = (key, patch, label, group) => {
                const k = this.idx();
                this.store.setChapterGroup(k, key, patch, { label, group: 'insp:' + group + ':' + this.store.config.chapters[k].id, source: 'inspector' });
            };
            const setView = (patch, label, group) => setGroup('view', patch, label, group);
            const lng = UI.numberInput({ value: ch.view.center[0], min: -180, max: 180, decimals: 5, step: 0.0001, label: 'Longitude', onChange: v => setView({ center: [v, view().center[1]] }, 'Longitude', 'lng') });
            const lat = UI.numberInput({ value: ch.view.center[1], min: -85.05, max: 85.05, decimals: 5, step: 0.0001, label: 'Latitude', onChange: v => setView({ center: [view().center[0], v] }, 'Latitude', 'lat') });
            lng.input.classList.add('input');
            lat.input.classList.add('input');
            lng.input.style.width = lat.input.style.width = '100%';
            this.bind((c2, c) => { if (c) { lng.set(c.view.center[0]); lat.set(c.view.center[1]); } });
            body.appendChild(h('div', { class: 'field-grid' }, UI.field('Longitude', lng), UI.field('Latitude', lat)));
            const zoom = UI.slider({ min: 0, max: 22, step: 0.01, decimals: 2, value: ch.view.zoom, label: 'Zoom', onInput: v => setView({ zoom: v }, 'Zoom', 'zoom') });
            const pitch = UI.slider({ min: 0, max: M.MAX_PITCH, step: 0.5, decimals: 1, unit: '°', value: ch.view.pitch, label: 'Inclinaison', onInput: v => setView({ pitch: v }, 'Inclinaison', 'pitch') });
            const bearing = UI.slider({ min: -180, max: 180, step: 0.5, decimals: 1, unit: '°', value: ch.view.bearing, label: 'Orientation', onInput: v => setView({ bearing: v }, 'Orientation', 'bearing') });
            this.bind((c2, c) => { if (c) { zoom.set(c.view.zoom); pitch.set(c.view.pitch); bearing.set(c.view.bearing); } });
            body.appendChild(UI.field('Zoom', zoom));
            body.appendChild(UI.field('Inclinaison', pitch, { tip: 'De 0° (vue du dessus) à 60° (maximum de MapLibre).' }));
            body.appendChild(UI.field('Orientation', bearing, { tip: 'Rotation de la carte : 0° = nord en haut.' }));
            body.appendChild(h('div', { class: 'insp-inline-actions' },
                UI.button({ label: 'Copier', icon: 'copy', size: 'xs', onClick: () => this.editor.copyView() }),
                UI.button({ label: 'Coller', icon: 'paste', size: 'xs', onClick: () => this.editor.pasteView() }),
                i > 0 ? UI.button({ label: 'Vue du précédent', icon: 'arrow-up', size: 'xs', onClick: () => this.editor.copyPreviousView() }) : null,
                UI.button({ label: 'À plat', icon: 'compass', size: 'xs', variant: 'ghost', tip: 'Remet l’inclinaison et l’orientation à 0', onClick: () => setView({ pitch: 0, bearing: 0 }, 'Vue à plat', 'flat') })));
            // Vue d'ensemble : sans marqueur (ni point sur la mini-carte)
            if (cfg.marker.show || cfg.inset.show) {
                const shown = UI.toggle({ checked: ch.marker !== false, onChange: v => this.setCh({ marker: v ? undefined : false }, v ? 'Marqueur affiché sur le chapitre' : 'Marqueur masqué sur le chapitre') });
                this.bind((c2, c) => c && shown.set(c.marker !== false));
                body.appendChild(UI.fieldRow('Afficher le marqueur', shown, {
                    hint: 'Désactivez-le pour une vue d’ensemble (introduction, conclusion…) : ni marqueur, ni point sur la mini-carte.'
                }));
            }
            // Trajet entre les marqueurs : ce chapitre en est-il une étape ?
            if (cfg.route.show) {
                const stop = UI.toggle({ checked: ch.route !== false, onChange: v => this.setCh({ route: v ? undefined : false }, v ? 'Chapitre étape du trajet' : 'Chapitre retiré du trajet') });
                this.bind((c2, c) => c && stop.set(c.route !== false));
                body.appendChild(UI.fieldRow('Étape du trajet', stop, {
                    hint: 'Le trajet entre les marqueurs passe par le marqueur de ce chapitre. Désactivez-le pour une vue d’ensemble (introduction, conclusion…).'
                }));
            }

            // Données sur la carte
            this.renderChapterData(ch);

            // Transition
            body = this.section({ id: 'ch-anim', key: 'anim', title: 'Transition', icon: 'route' });
            const transition = () => (this.store.selectedChapter() || ch).transition;
            const setTransition = (patch, label, group) => setGroup('transition', patch, label, group);
            const anim = UI.segmented({
                value: ch.transition.type, label: 'Animation',
                options: M.ANIMATIONS.map(a => ({ value: a.value, label: a.label, tip: a.description })),
                onChange: v => setTransition({ type: v }, 'Type d’animation', 'type')
            });
            this.bind((c2, c) => c && anim.set(c.transition.type));
            const animDesc = h('div', { class: 'field-hint' });
            this.bind((c2, c) => { if (c) animDesc.textContent = (M.ANIMATIONS.find(a => a.value === c.transition.type) || M.ANIMATIONS[0]).description; });
            body.appendChild(UI.field('Arrivée sur ce chapitre', h('div', {}, anim.el, animDesc)));
            if (ch.transition.type === 'flyTo') {
                const speed = UI.slider({ min: 0.1, max: 3, step: 0.05, decimals: 2, value: ch.transition.speed, fallback: 1.2, allowEmpty: true, placeholder: '1,2', label: 'Vitesse', onInput: v => setTransition({ speed: v }, 'Vitesse de l’animation', 'speed') });
                const curve = UI.slider({ min: 0.5, max: 3, step: 0.01, decimals: 2, value: ch.transition.curve, fallback: 1.42, allowEmpty: true, placeholder: '1,42', label: 'Courbe', onInput: v => setTransition({ curve: v }, 'Courbe de l’animation', 'curve') });
                this.bind((c2, c) => { if (c) { speed.set(c.transition.speed); curve.set(c.transition.curve); } });
                body.appendChild(UI.field('Vitesse', speed, { tip: 'Plus la valeur est basse, plus le vol est lent. Défaut : 1,2.', aside: this.resetLink(() => setTransition({ speed: undefined }, 'Vitesse par défaut', 'speed'), () => transition().speed !== undefined) }));
                body.appendChild(UI.field('Courbe', curve, { tip: 'Amplitude du dézoom pendant le vol. Défaut : 1,42.', aside: this.resetLink(() => setTransition({ curve: undefined }, 'Courbe par défaut', 'curve'), () => transition().curve !== undefined) }));
            } else if (ch.transition.type === 'easeTo') {
                const dur = UI.slider({ min: 0, max: 10000, step: 100, decimals: 0, unit: 'ms', value: ch.transition.duration, fallback: 500, allowEmpty: true, placeholder: '500', label: 'Durée', onInput: v => setTransition({ duration: v }, 'Durée de l’animation', 'duration') });
                this.bind((c2, c) => { if (c) dur.set(c.transition.duration); });
                body.appendChild(UI.field('Durée', dur, { tip: 'En millisecondes. Défaut : 500 ms.', aside: this.resetLink(() => setTransition({ duration: undefined }, 'Durée par défaut', 'duration'), () => transition().duration !== undefined) }));
            }
            const rotate = UI.toggle({ checked: ch.rotate, onChange: v => this.setCh({ rotate: v }, 'Rotation lente') });
            this.bind((c2, c) => c && rotate.set(c.rotate));
            body.appendChild(UI.fieldRow('Rotation lente à l’arrivée', rotate, { hint: 'La carte pivote de 180° en 30 secondes.' }));
            if (cfg.autoplay) {
                // Lecture automatique : durée propre à ce chapitre (vide = durée par défaut de la storymap)
                const seconds = v => U.formatNumber(v) + ' s';
                const delay = UI.slider({
                    min: 0, max: 60, step: 0.5, decimals: 1, unit: 's', allowEmpty: true, label: 'Durée d’affichage',
                    value: ch.autoplayDelay, fallback: cfg.autoplayDelay, placeholder: U.formatNumber(cfg.autoplayDelay),
                    onInput: v => this.setCh({ autoplayDelay: v }, 'Durée d’affichage du chapitre', 'delay')
                });
                this.bind((c2, c) => {
                    if (!c) return;
                    delay.setFallback(c2.autoplayDelay, U.formatNumber(c2.autoplayDelay));
                    delay.set(c.autoplayDelay);
                });
                body.appendChild(UI.field('Durée d’affichage (lecture automatique)', delay, {
                    tip: 'Temps pendant lequel ce chapitre reste affiché, une fois la transition terminée, avant de passer au suivant. Vide : durée par défaut de la storymap (' + seconds(cfg.autoplayDelay) + ').',
                    aside: this.resetLink(() => this.setCh({ autoplayDelay: undefined }, 'Durée d’affichage par défaut'), () => (this.store.selectedChapter() || {}).autoplayDelay !== undefined)
                }));
            }
            body.appendChild(UI.button({ label: 'Tester la transition', icon: 'play', size: 'sm', block: true, onClick: () => this.editor.canvas.playTransition() }));

            // Couches
            const nRules = ch.layers.enter.length + ch.layers.exit.length;
            body = this.section({ id: 'ch-layers', key: 'layers', title: 'Couches', icon: 'layers', open: false, badge: nRules ? String(nRules) : null });
            body.appendChild(h('p', { class: 'field-hint', style: 'margin:0 0 12px' },
                'Modifiez l’opacité de couches du fond de carte quand le lecteur arrive sur ce chapitre ou le quitte. Le résultat est visible directement sur la carte.'));
            body.appendChild(this.rulesEditor('enter', 'À l’arrivée sur le chapitre'));
            body.appendChild(this.rulesEditor('exit', 'Au départ du chapitre'));

            // Avancé
            body = this.section({ id: 'ch-advanced', key: 'advanced', title: 'Avancé', icon: 'code', open: false });
            const idInput = UI.textInput({ value: ch.id, spellcheck: false, className: 'mono' });
            idInput.input.addEventListener('change', () => this.editor.renameChapter(this.idx(), idInput.get()));
            this.bind((c2, c) => c && idInput.set(c.id));
            body.appendChild(UI.field('Identifiant', idInput, { hint: 'Identifiant unique : lettres, chiffres et tirets. Il sert d’ancre dans la page publiée (ex. page.html#' + ch.id + ' ouvre la storymap sur ce chapitre).' }));

            // Actions
            const n = cfg.chapters.length;
            this.body.appendChild(h('div', { class: 'insp-footer-actions' },
                UI.button({ label: 'Dupliquer', icon: 'copy', size: 'sm', shortcut: 'Mod+D', onClick: () => this.editor.duplicateChapter(this.idx()) }),
                UI.button({ label: 'Supprimer', icon: 'trash', size: 'sm', variant: 'ghost', className: 'danger-text', disabled: n <= 1, onClick: () => this.editor.removeChapter(this.idx()) })));
        }

        resetLink(fn, visible) {
            const b = h('button', { type: 'button', class: 'reset-link' }, 'Par défaut');
            b.addEventListener('click', fn);
            this.bind(() => { b.style.visibility = visible() ? 'visible' : 'hidden'; });
            return b;
        }

        imageField(ch) {
            const wrap = h('div', { class: 'insp-image' });
            const info = h('div', { class: 'insp-image-info' });
            if (ch.image) {
                const img = h('img', { src: ch.image, alt: '', decoding: 'async' });
                const preview = h('div', { class: 'insp-image-preview' }, img);
                img.addEventListener('error', () => {
                    U.clear(preview);
                    preview.classList.add('broken');
                    preview.appendChild(h('span', {}, SM.icon('alert', 18), 'Image introuvable'));
                });
                wrap.appendChild(preview);
                const embedded = M.isDataUrl(ch.image);
                const bytes = embedded ? SM.images.dataUrlBytes(ch.image) : 0;
                const mime = embedded ? SM.images.dataUrlMime(ch.image).replace('image/', '').replace('svg+xml', 'svg').toUpperCase() : '';
                info.appendChild(h('span', { class: 'badge ' + (embedded ? 'badge-success' : 'badge-warning') }, SM.icon(embedded ? 'check' : 'alert', 12), embedded ? 'Intégrée' : 'Non intégrée'));
                const text = h('span', {}, embedded ? mime + ' · ' + U.formatBytes(bytes) : U.truncate(ch.image, 38));
                info.appendChild(text);
                if (embedded) SM.images.dimensions(ch.image).then(d => { if (d.width) text.textContent = mime + ' · ' + d.width + ' × ' + d.height + ' · ' + U.formatBytes(bytes); });
                wrap.appendChild(info);
                const actions = h('div', { class: 'insp-inline-actions' },
                    UI.button({ label: 'Remplacer', icon: 'image', size: 'xs', onClick: () => this.editor.pickChapterImage(this.idx()) }),
                    UI.button({ label: 'URL…', icon: 'link', size: 'xs', onClick: () => this.editor.chapterImageFromUrl(this.idx()) }),
                    !embedded ? UI.button({ label: 'Intégrer', icon: 'download', size: 'xs', variant: 'primary', onClick: () => this.editor.resolveImages() }) : null,
                    embedded && bytes > 600 * 1024 && !/svg|gif/i.test(mime) ? UI.button({ label: 'Alléger', icon: 'sparkles', size: 'xs', tip: 'Redimensionner et recompresser l’image', onClick: () => this.editor.optimizeChapterImage(this.idx()) }) : null,
                    UI.button({ label: 'Retirer', icon: 'trash', size: 'xs', variant: 'ghost', className: 'danger-text', onClick: () => this.editor.removeChapterImage(this.idx()) }));
                wrap.appendChild(actions);
            } else {
                const drop = h('button', { type: 'button', class: 'insp-dropzone' }, SM.icon('image-plus', 22),
                    h('strong', {}, 'Ajouter une image'), h('span', {}, 'Cliquez, glissez-déposez ou collez une image'));
                drop.addEventListener('click', () => this.editor.pickChapterImage(this.idx()));
                drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
                drop.addEventListener('dragleave', () => drop.classList.remove('over'));
                drop.addEventListener('drop', e => {
                    e.preventDefault();
                    e.stopPropagation();
                    drop.classList.remove('over');
                    const f = Array.from(e.dataTransfer.files || []).find(x => (x.type || SM.images.mimeForName(x.name)).startsWith('image/'));
                    if (f) this.editor.setChapterImageFromFile(this.idx(), f);
                });
                wrap.appendChild(drop);
                wrap.appendChild(h('div', { class: 'insp-inline-actions', style: 'margin-top:8px' },
                    UI.button({ label: 'Depuis une URL…', icon: 'link', size: 'xs', variant: 'ghost', onClick: () => this.editor.chapterImageFromUrl(this.idx()) })));
            }
            return UI.field('Image', wrap);
        }

        /** Texte alternatif, légende et crédit de l'image du chapitre. */
        imageTextFields(body) {
            const ch = this.store.selectedChapter();
            const field = (key, label, o) => {
                const input = UI.textInput({
                    value: ch[key], placeholder: o.placeholder, multiline: !!o.multiline, rows: o.multiline ? 2 : undefined, label,
                    onInput: v => this.setCh({ [key]: o.multiline ? v.replace(/\s*\n\s*/g, ' ') : v }, label, key)
                });
                // Une seule ligne, sans espaces superflus
                input.input.addEventListener('blur', () => {
                    const c = this.store.selectedChapter();
                    const v = c ? (c[key] || '').replace(/\s+/g, ' ').trim() : '';
                    if (c && v !== c[key]) this.setCh({ [key]: v }, label, key);
                    this.store.breakGroup();
                });
                if (o.multiline) input.input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); input.input.blur(); } });
                this.bind((c2, c) => c && input.set(c[key]));
                body.appendChild(UI.field(label, input, { hint: o.hint, tip: o.tip }));
            };
            field('imageAlt', 'Texte alternatif', {
                multiline: true, placeholder: 'Ex. : le Golden Gate Bridge au coucher du soleil',
                hint: 'Décrit l’image pour les personnes malvoyantes (lecteurs d’écran) et quand elle ne s’affiche pas. Laissez vide si elle est purement décorative.'
            });
            field('imageCaption', 'Légende', {
                placeholder: 'Affichée sous l’image (facultative)',
                tip: 'Vous pouvez aussi l’écrire directement sous l’image, sur la carte.'
            });
            field('imageCredit', 'Crédit', {
                placeholder: 'Ex. : Photo : Jean Dupont / Unsplash',
                tip: 'Auteur et source de l’image, affichés sous la légende.'
            });
        }

        /** Règles de couches d'un chapitre : key = 'enter' (arrivée) ou 'exit' (départ). */
        rulesEditor(key, label) {
            const ch = this.store.selectedChapter();
            const rules = ch.layers[key];
            const box = h('div', { class: 'rules' }, h('div', { class: 'rules-label' }, label));
            const setRules = (next, lbl) => {
                const i = this.idx();
                this.store.setChapterGroup(i, 'layers', { [key]: next }, { label: lbl || 'Règles de couches', group: 'rules:' + key + ':' + this.store.config.chapters[i].id, source: 'inspector' });
            };
            const current = () => this.store.selectedChapter().layers[key];
            rules.forEach((rule, k) => {
                const layerInput = h('input', { class: 'input input-sm mono', list: this.datalist.id, value: rule.layer, placeholder: 'nom-de-la-couche', spellcheck: 'false', 'aria-label': 'Couche' });
                const warn = h('span', { class: 'rule-warn', 'data-tip': 'Couche introuvable dans le fond de carte actuel : la règle sera sans effet.' }, SM.icon('alert', 14));
                const refreshWarn = () => { warn.style.display = this.layers.length && !this.layers.some(l => l.id === layerInput.value.trim()) ? '' : 'none'; };
                layerInput.addEventListener('change', () => {
                    const v = layerInput.value.trim();
                    if (!v) { layerInput.value = current()[k].layer; return; }
                    const next = current().slice();
                    next[k] = Object.assign({}, next[k], { layer: v });
                    setRules(next, 'Couche de la règle');
                    refreshWarn();
                });
                this.bind(() => { const r = current()[k]; if (r && document.activeElement !== layerInput) layerInput.value = r.layer; refreshWarn(); });
                const opacity = UI.slider({
                    min: 0, max: 1, step: 0.05, decimals: 2, value: rule.opacity, label: 'Opacité',
                    onInput: v => { const next = current().slice(); next[k] = Object.assign({}, next[k], { opacity: v }); setRules(next, 'Opacité de la couche'); }
                });
                const duration = UI.numberInput({
                    value: rule.duration, min: 0, max: 60000, step: 100, decimals: 0, placeholder: '0', allowEmpty: true, unit: 'ms', label: 'Durée de transition',
                    onChange: v => {
                        const next = current().slice();
                        const r = Object.assign({}, next[k]);
                        if (v === undefined || v === 0) delete r.duration; else r.duration = v;
                        next[k] = r;
                        setRules(next, 'Durée de transition');
                    }
                });
                this.bind(() => { const r = current()[k]; if (r) { opacity.set(r.opacity); duration.set(r.duration); } });
                const del = UI.button({ icon: 'x', iconOnly: true, size: 'xs', variant: 'ghost', label: 'Supprimer la règle', onClick: () => { const next = current().slice(); next.splice(k, 1); setRules(next, 'Suppression d’une règle'); } });
                box.appendChild(h('div', { class: 'rule' },
                    h('div', { class: 'rule-row' }, layerInput, warn, del),
                    h('div', { class: 'rule-row' }, h('span', { class: 'rule-lbl' }, 'Opacité'), opacity.el),
                    h('div', { class: 'rule-row' }, h('span', { class: 'rule-lbl' }, 'Transition'), duration.el)));
                refreshWarn();
            });
            box.appendChild(UI.button({
                label: 'Ajouter une règle', icon: 'plus', size: 'xs', variant: 'ghost', onClick: () => {
                    const layer = this.layers.length ? (this.layers.find(l => /building|bâti/i.test(l.id)) || this.layers[0]).id : '';
                    const next = current().concat([{ layer: layer || 'nom-de-la-couche', opacity: key === 'enter' ? 1 : 0, duration: 1000 }]);
                    setRules(next, 'Ajout d’une règle de couche');
                }
            }));
            return box;
        }

        updateLayerList() {
            U.clear(this.datalist);
            for (const l of this.layers) this.datalist.appendChild(h('option', { value: l.id, label: M.LAYER_TYPE_LABELS[l.type] || l.type }));
            this.update();
        }

        /* ---------- Calques de données ---------- */

        /** Pastille d'un calque : trait, surface ou point, à sa couleur. */
        dataChip(d) {
            const s = SM.geodata.stats(d.geojson);
            const kind = s.lines || (d.connect && s.points >= 2) ? 'is-line' : s.polygons ? 'is-area' : 'is-point';
            return h('span', { class: 'data-chip ' + kind, 'aria-hidden': 'true' });
        }

        /**
         * Pastille : première icône d'origine (calque de points), sinon couleur du
         * calque ou couleurs d'origine du fichier (bandes, secteurs).
         */
        paintChip(chip, d) {
            const icons = d.style.fileIcons !== false && chip.classList.contains('is-point') ? SM.geodata.stats(d.geojson).icons : [];
            chip.classList.toggle('has-icon', icons.length > 0);
            if (icons.length) chip.style.setProperty('--chip-icon', 'url("' + d.geojson.icons[icons[0]].src + '")');
            else chip.style.removeProperty('--chip-icon');
            const colors = d.style.fileColors !== false ? SM.geodata.stats(d.geojson).colors.slice(0, 4) : [];
            chip.style.color = colors[0] || d.style.color;
            if (colors.length < 2) { chip.style.removeProperty('--chip-fill'); return; }
            const stops = colors.map((c, i) => c + ' ' + Math.round(i / colors.length * 100) + '% ' + Math.round((i + 1) / colors.length * 100) + '%').join(', ');
            chip.style.setProperty('--chip-fill', chip.classList.contains('is-point') ? 'conic-gradient(' + stops + ')' : 'linear-gradient(90deg, ' + stops + ')');
        }

        commitData(next, label, group) {
            this.store.commit(next, { label, group, source: 'inspector' });
        }

        /** Chapitre : calques affichés à l'arrivée sur ce chapitre. */
        renderChapterData(ch) {
            const cfg = this.store.config;
            const section = UI.section({ id: 'ch-data', title: 'Données sur la carte', icon: 'geodata' });
            section.el.dataset.section = 'data';
            this.body.appendChild(section.el);
            const body = section.body;
            // Nombre de calques visibles : mis à jour sans reconstruire la section (le focus reste en place)
            this.bind((c2, c) => {
                if (c) section.setBadge(c2.data.length ? c2.data.filter(d => M.dataShown(d, c.id)).length + ' / ' + c2.data.length : null);
            });
            if (!cfg.data.length) {
                body.appendChild(h('p', { class: 'field-hint', style: 'margin:0 0 10px' },
                    'Traces GPS, itinéraires, zones, points d’intérêt : importez vos fichiers GeoJSON, GPX ou KML pour les afficher sur la carte.'));
                body.appendChild(UI.button({ label: 'Importer des données…', icon: 'upload', size: 'sm', onClick: () => this.editor.pickData() }));
                return;
            }
            body.appendChild(h('p', { class: 'field-hint', style: 'margin:0 0 10px' }, 'Calques visibles quand le lecteur arrive sur ce chapitre (apparition en fondu).'));
            const rows = h('div', { class: 'data-rows' });
            // Du calque dessiné au-dessus au calque dessiné en dessous
            cfg.data.slice().reverse().forEach(d => {
                const id = d.id;
                const chip = this.dataChip(d);
                const name = h('span', { class: 'data-row-name' });
                const toggle = UI.toggle({
                    label: 'Afficher « ' + d.name + ' » dans ce chapitre',
                    onChange: v => {
                        const c = this.store.config;
                        const k = c.data.findIndex(x => x.id === id);
                        const chapter = this.store.selectedChapter();
                        if (k >= 0 && chapter) this.commitData(M.ops.showDataIn(c, k, chapter.id, v), v ? 'Calque affiché dans le chapitre' : 'Calque masqué dans le chapitre');
                    }
                });
                const fit = UI.button({ icon: 'target', iconOnly: true, size: 'xs', variant: 'ghost', label: 'Cadrer ce chapitre sur « ' + d.name + ' »', onClick: () => this.editor.fitData([id]) });
                this.bind((c2, c) => {
                    const x = c2.data.find(y => y.id === id);
                    if (!x || !c) return;
                    this.paintChip(chip, x);
                    name.textContent = x.name;
                    toggle.set(M.dataShown(x, c.id));
                });
                rows.appendChild(h('div', { class: 'data-row' }, chip, name, fit, toggle.el));
                if (M.isTraced(d)) rows.appendChild(this.traceControl(id));
            });
            body.appendChild(rows);
            body.appendChild(h('div', { class: 'insp-inline-actions', style: 'margin-top:10px' },
                UI.button({ label: 'Importer…', icon: 'upload', size: 'xs', onClick: () => this.editor.pickData() }),
                UI.button({ label: 'Style et chapitres…', icon: 'sliders', size: 'xs', variant: 'ghost', onClick: () => this.showStoryTab('data') })));
        }

        /** Chapitre : part d'un tracé progressif dessinée (vide : jusqu'au marqueur du chapitre). */
        traceControl(id) {
            // Valeur automatique : celle que donnerait le marqueur, sans réglage propre au chapitre
            const auto = () => {
                const cfg = this.store.config;
                const i = this.idx();
                const d = cfg.data.find(x => x.id === id);
                return d && i >= 0 ? SMPlayer.traceTargets(d, cfg.chapters, i)[i] || 0 : 0;
            };
            const set = (v, label) => {
                const i = this.idx();
                const ch = this.store.config.chapters[i];
                if (ch) this.commitData(M.ops.setChapterProgress(this.store.config, i, id, v), label, v === undefined ? null : 'progress:' + ch.id + ':' + id);
            };
            const slider = UI.slider({
                min: 0, max: 100, step: 1, decimals: 0, unit: '%', allowEmpty: true, label: 'Part du tracé dessinée dans ce chapitre',
                onInput: v => set(v === undefined ? undefined : v / 100, 'Tracé dessiné')
            });
            const reset = h('button', { type: 'button', class: 'reset-link', 'data-tip': 'Tracé dessiné jusqu’au marqueur du chapitre' }, 'Auto');
            reset.addEventListener('click', () => set(undefined, 'Tracé jusqu’au marqueur'));
            const row = h('div', { class: 'data-trace' },
                h('span', { class: 'data-trace-label', tabindex: '0', 'data-tip': 'Part du tracé dessinée à l’arrivée sur ce chapitre. Auto : jusqu’au point du tracé le plus proche du marqueur, sans jamais revenir en arrière (une vue d’ensemble s’adapte aux autres chapitres).' }, 'Tracé'),
                slider.el, reset);
            this.bind((c2, c) => {
                const x = c2.data.find(y => y.id === id);
                if (!x || !c) return;
                row.hidden = !M.dataShown(x, c.id);
                const a = Math.round(auto() * 100);
                slider.setFallback(a, String(a));
                const own = c.progress && U.isNum(c.progress[id]) ? Math.round(c.progress[id] * 100) : undefined;
                slider.set(own);
                reset.style.visibility = own === undefined ? 'hidden' : 'visible';
            });
            return row;
        }

        /** Storymap : import, style et chapitres de chaque calque. */
        renderDataSection() {
            const cfg = this.store.config;
            const body = this.section({ id: 'st-data', key: 'data', title: 'Données sur la carte', icon: 'geodata', badge: cfg.data.length ? String(cfg.data.length) : null });
            if (!cfg.data.length) {
                body.appendChild(h('p', { class: 'field-hint', style: 'margin:0 0 12px' },
                    'Ajoutez vos propres données sur la carte : traces GPS, itinéraires, zones, points d’intérêt… Elles s’affichent dans tous les chapitres, ou seulement dans ceux que vous choisissez.'));
            } else {
                const list = h('div', { class: 'data-list' });
                const n = cfg.data.length;
                // Le calque en haut de la liste est dessiné au-dessus des autres
                cfg.data.slice().reverse().forEach((d, k) => list.appendChild(this.dataCard(d, n - 1 - k)));
                body.appendChild(list);
            }
            const drop = h('button', { type: 'button', class: 'insp-dropzone' + (cfg.data.length ? ' compact' : '') }, SM.icon('upload', cfg.data.length ? 17 : 21),
                h('strong', {}, cfg.data.length ? 'Importer d’autres données' : 'Importer des données'),
                h('span', {}, 'GeoJSON, GPX, KML ou KMZ — cliquez ou glissez-déposez'));
            drop.addEventListener('click', () => this.editor.pickData());
            drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
            drop.addEventListener('dragleave', () => drop.classList.remove('over'));
            drop.addEventListener('drop', e => {
                e.preventDefault();
                e.stopPropagation();
                drop.classList.remove('over');
                const files = Array.from(e.dataTransfer.files || []);
                if (files.length) this.editor.importData(files);
            });
            body.appendChild(drop);
            body.appendChild(h('p', { class: 'field-hint', style: 'margin-top:8px' },
                'Traces d’applications de randonnée ou de GPS (GPX), cartes Google My Maps et Google Earth (KML, KMZ), exports de logiciels de SIG (GeoJSON en WGS 84). Les couleurs d’origine des fichiers KML et GeoJSON sont reprises, ainsi que les icônes des fichiers KML.'));
        }

        /** Carte d'un calque : en-tête (dépliable) puis style et chapitres. */
        dataCard(d, index) {
            const id = d.id;
            const cfg = this.store.config;
            const current = () => this.store.config.data.find(x => x.id === id);
            const indexOf = () => this.store.config.data.findIndex(x => x.id === id);
            const setStyle = (patch, label, group) => {
                const k = indexOf();
                if (k >= 0) this.commitData(M.ops.setDataStyle(this.store.config, k, patch), label, group ? 'data:' + group + ':' + id : null);
            };
            const stats = SM.geodata.stats(d.geojson);
            const joined = d.connect === true && stats.points >= 2; // points reliés : une ligne de plus
            const lines = stats.lines > 0 || joined;
            const open = this.openData === id;

            // En-tête : pastille, nom, contenu et chapitres
            const chip = this.dataChip(d);
            const name = h('span', { class: 'data-name' });
            const meta = h('span', { class: 'data-meta' });
            const head = h('button', { type: 'button', class: 'data-head', 'aria-expanded': String(open) },
                chip, h('span', { class: 'data-title' }, name, meta), SM.icon('chevron-down', 15, 'data-chevron'));
            head.addEventListener('click', () => { this.openData = this.openData === id ? null : id; this.render(); });
            const more = UI.button({ icon: 'more', iconOnly: true, size: 'xs', variant: 'ghost', label: 'Actions du calque' });
            const move = delta => { const k = indexOf(); if (k >= 0) this.commitData(M.ops.moveData(this.store.config, k, k + delta), delta > 0 ? 'Calque placé au-dessus' : 'Calque placé en dessous'); };
            more.addEventListener('click', () => UI.menu(more, [
                { label: 'Cadrer la carte sur ce calque', icon: 'target', onClick: () => this.editor.fitData([id]) },
                '-',
                { label: 'Placer au-dessus', icon: 'move-up', disabled: index >= cfg.data.length - 1, onClick: () => move(1) },
                { label: 'Placer en dessous', icon: 'move-down', disabled: index <= 0, onClick: () => move(-1) },
                '-',
                { label: 'Remplacer le fichier…', icon: 'upload', onClick: () => this.editor.replaceData(id) },
                { label: 'Télécharger (GeoJSON)', icon: 'download', onClick: () => this.editor.downloadData(id) },
                '-',
                { label: 'Supprimer le calque', icon: 'trash', danger: true, onClick: () => this.editor.removeData(id) }
            ], { align: 'end', minWidth: 250 }));
            this.bind(c2 => {
                const x = current();
                if (!x) return;
                this.paintChip(chip, x);
                name.textContent = x.name;
                const n = Array.isArray(x.chapters) ? x.chapters.length : c2.chapters.length;
                const where = !Array.isArray(x.chapters) ? 'tous les chapitres' : n ? U.plural(n, 'chapitre') + ' sur ' + c2.chapters.length : 'aucun chapitre';
                const linked = x.connect && SM.geodata.stats(x.geojson).points >= 2 ? ' reliés' : '';
                meta.textContent = SM.geodata.summary(x.geojson) + linked + ' · ' + where + (M.isTraced(x) ? ' · dessin progressif' : '');
            });
            const card = h('div', { class: 'data-card' + (open ? ' open' : '') }, h('div', { class: 'data-head-row' }, head, more));
            if (!open) return card;

            const body = h('div', { class: 'data-body' });
            card.appendChild(body);

            // Nom
            const nameInput = UI.textInput({
                value: d.name, placeholder: 'Nom du calque', label: 'Nom du calque',
                onInput: v => { const k = indexOf(); if (k >= 0) this.commitData(M.ops.setData(this.store.config, k, { name: v.slice(0, 80) }), 'Nom du calque', 'data:name:' + id); }
            });
            nameInput.input.addEventListener('blur', () => {
                const x = current();
                const k = indexOf();
                const v = x ? x.name.replace(/\s+/g, ' ').trim() || 'Données' : '';
                if (x && v !== x.name) this.commitData(M.ops.setData(this.store.config, k, { name: v }), 'Nom du calque', 'data:name:' + id);
                this.store.breakGroup();
            });
            this.bind(() => { const x = current(); if (x) nameInput.set(x.name); });
            body.appendChild(UI.field('Nom', nameInput, { tip: 'Pour vous repérer dans l’éditeur : il n’apparaît pas dans la storymap.' }));

            // Couleurs d'origine du fichier (stroke, fill, marker-color de chaque élément)
            const fileColors = stats.colors.length > 0 && d.style.fileColors !== false;
            if (stats.colors.length) {
                const own = UI.toggle({ checked: d.style.fileColors !== false, onChange: v => setStyle({ fileColors: v }, v ? 'Couleurs du fichier' : 'Couleur unique du calque') });
                this.bind(() => { const x = current(); if (x) own.set(x.style.fileColors !== false); });
                const swatches = h('span', { class: 'data-swatches' },
                    stats.colors.slice(0, 10).map(c => h('span', { class: 'data-swatch', style: 'background:' + c, 'data-tip': c })),
                    stats.colors.length > 10 ? h('span', { class: 'data-swatch-more' }, '+' + (stats.colors.length - 10)) : null);
                body.appendChild(UI.fieldRow('Couleurs du fichier', own, {
                    hint: h('span', {}, swatches, U.plural(stats.colors.length, 'couleur reprise', 'couleurs reprises') + ' du fichier. Désactivez pour tout afficher dans la couleur du calque.')
                }));
            }
            // Icônes d'origine des points (KML)
            const fileIcons = stats.icons.length > 0 && d.style.fileIcons !== false;
            if (stats.icons.length) {
                const own = UI.toggle({ checked: d.style.fileIcons !== false, onChange: v => setStyle({ fileIcons: v }, v ? 'Icônes du fichier' : 'Points en cercles') });
                this.bind(() => { const x = current(); if (x) own.set(x.style.fileIcons !== false); });
                const previews = h('span', { class: 'data-icons' },
                    stats.icons.slice(0, 12).map(k => h('img', { src: d.geojson.icons[k].src, alt: '' })),
                    stats.icons.length > 12 ? h('span', { class: 'data-swatch-more' }, '+' + (stats.icons.length - 12)) : null);
                body.appendChild(UI.fieldRow('Icônes du fichier', own, {
                    hint: h('span', {}, previews, U.plural(stats.icons.length, 'icône reprise', 'icônes reprises') + ' (' + U.plural(stats.iconPoints, 'point') + '). Désactivez pour afficher des cercles.')
                }));
            }

            // Style
            const color = UI.colorInput({
                value: d.style.color, presets: SM.geodata.COLORS, label: 'Couleur du calque',
                onInput: v => setStyle({ color: v }, 'Couleur du calque', 'color'),
                onChange: v => setStyle({ color: v }, 'Couleur du calque', 'color')
            });
            this.bind(() => { const x = current(); if (x) color.set(x.style.color); });
            body.appendChild(UI.field(fileColors ? 'Couleur des autres éléments' : 'Couleur', color, fileColors ? { tip: 'Pour les éléments sans couleur dans le fichier (et la ligne qui relie les points).' } : {}));
            // Trajet d'un point au suivant (villes d'un voyage, étapes…)
            if (stats.points >= 2) {
                const connect = UI.toggle({
                    checked: d.connect,
                    onChange: v => {
                        const k = indexOf();
                        if (k >= 0) this.commitData(M.ops.setData(this.store.config, k, { connect: v }), v ? 'Points reliés' : 'Points non reliés');
                    }
                });
                this.bind(() => { const x = current(); if (x) connect.set(x.connect); });
                body.appendChild(UI.fieldRow('Relier les points dans l’ordre', connect, {
                    hint: 'Une ligne va d’un point au suivant, dans l’ordre du fichier : droite entre des points proches, en arc (plus court chemin sur le globe) sur les longues distances. Elle peut se dessiner progressivement.'
                }));
            }
            const slider = (key, label, o) => {
                const toUi = v => (o.percent ? Math.round(v * 100) : v);
                const s = UI.slider({
                    min: o.min, max: o.max, step: o.step, decimals: o.decimals || 0, unit: o.unit, label, value: toUi(d.style[key]),
                    onInput: v => setStyle({ [key]: o.percent ? U.round(v / 100, 2) : v }, label, key)
                });
                this.bind(() => { const x = current(); if (x) s.set(toUi(x.style[key])); });
                body.appendChild(UI.field(o.field || label, s, { tip: o.tip }));
            };
            if (lines || stats.polygons) {
                slider('width', 'Épaisseur du trait', { min: 0.5, max: 16, step: 0.5, decimals: 1, unit: 'px', field: lines ? 'Épaisseur des lignes' : 'Épaisseur des contours' });
                const dash = UI.toggle({ checked: d.style.dash, onChange: v => setStyle({ dash: v }, v ? 'Trait en pointillés' : 'Trait continu') });
                this.bind(() => { const x = current(); if (x) dash.set(x.style.dash); });
                body.appendChild(UI.fieldRow('Pointillés', dash, { hint: 'Pour un trajet prévu, en bateau ou en avion…' }));
            }
            if (stats.polygons) slider('fillOpacity', 'Remplissage des zones', { min: 0, max: 100, step: 1, unit: '%', percent: true, tip: '0 % : contour seul.' });
            if (stats.points) slider('radius', 'Taille des points', { min: 2, max: 20, step: 0.5, decimals: 1, unit: 'px', tip: fileIcons ? 'Rayon des points, en pixels. Les icônes du fichier suivent ce réglage (taille d’origine à 6 px).' : 'Rayon des points, en pixels.' });
            if (stats.named) {
                const labels = UI.toggle({ checked: d.style.labels, onChange: v => setStyle({ labels: v }, v ? 'Noms des points affichés' : 'Noms des points masqués') });
                this.bind(() => { const x = current(); if (x) labels.set(x.style.labels); });
                body.appendChild(UI.fieldRow('Noms des points', labels, { hint: U.plural(stats.named, 'point nommé', 'points nommés') + ' (nom repris du fichier).' }));
            }
            slider('opacity', 'Opacité du calque', { min: 5, max: 100, step: 1, unit: '%', percent: true, field: 'Opacité' });

            // Dessin progressif des lignes au fil des chapitres
            if (lines) {
                const prog = UI.toggle({
                    checked: d.progressive,
                    onChange: v => {
                        const k = indexOf();
                        if (k >= 0) this.commitData(M.ops.setData(this.store.config, k, { progressive: v }), v ? 'Dessin progressif du tracé' : 'Tracé affiché en entier');
                    }
                });
                this.bind(() => { const x = current(); if (x) prog.set(x.progressive); });
                body.appendChild(UI.fieldRow('Dessin progressif', prog, {
                    hint: 'Le tracé se dessine au fil des chapitres, en suivant la carte, jusqu’au point le plus proche du marqueur de chaque chapitre. Réglable chapitre par chapitre (onglet Chapitre).'
                }));
                if (d.progressive) {
                    const ghost = UI.toggle({ checked: d.style.ghost, onChange: v => setStyle({ ghost: v }, v ? 'Parcours restant visible' : 'Parcours restant masqué') });
                    this.bind(() => { const x = current(); if (x) ghost.set(x.style.ghost); });
                    body.appendChild(UI.fieldRow('Parcours restant en transparence', ghost, { hint: 'La suite du tracé reste visible, en pâle, avant d’être dessinée.' }));
                }
            }

            // Chapitres où le calque est affiché
            const setChapters = (list, label) => { const k = indexOf(); if (k >= 0) this.commitData(M.ops.setDataChapters(this.store.config, k, list), label); };
            const boxes = h('div', { class: 'data-chapters', role: 'group', 'aria-label': 'Chapitres où le calque est affiché' });
            const items = cfg.chapters.map((ch, k) => {
                const cb = h('input', { type: 'checkbox' });
                cb.addEventListener('change', () => {
                    const c = this.store.config;
                    const j = indexOf();
                    if (j >= 0) this.commitData(M.ops.showDataIn(c, j, ch.id, cb.checked), cb.checked ? 'Calque affiché dans un chapitre' : 'Calque masqué dans un chapitre');
                });
                const label = h('span', { class: 'data-chapter-title' });
                boxes.appendChild(h('label', { class: 'data-chapter' }, cb, h('span', { class: 'data-chapter-num' }, String(k + 1)), label));
                return { cb, label, id: ch.id };
            });
            this.bind(c2 => {
                const x = current();
                if (!x) return;
                items.forEach(it => {
                    const k = c2.chapters.findIndex(c => c.id === it.id);
                    it.cb.checked = M.dataShown(x, it.id);
                    it.label.textContent = k >= 0 ? M.chapterLabel(c2.chapters[k], k) : '';
                });
            });
            const link = (text, fn) => h('button', { type: 'button', class: 'reset-link', onclick: fn }, text);
            body.appendChild(UI.field('Affiché dans', boxes, {
                aside: h('span', { class: 'data-chapter-links' },
                    link('Tous', () => setChapters(undefined, 'Calque affiché dans tous les chapitres')),
                    link('Aucun', () => setChapters([], 'Calque masqué dans tous les chapitres'))),
                hint: 'Le calque apparaît en fondu quand le lecteur arrive sur un chapitre coché. Un nouveau chapitre reprend les calques du chapitre à la suite duquel il est ajouté.'
            }));

            body.appendChild(h('div', { class: 'insp-inline-actions' },
                UI.button({ label: 'Cadrer la carte', icon: 'target', size: 'xs', tip: 'Cadre le chapitre affiché sur ce calque', onClick: () => this.editor.fitData([id]) }),
                UI.button({ label: 'Supprimer', icon: 'trash', size: 'xs', variant: 'ghost', className: 'danger-text', onClick: () => this.editor.removeData(id) })));
            return card;
        }

        /* ---------- Couverture ---------- */

        renderCover() {
            const body = this.section({ id: 'cover', key: 'cover', title: 'En-tête de la storymap', icon: 'type' });
            const field = (key, label, placeholder, hint) => {
                const input = UI.textInput({ value: this.store.config[key], placeholder, onInput: v => this.store.setStory({ [key]: v }, { label, group: 'story:' + key, source: 'inspector' }) });
                input.input.addEventListener('blur', () => this.store.breakGroup());
                this.bind(cfg => input.set(cfg[key]));
                body.appendChild(UI.field(label, input, { hint }));
            };
            field('title', 'Titre', 'Titre de la storymap');
            field('subtitle', 'Sous-titre', 'Sous-titre (facultatif)');
            field('byline', 'Signature', 'Auteur, date… (facultatif)');
            body.appendChild(h('div', { class: 'callout' }, SM.icon('info', 15),
                h('p', {}, 'L’en-tête s’affiche en haut de la storymap, au-dessus du premier chapitre. Il est masqué si les trois champs sont vides. Vous pouvez aussi écrire directement sur l’aperçu.')));
            const b2 = this.section({ id: 'cover-theme', key: 'cover-theme', title: 'Apparence', icon: 'contrast' });
            b2.appendChild(this.themeControl());
        }

        /* ---------- Pied de page ---------- */

        renderFooter() {
            const body = this.section({ id: 'footer', key: 'footer', title: 'Pied de page', icon: 'panel-full' });
            body.appendChild(h('p', { class: 'field-hint', style: 'margin:0 0 12px' }, 'Le pied de page apparaît à la fin de la storymap, après le dernier chapitre. Idéal pour les sources, crédits et liens. Il est masqué s’il est vide.'));
            body.appendChild(h('div', { class: 'insp-inline-actions' },
                UI.button({ label: 'Écrire dans l’aperçu', icon: 'edit', size: 'sm', onClick: () => this.editor.focusFooter() }),
                UI.button({ label: 'Code HTML…', icon: 'code', size: 'sm', variant: 'ghost', onClick: () => this.editor.editFooterHtml() })));
        }

        /* ---------- Réglages de la storymap ---------- */

        themeControl() {
            const theme = UI.segmented({
                value: this.store.config.theme, large: true,
                options: [{ value: 'dark', label: 'Sombre', icon: 'moon' }, { value: 'light', label: 'Clair', icon: 'sun' }],
                onChange: v => this.store.setStory({ theme: v }, { label: 'Thème des panneaux' })
            });
            this.bind(cfg => theme.set(cfg.theme));
            return UI.field('Thème des panneaux', theme, { hint: 'S’applique à l’en-tête, aux chapitres et au pied de page.' });
        }

        /**
         * Sélecteur de police : bouton affichant la police dans sa propre
         * typographie, menu groupé avec aperçus, saisie libre Google Fonts.
         * o = { value, get(), onChange(value|undefined), emptyLabel, includeSystem, label }
         */
        fontPicker(o) {
            const AP = SM.appearance;
            const btn = h('button', { type: 'button', class: 'select font-picker', 'aria-haspopup': 'menu', 'aria-label': o.label });
            const render = value => {
                const f = value ? AP.fontEntry(value) : null;
                btn.textContent = f ? f.label + (f.custom ? ' (Google Fonts)' : '') : o.emptyLabel;
                btn.style.fontFamily = f ? f.css : '';
            };
            render(o.value);
            btn.addEventListener('click', () => {
                AP.loadFontPreviews();
                const current = o.get();
                const items = [{ label: o.emptyLabel, checked: !current, onClick: () => o.onChange(undefined) }];
                const cur = current ? AP.fontEntry(current) : null;
                if (cur && cur.custom) items.push({ label: cur.label, desc: 'Google Fonts (police saisie)', labelStyle: 'font-family:' + cur.css, checked: true, onClick: () => { } });
                let group = null;
                for (const f of AP.FONTS) {
                    if (f.id === 'system' && !o.includeSystem) continue;
                    if (f.group !== group) { group = f.group; items.push('-', { heading: group }); }
                    items.push({
                        label: f.label, labelStyle: 'font-family:' + f.css + ';font-size:14px',
                        checked: current === f.id, onClick: () => o.onChange(f.id)
                    });
                }
                items.push('-', { label: 'Autre police Google Fonts…', icon: 'search', onClick: () => this.customFont(o) });
                UI.menu(btn, items, { minWidth: 250 });
            });
            return { el: btn, set: render };
        }

        async customFont(o) {
            const AP = SM.appearance;
            const name = await UI.prompt({
                title: 'Autre police Google Fonts', icon: 'type', label: 'Nom de la police', placeholder: 'ex. Josefin Sans',
                hint: 'Nom exact, tel qu’il apparaît sur fonts.google.com (majuscules comprises). La police est chargée depuis Google Fonts, dans l’éditeur comme dans la storymap publiée.',
                confirmLabel: 'Utiliser',
                validate: v => (AP.isValidFontName(v) ? null : 'Lettres, chiffres, espaces et tirets uniquement.')
            });
            if (!name) return;
            const n = name.trim();
            const t = UI.toast('Vérification de la police « ' + n + ' »…', { type: 'loading' });
            try {
                const r = await fetch(AP.googleFontsUrl([n]));
                if (!r.ok) throw new Error('HTTP ' + r.status);
                t.update('Police « ' + n + ' » trouvée sur Google Fonts.', 'success');
                o.onChange(n);
            } catch (e) {
                t.update('Police « ' + n + ' » introuvable sur Google Fonts : vérifiez l’orthographe exacte (ou votre connexion).', 'error');
            }
        }

        /** Apparence des panneaux : thème, transparence, marges, typographie. */
        renderPanelSection(set) {
            const AP = SM.appearance;
            const DEF = M.normalizePanels({});
            const ps = c => (c || this.store.config).panels;
            const setPanel = (key, value, label, live) => {
                const next = Object.assign({}, ps(), { [key]: value });
                if (value === undefined || value === null) delete next[key];
                set({ panels: M.normalizePanels(next) }, label, live ? 'story:panels:' + key : null);
            };

            const reset = UI.button({
                label: 'Par défaut', icon: 'refresh', size: 'xs', variant: 'ghost', tip: 'Revenir à l’apparence par défaut',
                onClick: () => set({ panels: DEF }, 'Apparence par défaut des panneaux')
            });
            this.bind(c => { reset.style.visibility = U.deepEqual(c.panels, DEF) ? 'hidden' : 'visible'; });
            const body = this.section({ id: 'st-panels', key: 'panels', title: 'Panneaux des chapitres', icon: 'panel-left', actions: reset });

            body.appendChild(this.themeControl());

            // Seul le fond devient transparent (le texte et les images restent opaques)
            const transpOf = c => Math.round((1 - ps(c).opacity) * 100);
            const transp = UI.slider({
                min: 0, max: 100, step: 1, decimals: 0, unit: '%', label: 'Transparence du fond', value: transpOf(),
                onInput: v => setPanel('opacity', U.round(1 - v / 100, 2), 'Transparence du fond', true)
            });
            this.bind(c => transp.set(transpOf(c)));
            body.appendChild(UI.field('Transparence du fond', transp, {
                hint: '0 % : fond totalement opaque. Seul le fond devient transparent, jamais le texte ni les images. Par défaut : ' + Math.round((1 - DEF.opacity) * 100) + ' %.',
                aside: this.resetLink(() => setPanel('opacity', undefined, 'Transparence par défaut'), () => ps().opacity !== DEF.opacity)
            }));

            body.appendChild(h('div', { class: 'insp-subhead' }, SM.icon('padding', 14), 'Marges intérieures'));
            const padY = UI.slider({ min: 0, max: 120, step: 1, decimals: 0, unit: 'px', label: 'Marge haut et bas', value: ps().paddingY, onInput: v => setPanel('paddingY', v, 'Marge intérieure (haut et bas)', true) });
            const padX = UI.slider({ min: 0, max: 150, step: 1, decimals: 0, unit: 'px', label: 'Marge gauche et droite', value: ps().paddingX, onInput: v => setPanel('paddingX', v, 'Marge intérieure (gauche et droite)', true) });
            this.bind(c => { padY.set(ps(c).paddingY); padX.set(ps(c).paddingX); });
            body.appendChild(UI.field('Haut et bas', padY));
            body.appendChild(UI.field('Gauche et droite', padX));

            const alignOptions = [
                { value: 'left', label: 'Aligné à gauche', icon: 'align-left' },
                { value: 'center', label: 'Centré', icon: 'align-center' },
                { value: 'right', label: 'Aligné à droite', icon: 'align-right' }
            ];

            body.appendChild(h('div', { class: 'insp-subhead' }, SM.icon('heading', 14), 'Titre des chapitres'));
            const titleFont = this.fontPicker({
                label: 'Police du titre', value: ps().titleFont, get: () => ps().titleFont,
                emptyLabel: 'Identique au texte', includeSystem: true,
                onChange: v => setPanel('titleFont', v, 'Police du titre')
            });
            this.bind(c => titleFont.set(ps(c).titleFont));
            body.appendChild(UI.field('Police', titleFont, {
                hint: 'S’applique aussi au titre et au sous-titre de la couverture.',
                tip: 'Par défaut, les titres utilisent la même police que le texte.'
            }));
            const autoTitle = c => U.round(ps(c).textSize * AP.TITLE_RATIO, 1);
            const titleSize = UI.slider({
                min: 8, max: 56, step: 0.5, decimals: 1, unit: 'px', allowEmpty: true, label: 'Taille du titre',
                value: ps().titleSize, fallback: autoTitle(), placeholder: String(autoTitle()),
                onInput: v => setPanel('titleSize', v, 'Taille du titre', true)
            });
            this.bind(c => {
                titleSize.setFallback(autoTitle(c), String(autoTitle(c)).replace('.', ','));
                titleSize.set(ps(c).titleSize);
            });
            body.appendChild(UI.field('Taille', titleSize, {
                tip: 'Vide : taille automatique (1,17 × la taille du texte).',
                aside: this.resetLink(() => setPanel('titleSize', undefined, 'Taille du titre automatique'), () => ps().titleSize !== undefined)
            }));
            const titleAlign = UI.segmented({ iconOnly: true, label: 'Alignement du titre', value: ps().titleAlign, options: alignOptions, onChange: v => setPanel('titleAlign', v, 'Alignement du titre') });
            this.bind(c => titleAlign.set(ps(c).titleAlign));
            body.appendChild(UI.field('Alignement', titleAlign));

            body.appendChild(h('div', { class: 'insp-subhead' }, SM.icon('type', 14), 'Texte des chapitres'));
            const textFont = this.fontPicker({
                label: 'Police du texte', value: ps().font, get: () => ps().font,
                emptyLabel: 'Police par défaut', includeSystem: false,
                onChange: v => setPanel('font', v, 'Police du texte')
            });
            this.bind(c => textFont.set(ps(c).font));
            body.appendChild(UI.field('Police', textFont, {
                hint: 'S’applique aussi à la couverture et au pied de page.',
                tip: 'Polices système (toujours disponibles) ou Google Fonts (chargées depuis Internet dans la storymap publiée).'
            }));
            const textSize = UI.slider({
                min: 8, max: 32, step: 0.5, decimals: 1, unit: 'px', label: 'Taille du texte',
                value: ps().textSize, onInput: v => setPanel('textSize', v, 'Taille du texte', true)
            });
            this.bind(c => textSize.set(ps(c).textSize));
            body.appendChild(UI.field('Taille', textSize, {
                tip: 'Sans interligne réglé, l’interligne suit la taille du texte (25 px pour 13 px).',
                aside: this.resetLink(() => setPanel('textSize', undefined, 'Taille du texte par défaut'), () => ps().textSize !== DEF.textSize)
            }));
            const autoLine = U.round(AP.LINE_RATIO, 2);
            const lineHeight = UI.slider({
                min: 1, max: 3, step: 0.05, decimals: 2, unit: '×', label: 'Interligne', allowEmpty: true,
                value: ps().lineHeight, fallback: autoLine, placeholder: String(autoLine).replace('.', ','),
                onInput: v => setPanel('lineHeight', v, 'Interligne du texte', true)
            });
            this.bind(c => lineHeight.set(ps(c).lineHeight));
            body.appendChild(UI.field('Interligne', lineHeight, {
                tip: 'Hauteur de ligne en multiple de la taille du texte : 1 = serré, 1,5 = une ligne et demie. Vide : automatique (1,92).',
                aside: this.resetLink(() => setPanel('lineHeight', undefined, 'Interligne automatique'), () => ps().lineHeight !== undefined)
            }));
            const textAlign = UI.segmented({
                iconOnly: true, label: 'Alignement du texte', value: ps().textAlign,
                options: alignOptions.concat([{ value: 'justify', label: 'Justifié', icon: 'align-justify' }]),
                onChange: v => setPanel('textAlign', v, 'Alignement du texte')
            });
            this.bind(c => textAlign.set(ps(c).textAlign));
            body.appendChild(UI.field('Alignement', textAlign));
        }

        terrainPresetId(cfg) {
            const source = cfg.terrain.source;
            const p = M.TERRAIN_PRESETS.find(t => t.url === source);
            if (p) return p.id;
            if (/api\.maptiler\.com/.test(source)) return 'maptiler';
            return 'custom';
        }

        renderStory() {
            const cfg = this.store.config;
            const set = (patch, label, group) => this.store.setStory(patch, { label, group, source: 'inspector' });

            // Fond de carte
            let body = this.section({ id: 'st-style', key: 'style', title: 'Fond de carte', icon: 'map' });
            const gallery = h('div', { class: 'style-gallery' });
            const current = M.findStylePreset(cfg.style);
            for (const p of M.STYLE_PRESETS) {
                const card = h('button', { type: 'button', class: 'style-card', 'aria-pressed': String(current === p), 'data-tip': p.description + ' · ' + p.provider },
                    h('span', { class: 'style-art' }, UI.miniMap(p.colors, { satellite: p.satellite, labels: p.labels })),
                    h('span', { class: 'style-name' }, p.name),
                    h('span', { class: 'style-provider' }, p.provider));
                card.addEventListener('click', () => set({ style: M.styleValue(p) }, 'Fond de carte'));
                gallery.appendChild(card);
            }
            body.appendChild(gallery);
            const customUrl = UI.textInput({ value: typeof cfg.style === 'string' && !current ? cfg.style : '', placeholder: 'https://…/style.json', spellcheck: false, small: true });
            customUrl.input.addEventListener('change', () => {
                const v = customUrl.get().trim();
                if (!v) return;
                if (!/^https?:\/\//i.test(v) && !/^\.{0,2}\//.test(v)) { UI.toast('Adresse de style invalide (http:// ou https:// attendu).', { type: 'warning' }); return; }
                set({ style: v }, 'Fond de carte personnalisé');
            });
            body.appendChild(UI.field('Style personnalisé (URL)', customUrl, {
                hint: h('span', {}, 'Tout style compatible MapLibre, par ex. MapTiler : https://api.maptiler.com/maps/streets/style.json?key=VOTRE_CLE. ',
                    h('button', { type: 'button', class: 'link', style: 'background:none;border:0;padding:0;font:inherit', onclick: () => this.editStyleJson() }, 'Coller un style JSON…'))
            }));
            if (cfg.style && typeof cfg.style === 'object' && !current) {
                body.appendChild(h('div', { class: 'callout callout-info' }, SM.icon('code', 15), h('p', {}, 'Un style JSON personnalisé est utilisé.')));
            }
            if (typeof cfg.style === 'string' && /VOTRE_CLE|YOUR_KEY/i.test(cfg.style)) {
                body.appendChild(h('div', { class: 'callout callout-warning' }, SM.icon('alert', 15), h('p', {}, 'Remplacez « VOTRE_CLE » par votre clé API dans l’adresse du style.')));
            }

            // Données sur la carte (GeoJSON, GPX, KML)
            this.renderDataSection();

            // Panneaux des chapitres
            this.renderPanelSection(set);

            // Réglages groupés (marqueur, mini-carte, relief)
            const setIn = (key, patch, label, group) => this.store.setGroup(key, patch, { label, group, source: 'inspector' });

            // Marqueur
            body = this.section({ id: 'st-marker', key: 'marker', title: 'Marqueur', icon: 'marker' });
            const showMarker = UI.toggle({ checked: cfg.marker.show, onChange: v => setIn('marker', { show: v }, v ? 'Afficher le marqueur' : 'Masquer le marqueur') });
            this.bind(c => showMarker.set(c.marker.show));
            body.appendChild(UI.fieldRow('Marqueur au centre de chaque chapitre', showMarker));
            if (cfg.marker.show) {
                const AP = SM.appearance;
                const grid = h('div', { class: 'marker-grid', role: 'radiogroup', 'aria-label': 'Icône du marqueur' });
                const choices = AP.MARKER_ICONS.map(ic => {
                    const b = h('button', { type: 'button', class: 'marker-choice', role: 'radio', 'aria-label': ic.label, 'data-tip': ic.label, html: ic.preview });
                    b.addEventListener('click', () => {
                        if (this.store.config.marker.icon !== ic.id) setIn('marker', { icon: ic.id }, 'Icône du marqueur');
                    });
                    grid.appendChild(b);
                    return { b, id: ic.id };
                });
                this.bind(c => {
                    grid.style.color = c.marker.color;
                    choices.forEach(x => x.b.setAttribute('aria-checked', String(c.marker.icon === x.id)));
                });
                body.appendChild(UI.field('Icône', grid));
                const def = AP.defaultMarkerSize(cfg.marker.icon);
                const size = UI.slider({
                    min: 12, max: 96, step: 1, decimals: 0, unit: 'px', allowEmpty: true, value: cfg.marker.size, fallback: def,
                    placeholder: String(def), label: 'Taille du marqueur',
                    onInput: v => setIn('marker', { size: v === undefined ? undefined : Math.round(v) }, 'Taille du marqueur', 'story:marker:size')
                });
                this.bind(c => size.set(c.marker.size));
                body.appendChild(UI.field('Taille', size, {
                    tip: 'Hauteur de l’icône en pixels. Par défaut : ' + def + ' px.',
                    aside: this.resetLink(() => setIn('marker', { size: undefined }, 'Taille par défaut du marqueur'), () => this.store.config.marker.size !== undefined)
                }));
                const color = UI.colorInput({ value: cfg.marker.color, presets: MARKER_COLORS, label: 'Couleur du marqueur', onChange: v => setIn('marker', { color: v }, 'Couleur du marqueur') });
                this.bind(c => color.set(c.marker.color));
                body.appendChild(UI.field('Couleur', color));
            }
            this.renderRoute(body, setIn);

            // Mini-carte
            body = this.section({ id: 'st-inset', key: 'inset', title: 'Mini-carte de situation', icon: 'inset' });
            const inset = UI.toggle({ checked: cfg.inset.show, onChange: v => setIn('inset', { show: v }, v ? 'Afficher la mini-carte' : 'Masquer la mini-carte') });
            this.bind(c => inset.set(c.inset.show));
            body.appendChild(UI.fieldRow('Afficher la mini-carte', inset, { hint: 'Petite carte indiquant où se situe chaque chapitre.' }));
            if (cfg.inset.show) {
                const pos = UI.segmented({
                    value: cfg.inset.position, iconOnly: false,
                    options: [{ value: 'top-left', label: '↖', tip: 'En haut à gauche' }, { value: 'top-right', label: '↗', tip: 'En haut à droite' }, { value: 'bottom-left', label: '↙', tip: 'En bas à gauche' }, { value: 'bottom-right', label: '↘', tip: 'En bas à droite' }],
                    onChange: v => setIn('inset', { position: v }, 'Position de la mini-carte')
                });
                this.bind(c => pos.set(c.inset.position));
                body.appendChild(UI.field('Position', pos));
                const iz = UI.slider({ min: 0, max: 12, step: 0.5, decimals: 1, value: cfg.inset.zoom, label: 'Zoom de la mini-carte', onInput: v => setIn('inset', { zoom: v }, 'Zoom de la mini-carte', 'story:inset:zoom') });
                this.bind(c => iz.set(c.inset.zoom));
                body.appendChild(UI.field('Zoom', iz, { hint: '1 = monde entier ; 4 à 6 = pays.' }));
                const insetPreset = M.findStylePreset(cfg.inset.style);
                const opts = M.STYLE_PRESETS.map(p => ({ value: p.id, label: p.name + ' · ' + p.provider }));
                if (!insetPreset) opts.unshift({ value: 'custom', label: 'Style personnalisé' });
                const is = UI.select({
                    value: insetPreset ? insetPreset.id : 'custom', options: opts,
                    onChange: v => { const p = M.STYLE_PRESETS.find(x => x.id === v); if (p) setIn('inset', { style: M.styleValue(p) }, 'Style de la mini-carte'); }
                });
                body.appendChild(UI.field('Fond de la mini-carte', is));
                const mc = UI.colorInput({
                    value: cfg.inset.color, presets: INSET_COLORS, label: 'Couleur du point',
                    onChange: v => setIn('inset', { color: v }, 'Couleur du point de la mini-carte')
                });
                this.bind(c => mc.set(c.inset.color));
                body.appendChild(UI.field('Couleur du point', mc));
            }

            // Relief 3D
            body = this.section({ id: 'st-terrain', key: 'terrain', title: 'Relief 3D', icon: 'mountain' });
            const terrain = UI.toggle({
                checked: cfg.terrain.show, onChange: v => {
                    setIn('terrain', { show: v }, v ? 'Activer le relief 3D' : 'Désactiver le relief 3D');
                    if (v) UI.toast('Relief activé : inclinez la carte (clic droit + glisser) pour le voir.', { type: 'info' });
                }
            });
            this.bind(c => terrain.set(c.terrain.show));
            body.appendChild(UI.fieldRow('Afficher le relief', terrain, { hint: 'Visible lorsque la carte est inclinée.' }));
            if (cfg.terrain.show) {
                const pid = this.terrainPresetId(cfg);
                const src = UI.select({
                    value: pid,
                    options: M.TERRAIN_PRESETS.map(p => ({ value: p.id, label: p.name + ' — ' + p.description })).concat([{ value: 'custom', label: 'Autre source (TileJSON)…' }]),
                    onChange: v => {
                        const p = M.TERRAIN_PRESETS.find(x => x.id === v);
                        setIn('terrain', { source: p ? p.url : 'https://' }, 'Source du relief');
                    }
                });
                body.appendChild(UI.field('Source', src));
                if (pid === 'custom' || pid === 'maptiler') {
                    const url = UI.textInput({ value: cfg.terrain.source, small: true, spellcheck: false, placeholder: 'https://…/tiles.json' });
                    url.input.addEventListener('change', () => setIn('terrain', { source: url.get().trim() || M.DEFAULT_TERRAIN }, 'Source du relief'));
                    this.bind(c => url.set(c.terrain.source));
                    body.appendChild(UI.field('Adresse TileJSON', url, { hint: 'Adresse d’un fichier TileJSON de type « raster-dem ».' }));
                    if (/VOTRE_CLE/.test(cfg.terrain.source)) body.appendChild(h('div', { class: 'callout callout-warning' }, SM.icon('alert', 15), h('p', {}, 'Remplacez « VOTRE_CLE » par votre clé MapTiler.')));
                }
                if (pid === 'maplibre-demo') body.appendChild(h('div', { class: 'callout callout-warning' }, SM.icon('alert', 15), h('p', {}, 'Cette source ne couvre qu’une petite zone des Alpes. Choisissez Mapterhorn pour un relief mondial.')));
                const ex = UI.slider({ min: 0.5, max: 5, step: 0.1, decimals: 1, value: cfg.terrain.exaggeration, unit: '×', label: 'Exagération', onInput: v => setIn('terrain', { exaggeration: v }, 'Exagération du relief', 'story:terrain:ex') });
                this.bind(c => ex.set(c.terrain.exaggeration));
                body.appendChild(UI.field('Exagération du relief', ex));
            }

            // Lecture
            body = this.section({ id: 'st-auto', key: 'auto', title: 'Lecture', icon: 'auto-play' });
            const nav = UI.toggle({ checked: cfg.navigation, onChange: v => set({ navigation: v }, v ? 'Navigation des lecteurs affichée' : 'Navigation des lecteurs masquée') });
            this.bind(c => nav.set(c.navigation));
            body.appendChild(UI.fieldRow('Navigation pour les lecteurs', nav, { hint: 'Sommaire, barre de progression et boutons précédent / suivant, indispensables sur mobile. Visibles dans l’aperçu et la storymap publiée.' }));
            const keys = UI.toggle({ checked: cfg.keyboard, onChange: v => set({ keyboard: v }, v ? 'Navigation au clavier activée' : 'Navigation au clavier désactivée') });
            this.bind(c => keys.set(c.keyboard));
            body.appendChild(UI.fieldRow('Navigation au clavier', keys, { hint: 'Dans la storymap publiée : ← chapitre précédent, → ou Espace chapitre suivant, ↑ premier, ↓ dernier.' }));
            // Texte des chapitres : dès le départ, ou révélé à l'arrivée de la carte
            const reveal = UI.segmented({
                value: cfg.reveal, label: 'Apparition du texte des chapitres',
                options: M.REVEALS.map(r => ({ value: r.value, label: r.label, tip: r.description })),
                onChange: v => set({ reveal: v }, 'Apparition du texte des chapitres')
            });
            this.bind(c => reveal.set(c.reveal));
            const revealDesc = h('div', { class: 'field-hint' });
            this.bind(c => {
                revealDesc.textContent = (M.REVEALS.find(r => r.value === c.reveal) || M.REVEALS[0]).description +
                    (c.reveal !== 'immediate' ? ' Aperçu : « Tester la transition » sous la carte, ou bouton Aperçu.' : '');
            });
            body.appendChild(UI.field('Apparition du texte des chapitres', h('div', {}, reveal.el, revealDesc)));
            const autoplay = UI.toggle({ checked: cfg.autoplay, onChange: v => set({ autoplay: v }, 'Défilement automatique') });
            this.bind(c => autoplay.set(c.autoplay));
            body.appendChild(UI.fieldRow('Défilement automatique', autoplay, { hint: 'Enchaîne les chapitres automatiquement, en boucle (mode kiosque, borne, salon).' }));
            if (cfg.autoplay) {
                const delay = UI.slider({
                    min: 0, max: 60, step: 0.5, decimals: 1, unit: 's', value: cfg.autoplayDelay, label: 'Durée d’affichage des chapitres',
                    onInput: v => set({ autoplayDelay: v }, 'Durée d’affichage des chapitres', 'story:autoplayDelay')
                });
                this.bind(c => delay.set(c.autoplayDelay));
                body.appendChild(UI.field('Durée d’affichage de chaque chapitre', delay, {
                    hint: 'Temps de lecture après la transition de la carte (la couverture reste affichée autant). Modifiable chapitre par chapitre dans la section « Transition » d’un chapitre.',
                    aside: this.resetLink(() => set({ autoplayDelay: SMPlayer.DEFAULTS.autoplayDelay }, 'Durée d’affichage par défaut'), () => this.store.config.autoplayDelay !== SMPlayer.DEFAULTS.autoplayDelay)
                }));
            }

            // Partage
            body = this.section({ id: 'st-share', key: 'share', title: 'Partage', icon: 'share' });
            const url = UI.textInput({
                value: cfg.share.url, type: 'url', placeholder: 'https://exemple.fr/ma-storymap/', spellcheck: false, label: 'Adresse de publication',
                onChange: v => {
                    const clean = M.normalizeShare({ url: v }).url;
                    if (v.trim() && !clean) { UI.toast('Adresse invalide : elle doit commencer par https:// (ou http://).', { type: 'warning' }); url.set(this.store.config.share.url); return; }
                    setIn('share', { url: clean }, 'Adresse de publication');
                }
            });
            this.bind(c => url.set(c.share.url));
            body.appendChild(UI.field('Adresse de publication', url, { hint: 'Adresse où la storymap sera en ligne. Elle complète l’aperçu du lien sur les réseaux sociaux et sert au code d’intégration et au QR code.' }));
            const desc = UI.textInput({
                value: cfg.share.description, multiline: true, rows: 2, label: 'Description',
                placeholder: cfg.subtitle || 'Une phrase qui donne envie de découvrir la storymap',
                onInput: v => setIn('share', { description: v.replace(/\s*\n\s*/g, ' ') }, 'Description de partage', 'story:share:description')
            });
            desc.input.addEventListener('blur', () => this.store.breakGroup());
            this.bind(c => { desc.set(c.share.description); desc.input.placeholder = c.subtitle || 'Une phrase qui donne envie de découvrir la storymap'; });
            body.appendChild(UI.field('Description', desc, { hint: 'Texte des aperçus de lien (réseaux sociaux, messageries, moteurs de recherche). Vide : le sous-titre.' }));
            body.appendChild(h('div', { class: 'callout callout-info' }, SM.icon('image', 15),
                h('p', {}, M.firstImage(cfg)
                    ? 'Image d’aperçu : la première image de la storymap, recadrée en 1200 × 630. Elle accompagne l’export « Site web (.zip) ».'
                    : 'Ajoutez une image à un chapitre : la première image sert d’aperçu du lien (export « Site web »).')));
            body.appendChild(h('div', { class: 'insp-inline-actions', style: 'margin-top:10px' },
                UI.button({ label: 'Code d’intégration…', icon: 'code', size: 'sm', onClick: () => SM.Share.embedDialog(this.store) }),
                UI.button({ label: 'QR code…', icon: 'qr-code', size: 'sm', onClick: () => SM.Share.qrDialog(this.store) })));

            // Vérification
            const issues = M.validate(cfg);
            body = this.section({ id: 'st-check', key: 'check', title: 'Vérification', icon: 'check-circle', badge: issues.length ? String(issues.length) : null, badgeClass: issues.some(i => i.level === 'error') ? 'badge-danger' : 'badge-warning' });
            if (!issues.length) {
                body.appendChild(h('div', { class: 'callout callout-info' }, SM.icon('check-circle', 15), h('p', {}, 'Aucun problème détecté. Votre storymap est prête à être exportée.')));
            } else {
                const list = h('ul', { class: 'issue-list' });
                for (const it of issues) {
                    const li = h('li', { class: 'issue ' + it.level },
                        SM.icon(it.level === 'error' ? 'alert-circle' : it.level === 'info' ? 'info' : 'alert', 14),
                        h('span', {}, it.message));
                    if (it.index !== undefined) {
                        li.classList.add('clickable');
                        li.addEventListener('click', () => this.store.selectChapterAt(it.index));
                    } else if (it.section) {
                        li.classList.add('clickable');
                        li.addEventListener('click', () => this.showStoryTab(it.section));
                    } else if (/intégrée/.test(it.message)) {
                        li.classList.add('clickable');
                        li.addEventListener('click', () => this.editor.resolveImages());
                    }
                    list.appendChild(li);
                }
                body.appendChild(list);
            }
        }

        /** Storymap : trajet d'un marqueur de chapitre au suivant (section Marqueur). */
        renderRoute(body, setIn) {
            const cfg = this.store.config;
            const set = (patch, label, group) => setIn('route', patch, label, group ? 'story:route:' + group : undefined);
            const show = UI.toggle({ checked: cfg.route.show, onChange: v => set({ show: v }, v ? 'Marqueurs reliés' : 'Marqueurs non reliés') });
            this.bind(c => show.set(c.route.show));
            body.appendChild(UI.fieldRow('Relier les marqueurs des chapitres', show, {
                hint: 'Une ligne va du marqueur d’un chapitre au suivant, dans l’ordre du récit : droite entre des lieux proches, en arc (plus court chemin sur le globe) sur les longues distances.'
            }));
            if (!cfg.route.show) return;
            const route = M.routeData(cfg);
            if (!route) {
                body.appendChild(h('div', { class: 'callout callout-warning' }, SM.icon('alert', 15),
                    h('p', {}, 'Il faut au moins deux chapitres étapes du trajet (onglet Chapitre › Cadrage de la carte › Étape du trajet).')));
            }
            const color = UI.colorInput({
                value: cfg.route.color || cfg.marker.color, presets: MARKER_COLORS, label: 'Couleur du trajet',
                onInput: v => set({ color: v }, 'Couleur du trajet', 'color'),
                onChange: v => set({ color: v }, 'Couleur du trajet', 'color')
            });
            this.bind(c => color.set(c.route.color || c.marker.color));
            body.appendChild(UI.field('Couleur du trajet', color, {
                tip: 'Par défaut, celle du marqueur.',
                aside: this.resetLink(() => set({ color: undefined }, 'Trajet à la couleur du marqueur'), () => this.store.config.route.color !== undefined)
            }));
            const width = UI.slider({ min: 0.5, max: 16, step: 0.5, decimals: 1, unit: 'px', value: cfg.route.width, label: 'Épaisseur du trajet', onInput: v => set({ width: v }, 'Épaisseur du trajet', 'width') });
            this.bind(c => width.set(c.route.width));
            body.appendChild(UI.field('Épaisseur', width));
            const dash = UI.toggle({ checked: cfg.route.dash, onChange: v => set({ dash: v }, v ? 'Trajet en pointillés' : 'Trajet continu') });
            this.bind(c => dash.set(c.route.dash));
            body.appendChild(UI.fieldRow('Pointillés', dash, { hint: 'Pour un trajet en bateau ou en avion…' }));
            const opacity = UI.slider({ min: 5, max: 100, step: 1, decimals: 0, unit: '%', value: Math.round(cfg.route.opacity * 100), label: 'Opacité du trajet', onInput: v => set({ opacity: U.round(v / 100, 2) }, 'Opacité du trajet', 'opacity') });
            this.bind(c => opacity.set(Math.round(c.route.opacity * 100)));
            body.appendChild(UI.field('Opacité', opacity));
            const prog = UI.toggle({ checked: cfg.route.progressive, onChange: v => set({ progressive: v }, v ? 'Dessin progressif du trajet' : 'Trajet affiché en entier') });
            this.bind(c => prog.set(c.route.progressive));
            body.appendChild(UI.fieldRow('Dessin progressif', prog, {
                hint: 'Le trajet se dessine au fil des chapitres, en suivant la carte : il atteint le marqueur de chaque chapitre à la fin de la transition.'
            }));
            if (cfg.route.progressive) {
                const ghost = UI.toggle({ checked: cfg.route.ghost, onChange: v => set({ ghost: v }, v ? 'Trajet restant visible' : 'Trajet restant masqué') });
                this.bind(c => ghost.set(c.route.ghost));
                body.appendChild(UI.fieldRow('Parcours restant en transparence', ghost, { hint: 'La suite du trajet reste visible, en pâle, avant d’être dessinée.' }));
            }
            const stops = route ? route.stops.length : 0;
            body.appendChild(h('p', { class: 'field-hint', style: 'margin:0' },
                (stops ? U.plural(stops, 'étape', 'étapes') + ' sur ' + U.plural(cfg.chapters.length, 'chapitre') + '. ' : '') +
                'Un chapitre de vue d’ensemble (introduction, conclusion…) peut être retiré du trajet : onglet Chapitre › Cadrage de la carte › Étape du trajet.'));
        }

        async editStyleJson() {
            const cfg = this.store.config;
            const value = await UI.prompt({
                title: 'Style JSON personnalisé', icon: 'code', multiline: true, code: true, rows: 12, width: 640,
                label: 'Style MapLibre (JSON)', value: typeof cfg.style === 'object' ? JSON.stringify(cfg.style, null, 2) : '',
                hint: 'Collez un objet de style MapLibre complet (version 8, sources, layers).',
                confirmLabel: 'Appliquer',
                validate: v => {
                    try {
                        const o = JSON.parse(v);
                        if (!o || typeof o !== 'object' || !o.sources || !Array.isArray(o.layers)) return 'Le style doit contenir « sources » et « layers ».';
                        return null;
                    } catch (e) { return 'JSON invalide : ' + e.message; }
                }
            });
            if (value) this.store.setStory({ style: JSON.parse(value) }, { label: 'Style JSON personnalisé' });
        }
    }

    SM.Inspector = Inspector;
})();
