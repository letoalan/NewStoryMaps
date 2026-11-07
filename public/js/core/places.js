/* ==========================================================================
   StoryMap — chapitres à partir de données (GeoJSON, KML/KMZ, GPX)
   --------------------------------------------------------------------------
   Chaque lieu (élément du fichier) devient un chapitre : titre, texte et
   image tirés de ses champs, carte centrée sur sa position (point) ou cadrée
   sur son emprise (ligne, zone). Les champs usuels sont reconnus d'eux-mêmes
   (nom, description, image…) ; la correspondance reste modifiable.

   GeoJSON : propriétés de chaque entité, et membre « data » facultatif :
     { "type": "Feature", "properties": { "nom": "Paris" },
       "data": { "text": "…", "image": "paris.jpg" }, "geometry": … }
   Champs zoom, pitch et bearing (nombres) : cadrage propre au lieu.
   ========================================================================== */
(function () {
    'use strict';

    const SM = window.SM;
    const U = SM.util;
    const M = SM.model;
    const G = SM.geodata;
    const PL = SM.places = {};

    PL.MAX = 300;                 // chapitres créés au plus en une fois
    PL.ZOOM = 11;                 // zoom proposé sur un lieu ponctuel
    // Sélecteur de fichiers : fichiers de lieux seulement. Les images désignées par
    // un nom de fichier se choisissent dans la fenêtre de création (ou se déposent avec le fichier).
    PL.ACCEPT = G.ACCEPT;

    /** Contenus d'un chapitre, dans l'ordre de la fenêtre de correspondance. */
    PL.TARGETS = [
        { key: 'title', label: 'Titre' },
        { key: 'text', label: 'Texte' },
        { key: 'image', label: 'Image' },
        { key: 'imageCaption', label: 'Légende de l’image' },
        { key: 'imageCredit', label: 'Crédit de l’image' },
        { key: 'imageAlt', label: 'Texte alternatif' }
    ];

    // Noms de champs reconnus, par ordre de préférence (comparés sans accents,
    // casse ni ponctuation, sur la dernière partie : « data.text » → « text »)
    const GUESS = {
        title: ['title', 'titre', 'name', 'nom', 'intitule', 'libelle', 'label'],
        text: ['text', 'texte', 'description', 'desc', 'body', 'contenu', 'content', 'popupcontent', 'resume', 'summary', 'details', 'commentaire', 'comment', 'cmt'],
        image: ['image', 'img', 'photo', 'picture', 'imageurl', 'urlimage', 'photourl', 'thumbnail', 'vignette', 'media', 'gxmedialinks'],
        imageCaption: ['caption', 'legende', 'imagecaption'],
        imageCredit: ['credit', 'credits', 'imagecredit', 'copyright', 'photographe', 'photographer', 'auteur', 'author'],
        imageAlt: ['alt', 'imagealt', 'textealternatif', 'alttext']
    };

    const norm = key => U.stripAccents(String(key).split('.').pop()).toLowerCase().replace(/[^a-z0-9]/g, '');
    const oneLine = v => String(v || '').replace(/\s+/g, ' ').trim();
    const value = (place, key) => (key && place.fields[key] !== undefined ? String(place.fields[key]) : '');

    /** Champs présents dans les lieux (ordre d'apparition), avec un exemple de valeur. */
    PL.fields = function (places) {
        const out = [];
        const seen = new Set();
        places.forEach(p => Object.keys(p.fields).forEach(k => {
            if (seen.has(k)) return;
            seen.add(k);
            out.push({ key: k, example: p.fields[k] });
        }));
        return out;
    };

    /** Correspondance automatique : { title: champ, text: champ, … } (un champ ne sert qu'une fois). */
    PL.guess = function (places) {
        const keys = PL.fields(places).map(f => f.key);
        const used = new Set();
        const mapping = {};
        PL.TARGETS.forEach(t => {
            for (const name of GUESS[t.key]) {
                const k = keys.find(x => !used.has(x) && norm(x) === name);
                if (k) {
                    mapping[t.key] = k;
                    used.add(k);
                    break;
                }
            }
        });
        return mapping;
    };

    /** Texte d'un champ en HTML de chapitre : HTML nettoyé, sinon paragraphes (lignes vides) et retours à la ligne. */
    PL.toHtml = function (text) {
        const s = String(text || '').replace(/\r\n?/g, '\n').trim();
        if (!s) return '';
        if (/<\/?[a-z][^>]*>/i.test(s)) return SM.sanitize.safe(s);
        return s.split(/\n\s*\n/).map(p => '<p>' + U.escapeHtml(p.trim()).replace(/\n/g, '<br>') + '</p>').join('');
    };

    /** Image d'un champ : data URL ou adresse telle quelle ; d'une liste d'adresses (photos Google My Maps), la première. */
    PL.imageRef = function (v) {
        const s = String(v || '').trim();
        if (!s || /^data:/i.test(s)) return s;
        const urls = s.split(/\s+/).filter(x => /^https?:\/\//i.test(x));
        return urls.length ? urls[0] : s;
    };

    /** Nombre d'un champ (zoom, pitch, bearing), s'il existe. */
    function numberField(place, name) {
        const key = Object.keys(place.fields).find(k => norm(k) === name);
        const v = key ? Number(String(place.fields[key]).replace(',', '.')) : NaN;
        return isFinite(v) ? v : undefined;
    }

    // Web Mercator (0 à 1), pour cadrer une emprise comme le fait la carte
    const mx = lng => (lng + 180) / 360;
    const my = lat => { const s = Math.sin(U.clamp(lat, -85, 85) * Math.PI / 180); return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI); };
    const unY = y => Math.atan(Math.sinh((0.5 - y) * 2 * Math.PI)) * 180 / Math.PI;
    const wrapLng = lng => ((lng + 540) % 360) - 180;

    /**
     * Cadrage d'un lieu : centré sur lui (point, zoom proposé) ou sur son
     * emprise (ligne, zone : zoom qui la montre en entier sur un écran courant).
     */
    PL.viewFor = function (place, zoom) {
        const b = G.bbox({ type: 'FeatureCollection', features: place.geometries.map(geometry => ({ geometry })) });
        const own = numberField(place, 'zoom');
        let center;
        let z;
        if (b[0] === b[2] && b[1] === b[3]) {
            center = [b[0], b[1]];
            z = own !== undefined ? own : zoom;
        } else {
            const w = Math.max(1e-9, mx(b[2]) - mx(b[0]));
            const h = Math.max(1e-9, my(b[1]) - my(b[3]));
            center = [(b[0] + b[2]) / 2, unY((my(b[1]) + my(b[3])) / 2)];
            z = own !== undefined ? own : Math.log2(Math.min(880 / (w * 512), 560 / (h * 512)));
        }
        return {
            center: [U.round(wrapLng(center[0]), 5), U.round(center[1], 5)],
            zoom: U.round(U.clamp(z, 0, 18), 2),
            pitch: U.clamp(numberField(place, 'pitch') || 0, 0, M.MAX_PITCH),
            bearing: numberField(place, 'bearing') || 0
        };
    };

    /**
     * Chapitres des lieux. opts = { zoom, usedIds } : identifiants tirés des
     * titres (« washington-d-c »), différents de ceux déjà employés.
     */
    PL.toChapters = function (places, mapping, opts) {
        opts = opts || {};
        const used = new Set(opts.usedIds || []);
        const uniqueId = base => {
            const root = U.slugify(base, 40) || 'lieu';
            let id = root;
            let n = 2;
            while (used.has(id)) id = root + '-' + (n++);
            used.add(id);
            return id;
        };
        return places.map((p, i) => {
            const title = oneLine(value(p, mapping.title)).slice(0, 200);
            const image = PL.imageRef(value(p, mapping.image));
            return M.createChapter({ chapters: [] }, {
                id: uniqueId(title || 'lieu-' + (i + 1)),
                title,
                text: PL.toHtml(value(p, mapping.text)),
                image,
                imageAlt: image ? oneLine(value(p, mapping.imageAlt)) : '',
                imageCaption: image ? oneLine(value(p, mapping.imageCaption)) : '',
                imageCredit: image ? oneLine(value(p, mapping.imageCredit)) : '',
                view: PL.viewFor(p, U.isNum(opts.zoom) ? opts.zoom : PL.ZOOM)
            });
        });
    };

    /** Nombre de lieux ponctuels (points). */
    PL.pointCount = places => places.filter(p => p.geometries.every(g => g.type === 'Point' || g.type === 'MultiPoint')).length;

    /**
     * Calque de données des lieux (nommés d'après le titre des chapitres).
     * connect : lieux reliés dans l'ordre, trajet dessiné au fil des chapitres ;
     * icons : icônes d'origine (KML) que désigne place.icon.
     */
    PL.toLayer = function (config, places, mapping, name, connect, icons) {
        const features = [];
        places.forEach(p => {
            // Nom (titre du chapitre), couleurs et icône d'origine du lieu
            const title = oneLine(value(p, mapping.title)).slice(0, 120);
            p.geometries.forEach(geometry => {
                const f = G.feature(geometry, title, p.colors);
                if (p.icon && icons && icons[p.icon]) f.properties.icon = p.icon;
                features.push(f);
            });
        });
        const geojson = { type: 'FeatureCollection', features };
        if (icons && features.some(f => f.properties.icon)) geojson.icons = icons;
        const d = M.createData(config, { name, geojson });
        return connect ? Object.assign({}, d, { connect: true, progressive: true }) : d;
    };

    /** Fichier de lieux (d'après son nom) ? Les .json se vérifient à la lecture. */
    PL.isPlacesName = name => /\.(geojson|kml|kmz|gpx)$/i.test(name || '');

    /** Un fichier .json est-il du GeoJSON (et non une storymap) ? */
    PL.isGeoJsonFile = async function (file) {
        if (PL.isPlacesName(file.name)) return true;
        if (!/\.json$/i.test(file.name || '') || file.size > G.MAX_BYTES) return false;
        try {
            const obj = JSON.parse((await U.readAsText(file)).replace(/^\s+/, ''));
            return !!obj && ['FeatureCollection', 'Feature'].includes(obj.type);
        } catch (e) {
            return false;
        }
    };
})();
