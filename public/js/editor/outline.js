/* ==========================================================================
   StoryMap — plan de la storymap (couverture, chapitres, pied de page)
   ========================================================================== */
(function () {
    'use strict';

    const SM = window.SM;
    const U = SM.util;
    const h = U.h;
    const UI = SM.ui;
    const M = SM.model;

    const DRAG_TYPE = 'application/x-storymap-chapter';

    class Outline {
        constructor(editor) {
            this.editor = editor;
            this.store = editor.store;
            this.dragId = null;
            this.build();
            this.render();
            this.unsub = this.store.subscribe(evt => {
                if (evt.type === 'selection') {
                    this.updateSelection(true);
                    // Navigation au clavier depuis le plan : le focus suit la sélection
                    if (this.list.contains(document.activeElement)) this.focusSelected();
                } else if (evt.type === 'change' && this.needsRender(evt)) this.render();
            });
        }

        destroy() {
            this.unsub();
        }

        build() {
            this.count = h('span', { class: 'badge' });
            const addTop = UI.button({ icon: 'plus', iconOnly: true, variant: 'ghost', size: 'sm', label: 'Nouveau chapitre', shortcut: 'Mod+Shift+Enter', onClick: () => this.editor.addChapter() });
            this.list = h('div', { class: 'ol-list scroll', role: 'listbox', 'aria-label': 'Plan de la storymap', tabindex: '-1' });
            this.indicator = h('div', { class: 'ol-drop-indicator', hidden: true });
            this.list.appendChild(this.indicator);
            this.addBtn = UI.button({ label: 'Ajouter un chapitre', icon: 'plus', variant: 'soft', block: true, onClick: () => this.editor.addChapter() });
            const fromData = UI.button({
                label: 'Chapitres à partir de données…', icon: 'geodata', variant: 'ghost', size: 'sm', block: true,
                tip: 'Un chapitre par lieu d’un fichier GeoJSON, KML ou GPX (titre, texte, image)', onClick: () => this.editor.chaptersFromData()
            });
            this.el = h('aside', { class: 'outline', 'aria-label': 'Plan' },
                h('div', { class: 'panel-head' },
                    h('h2', { class: 'panel-title' }, 'Plan', this.count),
                    addTop),
                this.list,
                h('div', { class: 'ol-foot' }, this.addBtn, fromData));

            this.list.addEventListener('keydown', e => this.onKey(e));
            this.list.addEventListener('dragover', e => this.onDragOver(e));
            this.list.addEventListener('drop', e => this.onDrop(e));
            this.list.addEventListener('dragleave', e => { if (!this.list.contains(e.relatedTarget)) this.indicator.hidden = true; });
        }

        needsRender(evt) {
            const a = evt.prev.chapters;
            const b = evt.config.chapters;
            if (a.length !== b.length || evt.prev.title !== evt.config.title || evt.prev.footer !== evt.config.footer) return true;
            for (let i = 0; i < a.length; i++) {
                const x = a[i];
                const y = b[i];
                if (x === y) continue;
                if (x.id !== y.id || x.title !== y.title || x.image !== y.image || x.hidden !== y.hidden || x.align !== y.align ||
                    x.rotate !== y.rotate || x.transition.type !== y.transition.type ||
                    x.layers.enter.length !== y.layers.enter.length || x.layers.exit.length !== y.layers.exit.length ||
                    (x.text !== y.text && M.hasContent(x.text) !== M.hasContent(y.text))) return true;
            }
            return false;
        }

        render() {
            const cfg = this.store.config;
            const scroll = this.list.scrollTop;
            Array.from(this.list.children).forEach(c => { if (c !== this.indicator) c.remove(); });
            this.count.textContent = String(cfg.chapters.length);

            this.list.appendChild(this.specialItem('cover', 'Couverture', cfg.title || cfg.subtitle || cfg.byline || 'En-tête vide (masqué)'));
            this.list.appendChild(h('div', { class: 'ol-section-label' }, 'Chapitres'));
            cfg.chapters.forEach((ch, i) => this.list.appendChild(this.chapterItem(ch, i)));
            this.list.appendChild(this.specialItem('footer', 'Pied de page', U.stripHtml(cfg.footer) ? U.truncate(U.stripHtml(cfg.footer), 60) : 'Vide (masqué)'));
            this.list.scrollTop = scroll;
            this.updateSelection(false);
        }

        specialItem(type, label, sub) {
            const item = h('div', { class: 'ol-item ol-special', role: 'option', tabindex: '-1', 'data-type': type },
                h('span', { class: 'ol-thumb ol-thumb-icon' }, SM.icon(type === 'cover' ? 'type' : 'panel-full', 16)),
                h('span', { class: 'ol-text' },
                    h('span', { class: 'ol-title' }, label),
                    h('span', { class: 'ol-meta' }, sub)));
            item.addEventListener('click', () => this.store.select({ type }));
            return item;
        }

        chapterItem(ch, i) {
            const title = (ch.title || '').trim();
            const thumb = h('span', { class: 'ol-thumb' });
            if (ch.image) {
                const img = h('img', { src: ch.image, alt: '', loading: 'lazy', decoding: 'async', draggable: 'false' });
                img.addEventListener('error', () => { U.clear(thumb); thumb.appendChild(SM.icon('alert', 15)); thumb.classList.add('ol-thumb-icon', 'warn'); });
                thumb.appendChild(img);
            } else {
                thumb.classList.add('ol-thumb-icon');
                thumb.appendChild(SM.icon((M.ALIGNMENTS.find(a => a.value === ch.align) || M.ALIGNMENTS[0]).icon, 16));
            }
            const flags = h('span', { class: 'ol-flags' });
            if (ch.hidden) flags.appendChild(h('span', { 'data-tip': 'Panneau masqué' }, SM.icon('eye-off', 13)));
            if (ch.rotate) flags.appendChild(h('span', { 'data-tip': 'Rotation lente' }, SM.icon('rotate', 13)));
            if (ch.layers.enter.length || ch.layers.exit.length) flags.appendChild(h('span', { 'data-tip': 'Règles de couches' }, SM.icon('layers', 13)));
            if (!ch.hidden && !title && !ch.image && !M.hasContent(ch.text)) flags.appendChild(h('span', { class: 'warn', 'data-tip': 'Panneau vide' }, SM.icon('alert', 13)));

            const align = (M.ALIGNMENTS.find(a => a.value === ch.align) || {}).label || 'Gauche';
            const anim = (M.ANIMATIONS.find(a => a.value === ch.transition.type) || {}).label || 'Vol';
            const more = UI.button({ icon: 'more', iconOnly: true, variant: 'ghost', size: 'xs', label: 'Actions du chapitre', className: 'ol-more' });
            more.addEventListener('click', e => { e.stopPropagation(); this.menu(i, more); });

            const item = h('div', {
                class: 'ol-item', role: 'option', tabindex: '-1', draggable: 'true', 'data-id': ch.id, 'data-index': String(i),
                'aria-label': 'Chapitre ' + (i + 1) + ' : ' + (title || 'sans titre')
            },
                h('span', { class: 'ol-grip', 'aria-hidden': 'true' }, SM.icon('grip', 14)),
                h('span', { class: 'ol-num' }, String(i + 1)),
                thumb,
                h('span', { class: 'ol-text' },
                    h('span', { class: 'ol-title' + (title ? '' : ' untitled') }, title || 'Chapitre sans titre'),
                    h('span', { class: 'ol-meta' }, align + ' · ' + anim, flags)),
                more);
            item.addEventListener('click', () => this.store.select({ type: 'chapter', id: ch.id }));
            item.addEventListener('dblclick', () => this.editor.focusChapterTitle());
            item.addEventListener('contextmenu', e => { e.preventDefault(); this.store.select({ type: 'chapter', id: ch.id }); this.menu(i, { x: e.clientX, y: e.clientY }); });
            item.addEventListener('dragstart', e => {
                this.dragId = ch.id;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData(DRAG_TYPE, ch.id);
                item.classList.add('dragging');
                UI.hideTooltip();
            });
            item.addEventListener('dragend', () => {
                this.dragId = null;
                item.classList.remove('dragging');
                this.indicator.hidden = true;
            });
            return item;
        }

        items() {
            return Array.from(this.list.querySelectorAll('.ol-item'));
        }

        updateSelection(scroll) {
            const sel = this.store.selection;
            let current = null;
            for (const it of this.items()) {
                const on = it.dataset.type ? it.dataset.type === sel.type : (sel.type === 'chapter' && it.dataset.id === sel.id);
                it.setAttribute('aria-selected', String(on));
                it.tabIndex = on ? 0 : -1;
                if (on) current = it;
            }
            if (current && scroll) current.scrollIntoView({ block: 'nearest' });
        }

        focusSelected() {
            const it = this.items().find(x => x.getAttribute('aria-selected') === 'true');
            if (it) it.focus();
        }

        menu(i, anchor) {
            const ch = this.store.config.chapters[i];
            const n = this.store.config.chapters.length;
            const ed = this.editor;
            UI.menu(anchor, [
                { label: 'Dupliquer', icon: 'copy', shortcut: 'Mod+D', onClick: () => ed.duplicateChapter(i) },
                { label: 'Nouveau chapitre après', icon: 'insert-below', shortcut: 'Mod+Shift+Enter', onClick: () => ed.addChapter(i) },
                '-',
                { label: 'Monter', icon: 'move-up', shortcut: 'Mod+Shift+ArrowUp', disabled: i === 0, onClick: () => ed.moveChapter(i, i - 1) },
                { label: 'Descendre', icon: 'move-down', shortcut: 'Mod+Shift+ArrowDown', disabled: i === n - 1, onClick: () => ed.moveChapter(i, i + 1) },
                '-',
                { label: ch.hidden ? 'Afficher le panneau' : 'Masquer le panneau', icon: ch.hidden ? 'eye' : 'eye-off', onClick: () => ed.toggleHidden(i) },
                { label: 'Supprimer', icon: 'trash', shortcut: 'Delete', danger: true, disabled: n <= 1, onClick: () => ed.removeChapter(i) }
            ], { align: anchor instanceof Element ? 'end' : undefined, minWidth: 240 });
        }

        onKey(e) {
            const items = this.items();
            const cur = items.indexOf(document.activeElement);
            if (cur < 0) return;
            const it = items[cur];
            const chapterIdx = it.dataset.index !== undefined ? Number(it.dataset.index) : -1;
            const go = k => {
                const target = items[U.clamp(k, 0, items.length - 1)];
                target.click();
                target.focus();
            };
            if (U.matchShortcut(e, 'Mod+Shift+ArrowUp') || U.matchShortcut(e, 'Alt+Shift+ArrowUp')) {
                if (chapterIdx > 0) { e.preventDefault(); this.editor.moveChapter(chapterIdx, chapterIdx - 1); requestAnimationFrame(() => this.focusSelected()); }
                return;
            }
            if (U.matchShortcut(e, 'Mod+Shift+ArrowDown') || U.matchShortcut(e, 'Alt+Shift+ArrowDown')) {
                if (chapterIdx >= 0) { e.preventDefault(); this.editor.moveChapter(chapterIdx, chapterIdx + 1); requestAnimationFrame(() => this.focusSelected()); }
                return;
            }
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            // Flèches et Espace : navigation commune à tout l'éditeur (← → Espace ↑ ↓)
            if (e.key === 'Home') { e.preventDefault(); go(0); }
            else if (e.key === 'End') { e.preventDefault(); go(items.length - 1); }
            else if (e.key === 'Enter') { e.preventDefault(); this.editor.focusChapterTitle(); }
            else if ((e.key === 'Delete' || e.key === 'Backspace') && chapterIdx >= 0) { e.preventDefault(); this.editor.removeChapter(chapterIdx); requestAnimationFrame(() => this.focusSelected()); }
            else if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) { if (chapterIdx >= 0) { e.preventDefault(); this.menu(chapterIdx, it.querySelector('.ol-more') || it); } }
        }

        /* ---------- Glisser-déposer ---------- */

        dropIndex(clientY) {
            const chapterItems = this.items().filter(x => x.dataset.id);
            for (let k = 0; k < chapterItems.length; k++) {
                const r = chapterItems[k].getBoundingClientRect();
                if (clientY < r.top + r.height / 2) return { index: k, el: chapterItems[k], before: true };
            }
            const last = chapterItems[chapterItems.length - 1];
            return { index: chapterItems.length, el: last, before: false };
        }

        onDragOver(e) {
            if (!this.dragId || !Array.from(e.dataTransfer.types || []).includes(DRAG_TYPE)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const target = this.dropIndex(e.clientY);
            if (!target.el) return;
            const lr = this.list.getBoundingClientRect();
            const r = target.el.getBoundingClientRect();
            const y = (target.before ? r.top - 3 : r.bottom + 1) - lr.top + this.list.scrollTop;
            this.indicator.style.top = Math.round(y) + 'px';
            this.indicator.hidden = false;
        }

        onDrop(e) {
            if (!this.dragId) return;
            e.preventDefault();
            this.indicator.hidden = true;
            const from = this.store.config.chapters.findIndex(c => c.id === this.dragId);
            let to = this.dropIndex(e.clientY).index;
            if (from < 0) return;
            if (to > from) to--;
            this.dragId = null;
            if (to !== from) this.editor.moveChapter(from, to);
        }
    }

    SM.Outline = Outline;
})();
