/* ==========================================================================
   StoryMap — modèle de données (format 2)
   --------------------------------------------------------------------------
   Storymap en mémoire (complète, valeurs par défaut comprises) :
   {
     title, subtitle, byline,                    couverture
     style,                                      fond de carte (URL ou style JSON)
     theme,                                      'dark' | 'light'
     panels:  { opacity, font, titleFont, titleSize, titleAlign,
                textSize, lineHeight, textAlign, paddingY, paddingX },
     marker:  { show, icon, size, color },
     route:   { show, color, width, opacity,     trajet d'un marqueur de chapitre au suivant
                dash, progressive, ghost },       (color absente : celle du marqueur)
     inset:   { show, style, position, zoom, color },
     terrain: { show, source, exaggeration },
     data:    [{ id, name,                        calques de données de l'auteur
                 style: { color, fileColors, fileIcons, width, opacity, dash, fillOpacity, radius, labels, ghost },
                 connect,                         points reliés dans l'ordre du fichier
                 progressive,                     lignes dessinées au fil des chapitres
                 chapters,                        chapitres où le calque est affiché (absent : tous)
                 geojson }],                      FeatureCollection (voir SM.geodata)
     autoplay, autoplayDelay, keyboard,          lecture (durée d'affichage en s)
     navigation,                                 navigation des lecteurs
     reveal,                                     texte des chapitres : 'immediate', 'fade', 'dim'
     share:   { url, description },              partage (adresse de publication)
     chapters: [{ id, title, image, imageAlt, imageCaption, imageCredit,
                  text, align, hidden,
                  view: { center, zoom, pitch, bearing },
                  transition: { type, speed, curve, duration },
                  rotate, autoplayDelay,
                  marker,                          false : sans marqueur (vue d'ensemble)
                  route,                           false : pas une étape du trajet (absent : étape)
                  progress: { calque: fraction },  tracé dessiné (absent : jusqu'au marqueur)
                  layers: { enter: [], exit: [] } }],
     footer                                      pied de page (HTML)
   }
   Les valeurs par défaut sont celles du lecteur (SMPlayer.DEFAULTS). Les
   fichiers .json n'enregistrent que les valeurs qui en diffèrent (compact).
   ========================================================================== */
