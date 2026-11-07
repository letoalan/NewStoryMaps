/* ==========================================================================
   StoryMap — tableur : chapitres ⇄ lignes d'un tableau (CSV)
   --------------------------------------------------------------------------
   Une ligne par chapitre. Colonnes des fichiers CSV exportés, dans l'ordre :
     titre ; texte ; latitude ; longitude ; zoom ; image ; légende ; crédit ;
     texte alternatif ; inclinaison ; orientation ; identifiant
   - texte : texte brut (paragraphes séparés par une ligne vide), ou code
     HTML s'il est mis en forme (gras, liens, listes…) : rien n'est perdu ;
   - latitude, longitude : degrés décimaux (WGS 84) ; virgule décimale avec
     le séparateur point-virgule (Excel en français), point sinon ;
   - image : nom de fichier (images intégrées : leur nom d'export, ex.
     paris.jpg, ou images/paris.jpg dans l'archive .zip) ou adresse web ;
   - identifiant : relie une ligne à un chapitre existant quand le tableau
     est réimporté (ses autres réglages — alignement, transition, couches… —
     sont conservés).
   À l'import, les noms de colonnes usuels sont reconnus (français et
   anglais : name, description, lat, lon, x, y…) ; une colonne unique de
   coordonnées (« 48,8566 ; 2,3522 ») peut remplacer latitude et longitude.
   ========================================================================== */
