/* ==========================================================================
   StoryMap — nettoyage du HTML
   --------------------------------------------------------------------------
   - safe()          : retire uniquement ce qui est dangereux (scripts,
                       gestionnaires on*, URL javascript:…). Utilisé à l'import
                       et lors de l'édition du code HTML.
   - paste()         : convertit un collage (Word, Google Docs, pages web…)
                       en HTML simple adapté aux panneaux (<br>, listes,
                       gras, italique, liens…).
   - cleanEditable() : normalise le contenu produit par la zone éditable.
   ========================================================================== */
(function () {
    'use strict';

    const SM = window.SM;
    const S = SM.sanitize = {};

    const XHTML = 'http://www.w3.org/1999/xhtml';

    const DANGEROUS_TAGS = new Set(['script', 'style', 'link', 'meta', 'base', 'object', 'embed', 'applet',
        'frame', 'frameset', 'noscript', 'template', 'animate', 'animatemotion', 'animatetransform', 'set', 'handler', 'listener']);
    const URL_ATTRS = new Set(['href', 'src', 'xlink:href', 'action', 'formaction', 'poster', 'background', 'data', 'lowsrc', 'dynsrc', 'cite', 'longdesc', 'manifest', 'codebase']);

    function cleanUrl(v) {
        return String(v || '').replace(/[\u0000-\u0020\u007F-\u009F]/g, '').toLowerCase();
    }

    function isSafeUrl(value, attr, tag) {
        const v = cleanUrl(value);
        if (/^(javascript|vbscript|livescript|mocha):/.test(v)) return false;
        if (v.startsWith('data:')) {
            if (attr === 'src' && (tag === 'img' || tag === 'source') && /^data:image\//.test(v)) return true;
            if (attr === 'src' && (tag === 'video' || tag === 'audio' || tag === 'source') && /^data:(video|audio)\//.test(v)) return true;
            if (attr === 'poster' && /^data:image\//.test(v)) return true;
            return false;
        }
        if (tag === 'iframe' && attr === 'src') return /^(https?:)?\/\//.test(v) || !/^[a-z][a-z0-9+.-]*:/.test(v);
        return true;
    }

    function parse(html) {
        return new DOMParser().parseFromString('<!DOCTYPE html><html><body>' + (html || ''), 'text/html');
    }

    /**
     * Retire les éléments et attributs dangereux. Si rien n'est retiré, la
     * chaîne d'origine est renvoyée telle quelle (aucune reformulation).
     * @returns {{html: string, changed: boolean}}
     */
    S.safeReport = function (html) {
        if (!html || typeof html !== 'string') return { html: html || '', changed: false };
        // Texte sans aucune balise : aucun élément ni attribut possible
        if (html.indexOf('<') === -1) return { html, changed: false };
        // Toujours analyser le DOM : une URL peut être déguisée par des entités
        // (ex. « java&#x09;script: ») qu'une simple recherche de texte ne voit pas.
        const doc = parse(html);
        let changed = false;
        const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
        const toRemove = [];
        let node = walker.nextNode();
        while (node) {
            const tag = node.localName.toLowerCase();
            if (DANGEROUS_TAGS.has(tag)) {
                toRemove.push(node);
            } else {
                for (const attr of Array.from(node.attributes)) {
                    const name = attr.name.toLowerCase();
                    if (name.startsWith('on') || name === 'srcdoc' || name === 'formaction' ||
                        (URL_ATTRS.has(name) && !isSafeUrl(attr.value, name, tag)) ||
                        (name === 'style' && /expression\s*\(|javascript:/i.test(attr.value))) {
                        node.removeAttribute(attr.name);
                        changed = true;
                    }
                }
            }
            node = walker.nextNode();
        }
        for (const n of toRemove) { n.remove(); changed = true; }
        return changed ? { html: doc.body.innerHTML, changed: true } : { html, changed: false };
    };

    S.safe = html => S.safeReport(html).html;

    /* ---------- Collage ---------- */

    const INLINE_MAP = { B: 'b', STRONG: 'strong', I: 'i', EM: 'em', U: 'u', S: 's', STRIKE: 's', DEL: 's', INS: 'u', SUB: 'sub', SUP: 'sup', CODE: 'code', KBD: 'code', SAMP: 'code' };
    const PARA_BLOCKS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'TABLE', 'FIGURE', 'ADDRESS', 'HR', 'DL', 'CENTER']);
    const LINE_BLOCKS = new Set(['DIV', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'MAIN', 'ASIDE', 'NAV', 'TR', 'DT', 'DD', 'FIGCAPTION', 'LI', 'TBODY', 'THEAD', 'TFOOT', 'CAPTION', 'DETAILS', 'SUMMARY']);
    const SKIP = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE', 'HEAD', 'NOSCRIPT', 'TEMPLATE', 'OBJECT', 'EMBED', 'IFRAME',
        'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'CANVAS', 'VIDEO', 'AUDIO', 'MAP', 'AREA', 'COLGROUP', 'COL', 'XML', 'SVG', 'MATH']);

    const isMarker = x => x && typeof x === 'object' && !(x instanceof Node);

    function convert(node) {
        const items = [];
        for (const child of Array.from(node.childNodes)) {
            if (child.nodeType === 3) {
                const text = child.nodeValue.replace(/[\s\u00a0]+/g, ' ');
                if (text) items.push(document.createTextNode(text));
                continue;
            }
            if (child.nodeType !== 1) continue;
            if (child.namespaceURI && child.namespaceURI !== XHTML) continue;
            const tag = child.tagName.toUpperCase();
            if (SKIP.has(tag) || tag.includes(':')) continue;

            if (tag === 'BR') { items.push({ br: 1 }); continue; }

            if (tag === 'IMG') {
                const src = child.getAttribute('src');
                if (src && isSafeUrl(src, 'src', 'img') && (/^data:image\//i.test(src) || /^https?:\/\//i.test(src))) {
                    const img = document.createElement('img');
                    img.setAttribute('src', src);
                    const alt = child.getAttribute('alt');
                    if (alt) img.setAttribute('alt', alt);
                    items.push(img);
                }
                continue;
            }

            if (tag === 'UL' || tag === 'OL') {
                const list = document.createElement(tag.toLowerCase());
                for (const li of Array.from(child.children)) {
                    const liEl = document.createElement('li');
                    render(li.tagName === 'LI' ? convert(li) : convert(li), liEl);
                    if (liEl.textContent.trim() || liEl.querySelector('img,ul,ol')) list.appendChild(liEl);
                }
                if (list.children.length) items.push(list);
                continue;
            }

            if (tag === 'A') {
                const href = child.getAttribute('href');
                const inner = convert(child);
                if (href && !href.startsWith('#') && isSafeUrl(href, 'href', 'a')) {
                    const a = document.createElement('a');
                    a.setAttribute('href', href);
                    a.setAttribute('target', '_blank');
                    render(inner, a);
                    if (a.textContent.trim() || a.querySelector('img')) items.push(a);
                } else {
                    items.push(...inner);
                }
                continue;
            }

            if (INLINE_MAP[tag]) {
                const fw = child.style && child.style.fontWeight;
                if ((tag === 'B' || tag === 'STRONG') && (fw === 'normal' || fw === '400')) { items.push(...convert(child)); continue; }
                const el = document.createElement(INLINE_MAP[tag]);
                render(convert(child), el);
                if (el.childNodes.length) items.push(el);
                continue;
            }

            if (tag === 'SPAN' || tag === 'FONT' || tag === 'MARK' || tag === 'SMALL' || tag === 'BIG' || tag === 'LABEL' || tag === 'ABBR' || tag === 'Q' || tag === 'CITE' || tag === 'TIME') {
                let inner = convert(child);
                const st = child.style || {};
                const wrap = [];
                const w = String(st.fontWeight || '');
                if (w === 'bold' || w === 'bolder' || (parseInt(w, 10) >= 600)) wrap.push('b');
                if (st.fontStyle === 'italic' || st.fontStyle === 'oblique') wrap.push('i');
                const deco = String(st.textDecoration || st.textDecorationLine || '');
                if (deco.includes('underline')) wrap.push('u');
                if (deco.includes('line-through')) wrap.push('s');
                if (st.verticalAlign === 'super') wrap.push('sup');
                if (st.verticalAlign === 'sub') wrap.push('sub');
                for (const t of wrap) {
                    const el = document.createElement(t);
                    render(inner, el);
                    inner = el.childNodes.length ? [el] : [];
                }
                items.push(...inner);
                continue;
            }

            if (PARA_BLOCKS.has(tag) || LINE_BLOCKS.has(tag)) {
                const n = PARA_BLOCKS.has(tag) ? 2 : 1;
                items.push({ br: n });
                let inner = convert(child);
                if (/^H[1-6]$/.test(tag)) {
                    const b = document.createElement('b');
                    render(inner, b);
                    inner = b.childNodes.length ? [b] : [];
                }
                if (tag === 'TD' || tag === 'TH') inner.push(document.createTextNode(' '));
                items.push(...inner);
                items.push({ br: n });
                continue;
            }

            // Élément inconnu : on garde son contenu
            items.push(...convert(child));
        }
        return items;
    }

    function render(items, target) {
        let pending = 0;
        let started = false;
        let afterList = false;
        for (const item of items) {
            if (isMarker(item)) { pending = Math.max(pending, item.br); continue; }
            const isList = item.nodeType === 1 && (item.tagName === 'UL' || item.tagName === 'OL');
            if (isList) {
                pending = 0;
                target.appendChild(item);
                started = true;
                afterList = true;
                continue;
            }
            if (item.nodeType === 3 && !item.nodeValue.trim() && (pending > 0 || !started || afterList)) continue;
            if (started && pending > 0 && !afterList) {
                for (let i = 0; i < Math.min(pending, 2); i++) target.appendChild(document.createElement('br'));
            }
            pending = 0;
            afterList = false;
            // Espaces superflus en début de ligne
            if (item.nodeType === 3 && (!started || (target.lastChild && target.lastChild.nodeName === 'BR'))) {
                item.nodeValue = item.nodeValue.replace(/^ +/, '');
                if (!item.nodeValue) continue;
            }
            target.appendChild(item);
            started = true;
        }
        return target;
    }

    /** Convertit du HTML collé en HTML simple adapté aux panneaux. */
    S.paste = function (html) {
        const doc = parse(html);
        const out = document.createElement('div');
        render(convert(doc.body), out);
        // Espaces multiples (laissés par les éléments retirés) et espaces de fin de ligne
        return out.innerHTML.replace(/ {2,}/g, ' ').replace(/ +(<br>)/g, '$1').trim();
    };

    /** Convertit du texte brut en HTML (retours à la ligne → <br>). */
    S.plainToHtml = function (text) {
        return SM.util.escapeHtml(String(text || '').replace(/\r\n?/g, '\n'))
            .replace(/\n{3,}/g, '\n\n')
            .replace(/\n/g, '<br>');
    };

    /* ---------- Sortie de la zone éditable ---------- */

    const KEEP_STYLE = new Set(['color', 'background-color']);

    function unwrap(el) {
        const parent = el.parentNode;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
    }

    /**
     * Normalise le contenu d'un élément contenteditable.
     * - vide → ''
     * - retire les <span style> parasites ajoutés par le navigateur
     * - <div> sans attribut → <p> (paragraphes)
     */
    S.cleanEditable = function (el) {
        const clone = el.cloneNode(true);
        clone.querySelectorAll('[data-ed]').forEach(n => n.remove());
        if (!clone.textContent.replace(/\u200b/g, '').trim() && !clone.querySelector('img,iframe,video,audio,hr,svg')) return '';

        clone.querySelectorAll('font').forEach(f => {
            const color = f.getAttribute('color');
            if (color) {
                const span = document.createElement('span');
                span.style.color = color;
                while (f.firstChild) span.appendChild(f.firstChild);
                f.replaceWith(span);
            } else {
                unwrap(f);
            }
        });

        // <span> : on conserve ceux qui portent uniquement une couleur choisie par
        // l'utilisateur ; les <span style="font-size…"> ajoutés par le navigateur
        // lors des fusions de lignes sont retirés (leur contenu est conservé).
        Array.from(clone.querySelectorAll('span')).reverse().forEach(sp => {
            const attrs = Array.from(sp.attributes).map(a => a.name);
            if (!attrs.length) { unwrap(sp); return; }
            if (attrs.length !== 1 || attrs[0] !== 'style') return; // span « métier » (classe…) : intact
            const props = [];
            for (let i = 0; i < sp.style.length; i++) props.push(sp.style[i]);
            if (!props.length || props.some(p => !KEEP_STYLE.has(p))) unwrap(sp);
        });

        clone.querySelectorAll('div').forEach(d => {
            if (!d.attributes.length) {
                const p = document.createElement('p');
                while (d.firstChild) p.appendChild(d.firstChild);
                d.replaceWith(p);
            }
        });

        // Supprime les caractères de largeur nulle éventuels
        let html = clone.innerHTML.replace(/\u200b/g, '');
        if (html === '<br>') html = '';
        return html;
    };
})();
