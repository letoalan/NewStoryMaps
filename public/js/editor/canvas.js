/* ==========================================================================
   StoryMap — canevas WYSIWYG
   --------------------------------------------------------------------------
   La storymap est rendue dans un « cadre d'appareil » à sa taille réelle
   (ex. 1440 × 900) puis mise à l'échelle : cadrage de la carte, largeur des
   panneaux et retours à la ligne sont identiques au résultat publié.
   ========================================================================== */
(function () {
    'use strict';

    const SM = window.SM;
    const U = SM.util;
    const h = U.h;
    const UI = SM.ui;
    const M = SM.model;

    const screenW = Math.max(1024, Math.round(window.screen && window.screen.width || 1440));
    const screenH = Math.max(640, Math.round((window.screen && window.screen.height || 1000) - 140));

    const DEVICES = [
        { id: 'screen', label: 'Votre écran', icon: 'monitor', w: screenW, h: screenH },
        { id: 'desktop', label: 'Ordinateur', icon: 'monitor', w: 1440, h: 900 },
        { id: 'laptop', label: 'Ordinateur portable', icon: 'laptop', w: 1280, h: 720 },
        { id: 'fullhd', label: 'Grand écran (Full HD)', icon: 'monitor', w: 1920, h: 1080 },
        { id: 'tablet-l', label: 'Tablette (paysage)', icon: 'tablet-landscape', w: 1180, h: 820 },
        { id: 'tablet', label: 'Tablette (portrait)', icon: 'tablet', w: 820, h: 1180 },
        { id: 'mobile', label: 'Mobile', icon: 'phone', w: 390, h: 844 }
    ];

    const P = window.SMPlayer;
    const CAMERA_KEYS = ['center', 'zoom', 'pitch', 'bearing'];

    const cameraOf = view => ({
        center: view.center,
        zoom: view.zoom,
        pitch: view.pitch || 0,
        bearing: view.bearing || 0
    });

    function sameCamera(a, b) {
        if (!a || !b) return false;
        return a.center[0] === b.center[0] && a.center[1] === b.center[1] && a.zoom === b.zoom &&
            (a.pitch || 0) === (b.pitch || 0) && (a.bearing || 0) === (b.bearing || 0);
    }

    function styleKey(style) {
        return typeof style === 'string' ? style : JSON.stringify(style);
    }

    function hasImageFile(dt) {
        if (!dt) return false;
        if (dt.items && dt.items.length) return Array.from(dt.items).some(i => i.kind === 'file' && (!i.type || i.type.startsWith('image/')));
        return Array.from(dt.types || []).includes('Files');
    }

    class Canvas {
        constructor(editor) {
            this.editor = editor;
            this.store = editor.store;
            this.rich = editor.rich;
            this.device = DEVICES.find(d => d.id === SM.prefs.get('device')) || DEVICES[0];
            this.scale = 1;
            this.userIntent = false;
            this.playing = null;
            this.styleReady = false;
            this.originalPaint = {};
            this.modifiedLayers = new Set();
            this.terrainUrl = null;
            this.disposers = [];
            this.els = {};
            this.build();
        }

        /* ---------- Construction ---------- */

        build() {
            this.geocoder = new SM.Geocoder({ onSelect: r => this.flyToResult(r) });

            this.deviceBtn = h('button', { type: 'button', class: 'btn btn-ghost btn-sm device-btn', 'aria-haspopup': 'menu', 'data-tip': 'Taille d’écran simulée' });
            this.deviceBtn.addEventListener('click', () => this.deviceMenu());
            this.zoomLabel = h('span', { class: 'canvas-zoom', 'data-tip': 'Échelle d’affichage du cadre' });
            this.frameLabel = h('div', { class: 'canvas-label' });

            this.toolbar = h('div', { class: 'canvas-toolbar' },
                this.geocoder.el,
                h('div', { class: 'spacer' }),
                this.frameLabel,
                h('div', { class: 'spacer' }),
                this.deviceBtn,
                this.zoomLabel);

            this.mapEl = h('div', { class: 'sm-map' });
            this.insetEl = h('div', { class: 'sm-inset bottom-right', hidden: true });
            this.storyEl = h('div', { class: 'sm-story' });
            this.frame = h('div', { class: 'sm-frame is-editing' }, this.mapEl, this.storyEl, this.insetEl);
            this.holder = h('div', { class: 'frame-holder' }, this.frame);

            this.playOverlay = h('div', { class: 'play-overlay', hidden: true },
                h('div', { class: 'play-pill' },
                    SM.icon('play', 14),
                    h('span', { class: 'play-text' }, 'Lecture de la transition…'),
                    h('button', { type: 'button', class: 'play-stop', onclick: () => this.stopPlaying() }, SM.icon('stop', 13), 'Arrêter')));
            this.playOverlay.addEventListener('pointerdown', e => { if (!e.target.closest('.play-pill')) this.stopPlaying(); });

            this.mapNotice = h('div', { class: 'map-notice', hidden: true });

            this.stage = h('div', { class: 'canvas-stage' }, this.holder, this.playOverlay, this.mapNotice);

            // Barre d'outils de la carte
            this.hudLabel = h('span', { class: 'hud-label' });
            this.hudStatus = h('span', { class: 'hud-status' }, SM.icon('check', 13), 'Cadrage enregistré');
            this.zoomValue = h('span', { class: 'hud-value', 'data-tip': 'Niveau de zoom' });
            this.compass = h('span', { class: 'hud-compass' }, SM.icon('navigation', 15));
            this.pitchBtn = h('button', { type: 'button', class: 'hud-btn hud-text', 'data-tip': 'Basculer entre vue à plat (2D) et vue inclinée (3D)' }, '3D');
            this.pitchBtn.addEventListener('click', () => this.userMove(() => this.map.easeTo({ pitch: this.map.getPitch() > 5 ? 0 : 50, duration: 500 })));
            const northBtn = h('button', { type: 'button', class: 'hud-btn', 'data-tip': 'Réorienter vers le nord' }, this.compass);
            northBtn.addEventListener('click', () => this.userMove(() => this.map.easeTo({ bearing: 0, duration: 450 })));
            const zoomOut = h('button', { type: 'button', class: 'hud-btn', 'data-tip': 'Zoom arrière' }, SM.icon('minus', 15));
            const zoomIn = h('button', { type: 'button', class: 'hud-btn', 'data-tip': 'Zoom avant' }, SM.icon('plus', 15));
            zoomOut.addEventListener('click', () => this.userMove(() => this.map.zoomOut({ duration: 250 })));
            zoomIn.addEventListener('click', () => this.userMove(() => this.map.zoomIn({ duration: 250 })));
            this.playBtn = h('button', { type: 'button', class: 'hud-btn hud-play', 'data-tip': 'Rejouer l’animation d’arrivée sur ce chapitre, comme dans la storymap' },
                SM.icon('play', 14), h('span', {}, 'Tester la transition'));
            this.playBtn.addEventListener('click', () => this.playTransition());

            this.hud = h('div', { class: 'map-hud' },
                h('div', { class: 'hud-group hud-info' }, SM.icon('pin', 14), this.hudLabel, this.hudStatus),
                h('div', { class: 'hud-group' }, zoomOut, this.zoomValue, zoomIn),
                h('div', { class: 'hud-group' }, northBtn, this.pitchBtn),
                h('div', { class: 'hud-group' }, this.playBtn));

            this.el = h('section', { class: 'canvas', 'aria-label': 'Aperçu éditable de la storymap' }, this.toolbar, this.stage, this.hud);
        }

        mount() {
            this.updateAppearance();
            this.ro = new ResizeObserver(U.throttle(() => this.layout(), 60));
            this.ro.observe(this.stage);
            const onResize = U.debounce(() => this.layout(), 120);
            window.addEventListener('resize', onResize);
            this.disposers.push(() => window.removeEventListener('resize', onResize));
            this.layout();
            this.updateDeviceButton();
            this.buildStory();
            this.updateLabel();
            if (typeof maplibregl === 'undefined') {
                this.showNotice('MapLibre GL JS n’a pas pu être chargé : vérifiez votre connexion Internet puis rechargez la page.', 'error');
            } else {
                this.createMap();
            }
            this.disposers.push(this.store.subscribe(evt => this.onStore(evt)));
        }

        destroy() {
            this.disposers.forEach(fn => fn());
            if (this.ro) this.ro.disconnect();
            SM.appearance.useEditorFonts(null);
            this.stopPlaying(true);
            try { if (this.inset) this.inset.remove(); } catch (e) { /* ignore */ }
            try { if (this.map) { P.stopTraces(this.map); this.map.remove(); } } catch (e) { /* ignore */ }
            this.map = null;
            this.inset = null;
        }

        /* ---------- Appareil & mise à l'échelle ---------- */

        deviceMenu() {
            UI.menu(this.deviceBtn, DEVICES.map(d => ({
                label: d.label, desc: d.w + ' × ' + d.h + ' px', icon: d.icon, checked: d.id === this.device.id,
                onClick: () => this.setDevice(d.id)
            })), { align: 'end', minWidth: 250 });
        }

        setDevice(id) {
            const d = DEVICES.find(x => x.id === id);
            if (!d) return;
            this.device = d;
            SM.prefs.set('device', id);
            this.updateDeviceButton();
            this.layout(true);
        }

        updateDeviceButton() {
            U.clear(this.deviceBtn);
            this.deviceBtn.appendChild(SM.icon(this.device.icon, 15));
            this.deviceBtn.appendChild(h('span', {}, this.device.label));
            this.deviceBtn.appendChild(h('span', { class: 'subtle' }, this.device.w + ' × ' + this.device.h));
            this.deviceBtn.appendChild(SM.icon('chevron-down', 13));
        }

        layout(force) {
            const d = this.device;
            // clientWidth/Height : dimensions CSS, indépendantes des transformations et du zoom
            const r = { width: this.stage.clientWidth, height: this.stage.clientHeight };
            if (!r.width || !r.height) return;
            const pad = 26;
            const s = Math.max(0.08, Math.min((r.width - pad * 2) / d.w, (r.height - pad * 2) / d.h, 1));
            const sizeChanged = this.frame.style.width !== d.w + 'px' || this.frame.style.height !== d.h + 'px';
            this.frame.style.width = d.w + 'px';
            this.frame.style.height = d.h + 'px';
            this.frame.style.transform = 'scale(' + s + ')';
            this.holder.style.width = Math.round(d.w * s) + 'px';
            this.holder.style.height = Math.round(d.h * s) + 'px';
            const scaleChanged = Math.abs(s - this.scale) > 0.002;
            this.scale = s;
            this.zoomLabel.textContent = Math.round(s * 100) + ' %';
            if (this.map && (sizeChanged || scaleChanged || force)) {
                const pr = Math.min(window.devicePixelRatio || 1, Math.max(0.5, (window.devicePixelRatio || 1) * s));
                try { if (this.map.setPixelRatio) this.map.setPixelRatio(pr); } catch (e) { /* ignore */ }
                this.map.resize();
                if (this.inset) this.inset.resize();
            }
            this.rich.position();
        }

        /* ---------- Carte ---------- */

        displayedIndex() {
            return this.store.chapterIndex();
        }

        displayedChapter() {
            return this.store.config.chapters[Math.max(0, this.displayedIndex())];
        }

        createMap() {
            const cfg = this.store.config;
            const loc = this.displayedChapter().view;
            this.currentStyleKey = styleKey(cfg.style);
            try {
                this.map = new maplibregl.Map({
                    container: this.mapEl,
                    style: cfg.style,
                    center: loc.center,
                    zoom: loc.zoom,
                    pitch: loc.pitch || 0,
                    bearing: loc.bearing || 0,
                    preserveDrawingBuffer: true,
                    pixelRatio: Math.min(window.devicePixelRatio || 1, Math.max(0.5, (window.devicePixelRatio || 1) * this.scale))
                });
            } catch (e) {
                this.showNotice('Impossible d’afficher la carte : ' + e.message + ' (WebGL est-il activé ?)', 'error');
                return;
            }
            const map = this.map;
            this.displayedId = this.displayedChapter().id;
            // Les flèches servent à naviguer entre les chapitres (et non à déplacer la carte)
            if (map.keyboard) map.keyboard.disable();
            map.on('style.load', () => this.onStyleLoad());
            map.on('moveend', () => this.onMoveEnd());
            map.on('move', () => this.onMove());
            map.on('error', e => this.onMapError(e));
            map.on('idle', () => this.onIdle());

            for (const type of ['pointerdown', 'wheel', 'touchstart', 'dblclick']) {
                this.mapEl.addEventListener(type, () => { if (!this.playing) this.userIntent = true; }, { capture: true, passive: true });
            }
            this.updateMarker(true);
            this.updateInset();
            this.updateHud();
        }

        onStyleLoad() {
            this.styleReady = true;
            this.originalPaint = {};
            this.modifiedLayers = new Set();
            this.terrainUrl = null;
            this.hideNotice('style');
            this.applyTerrain();
            this.applyData(); // setStyle efface les calques ajoutés : ils sont recréés
            this.applyLayerState();
            this.editor.emit('style-layers', this.styleLayers());
        }

        setStyle(style) {
            if (!this.map) return;
            const key = styleKey(style);
            if (key === this.currentStyleKey) return;
            this.currentStyleKey = key;
            this.styleReady = false;
            this.map.setStyle(style, { diff: false });
        }

        /** Couches du fond de carte (hors calques de données, gérés par chapitre). */
        styleLayers() {
            if (!this.map || !this.styleReady) return [];
            try {
                return (this.map.getStyle().layers || [])
                    .filter(l => M.LAYER_TYPES[l.type] && l.id.indexOf(P.DATA_PREFIX) !== 0)
                    .map(l => ({ id: l.id, type: l.type }));
            } catch (e) { return []; }
        }

        onMapError(e) {
            const err = e && e.error;
            const msg = (err && (err.message || err.statusText)) || '';
            console.warn('[MapLibre]', msg, e);
            if (e && e.sourceId === P.TERRAIN_SOURCE) {
                if (this.lastTerrainError !== this.terrainUrl) {
                    this.lastTerrainError = this.terrainUrl;
                    UI.toast('Relief 3D : la source de relief est inaccessible (adresse ou clé API invalide ?).', { type: 'warning' });
                }
                return;
            }
            if (e && (e.sourceId || e.tile)) return; // tuile manquante : sans gravité
            if (!this.styleReady) {
                this.showNotice('Le fond de carte n’a pas pu être chargé' + (msg ? ' (' + msg + ')' : '') + '. Vérifiez l’adresse du style ou votre connexion.', 'error', 'style',
                    { label: 'Changer de fond de carte', onClick: () => this.editor.inspector.showStoryTab('style') });
            }
        }

        showNotice(text, type, key, action) {
            U.clear(this.mapNotice);
            this.mapNotice.hidden = false;
            this.mapNotice.dataset.key = key || '';
            this.mapNotice.className = 'map-notice ' + (type || '');
            this.mapNotice.appendChild(SM.icon(type === 'error' ? 'alert-circle' : 'info', 16));
            this.mapNotice.appendChild(h('span', {}, text));
            if (action) this.mapNotice.appendChild(UI.button({ label: action.label, size: 'xs', onClick: action.onClick }));
        }

        hideNotice(key) {
            if (!key || this.mapNotice.dataset.key === key) this.mapNotice.hidden = true;
        }

        /** Déplacement de la carte initié par l'éditeur (non enregistré). */
        programmatic(fn) {
            this.userIntent = false;
            fn();
        }

        /** Déplacement demandé par l'utilisateur (sera enregistré comme cadrage). */
        userMove(fn) {
            if (!this.map || this.playing) return;
            this.userIntent = true;
            fn();
        }

        goTo(loc, mode) {
            if (!this.map || !loc) return;
            const cam = cameraOf(loc);
            this.programmatic(() => {
                if (mode === 'fly') this.map.flyTo(Object.assign({}, cam, { duration: 900 }));
                else if (mode === 'ease') this.map.easeTo(Object.assign({}, cam, { duration: 380 }));
                else this.map.jumpTo(cam);
            });
        }

        /**
         * Cadre le chapitre affiché sur une emprise [ouest, sud, est, nord],
         * sans la cacher derrière le panneau du chapitre.
         */
        fitBounds(bbox) {
            if (!this.map || !bbox || this.playing) return false;
            const ch = this.displayedChapter();
            const w = this.device.w;
            const base = Math.round(Math.max(24, Math.min(w, this.device.h) * 0.06));
            const padding = { top: base, bottom: base, left: base, right: base };
            // Panneau à gauche ou à droite (au-delà de 750 px de large : voir le CSS du lecteur)
            if (!ch.hidden && w > 750) {
                if (ch.align === 'left') padding.left += Math.round(w * 0.38);
                else if (ch.align === 'right') padding.right += Math.round(w * 0.38);
            }
            let cam = null;
            try {
                cam = this.map.cameraForBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding, maxZoom: 16, bearing: this.map.getBearing() });
            } catch (e) { cam = null; }
            if (!cam || !cam.center) return false;
            this.userMove(() => this.map.flyTo({ center: cam.center, zoom: cam.zoom, bearing: this.map.getBearing(), pitch: this.map.getPitch(), duration: 1000, essential: true }));
            return true;
        }

        /** L'emprise [ouest, sud, est, nord] est-elle au moins en partie visible ? */
        showsBounds(bbox) {
            if (!this.map || !bbox) return true;
            try {
                const b = this.map.getBounds();
                return !(bbox[2] < b.getWest() || bbox[0] > b.getEast() || bbox[3] < b.getSouth() || bbox[1] > b.getNorth());
            } catch (e) {
                return true;
            }
        }

        flyToResult(r) {
            if (!this.map) return;
            this.userMove(() => {
                let cam = { center: r.center, zoom: r.zoom || Math.max(this.map.getZoom(), 12) };
                if (r.bbox) {
                    try {
                        const c = this.map.cameraForBounds([[r.bbox[0], r.bbox[1]], [r.bbox[2], r.bbox[3]]], { padding: 60, maxZoom: r.zoom ? Math.max(r.zoom, 15) : 16 });
                        if (c && c.center) cam = { center: c.center, zoom: Math.min(c.zoom, 17) };
                    } catch (e) { /* bbox invalide : on garde le centre */ }
                }
                this.map.flyTo(Object.assign(cam, { pitch: this.map.getPitch(), bearing: this.map.getBearing(), duration: 1400, essential: true }));
            });
        }

        onMove() {
            if (this.userIntent && !this.playing) {
                const c = this.map.getCenter();
                if (this.marker) this.marker.setLngLat(c);
                // Le tracé progressif et le trajet entre les marqueurs suivent le marqueur pendant le cadrage
                const route = this.hasRoute();
                if (this.styleReady && (route || this.hasTraces())) {
                    const w = c.wrap();
                    const i = Math.max(0, this.displayedIndex());
                    const center = [w.lng, w.lat];
                    try {
                        const datasets = this.datasets({ index: i, center });
                        const progress = this.traceProgress(i, center);
                        if (route) P.syncData(this.map, datasets, this.displayedChapter().id, progress, true);
                        else P.drawTraces(this.map, datasets, progress);
                    } catch (e) { /* carte en cours de chargement */ }
                }
            }
            this.updateHud();
        }

        onMoveEnd() {
            this.updateHud();
            if (!this.userIntent || this.playing) return;
            this.capture();
        }

        /** Enregistre la vue actuelle comme cadrage du chapitre affiché. */
        capture() {
            const i = this.displayedIndex();
            if (i < 0 || !this.map) return;
            const c = this.map.getCenter().wrap();
            const loc = {
                center: [U.round(c.lng, 5), U.round(c.lat, 5)],
                zoom: U.round(this.map.getZoom(), 2),
                pitch: U.round(this.map.getPitch(), 2),
                bearing: U.round(this.map.getBearing(), 2)
            };
            const ch = this.store.config.chapters[i];
            if (sameCamera(ch.view, loc)) return;
            this.store.setView(i, loc, { label: 'Cadrage de la carte', group: 'map:' + ch.id, source: 'map' });
            this.flashStatus();
        }

        flashStatus() {
            this.hudStatus.classList.remove('show');
            void this.hudStatus.offsetWidth;
            this.hudStatus.classList.add('show');
            clearTimeout(this.statusTimer);
            this.statusTimer = setTimeout(() => this.hudStatus.classList.remove('show'), 1800);
        }

        updateHud() {
            if (!this.map) return;
            this.zoomValue.textContent = U.formatNumber(U.round(this.map.getZoom(), 1), 1);
            this.compass.style.transform = 'rotateX(' + (this.map.getPitch() * 0.6) + 'deg) rotate(' + (-this.map.getBearing()) + 'deg)';
            this.pitchBtn.classList.toggle('on', this.map.getPitch() > 5);
        }

        updateLabel() {
            const sel = this.store.selection;
            const cfg = this.store.config;
            const i = this.displayedIndex();
            const ch = cfg.chapters[i];
            U.clear(this.frameLabel);
            let text;
            if (sel.type === 'cover') text = 'Couverture';
            else if (sel.type === 'footer') text = 'Pied de page';
            else text = 'Chapitre ' + (i + 1) + ' / ' + cfg.chapters.length;
            this.frameLabel.appendChild(h('strong', {}, text));
            if (sel.type === 'chapter' && ch && ch.title) this.frameLabel.appendChild(h('span', { class: 'subtle' }, ' · ' + U.truncate(ch.title, 48)));
            U.clear(this.hudLabel);
            const label = sel.type === 'chapter' ? 'Déplacez la carte pour cadrer ce chapitre'
                : 'Vue du ' + (sel.type === 'cover' ? 'chapitre 1' : 'dernier chapitre') + ' (modifiable ici)';
            this.hudLabel.textContent = label;
        }

        /* ---------- Marqueur, mini-carte, relief ---------- */

        updateMarker(recreate) {
            if (!this.map) return;
            const marker = this.store.config.marker;
            const center = this.displayedChapter().view.center;
            if (!marker.show) {
                if (this.marker) { this.marker.remove(); this.marker = null; }
                return;
            }
            const key = [marker.color, marker.icon, marker.size || ''].join('|');
            if (recreate || !this.marker || this.markerKey !== key) {
                if (this.marker) this.marker.remove();
                this.markerKey = key;
                // Même fabrique que dans les pages publiées (icône, taille, couleur)
                this.marker = P.createMarker(maplibregl, marker).setLngLat(center).addTo(this.map);
            } else {
                this.marker.setLngLat(center);
            }
            P.showMarker(this.marker, P.markerShown(this.displayedChapter()));
        }

        /** Marqueur et point de la mini-carte sur le chapitre ch (masqués pour une vue d'ensemble). */
        placeMarker(ch) {
            if (this.marker) this.marker.setLngLat(ch.view.center);
            if (this.inset && this.insetMarker) { this.inset.setCenter(ch.view.center); this.insetMarker.setLngLat(ch.view.center); }
            P.showMarker(this.marker, P.markerShown(ch));
            P.showMarker(this.insetMarker, P.markerShown(ch));
        }

        /** Applique les réglages des panneaux : variables CSS du lecteur (comme dans les pages publiées). */
        updateAppearance() {
            const panels = this.store.config.panels;
            SM.appearance.useEditorFonts(panels); // polices Google Fonts choisies
            const vars = SM.appearance.vars(panels);
            for (const name of P.VAR_NAMES) {
                if (vars[name] !== undefined) this.frame.style.setProperty(name, vars[name]);
                else this.frame.style.removeProperty(name);
            }
        }

        updateInset() {
            if (typeof maplibregl === 'undefined') return;
            const cfg = this.store.config.inset;
            if (!cfg.show) {
                if (this.inset) { try { this.inset.remove(); } catch (e) { /* ignore */ } this.inset = null; }
                this.insetEl.hidden = true;
                return;
            }
            const wasHidden = this.insetEl.hidden;
            this.insetEl.hidden = false;
            this.insetEl.className = 'sm-inset ' + cfg.position;
            const style = cfg.style;
            const center = this.displayedChapter().view.center;
            const zoom = cfg.zoom;
            const markerColor = cfg.color || '';
            if (!this.inset) {
                this.insetMarkerEl = h('div', { class: 'inset-marker' });
                this.inset = new maplibregl.Map({
                    container: this.insetEl, style, center, zoom, interactive: false, attributionControl: false,
                    pixelRatio: Math.min(window.devicePixelRatio || 1, Math.max(0.5, (window.devicePixelRatio || 1) * this.scale))
                });
                this.insetStyleKey = styleKey(style);
                this.insetMarker = new maplibregl.Marker({ element: this.insetMarkerEl }).setLngLat(center).addTo(this.inset);
                this.inset.on('error', e => console.warn('[Mini-carte]', e && e.error && e.error.message));
            } else {
                if (wasHidden) this.inset.resize();
                const key = styleKey(style);
                if (key !== this.insetStyleKey) { this.insetStyleKey = key; this.inset.setStyle(style, { diff: false }); }
                this.inset.jumpTo({ center, zoom });
                this.insetMarker.setLngLat(center);
            }
            this.insetMarkerEl.style.backgroundColor = markerColor;
            P.showMarker(this.insetMarker, P.markerShown(this.displayedChapter()));
        }

        applyTerrain() {
            const map = this.map;
            if (!map || !this.styleReady) return;
            const terrain = this.store.config.terrain;
            this.terrainUrl = terrain.show ? terrain.source : null;
            try {
                P.setTerrain(map, terrain); // même fonction que les pages publiées
            } catch (e) {
                console.warn('[Relief]', e);
            }
        }

        /**
         * Calques affichés : trajet entre les marqueurs des chapitres (s'il y en a
         * un), puis calques de données. override = { index, center } : centre
         * provisoire d'un chapitre (carte en cours de déplacement).
         */
        datasets(override) {
            const cfg = this.store.config;
            const route = P.routeData(cfg, override);
            return route ? [route].concat(cfg.data) : cfg.data;
        }

        hasRoute() {
            return !!P.routeData(this.store.config);
        }

        /** Calques de données (même code que les pages publiées), dans l'état du chapitre affiché. */
        applyData() {
            const map = this.map;
            if (!map || !this.styleReady) return;
            try {
                const i = Math.max(0, this.displayedIndex());
                P.syncData(map, this.datasets(), this.displayedChapter().id, this.traceProgress(i));
            } catch (e) {
                console.warn('[Données]', e);
            }
        }

        /** Tracés progressifs : fractions dessinées au chapitre index (center : centre provisoire). */
        traceProgress(index, center) {
            const cfg = this.store.config;
            return P.traceProgress(this.datasets(center ? { index, center } : null), cfg.chapters, index, center);
        }

        hasTraces() {
            return this.datasets().some(P.isTraced);
        }

        /**
         * Tracés progressifs dans l'état du chapitre index : immédiatement, ou en
         * suivant la caméra qui se dirige vers center (animate). done : appelée
         * une fois le dessin fini ou interrompu (aussitôt sans animation).
         */
        drawTraces(index, center, animate, done) {
            const finish = typeof done === 'function' ? done : () => { };
            const map = this.map;
            if (!map || !this.styleReady || !this.hasTraces()) { finish(); return; }
            try {
                P.stopTraces(map);
                const progress = this.traceProgress(index);
                if (animate) P.animateTraces(map, this.datasets(), progress, center, P.TRACE_DURATION, finish);
                else { P.drawTraces(map, this.datasets(), progress); finish(); }
            } catch (e) {
                console.warn('[Tracé]', e);
                finish();
            }
        }

        /** Affiche les calques de données d'un chapitre et masque les autres (fondu en ms). */
        showData(chapter, duration) {
            const datasets = this.datasets();
            if (!this.map || !this.styleReady || !chapter || !datasets.length) return;
            try {
                P.showData(this.map, datasets, chapter.id, duration || 0);
            } catch (e) {
                console.warn('[Données]', e);
            }
        }

        /**
         * Reproduit l'état des couches tel qu'il serait après avoir fait défiler
         * la storymap jusqu'au chapitre affiché (règles d'arrivée et de départ).
         */
        applyLayerState(untilIndex, withExitOfLast) {
            const map = this.map;
            if (!map || !this.styleReady) return;
            const cfg = this.store.config;
            const idx = untilIndex === undefined ? Math.max(0, this.displayedIndex()) : untilIndex;
            const touched = new Set(this.modifiedLayers);
            for (const ch of cfg.chapters) {
                for (const r of ch.layers.enter.concat(ch.layers.exit)) if (r.layer) touched.add(r.layer);
            }
            const target = new Map();
            for (let j = 0; j <= idx && j < cfg.chapters.length; j++) {
                for (const r of cfg.chapters[j].layers.enter) target.set(r.layer, r.opacity);
                if (j < idx || withExitOfLast) for (const r of cfg.chapters[j].layers.exit) target.set(r.layer, r.opacity);
            }
            const missing = [];
            for (const layerId of touched) {
                const layer = map.getLayer(layerId);
                if (!layer) { if (target.has(layerId)) missing.push(layerId); continue; }
                const props = M.LAYER_TYPES[layer.type];
                if (!props) continue;
                if (!this.originalPaint[layerId]) {
                    this.originalPaint[layerId] = {};
                    for (const p of props) this.originalPaint[layerId][p] = map.getPaintProperty(layerId, p);
                }
                for (const p of props) {
                    const value = target.has(layerId) ? target.get(layerId) : this.originalPaint[layerId][p];
                    try {
                        map.setPaintProperty(layerId, p + '-transition', { duration: 0, delay: 0 });
                        map.setPaintProperty(layerId, p, value);
                    } catch (e) { /* propriété non applicable */ }
                }
            }
            this.modifiedLayers = new Set(Array.from(touched).filter(id => map.getLayer(id)));
            this.missingLayers = missing;
        }

        /** Applique une règle comme la storymap publiée (avec transition). */
        setLayerOpacity(rule) {
            const map = this.map;
            const layer = map && map.getLayer(rule.layer);
            const props = layer ? M.LAYER_TYPES[layer.type] : null;
            if (!props) return;
            this.modifiedLayers.add(rule.layer);
            if (!this.originalPaint[rule.layer]) {
                this.originalPaint[rule.layer] = {};
                for (const p of props) this.originalPaint[rule.layer][p] = map.getPaintProperty(rule.layer, p);
            }
            P.setLayerOpacity(map, rule);
        }

        onIdle() {
            this.editor.emit('map-idle');
        }

        /** Miniature de la vue actuelle (pour le tableau de bord). */
        snapshot() {
            if (!this.map || !this.styleReady) return null;
            try { return SM.images.canvasThumbnail(this.map.getCanvas(), 480, 300); } catch (e) { return null; }
        }

        /* ---------- Lecture de la transition ---------- */

        async playTransition() {
            if (!this.map || !this.styleReady) return;
            if (this.playing) { this.stopPlaying(); return; }
            const cfg = this.store.config;
            const i = Math.max(0, this.displayedIndex());
            const ch = cfg.chapters[i];
            const prev = i > 0 ? cfg.chapters[i - 1] : null;
            const token = {};
            this.playing = token;
            document.activeElement && this.frame.contains(document.activeElement) && document.activeElement.blur();
            this.frame.classList.add('is-playing');
            // Texte révélé à l'arrivée (réglage reveal) : panneau masqué ou atténué jusqu'à la fin
            // du déplacement de la carte et du dessin du trajet, comme dans la storymap publiée
            const step = cfg.reveal !== 'immediate' ? this.storyEl.querySelector('.step') : null;
            if (step) {
                step.classList.remove('arrived');
                this.frame.classList.add('sm-reveal-' + cfg.reveal);
            }
            this.playOverlay.hidden = false;
            this.playBtn.classList.add('on');
            this.setPlayText(prev ? 'Transition depuis « ' + M.chapterLabel(prev, i - 1) + ' »…' : 'Arrivée sur le premier chapitre…');
            this.userIntent = false;

            if (prev) {
                this.applyLayerState(i - 1, false);
                this.showData(prev, 0);
                this.drawTraces(i - 1);
                this.map.jumpTo(cameraOf(prev.view));
                this.placeMarker(prev);
                await U.sleep(700);
                if (this.playing !== token) return;
                for (const r of prev.layers.exit) this.setLayerOpacity(r);
            } else {
                this.drawTraces(-1); // premier chapitre : rien n'est encore dessiné
                this.map.jumpTo({ center: ch.view.center, zoom: Math.max(0, ch.view.zoom - 2.5), pitch: 0, bearing: 0 });
                await U.sleep(500);
                if (this.playing !== token) return;
            }

            // Même déplacement que dans la storymap publiée (type de transition et réglages)
            P.move(this.map, ch);
            this.placeMarker(ch);
            for (const r of ch.layers.enter) this.setLayerOpacity(r);
            this.showData(ch, P.DATA_FADE);
            const drawn = new Promise(resolve => this.drawTraces(i, ch.view.center, true, resolve));

            await this.waitMoveEnd(token);
            if (this.playing !== token) return;
            await drawn;
            if (this.playing !== token) return;
            if (step) step.classList.add('arrived');
            if (ch.rotate) {
                this.setPlayText('Rotation lente (30 s, comme dans la storymap)…');
                this.map.rotateTo(this.map.getBearing() + 180, { duration: 30000, easing: t => t });
                await this.waitMoveEnd(token);
                if (this.playing !== token) return;
            } else {
                await U.sleep(500);
            }
            this.stopPlaying();
        }

        waitMoveEnd(token) {
            const map = this.map;
            return new Promise(resolve => {
                if (!map || !map.isMoving()) { resolve(); return; }
                let poll = null;
                let finished = false;
                const done = () => {
                    if (finished) return;
                    finished = true;
                    clearInterval(poll);
                    try { map.off('moveend', done); } catch (e) { /* carte déjà détruite */ }
                    resolve();
                };
                map.once('moveend', done);
                // Arrêt de la lecture, changement ou destruction de la carte
                poll = setInterval(() => { if (this.playing !== token || this.map !== map) done(); }, 150);
            });
        }

        setPlayText(t) {
            const el = this.playOverlay.querySelector('.play-text');
            if (el) el.textContent = t;
        }

        stopPlaying(silent) {
            if (!this.playing) return;
            this.playing = null;
            this.frame.classList.remove('is-playing', 'sm-reveal-fade', 'sm-reveal-dim');
            this.playOverlay.hidden = true;
            this.playBtn.classList.remove('on');
            if (silent || !this.map) return;
            if (this.hasTraces()) P.stopTraces(this.map);
            this.map.stop();
            this.goTo(this.displayedChapter().view, 'jump');
            this.applyLayerState();
            this.showData(this.displayedChapter(), 0);
            this.drawTraces(Math.max(0, this.displayedIndex()));
            this.updateMarker();
            this.updateInset();
        }

        /* ---------- Réaction aux changements ---------- */

        onStore(evt) {
            if (evt.type === 'selection') {
                this.stopPlaying(true);
                this.buildStory();
                this.updateLabel();
                if (this.map) {
                    // Tableur : carte masquée, placée sans animation
                    const animate = !this.editor.isSheetMode() && SM.prefs.get('animateNavigation') && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                    if (this.hasTraces()) P.stopTraces(this.map); // avant l'arrêt de la carte : le tracé reste où il en est
                    this.goTo(this.displayedChapter().view, animate ? 'fly' : 'jump');
                    this.applyLayerState();
                    this.showData(this.displayedChapter(), animate ? P.DATA_FADE : 0);
                    this.drawTraces(Math.max(0, this.displayedIndex()), this.displayedChapter().view.center, animate);
                    this.updateMarker();
                    this.updateInset();
                }
                this.displayedId = this.displayedChapter().id;
                this.storyEl.scrollTop = 0;
                return;
            }
            if (evt.type !== 'change') return;
            const cfg = evt.config;
            const prev = evt.prev;
            if (this.map) {
                if (styleKey(cfg.style) !== this.currentStyleKey) this.setStyle(cfg.style);
                if (cfg.terrain !== prev.terrain) this.applyTerrain();
                const i = this.displayedIndex();
                const ch = cfg.chapters[i];
                if (ch.id !== this.displayedId) {
                    // Le chapitre affiché a changé sans changement de sélection (couverture ou pied de
                    // page sélectionnés puis chapitres réordonnés, annulation…) : la carte doit suivre.
                    this.goTo(ch.view, 'ease');
                } else {
                    const pch = prev.chapters.find(c => c.id === ch.id) || prev.chapters[i];
                    if (evt.source !== 'map' && (!pch || !sameCamera(ch.view, pch.view))) {
                        this.goTo(ch.view, evt.source === 'history' ? 'ease' : 'jump');
                    }
                }
                const chapterChanged = ch.id !== this.displayedId;
                this.displayedId = ch.id;
                if (cfg.chapters !== prev.chapters) this.applyLayerState();
                // Trajet entre les marqueurs : même objet tant que ses étapes et son style ne changent pas
                if (cfg.data !== prev.data || P.routeData(cfg) !== P.routeData(prev)) this.applyData();
                else {
                    if (chapterChanged) this.showData(ch, P.DATA_FADE);
                    // Cadrages et réglages de tracé des chapitres : parties dessinées recalculées
                    if (cfg.chapters !== prev.chapters && !this.playing) this.drawTraces(i);
                }
                this.updateMarker();
                this.updateInset();
            }
            if (cfg.panels !== prev.panels) this.updateAppearance();
            this.patchStory();
            this.updateLabel();
        }

        /* ---------- Rendu du récit (panneaux) ---------- */

        theme() {
            return this.store.config.theme === 'light' ? 'light' : 'dark';
        }

        buildStory() {
            this.rich.hide();
            U.clear(this.storyEl);
            this.els = {};
            const sel = this.store.selection;
            const cfg = this.store.config;
            this.storyEl.classList.toggle('is-footer', sel.type === 'footer');
            this.storyEl.classList.toggle('is-chapter', sel.type !== 'cover' && sel.type !== 'footer');
            if (sel.type === 'cover') {
                this.storyEl.appendChild(this.buildHeader());
                this.storyEl.appendChild(h('div', { class: 'sm-features' }, this.buildStep(0, true)));
            } else if (sel.type === 'footer') {
                this.storyEl.appendChild(this.buildFooter());
            } else {
                const i = Math.max(0, this.store.chapterIndex());
                this.storyEl.appendChild(h('div', { class: 'sm-features' }, this.buildStep(i, false)));
            }
            this.renderedFor = cfg;
            this.patchStory();
        }

        buildHeader() {
            const header = h('div', { class: 'sm-header ' + this.theme() });
            const note = h('span', { class: 'ed-empty-note', 'data-ed': '' }, 'En-tête masqué dans la storymap tant que ces trois champs sont vides');
            const t = h('h1');
            const s = h('h2');
            const b = h('p');
            const bindField = (el, key, placeholder, label, next) => {
                this.rich.bind(el, {
                    rich: false, placeholder, label,
                    onChange: v => this.store.setStory({ [key]: v }, { label: label, group: 'story:' + key, source: 'canvas' }),
                    onCommit: () => {
                        const v = (this.store.config[key] || '').trim();
                        if (v !== this.store.config[key]) this.store.setStory({ [key]: v }, { label, group: 'story:' + key, source: 'canvas' });
                        this.store.breakGroup();
                    },
                    onEnter: () => (next ? this.focusEnd(next()) : null)
                });
            };
            bindField(t, 'title', 'Titre de la storymap', 'Titre de la storymap', () => s);
            bindField(s, 'subtitle', 'Sous-titre (facultatif)', 'Sous-titre', () => b);
            bindField(b, 'byline', 'Signature : auteur, date… (facultatif)', 'Signature');
            header.append(t, s, b, note);
            this.els.header = header;
            this.els.headerFields = { title: t, subtitle: s, byline: b };
            return header;
        }

        buildFooter() {
            const footer = h('div', { class: 'sm-footer ' + this.theme() });
            const text = h('div', { class: 'sm-footer-text', 'data-ed': '' });
            this.rich.bind(text, {
                rich: true, placeholder: 'Sources, crédits, liens… (le pied de page est masqué s’il est vide)', label: 'Pied de page',
                onChange: html => this.store.setStory({ footer: html }, { label: 'Pied de page', group: 'story:footer', source: 'canvas' }),
                onCommit: () => this.store.breakGroup(),
                bounds: () => this.stage.getBoundingClientRect(),
                getValue: () => this.store.config.footer || '',
                onCode: html => { this.store.setStory({ footer: html }, { label: 'Code HTML du pied de page' }); },
                codeTitle: 'Code HTML du pied de page'
            });
            footer.appendChild(text);
            this.els.footer = footer;
            this.els.footerText = text;
            return footer;
        }

        buildStep(i, ghost) {
            const ch = this.store.config.chapters[i];
            const step = h('div', { class: 'step active', 'data-chapter': ch.id });
            const panel = h('div', { class: 'sm-panel ' + this.theme() });
            const badge = h('span', { class: 'ed-hidden-badge', 'data-ed': '' }, SM.icon('eye-off', 12), 'Panneau masqué dans la storymap');
            const title = h('h3');
            const slot = h('span', { class: 'ed-img-slot', 'data-ed': '', style: 'display:contents' });
            // Légende et crédit de l'image (comme la <figcaption> de la storymap publiée)
            const caption = h('span', { class: 'sm-caption' });
            const credit = h('span', { class: 'sm-credit' });
            const figcap = h('span', { class: 'sm-figcaption' }, caption, credit);
            const desc = h('div', { class: 'sm-desc', 'data-ed': '' });
            panel.append(badge, title, slot, figcap, desc);
            step.appendChild(panel);
            const refs = { step, panel, title, slot, figcap, caption, credit, desc, ghost, id: ch.id };
            this.els.step = refs;

            if (ghost) {
                step.classList.add('is-ghost');
                panel.setAttribute('data-tip', 'Premier chapitre — cliquez pour le modifier');
                panel.addEventListener('click', () => this.store.selectChapterAt(0));
                return step;
            }

            const idx = () => this.store.chapterIndex();
            this.rich.bind(title, {
                rich: false, placeholder: 'Titre du chapitre', label: 'Titre du chapitre',
                onChange: v => this.store.setChapter(idx(), { title: v }, { label: 'Titre du chapitre', group: 'title:' + ch.id, source: 'canvas' }),
                onCommit: () => {
                    const c = this.store.selectedChapter();
                    if (c && c.title !== c.title.trim()) this.store.setChapter(idx(), { title: c.title.trim() }, { label: 'Titre du chapitre', group: 'title:' + ch.id, source: 'canvas' });
                    this.store.breakGroup();
                },
                onEnter: () => this.focusEnd(desc)
            });
            this.rich.bind(desc, {
                rich: true, placeholder: 'Racontez votre histoire… (Entrée : nouvelle ligne)', label: 'Texte du chapitre',
                onChange: html => this.store.setChapter(idx(), { text: html }, { label: 'Texte du chapitre', group: 'text:' + ch.id, source: 'canvas' }),
                onCommit: () => this.store.breakGroup(),
                bounds: () => this.stage.getBoundingClientRect(),
                getValue: () => (this.store.selectedChapter() || {}).text || '',
                onCode: html => this.store.setChapter(idx(), { text: html }, { label: 'Code HTML du texte' }),
                codeTitle: 'Code HTML du texte du chapitre'
            });
            // Légende et crédit : champs d'une ligne, directement sous l'image
            const bindLine = (el, key, placeholder, label, next) => {
                this.rich.bind(el, {
                    rich: false, placeholder, label,
                    onChange: v => this.store.setChapter(idx(), { [key]: v }, { label, group: key + ':' + ch.id, source: 'canvas' }),
                    onCommit: () => {
                        const c = this.store.selectedChapter();
                        const v = c ? (c[key] || '').replace(/\s+/g, ' ').trim() : '';
                        if (c && v !== c[key]) this.store.setChapter(idx(), { [key]: v }, { label, group: key + ':' + ch.id, source: 'canvas' });
                        this.store.breakGroup();
                    },
                    onEnter: () => this.focusEnd(next)
                });
            };
            bindLine(caption, 'imageCaption', 'Légende de l’image (facultative)', 'Légende de l’image', credit);
            bindLine(credit, 'imageCredit', 'Crédit (ex. Photo : Nom / Source)', 'Crédit de l’image', desc);

            // Glisser-déposer / coller une image
            panel.addEventListener('dragover', e => {
                if (!hasImageFile(e.dataTransfer)) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                panel.classList.add('is-dragover');
            });
            panel.addEventListener('dragleave', e => { if (!panel.contains(e.relatedTarget)) panel.classList.remove('is-dragover'); });
            panel.addEventListener('drop', e => {
                panel.classList.remove('is-dragover');
                const file = Array.from(e.dataTransfer && e.dataTransfer.files || []).find(f => (f.type || SM.images.mimeForName(f.name)).startsWith('image/'));
                if (!file) return;
                e.preventDefault();
                e.stopPropagation();
                this.editor.setChapterImageFromFile(idx(), file);
            });
            panel.addEventListener('paste', e => {
                const cd = e.clipboardData;
                if (!cd || cd.getData('text/plain')) return;
                const item = Array.from(cd.items || []).find(it => it.kind === 'file' && it.type.startsWith('image/'));
                if (!item) return;
                e.preventDefault();
                this.editor.setChapterImageFromFile(idx(), item.getAsFile());
            });
            return step;
        }

        focusEnd(el) {
            if (!el) return;
            el.focus();
            const r = document.createRange();
            r.selectNodeContents(el);
            r.collapse(false);
            const s = window.getSelection();
            s.removeAllRanges();
            s.addRange(r);
        }

        renderImage(refs, ch) {
            const slot = refs.slot;
            const src = ch.image || '';
            if (slot.dataset.src === src && slot.dataset.rendered === '1') return;
            slot.dataset.src = src;
            slot.dataset.rendered = '1';
            U.clear(slot);
            if (src) {
                const img = h('img', { src, alt: ch.imageAlt || '' });
                if (refs.ghost) { slot.appendChild(img); return; }
                const chip = (icon, label, fn, danger) => {
                    const b = h('button', { type: 'button', class: 'ed-chip' + (danger ? ' danger' : ''), 'data-ed': '' }, SM.icon(icon, 13), label);
                    b.addEventListener('click', e => { e.stopPropagation(); fn(); });
                    return b;
                };
                const wrap = h('span', { class: 'ed-img-wrap', 'data-ed': '' }, img,
                    h('span', { class: 'ed-img-tools', 'data-ed': '' },
                        chip('image', 'Remplacer', () => this.editor.pickChapterImage(this.store.chapterIndex())),
                        chip('trash', 'Retirer', () => this.editor.removeChapterImage(this.store.chapterIndex()), true)));
                img.addEventListener('error', () => {
                    if (!wrap.isConnected) return;
                    const broken = h('button', { type: 'button', class: 'ed-img-add', 'data-ed': '', style: 'display:flex;opacity:.85' },
                        SM.icon('alert', 16), 'Image introuvable : ' + U.truncate(U.basename(src) || src, 40) + ' — cliquer pour l’intégrer');
                    broken.addEventListener('click', () => this.editor.resolveImages());
                    wrap.replaceWith(broken);
                }, { once: true });
                slot.appendChild(wrap);
            } else if (!refs.ghost) {
                const add = h('button', { type: 'button', class: 'ed-img-add', 'data-ed': '' },
                    SM.icon('image-plus', 17), h('span', {}, 'Ajouter une image'), h('small', {}, 'ou glisser-déposer, coller une image'));
                add.addEventListener('click', () => this.editor.pickChapterImage(this.store.chapterIndex()));
                slot.appendChild(add);
            }
        }

        showImageLoading() {
            const refs = this.els.step;
            if (!refs || refs.ghost) return;
            U.clear(refs.slot);
            refs.slot.dataset.rendered = '0';
            refs.slot.appendChild(h('span', { class: 'ed-img-loading', 'data-ed': '' }, SM.icon('loader', 16, 'spinner'), 'Intégration de l’image…'));
        }

        setText(el, value) {
            if (!el || document.activeElement === el) return;
            if (el.textContent !== value) el.textContent = value;
        }

        setHtml(el, value) {
            if (!el || document.activeElement === el) return;
            if (el.__smValue === value && el.isConnected) return;
            el.__smValue = value;
            el.innerHTML = SM.sanitize.safe(value);
        }

        /** Met à jour le rendu sans reconstruire (préserve la saisie en cours). */
        patchStory() {
            const cfg = this.store.config;
            const theme = this.theme();
            const setTheme = el => { if (el) { el.classList.toggle('dark', theme === 'dark'); el.classList.toggle('light', theme === 'light'); } };

            if (this.els.header) {
                setTheme(this.els.header);
                const f = this.els.headerFields;
                this.setText(f.title, cfg.title || '');
                this.setText(f.subtitle, cfg.subtitle || '');
                this.setText(f.byline, cfg.byline || '');
                this.els.header.classList.toggle('is-empty', !(cfg.title || cfg.subtitle || cfg.byline));
            }
            if (this.els.footer) {
                setTheme(this.els.footer);
                this.setHtml(this.els.footerText, cfg.footer || '');
                this.els.footer.classList.toggle('is-empty', !M.hasContent(cfg.footer));
            }
            const refs = this.els.step;
            if (refs) {
                const i = refs.ghost ? 0 : this.store.chapterIndex();
                const ch = cfg.chapters[i];
                if (!ch) return;
                refs.step.className = 'step active ' + (M.ALIGN_CLASS[ch.align] || 'centered') + (ch.hidden ? ' hidden' : '') + (refs.ghost ? ' is-ghost' : '');
                setTheme(refs.panel);
                if (refs.ghost) {
                    // Rendu identique à la storymap publiée (éléments vides absents)
                    refs.title.style.display = ch.title ? '' : 'none';
                    refs.desc.style.display = ch.text ? '' : 'none';
                    refs.title.textContent = ch.title || '';
                    this.setHtml(refs.desc, ch.text || '');
                    refs.caption.textContent = ch.imageCaption || '';
                    refs.credit.textContent = ch.imageCredit || '';
                    refs.caption.hidden = !ch.imageCaption;
                    refs.credit.hidden = !ch.imageCredit;
                } else {
                    this.setText(refs.title, ch.title || '');
                    this.setHtml(refs.desc, ch.text || '');
                    this.setText(refs.caption, ch.imageCaption || '');
                    this.setText(refs.credit, ch.imageCredit || '');
                }
                // Légende et crédit : seulement sous une image (champs vides visibles au survol, voir frame.css)
                refs.figcap.hidden = !ch.image || (refs.ghost && !ch.imageCaption && !ch.imageCredit);
                refs.figcap.classList.toggle('is-empty', !ch.imageCaption && !ch.imageCredit);
                this.renderImage(refs, ch);
                const img = refs.slot.querySelector('img');
                if (img && img.alt !== (ch.imageAlt || '')) img.alt = ch.imageAlt || '';
                refs.panel.classList.toggle('is-empty', !ch.title && !ch.image && !M.hasContent(ch.text));
            }
            this.rich.position();
        }
    }

    Canvas.DEVICES = DEVICES;
    Canvas.CAMERA_KEYS = CAMERA_KEYS;
    SM.Canvas = Canvas;
})();