(function () {
    'use strict';

    const SM = window.SM;
    const U = SM.util;
    const M = SM.model;
    const SH = SM.sheet = {};

    SH.MAX = 500;        // lignes importées au plus
    SH.ZOOM = 11;        // zoom proposé sur un lieu (colonne zoom absente ou vide)
    SH.ACCEPT = SM.csv.ACCEPT + ',.zip,application/zip';

    /**
     * Contenus d'un chapitre dans un tableau, dans l'ordre des colonnes des
     * fichiers exportés. names : noms de colonnes reconnus à l'import (comparés
     * sans accents, casse, espaces ni ponctuation), par ordre de préférence.
     */
    SH.FIELDS = [
        { key: 'title', label: 'Titre', csv: 'titre', group: 'content', names: ['titre', 'title', 'name', 'nom', 'intitule', 'libelle', 'label', 'chapitre', 'chapter', 'lieu', 'place', 'ville', 'city'] },
        { key: 'text', label: 'Texte', csv: 'texte', group: 'content', names: ['texte', 'text', 'description', 'desc', 'contenu', 'content', 'body', 'corps', 'resume', 'summary', 'details', 'commentaire', 'comment', 'notes', 'note', 'popupcontent'] },
        { key: 'lat', label: 'Latitude', csv: 'latitude', group: 'map', names: ['latitude', 'lat', 'y', 'latwgs84', 'latitudewgs84'] },
        { key: 'lng', label: 'Longitude', csv: 'longitude', group: 'map', names: ['longitude', 'lon', 'lng', 'long', 'x', 'lonwgs84', 'longitudewgs84'] },
        { key: 'zoom', label: 'Zoom', csv: 'zoom', group: 'map', names: ['zoom', 'niveaudezoom', 'zoomlevel'] },
        { key: 'image', label: 'Image', csv: 'image', group: 'content', names: ['image', 'img', 'photo', 'picture', 'imageurl', 'urlimage', 'urldelimage', 'photourl', 'urlphoto', 'illustration', 'media', 'vignette', 'thumbnail'] },
        { key: 'imageCaption', label: 'Légende', csv: 'légende', group: 'content', names: ['legende', 'caption', 'imagecaption', 'legendeimage', 'legendedelimage'] },
        { key: 'imageCredit', label: 'Crédit', csv: 'crédit', group: 'content', names: ['credit', 'credits', 'creditphoto', 'creditimage', 'imagecredit', 'copyright', 'photographe', 'photographer', 'auteur', 'author'] },
        { key: 'imageAlt', label: 'Texte alternatif', csv: 'texte alternatif', group: 'content', names: ['textealternatif', 'alt', 'alttext', 'imagealt', 'descriptionimage', 'descriptiondelimage'] },
        { key: 'pitch', label: 'Inclinaison', csv: 'inclinaison', group: 'map', names: ['inclinaison', 'pitch', 'tilt'] },
        { key: 'bearing', label: 'Orientation', csv: 'orientation', group: 'map', names: ['orientation', 'bearing', 'cap', 'rotation', 'heading'] },
        { key: 'id', label: 'Identifiant', csv: 'identifiant', group: 'map', names: ['identifiant', 'id', 'ancre', 'anchor', 'slug'] }
    ];

    // Colonne unique « latitude, longitude »
    const COORD_NAMES = ['coordonnees', 'coordinates', 'coords', 'coordonneesgps', 'gps', 'latlng', 'latlon', 'latlong', 'position', 'geolocalisation', 'geopoint', 'geo', 'point'];

    const norm = s => U.stripAccents(String(s === undefined || s === null ? '' : s)).toLowerCase().replace(/[^a-z0-9]/g, '');
    const str = v => (v === undefined || v === null ? '' : String(v));
    const oneLine = v => str(v).replace(/\s+/g, ' ').trim();
    const round6 = v => U.round(v, 6);
    const wrapBearing = b => ((b + 180) % 360 + 360) % 360 - 180;

    /* ---------- Nombres et coordonnées ---------- */

    /** Nombre d'une cellule : « 48,8566 », « 48.8566 », « -77 » ; NaN sinon. */
    SH.parseNumber = function (v) {
        if (typeof v === 'number') return isFinite(v) ? v : NaN;
        const s = str(v).replace(/\s+/g, '').replace(',', '.');
        if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return NaN;
        const n = Number(s);
        return isFinite(n) ? n : NaN;
    };

    // Degrés, minutes, secondes : 48°51'24"N, 2° 21′ 7″ E (O = ouest)
    const DMS_RE = /(-?\d+(?:[.,]\d+)?)\s*°\s*(?:(\d+(?:[.,]\d+)?)\s*['′’]\s*)?(?:(\d+(?:[.,]\d+)?)\s*(?:["″”]|'')\s*)?([NSEOW])?/gi;

    function dmsValues(s) {
        const out = [];
        DMS_RE.lastIndex = 0;
        let m;
        while ((m = DMS_RE.exec(s)) && out.length < 3) {
            let v = Math.abs(SH.parseNumber(m[1])) + (m[2] ? SH.parseNumber(m[2]) / 60 : 0) + (m[3] ? SH.parseNumber(m[3]) / 3600 : 0);
            const hemi = (m[4] || '').toUpperCase();
            if (/^-/.test(m[1]) || hemi === 'S' || hemi === 'W' || hemi === 'O') v = -v;
            out.push({ v, axis: hemi === 'N' || hemi === 'S' ? 'lat' : hemi ? 'lng' : '' });
        }
        return out;
    }

    /** Angle d'une cellule : degrés décimaux ou degrés, minutes, secondes ; NaN sinon. */
    SH.parseAngle = function (v) {
        const n = SH.parseNumber(v);
        if (isFinite(n) || str(v).indexOf('°') < 0) return n;
        const d = dmsValues(str(v));
        return d.length === 1 ? d[0].v : NaN;
    };

    /**
     * Position d'un texte : « 48.8566, 2.3522 », « 48,8566 ; 2,3522 »,
     * « 48,8566 2,3522 » (latitude puis longitude), 48°51'24"N 2°21'07"E,
     * POINT(2.3522 48.8566).
     * @returns {{lat: number, lng: number} | null}
     */
    SH.parseCoords = function (value) {
        const s = str(value).trim().replace(/^\((.*)\)$/, '$1').trim();
        if (!s) return null;
        let lat;
        let lng;
        if (s.indexOf('°') >= 0) {
            const d = dmsValues(s);
            if (d.length !== 2) return null;
            let a = d[0];
            let b = d[1];
            if (a.axis === 'lng' || b.axis === 'lat') { const t = a; a = b; b = t; }
            lat = a.v;
            lng = b.v;
        } else {
            const wkt = /^POINT\s*\(\s*(\S+)\s+(\S+)\s*\)$/i.exec(s);
            if (wkt) {
                lng = SH.parseNumber(wkt[1]);
                lat = SH.parseNumber(wkt[2]);
            } else {
                let parts = s.split(/\s*;\s*|\s+|,\s+/).filter(Boolean);
                // « 48.8566,2.3522 » (points décimaux) ; « 35,0116 » est un nombre à virgule, pas une paire
                if (parts.length !== 2 && /^-?\d+\.\d+,-?\d+\.\d+$/.test(s)) parts = s.split(',');
                if (parts.length !== 2) return null;
                lat = SH.parseNumber(parts[0]);
                lng = SH.parseNumber(parts[1]);
                // Longitude en premier, quand c'est évident
                if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) { const t = lat; lat = lng; lng = t; }
            }
        }
        if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
        return { lat, lng };
    };

    const coordFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 5, useGrouping: false });
    const valueFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2, useGrouping: false });

    /** Coordonnées affichées : « 48,85341 ; 2,3488 » (latitude ; longitude). */
    SH.formatCoords = center => coordFormat.format(center[1]) + ' ; ' + coordFormat.format(center[0]);

    /** Nombre affiché (zoom, inclinaison…) : « 10,5 ». */
    SH.formatValue = v => (U.isNum(v) ? valueFormat.format(v) : '');

    /** Nombre d'un fichier CSV : virgule décimale (séparateur point-virgule) ou point. */
    function csvNumber(v, digits, comma) {
        if (!U.isNum(v)) return '';
        const s = String(U.round(v, digits));
        return comma ? s.replace('.', ',') : s;
    }

    /* ---------- Texte des chapitres ---------- */

    // Blocs : 2 = paragraphe (ligne vide), 1 = ligne
    const BLOCKS = { P: 2, H1: 2, H2: 2, H3: 2, H4: 2, H5: 2, H6: 2, BLOCKQUOTE: 2, PRE: 2, UL: 2, OL: 2, TABLE: 2, FIGURE: 2, DIV: 1, LI: 1, TR: 1, DT: 1, DD: 1, FIGCAPTION: 1 };
    const BR = {};
    const textCache = new Map();

    /**
     * Texte brut d'un texte HTML, tel qu'il s'affiche : paragraphes séparés par
     * une ligne vide, <br> et lignes (<div>, <li>) par un retour à la ligne.
     */
    SH.htmlToText = function (html) {
        const src = str(html);
        if (!src.trim()) return '';
        if (src.indexOf('<') === -1 && src.indexOf('&') === -1) return src.replace(/\s+/g, ' ').trim();
        if (textCache.has(src)) return textCache.get(src);
        const doc = new DOMParser().parseFromString('<body>' + src, 'text/html');
        const tokens = [];
        (function walk(node) {
            for (const c of Array.from(node.childNodes)) {
                if (c.nodeType === 3) tokens.push(c.nodeValue.replace(/\s+/g, ' '));
                else if (c.nodeType === 1) {
                    if (c.tagName === 'BR') { tokens.push(BR); continue; }
                    if (c.tagName === 'SCRIPT' || c.tagName === 'STYLE') continue;
                    const b = BLOCKS[c.tagName] || 0;
                    if (b) tokens.push(b);
                    walk(c);
                    if (b) tokens.push(b);
                }
            }
        })(doc.body);
        let out = '';
        let gap = 0;
        for (const t of tokens) {
            if (typeof t === 'number') { gap = Math.max(gap, t); continue; }
            if (t === BR) {
                out = out.replace(/ +$/, '');
                if (gap && out) out += gap === 2 ? '\n\n' : '\n';
                gap = 0;
                out += '\n';
                continue;
            }
            let text = t;
            if (gap) {
                if (!text.trim()) continue; // espaces entre deux blocs
                if (out) out = out.replace(/ +$/, '') + (gap === 2 ? '\n\n' : '\n');
                gap = 0;
            }
            if (!out || out.endsWith('\n')) text = text.replace(/^ +/, '');
            out += text;
        }
        const res = out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
        if (textCache.size > 3000) textCache.clear();
        textCache.set(src, res);
        return res;
    };

    // HTML « simple » : paragraphes et retours à la ligne, sans attributs
    const SIMPLE_RE = /^(?:[^<]|<\/?(?:p|div)>|<br\s*\/?>)*$/i;

    /** Le texte est-il mis en forme (gras, liens, listes, images…) ? */
    SH.isRich = html => !SIMPLE_RE.test(str(html));

    /**
     * Texte d'une cellule : texte brut (paragraphes séparés par une ligne vide),
     * ou code HTML si le texte est mis en forme, pour ne rien perdre.
     */
    SH.htmlToCell = html => (SH.isRich(html) ? str(html).trim() : SH.htmlToText(html));

    /** Texte d'une cellule en HTML : code HTML nettoyé, sinon paragraphes. */
    SH.cellToHtml = text => SM.places.toHtml(text);

    /** Deux textes de cellule identiques (fins de ligne et espaces de bord ignorés) ? */
    SH.sameCell = (a, b) => str(a).replace(/\r\n?/g, '\n').trim() === str(b).replace(/\r\n?/g, '\n').trim();

    /* ---------- Images et identifiants ---------- */

    /** Clé de comparaison d'une image désignée par un nom : nom du fichier, en minuscules. */
    SH.imageKey = src => U.basename(src).toLowerCase();

    /** Deux désignations d'une même image (adresse identique, ou même nom de fichier) ? */
    function sameImage(a, b) {
        if (str(a) === str(b)) return true;
        if (!a || !b || M.isRemoteUrl(a) || M.isRemoteUrl(b) || M.isDataUrl(a) || M.isDataUrl(b)) return false;
        return SH.imageKey(a) === SH.imageKey(b);
    }

    /** Identifiant de chapitre : lettres, chiffres, tirets (comme dans l'inspecteur). */
    SH.cleanId = v => U.stripAccents(str(v)).trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '').replace(/-{2,}/g, '-').slice(0, 80);

    /** Identifiant libre, tiré de base (déjà nettoyé) : base, base-2, base-3… */
    SH.uniqueId = function (base, used) {
        const root = base || 'chapitre';
        let id = root;
        let n = 2;
        while (used.has(id)) id = root + '-' + (n++);
        used.add(id);
        return id;
    };

    /**
     * Correspondances avec la storymap ouverte : textes des cellules texte et
     * image de chaque chapitre (tels qu'ils figurent dans un fichier exporté)
     * et images intégrées par nom de fichier. Sert à réimporter un tableau
     * exporté sans perdre la mise en forme ni les images intégrées.
     */
    SH.packInfo = function (config) {
        const packed = SM.io.pack(config);
        const cells = new Map();
        config.chapters.forEach((ch, i) => {
            const pc = packed.story.chapters[i] || {};
            cells.set(ch.id, { text: SH.htmlToCell(pc.text || ''), image: pc.image || '' });
        });
        const images = {};
        for (const name of Object.keys(packed.images)) images[SH.imageKey(name)] = packed.images[name];
        return { cells, images };
    };

    /* ---------- Export ---------- */

    /**
     * Tableau d'une storymap : en-tête et une ligne par chapitre.
     * opts = { comma : virgule décimale, prefix : dossier des images (« images/ ») }
     * @returns {{header: string[], rows: string[][], images: object}} images : { nom: data URL } des images désignées
     */
    SH.exportTable = function (config, opts) {
        opts = opts || {};
        const comma = !!opts.comma;
        const packed = SM.io.pack(config, { prefix: opts.prefix || '' });
        const images = {};
        const use = name => { if (name && packed.images[name]) images[name] = packed.images[name]; };
        const rows = config.chapters.map((ch, i) => {
            const pc = packed.story.chapters[i] || {};
            use(pc.image);
            M.inlineImageSources(pc.text).forEach(use);
            const v = ch.view;
            const values = {
                title: ch.title || '',
                text: SH.htmlToCell(pc.text || ''),
                lat: csvNumber(v.center[1], 6, comma),
                lng: csvNumber(v.center[0], 6, comma),
                zoom: csvNumber(v.zoom, 2, comma),
                image: pc.image || '',
                imageCaption: ch.imageCaption || '',
                imageCredit: ch.imageCredit || '',
                imageAlt: ch.imageAlt || '',
                pitch: csvNumber(v.pitch || 0, 1, comma),
                bearing: csvNumber(v.bearing || 0, 1, comma),
                id: ch.id
            };
            return SH.FIELDS.map(f => values[f.key]);
        });
        return { header: SH.FIELDS.map(f => f.csv), rows, images };
    };

    /** Fichier CSV d'une storymap. opts = { delimiter (;) } */
    SH.buildCsv = function (config, opts) {
        const d = (opts && opts.delimiter) || ';';
        const t = SH.exportTable(config, { comma: d === ';' });
        return SM.csv.stringify([t.header].concat(t.rows), { delimiter: d });
    };

    /** Archive .zip : le fichier CSV et le dossier images/ des images intégrées. */
    SH.buildZip = async function (config, opts) {
        const d = (opts && opts.delimiter) || ';';
        const base = SM.io.baseName(config);
        const t = SH.exportTable(config, { comma: d === ';', prefix: 'images/' });
        const files = [{ name: base + '/' + base + '.csv', data: SM.csv.stringify([t.header].concat(t.rows), { delimiter: d }) }];
        for (const name of Object.keys(t.images)) files.push({ name: base + '/' + name, data: SM.images.dataUrlToBlob(t.images[name]) });
        return { blob: await SM.zip.create(files), images: Object.keys(t.images).length };
    };

    /** Modèle à remplir : l'en-tête et deux lignes d'exemple. */
    SH.template = function (delimiter) {
        const d = delimiter || ';';
        const n = v => (d === ';' ? String(v).replace('.', ',') : String(v));
        const rows = [
            ['Paris', 'La capitale française, au bord de la Seine.\n\nUne ligne vide sépare deux paragraphes.', n(48.8566), n(2.3522), '11', 'paris.jpg', 'La tour Eiffel', 'Photo : Prénom Nom', 'La tour Eiffel vue du Trocadéro', '0', '0', ''],
            ['Rome', 'La Ville éternelle et son Colisée.', n(41.8902), n(12.4922), '12', '', '', '', '', '0', '0', '']
        ];
        return SM.csv.stringify([SH.FIELDS.map(f => f.csv)].concat(rows), { delimiter: d });
    };

    /* ---------- Import ---------- */

    const KNOWN = new Set(COORD_NAMES);
    SH.FIELDS.forEach(f => f.names.forEach(n => KNOWN.add(n)));

    /** La ligne contient-elle des noms de colonnes (et non des données) ? */
    SH.looksLikeHeader = function (row) {
        if (!row || !row.length) return false;
        if (row.some(v => KNOWN.has(norm(v)))) return true;
        return !row.some(v => str(v).trim() && (isFinite(SH.parseNumber(v)) || SH.parseCoords(v)));
    };

    /**
     * Correspondance automatique des colonnes : { champ: n° de colonne }. Une
     * colonne unique de coordonnées sert de latitude et de longitude.
     */
    SH.guess = function (header) {
        const keys = (header || []).map(norm);
        const used = new Set();
        const mapping = {};
        for (const f of SH.FIELDS) {
            for (const name of f.names) {
                const k = keys.findIndex((x, i) => x === name && !used.has(i));
                if (k >= 0) {
                    mapping[f.key] = k;
                    used.add(k);
                    break;
                }
            }
        }
        if (mapping.lat === undefined && mapping.lng === undefined) {
            const k = keys.findIndex((x, i) => COORD_NAMES.includes(x) && !used.has(i));
            if (k >= 0) { mapping.lat = k; mapping.lng = k; }
        }
        return mapping;
    };

    /** Titre proposé d'après le nom du fichier (« mes_lieux.csv », « mes-lieux.csv » → « Mes lieux »). */
    SH.suggestTitle = function (fileName) {
        const base = str(fileName).split(/[\\/]/).pop().replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
        return (base ? base.charAt(0).toUpperCase() + base.slice(1) : 'Ma storymap').slice(0, 80);
    };

    const isImageFile = f => (f.type || SM.images.mimeForName(f.name) || '').indexOf('image/') === 0;
    const isZip = f => /\.zip$/i.test(f.name || '') || /zip/.test(f.type || '');

    /** Un fichier est-il un tableau (CSV, TSV) ? */
    SH.isTableFile = f => !!f && (SM.csv.isCsvName(f.name) || /^text\/(csv|tab-separated-values)$/i.test(f.type || ''));

    /** L'archive contient-elle un tableau, et pas de storymap (.json, .html) ? */
    SH.isTableZip = async function (file) {
        if (!isZip(file)) return false;
        try {
            const names = (await SM.zip.read(file)).map(e => e.name).filter(n => !/(^|\/)(__MACOSX|\.)/.test(n));
            return names.some(n => SM.csv.isCsvName(n)) && !names.some(n => /\.(json|html?)$/i.test(n));
        } catch (e) {
            return false;
        }
    };

    /**
     * Lit un tableau : fichier .csv, .tsv ou .txt, ou archive .zip (fichier CSV
     * et images, comme l'export « CSV et images »), avec ses éventuelles images.
     * @returns {Promise<{fileName, title, encoding, delimiter, rows: string[][], images: File[]}>}
     */
    SH.readTable = async function (files) {
        const list = Array.from(files || []);
        const images = list.filter(isImageFile);
        const file = list.find(SH.isTableFile) || list.find(f => /\.txt$/i.test(f.name || '')) || list.find(isZip);
        if (!file) throw new Error('Choisissez un fichier CSV (.csv), enregistré depuis Excel, LibreOffice ou Google Sheets.');
        let decoded;
        let fileName = file.name;
        if (isZip(file)) {
            const skip = /(^|\/)(__MACOSX|\.)/;
            const entries = (await SM.zip.read(file)).filter(e => !skip.test(e.name));
            const csv = entries.find(e => SM.csv.isCsvName(e.name)) || entries.find(e => /\.txt$/i.test(e.name));
            if (!csv) throw new Error('Aucun fichier CSV dans l’archive « ' + file.name + ' ».');
            decoded = SM.csv.decode(await csv.bytes());
            fileName = csv.name.split('/').pop();
            for (const e of entries) {
                const type = SM.images.mimeForName(e.name);
                if (type) images.push(new File([await e.bytes()], e.name.split('/').pop(), { type }));
            }
        } else {
            decoded = await SM.csv.readFile(file);
        }
        const delimiter = /\.tsv$/i.test(fileName) ? SM.csv.TAB : SM.csv.detectDelimiter(decoded.text);
        const rows = SM.csv.parse(decoded.text, { delimiter });
        // Lignes vides finales (fréquentes dans les exports d'Excel : « ;;;; »)
        while (rows.length && !rows[rows.length - 1].some(v => v.trim())) rows.pop();
        return { fileName, title: SH.suggestTitle(fileName), encoding: decoded.encoding, delimiter, rows, images };
    };

    /**
     * Chapitres des lignes d'un tableau.
     * rows : lignes de données (sans l'en-tête) ; mapping : { champ: n° de colonne }.
     * opts = {
     *   config : storymap ouverte (absente : nouvelle storymap),
     *   merge : une ligne dont l'identifiant désigne un chapitre existant le met
     *           à jour (colonnes présentes seulement ; ses autres réglages sont conservés),
     *   info : SH.packInfo(config) (calculé sinon),
     *   usedIds : identifiants à éviter (chapitres ajoutés aux chapitres existants),
     *   before : chapitre qui précède les nouveaux (cadrage des lignes sans
     *            coordonnées, alignement, transition),
     *   zoom : zoom des lieux sans zoom
     * }
     * Une ligne sans coordonnées reprend le cadrage du chapitre précédent.
     * @returns {{chapters, meta: {row, updated, located}[], stats: {rows, created, updated, skipped, noCoords: number[], badCoords: number[]}}}
     *          meta : pour chaque chapitre, sa ligne (index dans rows), chapitre existant mis à jour, position lue ;
     *          noCoords, badCoords : lignes (index dans rows) sans coordonnées, aux coordonnées illisibles
     */
    SH.toChapters = function (rows, mapping, opts) {
        opts = opts || {};
        const cfg = opts.config || null;
        const merge = !!(opts.merge && cfg);
        const info = merge ? (opts.info || SH.packInfo(cfg)) : null;
        const byId = new Map(merge ? cfg.chapters.map(c => [c.id, c]) : []);
        const has = key => U.isNum(mapping[key]) && mapping[key] >= 0;
        const cell = (row, key) => (has(key) ? str(row[mapping[key]]) : null);
        const zoom0 = U.isNum(opts.zoom) ? opts.zoom : SH.ZOOM;
        const stats = { rows: 0, created: 0, updated: 0, skipped: 0, noCoords: [], badCoords: [] };
        const chapters = [];
        const meta = [];
        let prev = opts.before || null;

        const rowId = row => (has('id') ? SH.cleanId(cell(row, 'id')) : '');
        // Identifiants des chapitres mis à jour : réservés (jamais attribués à une nouvelle ligne)
        const used = new Set(opts.usedIds || []);
        if (merge) rows.forEach(row => { const id = rowId(row); if (id && byId.has(id)) used.add(id); });
        const matched = new Set();

        const number = (row, key, min, max) => {
            if (!has(key)) return undefined;
            const n = SH.parseNumber(cell(row, key));
            if (!isFinite(n)) return undefined;
            return key === 'bearing' ? U.round(wrapBearing(n), 2) : U.clamp(n, min, max);
        };
        // Position d'une ligne : { lat, lng }, 'empty' (cellules vides ou colonnes absentes) ou 'bad' (illisible)
        const position = row => {
            const a = cell(row, 'lat');
            const b = cell(row, 'lng');
            if (!str(a).trim() && !str(b).trim()) return 'empty';
            let p = null;
            if (mapping.lat === mapping.lng) p = SH.parseCoords(a);
            else {
                const lat = SH.parseAngle(a);
                const lng = SH.parseAngle(b);
                if (isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) p = { lat, lng };
                else p = SH.parseCoords(a) || SH.parseCoords(b); // paire dans une seule colonne
            }
            return p || 'bad';
        };

        rows.forEach((row, k) => {
            if (!row.some(v => str(v).trim())) return; // ligne vide
            if (stats.rows >= SH.MAX) { stats.skipped++; return; }
            stats.rows++;
            const id = rowId(row);
            const base = merge && id && byId.has(id) && !matched.has(id) ? byId.get(id) : null;
            if (base) matched.add(id);
            const where = position(row);
            const pos = typeof where === 'object' ? where : null;
            if (where === 'bad') stats.badCoords.push(k);
            else if (where === 'empty' && !base) stats.noCoords.push(k);
            const title = has('title') ? oneLine(cell(row, 'title')).slice(0, 300) : null;
            const text = cell(row, 'text');
            const image = has('image') ? SM.places.imageRef(cell(row, 'image')) : null;
            const zoom = number(row, 'zoom', 0, 22);
            const pitch = number(row, 'pitch', 0, M.MAX_PITCH);
            const bearing = number(row, 'bearing', -180, 180);

            if (base) {
                // Mise à jour : seules les colonnes présentes et modifiées changent
                const known = info.cells.get(base.id) || { text: '', image: '' };
                const patch = {};
                if (title !== null && title !== base.title) patch.title = title;
                if (text !== null && !SH.sameCell(text, known.text)) patch.text = SH.cellToHtml(text);
                if (image !== null && !sameImage(image, known.image)) patch.image = image;
                for (const key of ['imageCaption', 'imageCredit', 'imageAlt']) {
                    if (!has(key)) continue;
                    const v = oneLine(cell(row, key));
                    if (v !== (base[key] || '')) patch[key] = v;
                }
                const view = Object.assign({}, base.view);
                let moved = false;
                if (pos && (round6(pos.lng) !== round6(view.center[0]) || round6(pos.lat) !== round6(view.center[1]))) { view.center = [round6(pos.lng), round6(pos.lat)]; moved = true; }
                if (zoom !== undefined && zoom !== view.zoom) { view.zoom = zoom; moved = true; }
                if (pitch !== undefined && pitch !== (view.pitch || 0)) { view.pitch = pitch; moved = true; }
                if (bearing !== undefined && bearing !== (view.bearing || 0)) { view.bearing = bearing; moved = true; }
                if (moved) patch.view = view;
                chapters.push(Object.keys(patch).length ? Object.assign({}, base, patch) : base);
                stats.updated++;
            } else {
                const ref = prev || (cfg && cfg.chapters[0]) || null;
                const view = pos
                    ? { center: [round6(pos.lng), round6(pos.lat)], zoom: zoom !== undefined ? zoom : zoom0, pitch: pitch || 0, bearing: bearing || 0 }
                    : Object.assign({}, ref ? ref.view : M.DEFAULT_VIEW,
                        zoom !== undefined ? { zoom } : null, pitch !== undefined ? { pitch } : null, bearing !== undefined ? { bearing } : null);
                if (!pos) view.center = view.center.slice();
                chapters.push(M.createChapter({ chapters: [] }, {
                    id: SH.uniqueId(id || U.slugify(title || '', 40) || 'chapitre-' + (chapters.length + 1), used),
                    title: title || '',
                    text: text !== null ? SH.cellToHtml(text) : '',
                    image: image || '',
                    imageAlt: has('imageAlt') ? oneLine(cell(row, 'imageAlt')) : '',
                    imageCaption: has('imageCaption') ? oneLine(cell(row, 'imageCaption')) : '',
                    imageCredit: has('imageCredit') ? oneLine(cell(row, 'imageCredit')) : '',
                    align: ref ? ref.align : undefined,
                    transition: ref ? { type: ref.transition.type } : undefined,
                    view
                }));
                stats.created++;
            }
            meta.push({ row: k, updated: !!base, located: !!pos });
            prev = chapters[chapters.length - 1];
        });
        return { chapters, meta, stats };
    };

    /** Deux images identiques (fichier fourni et image intégrée) ? */
    async function sameContent(file, dataUrl) {
        if (file.size !== SM.images.dataUrlBytes(dataUrl)) return false;
        const d = await U.readAsDataURL(file);
        return d.slice(d.indexOf(',')) === dataUrl.slice(dataUrl.indexOf(','));
    }

    /**
     * Images des chapitres désignées par un nom de fichier (image du chapitre et
     * images du texte) : fichiers fournis (intégrés, optimisés), sinon images
     * intégrées de la storymap ouverte de même nom (known : SH.packInfo().images).
     * @returns {Promise<{chapters, errors: string[]}>}
     */
    SH.embedImages = async function (chapters, files, known) {
        const cfg = { chapters, footer: '' };
        const table = known || {};
        const resolved = new Map();
        const errors = [];
        for (const item of SM.io.uniqueUnembedded(cfg)) {
            if (item.remote) continue;
            const key = SH.imageKey(item.src);
            const file = files && files.length ? SM.io.findImageFile(item.src, files) : null;
            try {
                if (file) resolved.set(item.src, table[key] && await sameContent(file, table[key]) ? table[key] : (await SM.images.fromFile(file)).src);
                else if (table[key]) resolved.set(item.src, table[key]);
            } catch (e) {
                errors.push(U.basename(item.src) + ' : ' + e.message);
            }
        }
        return { chapters: resolved.size ? M.mapImages(cfg, src => resolved.get(src)).chapters : chapters, errors };
    };

    /** Images désignées par un nom de fichier, sans fichier fourni ni image intégrée de même nom. */
    SH.missingImages = function (chapters, files, known) {
        const table = known || {};
        return SM.io.uniqueUnembedded({ chapters, footer: '' })
            .filter(item => !item.remote && !table[SH.imageKey(item.src)] && !SM.io.findImageFile(item.src, files || []))
            .map(item => item.src);
    };
})();
