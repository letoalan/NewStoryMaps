/* ==========================================================================
   StoryMap — préférences de l'application (stockées localement)
   ========================================================================== */
(function () {
    'use strict';

    const SM = window.SM;
    const U = SM.util;

    const DEFAULTS = {
        uiTheme: 'auto',            // auto | light | dark
        imageOptimize: true,        // redimensionner / recompresser les images importées
        imageMaxDim: 1600,          // dimension maximale (px)
        imageQuality: 0.85,         // qualité JPEG / WebP
        animateNavigation: true,    // animer la carte lors du changement de chapitre
        geocoder: 'photon',         // photon | nominatim
        device: 'screen',           // appareil simulé dans le canevas
        outlineOpen: true,
        inspectorOpen: true,
        editorMode: 'visual',       // visual | sheet (tableur)
        sheetColumns: [],           // colonnes facultatives affichées dans le tableur
        sheetWidths: {},            // largeurs des colonnes du tableur (px)
        csvDelimiter: ';',          // séparateur des fichiers CSV exportés (; ou ,)
        dashboardSort: 'updated',
        onboardingDone: false
    };

    let values = Object.assign({}, DEFAULTS, U.storage.get('prefs', {}));
    const emitter = U.emitter();

    SM.prefs = {
        DEFAULTS,
        get(key) { return values[key] === undefined ? DEFAULTS[key] : values[key]; },
        set(key, value) {
            if (values[key] === value) return;
            values[key] = value;
            U.storage.set('prefs', values);
            emitter.emit('change', { key, value });
        },
        all() { return Object.assign({}, values); },
        reset() {
            values = Object.assign({}, DEFAULTS);
            U.storage.set('prefs', values);
            emitter.emit('change', { key: '*' });
        },
        onChange(fn) { return emitter.on('change', fn); }
    };

    /* ---------- Thème de l'interface ---------- */

    const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

    SM.applyTheme = function () {
        const pref = SM.prefs.get('uiTheme');
        const dark = pref === 'dark' || (pref === 'auto' && mq && mq.matches);
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    };

    if (mq) {
        const onMq = () => { if (SM.prefs.get('uiTheme') === 'auto') SM.applyTheme(); };
        if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
    }
    SM.prefs.onChange(e => { if (e.key === 'uiTheme' || e.key === '*') SM.applyTheme(); });
})();
