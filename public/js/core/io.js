/* ==========================================================================
   StoryMap — import / export et bibliothèque de storymaps
   --------------------------------------------------------------------------
   Format d'échange (.json, version 2) :
   {
     "format": "storymap",
     "version": 2,
     "generator": "StoryMap 2.0.0",
     "exportedAt": "…", "createdAt": "…", "updatedAt": "…",
     "story": { …storymap sans les valeurs par défaut… },
     "images": { "tokyo.jpg": "data:image/jpeg;base64,…" },
     "geodata": { "gr20": { "type": "FeatureCollection", … } }
   }
   Chaque image intégrée n'est stockée qu'une fois, dans « images » ; la
   storymap la désigne par son nom (champ « image » des chapitres et
   <img src="…"> des textes). Les géométries des calques de données sont
   rangées dans « geodata », sous l'identifiant du calque (« data » de la
   storymap), sur une ligne chacune : la storymap reste lisible.

   À l'import sont aussi acceptés : l'ancien format (version 1), les pages
   HTML exportées par l'éditeur et les archives .zip (sauvegarde, site web).
   ========================================================================== */
(function () {
    'use strict';

    const SM = window.SM;
    const U = SM.util;
    const M = SM.model;

    const IO = SM.io = {};
    IO.FORMAT = 'storymap';
    IO.FORMAT_ALIASES = ['atelier-storymap']; // premiers fichiers de la version 2 (ancien nom de l'application)
    IO.VERSION = 2;
    IO.LEGACY_FORMAT = 'maplibre-storymap'; // ancien format (version 1), converti à l'import
    IO.GENERATOR = 'StoryMap ' + SM.VERSION;
    IO.ACCEPT = '.json,.html,.htm,.zip,application/json,text/html,application/zip';
    IO.FILE_RE = /\.(json|html?|zip)$/i;

    const BOM = String.fromCharCode(0xFEFF);
    const iso = ts => (ts ? new Date(ts).toISOString() : undefined);
    const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);

    IO.DATA_HINT = 'Ce fichier contient des lieux (données géographiques) : importez-le seul pour créer une storymap (un chapitre par lieu), ou ajoutez-le à une storymap ouverte (« Storymap › Données sur la carte », ou glissez-le sur la carte).';

    IO.baseName = config => U.slugify(config && config.title) || 'storymap';

    IO.byteSize = str => new Blob([str]).size;

    /* ---------- Images : table { nom: data URL } ---------- */

    /**
     * Range les images intégrées dans une table et les remplace par leur nom,
     * et les géométries des calques de données dans la table « geodata ».
     * @param {object} [opts] { prefix } : dossier ajouté aux noms (ex. « images/ »)
     * @returns {{story: object, images: object, geodata: object}} storymap abrégée + tables
     */
    IO.pack = function (config, opts) {
        const prefix = (opts && opts.prefix) || '';
        const images = {};
        const byContent = new Map();
        // Noms déjà pris par les images non intégrées (chemins relatifs)
        const used = new Set(M.findUnembeddedImages(config).map(x => x.src));
        const counters = {};
        const unique = (base, ext) => {
            let name = prefix + base + '.' + ext;
            let n = 2;
            while (used.has(name)) name = prefix + base + '-' + (n++) + '.' + ext;
            used.add(name);
            return name;
        };
        const withNames = M.mapImages(config, (src, kind, index) => {
            if (!M.isDataUrl(src)) return undefined;
            if (byContent.has(src)) return byContent.get(src);
            const ext = SM.images.extForMime(SM.images.dataUrlMime(src));
            let base;
            if (index < 0) {
                counters.footer = (counters.footer || 0) + 1;
                base = 'pied-de-page-' + counters.footer;
            } else {
                const chId = U.slugify(config.chapters[index].id) || ('chapitre-' + (index + 1));
                if (kind === 'chapter') base = chId;
                else {
                    counters[chId] = (counters[chId] || 0) + 1;
                    base = chId + '-texte-' + counters[chId];
                }
            }
            const name = unique(base, ext);
            byContent.set(src, name);
            images[name] = src;
            return name;
        });
        const story = M.compact(withNames);
        const geodata = {};
        if (story.data) {
            story.data = story.data.map(d => {
                geodata[d.id] = d.geojson;
                const out = Object.assign({}, d);
                delete out.geojson;
                return out;
            });
        }
        return { story, images, geodata };
    };

    /** Remplace les noms d'images par leur contenu (data URL d'image uniquement) et replace les géométries. */
    IO.unpack = function (story, images, geodata) {
        const table = isObj(images) ? images : {};
        const has = k => Object.prototype.hasOwnProperty.call(table, k) && typeof table[k] === 'string' && /^data:image\//i.test(table[k]);
        const out = M.mapImages(story, src => (has(src) ? table[src] : undefined));
        const geo = isObj(geodata) ? geodata : {};
        if (!Array.isArray(out.data)) return out;
        return Object.assign({}, out, {
            data: out.data.map(d => (isObj(d) && !isObj(d.geojson) && Object.prototype.hasOwnProperty.call(geo, d.id)
                ? Object.assign({}, d, { geojson: geo[d.id] }) : d))
        });
    };

    /** Contenu d'un fichier .json (format 2). */
    IO.toExchange = function (story, packed) {
        const p = packed || IO.pack(story.config);
        const out = { format: IO.FORMAT, version: IO.VERSION, generator: IO.GENERATOR, exportedAt: new Date().toISOString() };
        if (story.createdAt) out.createdAt = iso(story.createdAt);
        if (story.updatedAt) out.updatedAt = iso(story.updatedAt);
        out.story = p.story;
        out.images = p.images;
        if (p.geodata && Object.keys(p.geodata).length) out.geodata = p.geodata;
        return out;
    };

    /**
     * JSON indenté, coordonnées [lng, lat] sur une ligne. Seuls les tableaux de
     * deux nombres répartis sur plusieurs lignes sont concernés (un retour à la
     * ligne ne peut pas figurer tel quel dans une chaîne JSON). Les géométries
     * de la table « geodata » tiennent sur une ligne par calque.
     */
    IO.stringify = function (value) {
        const geo = isObj(value) && isObj(value.geodata) ? value.geodata : null;
        const keys = geo ? Object.keys(geo) : [];
        const token = '@@geodata-' + Math.random().toString(36).slice(2) + '-';
        if (geo) {
            const placeholders = {};
            keys.forEach((k, i) => { placeholders[k] = token + i; });
            value = Object.assign({}, value, { geodata: placeholders });
        }
        let json = JSON.stringify(value, null, 2)
            .replace(/\[\n\s*(-?[\d.eE+-]+),\n\s*(-?[\d.eE+-]+)\n\s*\]/g, '[$1, $2]');
        if (geo) json = json.replace(new RegExp('"' + token + '(\\d+)"', 'g'), (all, i) => JSON.stringify(geo[keys[Number(i)]]));
        return json;
    };

    IO.jsonString = story => IO.stringify(IO.toExchange(story));

    /* ---------- Exports ---------- */

    IO.exportJson = function (story) {
        const json = IO.jsonString(story);
        U.download(new Blob([json], { type: 'application/json' }), IO.baseName(story.config) + '.json');
        return IO.byteSize(json);
    };

    /**
     * Page HTML autonome (lecteur + données + images).
     * @param {object} story { config, createdAt?, updatedAt? }
     * @param {object} [opts] { start, preview } (voir SM.publish.page)
     */
    IO.buildHtml = (story, opts) => SM.publish.page(IO.toExchange(story), opts);

    IO.exportHtml = function (story) {
        const html = IO.buildHtml(story);
        U.download(new Blob([html], { type: 'text/html' }), IO.baseName(story.config) + '.html');
        return IO.byteSize(html);
    };

    /** Image d'aperçu des liens (réseaux sociaux) : première image, recadrée en 1200 × 630. */
    IO.shareImage = async function (config) {
        const src = M.firstImage(config);
        if (!src) return null;
        const jpeg = await SM.images.thumbnail(src, 1200, 630);
        return jpeg ? SM.images.dataUrlToBlob(jpeg) : null;
    };

    /** Site web : index.html + images/ (images en fichiers séparés) + apercu.jpg. */
    IO.buildSiteZip = async function (story) {
        const root = IO.baseName(story.config) + '/';
        const packed = IO.pack(story.config, { prefix: 'images/' });
        const files = Object.keys(packed.images).map(name => ({ name: root + name, data: SM.images.dataUrlToBlob(packed.images[name]) }));
        const preview = await IO.shareImage(story.config);
        if (preview) files.push({ name: root + 'apercu.jpg', data: preview });
        // Les noms « images/… » sont de vrais chemins : la table des images reste vide
        const html = SM.publish.page(IO.toExchange(story, { story: packed.story, images: {}, geodata: packed.geodata }), { shareImage: preview ? 'apercu.jpg' : null });
        const readme = [
            'Storymap « ' + (story.config.title || 'Sans titre') + ' »',
            'Exportée avec StoryMap le ' + new Date().toLocaleString('fr-FR') + '.',
            '',
            'Contenu :',
            '  index.html    — la storymap (page autonome)',
            '  images/       — images de la storymap',
            preview ? '  apercu.jpg    — image d’aperçu des liens (réseaux sociaux, messageries)' : null,
            '',
            'Pour la consulter : ouvrez index.html dans un navigateur récent',
            '(une connexion Internet est nécessaire pour les fonds de carte).',
            '',
            'Pour la publier : déposez le contenu de ce dossier sur n’importe quel',
            'hébergement statique (GitHub Pages, Netlify, serveur web…).',
            '',
            'Pour la modifier : importez ce fichier .zip (ou index.html avec le',
            'dossier images/) dans StoryMap.',
            '',
            'Licences : le code du lecteur de storymap contenu dans index.html est',
            'distribué sous licence MIT, Copyright (c) 2026 Volcan Laurent, avec des',
            'éléments tiers (avis complets en tête de son script). Les contenus de la',
            'storymap (textes, images, données) restent la propriété de leurs auteurs.',
            ''
        ].filter(l => l !== null).join('\r\n');
        files.unshift({ name: root + 'index.html', data: html }, { name: root + 'LISEZMOI.txt', data: readme });
        return SM.zip.create(files);
    };

    IO.exportZip = async function (story) {
        const blob = await IO.buildSiteZip(story);
        U.download(blob, IO.baseName(story.config) + '.zip');
        return blob.size;
    };

    /** Sauvegarde complète : une archive contenant un .json par storymap. */
    IO.exportBackup = async function (stories) {
        const used = new Set();
        const files = stories.map(story => {
            let name = IO.baseName(story.config);
            let n = 2;
            while (used.has(name)) name = IO.baseName(story.config) + '-' + (n++);
            used.add(name);
            return { name: 'storymaps/' + name + '.json', data: IO.jsonString(story) };
        });
        const blob = await SM.zip.create(files);
        U.download(blob, 'storymap-sauvegarde-' + U.fileStamp() + '.zip');
        return blob.size;
    };

    /* ---------- Imports ---------- */

    /**
     * Transforme le contenu d'un fichier .json en storymaps normalisées.
     * @returns {{config, warnings: string[], meta: object, source: string}[]}
     */
    IO.fromObject = function (obj, source) {
        if (Array.isArray(obj)) {
            const all = [];
            obj.forEach((item, i) => all.push(...IO.fromObject(item, source + ' #' + (i + 1))));
            return all;
        }
        if (!isObj(obj)) throw new Error('Le fichier ne contient pas de storymap.');
        const warnings = [];
        let res;
        if (obj.format === IO.FORMAT || IO.FORMAT_ALIASES.includes(obj.format)) {
            if (typeof obj.version === 'number' && obj.version > IO.VERSION) {
                warnings.push('Fichier créé par une version plus récente de l’éditeur : certaines informations pourraient être ignorées.');
            }
            if (!isObj(obj.story)) throw new Error('Fichier incomplet : la storymap (« story ») est absente.');
            res = M.normalize(IO.unpack(obj.story, obj.images, obj.geodata));
        } else if (obj.format === IO.LEGACY_FORMAT && isObj(obj.config)) {
            // Ancien format de l'éditeur (version 1) : converti automatiquement
            res = M.fromV1(obj.config);
        } else if (['FeatureCollection', 'Feature', 'Topology'].includes(obj.type)) {
            throw new Error(IO.DATA_HINT);
        } else {
            throw new Error('Ce fichier n’a pas été créé par StoryMap (format non reconnu).');
        }
        const meta = {};
        const created = Date.parse(obj.createdAt);
        if (isFinite(created)) meta.createdAt = created;
        return [{ config: res.config, warnings: warnings.concat(res.warnings), meta, source }];
    };

    /** Données d'une page HTML exportée par l'éditeur. */
    IO.pageData = function (html) {
        let data;
        try { data = SM.publish.dataFromPage(html); } catch (e) { throw new Error('Données de la storymap illisibles dans cette page.'); }
        if (!data) throw new Error('Cette page n’a pas été exportée par StoryMap : aucune storymap à importer.');
        return data;
    };

    /** Lit un fichier choisi par l'utilisateur. */
    IO.parseFile = async function (file) {
        const name = file.name || 'fichier';
        const ext = name.split('.').pop().toLowerCase();
        if (ext === 'zip' || file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
            return IO.parseZip(file);
        }
        if (ext === 'js' || ext === 'mjs') {
            throw new Error('Les fichiers JavaScript (config.js) ne sont plus pris en charge : importez un fichier .json, une page .html ou une archive .zip exportés par l’éditeur.');
        }
        if (['geojson', 'topojson', 'gpx', 'kml', 'kmz', 'shp'].includes(ext)) throw new Error(IO.DATA_HINT);
        let text = await U.readAsText(file);
        if (text.startsWith(BOM)) text = text.slice(1);
        if (ext === 'html' || ext === 'htm' || /^\s*<(!doctype|html)/i.test(text)) return IO.fromObject(IO.pageData(text), name);
        let obj;
        try {
            obj = JSON.parse(text);
        } catch (e) {
            throw new Error('Fichier JSON invalide : ' + e.message);
        }
        return IO.fromObject(obj, name);
    };

    function joinPath(dir, rel) {
        if (/^(https?:|data:|blob:|\/\/)/i.test(rel)) return rel;
        const parts = (rel.startsWith('/') ? rel.slice(1) : dir + rel).split('/');
        const out = [];
        for (const p of parts) {
            if (!p || p === '.') continue;
            if (p === '..') out.pop(); else out.push(p);
        }
        return out.join('/');
    }

    /** Intègre les images désignées par un chemin relatif à partir des fichiers de l'archive. */
    async function embedFromEntries(config, entries, dir, warnings) {
        const byPath = new Map(entries.map(e => [e.name.toLowerCase(), e]));
        const resolved = new Map();
        for (const item of M.findUnembeddedImages(config)) {
            if (resolved.has(item.src) || M.isRemoteUrl(item.src)) continue;
            let path = item.src.split(/[?#]/)[0];
            try { path = decodeURIComponent(path); } catch (e) { /* chemin non encodé */ }
            const entry = byPath.get(joinPath(dir, path).toLowerCase());
            if (!entry) continue;
            try {
                const bytes = await entry.bytes();
                const mime = SM.images.mimeForName(entry.name) || 'image/jpeg';
                resolved.set(item.src, (await SM.images.fromBlob(new Blob([bytes], { type: mime }), { optimize: false })).src);
            } catch (e) {
                warnings.push('Image « ' + item.src + ' » illisible : ' + e.message);
            }
        }
        return M.mapImages(config, src => resolved.get(src));
    }

    /** Archive .zip : sauvegarde (fichiers .json) ou site web exporté (index.html + images/). */
    IO.parseZip = async function (file) {
        const entries = await SM.zip.read(file);
        const results = [];
        const errors = [];
        const skip = /(^|\/)(__MACOSX|\.)/;
        for (const e of entries.filter(x => /\.json$/i.test(x.name) && !skip.test(x.name))) {
            try {
                let text = await e.text();
                if (text.startsWith(BOM)) text = text.slice(1);
                results.push(...IO.fromObject(JSON.parse(text), e.name));
            } catch (err) { errors.push(e.name + ' : ' + err.message); }
        }
        for (const e of entries.filter(x => /\.html?$/i.test(x.name) && !skip.test(x.name))) {
            let data;
            try { data = SM.publish.dataFromPage(await e.text()); } catch (err) { data = null; }
            if (!data) continue; // page sans storymap
            try {
                const dir = e.name.slice(0, e.name.lastIndexOf('/') + 1);
                for (const item of IO.fromObject(data, e.name)) {
                    item.config = await embedFromEntries(item.config, entries, dir, item.warnings);
                    results.push(item);
                }
            } catch (err) { errors.push(e.name + ' : ' + err.message); }
        }
        if (!results.length) {
            throw new Error(errors.length ? errors.join(' — ') : 'Aucune storymap trouvée dans l’archive (ni fichier .json, ni page exportée par l’éditeur).');
        }
        if (errors.length) results[0].warnings.push('Fichiers ignorés : ' + errors.join(' ; '));
        return results;
    };

    /* ---------- Images non intégrées ---------- */

    IO.uniqueUnembedded = function (config) {
        const seen = new Map();
        for (const item of M.findUnembeddedImages(config)) {
            if (!seen.has(item.src)) seen.set(item.src, Object.assign({ count: 0, remote: M.isRemoteUrl(item.src) }, item));
            seen.get(item.src).count++;
        }
        return Array.from(seen.values());
    };

    const stem = name => name.replace(/\.[^./]+$/, '');

    /**
     * Fichier correspondant à une image désignée par un chemin ou un nom : chemin
     * relatif complet (aligné sur un dossier : pas « basemap.png » pour
     * « map.png »), sinon nom du fichier, sinon (nom sans extension) nom du
     * fichier sans son extension : « washington » pour « washington.jpg ».
     */
    IO.findImageFile = function (src, files) {
        let rel = String(src || '').split(/[?#]/)[0];
        try { rel = decodeURIComponent(rel); } catch (e) { /* chemin non encodé */ }
        rel = rel.replace(/^(\.\.?\/)+/, '').replace(/^\/+/, '').toLowerCase();
        if (!rel) return null;
        const list = Array.from(files || []);
        const base = U.basename(src).toLowerCase();
        return list.find(f => f.webkitRelativePath && (f.webkitRelativePath.toLowerCase() === rel || f.webkitRelativePath.toLowerCase().endsWith('/' + rel))) ||
            list.find(f => f.name.toLowerCase() === base) ||
            (base && stem(base) === base ? list.find(f => stem(f.name.toLowerCase()) === base) : null) ||
            null;
    };

    /** Associe des fichiers (sélectionnés par l'utilisateur) aux images non intégrées, par nom. */
    IO.embedFromFiles = async function (config, files) {
        const resolved = new Map();
        const errors = [];
        const list = IO.uniqueUnembedded(config);
        for (const item of list) {
            const file = IO.findImageFile(item.src, files);
            if (!file) continue;
            try {
                resolved.set(item.src, (await SM.images.fromFile(file)).src);
            } catch (e) { errors.push(U.basename(item.src) + ' : ' + e.message); }
        }
        return { config: M.mapImages(config, src => resolved.get(src)), matched: resolved.size, total: list.length, errors };
    };

    /** Tente de télécharger et d'intégrer les images distantes (http/https). */
    IO.embedRemote = async function (config, onProgress) {
        const list = IO.uniqueUnembedded(config).filter(x => x.remote);
        const resolved = new Map();
        const failed = [];
        let i = 0;
        for (const item of list) {
            if (onProgress) onProgress(++i, list.length);
            try {
                const url = item.src.startsWith('//') ? 'https:' + item.src : item.src;
                resolved.set(item.src, (await SM.images.fromUrl(url)).src);
            } catch (e) { failed.push({ src: item.src, error: e.message }); }
        }
        return { config: M.mapImages(config, src => resolved.get(src)), ok: resolved.size, failed, total: list.length };
    };

    /* ---------- Bibliothèque (stockage IndexedDB) ---------- */

    const L = SM.library = {};

    // Enregistrements : { id, schema: 2, config, createdAt, updatedAt }. Sans « schema »,
    // la storymap est dans l'ancien format : elle est convertie à la lecture et
    // réenregistrée au format 2 à la prochaine modification.
    L.SCHEMA = 2;

    /** Storymap (format 2) à partir d'un enregistrement de la base. */
    L.fromRecord = function (record) {
        if (!record) return null;
        const res = record.schema === L.SCHEMA ? M.normalize(record.config) : M.fromV1(record.config);
        return { id: record.id, config: res.config, createdAt: record.createdAt, updatedAt: record.updatedAt };
    };

    L.get = async id => L.fromRecord(await SM.db.getStory(id));

    L.getAll = async function () {
        const out = [];
        for (const record of await SM.db.getAllStories()) {
            try { out.push(L.fromRecord(record)); } catch (e) { console.error('Storymap illisible :', record && record.id, e); }
        }
        return out;
    };

    L.thumbnailFor = async function (config) {
        const img = M.firstImage(config);
        return img ? SM.images.thumbnail(img, 480, 300) : null;
    };

    L.sizeOf = config => {
        try {
            // Géométries des calques : taille mise en cache (inutile de les resérialiser à chaque enregistrement)
            const data = config.data || [];
            const light = data.length ? Object.assign({}, config, { data: data.map(d => Object.assign({}, d, { geojson: null })) }) : config;
            return IO.byteSize(JSON.stringify(light)) + data.reduce((n, d) => n + SM.geodata.byteSize(d.geojson), 0);
        } catch (e) { return 0; }
    };

    L.save = async function (story, extra) {
        const summary = M.summarize(story, Object.assign({ size: L.sizeOf(story.config) }, extra || {}));
        if (summary.thumbnail === undefined) {
            const prev = await SM.db.getSummary(story.id).catch(() => null);
            summary.thumbnail = prev ? prev.thumbnail : null;
            if (prev && prev.thumbnailSource) summary.thumbnailSource = prev.thumbnailSource;
        }
        await SM.db.saveStory({ id: story.id, schema: L.SCHEMA, config: story.config, createdAt: story.createdAt, updatedAt: story.updatedAt }, summary);
        SM.db.broadcast({ type: 'saved', id: story.id });
        return summary;
    };

    L.create = async function (config, meta) {
        const now = Date.now();
        const story = {
            id: U.uid('sm-'),
            config,
            createdAt: (meta && meta.createdAt) || now,
            updatedAt: now
        };
        const thumbnail = await L.thumbnailFor(config);
        await L.save(story, { thumbnail, thumbnailSource: thumbnail ? 'image' : null });
        return story;
    };

    L.duplicate = async function (id) {
        const story = await L.get(id);
        if (!story) throw new Error('Storymap introuvable.');
        const config = Object.assign({}, story.config, { title: (story.config.title || 'Sans titre') + ' (copie)' });
        const summary = await SM.db.getSummary(id);
        const now = Date.now();
        const copy = { id: U.uid('sm-'), config, createdAt: now, updatedAt: now };
        await L.save(copy, { thumbnail: summary ? summary.thumbnail : null, thumbnailSource: summary ? summary.thumbnailSource : null });
        return copy;
    };

    L.remove = async function (id) {
        await SM.db.deleteStory(id);
        SM.db.broadcast({ type: 'deleted', id });
    };

    /** Importe des fichiers et crée les storymaps correspondantes. */
    L.importFiles = async function (files) {
        const report = [];
        for (const file of files) {
            try {
                const items = await IO.parseFile(file);
                for (const item of items) {
                    const story = await L.create(item.config, item.meta);
                    report.push({ ok: true, file: file.name, source: item.source, story, warnings: item.warnings, unembedded: IO.uniqueUnembedded(item.config) });
                }
            } catch (e) {
                report.push({ ok: false, file: file.name, error: e.message || String(e) });
            }
        }
        return report;
    };
})();
