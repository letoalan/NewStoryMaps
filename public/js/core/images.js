/* ==========================================================================
   StoryMap — images (intégration en base64, optimisation, miniatures)
   ========================================================================== */
(function () {
    'use strict';

    const SM = window.SM;
    const U = SM.util;

    const I = SM.images = {};

    I.ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif,image/bmp';

    I.loadImage = function (src, crossOrigin) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            if (crossOrigin) img.crossOrigin = 'anonymous';
            img.decoding = 'async';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Image illisible ou format non pris en charge.'));
            img.src = src;
        });
    };

    I.dataUrlMime = function (dataUrl) {
        const m = /^data:([^;,]+)/i.exec(dataUrl || '');
        return m ? m[1].toLowerCase() : '';
    };

    I.dataUrlBytes = function (dataUrl) {
        if (!dataUrl || !/^data:/i.test(dataUrl)) return 0;
        const i = dataUrl.indexOf(',');
        if (i < 0) return 0;
        const meta = dataUrl.slice(0, i);
        const body = dataUrl.length - i - 1;
        if (/;base64/i.test(meta)) {
            let pad = 0;
            if (dataUrl.endsWith('==')) pad = 2; else if (dataUrl.endsWith('=')) pad = 1;
            return Math.max(0, Math.floor(body * 3 / 4) - pad);
        }
        return body;
    };

    I.dataUrlToBlob = function (dataUrl) {
        const i = dataUrl.indexOf(',');
        const meta = dataUrl.slice(5, i);
        const mime = meta.split(';')[0] || 'application/octet-stream';
        const body = dataUrl.slice(i + 1);
        if (/;base64/i.test(meta)) {
            const bin = atob(body);
            const bytes = new Uint8Array(bin.length);
            for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
            return new Blob([bytes], { type: mime });
        }
        return new Blob([decodeURIComponent(body)], { type: mime });
    };

    I.extForMime = function (mime) {
        return ({
            'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
            'image/svg+xml': 'svg', 'image/avif': 'avif', 'image/bmp': 'bmp', 'image/x-icon': 'ico'
        })[mime] || 'bin';
    };

    I.mimeForName = function (name) {
        const ext = String(name || '').split('.').pop().toLowerCase();
        return ({
            jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
            svg: 'image/svg+xml', avif: 'image/avif', bmp: 'image/bmp'
        })[ext] || '';
    };

    function hasAlpha(ctx, w, h) {
        try {
            const data = ctx.getImageData(0, 0, w, h).data;
            const total = w * h;
            const step = Math.max(1, Math.floor(total / 250000));
            for (let p = 0; p < total; p += step) {
                if (data[p * 4 + 3] < 250) return true;
            }
        } catch (e) { return true; }
        return false;
    }

    function currentOptions(opts) {
        const P = SM.prefs;
        return Object.assign({
            optimize: P.get('imageOptimize'),
            maxDim: P.get('imageMaxDim'),
            quality: P.get('imageQuality')
        }, opts || {});
    }

    /**
     * Convertit un Blob / File image en data URL, en l'optimisant si demandé.
     * @returns {Promise<{src, width, height, bytes, originalBytes, optimized, type}>}
     */
    I.fromBlob = async function (blob, opts) {
        opts = currentOptions(opts);
        let type = (blob.type || '').toLowerCase();
        if (!type && blob.name) type = I.mimeForName(blob.name);
        if (!type.startsWith('image/')) throw new Error('« ' + (blob.name || 'Ce fichier') + ' » n’est pas une image.');
        if (type === 'image/jpg') type = 'image/jpeg';
        const originalBytes = blob.size;

        const passthrough = async (w, h) => {
            let src = await U.readAsDataURL(blob);
            // Certains navigateurs renvoient « application/octet-stream » : on corrige le type MIME.
            if (!/^data:image\//i.test(src)) src = src.replace(/^data:[^;,]*/i, 'data:' + type);
            if (w === undefined) {
                try { const im = await I.loadImage(src); w = im.naturalWidth; h = im.naturalHeight; } catch (e) { /* SVG sans dimensions */ }
            }
            return { src, width: w || 0, height: h || 0, bytes: originalBytes, originalBytes, optimized: false, type };
        };

        if (!opts.optimize || type === 'image/svg+xml' || type === 'image/gif') return passthrough();

        const url = URL.createObjectURL(blob);
        try {
            let img;
            try { img = await I.loadImage(url); } catch (e) { return passthrough(); }
            const w = img.naturalWidth;
            const h = img.naturalHeight;
            if (!w || !h) return passthrough();
            const maxDim = opts.maxDim > 0 ? opts.maxDim : Infinity;
            const scale = Math.min(1, maxDim / Math.max(w, h));
            const needsResize = scale < 1;
            if (!needsResize && originalBytes <= 350 * 1024 && /jpeg|webp|png/.test(type)) return passthrough(w, h);

            const tw = Math.max(1, Math.round(w * scale));
            const th = Math.max(1, Math.round(h * scale));
            const canvas = document.createElement('canvas');
            canvas.width = tw;
            canvas.height = th;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, tw, th);
            const alpha = /png|webp|avif|bmp/.test(type) && hasAlpha(ctx, tw, th);
            const outType = alpha ? 'image/png' : 'image/jpeg';
            if (!alpha) {
                // Fond blanc pour les éventuels pixels semi-transparents
                ctx.globalCompositeOperation = 'destination-over';
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, tw, th);
            }
            const outBlob = await new Promise(r => canvas.toBlob(r, outType, opts.quality));
            if (!outBlob || (!needsResize && outBlob.size >= originalBytes)) return passthrough(w, h);
            const src = await U.readAsDataURL(outBlob);
            return { src, width: tw, height: th, bytes: outBlob.size, originalBytes, optimized: true, type: outType };
        } finally {
            URL.revokeObjectURL(url);
        }
    };

    I.fromFile = (file, opts) => I.fromBlob(file, opts);

    /** Télécharge une image distante et l'intègre (nécessite que le serveur autorise CORS). */
    I.fromUrl = async function (url, opts) {
        let res;
        try {
            res = await fetch(url, { mode: 'cors', credentials: 'omit' });
        } catch (e) {
            throw new Error('Téléchargement impossible : le site ne l’autorise pas (CORS) ou il est injoignable.');
        }
        if (!res.ok) throw new Error('Téléchargement impossible (erreur HTTP ' + res.status + ').');
        const blob = await res.blob();
        let typed = blob;
        if (!blob.type || !blob.type.startsWith('image/')) {
            const guess = I.mimeForName(url);
            if (!guess) throw new Error('L’adresse ne pointe pas vers une image.');
            typed = new Blob([blob], { type: guess });
        }
        return I.fromBlob(typed, opts);
    };

    /** Réoptimise une image déjà intégrée. */
    I.reoptimize = async function (dataUrl, opts) {
        return I.fromBlob(I.dataUrlToBlob(dataUrl), Object.assign({ optimize: true }, opts || {}));
    };

    I.dimensions = async function (src) {
        try {
            const img = await I.loadImage(src, M_isRemote(src));
            return { width: img.naturalWidth, height: img.naturalHeight };
        } catch (e) { return { width: 0, height: 0 }; }
    };

    function M_isRemote(src) { return /^(https?:)?\/\//i.test(src || ''); }

    function drawCover(ctx, source, sw, sh, W, H) {
        const r = Math.max(W / sw, H / sh);
        const dw = sw * r;
        const dh = sh * r;
        ctx.drawImage(source, (W - dw) / 2, (H - dh) / 2, dw, dh);
    }

    /** Miniature JPEG (recadrage « cover ») à partir d'une image. */
    I.thumbnail = async function (src, W, H) {
        W = W || 480; H = H || 300;
        try {
            const img = await I.loadImage(src, M_isRemote(src));
            const canvas = document.createElement('canvas');
            canvas.width = W;
            canvas.height = H;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingQuality = 'high';
            drawCover(ctx, img, img.naturalWidth, img.naturalHeight, W, H);
            return canvas.toDataURL('image/jpeg', 0.82);
        } catch (e) {
            return null;
        }
    };

    /** Miniature JPEG à partir d'un canvas (ex. carte MapLibre). */
    I.canvasThumbnail = function (source, W, H) {
        W = W || 480; H = H || 300;
        try {
            const canvas = document.createElement('canvas');
            canvas.width = W;
            canvas.height = H;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingQuality = 'high';
            drawCover(ctx, source, source.width, source.height, W, H);
            return canvas.toDataURL('image/jpeg', 0.8);
        } catch (e) {
            return null;
        }
    };
})();
