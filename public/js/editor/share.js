/* ==========================================================================
   StoryMap — partage : code d'intégration (iframe) et QR code
   --------------------------------------------------------------------------
   Les deux reposent sur l'adresse de publication de la storymap
   (config.share.url), saisie ici ou dans l'onglet « Storymap ».
   Le QR code est calculé localement (js/vendor/qrcode.js, licence MIT).
   ========================================================================== */
(function () {
    'use strict';

    const SM = window.SM;
    const U = SM.util;
    const h = U.h;
    const UI = SM.ui;
    const M = SM.model;

    const S = SM.Share = {};

    const HEIGHTS = [
        { value: '500', label: '500 px' },
        { value: '600', label: '600 px (recommandé)' },
        { value: '700', label: '700 px' },
        { value: '800', label: '800 px' },
        { value: '100vh', label: 'Hauteur de l’écran' }
    ];

    /** Code HTML qui affiche la storymap publiée dans une autre page. */
    S.embedCode = function (url, title, height) {
        const screen = height === '100vh';
        return '<iframe src="' + U.escapeHtml(url) + '" title="' + U.escapeHtml(title || 'Storymap') + '" width="100%"' +
            (screen ? '' : ' height="' + height + '"') +
            ' style="display:block;width:100%;' + (screen ? 'height:100vh;' : '') + 'border:0"' +
            ' loading="lazy" allow="fullscreen" allowfullscreen></iframe>';
    };

    /** Matrice d'un QR code (niveau de correction M : lisible même un peu abîmé). */
    S.qrMatrix = function (text) {
        const qr = window.qrcode(0, 'M');
        qr.addData(text);
        qr.make();
        return { size: qr.getModuleCount(), dark: (r, c) => qr.isDark(r, c) };
    };

    /** QR code au format SVG (marge de 4 modules, comme le prévoit la norme). */
    S.qrSvg = function (matrix) {
        const margin = 4;
        const n = matrix.size + margin * 2;
        let d = '';
        for (let r = 0; r < matrix.size; r++) {
            for (let c = 0; c < matrix.size; c++) if (matrix.dark(r, c)) d += 'M' + (c + margin) + ' ' + (r + margin) + 'h1v1h-1z';
        }
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n + ' ' + n + '" width="' + n * 10 + '" height="' + n * 10 + '" shape-rendering="crispEdges">' +
            '<rect width="' + n + '" height="' + n + '" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
    };

    /** QR code au format PNG (environ 1 200 px de côté, modules nets). */
    S.qrPng = function (matrix) {
        const margin = 4;
        const n = matrix.size + margin * 2;
        const k = Math.max(8, Math.round(1200 / n));
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = n * k;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#000';
        for (let r = 0; r < matrix.size; r++) {
            for (let c = 0; c < matrix.size; c++) if (matrix.dark(r, c)) ctx.fillRect((c + margin) * k, (r + margin) * k, k, k);
        }
        return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    };

    /**
     * Champ « Adresse de publication » : vérifié à la saisie, enregistré dans
     * la storymap à la validation (ou à la fermeture de la fenêtre).
     */
    function addressField(store, onChange) {
        const input = UI.textInput({ value: store.config.share.url, type: 'url', placeholder: 'https://exemple.fr/ma-storymap/', spellcheck: false, label: 'Adresse de publication' });
        const error = h('div', { class: 'field-hint', style: 'color:var(--danger)' });
        const check = save => {
            const raw = input.get().trim();
            const clean = M.normalizeShare({ url: raw }).url;
            const bad = !!raw && !clean;
            error.textContent = bad ? 'Adresse invalide : elle doit commencer par https:// (ou http://).' : '';
            input.input.setAttribute('aria-invalid', String(bad));
            onChange(clean);
            if (save && !bad && clean !== store.config.share.url) store.setGroup('share', { url: clean }, { label: 'Adresse de publication' });
            return clean;
        };
        input.input.addEventListener('input', () => check(false));
        input.input.addEventListener('change', () => check(true));
        return {
            el: h('div', {}, UI.field('Adresse de publication', input, { hint: 'Adresse de la storymap une fois en ligne. Elle est enregistrée dans la storymap (onglet « Storymap », section « Partage »).' }), error),
            save: () => check(true)
        };
    }

    /* ---------- Code d'intégration ---------- */

    S.embedDialog = function (store) {
        let url = store.config.share.url;
        let height = '600';
        const code = UI.textInput({ multiline: true, rows: 4, spellcheck: false, label: 'Code d’intégration', className: 'share-code' });
        code.input.readOnly = true;
        code.input.addEventListener('focus', () => code.input.select());
        const copy = UI.button({
            label: 'Copier le code', icon: 'copy', variant: 'primary', onClick: async () => {
                address.save();
                if (await U.copyText(code.get())) UI.toast('Code copié : collez-le dans votre site.', { type: 'success', duration: 2200 });
            }
        });
        const refresh = () => {
            code.input.value = url ? S.embedCode(url, store.config.title, height) : '';
            code.input.placeholder = 'Indiquez d’abord l’adresse de publication de la storymap.';
            copy.disabled = !url;
        };
        const address = addressField(store, v => { url = v; refresh(); });
        const sizes = UI.select({ value: height, options: HEIGHTS, label: 'Hauteur', onChange: v => { height = v; refresh(); } });
        const body = h('div', {},
            h('p', { style: 'margin:0 0 14px' }, 'Affichez la storymap dans une page de votre site ou de votre CMS (WordPress, Drupal, Wix…) : publiez-la d’abord (page HTML ou site web), puis collez ce code à l’endroit voulu.'),
            address.el,
            UI.field('Hauteur', sizes),
            UI.field('Code à copier', code.el, { hint: 'Avec la navigation des lecteurs, un bouton permet de passer la storymap en plein écran.' }));
        refresh();
        UI.modal({
            title: 'Intégrer dans un site', icon: 'code', width: 580, body,
            onClose: () => address.save(),
            footer: close => {
                const actions = UI.modalActions(close, [{ label: 'Fermer' }]);
                actions.appendChild(copy);
                return actions;
            }
        });
    };

    /* ---------- QR code ---------- */

    S.qrDialog = function (store) {
        let url = store.config.share.url;
        let matrix = null;
        const preview = h('div', { class: 'share-qr', role: 'img', 'aria-label': 'QR code de la storymap' });
        const name = ext => (U.slugify(store.config.title) || 'storymap') + '-qr-code.' + ext;
        const svgButton = UI.button({ label: 'SVG', icon: 'download', tip: 'Format vectoriel, idéal pour l’impression', onClick: () => matrix && U.download(new Blob([S.qrSvg(matrix)], { type: 'image/svg+xml' }), name('svg')) });
        const pngButton = UI.button({ label: 'PNG', icon: 'download', variant: 'primary', tip: 'Image de 1 200 px environ', onClick: async () => { if (matrix) U.download(await S.qrPng(matrix), name('png')); } });

        let loading = null;
        const render = async () => {
            matrix = null;
            svgButton.disabled = pngButton.disabled = true;
            U.clear(preview);
            if (!url) {
                preview.appendChild(h('p', { class: 'muted', style: 'margin:0;text-align:center' }, 'Indiquez l’adresse de publication pour obtenir le QR code.'));
                return;
            }
            const target = url;
            try {
                loading = loading || U.loadScript('js/vendor/qrcode.js');
                await loading;
                if (target !== url) return; // adresse modifiée entre-temps
                // Adresse encodée (accents, espaces) : lisible par tous les téléphones
                matrix = S.qrMatrix(new URL(target).href);
                preview.innerHTML = S.qrSvg(matrix);
                svgButton.disabled = pngButton.disabled = false;
            } catch (e) {
                loading = null;
                preview.appendChild(h('p', { style: 'margin:0;color:var(--danger)' }, 'QR code impossible : ' + e.message));
            }
        };
        const address = addressField(store, v => { url = v; render(); });
        const body = h('div', {},
            h('p', { style: 'margin:0 0 14px' }, 'Pour une affiche, un dépliant ou une exposition : scanné avec un téléphone, le QR code ouvre la storymap publiée.'),
            address.el,
            preview,
            h('p', { class: 'field-hint', style: 'margin:0' }, 'Testez-le avec votre téléphone avant d’imprimer. Imprimez-le au moins en 2 × 2 cm.'));
        render();
        UI.modal({
            title: 'QR code', icon: 'qr-code', width: 480, body,
            onClose: () => address.save(),
            footer: close => {
                const actions = UI.modalActions(close, [{ label: 'Fermer' }]);
                actions.appendChild(svgButton);
                actions.appendChild(pngButton);
                return actions;
            }
        });
    };
})();
