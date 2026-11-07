/* ==========================================================================
   StoryMap — apparence : polices, icônes du marqueur
   --------------------------------------------------------------------------
   Les styles de la storymap sont ceux du lecteur (js/player/player.js) ;
   les réglages des panneaux lui sont transmis sous forme de variables CSS
   (--sm-*), identiques dans l'éditeur, l'aperçu et les pages publiées.
   ========================================================================== */
(function () {
    'use strict';

    const SM = window.SM;
    const P = window.SMPlayer;
    const A = SM.appearance = {};

    A.TITLE_RATIO = 1.17;      // titre automatique : 1,17 × la taille du texte
    A.LINE_RATIO = 25 / 13;    // interligne automatique : 25 px pour 13 px

    /* ---------- Polices ---------- */

    // Police de la storymap par défaut (identique à celle du lecteur)
    A.DEFAULT_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif";

    const ITAL = ':ital,wght@0,400;0,700;1,400;1,700';
    const gf = (name, group, fallback, axes) => ({
        id: name, label: name, group, google: name + (axes === undefined ? ITAL : axes), css: "'" + name + "', " + fallback
    });
    const SANS = 'system-ui, sans-serif';
    const SERIF = 'Georgia, serif';

    /**
     * Catalogue : polices système (aucun téléchargement) et Google Fonts
     * (chargées depuis fonts.googleapis.com, avec gras et italique si disponibles).
     */
    A.FONTS = [
        { id: 'system', label: 'Police par défaut', group: 'Polices système', css: A.DEFAULT_FONT },
        { id: 'georgia', label: 'Georgia', group: 'Polices système', css: "Georgia, 'Times New Roman', Times, serif" },
        { id: 'arial', label: 'Arial', group: 'Polices système', css: "Arial, 'Helvetica Neue', Helvetica, sans-serif" },
        { id: 'verdana', label: 'Verdana', group: 'Polices système', css: 'Verdana, Geneva, Tahoma, sans-serif' },
        { id: 'trebuchet', label: 'Trebuchet MS', group: 'Polices système', css: "'Trebuchet MS', 'Lucida Grande', 'Lucida Sans Unicode', sans-serif" },
        { id: 'courier', label: 'Courier New', group: 'Polices système', css: "'Courier New', Courier, monospace" },
        gf('Inter', 'Sans empattement', SANS), gf('Roboto', 'Sans empattement', SANS), gf('Open Sans', 'Sans empattement', SANS),
        gf('Lato', 'Sans empattement', SANS), gf('Montserrat', 'Sans empattement', SANS), gf('Source Sans 3', 'Sans empattement', SANS),
        gf('Nunito', 'Sans empattement', SANS), gf('Work Sans', 'Sans empattement', SANS), gf('Poppins', 'Sans empattement', SANS),
        gf('Fira Sans', 'Sans empattement', SANS), gf('Raleway', 'Sans empattement', SANS), gf('Noto Sans', 'Sans empattement', SANS),
        gf('Merriweather', 'Avec empattement', SERIF), gf('Lora', 'Avec empattement', SERIF), gf('Playfair Display', 'Avec empattement', SERIF),
        gf('Source Serif 4', 'Avec empattement', SERIF), gf('PT Serif', 'Avec empattement', SERIF),
        gf('Libre Baskerville', 'Avec empattement', SERIF, ':ital,wght@0,400;0,700;1,400'),
        gf('EB Garamond', 'Avec empattement', SERIF), gf('Crimson Pro', 'Avec empattement', SERIF), gf('Noto Serif', 'Avec empattement', SERIF),
        gf('Oswald', 'Titres et fantaisie', SANS, ':wght@400;700'), gf('Bebas Neue', 'Titres et fantaisie', SANS, ''),
        gf('Abril Fatface', 'Titres et fantaisie', SERIF, ''), gf('Caveat', 'Titres et fantaisie', 'cursive', ':wght@400;700'),
        gf('Dancing Script', 'Titres et fantaisie', 'cursive', ':wght@400;700'), gf('Pacifico', 'Titres et fantaisie', 'cursive', '')
    ];

    /** Nom de police Google Fonts saisi librement : lettres, chiffres, espaces, tirets. */
    A.isValidFontName = name => typeof name === 'string' && /^[A-Za-z0-9][A-Za-z0-9 \-]{0,59}$/.test(name.trim());

    /** Entrée du catalogue, ou police Google Fonts personnalisée (poids normal). */
    A.fontEntry = function (name) {
        if (!name) return null;
        const known = A.FONTS.find(f => f.id === name);
        if (known) return known;
        if (!A.isValidFontName(name)) return null;
        const n = name.trim();
        return { id: n, label: n, group: 'Autre police', google: n, css: "'" + n + "', sans-serif", custom: true };
    };

    A.fontLabel = name => (A.fontEntry(name) || { label: name }).label;

    A.googleFontsUrl = function (specs, text) {
        return 'https://fonts.googleapis.com/css2?family=' + specs.map(s => s.replace(/ /g, '+')).join('&family=') +
            (text ? '&text=' + encodeURIComponent(text) : '') + '&display=swap';
    };

    /** Piles de polices CSS { text, title } des réglages de panneaux. */
    A.fontStacks = function (panels) {
        const p = panels || {};
        const css = name => { const f = A.fontEntry(name); return f ? f.css : ''; };
        return { text: css(p.font), title: css(p.titleFont) };
    };

    /** Adresse Google Fonts des polices utilisées (null si aucune). */
    A.fontsHref = function (panels) {
        const p = panels || {};
        const specs = [];
        for (const name of [p.font, p.titleFont]) {
            const f = A.fontEntry(name);
            if (f && f.google && !specs.includes(f.google)) specs.push(f.google);
        }
        return specs.length ? A.googleFontsUrl(specs) : null;
    };

    /** Variables CSS de l'apparence des panneaux (voir SMPlayer.cssVars). */
    A.vars = panels => P.cssVars(panels, A.fontStacks(panels));

    /** Charge dans l'éditeur les polices Google utilisées par la storymap. */
    A.useEditorFonts = function (panels) {
        const href = panels ? A.fontsHref(panels) : null;
        let link = document.getElementById('sm-editor-fonts');
        if (!href) { if (link) link.remove(); return; }
        if (!link) {
            link = document.createElement('link');
            link.id = 'sm-editor-fonts';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
        if (link.href !== href) link.href = href;
    };

    /** Aperçu des polices (sous-ensembles limités aux lettres de leur nom). */
    let previewLoaded = false;
    A.loadFontPreviews = function () {
        if (previewLoaded) return;
        previewLoaded = true;
        const groups = {};
        for (const f of A.FONTS) if (f.google) (groups[f.group] = groups[f.group] || []).push(f);
        for (const list of Object.values(groups)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = A.googleFontsUrl(list.map(f => f.id), list.map(f => f.label).join('') + 'Aa');
            document.head.appendChild(link);
        }
    };

    /* ---------- Icônes du marqueur (dessins : SMPlayer.ICONS) ---------- */

    const PIN_PREVIEW = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 27 41"><path d="M27 13.5c0 5.6-6.8 13.5-12.3 21-.7 1-1.8 1-2.5 0C6.8 27 0 19.2 0 13.5a13.5 13.5 0 0 1 27 0z" fill="currentColor"/><circle cx="13.5" cy="13.5" r="5.5" fill="#fff"/></svg>';
    const ICON_LABELS = {
        pin: 'Épingle (MapLibre)', circle: 'Point', ring: 'Cible', star: 'Étoile', heart: 'Cœur',
        flag: 'Drapeau', home: 'Maison', camera: 'Photo', mountain: 'Montagne', info: 'Information'
    };

    A.MARKER_ICONS = Object.keys(P.ICONS).map(id => ({
        id, label: ICON_LABELS[id] || id, size: P.ICONS[id].size, preview: P.ICONS[id].svg || PIN_PREVIEW
    }));

    A.iconById = id => A.MARKER_ICONS.find(i => i.id === id) || A.MARKER_ICONS[0];
    A.defaultMarkerSize = id => A.iconById(id).size;
})();
