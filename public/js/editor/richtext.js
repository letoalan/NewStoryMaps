/* ==========================================================================
   StoryMap — édition de texte directement dans le rendu
   --------------------------------------------------------------------------
   - Zones « texte brut » (titres) : contenteditable="plaintext-only".
   - Zones « texte riche » (description, pied de page) : barre d'outils
     flottante, Entrée = saut de ligne <br>, collage
     nettoyé, édition du code HTML.
   ========================================================================== */
(function () {
    'use strict';

    const SM = window.SM;
    const U = SM.util;
    const h = U.h;
    const UI = SM.ui;

    const COLORS = [
        { value: '#ffffff', label: 'Blanc' }, { value: '#fafafa', label: 'Blanc cassé' }, { value: '#bfc5cc', label: 'Gris clair' },
        { value: '#444444', label: 'Gris foncé' }, { value: '#000000', label: 'Noir' }, { value: '#e03131', label: 'Rouge' },
        { value: '#f08c00', label: 'Orange' }, { value: '#fcc419', label: 'Jaune' }, { value: '#2f9e44', label: 'Vert' },
        { value: '#3fb1ce', label: 'Cyan' }, { value: '#1c7ed6', label: 'Bleu' }, { value: '#7048e8', label: 'Violet' }
    ];

    let plaintextSupported = null;
    function supportsPlaintextOnly() {
        if (plaintextSupported !== null) return plaintextSupported;
        const d = document.createElement('div');
        try { d.contentEditable = 'plaintext-only'; plaintextSupported = d.contentEditable === 'plaintext-only'; } catch (e) { plaintextSupported = false; }
        return plaintextSupported;
    }

    function insertHtmlAtCaret(html) {
        document.execCommand('insertHTML', false, html);
    }

    function insertText(text) {
        if (!document.execCommand('insertText', false, text)) {
            const sel = window.getSelection();
            if (!sel.rangeCount) return;
            const r = sel.getRangeAt(0);
            r.deleteContents();
            r.insertNode(document.createTextNode(text));
            r.collapse(false);
        }
    }

    function closestInside(node, selector, root) {
        let n = node && node.nodeType === 3 ? node.parentNode : node;
        while (n && n !== root) {
            if (n.nodeType === 1 && n.matches(selector)) return n;
            n = n.parentNode;
        }
        return null;
    }

    /** Transforme une URL YouTube / Vimeo en adresse d'intégration. */
    function videoEmbedUrl(url) {
        let m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/i.exec(url);
        if (m) return 'https://www.youtube-nocookie.com/embed/' + m[1];
        m = /vimeo\.com\/(?:video\/)?(\d+)/i.exec(url);
        if (m) return 'https://player.vimeo.com/video/' + m[1];
        if (/^https:\/\//i.test(url)) return url;
        return null;
    }

    class RichText {
        constructor(host) {
            this.host = host;
            this.active = null;
            this.activeOpts = null;
            this.savedRange = null;
            this.buildToolbar();
            this.onSelection = () => this.updateState();
            document.addEventListener('selectionchange', this.onSelection);
            this.onScroll = () => this.position();
            window.addEventListener('resize', this.onScroll);
        }

        destroy() {
            document.removeEventListener('selectionchange', this.onSelection);
            window.removeEventListener('resize', this.onScroll);
            this.toolbar.remove();
        }

        /* ---------- Barre d'outils ---------- */

        buildToolbar() {
            const btn = (icon, label, shortcut, fn, extra) => {
                const b = h('button', { type: 'button', class: 'rt-btn', 'data-tip': label, 'data-shortcut': shortcut || null, 'aria-label': label, 'data-tip-place': 'top' }, SM.icon(icon, 16));
                if (extra) Object.assign(b.dataset, extra);
                // Conserve la sélection dans la zone éditable
                b.addEventListener('mousedown', e => e.preventDefault());
                b.addEventListener('click', e => { e.preventDefault(); fn(b); });
                return b;
            };
            const sep = () => h('span', { class: 'rt-sep' });
            this.buttons = {
                bold: btn('bold', 'Gras', 'Mod+B', () => this.exec('bold'), { cmd: 'bold' }),
                italic: btn('italic', 'Italique', 'Mod+I', () => this.exec('italic'), { cmd: 'italic' }),
                underline: btn('underline', 'Souligné', 'Mod+U', () => this.exec('underline'), { cmd: 'underline' }),
                strike: btn('strike', 'Barré', null, () => this.exec('strikeThrough'), { cmd: 'strikeThrough' }),
                link: btn('link', 'Lien', 'Mod+K', () => this.linkDialog()),
                ul: btn('list', 'Liste à puces', null, () => this.exec('insertUnorderedList'), { cmd: 'insertUnorderedList' }),
                ol: btn('list-ordered', 'Liste numérotée', null, () => this.exec('insertOrderedList'), { cmd: 'insertOrderedList' }),
                color: btn('palette', 'Couleur du texte', null, b => this.colorMenu(b)),
                clear: btn('clear-format', 'Effacer la mise en forme', null, () => this.clearFormat()),
                image: btn('image-plus', 'Insérer une image dans le texte', null, () => this.insertImage()),
                video: btn('video', 'Insérer une vidéo (YouTube, Vimeo)', null, () => this.insertVideo()),
                code: btn('code', 'Modifier le code HTML', null, () => this.codeDialog())
            };
            const b = this.buttons;
            this.toolbar = h('div', { class: 'rt-toolbar', role: 'toolbar', 'aria-label': 'Mise en forme du texte' },
                b.bold, b.italic, b.underline, b.strike, sep(), b.link, sep(), b.ul, b.ol, sep(), b.color, b.clear, sep(), b.image, b.video, sep(), b.code);
            this.host.appendChild(this.toolbar);
        }

        show() {
            if (!this.active || !this.activeOpts.rich) return;
            this.toolbar.classList.add('show');
            this.position();
            this.updateState();
        }

        hide() {
            this.toolbar.classList.remove('show');
        }

        position() {
            if (!this.active || !this.toolbar.classList.contains('show')) return;
            const r = this.active.getBoundingClientRect();
            const bounds = (this.activeOpts.bounds && this.activeOpts.bounds()) || { top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight };
            const tb = this.toolbar.getBoundingClientRect();
            let top = r.top - tb.height - 10;
            if (top < bounds.top + 6) top = Math.min(r.bottom + 10, bounds.bottom - tb.height - 6);
            top = Math.max(bounds.top + 6, top);
            let left = r.left + Math.min(0, (r.width - tb.width) / 2);
            left = U.clamp(left, bounds.left + 6, bounds.right - tb.width - 6);
            this.toolbar.style.top = Math.round(top) + 'px';
            this.toolbar.style.left = Math.round(left) + 'px';
        }

        updateState() {
            if (!this.active || !this.toolbar.classList.contains('show')) return;
            const sel = window.getSelection();
            if (!sel.rangeCount || !this.active.contains(sel.anchorNode)) return;
            for (const key of ['bold', 'italic', 'underline', 'strike', 'ul', 'ol']) {
                const b = this.buttons[key];
                let on = false;
                try { on = document.queryCommandState(b.dataset.cmd); } catch (e) { on = false; }
                b.classList.toggle('on', on);
            }
            this.buttons.link.classList.toggle('on', !!closestInside(sel.anchorNode, 'a', this.active));
        }

        /** Retrouve la zone éditable active (même si l'événement focus a été manqué). */
        ensureActive() {
            if (this.active && this.active.isConnected) return true;
            const el = document.activeElement;
            if (el && el.__rtOpts) {
                this.active = el;
                this.activeOpts = el.__rtOpts;
                return true;
            }
            return false;
        }

        exec(cmd, value) {
            if (!this.ensureActive()) return;
            this.active.focus();
            document.execCommand(cmd, false, value);
            this.emitChange();
            this.updateState();
        }

        clearFormat() {
            this.exec('removeFormat');
            this.exec('unlink');
        }

        emitChange() {
            if (this.active && this.activeOpts) {
                const value = this.serialize(this.active, this.activeOpts);
                this.active.__smValue = value;
                if (this.activeOpts.onChange) this.activeOpts.onChange(value);
            }
            this.position();
        }

        serialize(el, opts) {
            if (opts.rich) return SM.sanitize.cleanEditable(el);
            return (el.textContent || '').replace(/[\r\n]+/g, ' ');
        }

        /** Mémorise la zone éditable active et sa sélection (avant une boîte de dialogue). */
        saveSelection() {
            const sel = window.getSelection();
            this.savedEl = this.active;
            this.savedOpts = this.activeOpts;
            if (sel.rangeCount && this.active && this.active.contains(sel.anchorNode)) this.savedRange = sel.getRangeAt(0).cloneRange();
            else this.savedRange = null;
            return this.savedRange;
        }

        /** Rend le focus à la zone mémorisée et restaure sa sélection. */
        restoreSelection() {
            const el = this.savedEl || this.active;
            if (!el || !el.isConnected) return false;
            el.focus({ preventScroll: true });
            this.active = el;
            this.activeOpts = this.savedOpts || this.activeOpts;
            const sel = window.getSelection();
            sel.removeAllRanges();
            if (this.savedRange && el.contains(this.savedRange.startContainer)) {
                sel.addRange(this.savedRange);
            } else {
                const r = document.createRange();
                r.selectNodeContents(el);
                r.collapse(false);
                sel.addRange(r);
            }
            return true;
        }

        /* ---------- Couleur ---------- */

        colorMenu(anchor) {
            if (!this.ensureActive()) return;
            this.saveSelection();
            const pop = h('div', { class: 'rt-colors' });
            const apply = color => {
                close();
                if (!this.restoreSelection()) return;
                document.execCommand('styleWithCSS', false, true);
                document.execCommand('foreColor', false, color);
                document.execCommand('styleWithCSS', false, false);
                this.emitChange();
            };
            for (const c of COLORS) {
                const b = h('button', { type: 'button', 'data-tip': c.label, 'aria-label': c.label, style: 'background:' + c.value });
                b.addEventListener('mousedown', e => e.preventDefault());
                b.addEventListener('click', () => apply(c.value));
                pop.appendChild(b);
            }
            const reset = h('button', { type: 'button', class: 'rt-color-reset' }, SM.icon('x', 13), 'Couleur par défaut');
            reset.addEventListener('mousedown', e => e.preventDefault());
            reset.addEventListener('click', () => apply('inherit'));
            pop.appendChild(reset);
            const r = anchor.getBoundingClientRect();
            const box = h('div', { class: 'menu rt-color-menu', role: 'dialog', 'aria-label': 'Couleur du texte' }, pop);
            box.addEventListener('mousedown', e => e.preventDefault()); // garde le focus dans le texte
            document.body.appendChild(box);
            const bw = box.getBoundingClientRect();
            box.style.left = U.clamp(r.left, 8, window.innerWidth - bw.width - 8) + 'px';
            box.style.top = (r.bottom + 6 + bw.height > window.innerHeight ? r.top - bw.height - 6 : r.bottom + 6) + 'px';
            const onDown = e => { if (!box.contains(e.target)) close(); };
            const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); close(); this.restoreSelection(); } };
            function close() {
                box.remove();
                document.removeEventListener('pointerdown', onDown, true);
                document.removeEventListener('keydown', onKey, true);
            }
            setTimeout(() => {
                document.addEventListener('pointerdown', onDown, true);
                document.addEventListener('keydown', onKey, true);
            }, 0);
        }

        /* ---------- Liens ---------- */

        async linkDialog() {
            if (!this.ensureActive()) return;
            this.saveSelection();
            const sel = window.getSelection();
            const existing = this.savedRange ? closestInside(this.savedRange.commonAncestorContainer, 'a', this.active) : null;
            const selectedText = this.savedRange ? this.savedRange.toString() : '';
            const url = UI.textInput({ value: existing ? existing.getAttribute('href') : '', placeholder: 'https://…', type: 'url', blurOnEnter: false });
            const text = UI.textInput({ value: existing ? existing.textContent : selectedText, placeholder: 'Texte affiché' });
            const blank = UI.toggle({ checked: existing ? existing.getAttribute('target') === '_blank' : true });
            const needText = !existing && !selectedText;
            const body = h('div', {},
                UI.field('Adresse (URL)', url),
                needText ? UI.field('Texte du lien', text, { hint: 'Laissé vide, l’adresse sera affichée.' }) : null,
                UI.fieldRow('Ouvrir dans un nouvel onglet', blank));
            let modal;
            const submit = () => {
                let href = url.get().trim();
                if (!href) { url.input.setAttribute('aria-invalid', 'true'); url.input.focus(); return; }
                if (!/^([a-z][a-z0-9+.-]*:|#|\/|\.)/i.test(href)) href = (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(href) ? 'mailto:' : 'https://') + href;
                if (/^\s*(javascript|vbscript):/i.test(href)) { UI.toast('Adresse non autorisée.', { type: 'error' }); return; }
                modal.close({ href, text: text.get().trim(), blank: blank.get() });
            };
            url.input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
            modal = UI.modal({
                title: existing ? 'Modifier le lien' : 'Insérer un lien', icon: 'link', width: 460, body,
                footer: close => {
                    const actions = [];
                    if (existing) actions.push({ label: 'Retirer le lien', variant: 'ghost', icon: 'unlink', value: { remove: true } }, 'spacer');
                    actions.push({ label: 'Annuler', value: null }, { label: existing ? 'Mettre à jour' : 'Insérer', variant: 'primary', onClick: () => { submit(); return false; } });
                    return UI.modalActions(close, actions);
                }
            });
            const res = await modal.result;
            if (!this.restoreSelection()) return;
            if (!res) return;
            if (res.remove && existing) {
                const r = document.createRange();
                r.selectNodeContents(existing);
                sel.removeAllRanges();
                sel.addRange(r);
                document.execCommand('unlink');
            } else if (existing) {
                existing.setAttribute('href', res.href);
                if (res.blank) existing.setAttribute('target', '_blank'); else existing.removeAttribute('target');
            } else if (this.savedRange && !this.savedRange.collapsed) {
                document.execCommand('createLink', false, res.href);
                this.active.querySelectorAll('a[href]').forEach(a => {
                    if (a.getAttribute('href') !== res.href) return;
                    if (res.blank) a.setAttribute('target', '_blank'); else a.removeAttribute('target');
                });
            } else {
                const label = U.escapeHtml(res.text || res.href);
                insertHtmlAtCaret('<a href="' + U.escapeHtml(res.href) + '"' + (res.blank ? ' target="_blank"' : '') + '>' + label + '</a>&nbsp;');
            }
            this.emitChange();
        }

        /* ---------- Médias dans le texte ---------- */

        async insertImage() {
            if (!this.ensureActive()) return;
            this.saveSelection();
            const [file] = await U.pickFiles({ accept: SM.images.ACCEPT });
            if (!file) { this.restoreSelection(); return; }
            try {
                const res = await SM.images.fromFile(file);
                // Le texte d'origine n'existe plus (autre chapitre affiché) : on n'insère rien ailleurs
                if (!this.restoreSelection()) {
                    UI.toast('L’image n’a pas été insérée : le texte d’origine n’est plus affiché.', { type: 'warning' });
                    return;
                }
                insertHtmlAtCaret('<img src="' + res.src + '" alt="">');
                this.emitChange();
                if (res.optimized) UI.toast('Image optimisée : ' + U.formatBytes(res.originalBytes) + ' → ' + U.formatBytes(res.bytes) + '.', { type: 'success' });
            } catch (e) {
                UI.toast(e.message, { type: 'error' });
            }
        }

        async insertVideo() {
            if (!this.ensureActive()) return;
            this.saveSelection();
            const value = await UI.prompt({
                title: 'Insérer une vidéo', icon: 'video', label: 'Adresse de la vidéo', placeholder: 'https://www.youtube.com/watch?v=…',
                hint: 'YouTube, Vimeo ou toute adresse https intégrable. La vidéo occupe toute la largeur du panneau.',
                confirmLabel: 'Insérer',
                validate: v => (videoEmbedUrl(v.trim()) ? null : 'Adresse non reconnue (https requis).')
            });
            const restored = this.restoreSelection();
            if (!value || !restored) return;
            const src = videoEmbedUrl(value.trim());
            insertHtmlAtCaret('<iframe src="' + U.escapeHtml(src) + '" style="width:100%;aspect-ratio:16/9;border:0;display:block" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe><br>');
            this.emitChange();
        }

        /* ---------- Code HTML ---------- */

        async codeDialog(el, opts) {
            const target = el || this.active;
            const o = opts || this.activeOpts;
            if (!target || !o) return;
            const current = o.getValue ? o.getValue() : this.serialize(target, o);
            const ta = UI.textInput({ value: current, multiline: true, code: true, rows: 14, spellcheck: false });
            ta.input.style.minHeight = '280px';
            const body = h('div', {},
                h('p', {}, 'Le HTML est inséré tel quel dans la storymap (balises autorisées : mise en forme, liens, listes, images, iframes…). Les scripts et gestionnaires d’événements sont retirés.'),
                ta.el);
            const res = await UI.modal({
                title: o.codeTitle || 'Code HTML', icon: 'code', width: 680, body,
                footer: close => UI.modalActions(close, [
                    { label: 'Annuler', value: null },
                    { label: 'Appliquer', variant: 'primary', onClick: () => ta.get() }
                ])
            }).result;
            if (res === null || res === undefined) return;
            const safe = SM.sanitize.safeReport(res.trim());
            if (safe.changed) UI.toast('Du code potentiellement dangereux a été retiré.', { type: 'warning' });
            if (o.onCode) o.onCode(safe.html);
            else if (o.onChange) { target.innerHTML = safe.html; target.__smValue = safe.html; o.onChange(safe.html); }
        }

        /* ---------- Liaison des zones éditables ---------- */

        /**
         * @param {HTMLElement} el
         * @param {object} opts { rich, placeholder, onChange(value), onCommit(), onEnter(), bounds(), getValue(), onCode(html), codeTitle }
         */
        bind(el, opts) {
            opts = Object.assign({ rich: false }, opts);
            el.__rtOpts = opts;
            if (opts.rich) el.contentEditable = 'true';
            else if (supportsPlaintextOnly()) el.contentEditable = 'plaintext-only';
            else el.contentEditable = 'true';
            el.spellcheck = true;
            el.setAttribute('role', 'textbox');
            if (opts.rich) el.setAttribute('aria-multiline', 'true');
            if (opts.placeholder) el.setAttribute('data-placeholder', opts.placeholder);
            if (opts.label) el.setAttribute('aria-label', opts.label);

            el.addEventListener('focus', () => {
                this.active = el;
                this.activeOpts = opts;
                if (opts.rich) {
                    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* ignore */ }
                    this.show();
                } else this.hide();
                if (opts.onFocus) opts.onFocus();
            });
            el.addEventListener('blur', () => {
                // Nettoie les zones vides (pour afficher l'indication)
                if (!el.textContent.trim() && !el.querySelector('img,iframe,video')) { el.innerHTML = ''; el.__smValue = ''; }
                setTimeout(() => {
                    if (document.activeElement !== el && this.active === el) {
                        this.active = null;
                        this.hide();
                    }
                }, 0);
                if (opts.onCommit) opts.onCommit();
            });
            el.addEventListener('input', () => {
                const value = this.serialize(el, opts);
                // Le rendu (canvas.setHtml) compare avec cette valeur : elle doit refléter le contenu affiché
                el.__smValue = value;
                if (opts.onChange) opts.onChange(value);
                this.position();
            });
            el.addEventListener('keydown', e => {
                if (e.key === 'Escape') { e.preventDefault(); el.blur(); return; }
                if (!opts.rich) {
                    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                        e.preventDefault();
                        if (opts.onEnter) opts.onEnter(); else el.blur();
                    }
                    // Pas de mise en forme dans les titres
                    if ((e.ctrlKey || e.metaKey) && ['b', 'i', 'u'].includes(e.key.toLowerCase())) e.preventDefault();
                    return;
                }
                if (U.matchShortcut(e, 'Mod+K')) { e.preventDefault(); this.linkDialog(); return; }
                if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    const sel = window.getSelection();
                    if (sel.rangeCount && closestInside(sel.anchorNode, 'li', el)) return; // nouvelle puce
                    e.preventDefault();
                    if (!document.execCommand('insertLineBreak')) insertHtmlAtCaret('<br>');
                }
            });
            el.addEventListener('paste', e => {
                const cd = e.clipboardData;
                if (!cd) return;
                // Image collée : gérée par le panneau (image du chapitre)
                if (!cd.getData('text/plain') && Array.from(cd.items || []).some(i => i.kind === 'file' && i.type.startsWith('image/'))) return;
                e.preventDefault();
                if (!opts.rich) {
                    insertText(cd.getData('text/plain').replace(/\s*[\r\n]+\s*/g, ' '));
                    return;
                }
                const html = cd.getData('text/html');
                const clean = html ? SM.sanitize.paste(html) : SM.sanitize.plainToHtml(cd.getData('text/plain'));
                if (clean) insertHtmlAtCaret(clean);
            });
            el.addEventListener('drop', e => {
                const dt = e.dataTransfer;
                if (!dt || (dt.files && dt.files.length)) return; // fichiers : gérés par le panneau
                e.preventDefault();
                let range = null;
                if (document.caretRangeFromPoint) range = document.caretRangeFromPoint(e.clientX, e.clientY);
                else if (document.caretPositionFromPoint) {
                    const p = document.caretPositionFromPoint(e.clientX, e.clientY);
                    if (p) { range = document.createRange(); range.setStart(p.offsetNode, p.offset); }
                }
                el.focus();
                if (range) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(range); }
                const html = dt.getData('text/html');
                const text = dt.getData('text/plain') || '';
                if (opts.rich) insertHtmlAtCaret(html ? SM.sanitize.paste(html) : SM.sanitize.plainToHtml(text));
                else insertText(text.replace(/\s*[\r\n]+\s*/g, ' '));
            });
        }
    }

    RichText.videoEmbedUrl = videoEmbedUrl;
    SM.RichText = RichText;
})();
