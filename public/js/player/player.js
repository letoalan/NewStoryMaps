/* ==========================================================================
   StoryMap — lecteur de storymap
   --------------------------------------------------------------------------
   Affiche une storymap : panneaux qui défilent au-dessus d'une carte
   MapLibre GL JS, transitions entre chapitres, marqueur et trajet d'un
   marqueur au suivant, mini-carte, relief 3D, couches, calques de données
   de l'auteur (tracés, zones, points), lecture automatique et navigation
   au clavier.

   Ce fichier est autonome (il ne dépend que de MapLibre GL JS) :
   - les pages publiées (HTML, site web) et l'aperçu en recopient le code ;
   - l'éditeur l'utilise pour ses styles et ses fonctions de carte : le
     canevas affiche donc exactement le rendu publié.
   L'avis de licence est placé dans la fonction : il accompagne ainsi le code
   recopié dans chaque storymap publiée.
   ========================================================================== */
window.SMPlayer = (function player() {
    /*!
     * StoryMap — lecteur de storymap, recopié dans chaque storymap publiée
     * Copyright (c) 2026 Volcan Laurent — licence MIT (texte ci-dessous).
     *
     * Ce code reprend :
     * - la mise en page de MapLibre GL Storytelling, Copyright (c) 2026 Qiusheng Wu,
     *   licence MIT (texte ci-dessous), elle-même issue de Mapbox Storytelling,
     *   Copyright (c) 2019, Mapbox, licence BSD 3-Clause (texte ci-dessous) ;
     * - des icônes de Lucide, Copyright (c) 2026 Lucide Icons and Contributors,
     *   licence ISC (texte ci-dessous), dont certaines issues de Feather,
     *   Copyright (c) 2013-present Cole Bemis, licence MIT (texte ci-dessous).
     *
     * MIT License (StoryMap, MapLibre GL Storytelling, Feather) :
     *
     * Permission is hereby granted, free of charge, to any person obtaining a copy
     * of this software and associated documentation files (the "Software"), to deal
     * in the Software without restriction, including without limitation the rights
     * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
     * copies of the Software, and to permit persons to whom the Software is
     * furnished to do so, subject to the following conditions:
     *
     * The above copyright notice and this permission notice shall be included in all
     * copies or substantial portions of the Software.
     *
     * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
     * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
     * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
     * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
     * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
     * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
     * SOFTWARE.
     *
     * BSD 3-Clause License (Mapbox Storytelling) :
     *
     * Copyright (c) 2019, Mapbox
     * All rights reserved.
     *
     * Redistribution and use in source and binary forms, with or without
     * modification, are permitted provided that the following conditions are met:
     *
     * 1. Redistributions of source code must retain the above copyright notice, this
     *    list of conditions and the following disclaimer.
     *
     * 2. Redistributions in binary form must reproduce the above copyright notice,
     *    this list of conditions and the following disclaimer in the documentation
     *    and/or other materials provided with the distribution.
     *
     * 3. Neither the name of the copyright holder nor the names of its
     *    contributors may be used to endorse or promote products derived from
     *    this software without specific prior written permission.
     *
     * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
     * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
     * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
     * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
     * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
     * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
     * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
     * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
     * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
     * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
     *
     * ISC License (Lucide) :
     *
     * Permission to use, copy, modify, and/or distribute this software for any
     * purpose with or without fee is hereby granted, provided that the above
     * copyright notice and this permission notice appear in all copies.
     *
     * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
     * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
     * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
     * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
     * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
     * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
     * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
     */
    'use strict';

    /* ---------- Format des storymaps (version 2) ---------- */

    // Valeurs par défaut : absentes d'un fichier .json, elles s'appliquent.
    const DEFAULTS = deepFreeze({
        style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
        theme: 'dark',
        // font, titleFont, titleSize, lineHeight : facultatifs (automatiques)
        panels: { opacity: 0.9, titleAlign: 'left', textSize: 13, textAlign: 'left', paddingY: 25, paddingX: 50 },
        // size : facultative (taille propre à l'icône)
        marker: { show: true, icon: 'pin', color: '#3FB1CE' },
        // Trajet d'un marqueur de chapitre au suivant (color : facultative, celle du marqueur ;
        // un chapitre « route: false » n'en est pas une étape)
        route: { show: false, width: 4, opacity: 1, dash: false, progressive: true, ghost: true },
        inset: { show: true, style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json', position: 'bottom-right', zoom: 1, color: 'orange' },
        terrain: { show: false, source: 'https://tiles.mapterhorn.com/tilejson.json', exaggeration: 1.5 },
        autoplay: false,
        autoplayDelay: 6,     // secondes d'affichage d'un chapitre en lecture automatique (après la transition)
        keyboard: true,
        navigation: true,     // sommaire, barre de progression, boutons précédent / suivant
        // Texte des chapitres : 'immediate' (dès le début de la transition), 'fade' (masqué pendant le
        // déplacement de la carte et le dessin du trajet, puis fondu), 'dim' (atténué jusque-là)
        reveal: 'immediate',
        share: { url: '', description: '' },
        // Calques de données de l'auteur (GeoJSON) : style par défaut
        // (ghost : parcours restant visible en transparence, pour un dessin progressif ;
        //  fileColors : couleurs d'origine des éléments — stroke, fill, marker-color ;
        //  fileIcons : icônes d'origine des points — propriété icon, table « icons » des données)
        dataStyle: { color: '#e8590c', width: 4, opacity: 1, dash: false, fillOpacity: 0.25, radius: 6, labels: true, ghost: true, fileColors: true, fileIcons: true },
        // imageAlt, imageCaption, imageCredit, autoplayDelay, marker (false : sans marqueur),
        // route (false : hors du trajet) : facultatifs
        chapter: { align: 'left', hidden: false, rotate: false },
        view: { center: [0, 0], zoom: 1, pitch: 0, bearing: 0 },
        // speed, curve (flyTo), duration (easeTo) : facultatifs
        transition: { type: 'flyTo' }
    });

    const ALIGN_CLASS = { left: 'lefty', center: 'centered', right: 'righty', full: 'fully' };
    const REVEALS = ['immediate', 'fade', 'dim'];
    const POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    const TRANSITIONS = ['flyTo', 'easeTo', 'jumpTo'];

    /** Propriétés de peinture modifiées par les règles de couches, selon le type de couche. */
    const LAYER_TYPES = deepFreeze({
        fill: ['fill-opacity'],
        line: ['line-opacity'],
        circle: ['circle-opacity', 'circle-stroke-opacity'],
        symbol: ['icon-opacity', 'text-opacity'],
        raster: ['raster-opacity'],
        'fill-extrusion': ['fill-extrusion-opacity'],
        heatmap: ['heatmap-opacity'],
        hillshade: ['hillshade-exaggeration']
    });

    /* ---------- Icônes du marqueur ---------- */

    const BADGE = '<circle cx="12" cy="12" r="11" fill="currentColor" stroke="#fff" stroke-width="1.5"/>';
    const svg = inner => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' + inner + '</svg>';

    // pin : marqueur natif de MapLibre (pas de SVG) ; size : hauteur par défaut en px
    const ICONS = deepFreeze({
        pin: { anchor: 'bottom', size: 41 },
        circle: { anchor: 'center', size: 22, svg: svg('<circle cx="12" cy="12" r="9" fill="currentColor" stroke="#fff" stroke-width="3"/>') },
        ring: { anchor: 'center', size: 26, svg: svg('<circle cx="12" cy="12" r="10.5" fill="#fff"/><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="12" cy="12" r="3.4" fill="currentColor"/>') },
        star: { anchor: 'center', size: 30, svg: svg('<path d="M12 1.8l3 6.3 6.9.8-5.1 4.8 1.4 6.8L12 17.2l-6.2 3.3 1.4-6.8L2.1 8.9 9 8.1z" fill="currentColor" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>') },
        heart: { anchor: 'center', size: 28, svg: svg('<path d="M12 21s-8.6-5.2-8.6-11.3A4.8 4.8 0 0 1 12 6.8a4.8 4.8 0 0 1 8.6 2.9C20.6 15.8 12 21 12 21z" fill="currentColor" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>') },
        flag: { anchor: 'bottom', size: 36, svg: svg('<path d="M12 23.5V2.5" stroke="#2b2f36" stroke-width="2" stroke-linecap="round"/><path d="M12.6 3h8.9l-2.4 4 2.4 4.1h-8.9z" fill="currentColor" stroke="#fff" stroke-width="1.1" stroke-linejoin="round"/>') },
        home: { anchor: 'center', size: 32, svg: svg(BADGE + '<path d="M6.8 12.1 12 7.8l5.2 4.3V17h-3.4v-3.1h-3.6V17H6.8z" fill="#fff"/>') },
        camera: { anchor: 'center', size: 32, svg: svg(BADGE + '<path d="M7.6 9.3h2.1l1-1.5h2.6l1 1.5h2.1c.6 0 1 .4 1 1v5.2c0 .6-.4 1-1 1H7.6c-.6 0-1-.4-1-1v-5.2c0-.6.4-1 1-1z" fill="#fff"/><circle cx="12" cy="12.9" r="2.2" fill="currentColor"/>') },
        mountain: { anchor: 'center', size: 32, svg: svg(BADGE + '<path d="M5.8 16.6 10 9.7l2.4 3.8 1.7-2.4 4.1 5.5z" fill="#fff"/>') },
        info: { anchor: 'center', size: 32, svg: svg(BADGE + '<path d="M12 11v5.6" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="7.6" r="1.5" fill="#fff"/>') }
    });

    /* ---------- Styles ---------- */

    // Unités cqw / cqh : largeur du récit et hauteur de l'écran. Dans la page
    // publiée, cqh vaut la hauteur de la fenêtre ; dans l'éditeur, celle de
    // l'écran simulé. Réglages d'apparence : variables --sm-* (voir cssVars).
    const CSS = `
.sm-frame {
    position: relative;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    font-size: 16px;
    font-weight: 400;
    line-height: normal;
    letter-spacing: normal;
    color: #000;
    text-align: left;
}

.sm-frame,
.sm-frame *,
.sm-frame *::before,
.sm-frame *::after {
    box-sizing: content-box;
}

.sm-frame a,
.sm-frame a:hover,
.sm-frame a:visited {
    color: #0071bc;
}

/* Carte fixe, sous le récit */
.sm-frame .sm-map {
    position: fixed;
    inset: 0;
}

/* Récit : les zones vides laissent la souris atteindre la carte */
.sm-frame .sm-story {
    position: relative;
    z-index: 1;
    pointer-events: none;
    container: smframe / inline-size;
}

.sm-frame .sm-header,
.sm-frame .sm-panel,
.sm-frame .sm-footer {
    pointer-events: auto;
    font-family: var(--sm-font);
}

.sm-frame .light {
    color: #444;
    background-color: #fafafa;
}

.sm-frame .dark {
    color: #fafafa;
    background-color: #444;
}

/* Couverture */
.sm-frame .sm-header {
    margin: auto;
    width: 100%;
    position: relative;
    z-index: 5;
}

.sm-frame .sm-header h1,
.sm-frame .sm-header h2,
.sm-frame .sm-header p {
    margin: 0;
    padding: 2cqh 2cqw;
    text-align: center;
}

.sm-frame .sm-header > h1,
.sm-frame .sm-header > h2,
.sm-frame .sm-panel > h3 {
    font-family: var(--sm-title-font);
}

/* Chapitres */
.sm-frame .sm-features {
    padding-top: 10cqh;
    padding-bottom: 10cqh;
}

.sm-frame .step {
    padding-bottom: 50cqh;
    opacity: 0.25;
}

/* Chapitre centré dans la fenêtre : un demi-écran d'espace suffit à cacher ses
   voisins. Le premier, juste sous la couverture, ne peut pas être centré (la
   page ne remonte pas plus haut) : un écran entier cache le panneau suivant. */
.sm-frame .step:where(:first-child) {
    padding-bottom: 100cqh;
}

.sm-frame .step.active {
    opacity: 1;
}

/* Texte révélé à l'arrivée (réglage reveal) : panneau masqué (fade) ou atténué (dim)
   pendant le déplacement de la carte et le dessin du trajet, puis affiché en fondu */
.sm-frame.sm-reveal-fade .step,
.sm-frame.sm-reveal-dim .step {
    transition: opacity 0.6s ease;
}

.sm-frame.sm-reveal-fade .step:not(.arrived) {
    opacity: 0;
}

.sm-frame.sm-reveal-fade .step:not(.arrived) > .sm-panel {
    pointer-events: none;
}

.sm-frame.sm-reveal-dim .step:not(.arrived) {
    opacity: 0.25;
}

@media (prefers-reduced-motion: reduce) {
    .sm-frame.sm-reveal-fade .step,
    .sm-frame.sm-reveal-dim .step {
        transition: none;
    }
}

.sm-frame .step.hidden {
    visibility: hidden;
}

.sm-frame .centered {
    width: 50cqw;
    margin: 0 auto;
}

.sm-frame .lefty {
    width: 33cqw;
    margin-left: 5cqw;
}

.sm-frame .righty {
    width: 33cqw;
    margin-left: 62cqw;
}

.sm-frame .fully {
    width: 100%;
    margin: auto;
}

.sm-frame .sm-panel {
    padding: var(--sm-pad-y, 25px) var(--sm-pad-x, 50px);
    font-size: var(--sm-text-size, 13px);
    line-height: calc(var(--sm-text-size, 13px) * 25 / 13);
}

.sm-frame .sm-panel.dark {
    background-color: rgba(68, 68, 68, var(--sm-panel-alpha, 0.9));
}

.sm-frame .sm-panel.light {
    background-color: rgba(250, 250, 250, var(--sm-panel-alpha, 0.9));
}

.sm-frame .sm-panel > h3 {
    font-size: var(--sm-title-size, 1.17em);
    line-height: max(calc(var(--sm-text-size, 13px) * 25 / 13), 1.3em);
    text-align: var(--sm-title-align, left);
}

.sm-frame .sm-desc {
    display: block;
    margin: 1em 0;
    line-height: var(--sm-line-height);
    text-align: var(--sm-text-align, left);
}

.sm-frame .step img {
    width: 100%;
}

/* Image du chapitre : légende et crédit */
.sm-frame .sm-figure {
    margin: 0;
}

.sm-frame .sm-figcaption {
    display: block;
    margin-top: 0.35em;
    font-size: 0.85em;
    line-height: 1.45;
    text-align: var(--sm-text-align, left);
}

.sm-frame .sm-caption,
.sm-frame .sm-credit {
    display: block;
}

.sm-frame .sm-credit {
    font-size: 0.9em;
    opacity: 0.7;
}

@container smframe (max-width: 750px) {
    .sm-frame .centered,
    .sm-frame .lefty,
    .sm-frame .righty,
    .sm-frame .fully {
        width: 90cqw;
        margin: 0 auto;
    }
}

/* Pied de page */
.sm-frame .sm-footer {
    width: 100%;
    min-height: 5cqh;
    padding-top: 2cqh;
    padding-bottom: 2cqh;
    text-align: center;
    line-height: 25px;
    font-size: 13px;
    position: relative;
    z-index: 5;
}

.sm-frame .sm-footer-text {
    display: block;
    margin: 1em 0;
}

/* Mini-carte de situation */
.sm-frame .sm-inset {
    position: fixed;
    width: 180px;
    height: 180px;
    border: 2px solid rgba(255, 255, 255, 0.8);
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    z-index: 10;
    overflow: hidden;
}

.sm-frame .sm-inset.top-left {
    top: 10px;
    left: 10px;
}

.sm-frame .sm-inset.top-right {
    top: 10px;
    right: 10px;
}

.sm-frame .sm-inset.bottom-left {
    bottom: 30px;
    left: 10px;
}

.sm-frame .sm-inset.bottom-right {
    bottom: 30px;
    right: 10px;
}

.sm-frame .inset-marker {
    width: 12px;
    height: 12px;
    background-color: #ff6b6b;
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

/* Navigation des lecteurs (pages publiées) : progression, boutons, sommaire */
.sm-frame .sm-progress {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    z-index: 30;
    pointer-events: none;
}

.sm-frame .sm-progress-bar {
    height: 100%;
    background: var(--sm-accent, #3FB1CE);
    transform: scaleX(0);
    transform-origin: 0 50%;
}

.sm-frame .sm-nav,
.sm-frame .sm-toc {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    box-sizing: border-box;
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.3);
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
}

.sm-frame .sm-nav {
    bottom: calc(40px + env(safe-area-inset-bottom, 0px));
    z-index: 30;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px;
    border-radius: 999px;
    font: 600 13px/1 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.sm-frame .sm-nav.dark,
.sm-frame .sm-toc.dark {
    background-color: rgba(38, 38, 38, 0.9);
    color: #fafafa;
}

.sm-frame .sm-nav.light,
.sm-frame .sm-toc.light {
    background-color: rgba(255, 255, 255, 0.94);
    color: #333;
}

.sm-frame .sm-nav button {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-width: 36px;
    height: 36px;
    padding: 0 8px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
}

.sm-frame .sm-nav button:hover:not(:disabled) {
    background: rgba(127, 127, 127, 0.22);
}

.sm-frame .sm-nav button:disabled {
    opacity: 0.35;
    cursor: default;
}

.sm-frame .sm-nav button:focus-visible,
.sm-frame .sm-toc a:focus-visible {
    outline: 2px solid var(--sm-accent, #3FB1CE);
    outline-offset: 2px;
}

.sm-frame .sm-nav svg {
    width: 18px;
    height: 18px;
    flex: none;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
}

.sm-frame .sm-nav-count {
    min-width: 3.4em;
    text-align: center;
    font-variant-numeric: tabular-nums;
}

.sm-frame .sm-toc {
    bottom: calc(92px + env(safe-area-inset-bottom, 0px));
    z-index: 31;
    width: min(360px, calc(100vw - 24px));
    max-height: min(60vh, 480px);
    overflow: auto;
    padding: 6px;
    border-radius: 12px;
    font-size: 14px;
    line-height: 1.35;
    font-family: var(--sm-font);
}

.sm-frame .sm-toc[hidden] {
    display: none;
}

.sm-frame .sm-toc-head {
    margin: 0;
    padding: 8px 10px 6px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    opacity: 0.6;
}

.sm-frame .sm-toc ol {
    margin: 0;
    padding: 0;
    list-style: none;
}

.sm-frame .sm-toc a,
.sm-frame .sm-toc a:hover,
.sm-frame .sm-toc a:visited {
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 8px;
    color: inherit;
    text-decoration: none;
}

.sm-frame .sm-toc a:hover {
    background: rgba(127, 127, 127, 0.18);
}

.sm-frame .sm-toc a[aria-current] {
    background: rgba(127, 127, 127, 0.26);
    box-shadow: inset 3px 0 0 var(--sm-accent, #3FB1CE);
    font-weight: 600;
}

.sm-frame .sm-toc-num {
    flex: none;
    min-width: 1.5em;
    opacity: 0.55;
    font-variant-numeric: tabular-nums;
}

@media (max-width: 600px) {
    .sm-frame.sm-inset-bottom-right .sm-nav,
    .sm-frame.sm-inset-bottom-right .sm-toc {
        left: 12px;
        transform: none;
    }

    .sm-frame.sm-inset-bottom-left .sm-nav,
    .sm-frame.sm-inset-bottom-left .sm-toc {
        left: auto;
        right: 12px;
        transform: none;
    }
}

@media print {
    .sm-frame .sm-progress,
    .sm-frame .sm-nav,
    .sm-frame .sm-toc {
        display: none;
    }
}
`;

    /* ---------- Outils ---------- */

    function deepFreeze(o) {
        Object.freeze(o);
        Object.keys(o).forEach(k => { if (o[k] && typeof o[k] === 'object' && !Object.isFrozen(o[k])) deepFreeze(o[k]); });
        return o;
    }

    const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
    const isNum = v => typeof v === 'number' && isFinite(v);
    const obj = v => (isObj(v) ? v : {});
    const list = v => (Array.isArray(v) ? v : []);

    /* ---------- Storymap complète (valeurs par défaut appliquées) ---------- */

    function expandChapter(ch) {
        const c = obj(ch);
        const layers = obj(c.layers);
        return Object.assign({}, DEFAULTS.chapter, c, {
            view: Object.assign({}, DEFAULTS.view, obj(c.view)),
            transition: Object.assign({}, DEFAULTS.transition, obj(c.transition)),
            layers: { enter: list(layers.enter), exit: list(layers.exit) }
        });
    }

    /**
     * Calque de données : style complet ; chapters absent = affiché dans tous
     * les chapitres ; connect : points reliés dans l'ordre ; progressive :
     * lignes dessinées au fil des chapitres.
     */
    function expandData(d) {
        return Object.assign({}, d, {
            style: Object.assign({}, DEFAULTS.dataStyle, obj(d.style)),
            connect: d.connect === true,
            progressive: d.progressive === true
        });
    }

    /** Complète une storymap (format 2, éventuellement abrégé) avec les valeurs par défaut. */
    function expand(story) {
        const s = obj(story);
        return {
            title: s.title || '',
            subtitle: s.subtitle || '',
            byline: s.byline || '',
            style: s.style || DEFAULTS.style,
            theme: s.theme === 'light' ? 'light' : 'dark',
            panels: Object.assign({}, DEFAULTS.panels, obj(s.panels)),
            marker: Object.assign({}, DEFAULTS.marker, obj(s.marker)),
            route: Object.assign({}, DEFAULTS.route, obj(s.route)),
            inset: Object.assign({}, DEFAULTS.inset, obj(s.inset)),
            terrain: Object.assign({}, DEFAULTS.terrain, obj(s.terrain)),
            data: list(s.data).filter(isObj).map(expandData),
            autoplay: s.autoplay === true,
            autoplayDelay: isNum(s.autoplayDelay) ? s.autoplayDelay : DEFAULTS.autoplayDelay,
            keyboard: s.keyboard !== false,
            navigation: s.navigation !== false,
            reveal: REVEALS.indexOf(s.reveal) >= 0 ? s.reveal : DEFAULTS.reveal,
            share: Object.assign({}, DEFAULTS.share, obj(s.share)),
            chapters: list(s.chapters).map(expandChapter),
            footer: s.footer || ''
        };
    }

    /* ---------- Apparence : variables CSS ---------- */

    const VAR_NAMES = ['--sm-panel-alpha', '--sm-text-size', '--sm-pad-y', '--sm-pad-x', '--sm-title-size',
        '--sm-title-align', '--sm-line-height', '--sm-text-align', '--sm-font', '--sm-title-font'];

    /**
     * Variables CSS correspondant aux réglages des panneaux.
     * fonts = { text, title } : piles de polices CSS déjà résolues (ou vides).
     */
    function cssVars(panels, fonts) {
        const p = Object.assign({}, DEFAULTS.panels, obj(panels));
        const f = obj(fonts);
        const v = {};
        if (isNum(p.opacity)) v['--sm-panel-alpha'] = String(Math.max(0, Math.min(1, p.opacity)));
        if (isNum(p.textSize)) v['--sm-text-size'] = p.textSize + 'px';
        if (isNum(p.paddingY)) v['--sm-pad-y'] = p.paddingY + 'px';
        if (isNum(p.paddingX)) v['--sm-pad-x'] = p.paddingX + 'px';
        if (isNum(p.titleSize)) v['--sm-title-size'] = p.titleSize + 'px';
        if (p.titleAlign === 'center' || p.titleAlign === 'right') v['--sm-title-align'] = p.titleAlign;
        if (isNum(p.lineHeight)) v['--sm-line-height'] = String(p.lineHeight);
        if (p.textAlign === 'center' || p.textAlign === 'right' || p.textAlign === 'justify') v['--sm-text-align'] = p.textAlign;
        if (f.text) v['--sm-font'] = f.text;
        if (f.title) v['--sm-title-font'] = f.title;
        return v;
    }

    /* ---------- Carte : marqueur, relief, couches, déplacements ---------- */

    function markerElement(icon, color, size) {
        const el = document.createElement('div');
        el.className = 'sm-marker';
        el.style.cssText = 'width:' + size + 'px;height:' + size + 'px;line-height:0;filter:drop-shadow(0 1px 2px rgba(0,0,0,.45))';
        el.style.color = color || DEFAULTS.marker.color;
        el.innerHTML = icon;
        const s = el.querySelector('svg');
        if (s) {
            s.setAttribute('width', size);
            s.setAttribute('height', size);
            s.style.display = 'block';
        }
        return el;
    }

    /**
     * Marqueur des chapitres (icône, taille, couleur). Avec le relief 3D,
     * MapLibre estomperait un marqueur qu'il croit caché par le terrain :
     * il reste toujours pleinement visible.
     */
    function createMarker(lib, marker) {
        const m = Object.assign({}, DEFAULTS.marker, obj(marker));
        const icon = ICONS[m.icon] || ICONS.pin;
        const size = isNum(m.size) ? Math.max(8, Math.min(160, m.size)) : icon.size;
        const options = icon.svg
            ? { element: markerElement(icon.svg, m.color, size), anchor: icon.anchor }
            : { color: m.color, scale: size / ICONS.pin.size };
        options.opacity = '1';
        options.opacityWhenCovered = '1';
        return new lib.Marker(options);
    }

    /** Marqueur affiché sur ce chapitre ? (marker: false : vue d'ensemble, sans marqueur ni point sur la mini-carte) */
    const markerShown = chapter => obj(chapter).marker !== false;

    /** Montre ou masque un marqueur MapLibre (marqueur du chapitre, point de la mini-carte). */
    function showMarker(m, visible) {
        if (m) m.getElement().style.visibility = visible ? '' : 'hidden';
    }

    const TERRAIN_SOURCE = 'sm-terrain';

    /** Active, met à jour ou retire le relief 3D (à appeler une fois le style chargé). */
    function setTerrain(map, terrain) {
        const t = Object.assign({}, DEFAULTS.terrain, obj(terrain));
        const source = map.getSource(TERRAIN_SOURCE);
        if (!t.show || !t.source) {
            if (map.getTerrain && map.getTerrain()) map.setTerrain(null);
            if (source) map.removeSource(TERRAIN_SOURCE);
            return;
        }
        if (source && source.url !== t.source) {
            map.setTerrain(null);
            map.removeSource(TERRAIN_SOURCE);
        }
        if (!map.getSource(TERRAIN_SOURCE)) map.addSource(TERRAIN_SOURCE, { type: 'raster-dem', url: t.source, tileSize: 256 });
        map.setTerrain({ source: TERRAIN_SOURCE, exaggeration: isNum(t.exaggeration) ? t.exaggeration : DEFAULTS.terrain.exaggeration });
    }

    /** Applique une règle de couche { layer, opacity, duration }. Faux si la couche est absente. */
    function setLayerOpacity(map, rule, instant) {
        const layer = rule && rule.layer ? map.getLayer(rule.layer) : null;
        const props = layer ? LAYER_TYPES[layer.type] : null;
        if (!props) return false;
        props.forEach(p => {
            try {
                map.setPaintProperty(rule.layer, p + '-transition', { duration: instant ? 0 : (rule.duration || 0), delay: 0 });
                map.setPaintProperty(rule.layer, p, rule.opacity);
            } catch (e) { /* propriété non applicable à cette couche */ }
        });
        return true;
    }

    /** Déplacement vers un chapitre : { type: 'flyTo' | 'easeTo' | 'jumpTo', options }. */
    function camera(chapter) {
        const c = obj(chapter);
        const v = Object.assign({}, DEFAULTS.view, obj(c.view));
        const t = obj(c.transition);
        const type = TRANSITIONS.indexOf(t.type) >= 0 ? t.type : DEFAULTS.transition.type;
        const options = { center: v.center, zoom: v.zoom, pitch: v.pitch || 0, bearing: v.bearing || 0 };
        if (type === 'flyTo') {
            if (isNum(t.speed)) options.speed = t.speed;
            if (isNum(t.curve)) options.curve = t.curve;
        } else if (type === 'easeTo' && isNum(t.duration)) {
            options.duration = t.duration;
        }
        return { type, options };
    }

    function move(map, chapter) {
        const c = camera(chapter);
        map[c.type](c.options);
    }

    /* ---------- Calques de données de l'auteur : tracés, zones, points ---------- */

    const DATA_PREFIX = 'sm-data-';
    const DATA_FADE = 600;   // ms : fondu d'un calque à l'arrivée sur un chapitre
    // Noms des points sur un fond de carte sans polices (images satellite) : polices d'OpenFreeMap
    const DATA_GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
    const DATA_FONT = ['Noto Sans Bold'];
    const POINTS = ['Point', 'MultiPoint'];
    const LINES = ['LineString', 'MultiLineString'];
    const POLYGONS = ['Polygon', 'MultiPolygon'];
    const geometryIs = (types, not) => ['match', ['geometry-type'], types.slice(), !not, !!not];
    const dataApplied = new WeakMap();   // carte → { couche: { data, show, paint, layout } }
    const dataSources = new WeakMap();   // carte → { source: GeoJSON affiché }
    const dataTimers = new WeakMap();    // carte → { couche: masquage en fin de fondu }

    /** Le calque est-il affiché dans ce chapitre ? (chapters absent : dans tous) */
    function dataShown(data, chapterId) {
        return !Array.isArray(data.chapters) || data.chapters.indexOf(chapterId) >= 0;
    }

    const kindsCache = new WeakMap();

    /** Géométries présentes dans un calque : points, lignes, surfaces, points nommés, couleurs d'origine. */
    function dataKinds(fc) {
        if (kindsCache.has(fc)) return kindsCache.get(fc);
        const k = { points: false, lines: false, polygons: false, named: false, colored: false };
        list(fc.features).forEach(f => {
            const type = f && f.geometry && f.geometry.type;
            const p = f && f.properties;
            if (p && (typeof p.stroke === 'string' || typeof p.fill === 'string' || typeof p['marker-color'] === 'string')) k.colored = true;
            if (POINTS.indexOf(type) >= 0) {
                k.points = true;
                if (f.properties && f.properties.name) k.named = true;
            } else if (LINES.indexOf(type) >= 0) k.lines = true;
            else if (POLYGONS.indexOf(type) >= 0) k.polygons = true;
        });
        kindsCache.set(fc, k);
        return k;
    }

    /* ---------- Points reliés dans l'ordre ---------- */

    const shapeCache = new WeakMap();   // GeoJSON → GeoJSON complété de la ligne qui relie ses points

    /** Positions des points d'un calque, dans l'ordre du fichier. */
    function dataPoints(fc) {
        const out = [];
        list(fc.features).forEach(f => {
            const g = f && f.geometry;
            if (g && g.type === 'Point') out.push(g.coordinates);
            else if (g && g.type === 'MultiPoint') list(g.coordinates).forEach(p => out.push(p));
        });
        return out.filter(p => Array.isArray(p) && isNum(p[0]) && isNum(p[1]));
    }

    /**
     * Arc de grand cercle de a à b : le plus court chemin sur le globe (une
     * courbe sur la carte, comme un trajet en avion), en segments d'environ
     * 100 km ; ligne droite entre des points proches.
     */
    function greatArc(a, b) {
        const r = Math.PI / 180;
        const l1 = a[0] * r, p1 = a[1] * r, l2 = b[0] * r, p2 = b[1] * r;
        const h = Math.pow(Math.sin((p2 - p1) / 2), 2) + Math.cos(p1) * Math.cos(p2) * Math.pow(Math.sin((l2 - l1) / 2), 2);
        const d = 2 * Math.asin(Math.min(1, Math.sqrt(h)));
        const n = Math.min(128, Math.ceil(d * 6371 / 100));
        if (n < 2 || Math.PI - d < 1e-6) return [[a[0], a[1]], [b[0], b[1]]];
        const out = [];
        for (let i = 0; i <= n; i++) {
            const A = Math.sin((1 - i / n) * d) / Math.sin(d);
            const B = Math.sin(i / n * d) / Math.sin(d);
            const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
            const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
            const z = A * Math.sin(p1) + B * Math.sin(p2);
            out.push([Math.atan2(y, x) / r, Math.atan2(z, Math.sqrt(x * x + y * y)) / r]);
        }
        out[0] = [a[0], a[1]];
        out[n] = [b[0], b[1]];
        return out;
    }

    /**
     * Ligne qui relie des positions dans l'ordre : arcs de grand cercle mis bout
     * à bout. Ses longitudes se suivent : un trajet qui traverse l'antiméridien
     * (Pacifique) n'est pas coupé. at : indice de chaque position dans la ligne.
     */
    function joinLine(pts) {
        const line = [];
        const at = [0];
        for (let i = 1; i < pts.length; i++) {
            const arc = greatArc(pts[i - 1], pts[i]);
            (i === 1 ? arc : arc.slice(1)).forEach(p => line.push(p));
            at.push(line.length - 1);
        }
        for (let i = 1; i < line.length; i++) {
            let lng = line[i][0];
            while (lng - line[i - 1][0] > 180) lng -= 360;
            while (lng - line[i - 1][0] < -180) lng += 360;
            line[i] = [lng, line[i][1]];
        }
        return { coords: line, at };
    }

    /** Géométries affichées d'un calque : celles du fichier, plus (connect) la ligne qui relie ses points dans l'ordre. */
    function dataShape(data) {
        const fc = data.geojson;
        if (data.connect !== true || !isObj(fc)) return fc;
        if (shapeCache.has(fc)) return shapeCache.get(fc);
        const pts = dataPoints(fc);
        let shape = fc;
        if (pts.length >= 2) {
            const line = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: joinLine(pts).coords } };
            shape = { type: 'FeatureCollection', features: list(fc.features).concat([line]) };
        }
        shapeCache.set(fc, shape);
        return shape;
    }

    /* ---------- Trajet entre les marqueurs des chapitres ---------- */

    const ROUTE_ID = '_route';       // calque dérivé des chapitres (identifiant réservé)
    const routeCache = new Map();    // étapes et réglages → calque du trajet (même objet tant que rien ne change)

    /**
     * Trajet entre les marqueurs des chapitres (réglage route de la storymap) :
     * calque dérivé des chapitres, une ligne d'un marqueur au suivant (droite
     * entre des lieux proches, arc de grand cercle sur les longues distances),
     * dessinée au fil du récit (progressive). Les chapitres « route: false »
     * (vues d'ensemble…) n'en sont pas des étapes. override = { index, center } :
     * centre provisoire d'un chapitre (carte déplacée dans l'éditeur).
     * @returns {object|null} calque (null : pas de trajet, ou moins de deux étapes)
     */
    function routeData(story, override) {
        const s = obj(story);
        const r = Object.assign({}, DEFAULTS.route, obj(s.route));
        if (r.show !== true) return null;
        const stops = [];    // chapitres étapes
        const points = [];   // leurs marqueurs
        list(s.chapters).forEach((c, i) => {
            if (obj(c).route === false) return;
            const own = override && override.index === i ? override.center : obj(obj(c).view).center;
            if (Array.isArray(own) && isNum(own[0]) && isNum(own[1])) {
                stops.push(i);
                points.push([own[0], own[1]]);
            }
        });
        if (points.length < 2) return null;
        const style = {
            color: typeof r.color === 'string' && r.color ? r.color : obj(s.marker).color || DEFAULTS.marker.color,
            width: isNum(r.width) ? r.width : DEFAULTS.route.width,
            opacity: isNum(r.opacity) ? r.opacity : DEFAULTS.route.opacity,
            dash: r.dash === true,
            ghost: r.ghost !== false,
            labels: false
        };
        const progressive = r.progressive !== false;
        const key = JSON.stringify([stops, points, style, progressive]);
        if (routeCache.has(key)) return routeCache.get(key);
        const join = joinLine(points);
        const geojson = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: join.coords } }] };
        // Part du trajet parcourue à chaque étape
        const path = tracePath(geojson);
        const cum = path.parts.length ? path.parts[0].cum : null;
        const data = {
            id: ROUTE_ID, route: true, style, progressive, geojson,
            stops, stopAt: join.at.map(k => (cum && path.total ? cum[k] / path.total : 0))
        };
        if (routeCache.size > 40) routeCache.clear();
        routeCache.set(key, data);
        return data;
    }

    /** Police des noms de points : celle des libellés du fond de carte (donc disponible), droite et grasse de préférence. */
    function dataFont(map) {
        const style = map.getStyle() || {};
        let found = null;
        let best = -1;
        for (const l of style.layers || []) {
            if (l.type !== 'symbol' || !l.layout || l.id.indexOf(DATA_PREFIX) === 0) continue;
            let f = l.layout['text-font'];
            if (Array.isArray(f) && f[0] === 'literal') f = f[1];
            if (!Array.isArray(f) || !f.length || !f.every(x => typeof x === 'string')) continue;
            const score = (/italic|oblique/i.test(f[0]) ? 0 : 2) + (/bold|semibold|medium/i.test(f[0]) ? 1 : 0);
            if (score > best) {
                found = f;
                best = score;
                if (score === 3) break;
            }
        }
        if (found) return found;
        if (style.glyphs === DATA_GLYPHS) return DATA_FONT.slice();
        if (style.glyphs || typeof map.setGlyphs !== 'function') return null;
        map.setGlyphs(DATA_GLYPHS);
        return DATA_FONT.slice();
    }

    /** Calque dont les lignes se dessinent au fil des chapitres. */
    const isTraced = data => data.progressive === true && isObj(data.geojson) && dataKinds(dataShape(data)).lines;

    /* ---------- Icônes d'origine des points (KML) ---------- */

    // Table « icons » des données : { clé: { src : PNG de 64 px en data URL, offset : [dx, dy]
    // en pixels (point d'ancrage), scale } } ; chaque point désigne son icône (propriété icon).
    const ICON_SRC = /^data:image\/(png|jpeg|gif|webp);base64,/i;
    const iconDecoded = new Map();     // data URL → Promise<image | null>, partagé entre cartes
    const iconPending = new WeakMap(); // carte → noms d'images en cours d'ajout
    const lastSync = new WeakMap();    // carte → { datasets, chapterId } : nouvelle synchronisation après chargement

    const iconName = (data, key) => DATA_PREFIX + 'icon-' + data.id + '-' + key;

    /** Clés des icônes utilisables d'un calque (réglage « Icônes du fichier » actif). */
    function iconKeys(data) {
        const icons = obj(data.geojson).icons;
        if (obj(data.style).fileIcons === false || !isObj(icons)) return [];
        return Object.keys(icons).filter(k => isObj(icons[k]) && typeof icons[k].src === 'string' && ICON_SRC.test(icons[k].src));
    }

    function decodeIcon(src) {
        if (!iconDecoded.has(src)) {
            iconDecoded.set(src, new Promise(resolve => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
                img.src = src;
            }));
        }
        return iconDecoded.get(src);
    }

    /**
     * Icônes d'un calque présentes sur la carte ? Sinon, elles sont chargées puis
     * les calques resynchronisés (les points gardent leur cercle en attendant ;
     * une icône illisible reste un cercle).
     */
    function iconsReady(map, data, keys) {
        const missing = keys.filter(k => !map.hasImage(iconName(data, k)));
        if (!missing.length) return true;
        const pending = iconPending.get(map) || new Set();
        iconPending.set(map, pending);
        const todo = missing.filter(k => !pending.has(iconName(data, k)));
        if (todo.length) {
            todo.forEach(k => pending.add(iconName(data, k)));
            Promise.all(todo.map(k => decodeIcon(data.geojson.icons[k].src).then(img => {
                const name = iconName(data, k);
                pending.delete(name);
                if (!img) return false;
                try {
                    if (map.style && !map.hasImage(name)) map.addImage(name, img, { pixelRatio: 2 });
                    return true;
                } catch (e) { return false; }
            }))).then(added => {
                // Filtres et tailles mis à jour sans recréer les couches (fondus et tracés en cours continuent)
                const last = lastSync.get(map);
                if (added.some(Boolean) && last) {
                    try { syncData(map, last.datasets, last.chapterId, undefined, true); } catch (e) { /* carte fermée */ }
                }
            });
        }
        return false;
    }

    /** Clés dont l'image est prête (décodée sans erreur) : les autres points gardent un cercle. */
    function readyIcons(map, data, keys) {
        return keys.filter(k => map.hasImage(iconName(data, k)));
    }

    /**
     * Couches MapLibre d'un calque de données (selon ses géométries) : surfaces,
     * contours, liseré et lignes sous les libellés du fond de carte, points,
     * icônes et noms au-dessus (top), comme les lignes qui relient des points et
     * le trajet entre les marqueurs. show : opacités du calque affiché (0 s'il
     * est masqué). Dessin progressif : les lignes viennent de la source « -trace »
     * (partie déjà parcourue) ; le parcours complet peut rester visible en transparence.
     * icons : clés des icônes d'origine déjà sur la carte (la couche des icônes
     * existe dès que le calque en a : leur chargement ne change que ses filtres).
     */
    function dataLayers(data, font, icons) {
        const s = Object.assign({}, DEFAULTS.dataStyle, obj(data.style));
        const source = DATA_PREFIX + data.id;
        const drawn = isTraced(data) ? source + '-trace' : source;
        const o = isNum(s.opacity) ? Math.max(0, Math.min(1, s.opacity)) : 1;
        const k = dataKinds(dataShape(data));
        const fileIcons = iconKeys(data);
        const keys = list(icons).filter(key => fileIcons.indexOf(key) >= 0);
        const table = obj(obj(data.geojson).icons);
        const hasIcons = keys.length > 0;
        const withIcon = () => ['match', ['get', 'icon'], keys.slice(), true, false];
        const size = s.radius / 6;   // « Taille des points » : 6 px = icône à sa taille d'origine (32 px)
        const perIcon = (fn, fallback) => (hasIcons ? ['match', ['get', 'icon']].concat(...keys.map(key => [key, fn(table[key])]), [fallback]) : fallback);
        // Couleurs d'origine de chaque élément (sinon celle du calque) ; « none » : absent (transparent).
        // Les opacités restent celles du calque : les fondus entre chapitres ne changent pas.
        const own = s.fileColors !== false && k.colored;
        const colorOf = (...keys) => (own
            ? ['case', ['==', ['get', keys[0]], 'none'], 'rgba(0,0,0,0)', ['to-color'].concat(keys.map(key => ['get', key]), [s.color])]
            : s.color);
        const lineLayout = () => ({ 'line-join': 'round', 'line-cap': s.dash ? 'butt' : 'round' });
        const linePaint = () => Object.assign({ 'line-color': colorOf('stroke'), 'line-width': s.width }, s.dash ? { 'line-dasharray': [2, 1.6] } : {});
        // Points reliés et trajet entre les marqueurs : lignes au-dessus de tout le fond de carte, noms de lieux compris
        const above = data.connect === true || data.route === true;
        const out = [];
        if (k.polygons) {
            out.push({
                id: source + '-fill', type: 'fill', source, filter: geometryIs(POLYGONS),
                paint: { 'fill-color': colorOf('fill', 'stroke') }, show: { 'fill-opacity': s.fillOpacity * o }
            }, {
                id: source + '-outline', type: 'line', source, filter: geometryIs(POLYGONS),
                layout: lineLayout(), paint: linePaint(), show: { 'line-opacity': o }
            });
        }
        if (k.lines) {
            if (drawn !== source && s.ghost) {
                out.push({
                    id: source + '-ghost', type: 'line', source, filter: geometryIs(LINES), top: above,
                    layout: lineLayout(), paint: linePaint(), show: { 'line-opacity': 0.3 * o }
                });
            }
            out.push({
                id: source + '-casing', type: 'line', source: drawn, filter: geometryIs(LINES), top: above,
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: { 'line-color': '#ffffff', 'line-width': s.width + 3 }, show: { 'line-opacity': 0.8 * o }
            }, {
                id: source + '-line', type: 'line', source: drawn, filter: geometryIs(LINES), top: above,
                layout: lineLayout(), paint: linePaint(), show: { 'line-opacity': o }
            });
        }
        if (k.points) {
            // Cercles : points sans icône d'origine disponible
            out.push({
                id: source + '-point', type: 'circle', source, top: true,
                filter: hasIcons ? ['all', geometryIs(POINTS), ['!', withIcon()]] : geometryIs(POINTS),
                paint: { 'circle-color': colorOf('marker-color'), 'circle-radius': s.radius, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': s.radius >= 4 ? 2 : 1 },
                show: { 'circle-opacity': o, 'circle-stroke-opacity': o }
            });
        }
        // Échelle et décalage (point d'ancrage) d'une icône ; valeurs invalides ignorées
        const scaleOf = t => (isNum(t.scale) && t.scale > 0 ? Math.min(10, t.scale) : 1);
        const offsetOf = t => (Array.isArray(t.offset) && t.offset.length === 2 && t.offset.every(isNum) ? t.offset.slice() : [0, 0]);
        if (k.points && fileIcons.length) {
            // Icônes d'origine : taille (échelle du fichier × taille des points), décalage qui
            // pose leur point d'ancrage sur le lieu (multiplié par la taille de l'icône)
            const layout = {
                'icon-image': ['concat', DATA_PREFIX + 'icon-' + data.id + '-', ['get', 'icon']],
                'icon-size': keys.some(key => scaleOf(table[key]) !== 1) ? perIcon(t => Math.round(scaleOf(t) * size * 1000) / 1000, size) : size,
                'icon-allow-overlap': true,
                'icon-ignore-placement': true
            };
            if (keys.some(key => offsetOf(table[key]).some(Boolean))) layout['icon-offset'] = perIcon(t => ['literal', offsetOf(t)], ['literal', [0, 0]]);
            out.push({
                id: source + '-icon', type: 'symbol', source, filter: hasIcons ? ['all', geometryIs(POINTS), withIcon()] : false, top: true,
                layout, paint: {}, show: { 'icon-opacity': o }
            });
        }
        if (s.labels && font && k.named) {
            // Noms sous les points, ou sous le bas de leur icône (32 px à la taille d'origine, décalée ou non)
            const below = [0, s.radius / 13 + 0.3];
            const underIcon = t => {
                const bottom = (offsetOf(t)[1] + 16) * scaleOf(t) * size;
                return ['literal', [0, Math.round((Math.max(0, bottom) + 3) / 13 * 100) / 100]];
            };
            out.push({
                id: source + '-label', type: 'symbol', source, filter: ['all', geometryIs(POINTS), ['has', 'name']], top: true,
                layout: {
                    'text-field': ['get', 'name'], 'text-font': font, 'text-size': 13, 'text-anchor': 'top', 'text-max-width': 9,
                    'text-offset': perIcon(underIcon, hasIcons ? ['literal', below] : below)
                },
                paint: { 'text-color': '#1f2328', 'text-halo-color': '#ffffff', 'text-halo-width': 1.6 },
                show: { 'text-opacity': o }
            });
        }
        out.forEach(l => { l.data = data.id; });
        return out;
    }

    /* ---------- Dessin progressif des tracés ---------- */

    const TRACE_DURATION = 1500;          // ms : dessin sans déplacement de la carte (même cadrage, saut)
    const pathCache = new WeakMap();      // GeoJSON → parcours
    const traceDrawn = new WeakMap();     // carte → { calque: fraction dessinée }
    const traceShapes = new WeakMap();    // carte → { calque: géométries dont la partie dessinée est affichée }
    const traceAnims = new WeakMap();     // carte → animation en cours

    const clamp01 = v => Math.max(0, Math.min(1, v));

    /** Écart de longitude ramené entre -180° et 180° (antiméridien). */
    const dLng = v => ((v % 360) + 540) % 360 - 180;

    /** Distance approchée en mètres entre deux positions [lng, lat] proches. */
    function meters(a, b) {
        const dx = dLng(b[0] - a[0]) * Math.cos((a[1] + b[1]) * Math.PI / 360) * 111320;
        const dy = (b[1] - a[1]) * 110574;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /** Coordonnées Web Mercator (0 à 1) : le centre de la carte s'y déplace en ligne droite. */
    function mercator(p) {
        const lat = Math.max(-85.05, Math.min(85.05, p[1])) * Math.PI / 180;
        return [(p[0] + 180) / 360, (1 - Math.log(Math.tan(Math.PI / 4 + lat / 2)) / Math.PI) / 2];
    }

    /**
     * Parcours d'un calque : ses lignes mises bout à bout, dans l'ordre du
     * fichier, avec les distances cumulées (en mètres, sauts entre lignes exclus).
     */
    function tracePath(fc) {
        if (pathCache.has(fc)) return pathCache.get(fc);
        const parts = [];
        let total = 0;
        list(fc.features).forEach(f => {
            const g = f && f.geometry;
            const lines = !g ? [] : g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : [];
            list(lines).forEach(coords => {
                if (!Array.isArray(coords) || coords.length < 2) return;
                const cum = new Float64Array(coords.length);
                cum[0] = total;
                for (let i = 1; i < coords.length; i++) {
                    total += meters(coords[i - 1], coords[i]);
                    cum[i] = total;
                }
                parts.push({ coords, cum, props: obj(f.properties) }); // couleurs d'origine de la ligne
            });
        });
        const path = { parts, total };
        pathCache.set(fc, path);
        return path;
    }

    /** Partie du parcours dessinée jusqu'à la fraction f (0 à 1), en GeoJSON. */
    function sliceTrace(path, f) {
        const features = [];
        const d = clamp01(f) * path.total;
        for (const p of path.parts) {
            const last = p.cum.length - 1;
            let coords;
            if (f >= 1 || d >= p.cum[last]) coords = p.coords;
            else if (d <= p.cum[0]) break;
            else {
                // Dernier point atteint (recherche dichotomique), puis point intermédiaire
                let lo = 0;
                let hi = last;
                while (hi - lo > 1) {
                    const mid = (lo + hi) >> 1;
                    if (p.cum[mid] <= d) lo = mid; else hi = mid;
                }
                const a = p.coords[lo];
                const b = p.coords[hi];
                const t = (d - p.cum[lo]) / ((p.cum[hi] - p.cum[lo]) || 1);
                coords = p.coords.slice(0, lo + 1);
                coords.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
            }
            features.push({ type: 'Feature', properties: p.props, geometry: { type: 'LineString', coordinates: coords } });
        }
        return { type: 'FeatureCollection', features };
    }

    /** Point du parcours à la fraction f. */
    function pointAt(path, f) {
        const d = clamp01(f) * path.total;
        for (const p of path.parts) {
            const last = p.cum.length - 1;
            if (d > p.cum[last]) continue;
            if (d <= p.cum[0]) return p.coords[0];
            let lo = 0;
            let hi = last;
            while (hi - lo > 1) {
                const mid = (lo + hi) >> 1;
                if (p.cum[mid] <= d) lo = mid; else hi = mid;
            }
            const a = p.coords[lo];
            const b = p.coords[hi];
            const t = (d - p.cum[lo]) / ((p.cum[hi] - p.cum[lo]) || 1);
            return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        }
        const end = path.parts[path.parts.length - 1];
        return end ? end.coords[end.coords.length - 1] : null;
    }

    const passCache = new WeakMap();      // parcours → Map(« lng,lat » → passages)

    /**
     * Passages du parcours près d'un marqueur : suites de segments proches (au
     * plus min + max(100 m, min, 1 % du parcours)), avec la fraction du point
     * le plus proche de chacune ; min : distance du marqueur au parcours (m).
     */
    function tracePasses(path, center) {
        let cache = passCache.get(path);
        if (!cache) passCache.set(path, cache = new Map());
        const key = center[0] + ',' + center[1];
        if (cache.has(key)) return cache.get(key);
        const k = Math.cos(center[1] * Math.PI / 180) * 111320;
        const dist = [];
        const pos = [];
        let min = Infinity;
        for (const p of path.parts) {
            for (let i = 1; i < p.coords.length; i++) {
                const ax = dLng(p.coords[i - 1][0] - center[0]) * k;
                const ay = (p.coords[i - 1][1] - center[1]) * 110574;
                const dx = dLng(p.coords[i][0] - p.coords[i - 1][0]) * k;
                const dy = (p.coords[i][1] - center[1]) * 110574 - ay;
                const len2 = dx * dx + dy * dy;
                const t = len2 ? clamp01(-(ax * dx + ay * dy) / len2) : 0;
                const x = ax + dx * t;
                const y = ay + dy * t;
                const d = Math.sqrt(x * x + y * y);
                dist.push(d);
                pos.push((p.cum[i - 1] + (p.cum[i] - p.cum[i - 1]) * t) / path.total);
                if (d < min) min = d;
            }
        }
        const limit = min + Math.max(100, min, 0.01 * path.total);
        const passes = [];
        let run = null;
        for (let j = 0; j < dist.length; j++) {
            if (dist[j] <= limit) {
                if (!run || dist[j] < run.d) run = { d: dist[j], pos: pos[j] };
            } else if (run) {
                passes.push(run.pos);
                run = null;
            }
        }
        if (run) passes.push(run.pos);
        const res = { min, passes };
        if (cache.size > 500) cache.clear();
        cache.set(key, res);
        return res;
    }

    /**
     * Chapitres consécutifs sans réglage (a à b - 1) : fractions croissantes, au
     * moins égales à `lower`, qui amènent au mieux le bout du tracé au marqueur
     * de chaque chapitre. L'écart est compté en pixels au zoom du chapitre : une
     * vue d'ensemble s'accommode de quelques kilomètres, un chapitre zoomé non.
     * Un tracé qui dépasse le marqueur gêne moins qu'un tracé qui ne l'atteint
     * pas. Les chapitres loin du tracé (ou qui le masquent) gardent l'état précédent.
     */
    function solveRun(path, data, chs, a, b, lower, out) {
        const far = Math.max(0.1 * path.total, 500);
        const rows = [];
        const states = [lower];
        for (let c = a; c < b; c++) {
            const view = obj(chs[c].view);
            const center = Array.isArray(view.center) ? view.center : null;
            let near = center && path.total && dataShown(data, chs[c].id) ? tracePasses(path, center) : null;
            if (near && near.min > far) near = null;
            if (near) near.passes.forEach(p => { if (p > lower) states.push(p); });
            rows.push(near ? { center, passes: near.passes, scale: Math.pow(2, isNum(view.zoom) ? view.zoom : 0) / Math.max(0.05, Math.cos(center[1] * Math.PI / 180)) } : null);
        }
        const S = Array.from(new Set(states)).sort((x, y) => x - y);
        const pts = S.map(s => pointAt(path, s));
        // Écart (pixels) entre le bout du tracé à la position S[k] et le marqueur du chapitre
        const cost = (row, k) => {
            if (!row || !pts[k]) return 0;
            let nearest = row.passes[0];
            row.passes.forEach(p => { if (Math.abs(p - S[k]) < Math.abs(nearest - S[k])) nearest = p; });
            return meters(row.center, pts[k]) * row.scale * (S[k] > nearest ? 0.5 : 1);
        };
        // Programmation dynamique : chapitre par chapitre, meilleur coût pour chaque position
        const choices = [];
        let dp = null;
        rows.forEach(row => {
            const cur = new Float64Array(S.length);
            const arg = new Int32Array(S.length);
            let best = Infinity;
            let bestK = 0;
            for (let k = 0; k < S.length; k++) {
                if (dp && dp[k] < best - 1e-9) { best = dp[k]; bestK = k; }
                cur[k] = (dp ? best : 0) + cost(row, k);
                arg[k] = bestK;
            }
            choices.push(arg);
            dp = cur;
        });
        if (!dp) return;
        let k = 0;
        for (let x = 1; x < S.length; x++) if (dp[x] < dp[k] - 1e-9) k = x;
        for (let r = rows.length - 1; r >= 0; r--) {
            out[a + r] = S[k];
            k = choices[r][k];
        }
    }

    /**
     * Fractions dessinées d'un calque à chaque chapitre : réglage du chapitre
     * (progress[id]), sinon calcul automatique. Le tracé n'avance jamais en
     * arrière de lui-même ; un réglage peut le faire reculer (il sert alors de
     * départ aux chapitres suivants). skip : chapitre dont le réglage est ignoré.
     */
    function traceTargets(data, chapters, skip) {
        if (data.route === true) return routeTargets(data, chapters);
        const path = tracePath(dataShape(data));
        const chs = list(chapters).map(obj);
        const own = i => (i !== skip ? obj(chs[i].progress)[data.id] : undefined);
        const out = chs.map(() => 0);
        let lower = 0;
        let i = 0;
        while (i < chs.length) {
            if (isNum(own(i))) {
                out[i] = lower = clamp01(own(i));
                i++;
                continue;
            }
            let j = i;
            while (j < chs.length && !isNum(own(j))) j++;
            solveRun(path, data, chs, i, j, lower, out);
            i = j;
        }
        return out;
    }

    /** Trajet entre les marqueurs : dessiné jusqu'à la dernière étape atteinte (rien avant la première). */
    function routeTargets(data, chapters) {
        const out = [];
        let f = 0;
        let k = 0;
        list(chapters).forEach((c, i) => {
            while (k < data.stops.length && data.stops[k] <= i) f = data.stopAt[k++];
            out.push(f);
        });
        return out;
    }

    /**
     * Fractions dessinées des calques progressifs au chapitre index (-1 : rien).
     * center : centre provisoire du chapitre (carte déplacée dans l'éditeur).
     */
    function traceProgress(datasets, chapters, index, center) {
        let chs = list(chapters);
        if (center && chs[index]) {
            chs = chs.slice();
            chs[index] = Object.assign({}, chs[index], { view: Object.assign({}, obj(chs[index].view), { center }) });
        }
        const out = {};
        list(datasets).forEach(d => {
            if (!isObj(d) || !isTraced(d)) return;
            out[d.id] = index < 0 ? 0 : (traceTargets(d, chs)[index] || 0);
        });
        return out;
    }

    /** Dessine immédiatement les tracés jusqu'aux fractions indiquées ({ calque: fraction }). */
    function drawTraces(map, datasets, progress) {
        const drawn = traceDrawn.get(map) || {};
        traceDrawn.set(map, drawn);
        const shapes = traceShapes.get(map) || {};
        traceShapes.set(map, shapes);
        list(datasets).forEach(d => {
            if (!isObj(d) || !isTraced(d) || !isNum(obj(progress)[d.id])) return;
            const src = map.getSource(DATA_PREFIX + d.id + '-trace');
            const f = clamp01(progress[d.id]);
            const shape = dataShape(d);
            // Même fraction du même tracé : rien à redessiner (le trajet se déforme quand un marqueur bouge)
            if (!src || (drawn[d.id] === f && shapes[d.id] === shape)) return;
            drawn[d.id] = f;
            shapes[d.id] = shape;
            src.setData(sliceTrace(tracePath(shape), f));
        });
    }

    /** Interrompt le dessin en cours (le tracé reste où il en est). */
    function stopTraces(map) {
        const anim = traceAnims.get(map);
        if (anim) anim.stop();
    }

    /**
     * Anime les tracés jusqu'aux fractions indiquées. Si la carte se déplace
     * vers `center`, le tracé avance avec la caméra (il arrive avec elle) ;
     * sinon il se dessine en `duration` ms. done : appelée une fois le dessin
     * fini ou interrompu (aussitôt s'il n'y a rien à dessiner).
     */
    function animateTraces(map, datasets, progress, center, duration, done) {
        stopTraces(map);
        const finish = typeof done === 'function' ? done : () => { };
        const items = list(datasets).filter(d => isObj(d) && isTraced(d) && isNum(obj(progress)[d.id]) && map.getSource(DATA_PREFIX + d.id + '-trace'));
        const drawn = traceDrawn.get(map) || {};
        const from = {};
        items.forEach(d => { from[d.id] = isNum(drawn[d.id]) ? drawn[d.id] : 0; });
        if (!items.some(d => from[d.id] !== clamp01(progress[d.id]))) { finish(); return; }
        const step = u => {
            const p = {};
            items.forEach(d => { p[d.id] = from[d.id] + (clamp01(progress[d.id]) - from[d.id]) * u; });
            try { drawTraces(map, items, p); } catch (e) { anim.stop(); } // carte fermée entre-temps
        };
        let stopped = false;
        let cleanup = () => { };
        const anim = {
            stop() {
                if (stopped) return;
                stopped = true;
                cleanup();
                if (traceAnims.get(map) === anim) traceAnims.delete(map);
                finish();
            }
        };
        traceAnims.set(map, anim);
        // Distance au centre visé, en Web Mercator (un tour du monde = 1, antiméridien compris)
        const target = Array.isArray(center) ? mercator(center) : null;
        const gap = p => { const c = mercator(p); const dx = target[0] - c[0]; return Math.hypot(dx - Math.round(dx), target[1] - c[1]); };
        const span = target ? gap(map.getCenter().toArray()) : 0;
        if (target && span > 1e-9 && map.isMoving()) {
            // Suivi de la caméra : part du trajet parcouru par le centre de la carte
            let u = 0;
            const onMove = () => {
                u = Math.max(u, clamp01(1 - gap(map.getCenter().toArray()) / span));
                step(u);
            };
            const onEnd = () => { step(1); anim.stop(); };
            map.on('move', onMove);
            map.on('moveend', onEnd);
            cleanup = () => { map.off('move', onMove); map.off('moveend', onEnd); };
        } else {
            const t0 = Date.now();
            const ms = isNum(duration) ? duration : TRACE_DURATION;
            let raf = 0;
            const frame = () => {
                if (stopped) return;
                const u = ms > 0 ? Math.min(1, (Date.now() - t0) / ms) : 1;
                step(u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
                if (u < 1) raf = requestAnimationFrame(frame);
                else anim.stop();
            };
            cleanup = () => cancelAnimationFrame(raf);
            raf = requestAnimationFrame(frame);
        }
    }

    /** Applique les propriétés qui ont changé (undefined : valeur par défaut). */
    function updateProps(prev, next, set) {
        const keys = Object.keys(obj(prev)).concat(Object.keys(obj(next)));
        keys.forEach(k => {
            if (JSON.stringify(obj(prev)[k]) !== JSON.stringify(obj(next)[k])) set(k, obj(next)[k]);
        });
    }

    /**
     * Ajoute ou met à jour les calques de données (style de la carte chargé),
     * dans l'ordre de la liste (le dernier au-dessus), puis affiche sans fondu
     * ceux du chapitre indiqué. datasets : [{ id, style, connect, progressive, chapters, geojson }],
     * trajet entre les marqueurs compris (routeData).
     * progress : fractions dessinées des tracés progressifs (sinon, celles en cours).
     * quiet : couches mises à jour sans toucher à leur affichage (icônes chargées).
     */
    function syncData(map, datasets, chapterId, progress, quiet) {
        const items = list(datasets).filter(d => isObj(d) && d.id && isObj(d.geojson));
        const style = map.getStyle() || {};
        const font = items.some(d => obj(d.style).labels !== false && dataKinds(d.geojson).named) ? dataFont(map) : null;
        const shapes = {};   // géométries affichées (points reliés compris)
        items.forEach(d => { shapes[d.id] = dataShape(d); });
        // Icônes d'origine : celles déjà sur la carte ; les autres se chargent (nouvelle synchronisation ensuite)
        lastSync.set(map, { datasets: items, chapterId });
        const icons = {};
        items.forEach(d => {
            const keys = iconKeys(d);
            if (keys.length) iconsReady(map, d, keys);
            icons[d.id] = readyIcons(map, d, keys);
        });
        const wanted = [];
        items.forEach(d => dataLayers(d, font, icons[d.id]).forEach(l => wanted.push(l)));
        const order = wanted.filter(l => !l.top).concat(wanted.filter(l => l.top));
        // Couches à recréer si leur liste, leur ordre ou leur source a changé
        const current = (style.layers || []).filter(l => l.id.indexOf(DATA_PREFIX) === 0);
        const rebuild = order.length !== current.length || order.some((l, k) => l.id !== current[k].id || l.source !== current[k].source);
        let applied = dataApplied.get(map) || {};
        if (rebuild) {
            stopTraces(map);
            current.forEach(l => map.removeLayer(l.id));
            applied = {};
        }

        // Sources : une par calque, remplacée quand ses géométries changent ;
        // une de plus par tracé progressif, pour la partie déjà dessinée
        const known = dataSources.get(map) || {};
        const drawn = traceDrawn.get(map) || {};
        const sources = {};
        const traced = items.filter(isTraced);
        const fractions = {};
        items.forEach(d => { sources[DATA_PREFIX + d.id] = shapes[d.id]; });
        traced.forEach(d => {
            sources[DATA_PREFIX + d.id + '-trace'] = true;
            fractions[d.id] = isNum(obj(progress)[d.id]) ? clamp01(progress[d.id]) : isNum(drawn[d.id]) ? drawn[d.id] : 0;
        });
        Object.keys(style.sources || {}).forEach(id => {
            if (id.indexOf(DATA_PREFIX) === 0 && !sources[id]) map.removeSource(id);
        });
        items.forEach(d => {
            const id = DATA_PREFIX + d.id;
            const src = map.getSource(id);
            if (!src) map.addSource(id, { type: 'geojson', data: shapes[d.id] });
            else if (known[id] !== shapes[d.id]) src.setData(shapes[d.id]);
        });
        const traceShape = traceShapes.get(map) || {};
        const nextShapes = {};
        traced.forEach(d => {
            const id = DATA_PREFIX + d.id + '-trace';
            const src = map.getSource(id);
            if (!src) map.addSource(id, { type: 'geojson', data: sliceTrace(tracePath(shapes[d.id]), fractions[d.id]) });
            else if (drawn[d.id] !== fractions[d.id] || traceShape[d.id] !== shapes[d.id]) src.setData(sliceTrace(tracePath(shapes[d.id]), fractions[d.id]));
            nextShapes[d.id] = shapes[d.id];
        });
        const geo = {};
        items.forEach(d => { geo[DATA_PREFIX + d.id] = shapes[d.id]; });
        dataSources.set(map, geo);
        traceDrawn.set(map, fractions);
        traceShapes.set(map, nextShapes);

        if (rebuild) {
            // Surfaces et lignes au-dessus des routes et bâtiments du fond de carte, sous ses
            // libellés : avant le premier libellé qui suit sa dernière couche dessinée (certains
            // styles placent des libellés, de cours d'eau par exemple, sous les routes).
            // Points et noms tout au-dessus.
            const base = (map.getStyle().layers || []).filter(l => l.id.indexOf(DATA_PREFIX) !== 0);
            let last = -1;
            base.forEach((l, i) => { if (l.type !== 'symbol') last = i; });
            const label = base.slice(last + 1).find(l => l.type === 'symbol');
            order.forEach(l => {
                const spec = { id: l.id, type: l.type, source: l.source, filter: l.filter, paint: Object.assign({}, l.paint, l.show) };
                if (l.layout) spec.layout = l.layout;
                map.addLayer(spec, l.top || !label ? undefined : label.id);
            });
        } else {
            order.forEach(l => {
                const a = applied[l.id] || {};
                if (JSON.stringify(a.filter) !== JSON.stringify(l.filter)) map.setFilter(l.id, l.filter);
                updateProps(a.paint, l.paint, (k, v) => map.setPaintProperty(l.id, k, v));
                updateProps(a.layout, l.layout, (k, v) => map.setLayoutProperty(l.id, k, v));
            });
        }
        const next = {};
        order.forEach(l => { next[l.id] = { data: l.data, show: l.show, paint: l.paint, layout: l.layout, filter: l.filter }; });
        dataApplied.set(map, next);
        if (rebuild || !quiet) showData(map, items, chapterId, 0);
    }

    /** Affiche les calques du chapitre et masque les autres, en fondu (duration en ms). */
    function showData(map, datasets, chapterId, duration) {
        const applied = dataApplied.get(map) || {};
        const timers = dataTimers.get(map) || {};
        dataTimers.set(map, timers);
        const last = lastSync.get(map);
        if (last) last.chapterId = chapterId;   // état à reprendre après le chargement des icônes
        const byId = {};
        list(datasets).forEach(d => { if (isObj(d)) byId[d.id] = d; });
        Object.keys(applied).forEach(id => {
            const a = applied[id];
            if (!byId[a.data] || !map.getLayer(id)) return;
            const visible = dataShown(byId[a.data], chapterId);
            clearTimeout(timers[id]);
            delete timers[id];
            if (visible) map.setLayoutProperty(id, 'visibility', 'visible');
            Object.keys(a.show).forEach(p => {
                map.setPaintProperty(id, p + '-transition', { duration: duration || 0, delay: 0 });
                map.setPaintProperty(id, p, visible ? a.show[p] : 0);
            });
            if (visible) return;
            // Couche masquée à la fin du fondu : elle ne cache plus les libellés du fond de carte
            const hide = () => {
                delete timers[id];
                try { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none'); } catch (e) { /* carte fermée */ }
            };
            if (duration) timers[id] = setTimeout(hide, duration + 50);
            else hide();
        });
    }

    /* ---------- Images : table { nom: adresse } des fichiers .json ---------- */

    function resolver(images) {
        const table = obj(images);
        const has = k => typeof k === 'string' && Object.prototype.hasOwnProperty.call(table, k);
        return {
            src: ref => (has(ref) ? table[ref] : ref),
            html: html => (html && html.indexOf('<img') >= 0
                ? html.replace(/(<img\b[^>]*?\bsrc\s*=\s*)(["'])(.*?)\2/gi, (all, pre, q, ref) => (has(ref) ? pre + q + table[ref] + q : all))
                : html)
        };
    }

    /* ---------- Lecture d'une storymap publiée ---------- */

    function el(doc, tag, className, text) {
        const e = doc.createElement(tag);
        if (className) e.className = className;
        if (text) e.textContent = text;
        return e;
    }

    /**
     * Affiche la storymap dans root (la page défile, la carte reste fixe).
     * @param {Element} root
     * @param {object} data   fichier .json (format 2 : { story, images }) ou storymap seule
     * @param {object} [opts] { start: identifiant du chapitre de départ }
     */
    function mount(root, data, opts) {
        opts = opts || {};
        const doc = root.ownerDocument;
        const win = doc.defaultView;
        const lib = opts.maplibregl || win.maplibregl;
        const input = obj(data);
        const story = expand(isObj(input.story) ? input.story : input);
        const images = resolver(input.images);
        const chapters = story.chapters;
        if (!chapters.length) return null;
        // Calques de données : géométries dans la table « geodata » du fichier (ou intégrées),
        // précédés du trajet entre les marqueurs (dessiné sous les points des calques)
        const geodata = obj(input.geodata);
        const route = routeData(story);
        const datasets = (route ? [route] : []).concat(story.data
            .map(d => Object.assign({}, d, { geojson: isObj(d.geojson) ? d.geojson : Object.prototype.hasOwnProperty.call(geodata, d.id) ? geodata[d.id] : null }))
            .filter(d => isObj(d.geojson)));
        // Dessin progressif : fraction de chaque tracé dessinée à chaque chapitre
        const traced = datasets.filter(isTraced);
        const targets = {};
        traced.forEach(d => { targets[d.id] = traceTargets(d, chapters); });
        const traceAt = i => {
            const p = {};
            traced.forEach(d => { p[d.id] = i < 0 ? 0 : targets[d.id][i]; });
            return p;
        };
        root.classList.add('sm-frame');

        /* Récit */
        const mapEl = el(doc, 'div', 'sm-map');
        const storyEl = el(doc, 'div', 'sm-story');
        const hasHeader = !!(story.title || story.subtitle || story.byline);
        if (hasHeader) {
            const header = el(doc, 'header', 'sm-header ' + story.theme);
            if (story.title) header.appendChild(el(doc, 'h1', null, story.title));
            if (story.subtitle) header.appendChild(el(doc, 'h2', null, story.subtitle));
            if (story.byline) header.appendChild(el(doc, 'p', null, story.byline));
            storyEl.appendChild(header);
        }
        const features = el(doc, 'div', 'sm-features');
        const steps = chapters.map(ch => {
            const step = el(doc, 'section', 'step ' + (ALIGN_CLASS[ch.align] || 'centered') + (ch.hidden ? ' hidden' : ''));
            step.id = ch.id;
            const panel = el(doc, 'div', 'sm-panel ' + story.theme);
            if (ch.title) panel.appendChild(el(doc, 'h3', null, ch.title));
            if (ch.image) panel.appendChild(figure(ch));
            if (ch.text) {
                const text = el(doc, 'div', 'sm-desc');
                text.innerHTML = images.html(ch.text);
                panel.appendChild(text);
            }
            step.appendChild(panel);
            features.appendChild(step);
            return step;
        });
        storyEl.appendChild(features);
        let hasFooter = false;
        if (story.footer) {
            const footer = el(doc, 'footer', 'sm-footer ' + story.theme);
            const text = el(doc, 'div', 'sm-footer-text');
            text.innerHTML = images.html(story.footer);
            footer.appendChild(text);
            hasFooter = !!(text.textContent.trim() || text.querySelector('img,iframe,video,audio'));
            if (hasFooter) storyEl.appendChild(footer);
        }
        root.appendChild(mapEl);
        root.appendChild(storyEl);

        /** Image du chapitre, avec texte alternatif, légende et crédit. */
        function figure(ch) {
            const img = el(doc, 'img');
            img.alt = ch.imageAlt || '';
            img.src = images.src(ch.image);
            if (!ch.imageCaption && !ch.imageCredit) return img;
            const fig = el(doc, 'figure', 'sm-figure');
            const caption = el(doc, 'figcaption', 'sm-figcaption');
            if (ch.imageCaption) caption.appendChild(el(doc, 'span', 'sm-caption', ch.imageCaption));
            if (ch.imageCredit) caption.appendChild(el(doc, 'span', 'sm-credit', ch.imageCredit));
            fig.appendChild(img);
            fig.appendChild(caption);
            return fig;
        }

        /* Chapitre de départ : option start, ou adresse de la page (#identifiant) */
        let wanted = opts.start || '';
        if (!wanted && win.location.hash) {
            try { wanted = decodeURIComponent(win.location.hash.slice(1)); } catch (e) { wanted = ''; }
        }
        const found = wanted ? chapters.findIndex(c => c.id === wanted) : -1;
        const start = Math.max(0, found);
        steps[start].classList.add('active', 'arrived');

        /* Cartes */
        const view = chapters[start].view;
        let map = null;
        let marker = null;
        let inset = null;
        let insetMarker = null;
        if (lib) {
            try {
                map = new lib.Map({
                    container: mapEl, style: story.style, interactive: false,
                    center: view.center, zoom: view.zoom, pitch: view.pitch || 0, bearing: view.bearing || 0
                });
                if (story.marker.show) marker = createMarker(lib, story.marker).setLngLat(view.center).addTo(map);
                if (story.inset.show) {
                    const position = POSITIONS.indexOf(story.inset.position) >= 0 ? story.inset.position : DEFAULTS.inset.position;
                    const insetEl = el(doc, 'div', 'sm-inset ' + position);
                    root.appendChild(insetEl);
                    root.classList.add('sm-inset-' + position);
                    inset = new lib.Map({
                        container: insetEl, style: story.inset.style, interactive: false, attributionControl: false,
                        center: view.center, zoom: isNum(story.inset.zoom) ? story.inset.zoom : DEFAULTS.inset.zoom
                    });
                    const dot = el(doc, 'div', 'inset-marker');
                    if (story.inset.color) dot.style.backgroundColor = story.inset.color;
                    insetMarker = new lib.Marker({ element: dot }).setLngLat(view.center).addTo(inset);
                }
                showMarker(marker, markerShown(chapters[start]));
                showMarker(insetMarker, markerShown(chapters[start]));
            } catch (e) {
                console.error('[Storymap] Carte indisponible :', e);
                map = null;
            }
        }

        /* Chapitre courant : celui qui traverse le milieu de l'écran */
        let current = -1;
        let pending = null;   // destination d'un déplacement demandé (clavier, boutons, sommaire)
        let pendingTimer = null;
        let ready = false;
        let token = 0;
        let autoTimer = null;
        const reduceMotion = () => !!(win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches);

        /** Position dans le récit : n° du chapitre, -1 (couverture) ou steps.length (fin). */
        function position() {
            if (pending !== null) return pending;
            if (current >= 0) return current;
            return steps[steps.length - 1].getBoundingClientRect().bottom <= win.innerHeight / 2 ? steps.length : -1;
        }

        /**
         * Défilement qui centre verticalement le panneau d'un chapitre dans la
         * fenêtre (s'il est plus haut qu'elle : en haut, avec une petite marge).
         */
        function scrollTopFor(i) {
            const r = (steps[i].querySelector('.sm-panel') || steps[i]).getBoundingClientRect();
            const margin = Math.round(win.innerHeight * 0.05);
            const room = win.innerHeight - r.height;
            return Math.max(0, Math.round(r.top + win.pageYOffset - (room > 2 * margin ? room / 2 : margin)));
        }

        /**
         * Fait défiler jusqu'à un chapitre (-1 : couverture, steps.length : fin),
         * son panneau centré dans la fenêtre. Défilement animé vers un chapitre
         * voisin, immédiat au-delà : la carte va alors directement au chapitre
         * visé, sans passer par les autres.
         */
        function go(target, near) {
            pending = target;
            clearTimeout(pendingTimer);
            pendingTimer = setTimeout(() => { pending = null; refresh(); }, 1200);
            const behavior = near && !reduceMotion() ? 'smooth' : 'auto';
            if (target < 0) win.scrollTo({ top: 0, behavior });
            else if (target >= steps.length) win.scrollTo({ top: doc.documentElement.scrollHeight, behavior });
            else win.scrollTo({ top: scrollTopFor(target), behavior });
            refresh();
        }

        const goTo = i => go(i, Math.abs(position() - i) <= 1);

        /** Précédent (-1) ou suivant (+1), couverture et fin comprises. */
        function step(delta) {
            const from = position();
            const target = Math.max(hasHeader ? -1 : 0, Math.min(hasFooter ? steps.length : steps.length - 1, from + delta));
            if (target !== from) go(target, true);
        }

        /** Lecture automatique : chapitre suivant (retour immédiat au premier après le dernier). */
        function next() {
            const k = (current + 1) % steps.length;
            go(k, k !== 0);
        }

        let initial = true;   // premier chapitre affiché : la carte y est déjà

        function enter(i) {
            const ch = chapters[i];
            // Texte déjà affiché sur le premier chapitre (la carte y est) ; ailleurs, révélé à l'arrivée
            const shown = initial && i === start && steps[i].classList.contains('arrived');
            initial = false;
            steps.forEach((s, k) => {
                s.classList.toggle('active', k === i);
                if (k !== i || !shown) s.classList.remove('arrived');
            });
            const mine = ++token;
            clearTimeout(autoTimer);
            // Durée d'affichage du chapitre, décomptée une fois la transition terminée
            const wait = () => {
                const seconds = isNum(ch.autoplayDelay) ? ch.autoplayDelay : story.autoplayDelay;
                autoTimer = setTimeout(() => { if (mine === token) next(); }, Math.max(0, seconds) * 1000);
            };
            // Arrivée : fin du déplacement de la carte et du dessin du trajet. Le texte du
            // chapitre y apparaît (réglage reveal) et la durée d'affichage commence
            let waiting = 2;
            const arrived = () => {
                if (--waiting > 0 || mine !== token) return;
                steps[i].classList.add('arrived');
                if (story.autoplay) wait();
            };
            if (!map) {
                waiting = 1;
                arrived();
                return;
            }
            map.stop();
            // Écouteurs posés avant le déplacement : jumpTo se termine immédiatement
            const afterMove = fn => map.once('moveend', () => { if (mine === token) fn(); });
            if (ch.rotate) afterMove(() => map.rotateTo(map.getBearing() + 180, { duration: 30000, easing: t => t }));
            move(map, ch);
            if (map.isMoving() && !reduceMotion()) afterMove(arrived);
            else arrived();
            if (marker) marker.setLngLat(ch.view.center);
            if (inset) {
                inset.setCenter(ch.view.center);
                insetMarker.setLngLat(ch.view.center);
            }
            showMarker(marker, markerShown(ch));
            showMarker(insetMarker, markerShown(ch));
            ch.layers.enter.forEach(r => setLayerOpacity(map, r));
            if (datasets.length) {
                try { showData(map, datasets, ch.id, reduceMotion() ? 0 : DATA_FADE); } catch (e) { console.warn('[Storymap] Données :', e); }
            }
            // Le tracé avance (ou recule) avec la caméra jusqu'à ce chapitre
            if (!traced.length || reduceMotion()) {
                try { if (traced.length) drawTraces(map, traced, traceAt(i)); } catch (e) { console.warn('[Storymap] Tracé :', e); }
                arrived();
            } else {
                try { animateTraces(map, traced, traceAt(i), ch.view.center, TRACE_DURATION, arrived); } catch (e) { console.warn('[Storymap] Tracé :', e); arrived(); }
            }
        }

        function exit(i) {
            steps[i].classList.remove('active', 'arrived');
            token++;
            clearTimeout(autoTimer);
            if (map) {
                chapters[i].layers.exit.forEach(r => setLayerOpacity(map, r));
                if (traced.length) stopTraces(map); // avant map.stop() : le tracé reste où il en est
            }
        }

        function activeIndex() {
            const middle = win.innerHeight / 2;
            for (let i = 0; i < steps.length; i++) {
                const r = steps[i].getBoundingClientRect();
                if (r.top <= middle && r.bottom > middle) return i;
            }
            return -1;
        }

        let ticking = false;
        function update() {
            ticking = false;
            if (nav) nav.progress();
            if (ready) {
                const i = activeIndex();
                if (i !== current) {
                    if (current >= 0) exit(current);
                    current = i;
                    if (i >= 0) enter(i);
                }
            }
            refresh();
        }
        function refresh() {
            if (nav) nav.refresh();
        }
        function schedule() {
            if (ticking) return;
            ticking = true;
            win.requestAnimationFrame(update);
        }
        win.addEventListener('scroll', schedule, { passive: true });
        win.addEventListener('resize', schedule);

        /* Navigation des lecteurs : barre de progression, sommaire, précédent / suivant */
        const nav = story.navigation ? buildNavigation() : null;

        function buildNavigation() {
            root.style.setProperty('--sm-accent', story.marker.color || DEFAULTS.marker.color);
            const icon = d => '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + d + '"/></svg>';
            const button = (className, label, svg) => {
                const b = el(doc, 'button', className);
                b.type = 'button';
                b.title = label;
                b.setAttribute('aria-label', label);
                b.innerHTML = svg;
                return b;
            };

            const progress = el(doc, 'div', 'sm-progress');
            const bar = el(doc, 'div', 'sm-progress-bar');
            progress.setAttribute('aria-hidden', 'true');
            progress.appendChild(bar);

            const box = el(doc, 'nav', 'sm-nav ' + story.theme);
            box.setAttribute('aria-label', 'Navigation dans la storymap');
            const prev = button('sm-nav-prev', 'Précédent', icon('m15 18-6-6 6-6'));
            const toggle = button('sm-nav-toc', 'Sommaire', icon('M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01'));
            const count = el(doc, 'span', 'sm-nav-count');
            count.setAttribute('aria-hidden', 'true');
            toggle.appendChild(count);
            toggle.setAttribute('aria-expanded', 'false');
            toggle.setAttribute('aria-controls', 'sm-sommaire');
            const nextButton = button('sm-nav-next', 'Suivant', icon('m9 18 6-6-6-6'));
            box.appendChild(prev);
            box.appendChild(toggle);
            box.appendChild(nextButton);
            prev.addEventListener('click', () => step(-1));
            nextButton.addEventListener('click', () => step(1));
            // Plein écran, dans la page publiée comme dans une page qui l'intègre (iframe), si le
            // navigateur le permet (pas sur iPhone) : libellé et icône suivent l'état
            if (doc.fullscreenEnabled && doc.documentElement.requestFullscreen) {
                const enterIcon = icon('M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M16 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3');
                const exitIcon = icon('M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M16 21v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3');
                const full = button('sm-nav-full', 'Plein écran', enterIcon);
                full.setAttribute('aria-pressed', 'false');
                full.addEventListener('click', () => {
                    if (doc.fullscreenElement) doc.exitFullscreen().catch(() => { });
                    else doc.documentElement.requestFullscreen().catch(() => { });
                });
                doc.addEventListener('fullscreenchange', () => {
                    const on = !!doc.fullscreenElement;
                    const label = on ? 'Quitter le plein écran' : 'Plein écran';
                    full.title = label;
                    full.setAttribute('aria-label', label);
                    full.setAttribute('aria-pressed', String(on));
                    full.innerHTML = on ? exitIcon : enterIcon;
                });
                box.appendChild(full);
            }

            // Sommaire
            const toc = el(doc, 'div', 'sm-toc ' + story.theme);
            toc.id = 'sm-sommaire';
            toc.hidden = true;
            toc.setAttribute('role', 'dialog');
            toc.setAttribute('aria-label', 'Sommaire');
            toc.appendChild(el(doc, 'p', 'sm-toc-head', 'Sommaire'));
            const list = el(doc, 'ol');
            const entry = (num, label, target) => {
                const a = el(doc, 'a');
                a.href = target >= 0 ? '#' + encodeURIComponent(chapters[target].id) : '#';
                a.appendChild(el(doc, 'span', 'sm-toc-num', num));
                a.appendChild(el(doc, 'span', 'sm-toc-title', label));
                a.addEventListener('click', e => {
                    e.preventDefault();
                    closeToc(false);
                    goTo(target);
                });
                const li = el(doc, 'li');
                li.appendChild(a);
                list.appendChild(li);
                return a;
            };
            if (hasHeader) entry('', story.title || 'Couverture', -1);
            const links = chapters.map((ch, i) => entry(String(i + 1), ch.title || 'Chapitre ' + (i + 1), i));
            toc.appendChild(list);

            const onOutside = e => {
                if (!toc.contains(e.target) && !toggle.contains(e.target)) closeToc(false);
            };
            function openToc() {
                toc.hidden = false;
                toggle.setAttribute('aria-expanded', 'true');
                const focus = links[current] || list.querySelector('a');
                focus.focus({ preventScroll: true });
                focus.scrollIntoView({ block: 'nearest' });
                doc.addEventListener('pointerdown', onOutside, true);
            }
            function closeToc(focusToggle) {
                if (toc.hidden) return;
                toc.hidden = true;
                toggle.setAttribute('aria-expanded', 'false');
                doc.removeEventListener('pointerdown', onOutside, true);
                if (focusToggle) toggle.focus();
            }
            toggle.addEventListener('click', () => (toc.hidden ? openToc() : closeToc(false)));
            // Clavier dans le sommaire : ↑ ↓ début fin pour se déplacer, Échap pour fermer
            toc.addEventListener('keydown', e => {
                const items = Array.prototype.slice.call(list.querySelectorAll('a'));
                const k = items.indexOf(doc.activeElement);
                let target = null;
                if (e.key === 'Escape') { e.preventDefault(); closeToc(true); return; }
                if (e.key === 'ArrowDown') target = Math.min(items.length - 1, k + 1);
                else if (e.key === 'ArrowUp') target = Math.max(0, k - 1);
                else if (e.key === 'Home') target = 0;
                else if (e.key === 'End') target = items.length - 1;
                else return;
                e.preventDefault();
                items[target].focus();
            });

            root.appendChild(progress);
            root.appendChild(box);
            root.appendChild(toc);

            let last = '';
            return {
                progress() {
                    const max = doc.documentElement.scrollHeight - win.innerHeight;
                    const p = max > 0 ? Math.min(1, Math.max(0, win.pageYOffset / max)) : 0;
                    bar.style.transform = 'scaleX(' + p + ')';
                },
                refresh() {
                    const pos = position();
                    // Bas de la page atteint : plus rien après, même si le dernier chapitre est encore au centre
                    const atEnd = win.pageYOffset + win.innerHeight >= doc.documentElement.scrollHeight - 2;
                    const key = pos + ':' + current + ':' + atEnd;
                    if (key === last) return;
                    last = key;
                    prev.disabled = pos <= (hasHeader ? -1 : 0);
                    nextButton.disabled = atEnd || pos >= (hasFooter ? steps.length : steps.length - 1);
                    count.textContent = current >= 0 ? (current + 1) + ' / ' + steps.length : (pos < 0 ? 'Début' : 'Fin');
                    toggle.setAttribute('aria-label', 'Sommaire (' + (current >= 0 ? 'chapitre ' + (current + 1) + ' sur ' + steps.length : count.textContent.toLowerCase()) + ')');
                    links.forEach((a, i) => {
                        if (i === current) a.setAttribute('aria-current', 'true');
                        else a.removeAttribute('aria-current');
                    });
                }
            };
        }

        function begin() {
            ready = true;
            update();
            // Lecture automatique depuis la couverture : premier chapitre après la durée d'affichage
            if (story.autoplay && current < 0) {
                autoTimer = setTimeout(() => { if (current < 0) go(0, true); }, Math.max(0, story.autoplayDelay) * 1000);
            }
        }
        if (map) {
            map.on('load', () => {
                try { setTerrain(map, story.terrain); } catch (e) { console.warn('[Storymap] Relief :', e); }
                if (datasets.length) {
                    // Tracés : rien de dessiné sur la couverture, état du chapitre pour un lien direct
                    try { syncData(map, datasets, chapters[start].id, traceAt(found >= 0 ? start : -1)); } catch (e) { console.warn('[Storymap] Données :', e); }
                }
                // Texte révélé à l'arrivée : seulement une fois la carte prête (sinon le texte resterait caché)
                if (story.reveal !== 'immediate') root.classList.add('sm-reveal-' + story.reveal);
                begin();
            });
        } else {
            begin();
        }
        update();

        /* Placement sur le chapitre de départ (repris quand les images ont fini de charger) */
        if (found >= 0) {
            let touched = false;
            ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(type => win.addEventListener(type, () => { touched = true; }, { passive: true, once: true }));
            const place = () => {
                if (!touched) win.scrollTo(0, scrollTopFor(start));
            };
            place();
            if (doc.readyState !== 'complete') win.addEventListener('load', place, { once: true });
        }

        // Lien vers un chapitre dans la page (#identifiant, historique) : chapitre centré, comme avec la navigation
        win.addEventListener('hashchange', () => {
            let id = '';
            try { id = decodeURIComponent(win.location.hash.slice(1)); } catch (e) { return; }
            const i = chapters.findIndex(c => c.id === id);
            if (i >= 0) go(i, false);
        });

        /* Navigation au clavier : ← précédent · → ou Espace suivant · ↑ premier · ↓ dernier */
        if (story.keyboard) {
            doc.addEventListener('keydown', e => {
                if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
                const t = e.target || {};
                const tag = String(t.tagName || '').toUpperCase();
                if (t.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
                const space = e.key === ' ' || e.key === 'Spacebar';
                if (space && (tag === 'BUTTON' || tag === 'A' || tag === 'SUMMARY')) return;
                if (e.key === 'ArrowLeft' || (space && e.shiftKey)) step(-1);
                else if (e.key === 'ArrowRight' || space) step(1);
                else if (e.key === 'ArrowUp') goTo(0);
                else if (e.key === 'ArrowDown') goTo(steps.length - 1);
                else return;
                e.preventDefault();
            });
        }

        return {
            map, inset, steps,
            go: goTo,
            get current() { return current; }
        };
    }

    return {
        FORMAT_VERSION: 2,
        DEFAULTS, CSS, ICONS, LAYER_TYPES, ALIGN_CLASS, POSITIONS, TRANSITIONS, REVEALS, VAR_NAMES, TERRAIN_SOURCE, DATA_PREFIX, DATA_FADE, TRACE_DURATION, ROUTE_ID,
        expand, cssVars, createMarker, markerShown, showMarker, setTerrain, setLayerOpacity, camera, move, resolver, mount,
        dataShown, dataShape, routeData, syncData, showData,
        isTraced, traceTargets, traceProgress, drawTraces, animateTraces, stopTraces,
        // Code source recopié dans les pages publiées
        source: player
    };
})();
