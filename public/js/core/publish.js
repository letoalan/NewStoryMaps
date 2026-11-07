/* ==========================================================================
   StoryMap — pages publiées (export HTML, site web, aperçu)
   --------------------------------------------------------------------------
   Une page autonome : MapLibre GL JS (CDN), styles et code du lecteur
   (js/player/player.js), et les données de la storymap au format .json
   (réimportables telles quelles dans l'éditeur).
   ========================================================================== */
(function () {
    'use strict';

    const SM = window.SM;
    const U = SM.util;
    const P = SM.publish = {};

    // Même version que l'éditeur (app.html) : rendu identique
    P.MAPLIBRE_VERSION = '4.7.1';
    P.MAPLIBRE_JS = 'https://cdn.jsdelivr.net/npm/maplibre-gl@' + P.MAPLIBRE_VERSION + '/dist/maplibre-gl.js';
    P.MAPLIBRE_CSS = 'https://cdn.jsdelivr.net/npm/maplibre-gl@' + P.MAPLIBRE_VERSION + '/dist/maplibre-gl.css';

    P.ROOT_ID = 'storymap';
    P.DATA_ID = 'storymap-data';
    const OLD_DATA_ID = 'atelier-storymap-data'; // premières pages de la version 2 (ancien nom de l'application)

    // « < » échappé : le JSON ne peut pas fermer la balise <script> qui le contient
    const LT = '\\' + 'u003c';
    const jsonForHtml = value => JSON.stringify(value).replace(/</g, LT);
    const scriptSafe = js => js.replace(/<\/(script)/gi, '<\\/$1');
    const indent = (text, n) => text.split('\n').map(l => (l ? ' '.repeat(n) + l : l)).join('\n');

    /** Description des aperçus de lien : celle du partage, le sous-titre ou le début du premier texte. */
    P.description = function (story) {
        if (story.share && story.share.description) return story.share.description;
        if (story.subtitle) return story.subtitle;
        const first = (story.chapters || []).find(ch => U.stripHtml(ch.text));
        return first ? U.truncate(U.stripHtml(first.text), 200) : '';
    };

    /** Adresse absolue d'un fichier de la page publiée (si l'adresse de publication est connue). */
    function absolute(path, base) {
        if (!base) return path;
        try { return new URL(path, base).href; } catch (e) { return path; }
    }

    /** Icône d'onglet : un repère aux couleurs du marqueur. */
    function favicon(color) {
        const c = /^#[0-9a-f]{3,8}$|^[a-z]{3,20}$/i.test(color || '') ? color : '#3FB1CE';
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M16 2C10.2 2 5.5 6.6 5.5 12.4 5.5 20.2 16 30 16 30s10.5-9.8 10.5-17.6C26.5 6.6 21.8 2 16 2z" fill="' + c + '"/><circle cx="16" cy="12.4" r="4.3" fill="#fff"/></svg>';
        return 'data:image/svg+xml,' + encodeURIComponent(svg);
    }

    /**
     * Construit la page HTML d'une storymap.
     * @param {object} data   contenu d'un fichier .json (format 2 : { story, images, … })
     * @param {object} [opts] { start: chapitre de départ, preview: true pour l'aperçu de l'éditeur,
     *                          shareImage: chemin de l'image d'aperçu (site web) }
     */
    P.page = function (data, opts) {
        opts = opts || {};
        const story = window.SMPlayer.expand(data.story);
        const vars = SM.appearance.vars(story.panels);
        const rootStyle = Object.keys(vars).map(k => k + ': ' + vars[k]).join('; ');
        const fonts = SM.appearance.fontsHref(story.panels);
        const mountOptions = opts.start ? { start: opts.start } : {};
        const title = story.title || 'Storymap';
        const description = P.description(story);
        const url = story.share.url;
        const image = opts.shareImage ? absolute(opts.shareImage, url) : '';
        const meta = (attr, name, content) => '    <meta ' + attr + '="' + name + '" content="' + U.escapeHtml(content) + '">';

        const head = [
            '<!DOCTYPE html>',
            '<html lang="fr">',
            '<head>',
            '    <meta charset="utf-8">',
            '    <meta name="viewport" content="width=device-width, initial-scale=1">',
            '    <title>' + U.escapeHtml(title) + '</title>',
            description ? meta('name', 'description', description) : null,
            '    <meta name="generator" content="' + U.escapeHtml(SM.io.GENERATOR) + '">',
            // Aperçu du lien sur les réseaux sociaux et messageries (Open Graph)
            meta('property', 'og:type', 'article'),
            meta('property', 'og:title', title),
            description ? meta('property', 'og:description', description) : null,
            meta('property', 'og:locale', 'fr_FR'),
            url ? meta('property', 'og:url', url) : null,
            image ? meta('property', 'og:image', image) : null,
            image ? meta('property', 'og:image:width', '1200') : null,
            image ? meta('property', 'og:image:height', '630') : null,
            meta('name', 'twitter:card', image ? 'summary_large_image' : 'summary'),
            url ? '    <link rel="canonical" href="' + U.escapeHtml(url) + '">' : null,
            '    <link rel="icon" href="' + U.escapeHtml(favicon(story.marker.color)) + '">',
            '    <link rel="stylesheet" href="' + P.MAPLIBRE_CSS + '">',
            '    <script src="' + P.MAPLIBRE_JS + '"></script>',
            fonts ? '    <link rel="stylesheet" href="' + U.escapeHtml(fonts) + '">' : null,
            '    <style>',
            '        html, body { margin: 0; padding: 0; }',
            indent(window.SMPlayer.CSS.trim(), 8),
            '    </style>',
            '</head>'
        ];
        const body = [
            '<body>',
            '    <div id="' + P.ROOT_ID + '" class="sm-frame"' + (rootStyle ? ' style="' + U.escapeHtml(rootStyle) + '"' : '') + '></div>',
            '    <noscript><p style="padding:2rem;font-family:sans-serif">Cette storymap nécessite JavaScript.</p></noscript>',
            '    <!-- Données de la storymap (format .json de StoryMap, réimportable dans l’éditeur) -->',
            '    <script type="application/json" id="' + P.DATA_ID + '">' + jsonForHtml(data) + '</script>',
            '    <!-- Lecteur StoryMap -->',
            '    <script>',
            indent(scriptSafe('window.SMPlayer = (' + window.SMPlayer.source.toString() + ')();'), 8),
            '        // window.storymap.map : carte MapLibre (pour du code personnalisé)',
            '        window.storymap = SMPlayer.mount(document.getElementById(' + JSON.stringify(P.ROOT_ID) + '),',
            '            JSON.parse(document.getElementById(' + JSON.stringify(P.DATA_ID) + ').textContent), ' + scriptSafe(JSON.stringify(mountOptions)) + ');',
            '    </script>'
        ];
        if (opts.preview) {
            // Aperçu de l'éditeur (iframe isolée) : Échap ferme l'aperçu (sauf s'il ferme le sommaire)
            body.push(
                '    <script>',
                '        document.addEventListener("keydown", function (e) {',
                '            if (e.key === "Escape" && !e.defaultPrevented) { try { parent.postMessage({ type: "storymap-preview-escape" }, "*"); } catch (err) { } }',
                '        });',
                '    </script>');
        }
        body.push('</body>', '</html>', '');
        return head.concat(body).filter(l => l !== null).join('\n');
    };

    /** Données (.json) intégrées dans une page exportée par l'éditeur, ou null. */
    P.dataFromPage = function (html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const el = doc.getElementById(P.DATA_ID) || doc.getElementById(OLD_DATA_ID);
        if (!el) return null;
        return JSON.parse(el.textContent);
    };
})();
