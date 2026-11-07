/* ==========================================================================
   StoryMap — données de l'auteur : GeoJSON, GPX, KML, KMZ
   --------------------------------------------------------------------------
   Tout fichier importé est converti en GeoJSON (FeatureCollection) simple :
   géométries Point, LineString, Polygon (et Multi*), coordonnées [lng, lat]
   arrondies au millionième de degré (≈ 10 cm), altitude et horodatage
   retirés ; seuls le nom et les couleurs d'origine sont conservés (propriétés
   name, stroke, fill, marker-color : convention « simplestyle »), ainsi que
   les icônes des points KML (propriété icon, table « icons » de la
   collection : PNG intégrés). Les lignes et contours sont allégés des points
   superflus (écart maximal ≈ 1 m, invisible sur la carte) : une trace GPS
   perd ainsi l'essentiel de son poids.
   ========================================================================== */
(function () {
    'use strict';

    const SM = window.SM;
    const U = SM.util;
    const G = SM.geodata = {};

    G.ACCEPT = '.geojson,.json,.gpx,.kml,.kmz,application/geo+json,application/gpx+xml,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz';
    G.MAX_BYTES = 50 * 1024 * 1024;
    G.LARGE_BYTES = 3 * 1024 * 1024; // au-delà : la storymap se charge plus lentement

    /** Couleurs proposées pour les calques successifs. */
    G.COLORS = ['#e8590c', '#1c7ed6', '#2f9e44', '#c2255c', '#7048e8', '#f59f00', '#0c8599', '#495057'];

    /** Fichier de données géographiques (d'après son nom) ? Les .json peuvent aussi être des storymaps. */
    G.isDataFile = f => !!f && /\.(geojson|json|gpx|kml|kmz|topojson|shp)$/i.test(f.name || '');

    const TOLERANCE = 0.00001; // écart maximal de l'allègement (degrés, ≈ 1 m)

    const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
    const round = v => Math.round(v * 1e6) / 1e6;

    /* ---------- Géométries ---------- */

    /** Position [lng, lat] (altitude ignorée), ou null si invalide. */
    function position(p) {
        if (!Array.isArray(p) || p.length < 2) return null;
        const lng = Number(p[0]);
        const lat = Number(p[1]);
        if (!isFinite(lng) || !isFinite(lat)) return null;
        if (Math.abs(lat) > 90 || Math.abs(lng) > 540) {
            throw new Error('Coordonnées hors limites : les données doivent être en longitude / latitude (WGS 84, EPSG:4326). Reprojetez le fichier depuis votre logiciel de SIG.');
        }
        return [round(lng), round(lat)];
    }

    /** Distance² d'un point à un segment (en degrés : suffisant pour alléger une trace). */
    function segmentDistance2(p, a, b) {
        let x = a[0];
        let y = a[1];
        let dx = b[0] - x;
        let dy = b[1] - y;
        if (dx || dy) {
            const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
            if (t > 1) { x = b[0]; y = b[1]; } else if (t > 0) { x += dx * t; y += dy * t; }
        }
        dx = p[0] - x;
        dy = p[1] - y;
        return dx * dx + dy * dy;
    }

    /** Allègement de Douglas-Peucker (itératif : pas de limite de pile). */
    function simplify(points) {
        if (points.length < 3) return points;
        const keep = new Uint8Array(points.length);
        keep[0] = keep[points.length - 1] = 1;
        const stack = [[0, points.length - 1]];
        const max = TOLERANCE * TOLERANCE;
        while (stack.length) {
            const [a, b] = stack.pop();
            let far = 0;
            let index = -1;
            for (let i = a + 1; i < b; i++) {
                const d = segmentDistance2(points[i], points[a], points[b]);
                if (d > far) { far = d; index = i; }
            }
            if (index > 0 && far > max) {
                keep[index] = 1;
                stack.push([a, index], [index, b]);
            }
        }
        return points.filter((p, i) => keep[i]);
    }

    /** Points successifs identiques retirés (pauses d'une trace GPS). */
    function dedupe(points) {
        return points.filter((p, i) => i === 0 || p[0] !== points[i - 1][0] || p[1] !== points[i - 1][1]);
    }

    function line(coords) {
        const pts = dedupe((Array.isArray(coords) ? coords : []).map(position).filter(Boolean));
        return pts.length >= 2 ? simplify(pts) : null;
    }

    function ring(coords) {
        const pts = dedupe((Array.isArray(coords) ? coords : []).map(position).filter(Boolean));
        if (pts.length < 3) return null;
        const first = pts[0];
        const last = pts[pts.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) pts.push(first.slice());
        if (pts.length < 4) return null;
        // Un contour trop allégé (moins de 4 points) garde tous ses points
        const light = simplify(pts);
        return light.length >= 4 ? light : pts;
    }

    function polygon(rings) {
        const out = (Array.isArray(rings) ? rings : []).map(ring).filter(Boolean);
        return out.length ? out : null;
    }

    /** Géométrie GeoJSON normalisée : liste (une GeometryCollection en donne plusieurs). */
    function geometries(g) {
        if (!isObj(g)) return [];
        const c = g.coordinates;
        switch (g.type) {
            case 'Point': { const p = position(c); return p ? [{ type: 'Point', coordinates: p }] : []; }
            case 'MultiPoint': { const pts = (Array.isArray(c) ? c : []).map(position).filter(Boolean); return pts.length ? [{ type: 'MultiPoint', coordinates: pts }] : []; }
            case 'LineString': { const l = line(c); return l ? [{ type: 'LineString', coordinates: l }] : []; }
            case 'MultiLineString': { const ls = (Array.isArray(c) ? c : []).map(line).filter(Boolean); return ls.length ? [{ type: 'MultiLineString', coordinates: ls }] : []; }
            case 'Polygon': { const p = polygon(c); return p ? [{ type: 'Polygon', coordinates: p }] : []; }
            case 'MultiPolygon': { const ps = (Array.isArray(c) ? c : []).map(polygon).filter(Boolean); return ps.length ? [{ type: 'MultiPolygon', coordinates: ps }] : []; }
            case 'GeometryCollection': return (Array.isArray(g.geometries) ? g.geometries : []).flatMap(geometries);
            default: return [];
        }
    }

    const NAME_KEYS = ['name', 'nom', 'Name', 'NAME', 'NOM', 'title', 'titre', 'Titre', 'libelle', 'label'];

    /* ---------- Couleurs d'origine ---------- */

    // Couleurs conservées par élément (convention « simplestyle » de GeoJSON) :
    // stroke (ligne, contour), fill (zone), marker-color (point) ; 'none' :
    // contour ou remplissage absents dans le fichier.

    /** Couleur CSS valide (#rrggbb pour les codes hexadécimaux), 'none' (transparente), ou null. */
    function cssColor(v) {
        if (typeof v !== 'string') return null;
        const s = v.trim().toLowerCase();
        if (s === 'none' || s === 'transparent') return 'none';
        let m = /^#([0-9a-f]{3,4})$/.exec(s);
        if (m) return '#' + m[1].slice(0, 3).split('').map(c => c + c).join('');
        m = /^#?([0-9a-f]{6})(?:[0-9a-f]{2})?$/.exec(s);
        if (m) return '#' + m[1];
        if (!/^(rgb|hsl)a?\([^()]*\)$|^[a-z]{3,20}$/.test(s)) return null;
        return typeof CSS !== 'undefined' && CSS.supports && !CSS.supports('color', s) ? null : s;
    }

    /** Couleur KML « aabbggrr » (alpha, bleu, vert, rouge) → #rrggbb ; 'none' si transparente. */
    function kmlColor(v) {
        const s = String(v || '').trim().replace(/^#/, '').toLowerCase();
        if (/^[0-9a-f]{8}$/.test(s)) return s.slice(0, 2) === '00' ? 'none' : '#' + s.slice(6, 8) + s.slice(4, 6) + s.slice(2, 4);
        if (/^[0-9a-f]{6}$/.test(s)) return '#' + s.slice(4, 6) + s.slice(2, 4) + s.slice(0, 2);
        return null;
    }

    const zero = v => v !== undefined && v !== null && v !== '' && Number(v) === 0;

    /**
     * Couleurs d'une entité GeoJSON : simplestyle (stroke, fill, marker-color),
     * options uMap (_umap_options), style façon Leaflet (style: { color,
     * fillColor }), ou couleur unique (color, colour, couleur).
     */
    function geojsonColors(p) {
        const out = {};
        if (!isObj(p)) return out;
        const um = isObj(p._umap_options) ? p._umap_options : {};
        const st = isObj(p.style) ? p.style : {};
        const pick = (...values) => values.map(cssColor).find(Boolean) || null;
        const stroke = pick(p.stroke, um.color, st.color, p.color, p.colour, p.couleur);
        const fill = pick(p.fill, um.fillColor, st.fillColor);
        const marker = pick(p['marker-color'], um.color, st.color, p.color, p.colour, p.couleur);
        if (stroke) out.stroke = stroke;
        if (fill) out.fill = fill;
        if (marker && marker !== 'none') out['marker-color'] = marker;
        // Contour ou remplissage désactivés dans le fichier
        if (zero(p['stroke-opacity']) || zero(p['stroke-width']) || p.stroke === false || um.stroke === false || st.stroke === false) out.stroke = 'none';
        if (zero(p['fill-opacity']) || p.fill === false || um.fill === false || st.fill === false) out.fill = 'none';
        return out;
    }

    /** Entité normalisée : nom et couleurs utiles à sa géométrie. */
    function feature(geometry, name, colors) {
        const n = name === undefined || name === null ? '' : String(name).replace(/\s+/g, ' ').trim().slice(0, 120);
        const properties = n ? { name: n } : {};
        const c = colors || {};
        const t = geometry.type;
        if ((t === 'Point' || t === 'MultiPoint') && c['marker-color']) properties['marker-color'] = c['marker-color'];
        if (t !== 'Point' && t !== 'MultiPoint' && c.stroke) properties.stroke = c.stroke;
        if ((t === 'Polygon' || t === 'MultiPolygon') && c.fill) properties.fill = c.fill;
        return { type: 'Feature', properties, geometry };
    }

    /* ---------- GeoJSON ---------- */

    /** Entités d'un objet GeoJSON (collection, entité ou géométrie seule), après vérifications. */
    function geojsonItems(obj) {
        if (!isObj(obj)) throw new Error('Ce fichier ne contient pas de données GeoJSON.');
        if (obj.format === 'storymap' || obj.format === 'atelier-storymap' || obj.format === 'maplibre-storymap') {
            throw new Error('Ce fichier est une storymap : importez-la depuis « Mes storymaps ».');
        }
        if (obj.type === 'Topology') {
            throw new Error('Les fichiers TopoJSON ne sont pas pris en charge : convertissez-les en GeoJSON (par exemple avec mapshaper.org).');
        }
        const crs = obj.crs && obj.crs.properties && obj.crs.properties.name;
        if (crs && !/(4326|CRS84)$/i.test(String(crs))) {
            throw new Error('Projection non prise en charge (' + crs + ') : exportez les données en WGS 84 (EPSG:4326) depuis votre logiciel de SIG.');
        }
        if (obj.type === 'FeatureCollection') return Array.isArray(obj.features) ? obj.features : [];
        if (obj.type === 'Feature') return [obj];
        if (obj.type && (obj.coordinates || obj.geometries)) return [{ type: 'Feature', geometry: obj }];
        throw new Error('Ce fichier JSON n’est pas du GeoJSON (type « FeatureCollection », « Feature » ou géométrie attendu).');
    }

    /** Convertit un objet GeoJSON (collection, entité ou géométrie) en FeatureCollection normalisée. */
    G.fromGeoJSON = function (obj) {
        const items = geojsonItems(obj);
        const features = [];
        for (const f of items) {
            if (!isObj(f)) continue;
            const props = isObj(f.properties) ? f.properties : {};
            const key = NAME_KEYS.find(k => props[k] !== undefined && props[k] !== null && String(props[k]).trim());
            const colors = geojsonColors(props);
            for (const g of geometries(f.geometry)) features.push(feature(g, key ? props[key] : '', colors));
        }
        return { type: 'FeatureCollection', features };
    };

    /* ---------- XML (GPX, KML) ---------- */

    function parseXml(text, kind) {
        const doc = new DOMParser().parseFromString(String(text).replace(/^\s+/, ''), 'application/xml');
        if (doc.getElementsByTagName('parsererror').length) throw new Error('Fichier ' + kind + ' illisible (XML invalide).');
        return doc;
    }

    const byTag = (el, tag) => Array.prototype.slice.call(el.getElementsByTagNameNS('*', tag));
    const children = el => Array.prototype.slice.call(el.children);

    /** Texte d'un enfant direct (ex. <name>). */
    function childText(el, tag) {
        const c = children(el).find(x => x.localName === tag);
        return c ? c.textContent.trim() : '';
    }

    /** GPX : traces (trk), itinéraires (rte) et points de passage (wpt). */
    G.fromGPX = function (text) {
        const doc = parseXml(text, 'GPX');
        if (!byTag(doc, 'gpx').length) throw new Error('Ce fichier n’est pas un fichier GPX.');
        const point = el => [el.getAttribute('lon'), el.getAttribute('lat')];
        const features = [];
        for (const trk of byTag(doc, 'trk')) {
            const segments = byTag(trk, 'trkseg').map(seg => line(byTag(seg, 'trkpt').map(point))).filter(Boolean);
            if (segments.length === 1) features.push(feature({ type: 'LineString', coordinates: segments[0] }, childText(trk, 'name')));
            else if (segments.length > 1) features.push(feature({ type: 'MultiLineString', coordinates: segments }, childText(trk, 'name')));
        }
        for (const rte of byTag(doc, 'rte')) {
            const l = line(byTag(rte, 'rtept').map(point));
            if (l) features.push(feature({ type: 'LineString', coordinates: l }, childText(rte, 'name')));
        }
        for (const wpt of byTag(doc, 'wpt')) {
            const p = position(point(wpt));
            if (p) features.push(feature({ type: 'Point', coordinates: p }, childText(wpt, 'name')));
        }
        // Nom du calque : celui du fichier, sinon de la première trace ou du premier itinéraire
        const first = tag => { const el = byTag(doc, tag)[0]; return el ? childText(el, 'name') : ''; };
        return { name: first('metadata') || first('trk') || first('rte'), data: { type: 'FeatureCollection', features } };
    };

    /** Coordonnées KML : « lng,lat[,alt] » séparées par des espaces. */
    function kmlCoords(el) {
        const c = el ? children(el).find(x => x.localName === 'coordinates') : null;
        if (!c) return [];
        return c.textContent.trim().replace(/\s*,\s*/g, ',').split(/\s+/).filter(Boolean).map(t => t.split(','));
    }

    /** Géométries d'un élément KML (Point, LineString, Polygon, MultiGeometry, gx:Track). */
    function kmlGeometries(el) {
        const out = [];
        for (const g of children(el)) {
            if (g.localName === 'Point') out.push(...geometries({ type: 'Point', coordinates: kmlCoords(g)[0] }));
            else if (g.localName === 'LineString' || g.localName === 'LinearRing') out.push(...geometries({ type: 'LineString', coordinates: kmlCoords(g) }));
            else if (g.localName === 'Polygon') {
                const boundary = name => children(g).filter(x => x.localName === name)
                    .map(b => kmlCoords(children(b).find(x => x.localName === 'LinearRing')));
                out.push(...geometries({ type: 'Polygon', coordinates: boundary('outerBoundaryIs').concat(boundary('innerBoundaryIs')) }));
            } else if (g.localName === 'MultiGeometry' || g.localName === 'MultiTrack') out.push(...kmlGeometries(g));
            else if (g.localName === 'Track') {
                const coords = children(g).filter(x => x.localName === 'coord').map(x => x.textContent.trim().split(/\s+/));
                out.push(...geometries({ type: 'LineString', coordinates: coords }));
            }
        }
        return out;
    }

    // Épingles de Google Earth sans couleur explicite : couleur déduite du nom de l'icône
    const ICON_COLORS = [['ylw|yellow', '#f5c400'], ['ltblu|lightblue', '#4dabf7'], ['blu|blue', '#1c7ed6'], ['grn|green', '#2f9e44'],
        ['red', '#e03131'], ['purple', '#7048e8'], ['pink', '#e64980'], ['orange', '#f76707']]
        .map(([names, color]) => [new RegExp('(^|[^a-z])(' + names + ')(?![a-z])'), color]);

    function iconColor(href) {
        // Icônes de Google Earth (web) : couleur dans l'adresse (…/icon?color=1976d2&id=2000)
        const param = /[?&]color=([0-9a-f]{6})(?![0-9a-f])/i.exec(String(href || ''));
        if (param) return '#' + param[1].toLowerCase();
        const name = String(href || '').toLowerCase().split('/').pop();
        const hit = ICON_COLORS.find(([re]) => re.test(name));
        return hit ? hit[1] : null;
    }

    /** Couleurs d'un <Style> KML : lignes, zones (remplissage, contour), icônes. */
    function kmlStyleColors(style) {
        const out = {};
        if (!style) return out;
        const part = name => children(style).find(x => x.localName === name);
        const line = part('LineStyle');
        const poly = part('PolyStyle');
        const icon = part('IconStyle');
        if (line && kmlColor(childText(line, 'color'))) out.stroke = kmlColor(childText(line, 'color'));
        if (poly) {
            if (kmlColor(childText(poly, 'color'))) out.fill = kmlColor(childText(poly, 'color'));
            if (childText(poly, 'fill') === '0') out.fill = 'none';
            if (childText(poly, 'outline') === '0') out.stroke = 'none';
        }
        if (icon) {
            const c = kmlColor(childText(icon, 'color'));
            const img = children(icon).find(x => x.localName === 'Icon');
            // Icône blanche teintée (Google My Maps) ou épingle déjà colorée
            const color = c && c !== '#ffffff' && c !== 'none' ? c : iconColor(img ? childText(img, 'href') : '');
            if (color) out['marker-color'] = color;
        }
        return out;
    }

    /**
     * Icône d'un <IconStyle> KML : adresse (href), teinte (couleur multipliée),
     * échelle et point d'ancrage (hotSpot) ; seules les valeurs présentes.
     */
    function kmlIconSpec(style) {
        const icon = style ? children(style).find(x => x.localName === 'IconStyle') : null;
        if (!icon) return {};
        const spec = {};
        const img = children(icon).find(x => x.localName === 'Icon');
        if (img && childText(img, 'href')) spec.href = childText(img, 'href');
        const tint = kmlColor(childText(icon, 'color'));
        if (tint && tint !== 'none') spec.tint = tint;
        const scale = parseFloat(childText(icon, 'scale'));
        if (isFinite(scale) && scale > 0) spec.scale = scale;
        const hs = children(icon).find(x => x.localName === 'hotSpot');
        if (hs && isFinite(parseFloat(hs.getAttribute('x'))) && isFinite(parseFloat(hs.getAttribute('y')))) {
            spec.hotspot = {
                x: parseFloat(hs.getAttribute('x')), y: parseFloat(hs.getAttribute('y')),
                xunits: hs.getAttribute('xunits') || 'fraction', yunits: hs.getAttribute('yunits') || 'fraction'
            };
        }
        return spec;
    }

    /**
     * Styles des repères d'un document KML : style partagé (<Style id>, ou
     * style « normal » d'un <StyleMap>) complété par le style propre au repère.
     * @returns {function(Element): {colors: object, icon: object|null}}
     */
    function kmlStyles(doc) {
        const styles = {};
        const maps = {};
        byTag(doc, 'Style').forEach(s => { if (s.getAttribute('id')) styles[s.getAttribute('id')] = s; });
        byTag(doc, 'StyleMap').forEach(m => { if (m.getAttribute('id')) maps[m.getAttribute('id')] = m; });
        const ref = url => String(url || '').trim().replace(/^[^#]*#/, '');
        const find = (id, depth) => {
            if (!id || depth > 4) return null;
            if (styles[id]) return styles[id];
            if (!maps[id]) return null;
            const pairs = children(maps[id]).filter(p => p.localName === 'Pair');
            const pair = pairs.find(p => childText(p, 'key') === 'normal') || pairs[0];
            if (!pair) return null;
            return children(pair).find(x => x.localName === 'Style') || find(ref(childText(pair, 'styleUrl')), depth + 1);
        };
        return pm => {
            const shared = find(ref(childText(pm, 'styleUrl')), 0);
            const own = children(pm).find(x => x.localName === 'Style');
            const icon = Object.assign({}, kmlIconSpec(shared), kmlIconSpec(own));
            return {
                colors: Object.assign({}, kmlStyleColors(shared), kmlStyleColors(own)),
                icon: icon.href ? icon : null
            };
        };
    }

    /** Document KML : nom, entités et icônes des points à résoudre ({ feature, spec }). */
    function kmlDocument(text) {
        const doc = parseXml(text, 'KML');
        if (!byTag(doc, 'kml').length && !byTag(doc, 'Document').length) throw new Error('Ce fichier n’est pas un fichier KML.');
        const features = [];
        const icons = [];
        const styleOf = kmlStyles(doc);
        for (const pm of byTag(doc, 'Placemark')) {
            const name = childText(pm, 'name');
            const style = styleOf(pm);
            for (const g of kmlGeometries(pm)) {
                const f = feature(g, name, style.colors);
                features.push(f);
                if (style.icon && (g.type === 'Point' || g.type === 'MultiPoint')) icons.push({ target: f.properties, spec: style.icon });
            }
        }
        const docEl = byTag(doc, 'Document')[0];
        return { name: docEl ? childText(docEl, 'name') : '', data: { type: 'FeatureCollection', features }, icons };
    }

    /** KML (Google Earth, Google My Maps, uMap…) : repères de tous les dossiers (sans les icônes). */
    G.fromKML = function (text) {
        const res = kmlDocument(text);
        return { name: res.name, data: res.data };
    };

    /* ---------- Icônes d'origine (KML) ---------- */

    // Icônes normalisées : PNG de 64 px, affichés en 32 px (taille des icônes de Google Earth à l'échelle 1)
    const ICON_SIZE = 64;
    const MAX_ICONS = 100;
    const iconImages = new Map();   // adresse → Promise<image décodée | null>

    // Icônes de Google My Maps et de Google Earth (web) : non téléchargeables (sites sans autorisation CORS)
    const PIN_ICONS = /\/mapspro\/images\/stock\/|earth\.google\.com\/earth\/rpc\/cc\/icon/i;

    /**
     * Épingle blanche, teinte ensuite (couleur du style, sinon celle de
     * l'adresse) : remplace une icône non téléchargeable. Son point d'ancrage
     * (la pointe) prime sur celui du style, calculé pour l'image d'origine.
     */
    function pinIcon(tint) {
        const c = document.createElement('canvas');
        c.width = c.height = ICON_SIZE;
        const g = c.getContext('2d');
        g.beginPath();
        g.moveTo(32, 62);
        g.bezierCurveTo(26, 48, 13, 40, 13, 24);
        g.arc(32, 24, 19, Math.PI, 0);
        g.bezierCurveTo(51, 40, 38, 48, 32, 62);
        g.closePath();
        g.fillStyle = '#ffffff';
        g.fill();
        g.lineWidth = 2;
        g.strokeStyle = 'rgba(0, 0, 0, 0.45)';
        g.stroke();
        g.beginPath();
        g.arc(32, 24, 7, 0, 2 * Math.PI);
        g.fillStyle = 'rgba(0, 0, 0, 0.3)';
        g.fill();
        return { image: c, hotspot: { x: 0.5, y: 2, xunits: 'fraction', yunits: 'pixels' }, tint: tint || undefined };
    }

    const ICON_BYTES = 2 * 1024 * 1024;   // image d'icône la plus lourde acceptée
    const ICON_TIMEOUT = 10000;           // ms : attente maximale d'une icône en ligne

    /** Contenu d'une icône en ligne (si le site l'autorise), ou null. */
    async function fetchIcon(url) {
        const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
        const timer = ctrl ? setTimeout(() => ctrl.abort(), ICON_TIMEOUT) : 0;
        try {
            const r = await fetch(url, { mode: 'cors', signal: ctrl ? ctrl.signal : undefined });
            const blob = r.ok ? await r.blob() : null;
            return blob && blob.size <= ICON_BYTES ? blob : null;
        } catch (e) {
            return null;
        } finally {
            clearTimeout(timer);
        }
    }

    const isRemote = href => /^[a-z][a-z0-9+.-]*:/i.test(String(href).trim());

    /** Fichier d'une archive KMZ désigné par un chemin relatif (ex. images/icon-1.png), ou null. */
    function kmzEntry(entries, href) {
        if (isRemote(href)) return null;
        let rel = String(href).trim().replace(/^\.?\/+/, '');
        try { rel = decodeURIComponent(rel); } catch (e) { /* nom laissé tel quel */ }
        rel = rel.toLowerCase();
        return (entries || []).find(x => x.name.toLowerCase() === rel || x.name.toLowerCase().endsWith('/' + rel)) || null;
    }

    /**
     * Image d'une icône : fichier de l'archive KMZ, sinon adresse web (si le
     * site l'autorise ; mise en cache pendant la session, sauf échec).
     */
    function iconImage(href, entries) {
        const clean = String(href).trim();
        const remote = isRemote(clean);
        if (PIN_ICONS.test(clean)) return Promise.resolve(pinIcon(iconColor(clean)));
        if (remote && iconImages.has(clean)) return iconImages.get(clean);
        const load = async () => {
            let blob = null;
            if (!remote) {
                const e = kmzEntry(entries, clean);
                if (e) blob = new Blob([await e.bytes()], { type: SM.images.mimeForName(e.name) || 'image/png' });
            } else if (/^(https?:|data:image\/)/i.test(clean)) {
                blob = await fetchIcon(clean.replace(/^http:/i, 'https:'));
            }
            if (!blob) return null;
            const url = URL.createObjectURL(blob);
            try {
                const img = new Image();
                img.src = url;
                await img.decode();
                return { image: img };
            } catch (e) {
                return null;
            } finally {
                URL.revokeObjectURL(url);
            }
        };
        const p = load();
        if (remote) {
            iconImages.set(clean, p);
            // Échec (réseau, site) : nouvel essai au prochain import
            p.then(res => { if (!res && iconImages.get(clean) === p) iconImages.delete(clean); });
        }
        return p;
    }

    const round1 = v => Math.round(v * 10) / 10;

    /**
     * Icône normalisée : image centrée dans un carré de 64 px, teinte KML
     * (couleurs multipliées), décalage qui place son point d'ancrage (hotSpot,
     * origine en bas à gauche) sur le lieu, échelle.
     */
    function normalizeIcon(loaded, spec) {
        const img = loaded.image;
        const w0 = img.naturalWidth || img.width;
        const h0 = img.naturalHeight || img.height;
        if (!w0 || !h0) return null;
        const s = Math.min(ICON_SIZE / w0, ICON_SIZE / h0);
        const w = w0 * s;
        const h = h0 * s;
        const x = (ICON_SIZE - w) / 2;
        const y = (ICON_SIZE - h) / 2;
        const c = document.createElement('canvas');
        c.width = c.height = ICON_SIZE;
        const g = c.getContext('2d');
        g.drawImage(img, x, y, w, h);
        const tint = spec.tint || loaded.tint;
        if (tint && tint !== '#ffffff') {
            g.globalCompositeOperation = 'multiply';
            g.fillStyle = tint;
            g.fillRect(0, 0, ICON_SIZE, ICON_SIZE);
            g.globalCompositeOperation = 'destination-in';
            g.drawImage(img, x, y, w, h);
        }
        const hs = loaded.hotspot || spec.hotspot;
        let hx = w0 / 2;
        let hy = h0 / 2;
        if (hs) {
            hx = hs.xunits === 'pixels' ? hs.x : hs.xunits === 'insetPixels' ? w0 - hs.x : hs.x * w0;
            hy = h0 - (hs.yunits === 'pixels' ? hs.y : hs.yunits === 'insetPixels' ? h0 - hs.y : hs.y * h0);
        }
        // Décalage en pixels affichés (icône de 32 px, centrée sur le lieu par défaut)
        const dx = round1(Math.max(-32, Math.min(32, (ICON_SIZE / 2 - (x + hx * s)) / 2)));
        const dy = round1(Math.max(-32, Math.min(32, (ICON_SIZE / 2 - (y + hy * s)) / 2)));
        const icon = { src: c.toDataURL('image/png') };
        if (dx || dy) icon.offset = [dx, dy];
        if (spec.scale && spec.scale !== 1) icon.scale = Math.round(Math.max(0.1, Math.min(10, spec.scale)) * 100) / 100;
        return icon;
    }

    /**
     * Récupère et normalise les icônes ({ target, spec }), puis désigne
     * chacune par sa clé (target.icon : propriétés d'une entité, lieu…).
     * @returns {Promise<object|undefined>} table des icônes { i1: { src, offset, scale } }
     */
    async function attachIcons(items, entries) {
        // Icônes distinctes (adresse, teinte, échelle, ancrage), dans l'ordre du fichier, chargées ensemble
        const specs = new Map();
        items.forEach(({ spec }) => {
            const id = JSON.stringify(spec);
            if (!specs.has(id) && specs.size < MAX_ICONS) specs.set(id, spec);
        });
        const ids = Array.from(specs.keys());
        const made = await Promise.all(ids.map(id => iconImage(specs.get(id).href, entries)
            .then(loaded => (loaded ? normalizeIcon(loaded, specs.get(id)) : null))
            .catch(() => null)));
        const keys = new Map();   // icône → clé (« i1 »…), si elle a pu être lue
        const icons = {};
        ids.forEach((id, i) => {
            if (!made[i]) return;
            const key = 'i' + (keys.size + 1);
            keys.set(id, key);
            icons[key] = made[i];
        });
        items.forEach(({ target, spec }) => {
            const key = keys.get(JSON.stringify(spec));
            if (key) target.icon = key;
        });
        return keys.size ? icons : undefined;
    }

    /* ---------- Fichiers ---------- */

    /**
     * Contenu d'un fichier de données : { kind: 'kml' | 'gpx' | 'geojson',
     * text (KML, GPX) ou obj (GeoJSON), entries (fichiers d'une archive KMZ) }.
     */
    async function readSource(file) {
        const fileName = file.name || 'donnees';
        const ext = fileName.split('.').pop().toLowerCase();
        if (ext === 'shp') throw new Error('Les fichiers Shapefile ne sont pas pris en charge : exportez la couche en GeoJSON (QGIS : « Exporter › Sauvegarder les entités sous… », ou mapshaper.org).');
        if (file.size > G.MAX_BYTES) throw new Error('Fichier trop volumineux (' + U.formatBytes(file.size) + ', maximum ' + U.formatBytes(G.MAX_BYTES) + ').');
        if (ext === 'kmz') {
            const entries = await SM.zip.read(file);
            const kml = entries.find(e => /(^|\/)doc\.kml$/i.test(e.name)) || entries.find(e => /\.kml$/i.test(e.name));
            if (!kml) throw new Error('Archive KMZ sans fichier KML.');
            return { kind: 'kml', text: await kml.text(), entries };
        }
        // Espaces et marque d'ordre des octets (BOM) en tête : refusés par les analyseurs XML et JSON
        const text = (await U.readAsText(file)).replace(/^\s+/, '');
        const head = text.slice(0, 1000);
        if (ext === 'gpx' || (/^</.test(head) && /<gpx[\s>]/i.test(head))) return { kind: 'gpx', text };
        if (ext === 'kml' || (/^</.test(head) && /<kml[\s>]/i.test(head))) return { kind: 'kml', text };
        let obj;
        try { obj = JSON.parse(text); } catch (e) { throw new Error('Fichier JSON invalide : ' + e.message); }
        return { kind: 'geojson', obj };
    }

    /** Nom proposé : celui du fichier (métadonnées), sinon le nom du fichier (« trace_du_gr20 » → « Trace du gr20 »). */
    function suggestName(own, fileName) {
        const base = String(fileName || '').replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
        const name = String(own || '').replace(/\s+/g, ' ').trim() || (base ? base.charAt(0).toUpperCase() + base.slice(1) : 'Données');
        return name.slice(0, 80);
    }

    /**
     * Lit un fichier de données.
     * @returns {Promise<{name: string, data: object}>} nom proposé et FeatureCollection
     */
    G.parseFile = async function (file) {
        const src = await readSource(file);
        let res;
        if (src.kind === 'kml') {
            res = kmlDocument(src.text);
            // Icônes d'origine des points, intégrées aux données (table « icons »)
            const icons = await attachIcons(res.icons, src.entries);
            if (icons) res.data.icons = icons;
        } else if (src.kind === 'gpx') res = G.fromGPX(src.text);
        else res = { name: isObj(src.obj) && typeof src.obj.name === 'string' ? src.obj.name : '', data: G.fromGeoJSON(src.obj) };
        if (!res.data.features.length) throw new Error('Aucune géométrie exploitable (point, ligne ou zone) dans ce fichier.');
        return { name: suggestName(res.name, file.name), data: res.data };
    };

    /* ---------- Lieux (création de chapitres) ---------- */

    /**
     * Champs d'un élément : valeurs simples en texte, sous-objets sur un niveau
     * (« adresse.ville »). prefix : champs d'un membre propre à l'élément (« data. »).
     */
    function addFields(out, src, prefix) {
        if (!isObj(src)) return;
        Object.keys(src).forEach(k => {
            const v = src[k];
            const key = prefix + k;
            if (typeof v === 'string') { if (v.trim()) out[key] = v.trim(); }
            else if (typeof v === 'number' && isFinite(v)) out[key] = String(v);
            else if (typeof v === 'boolean') out[key] = String(v);
            else if (Array.isArray(v)) {
                const s = v.filter(x => typeof x === 'string' || typeof x === 'number').join(' ');
                if (s.trim()) out[key] = s.trim();
            } else if (isObj(v) && !prefix) addFields(out, v, key + '.');
        });
    }

    function placesFromGeoJSON(obj) {
        const places = [];
        let skipped = 0;
        for (const f of geojsonItems(obj)) {
            const geoms = isObj(f) ? geometries(f.geometry) : [];
            if (!geoms.length) { skipped++; continue; }
            const fields = {};
            addFields(fields, f.properties, '');
            // Membre « data » de l'élément (hors propriétés) : texte, image… d'un chapitre
            if (isObj(f.data)) addFields(fields, f.data, 'data.');
            places.push({ geometries: geoms, fields, colors: geojsonColors(f.properties) });
        }
        return { name: typeof obj.name === 'string' ? obj.name : '', places, skipped };
    }

    function placesFromKML(text) {
        const doc = parseXml(text, 'KML');
        if (!byTag(doc, 'kml').length && !byTag(doc, 'Document').length) throw new Error('Ce fichier n’est pas un fichier KML.');
        const places = [];
        const styleOf = kmlStyles(doc);
        let skipped = 0;
        for (const pm of byTag(doc, 'Placemark')) {
            const geoms = kmlGeometries(pm);
            if (!geoms.length) { skipped++; continue; }
            const style = styleOf(pm);
            const fields = {};
            const put = (k, v) => { if (k && v && String(v).trim()) fields[k] = String(v).trim(); };
            put('name', childText(pm, 'name'));
            put('description', childText(pm, 'description'));
            put('address', childText(pm, 'address'));
            // Données étendues (Google My Maps : gx_media_links = photos)
            byTag(pm, 'Data').forEach(d => put(d.getAttribute('name'), childText(d, 'value')));
            byTag(pm, 'SimpleData').forEach(d => put(d.getAttribute('name'), d.textContent));
            // Icône d'un lieu ponctuel (résolue ensuite : place.icon = clé de la table des icônes)
            const point = geoms.every(g => g.type === 'Point' || g.type === 'MultiPoint');
            places.push({ geometries: geoms, fields, colors: style.colors, iconSpec: point ? style.icon : null });
        }
        const docEl = byTag(doc, 'Document')[0];
        return { name: docEl ? childText(docEl, 'name') : '', places, skipped };
    }

    function placesFromGPX(text) {
        const doc = parseXml(text, 'GPX');
        if (!byTag(doc, 'gpx').length) throw new Error('Ce fichier n’est pas un fichier GPX.');
        const point = el => [el.getAttribute('lon'), el.getAttribute('lat')];
        const places = [];
        const add = (el, geoms) => {
            if (!geoms.length) return;
            const fields = {};
            ['name', 'desc', 'cmt', 'type'].forEach(k => { const v = childText(el, k); if (v) fields[k] = v; });
            const link = children(el).find(x => x.localName === 'link');
            if (link && link.getAttribute('href')) fields.link = link.getAttribute('href');
            places.push({ geometries: geoms, fields });
        };
        for (const wpt of byTag(doc, 'wpt')) add(wpt, geometries({ type: 'Point', coordinates: point(wpt) }));
        for (const rte of byTag(doc, 'rte')) add(rte, geometries({ type: 'LineString', coordinates: byTag(rte, 'rtept').map(point) }));
        for (const trk of byTag(doc, 'trk')) {
            add(trk, geometries({ type: 'MultiLineString', coordinates: byTag(trk, 'trkseg').map(seg => byTag(seg, 'trkpt').map(point)) }));
        }
        const meta = byTag(doc, 'metadata')[0];
        return { name: meta ? childText(meta, 'name') : '', places, skipped: 0 };
    }

    /**
     * Lieux d'un fichier (GeoJSON, KML/KMZ, GPX) : géométries normalisées et
     * champs de chaque élément (propriétés, description…), dans l'ordre du fichier.
     * files : images d'une archive KMZ (photos des descriptions) ; icons : icônes
     * d'origine des lieux (KML), que désigne place.icon.
     * @returns {Promise<{name, places: [{ geometries, fields, colors, icon }], skipped, files, icons}>}
     */
    G.readPlaces = async function (file) {
        const src = await readSource(file);
        const res = src.kind === 'kml' ? placesFromKML(src.text) : src.kind === 'gpx' ? placesFromGPX(src.text) : placesFromGeoJSON(src.obj);
        const withIcon = res.places.filter(p => p.iconSpec);
        if (src.kind === 'kml') res.icons = await attachIcons(withIcon.map(p => ({ target: p, spec: p.iconSpec })), src.entries);
        // Images de l'archive (photos des descriptions), hors icônes des repères
        const iconEntries = new Set(withIcon.map(p => kmzEntry(src.entries, p.iconSpec.href)));
        res.files = [];
        for (const e of src.entries || []) {
            const type = SM.images.mimeForName(e.name);
            if (type && type.indexOf('image/') === 0 && !iconEntries.has(e)) res.files.push(new File([await e.bytes()], e.name.split('/').pop(), { type }));
        }
        res.name = suggestName(res.name, file.name);
        return res;
    };

    /* ---------- Données enregistrées ---------- */

    const validPos = p => Array.isArray(p) && p.length >= 2 && typeof p[0] === 'number' && typeof p[1] === 'number' && isFinite(p[0]) && isFinite(p[1]);
    const all = (a, fn, min) => Array.isArray(a) && a.length >= min && a.every(fn);
    const validRing = r => all(r, validPos, 4);
    const VALID = {
        Point: validPos,
        MultiPoint: c => all(c, validPos, 1),
        LineString: c => all(c, validPos, 2),
        MultiLineString: c => all(c, l => all(l, validPos, 2), 1),
        Polygon: c => all(c, validRing, 1),
        MultiPolygon: c => all(c, p => all(p, validRing, 1), 1)
    };

    /**
     * Vérifie une FeatureCollection enregistrée (fichier .json, base du
     * navigateur), sans la convertir : les entités invalides sont retirées.
     * Renvoie la collection elle-même si tout est valide, null si rien ne l'est.
     */
    G.clean = function (fc) {
        if (!isObj(fc) || fc.type !== 'FeatureCollection' || !Array.isArray(fc.features)) return null;
        const ok = fc.features.filter(f => isObj(f) && isObj(f.geometry) &&
            Object.prototype.hasOwnProperty.call(VALID, f.geometry.type) && VALID[f.geometry.type](f.geometry.coordinates));
        if (!ok.length) return null;
        const icons = cleanIcons(fc.icons);
        if (ok.length === fc.features.length && icons === fc.icons) return fc;
        const out = { type: 'FeatureCollection', features: ok };
        if (icons) out.icons = icons;
        return out;
    };

    const ICON_SRC = /^data:image\/(png|jpeg|gif|webp);base64,[a-z0-9+/]+=*$/i;

    /**
     * Table des icônes d'origine : { clé: { src : PNG en data URL, offset : [dx, dy]
     * en pixels, scale } }. Renvoie la table elle-même si elle est valide.
     */
    function cleanIcons(icons) {
        if (icons === undefined) return undefined;
        if (!isObj(icons)) return undefined;
        let changed = false;
        const out = {};
        Object.keys(icons).forEach((k, i) => {
            const v = icons[k];
            if (i >= MAX_ICONS || !/^[\w-]{1,40}$/.test(k) || !isObj(v) || typeof v.src !== 'string' || v.src.length > 300000 || !ICON_SRC.test(v.src)) {
                changed = true;
                return;
            }
            const icon = { src: v.src };
            if (Array.isArray(v.offset) && v.offset.length === 2 && v.offset.every(n => typeof n === 'number' && isFinite(n) && Math.abs(n) <= 64)) icon.offset = v.offset;
            if (typeof v.scale === 'number' && isFinite(v.scale) && v.scale >= 0.1 && v.scale <= 10) icon.scale = v.scale;
            if (Object.keys(icon).length !== Object.keys(v).length) changed = true;
            out[k] = icon;
        });
        if (!Object.keys(out).length) return undefined;
        return changed ? out : icons;
    }

    /* ---------- Informations ---------- */

    const statsCache = new WeakMap();

    /** Entité normalisée (nom, couleurs utiles à sa géométrie). */
    G.feature = feature;

    // Couleur affichable dans l'interface (aperçus) : pas d'autre syntaxe CSS
    const SAFE_COLOR = /^#[0-9a-f]{3,8}$|^(rgb|hsl)a?\([\d\s.,%]+\)$|^[a-z]{3,20}$/i;

    /** Nombre de tracés, zones et points, couleurs d'origine (mis en cache par jeu de données). */
    G.stats = function (fc) {
        const empty = { lines: 0, polygons: 0, points: 0, named: 0, vertices: 0, colors: [], icons: [], iconPoints: 0 };
        if (!isObj(fc) || !Array.isArray(fc.features)) return empty;
        if (statsCache.has(fc)) return statsCache.get(fc);
        const s = Object.assign({}, empty);
        const colors = new Set();
        const count = c => (typeof c[0] === 'number' ? 1 : c.reduce((n, x) => n + count(x), 0));
        for (const f of fc.features) {
            const g = f && f.geometry;
            if (!g) continue;
            const p = f.properties || {};
            [p.stroke, p.fill, p['marker-color']].forEach(c => { if (typeof c === 'string' && c !== 'none' && SAFE_COLOR.test(c)) colors.add(c); });
            if (g.type === 'Point' || g.type === 'MultiPoint') {
                s.points += g.type === 'Point' ? 1 : g.coordinates.length;
                if (f.properties && f.properties.name) s.named++;
            } else if (g.type === 'LineString' || g.type === 'MultiLineString') s.lines++;
            else if (g.type === 'Polygon' || g.type === 'MultiPolygon') s.polygons++;
            s.vertices += count(g.coordinates);
        }
        s.colors = Array.from(colors);
        // Icônes d'origine (table de la collection) et points qui en ont une
        s.icons = isObj(fc.icons) ? Object.keys(fc.icons).filter(k => isObj(fc.icons[k]) && typeof fc.icons[k].src === 'string' && ICON_SRC.test(fc.icons[k].src)) : [];
        s.iconPoints = s.icons.length ? fc.features.filter(f => f && f.properties && s.icons.indexOf(f.properties.icon) >= 0).length : 0;
        statsCache.set(fc, s);
        return s;
    };

    G.summary = function (fc) {
        const s = G.stats(fc);
        const parts = [];
        if (s.lines) parts.push(U.plural(s.lines, 'tracé'));
        if (s.polygons) parts.push(U.plural(s.polygons, 'zone'));
        if (s.points) parts.push(U.plural(s.points, 'point'));
        return parts.join(' · ') || 'Aucune géométrie';
    };

    /** Emprise [ouest, sud, est, nord] d'une ou plusieurs collections, ou null. */
    G.bbox = function (collections) {
        let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
        const visit = c => {
            if (typeof c[0] === 'number') {
                if (c[0] < w) w = c[0];
                if (c[0] > e) e = c[0];
                if (c[1] < s) s = c[1];
                if (c[1] > n) n = c[1];
            } else c.forEach(visit);
        };
        for (const fc of [].concat(collections || [])) {
            for (const f of (fc && fc.features) || []) if (f && f.geometry) visit(f.geometry.coordinates);
        }
        return isFinite(w) ? [w, s, e, n] : null;
    };

    const sizeCache = new WeakMap();

    /** Taille approximative en octets dans les fichiers exportés (mise en cache). */
    G.byteSize = function (fc) {
        if (!isObj(fc)) return 0;
        if (!sizeCache.has(fc)) {
            let n = 0;
            try { n = JSON.stringify(fc).length; } catch (e) { /* données circulaires : ignorées */ }
            sizeCache.set(fc, n);
        }
        return sizeCache.get(fc);
    };

    /** Première couleur de la palette non utilisée. */
    G.nextColor = function (used) {
        const taken = new Set((used || []).map(c => String(c).toLowerCase()));
        return G.COLORS.find(c => !taken.has(c)) || G.COLORS[taken.size % G.COLORS.length];
    };
})();
