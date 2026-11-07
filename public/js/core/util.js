/* ==========================================================================
   StoryMap — utilitaires généraux
   ========================================================================== */
(function () {
    'use strict';

    const SM = window.SM = window.SM || {};
    const U = SM.util = {};

    SM.VERSION = '2.0.0';

    /* ---------- DOM ---------- */

    // Propriétés DOM affectées directement. « spellcheck » et « draggable » restent des
    // attributs : la chaîne 'false' affectée en propriété vaudrait true.
    const PROP_KEYS = new Set(['value', 'checked', 'selected', 'disabled', 'hidden', 'indeterminate', 'multiple', 'readOnly', 'tabIndex', 'contentEditable']);

    /**
     * Crée un élément DOM.
     * h('button', { class: 'btn', onclick: fn, 'aria-label': 'OK' }, 'Texte', autreNoeud)
     */
    U.h = function h(tag, props, ...children) {
        const el = document.createElement(tag);
        if (props) {
            for (const key in props) {
                const v = props[key];
                if (v === undefined || v === null || v === false) continue;
                if (key === 'class' || key === 'className') el.className = v;
                else if (key === 'style') {
                    if (typeof v === 'string') el.style.cssText = v;
                    else for (const s in v) {
                        if (s.startsWith('--')) el.style.setProperty(s, v[s]);
                        else el.style[s] = v[s];
                    }
                }
                else if (key === 'dataset') Object.assign(el.dataset, v);
                else if (key === 'html') el.innerHTML = v;
                else if (key === 'text') el.textContent = v;
                else if (key.startsWith('on') && typeof v === 'function') el.addEventListener(key.slice(2).toLowerCase(), v);
                else if (PROP_KEYS.has(key)) el[key] = v;
                else el.setAttribute(key, v === true ? '' : String(v));
            }
        }
        U.append(el, children);
        return el;
    };

    U.append = function (el, children) {
        for (const c of children) {
            if (c === null || c === undefined || c === false || c === true) continue;
            if (Array.isArray(c)) U.append(el, c);
            else if (c instanceof Node) el.appendChild(c);
            else el.appendChild(document.createTextNode(String(c)));
        }
        return el;
    };

    U.clear = function (el) {
        while (el.firstChild) el.removeChild(el.firstChild);
        return el;
    };

    U.qs = (sel, root) => (root || document).querySelector(sel);
    U.qsa = (sel, root) => Array.from((root || document).querySelectorAll(sel));

    /** Vrai si l'élément reçoit une saisie de texte (champ, zone éditable…). */
    U.isTypingTarget = function (el) {
        if (!el || el === document.body) return false;
        if (el.isContentEditable) return true;
        const tag = el.tagName;
        if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
        if (tag === 'INPUT') {
            const t = (el.type || 'text').toLowerCase();
            return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file'].includes(t);
        }
        return false;
    };

    /* ---------- Fonctions ---------- */

    U.uid = function (prefix) {
        const r = Math.random().toString(36).slice(2, 8);
        return (prefix || '') + Date.now().toString(36) + r;
    };

    U.debounce = function (fn, wait) {
        let timer = null;
        let lastArgs = null;
        const d = function (...args) {
            lastArgs = args;
            clearTimeout(timer);
            timer = setTimeout(() => { timer = null; const a = lastArgs; lastArgs = null; fn(...a); }, wait);
        };
        d.flush = function () {
            if (timer) { clearTimeout(timer); timer = null; const a = lastArgs; lastArgs = null; return fn(...a); }
        };
        d.cancel = function () { clearTimeout(timer); timer = null; lastArgs = null; };
        d.pending = () => timer !== null;
        return d;
    };

    U.throttle = function (fn, wait) {
        let last = 0;
        let timer = null;
        return function (...args) {
            const now = Date.now();
            const remaining = wait - (now - last);
            clearTimeout(timer);
            if (remaining <= 0) { last = now; fn(...args); }
            else timer = setTimeout(() => { last = Date.now(); fn(...args); }, remaining);
        };
    };

    U.sleep = ms => new Promise(r => setTimeout(r, ms));
    U.nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));

    U.emitter = function () {
        const map = new Map();
        return {
            on(type, fn) {
                if (!map.has(type)) map.set(type, new Set());
                map.get(type).add(fn);
                return () => map.get(type) && map.get(type).delete(fn);
            },
            emit(type, payload) {
                const set = map.get(type);
                if (set) for (const fn of Array.from(set)) {
                    try { fn(payload); } catch (e) { console.error(e); }
                }
            },
            clear() { map.clear(); }
        };
    };

    /* ---------- Nombres ---------- */

    U.clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    U.round = (v, d) => { const p = Math.pow(10, d || 0); return Math.round(v * p) / p; };
    U.isNum = v => typeof v === 'number' && isFinite(v);
    U.toNum = function (v, fallback) {
        if (typeof v === 'number' && isFinite(v)) return v;
        if (typeof v === 'string' && v.trim() !== '') {
            const n = Number(v.replace(',', '.'));
            if (isFinite(n)) return n;
        }
        return fallback;
    };

    const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
    U.formatNumber = (v, digits) => digits === undefined ? nf.format(v) :
        new Intl.NumberFormat('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);

    U.formatBytes = function (bytes) {
        if (!U.isNum(bytes)) return '—';
        if (bytes < 1024) return bytes + ' o';
        const units = ['Ko', 'Mo', 'Go', 'To'];
        let v = bytes / 1024;
        let i = 0;
        while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
        return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: v < 10 ? 1 : 0 }).format(v) + ' ' + units[i];
    };

    /* ---------- Texte ---------- */

    U.escapeHtml = function (s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    };

    U.stripHtml = function (html) {
        if (!html) return '';
        const doc = new DOMParser().parseFromString('<body>' + html, 'text/html');
        return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
    };

    U.slugify = function (s, maxLen) {
        const slug = String(s || '')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/ß/g, 'ss')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        return slug.slice(0, maxLen || 60).replace(/-+$/g, '');
    };

    const COMBINING_MARKS = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g');
    /** Retire les accents (é → e) en conservant la casse. */
    U.stripAccents = s => String(s || '').normalize('NFD').replace(COMBINING_MARKS, '')
        .replace(/œ/g, 'oe').replace(/Œ/g, 'OE').replace(/æ/g, 'ae').replace(/Æ/g, 'AE').replace(/ß/g, 'ss');

    U.plural = (n, singular, plural) => n + ' ' + (Math.abs(n) >= 2 ? (plural || singular + 's') : singular);

    U.truncate = (s, n) => (s && s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : (s || ''));

    U.basename = function (path) {
        if (!path) return '';
        const clean = String(path).split(/[?#]/)[0];
        const parts = clean.split(/[\\/]/);
        let name = parts[parts.length - 1] || '';
        try { name = decodeURIComponent(name); } catch (e) { /* ignore */ }
        return name;
    };

    /* ---------- Dates ---------- */

    const dtf = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    const dtfFull = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const tf = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });

    U.formatDate = ts => ts ? dtf.format(new Date(ts)) : '—';
    U.formatDateTime = ts => ts ? dtfFull.format(new Date(ts)) : '—';
    U.formatTime = ts => ts ? tf.format(new Date(ts)) : '—';

    U.relativeTime = function (ts) {
        if (!ts) return '—';
        const diff = (ts - Date.now()) / 1000;
        const abs = Math.abs(diff);
        if (abs < 45) return 'à l’instant';
        if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
        if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
        if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), 'day');
        return 'le ' + U.formatDate(ts);
    };

    U.fileStamp = function () {
        const d = new Date();
        const p = n => String(n).padStart(2, '0');
        return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '_' + p(d.getHours()) + 'h' + p(d.getMinutes());
    };

    /* ---------- Objets ---------- */

    U.deepEqual = function deepEqual(a, b) {
        if (a === b) return true;
        if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
        if (Array.isArray(a) !== Array.isArray(b)) return false;
        const ka = Object.keys(a);
        const kb = Object.keys(b);
        if (ka.length !== kb.length) return false;
        for (const k of ka) if (!deepEqual(a[k], b[k])) return false;
        return true;
    };

    U.pick = function (obj, keys) {
        const out = {};
        for (const k of keys) if (obj && obj[k] !== undefined) out[k] = obj[k];
        return out;
    };

    /* ---------- Fichiers ---------- */

    U.download = function (data, filename, mime) {
        const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = U.h('a', { href: url, download: filename, style: 'display:none' });
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
    };

    U.readAsText = file => new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(r.error || new Error('Lecture du fichier impossible.'));
        r.readAsText(file);
    });

    U.readAsDataURL = blob => new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(r.error || new Error('Lecture du fichier impossible.'));
        r.readAsDataURL(blob);
    });

    /** Ouvre le sélecteur de fichiers natif. */
    U.pickFiles = function (opts) {
        opts = opts || {};
        return new Promise(resolve => {
            const input = U.h('input', { type: 'file', style: 'position:fixed;left:-9999px;opacity:0' });
            if (opts.accept) input.accept = opts.accept;
            if (opts.multiple) input.multiple = true;
            if (opts.directory) { input.webkitdirectory = true; input.setAttribute('webkitdirectory', ''); }
            let done = false;
            const finish = files => { if (done) return; done = true; input.remove(); resolve(files); };
            input.addEventListener('change', () => finish(Array.from(input.files || [])));
            input.addEventListener('cancel', () => finish([]));
            document.body.appendChild(input);
            input.click();
        });
    };

    const loadedScripts = new Map();
    /** Charge un script à la demande (une seule fois). */
    U.loadScript = function (src) {
        if (loadedScripts.has(src)) return loadedScripts.get(src);
        const p = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = () => resolve();
            s.onerror = () => { loadedScripts.delete(src); reject(new Error('Chargement de « ' + src + ' » impossible.')); };
            document.head.appendChild(s);
        });
        loadedScripts.set(src, p);
        return p;
    };

    U.copyText = async function (text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (e) {
            const ta = U.h('textarea', { style: 'position:fixed;left:-9999px' });
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            let ok = false;
            try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
            ta.remove();
            return ok;
        }
    };

    /* ---------- Stockage local (préférences d'interface) ---------- */

    // Préfixe hérité de l'ancien nom de l'application, conservé pour garder les préférences
    U.storage = {
        get(key, fallback) {
            try {
                const raw = localStorage.getItem('atelier-storymap:' + key);
                return raw === null ? fallback : JSON.parse(raw);
            } catch (e) { return fallback; }
        },
        set(key, value) {
            try { localStorage.setItem('atelier-storymap:' + key, JSON.stringify(value)); } catch (e) { /* stockage indisponible */ }
        },
        remove(key) {
            try { localStorage.removeItem('atelier-storymap:' + key); } catch (e) { /* ignore */ }
        }
    };

    /* ---------- Plateforme ---------- */

    U.isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    U.modKey = U.isMac ? '⌘' : 'Ctrl';
    /** Formate un raccourci « Mod+Shift+Z » pour l'affichage. */
    U.shortcutParts = function (combo) {
        return combo.split('+').map(k => {
            if (k === 'Mod') return U.modKey;
            if (k === 'Shift') return U.isMac ? '⇧' : 'Maj';
            if (k === 'Alt') return U.isMac ? '⌥' : 'Alt';
            if (k === 'Enter') return 'Entrée';
            if (k === 'Delete') return 'Suppr';
            if (k === 'Escape') return 'Échap';
            if (k === 'ArrowUp') return '↑';
            if (k === 'ArrowDown') return '↓';
            if (k === 'ArrowLeft') return '←';
            if (k === 'ArrowRight') return '→';
            if (k === 'Space') return 'Espace';
            if (k === 'PageUp') return 'Pg↑';
            if (k === 'PageDown') return 'Pg↓';
            return k;
        });
    };
    U.formatShortcut = combo => U.shortcutParts(combo).join(U.isMac ? '' : '+');

    /** Vérifie si l'événement clavier correspond à « Mod+Shift+Z ». */
    U.matchShortcut = function (e, combo) {
        const parts = combo.split('+');
        const key = parts.pop();
        const want = { mod: parts.includes('Mod'), shift: parts.includes('Shift'), alt: parts.includes('Alt') };
        const mod = U.isMac ? e.metaKey : e.ctrlKey;
        if (mod !== want.mod || e.shiftKey !== want.shift || e.altKey !== want.alt) return false;
        if (!U.isMac && e.metaKey) return false;
        if (String(e.key).toLowerCase() === key.toLowerCase()) return true;
        // Claviers non latins (cyrillique…) : repli sur la position physique de la touche.
        // Jamais pour une lettre latine, afin de respecter les dispositions AZERTY/QWERTZ.
        return key.length === 1 && e.key.length === 1 && !/^[a-z]$/i.test(e.key) && e.code === 'Key' + key.toUpperCase();
    };
})();