(function () {
    'use strict';

    const SM = window.SM;
    const U = SM.util;
    const P = window.SMPlayer;
    const D = P.DEFAULTS;
    const M = SM.model = {};

    /* ---------- Fonds de carte ---------- */

    const ESRI_IMAGERY = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    const ESRI_LABELS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
    const ESRI_ATTRIBUTION = 'Imagerie © <a href="https://www.esri.com/" target="_blank">Esri</a>, Maxar, Earthstar Geographics';

    const SATELLITE_STYLE = {
        version: 8,
        name: 'Satellite',
        sources: {
            satellite: { type: 'raster', tiles: [ESRI_IMAGERY], tileSize: 256, maxzoom: 19, attribution: ESRI_ATTRIBUTION }
        },
        layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }]
    };

    const HYBRID_STYLE = {
        version: 8,
        name: 'Satellite hybride',
        sources: {
            satellite: { type: 'raster', tiles: [ESRI_IMAGERY], tileSize: 256, maxzoom: 19, attribution: ESRI_ATTRIBUTION },
            labels: { type: 'raster', tiles: [ESRI_LABELS], tileSize: 256, maxzoom: 19 }
        },
        layers: [
            { id: 'satellite', type: 'raster', source: 'satellite' },
            { id: 'labels', type: 'raster', source: 'labels' }
        ]
    };

    M.STYLE_PRESETS = [
        { id: 'voyager', name: 'Voyager', provider: 'CARTO', description: 'Coloré et lisible', url: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json', colors: { land: '#fbf8f3', water: '#a9cdd6', road: '#f6c98d', park: '#dcebd0', minor: '#ffffff' } },
        { id: 'positron', name: 'Positron', provider: 'CARTO', description: 'Clair et épuré', url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json', colors: { land: '#fafaf8', water: '#d4dadc', road: '#ffffff', park: '#eef1ea', minor: '#e6e6e6' } },
        { id: 'dark-matter', name: 'Dark Matter', provider: 'CARTO', description: 'Sombre et élégant', url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json', colors: { land: '#121212', water: '#2c353c', road: '#3d3d3d', park: '#191c19', minor: '#262626' } },
        { id: 'liberty', name: 'Liberty', provider: 'OpenFreeMap', description: 'Détaillé, bâtiments en 3D', url: 'https://tiles.openfreemap.org/styles/liberty', colors: { land: '#f8f4f0', water: '#9ebdff', road: '#fcc98d', park: '#d8e8c8', minor: '#ffffff' } },
        { id: 'bright', name: 'Bright', provider: 'OpenFreeMap', description: 'Vif et contrasté', url: 'https://tiles.openfreemap.org/styles/bright', colors: { land: '#f8f4f0', water: '#aecfe2', road: '#ffcc88', park: '#d2e8c1', minor: '#ffffff' } },
        { id: 'ofm-positron', name: 'Positron', provider: 'OpenFreeMap', description: 'Clair et minimaliste', url: 'https://tiles.openfreemap.org/styles/positron', colors: { land: '#f2f3f0', water: '#c2c8ca', road: '#ffffff', park: '#e6e9e5', minor: '#dcdcdc' } },
        { id: 'ofm-dark', name: 'Dark', provider: 'OpenFreeMap', description: 'Très sombre', url: 'https://tiles.openfreemap.org/styles/dark', colors: { land: '#0c0c0c', water: '#1b1b1d', road: '#2e2e2e', park: '#121212', minor: '#1e1e1e' } },
        { id: 'fiord', name: 'Fiord', provider: 'OpenFreeMap', description: 'Bleu nuit', url: 'https://tiles.openfreemap.org/styles/fiord', colors: { land: '#45516e', water: '#38435c', road: '#6f7c9c', park: '#4b5a78', minor: '#56627f' } },
        { id: 'satellite', name: 'Satellite', provider: 'Esri World Imagery', description: 'Imagerie aérienne', style: SATELLITE_STYLE, colors: { land: '#465a3a', water: '#1d3446', road: '#9a8f78', park: '#3a5130', minor: '#6f6a55' }, satellite: true },
        { id: 'hybrid', name: 'Satellite + noms', provider: 'Esri World Imagery', description: 'Imagerie avec lieux et frontières', style: HYBRID_STYLE, colors: { land: '#465a3a', water: '#1d3446', road: '#e8e2cf', park: '#3a5130', minor: '#6f6a55' }, satellite: true, labels: true }
    ];

    M.DEFAULT_STYLE = D.style;
    M.DEFAULT_INSET_STYLE = D.inset.style;

    /** Deux valeurs de style (URL ou objet) désignent-elles le même fond ? */
    M.sameStyle = function (a, b) {
        if (a === b) return true;
        return !!a && !!b && typeof a === 'object' && typeof b === 'object' && JSON.stringify(a) === JSON.stringify(b);
    };

    /** Retrouve le préréglage correspondant à une valeur de style (URL ou objet). */
    M.findStylePreset = function (style) {
        if (!style) return null;
        if (typeof style === 'string') return M.STYLE_PRESETS.find(p => p.url === style) || null;
        const json = JSON.stringify(style);
        return M.STYLE_PRESETS.find(p => p.style && JSON.stringify(p.style) === json) || null;
    };

    M.styleValue = preset => preset.url || JSON.parse(JSON.stringify(preset.style));

    M.styleLabel = function (style) {
        const p = M.findStylePreset(style);
        if (p) return p.name + ' · ' + p.provider;
        if (typeof style === 'string') {
            try { return 'Personnalisé · ' + new URL(style).hostname; } catch (e) { return 'Style personnalisé'; }
        }
        return 'Style JSON personnalisé';
    };

    /* ---------- Relief 3D ---------- */

    M.TERRAIN_PRESETS = [
        { id: 'mapterhorn', name: 'Mapterhorn', description: 'Mondial, gratuit, sans clé', url: 'https://tiles.mapterhorn.com/tilejson.json' },
        { id: 'maplibre-demo', name: 'Démo MapLibre', description: 'Zone limitée (Alpes autrichiennes)', url: 'https://demotiles.maplibre.org/terrain-tiles/tiles.json' },
        { id: 'maptiler', name: 'MapTiler', description: 'Mondial, clé API gratuite requise', url: 'https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=VOTRE_CLE' }
    ];
    M.DEFAULT_TERRAIN = D.terrain.source;

    /* ---------- Énumérations ---------- */

    M.ALIGNMENTS = [
        { value: 'left', label: 'Gauche', icon: 'panel-left' },
        { value: 'center', label: 'Centre', icon: 'panel-center' },
        { value: 'right', label: 'Droite', icon: 'panel-right' },
        { value: 'full', label: 'Pleine largeur', short: 'Large', icon: 'panel-full' }
    ];
    M.ALIGN_CLASS = P.ALIGN_CLASS;

    M.ANIMATIONS = [
        { value: 'flyTo', label: 'Vol', description: 'Dézoome puis zoome en suivant une courbe : idéal pour les longues distances.' },
        { value: 'easeTo', label: 'Glissement', description: 'Déplacement fluide et direct : idéal entre lieux proches.' },
        { value: 'jumpTo', label: 'Saut', description: 'Changement immédiat, sans animation.' }
    ];

    /** Apparition du texte des chapitres (réglage reveal). */
    M.REVEALS = [
        { value: 'immediate', label: 'Dès le départ', description: 'Le texte d’un chapitre s’affiche dès que le lecteur y arrive, pendant que la carte se déplace.' },
        { value: 'fade', label: 'À l’arrivée', description: 'Le texte reste masqué pendant le déplacement de la carte et le dessin du trajet, puis apparaît en fondu.' },
        { value: 'dim', label: 'Atténué', description: 'Le texte reste atténué pendant le déplacement de la carte et le dessin du trajet, puis s’affiche pleinement.' }
    ];

    M.INSET_POSITIONS = [
        { value: 'top-left', label: 'En haut à gauche' },
        { value: 'top-right', label: 'En haut à droite' },
        { value: 'bottom-left', label: 'En bas à gauche' },
        { value: 'bottom-right', label: 'En bas à droite' }
    ];

    /** Types de couches pris en charge par les règles de couches (et propriétés modifiées). */
    M.LAYER_TYPES = P.LAYER_TYPES;

    M.LAYER_TYPE_LABELS = {
        fill: 'Surface', line: 'Ligne', circle: 'Cercle', symbol: 'Texte / icône', raster: 'Image',
        'fill-extrusion': 'Volume 3D', heatmap: 'Carte de chaleur', hillshade: 'Ombrage'
    };

    M.MAX_PITCH = 60; // inclinaison maximale par défaut de MapLibre GL JS 4.x

    M.DEFAULT_VIEW = { center: [2.35, 46.6], zoom: 4.8, pitch: 0, bearing: 0 };

    /* ---------- Ordre des clés (fichiers lisibles et stables) ---------- */

    const STORY_KEYS = ['title', 'subtitle', 'byline', 'style', 'theme', 'panels', 'marker', 'route', 'inset', 'terrain', 'data',
        'autoplay', 'autoplayDelay', 'keyboard', 'navigation', 'reveal', 'share', 'chapters', 'footer'];
    const PANEL_KEYS = ['opacity', 'font', 'titleFont', 'titleSize', 'titleAlign', 'textSize', 'lineHeight', 'textAlign', 'paddingY', 'paddingX'];
    const MARKER_KEYS = ['show', 'icon', 'size', 'color'];
    const ROUTE_KEYS = ['show', 'color', 'width', 'opacity', 'dash', 'progressive', 'ghost'];
    const INSET_KEYS = ['show', 'style', 'position', 'zoom', 'color'];
    const TERRAIN_KEYS = ['show', 'source', 'exaggeration'];
    const SHARE_KEYS = ['url', 'description'];
    const DATA_KEYS = ['id', 'name', 'style', 'connect', 'progressive', 'chapters', 'geojson'];
    const DATA_STYLE_KEYS = ['color', 'fileColors', 'fileIcons', 'width', 'opacity', 'dash', 'fillOpacity', 'radius', 'labels', 'ghost'];
    const CHAPTER_KEYS = ['id', 'title', 'image', 'imageAlt', 'imageCaption', 'imageCredit', 'text', 'align', 'hidden',
        'view', 'transition', 'rotate', 'autoplayDelay', 'marker', 'route', 'progress', 'layers'];
    const VIEW_KEYS = ['center', 'zoom', 'pitch', 'bearing'];
    const TRANSITION_KEYS = ['type', 'speed', 'curve', 'duration'];

    /** Copie limitée aux clés connues, dans l'ordre indiqué. */
    function ordered(obj, order) {
        const out = {};
        for (const k of order) if (obj[k] !== undefined) out[k] = obj[k];
        return out;
    }

    const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
    const str = v => (v === undefined || v === null ? '' : String(v));

    /** Nombre valide (éventuellement borné et arrondi), sinon fallback. */
    function num(v, fallback, min, max, digits) {
        const n = U.toNum(v, NaN);
        if (!isFinite(n)) return fallback;
        const c = min === undefined ? n : U.clamp(n, min, max);
        return digits === undefined ? c : U.round(c, digits);
    }

    /** Le HTML contient-il du texte ou un média ? */
    M.hasContent = html => !!U.stripHtml(html) || /<(img|iframe|video|audio)\b/i.test(html || '');

    /* ---------- Fabriques ---------- */

    M.createChapter = function (config, overrides) {
        const o = overrides || {};
        const view = Object.assign({}, M.DEFAULT_VIEW, o.view || {});
        view.center = view.center.slice();
        return {
            id: o.id || M.uniqueChapterId(config, 'chapitre'),
            title: o.title || '',
            image: o.image || '',
            imageAlt: o.imageAlt || '',
            imageCaption: o.imageCaption || '',
            imageCredit: o.imageCredit || '',
            text: o.text || '',
            align: o.align || D.chapter.align,
            hidden: !!o.hidden,
            view: ordered(view, VIEW_KEYS),
            transition: Object.assign({}, o.transition || D.transition),
            rotate: !!o.rotate,
            layers: { enter: [], exit: [] }
        };
    };

    M.createConfig = function (opts) {
        opts = opts || {};
        const cfg = {
            title: opts.title || 'Ma storymap',
            subtitle: opts.subtitle || '',
            byline: opts.byline || '',
            style: D.style,
            theme: D.theme,
            panels: M.normalizePanels({}),
            marker: Object.assign({}, D.marker),
            route: M.normalizeRoute({}),
            inset: Object.assign({}, D.inset),
            terrain: Object.assign({}, D.terrain),
            data: [],
            autoplay: D.autoplay,
            autoplayDelay: D.autoplayDelay,
            keyboard: D.keyboard,
            navigation: D.navigation,
            reveal: D.reveal,
            share: Object.assign({}, D.share),
            chapters: [],
            footer: opts.footer || ''
        };
        cfg.chapters = [M.createChapter(cfg, { id: 'chapitre-1', title: 'Premier chapitre' })];
        return cfg;
    };

    /** Identifiant unique de la forme « racine-N » (racine = base sans numéro final). */
    M.uniqueChapterId = function (config, base) {
        const used = new Set((config && config.chapters || []).map(c => c.id));
        const root = (U.slugify(base) || 'chapitre').replace(/-\d+$/, '') || 'chapitre';
        let n = 1;
        while (used.has(root + '-' + n)) n++;
        return root + '-' + n;
    };

    M.chapterLabel = function (ch, index) {
        const t = ch && ch.title ? String(ch.title).trim() : '';
        return t || ('Chapitre ' + (index + 1));
    };

    /** La storymap n'a qu'un chapitre, encore vide (nouvelle storymap) ? */
    M.isBlank = cfg => cfg.chapters.length === 1 && !cfg.chapters[0].image && !M.hasContent(cfg.chapters[0].text) &&
        ['', 'Premier chapitre'].includes(String(cfg.chapters[0].title || '').trim());

    /* ---------- Calques de données ---------- */

    /** Identifiant de calque unique, tiré de son nom. */
    M.uniqueDataId = function (config, base) {
        const used = new Set((config && config.data || []).map(d => d.id));
        const root = U.slugify(base, 40) || 'donnees';
        if (!used.has(root)) return root;
        let n = 2;
        while (used.has(root + '-' + n)) n++;
        return root + '-' + n;
    };

    /** Nouveau calque : o = { name, geojson, style? } (couleur libre de la palette par défaut). */
    M.createData = function (config, o) {
        const used = (config.data || []).map(d => d.style.color);
        return ordered({
            id: M.uniqueDataId(config, o.name),
            name: line(o.name).slice(0, 80) || 'Données',
            style: M.normalizeDataStyle(Object.assign({ color: SM.geodata.nextColor(used) }, o.style)),
            connect: false,
            progressive: false,
            geojson: o.geojson
        }, DATA_KEYS);
    };

    /** Le calque a-t-il des lignes dessinées au fil des chapitres ? */
    M.isTraced = P.isTraced;

    /** Géométries affichées d'un calque (avec la ligne qui relie ses points, s'il y a lieu). */
    M.dataShape = P.dataShape;

    /** Le calque est-il affiché dans ce chapitre ? */
    M.dataShown = P.dataShown;

    const COLOR_RE = /^#[0-9a-f]{3,8}$|^(rgb|hsl)a?\([^()]*\)$|^[a-z]{3,20}$/i;

    /** Style d'un calque, complet et valide. */
    M.normalizeDataStyle = function (input) {
        const SD = D.dataStyle;
        const src = isObj(input) ? input : {};
        const color = str(src.color).trim();
        return ordered({
            color: COLOR_RE.test(color) ? color : SD.color,
            fileColors: src.fileColors === undefined ? SD.fileColors : !!src.fileColors,
            fileIcons: src.fileIcons === undefined ? SD.fileIcons : !!src.fileIcons,
            width: num(src.width, SD.width, 0.5, 30, 1),
            opacity: num(src.opacity, SD.opacity, 0, 1, 2),
            dash: src.dash === undefined ? SD.dash : !!src.dash,
            fillOpacity: num(src.fillOpacity, SD.fillOpacity, 0, 1, 2),
            radius: num(src.radius, SD.radius, 1, 40, 1),
            labels: src.labels === undefined ? SD.labels : !!src.labels,
            ghost: src.ghost === undefined ? SD.ghost : !!src.ghost
        }, DATA_STYLE_KEYS);
    };

    /** Chapitres d'un calque : identifiants connus, dans l'ordre du récit ; undefined s'ils y sont tous. */
    function dataChapters(list, chapterIds) {
        const wanted = new Set(list.map(String));
        const out = chapterIds.filter(id => wanted.has(id));
        return out.length === chapterIds.length ? undefined : out;
    }

    function normalizeData(list, chapterIds, warnings) {
        if (list === undefined || list === null) return [];
        if (!Array.isArray(list)) {
            warnings.push('Calques de données illisibles : ignorés.');
            return [];
        }
        const ids = new Set();
        const out = [];
        list.forEach((d, i) => {
            if (!isObj(d)) { warnings.push('Calque de données ' + (i + 1) + ' illisible : ignoré.'); return; }
            const name = line(d.name).slice(0, 80) || 'Données ' + (i + 1);
            const geojson = SM.geodata.clean(d.geojson);
            if (!geojson) { warnings.push('Calque « ' + name + ' » : géométries absentes ou invalides, calque ignoré.'); return; }
            if (geojson !== d.geojson) {
                const removed = geojson.features.length < d.geojson.features.length;
                warnings.push('Calque « ' + name + ' » : ' + (removed ? 'géométries invalides retirées.' : 'icônes invalides retirées.'));
            }
            let id = str(d.id).trim().slice(0, 64) || U.slugify(name, 40) || 'donnees';
            // Identifiant réservé au trajet entre les marqueurs : jamais celui d'un calque
            if (id === P.ROUTE_ID) id = U.slugify(name, 40) || 'donnees';
            if (ids.has(id)) {
                let n = 2;
                while (ids.has(id + '-' + n)) n++;
                id = id + '-' + n;
            }
            ids.add(id);
            out.push(ordered({
                id, name,
                style: M.normalizeDataStyle(d.style),
                connect: d.connect === true,
                progressive: d.progressive === true,
                chapters: Array.isArray(d.chapters) ? dataChapters(d.chapters, chapterIds) : undefined,
                geojson
            }, DATA_KEYS));
        });
        return out;
    }

    /* ---------- Normalisation (import, chargement) ---------- */

    function normalizeView(view, label, warnings) {
        const src = isObj(view) ? view : {};
        let center = src.center;
        if (isObj(center)) center = [center.lng !== undefined ? center.lng : center.lon, center.lat];
        const lng = Array.isArray(center) ? U.toNum(center[0], NaN) : NaN;
        const lat = Array.isArray(center) ? U.toNum(center[1], NaN) : NaN;
        const out = {};
        if (!isFinite(lng) || !isFinite(lat)) {
            out.center = M.DEFAULT_VIEW.center.slice();
            warnings.push(label + ' : position de la carte absente ou invalide, remplacée par une vue par défaut.');
        } else {
            out.center = [lng, U.clamp(lat, -85.05, 85.05)];
        }
        out.zoom = num(src.zoom, isFinite(lng) ? 10 : M.DEFAULT_VIEW.zoom, 0, 24);
        out.pitch = num(src.pitch, 0, 0, 85);
        out.bearing = num(src.bearing, 0);
        return out;
    }

    function normalizeTransition(t, label, warnings) {
        const src = isObj(t) ? t : {};
        const out = { type: P.TRANSITIONS.includes(src.type) ? src.type : D.transition.type };
        if (src.type && out.type !== src.type) warnings.push(label + ' : transition « ' + src.type + ' » inconnue, remplacée par « Vol ».');
        // Réglages conservés même s'ils ne s'appliquent pas au type choisi
        const speed = num(src.speed, undefined, 0.01, 10, 2);
        const curve = num(src.curve, undefined, 0.01, 10, 2);
        const duration = num(src.duration, undefined, 0, 600000, 0);
        if (speed !== undefined) out.speed = speed;
        if (curve !== undefined) out.curve = curve;
        if (duration !== undefined) out.duration = duration;
        return out;
    }

    function normalizeRules(list, label, warnings) {
        if (!Array.isArray(list)) return [];
        const out = [];
        for (const r of list) {
            if (!isObj(r) || !str(r.layer).trim()) continue;
            const rule = { layer: str(r.layer).trim(), opacity: num(r.opacity, 1, 0, 1) };
            const d = num(r.duration, 0, 0, 600000, 0);
            if (d) rule.duration = d;
            out.push(rule);
        }
        if (out.length !== list.length) warnings.push(label + ' : règles de couches invalides ignorées.');
        return out;
    }

    function normalizeChapter(ch, index, ids, warnings) {
        const label = 'Chapitre ' + (index + 1);
        const c = isObj(ch) ? ch : {};

        let id = str(c.id).trim();
        if (!id) {
            id = 'chapitre-' + (index + 1);
            while (ids.has(id)) id += '-bis';
            warnings.push(label + ' : identifiant manquant, « ' + id + ' » attribué.');
        } else if (ids.has(id)) {
            let n = 2;
            while (ids.has(id + '-' + n)) n++;
            warnings.push(label + ' : identifiant « ' + id + ' » en double, renommé « ' + id + '-' + n + ' ».');
            id = id + '-' + n;
        }
        ids.add(id);

        let align = c.align;
        if (!M.ALIGN_CLASS[align]) {
            if (align !== undefined && align !== '') warnings.push(label + ' : alignement « ' + align + ' » inconnu, remplacé par « ' + D.chapter.align + ' ».');
            align = D.chapter.align;
        }
        const text = SM.sanitize.safeReport(str(c.text));
        if (text.changed) warnings.push(label + ' : code potentiellement dangereux retiré du texte.');
        const layers = isObj(c.layers) ? c.layers : {};
        return ordered({
            id,
            title: str(c.title),
            image: str(c.image),
            imageAlt: line(c.imageAlt),
            imageCaption: line(c.imageCaption),
            imageCredit: line(c.imageCredit),
            text: text.html,
            align,
            hidden: !!c.hidden,
            view: normalizeView(c.view, label, warnings),
            transition: normalizeTransition(c.transition, label, warnings),
            rotate: !!c.rotate,
            autoplayDelay: num(c.autoplayDelay, undefined, 0, 600, 1),
            marker: c.marker === false ? false : undefined,
            route: c.route === false ? false : undefined,
            progress: normalizeProgress(c.progress),
            layers: { enter: normalizeRules(layers.enter, label, warnings), exit: normalizeRules(layers.exit, label, warnings) }
        }, CHAPTER_KEYS);
    }

    /** Tracés progressifs : { calque: fraction dessinée (0 à 1) } ; undefined si vide. */
    function normalizeProgress(input) {
        if (!isObj(input)) return undefined;
        const out = {};
        for (const k of Object.keys(input)) {
            const v = num(input[k], undefined, 0, 1, 3);
            if (v !== undefined) out[k] = v;
        }
        return Object.keys(out).length ? out : undefined;
    }

    /** Réglages de tracé des chapitres limités aux calques existants (même tableau si rien ne change). */
    function keepProgress(chapters, dataIds) {
        let changed = false;
        const out = chapters.map(ch => {
            if (!ch.progress) return ch;
            const p = {};
            for (const k of Object.keys(ch.progress)) if (dataIds.has(k)) p[k] = ch.progress[k];
            if (Object.keys(p).length === Object.keys(ch.progress).length) return ch;
            changed = true;
            return ordered(Object.assign({}, ch, { progress: Object.keys(p).length ? p : undefined }), CHAPTER_KEYS);
        });
        return changed ? out : chapters;
    }

    /** Texte sur une ligne (espaces multiples et retours à la ligne réduits). */
    function line(v) {
        return str(v).replace(/\s+/g, ' ').trim();
    }

    /** Partage : adresse de publication (http/https) et description des aperçus de lien. */
    function normalizeShare(input) {
        const src = isObj(input) ? input : {};
        const url = str(src.url).trim();
        return {
            url: /^https?:\/\/[^\s"'<>]+$/i.test(url) ? url : '',
            description: line(src.description).slice(0, 300)
        };
    }

    M.normalizeShare = normalizeShare;

    /** Réglages des panneaux complets et valides (polices : catalogue ou nom Google Fonts). */
    M.normalizePanels = function (input) {
        const PD = D.panels;
        const src = isObj(input) ? input : {};
        const out = { opacity: num(src.opacity, PD.opacity, 0, 1, 2) };
        const font = (key, allowSystem) => {
            if (src[key] === undefined || src[key] === null || src[key] === '') return;
            const entry = SM.appearance.fontEntry(String(src[key]).trim());
            // « system » = police par défaut : inutile pour le texte, significatif pour les titres
            if (entry && (allowSystem || entry.id !== 'system')) out[key] = entry.id;
        };
        font('font', false);
        font('titleFont', true);
        const titleSize = num(src.titleSize, undefined, 8, 96, 1);
        if (titleSize !== undefined) out.titleSize = titleSize;
        out.titleAlign = ['left', 'center', 'right'].includes(src.titleAlign) ? src.titleAlign : PD.titleAlign;
        out.textSize = num(src.textSize, PD.textSize, 8, 48, 1);
        const lineHeight = num(src.lineHeight, undefined, 0.8, 4, 2);
        if (lineHeight !== undefined) out.lineHeight = lineHeight;
        out.textAlign = ['left', 'center', 'right', 'justify'].includes(src.textAlign) ? src.textAlign : PD.textAlign;
        out.paddingY = num(src.paddingY, PD.paddingY, 0, 200, 0);
        out.paddingX = num(src.paddingX, PD.paddingX, 0, 200, 0);
        return ordered(out, PANEL_KEYS);
    };

    function normalizeMarker(input, warnings) {
        const MD = D.marker;
        const src = isObj(input) ? input : {};
        let icon = str(src.icon).trim() || MD.icon;
        if (!P.ICONS[icon]) {
            warnings.push('Icône de marqueur « ' + icon + ' » inconnue : épingle utilisée.');
            icon = MD.icon;
        }
        return ordered({
            show: src.show === undefined ? MD.show : !!src.show,
            icon,
            size: num(src.size, undefined, 8, 160, 0),
            color: str(src.color).trim() || MD.color
        }, MARKER_KEYS);
    }

    /** Trajet entre les marqueurs des chapitres : réglages complets et valides (couleur absente : celle du marqueur). */
    M.normalizeRoute = function (input) {
        const RD = D.route;
        const src = isObj(input) ? input : {};
        const color = str(src.color).trim();
        return ordered({
            show: src.show === undefined ? RD.show : !!src.show,
            color: color && COLOR_RE.test(color) ? color : undefined,
            width: num(src.width, RD.width, 0.5, 30, 1),
            opacity: num(src.opacity, RD.opacity, 0.05, 1, 2),
            dash: src.dash === undefined ? RD.dash : !!src.dash,
            progressive: src.progressive === undefined ? RD.progressive : !!src.progressive,
            ghost: src.ghost === undefined ? RD.ghost : !!src.ghost
        }, ROUTE_KEYS);
    };

    /** Trajet entre les marqueurs (calque dérivé des chapitres), ou null. */
    M.routeData = P.routeData;

    function normalizeInset(input, warnings) {
        const ID = D.inset;
        const src = isObj(input) ? input : {};
        let position = src.position;
        if (!P.POSITIONS.includes(position)) {
            if (position) warnings.push('Position de la mini-carte « ' + position + ' » inconnue, remplacée par « en bas à droite ».');
            position = ID.position;
        }
        const style = (typeof src.style === 'string' && src.style.trim()) || isObj(src.style) ? src.style : ID.style;
        return ordered({
            show: src.show === undefined ? ID.show : !!src.show,
            style,
            position,
            zoom: num(src.zoom, ID.zoom, 0, 22, 2),
            color: str(src.color).trim() || ID.color
        }, INSET_KEYS);
    }

    function normalizeTerrain(input) {
        const TD = D.terrain;
        const src = isObj(input) ? input : {};
        return ordered({
            show: src.show === undefined ? TD.show : !!src.show,
            source: str(src.source).trim() || TD.source,
            exaggeration: num(src.exaggeration, TD.exaggeration, 0.1, 10, 2)
        }, TERRAIN_KEYS);
    }

    /**
     * Valide et complète une storymap (format 2, éventuellement abrégé).
     * @returns {{config: object, warnings: string[]}}
     */
    M.normalize = function (input) {
        if (!isObj(input)) throw new Error('Le contenu ne correspond pas à une storymap.');
        if (!Array.isArray(input.chapters)) throw new Error('Aucun chapitre trouvé : la storymap doit contenir un tableau « chapters ».');
        const warnings = [];
        const c = {
            title: str(input.title),
            subtitle: str(input.subtitle),
            byline: str(input.byline)
        };
        if ((typeof input.style === 'string' && input.style.trim()) || isObj(input.style)) {
            c.style = input.style;
        } else {
            if (input.style !== undefined) warnings.push('Fond de carte invalide, remplacé par « Voyager ».');
            c.style = D.style;
        }
        if (input.theme !== undefined && input.theme !== 'light' && input.theme !== 'dark') warnings.push('Thème « ' + input.theme + ' » inconnu, remplacé par « sombre ».');
        c.theme = input.theme === 'light' ? 'light' : 'dark';
        c.panels = M.normalizePanels(input.panels);
        c.marker = normalizeMarker(input.marker, warnings);
        c.route = M.normalizeRoute(input.route);
        c.inset = normalizeInset(input.inset, warnings);
        c.terrain = normalizeTerrain(input.terrain);
        c.autoplay = input.autoplay === undefined ? D.autoplay : !!input.autoplay;
        c.autoplayDelay = num(input.autoplayDelay, D.autoplayDelay, 0, 600, 1);
        c.keyboard = input.keyboard === undefined ? D.keyboard : !!input.keyboard;
        c.navigation = input.navigation === undefined ? D.navigation : !!input.navigation;
        if (input.reveal !== undefined && !P.REVEALS.includes(input.reveal)) warnings.push('Apparition du texte « ' + input.reveal + ' » inconnue : texte affiché dès le début des transitions.');
        c.reveal = P.REVEALS.includes(input.reveal) ? input.reveal : D.reveal;
        c.share = normalizeShare(input.share);

        const ids = new Set();
        c.chapters = input.chapters.map((ch, i) => normalizeChapter(ch, i, ids, warnings));
        if (!c.chapters.length) {
            c.chapters.push(M.createChapter(c, { id: 'chapitre-1', title: 'Premier chapitre' }));
            warnings.push('La storymap ne contenait aucun chapitre : un chapitre vide a été ajouté.');
        }
        c.data = normalizeData(input.data, c.chapters.map(ch => ch.id), warnings);
        c.chapters = keepProgress(c.chapters, new Set(c.data.map(d => d.id)));
        const footer = SM.sanitize.safeReport(str(input.footer));
        if (footer.changed) warnings.push('Code potentiellement dangereux retiré du pied de page.');
        c.footer = footer.html;
        return { config: ordered(c, STORY_KEYS), warnings };
    };

    /* ---------- Ancien format (version 1) ---------- */

    const V1_TERRAIN = 'https://demotiles.maplibre.org/terrain-tiles/tiles.json'; // relief implicite de l'ancien format
    const V1_INSET_COLOR = '#ff6b6b';                                            // point implicite de l'ancienne mini-carte

    /**
     * Convertit une storymap de l'ancien format (version 1) : le rendu est
     * conservé, les fonctions de rappel (callback) ne sont plus prises en charge.
     * @returns {{config: object, warnings: string[]}}
     */
    M.fromV1 = function (v1) {
        if (!isObj(v1) || !Array.isArray(v1.chapters)) throw new Error('Storymap illisible : tableau « chapters » introuvable.');
        const warnings = [];
        const ps = isObj(v1.panelStyle) ? v1.panelStyle : {};
        const insetOptions = isObj(v1.insetOptions) ? v1.insetOptions : {};
        const story = {
            title: v1.title,
            subtitle: v1.subtitle,
            byline: v1.byline,
            style: v1.style,
            theme: v1.theme,
            panels: {
                opacity: ps.backgroundOpacity, font: ps.fontFamily, titleFont: ps.titleFontFamily,
                titleSize: ps.titleSize, titleAlign: ps.titleAlign, textSize: ps.textSize, lineHeight: ps.lineHeight,
                textAlign: ps.textAlign, paddingY: ps.paddingY, paddingX: ps.paddingX
            },
            marker: { show: !!v1.showMarkers, icon: v1.markerIcon, size: v1.markerSize, color: v1.markerColor },
            inset: {
                show: !!v1.inset, style: v1.insetStyle, position: v1.insetPosition, zoom: v1.insetZoom,
                color: insetOptions.markerColor || V1_INSET_COLOR
            },
            terrain: {
                show: !!v1.use3dTerrain,
                source: v1.terrainSource || (v1.use3dTerrain ? V1_TERRAIN : undefined),
                exaggeration: v1.terrainExaggeration
            },
            autoplay: !!v1.auto,
            keyboard: v1.keyboardNavigation !== false,
            chapters: v1.chapters.map((ch, i) => {
                const c = isObj(ch) ? ch : {};
                const loc = isObj(c.location) ? c.location : {};
                const callback = str(c.callback).trim();
                if (callback) warnings.push('Chapitre ' + (i + 1) + ' : fonction de rappel « ' + callback + ' » retirée (non prise en charge).');
                return {
                    id: c.id,
                    title: c.title,
                    image: c.image,
                    text: c.description,
                    // Alignement absent ou inconnu : l'ancien format centrait le panneau
                    align: M.ALIGN_CLASS[c.alignment] ? c.alignment : 'center',
                    hidden: c.hidden,
                    view: { center: loc.center, zoom: loc.zoom, pitch: loc.pitch, bearing: loc.bearing },
                    transition: { type: c.mapAnimation || D.transition.type, speed: loc.speed, curve: loc.curve, duration: loc.duration },
                    rotate: c.rotateAnimation,
                    layers: { enter: c.onChapterEnter, exit: c.onChapterExit }
                };
            }),
            footer: v1.footer
        };
        const res = M.normalize(story);
        return { config: res.config, warnings: warnings.concat(res.warnings) };
    };

    /* ---------- Forme abrégée (fichiers .json) ---------- */

    /** Valeurs de obj qui diffèrent de defaults (null si aucune). */
    function diff(obj, defaults, keys) {
        const out = {};
        for (const k of keys) {
            if (obj[k] === undefined || U.deepEqual(obj[k], defaults[k])) continue;
            out[k] = obj[k];
        }
        return Object.keys(out).length ? out : null;
    }

    function compactChapter(ch) {
        const out = { id: ch.id };
        if (ch.title) out.title = ch.title;
        if (ch.image) out.image = ch.image;
        for (const k of ['imageAlt', 'imageCaption', 'imageCredit']) if (ch[k]) out[k] = ch[k];
        if (ch.text) out.text = ch.text;
        if (ch.align && ch.align !== D.chapter.align) out.align = ch.align;
        if (ch.hidden) out.hidden = true;
        const v = ch.view || {};
        out.view = { center: v.center, zoom: v.zoom };
        if (v.pitch) out.view.pitch = v.pitch;
        if (v.bearing) out.view.bearing = v.bearing;
        const transition = diff(ch.transition || {}, D.transition, TRANSITION_KEYS);
        if (transition) out.transition = transition;
        if (ch.rotate) out.rotate = true;
        if (U.isNum(ch.autoplayDelay)) out.autoplayDelay = ch.autoplayDelay;
        if (ch.marker === false) out.marker = false;
        if (ch.route === false) out.route = false;
        if (ch.progress && Object.keys(ch.progress).length) out.progress = Object.assign({}, ch.progress);
        const rules = r => r.map(x => (x.duration ? { layer: x.layer, opacity: x.opacity, duration: x.duration } : { layer: x.layer, opacity: x.opacity }));
        const enter = rules((ch.layers && ch.layers.enter) || []);
        const exit = rules((ch.layers && ch.layers.exit) || []);
        if (enter.length || exit.length) {
            out.layers = {};
            if (enter.length) out.layers.enter = enter;
            if (exit.length) out.layers.exit = exit;
        }
        return out;
    }

    function compactData(d) {
        const out = { id: d.id, name: d.name };
        const style = diff(d.style || {}, D.dataStyle, DATA_STYLE_KEYS);
        if (style) out.style = style;
        if (d.connect) out.connect = true;
        if (d.progressive) out.progressive = true;
        if (Array.isArray(d.chapters)) out.chapters = d.chapters.slice();
        out.geojson = d.geojson;
        return out;
    }

    /** Storymap sans les valeurs par défaut (M.normalize la complète à l'identique). */
    M.compact = function (config) {
        const out = {};
        for (const k of ['title', 'subtitle', 'byline']) if (config[k]) out[k] = config[k];
        if (!M.sameStyle(config.style, D.style)) out.style = config.style;
        if (config.theme !== D.theme) out.theme = config.theme;
        const groups = { panels: [D.panels, PANEL_KEYS], marker: [D.marker, MARKER_KEYS], route: [D.route, ROUTE_KEYS], inset: [D.inset, INSET_KEYS], terrain: [D.terrain, TERRAIN_KEYS] };
        for (const key of Object.keys(groups)) {
            const d = diff(config[key] || {}, groups[key][0], groups[key][1]);
            if (d) out[key] = d;
        }
        if (config.data && config.data.length) out.data = config.data.map(compactData);
        if (config.autoplay !== D.autoplay) out.autoplay = !!config.autoplay;
        if (U.isNum(config.autoplayDelay) && config.autoplayDelay !== D.autoplayDelay) out.autoplayDelay = config.autoplayDelay;
        if (config.keyboard !== D.keyboard) out.keyboard = !!config.keyboard;
        if (config.navigation !== undefined && config.navigation !== D.navigation) out.navigation = !!config.navigation;
        if (config.reveal && config.reveal !== D.reveal) out.reveal = config.reveal;
        const share = diff(config.share || {}, D.share, SHARE_KEYS);
        if (share) out.share = share;
        out.chapters = (config.chapters || []).map(compactChapter);
        if (config.footer) out.footer = config.footer;
        return out;
    };

    /* ---------- Images ---------- */

    M.isDataUrl = s => typeof s === 'string' && /^data:/i.test(s);
    M.isRemoteUrl = s => typeof s === 'string' && /^(https?:)?\/\//i.test(s);

    /**
     * Liste les images non intégrées (ni data: ni vide) : images de chapitres
     * et balises <img> des textes et du pied de page.
     */
    M.findUnembeddedImages = function (config) {
        const out = [];
        (config.chapters || []).forEach((ch, i) => {
            if (ch.image && !M.isDataUrl(ch.image)) out.push({ kind: 'chapter', index: i, src: ch.image });
            for (const src of M.inlineImageSources(ch.text)) {
                if (!M.isDataUrl(src)) out.push({ kind: 'text', index: i, src });
            }
        });
        for (const src of M.inlineImageSources(config.footer)) {
            if (!M.isDataUrl(src)) out.push({ kind: 'footer', index: -1, src });
        }
        return out;
    };

    M.inlineImageSources = function (html) {
        if (!html || html.indexOf('<img') === -1) return [];
        const out = [];
        const re = /<img\b[^>]*?\bsrc\s*=\s*(["'])(.*?)\1/gi;
        let m;
        while ((m = re.exec(html))) out.push(m[2].replace(/&amp;/g, '&'));
        return out;
    };

    /**
     * Remplace les sources d'images (chapitres + HTML).
     * mapFn(src, kind, index) → nouvelle src, ou undefined pour ne rien changer.
     * kind : 'chapter' | 'inline' ; index : n° de chapitre (-1 = pied de page).
     */
    M.mapImages = function (config, mapFn) {
        const replaceInHtml = (html, index) => {
            if (!html || html.indexOf('<img') === -1) return html;
            return html.replace(/(<img\b[^>]*?\bsrc\s*=\s*)(["'])(.*?)\2/gi, (all, pre, q, src) => {
                const next = mapFn(src.replace(/&amp;/g, '&'), 'inline', index);
                return next === undefined || next === null ? all : pre + q + next + q;
            });
        };
        let any = false;
        const chapters = (config.chapters || []).map((ch, i) => {
            let changed = false;
            const out = Object.assign({}, ch);
            if (ch.image) {
                const next = mapFn(ch.image, 'chapter', i);
                if (next !== undefined && next !== null && next !== ch.image) { out.image = next; changed = true; }
            }
            const text = replaceInHtml(ch.text, i);
            if (text !== ch.text) { out.text = text; changed = true; }
            if (changed) any = true;
            return changed ? out : ch;
        });
        const footer = replaceInHtml(config.footer, -1);
        if (!any && footer === config.footer) return config;
        return Object.assign({}, config, { chapters, footer });
    };

    M.firstImage = function (config) {
        for (const ch of config.chapters || []) {
            if (ch.image && (M.isDataUrl(ch.image) || M.isRemoteUrl(ch.image))) return ch.image;
        }
        return null;
    };

    /* ---------- Validation ---------- */

    /** Renvoie la liste des problèmes détectés : { level, message, index? } */
    M.validate = function (config) {
        const issues = [];
        (config.chapters || []).forEach((ch, i) => {
            const label = '« ' + M.chapterLabel(ch, i) + ' »';
            if (!ch.hidden && !String(ch.title || '').trim() && !ch.image && !M.hasContent(ch.text)) {
                issues.push({ level: 'warning', index: i, message: label + ' : le panneau est vide (ni titre, ni image, ni texte).' });
            }
            if (ch.view && ch.view.pitch > M.MAX_PITCH) {
                issues.push({ level: 'warning', index: i, message: label + ' : inclinaison de ' + ch.view.pitch + '°, limitée à ' + M.MAX_PITCH + '° par MapLibre.' });
            }
            const rules = ch.layers ? (ch.layers.enter || []).concat(ch.layers.exit || []) : [];
            if (rules.some(r => !r.layer)) issues.push({ level: 'error', index: i, message: label + ' : une règle de couche n’a pas de nom de couche.' });
        });
        // Accessibilité : images des chapitres sans texte alternatif (signalées une seule fois)
        const noAlt = (config.chapters || []).map((ch, i) => (ch.image && !ch.hidden && !String(ch.imageAlt || '').trim() ? i : -1)).filter(i => i >= 0);
        if (noAlt.length) {
            issues.push({
                level: 'info', index: noAlt[0],
                message: U.plural(noAlt.length, 'image sans texte alternatif', 'images sans texte alternatif') +
                    ' : décrivez-les pour les personnes malvoyantes (inspecteur, sous l’image).'
            });
        }
        const unembedded = M.findUnembeddedImages(config);
        if (unembedded.length) {
            issues.push({ level: 'info', message: U.plural(unembedded.length, 'image n’est pas intégrée', 'images ne sont pas intégrées') + ' (lien externe ou chemin relatif).' });
        }
        // Calques de données : jamais affichés, ou très volumineux
        for (const d of config.data || []) {
            if (Array.isArray(d.chapters) && !d.chapters.length) {
                issues.push({ level: 'info', section: 'data', message: 'Calque « ' + d.name + ' » : affiché dans aucun chapitre.' });
            } else if (M.isTraced(d)) {
                // Dessin progressif qui n'avance jamais : marqueurs des chapitres loin du tracé
                const t = P.traceTargets(d, config.chapters);
                if (!config.chapters.some((ch, i) => M.dataShown(d, ch.id) && t[i] > 0)) {
                    issues.push({ level: 'info', section: 'data', message: 'Calque « ' + d.name + ' » : le tracé progressif ne se dessine dans aucun chapitre (marqueurs loin du tracé). Réglez sa part dessinée dans chaque chapitre (Données sur la carte › Tracé).' });
                }
            }
        }
        // Trajet entre les marqueurs : au moins deux chapitres étapes
        if (config.route && config.route.show && !P.routeData(config)) {
            issues.push({ level: 'info', section: 'marker', message: 'Trajet entre les marqueurs : il faut au moins deux chapitres étapes du trajet (onglet Chapitre › Cadrage de la carte › Étape du trajet).' });
        }
        const dataBytes = (config.data || []).reduce((n, d) => n + SM.geodata.byteSize(d.geojson), 0);
        if (dataBytes > SM.geodata.LARGE_BYTES) {
            issues.push({ level: 'info', section: 'data', message: 'Données géographiques volumineuses (' + U.formatBytes(dataBytes) + ') : la storymap sera plus longue à charger.' });
        }
        return issues;
    };

    /* ---------- Opérations immuables (pour l'historique) ---------- */

    /** Fusionne patch dans un objet ; les clés à undefined sont retirées. */
    function merge(base, patch) {
        const next = Object.assign({}, base, patch);
        for (const k of Object.keys(next)) if (next[k] === undefined) delete next[k];
        return next;
    }

    /**
     * Met à jour les chapitres des calques de données après une modification
     * des chapitres : fn(liste) → nouvelle liste (ramenée à « tous » si elle
     * les couvre tous).
     */
    function withDataChapters(config, fn) {
        if (!config.data || !config.data.length) return config;
        const ids = config.chapters.map(c => c.id);
        let changed = false;
        const data = config.data.map(d => {
            if (!Array.isArray(d.chapters)) return d;
            const next = dataChapters(fn(d.chapters), ids);
            if (U.deepEqual(next, d.chapters)) return d;
            changed = true;
            return ordered(merge(d, { chapters: next }), DATA_KEYS);
        });
        return changed ? Object.assign({}, config, { data }) : config;
    }

    M.ops = {
        set(config, patch) {
            return Object.assign({}, config, patch);
        },
        /** Modifie un groupe de réglages : panels, marker, inset, terrain. */
        setGroup(config, key, patch) {
            return Object.assign({}, config, { [key]: merge(config[key], patch) });
        },
        setChapter(config, index, patch) {
            const chapters = config.chapters.slice();
            chapters[index] = merge(chapters[index], patch);
            return Object.assign({}, config, { chapters });
        },
        /** Modifie un groupe d'un chapitre : view, transition, layers. */
        setChapterGroup(config, index, key, patch) {
            const next = merge(config.chapters[index][key], patch);
            return M.ops.setChapter(config, index, { [key]: key === 'view' ? ordered(next, VIEW_KEYS) : next });
        },
        /** Insère un chapitre ; likeId : il affiche les mêmes calques de données que ce chapitre. */
        insertChapter(config, index, chapter, likeId) {
            const chapters = config.chapters.slice();
            chapters.splice(index, 0, chapter);
            const next = Object.assign({}, config, { chapters });
            return likeId ? withDataChapters(next, list => (list.includes(likeId) ? list.concat([chapter.id]) : list)) : next;
        },
        removeChapter(config, index) {
            const id = config.chapters[index].id;
            const chapters = config.chapters.slice();
            chapters.splice(index, 1);
            return withDataChapters(Object.assign({}, config, { chapters }), list => list.filter(x => x !== id));
        },
        /**
         * Remplace tous les chapitres. Un calque réservé à des chapitres qui
         * n'existent plus redevient visible dans tous les chapitres.
         */
        setChapters(config, chapters) {
            const ids = new Set(chapters.map(c => c.id));
            return withDataChapters(Object.assign({}, config, { chapters }), list => {
                const kept = list.filter(id => ids.has(id));
                return kept.length || !list.length ? kept : Array.from(ids);
            });
        },
        /** Change l'identifiant d'un chapitre (et les listes de chapitres des calques). */
        renameChapter(config, index, id) {
            const old = config.chapters[index].id;
            return withDataChapters(M.ops.setChapter(config, index, { id }), list => list.map(x => (x === old ? id : x)));
        },
        moveChapter(config, from, to) {
            if (from === to) return config;
            const chapters = config.chapters.slice();
            const [ch] = chapters.splice(from, 1);
            chapters.splice(to, 0, ch);
            return withDataChapters(Object.assign({}, config, { chapters }), list => list);
        },
        duplicateChapter(config, index) {
            const src = config.chapters[index];
            const copy = JSON.parse(JSON.stringify(Object.assign({}, src, { image: '' })));
            copy.image = src.image; // partage de la chaîne (pas de copie mémoire)
            copy.id = M.uniqueChapterId(config, src.id);
            copy.title = src.title ? src.title + ' (copie)' : '';
            const next = M.ops.insertChapter(config, index + 1, ordered(copy, CHAPTER_KEYS), src.id);
            return { config: next, chapter: next.chapters[index + 1] };
        },

        /* Calques de données */

        addData(config, data) {
            return Object.assign({}, config, { data: (config.data || []).concat([data]) });
        },
        setData(config, index, patch) {
            const data = config.data.slice();
            data[index] = ordered(merge(data[index], patch), DATA_KEYS);
            return Object.assign({}, config, { data });
        },
        setDataStyle(config, index, patch) {
            return M.ops.setData(config, index, { style: M.normalizeDataStyle(merge(config.data[index].style, patch)) });
        },
        removeData(config, index) {
            const data = config.data.slice();
            data.splice(index, 1);
            return Object.assign({}, config, { data, chapters: keepProgress(config.chapters, new Set(data.map(d => d.id))) });
        },
        /** Ordre d'affichage : le dernier calque est dessiné au-dessus des autres. */
        moveData(config, from, to) {
            if (from === to || to < 0 || to >= config.data.length) return config;
            const data = config.data.slice();
            const [d] = data.splice(from, 1);
            data.splice(to, 0, d);
            return Object.assign({}, config, { data });
        },
        /** Chapitres où le calque est affiché (undefined : tous). */
        setDataChapters(config, index, list) {
            return M.ops.setData(config, index, { chapters: list ? dataChapters(list, config.chapters.map(c => c.id)) : undefined });
        },
        /** Affiche ou masque un calque dans un chapitre. */
        showDataIn(config, index, chapterId, visible) {
            const d = config.data[index];
            const set = new Set(Array.isArray(d.chapters) ? d.chapters : config.chapters.map(c => c.id));
            if (visible) set.add(chapterId); else set.delete(chapterId);
            return M.ops.setDataChapters(config, index, Array.from(set));
        },
        /** Part du tracé dessinée à un chapitre (0 à 1) ; undefined : jusqu'au marqueur du chapitre. */
        setChapterProgress(config, index, dataId, value) {
            const progress = Object.assign({}, config.chapters[index].progress);
            if (value === undefined || value === null) delete progress[dataId];
            else progress[dataId] = U.round(U.clamp(value, 0, 1), 3);
            return M.ops.setChapter(config, index, { progress: Object.keys(progress).length ? progress : undefined });
        }
    };

    M.ordered = ordered;

    /* ---------- Résumé (liste du tableau de bord) ---------- */

    M.summarize = function (story, extra) {
        const c = story.config;
        return Object.assign({
            id: story.id,
            title: c.title || '',
            subtitle: c.subtitle || '',
            byline: c.byline || '',
            chapterCount: (c.chapters || []).length,
            createdAt: story.createdAt,
            updatedAt: story.updatedAt,
            theme: c.theme,
            styleId: (M.findStylePreset(c.style) || {}).id || 'custom',
            styleLabel: M.styleLabel(c.style)
        }, extra || {});
    };
})();
