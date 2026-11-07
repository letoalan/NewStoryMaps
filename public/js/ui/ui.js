/* ==========================================================================
   StoryMap — primitives d'interface (notifications, infobulles,
   menus, fenêtres modales, boutons)
   ========================================================================== */
(function () {
    'use strict';

    const SM = window.SM;
    const U = SM.util;
    const h = U.h;

    const UI = SM.ui = {};

    /* ---------- Boutons ---------- */

    /**
     * UI.button({ label, icon, variant: 'primary'|'ghost'|'danger'|'soft', size: 'sm'|'xs'|'lg',
     *             iconOnly, tip, shortcut, onClick, disabled, type, pressed, className })
     */
    UI.button = function (o) {
        const cls = ['btn'];
        if (o.variant) cls.push('btn-' + o.variant);
        if (o.size) cls.push('btn-' + o.size);
        if (o.iconOnly) cls.push('btn-icon');
        if (o.block) cls.push('btn-block');
        if (o.className) cls.push(o.className);
        const iconSize = o.iconSize || (o.size === 'xs' ? 14 : o.size === 'lg' ? 18 : 16);
        const btn = h('button', {
            type: o.type || 'button',
            class: cls.join(' '),
            disabled: !!o.disabled,
            'aria-label': o.iconOnly ? (o.tip || o.label) : null,
            'data-tip': o.tip || (o.iconOnly ? o.label : null),
            'data-shortcut': o.shortcut || null,
            'aria-pressed': o.pressed === undefined ? null : String(!!o.pressed),
            onclick: o.onClick || null
        },
            o.icon ? SM.icon(o.icon, iconSize) : null,
            o.iconOnly ? null : (o.label ? h('span', { class: 'btn-label' }, o.label) : null),
            o.trailingIcon ? SM.icon(o.trailingIcon, 14) : null
        );
        if (o.attrs) for (const k in o.attrs) btn.setAttribute(k, o.attrs[k]);
        return btn;
    };

    /* ---------- Notifications ---------- */

    let toastHost = null;
    const TOAST_ICONS = { success: 'check-circle', error: 'alert-circle', warning: 'alert', info: 'info', loading: 'loader' };

    /**
     * UI.toast(message, { type, action: { label, onClick }, duration })
     * @returns {{ dismiss: Function, update: Function }}
     */
    UI.toast = function (message, opts) {
        opts = opts || {};
        if (!toastHost) {
            toastHost = h('div', { class: 'toasts', 'aria-live': 'polite' });
            document.body.appendChild(toastHost);
        }
        const type = opts.type || 'info';
        const msg = h('div', { class: 'toast-msg' }, message);
        const iconEl = SM.icon(TOAST_ICONS[type] || 'info', 16, type === 'loading' ? 'spinner' : '');
        const el = h('div', { class: 'toast ' + type, role: type === 'error' ? 'alert' : 'status' }, iconEl, msg);
        let timer = null;
        let closed = false;
        const dismiss = () => {
            if (closed) return;
            closed = true;
            clearTimeout(timer);
            el.classList.add('leaving');
            setTimeout(() => el.remove(), 200);
        };
        if (opts.action) {
            el.appendChild(h('button', {
                class: 'toast-action', type: 'button',
                onclick: () => { dismiss(); opts.action.onClick(); }
            }, opts.action.label));
        }
        el.appendChild(h('button', { class: 'toast-close', type: 'button', 'aria-label': 'Fermer', onclick: dismiss }, SM.icon('x', 14)));
        toastHost.appendChild(el);
        while (toastHost.children.length > 4) toastHost.firstChild.remove();

        const duration = opts.duration !== undefined ? opts.duration : (type === 'loading' ? 0 : opts.action ? 7000 : type === 'error' ? 6500 : 3200);
        const arm = () => { if (duration > 0) timer = setTimeout(dismiss, duration); };
        el.addEventListener('mouseenter', () => clearTimeout(timer));
        el.addEventListener('mouseleave', arm);
        arm();
        return {
            dismiss,
            update(text, newType) {
                msg.textContent = text;
                if (newType && newType !== type) {
                    el.className = 'toast ' + newType;
                    const ic = SM.icon(TOAST_ICONS[newType] || 'info', 16);
                    iconEl.replaceWith(ic);
                    clearTimeout(timer);
                    timer = setTimeout(dismiss, newType === 'error' ? 6500 : 3200);
                }
            }
        };
    };

    /* ---------- Infobulles ---------- */

    let tipEl = null;
    let tipTarget = null;
    let tipTimer = null;
    let lastHide = 0;

    function showTip(target) {
        const text = target.getAttribute('data-tip');
        if (!text) return;
        if (!tipEl) {
            tipEl = h('div', { class: 'tooltip', role: 'tooltip' });
            document.body.appendChild(tipEl);
        }
        U.clear(tipEl);
        tipEl.appendChild(h('span', {}, text));
        const sc = target.getAttribute('data-shortcut');
        if (sc) {
            const keys = h('span', { style: 'display:inline-flex;gap:3px' });
            for (const k of U.shortcutParts(sc)) keys.appendChild(h('kbd', {}, k));
            tipEl.appendChild(keys);
        }
        tipEl.classList.remove('show');
        tipEl.style.left = '0px';
        tipEl.style.top = '0px';
        const r = target.getBoundingClientRect();
        const tr = tipEl.getBoundingClientRect();
        const place = target.getAttribute('data-tip-place') || 'bottom';
        let top = place === 'top' ? r.top - tr.height - 8 : place === 'right' ? r.top + r.height / 2 - tr.height / 2 : r.bottom + 8;
        let left = place === 'right' ? r.right + 8 : r.left + r.width / 2 - tr.width / 2;
        if (place === 'bottom' && top + tr.height > window.innerHeight - 6) top = r.top - tr.height - 8;
        if (place === 'top' && top < 6) top = r.bottom + 8;
        left = U.clamp(left, 6, window.innerWidth - tr.width - 6);
        top = U.clamp(top, 6, window.innerHeight - tr.height - 6);
        tipEl.style.left = left + 'px';
        tipEl.style.top = top + 'px';
        requestAnimationFrame(() => tipEl && tipEl.classList.add('show'));
    }

    function hideTip() {
        clearTimeout(tipTimer);
        if (tipEl && tipEl.classList.contains('show')) lastHide = Date.now();
        if (tipEl) tipEl.classList.remove('show');
        tipTarget = null;
    }

    UI.hideTooltip = hideTip;

    UI.initTooltips = function () {
        document.addEventListener('pointerover', e => {
            const t = e.target.closest && e.target.closest('[data-tip]');
            if (t === tipTarget) return;
            hideTip();
            if (!t || e.pointerType === 'touch') return;
            tipTarget = t;
            const delay = Date.now() - lastHide < 400 ? 60 : 450;
            tipTimer = setTimeout(() => { if (tipTarget === t && document.contains(t)) showTip(t); }, delay);
        });
        document.addEventListener('pointerout', e => {
            if (tipTarget && (!e.relatedTarget || !tipTarget.contains(e.relatedTarget))) hideTip();
        });
        document.addEventListener('focusin', e => {
            const t = e.target.closest && e.target.closest('[data-tip]');
            if (t && t.matches(':focus-visible')) { hideTip(); tipTarget = t; tipTimer = setTimeout(() => showTip(t), 350); }
        });
        document.addEventListener('focusout', hideTip);
        document.addEventListener('pointerdown', hideTip, true);
        document.addEventListener('keydown', hideTip, true);
        window.addEventListener('scroll', hideTip, true);
    };

    /* ---------- Menus ---------- */

    let openMenu = null;

    UI.closeMenu = function () {
        if (openMenu) openMenu.close();
    };

    /**
     * Ouvre un menu contextuel.
     * @param {Element|{x:number,y:number}} anchor
     * @param {Array} items  { label, icon, desc, shortcut, onClick, danger, disabled, checked } | '-' | { heading }
     * @param {object} [opts] { align: 'start'|'end', minWidth }
     */
    UI.menu = function (anchor, items, opts) {
        opts = opts || {};
        const wasOpenForSame = openMenu && openMenu.anchor === anchor;
        UI.closeMenu();
        if (wasOpenForSame) return null;

        const menu = h('div', { class: 'menu', role: 'menu', tabindex: '-1' });
        if (opts.minWidth) menu.style.minWidth = opts.minWidth + 'px';
        const buttons = [];
        for (const it of items) {
            if (!it) continue;
            if (it === '-') { menu.appendChild(h('div', { class: 'menu-sep', role: 'separator' })); continue; }
            if (it.heading) { menu.appendChild(h('div', { class: 'menu-label' }, it.heading)); continue; }
            const btn = h('button', {
                type: 'button', role: 'menuitem', class: 'menu-item' + (it.danger ? ' danger' : ''),
                disabled: !!it.disabled, tabindex: '-1'
            },
                it.icon ? SM.icon(it.icon, 16) : (opts.reserveIcon ? h('span', { style: 'width:16px' }) : null),
                h('span', { class: 'menu-text' },
                    h('span', { style: it.labelStyle || null }, it.label),
                    it.desc ? h('span', { class: 'menu-desc' }, it.desc) : null),
                it.checked ? SM.icon('check', 15, 'check') : null,
                it.shortcut ? h('span', { class: 'shortcut' }, U.formatShortcut(it.shortcut)) : null
            );
            btn.addEventListener('click', () => {
                close();
                if (it.onClick) it.onClick();
            });
            menu.appendChild(btn);
            buttons.push(btn);
        }
        document.body.appendChild(menu);

        // Positionnement
        const mr = menu.getBoundingClientRect();
        let x, y;
        if (anchor instanceof Element) {
            const r = anchor.getBoundingClientRect();
            x = opts.align === 'end' ? r.right - mr.width : r.left;
            y = r.bottom + 4;
            if (y + mr.height > window.innerHeight - 8) y = Math.max(8, r.top - mr.height - 4);
            anchor.setAttribute('aria-expanded', 'true');
        } else {
            x = anchor.x;
            y = anchor.y;
            if (y + mr.height > window.innerHeight - 8) y = Math.max(8, y - mr.height);
        }
        x = U.clamp(x, 8, window.innerWidth - mr.width - 8);
        y = U.clamp(y, 8, Math.max(8, window.innerHeight - mr.height - 8));
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';

        const focusAt = i => { if (buttons.length) buttons[(i + buttons.length) % buttons.length].focus(); };
        const current = () => buttons.indexOf(document.activeElement);

        const onKey = e => {
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); if (anchor instanceof Element) anchor.focus(); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); focusAt(current() + 1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); focusAt(current() < 0 ? -1 : current() - 1); }
            else if (e.key === 'Home') { e.preventDefault(); focusAt(0); }
            else if (e.key === 'End') { e.preventDefault(); focusAt(-1); }
            else if (e.key === 'Tab') { close(); }
        };
        const onDown = e => { if (!menu.contains(e.target) && !(anchor instanceof Element && anchor.contains(e.target))) close(); };
        const onScroll = e => { if (!menu.contains(e.target)) close(); };

        function close() {
            if (!menu.isConnected) return;
            menu.remove();
            document.removeEventListener('keydown', onKey, true);
            document.removeEventListener('pointerdown', onDown, true);
            window.removeEventListener('resize', close);
            window.removeEventListener('blur', close);
            document.removeEventListener('scroll', onScroll, true);
            if (anchor instanceof Element) anchor.setAttribute('aria-expanded', 'false');
            if (openMenu && openMenu.menu === menu) openMenu = null;
            if (opts.onClose) opts.onClose();
        }

        document.addEventListener('keydown', onKey, true);
        document.addEventListener('pointerdown', onDown, true);
        window.addEventListener('resize', close);
        window.addEventListener('blur', close);
        document.addEventListener('scroll', onScroll, true);
        openMenu = { menu, anchor, close };
        if (opts.focus !== false) requestAnimationFrame(() => (opts.keyboard ? focusAt(0) : menu.focus({ preventScroll: true })));
        return { close, el: menu };
    };

    UI.contextMenu = function (e, items, opts) {
        e.preventDefault();
        return UI.menu({ x: e.clientX, y: e.clientY }, items, opts);
    };

    /* ---------- Fenêtres modales ---------- */

    /**
     * UI.modal({ title, subtitle, icon, tone: 'danger'|'warning', body, footer, width,
     *            dismissible = true, onClose, className, initialFocus })
     * @returns {{ el, body, close(result), result: Promise }}
     */
    UI.modal = function (o) {
        const dialog = h('dialog', { class: 'modal' + (o.className ? ' ' + o.className : ''), 'aria-labelledby': null });
        if (o.width) dialog.style.setProperty('--modal-w', o.width + 'px');
        const titleId = U.uid('mt');
        let resolveResult;
        const result = new Promise(r => { resolveResult = r; });
        let closed = false;
        let returnValue;

        const close = value => {
            if (closed) return;
            closed = true;
            returnValue = value;
            try { dialog.close(); } catch (e) { /* ignore */ }
        };

        const header = h('div', { class: 'modal-header' },
            o.icon ? h('div', { class: 'modal-icon' + (o.tone ? ' ' + o.tone : '') }, SM.icon(o.icon, 18)) : null,
            h('div', { class: 'modal-titles' },
                h('h2', { class: 'modal-title', id: titleId }, o.title || ''),
                o.subtitle ? h('p', { class: 'modal-subtitle' }, o.subtitle) : null),
            o.dismissible === false ? null : UI.button({ icon: 'x', iconOnly: true, variant: 'ghost', size: 'sm', label: 'Fermer', className: 'modal-close', onClick: () => close(undefined) })
        );
        dialog.setAttribute('aria-labelledby', titleId);
        const body = h('div', { class: 'modal-body scroll' });
        if (o.body) U.append(body, [o.body]);
        dialog.appendChild(header);
        dialog.appendChild(body);
        let footer = null;
        if (o.footer) {
            footer = h('div', { class: 'modal-footer' });
            U.append(footer, [typeof o.footer === 'function' ? o.footer(close) : o.footer]);
            dialog.appendChild(footer);
        }

        dialog.addEventListener('cancel', e => {
            e.preventDefault();
            if (o.dismissible !== false) close(undefined);
        });
        dialog.addEventListener('mousedown', e => {
            if (e.target !== dialog || o.dismissible === false) return;
            const r = dialog.getBoundingClientRect();
            const outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
            if (outside) dialog.dataset.downOutside = '1';
        });
        dialog.addEventListener('click', e => {
            if (e.target !== dialog || o.dismissible === false) return;
            const r = dialog.getBoundingClientRect();
            const outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
            if (outside && dialog.dataset.downOutside === '1') close(undefined);
            delete dialog.dataset.downOutside;
        });
        dialog.addEventListener('close', () => {
            closed = true;
            UI.hideTooltip();
            setTimeout(() => dialog.remove(), 10);
            if (o.onClose) o.onClose(returnValue);
            resolveResult(returnValue);
        });

        document.body.appendChild(dialog);
        UI.closeMenu();
        dialog.showModal();
        const focusTarget = o.initialFocus ? (typeof o.initialFocus === 'string' ? dialog.querySelector(o.initialFocus) : o.initialFocus) :
            body.querySelector('[autofocus], input:not([type=hidden]):not([disabled]), textarea, select') ||
            (footer && footer.querySelector('.btn-primary, .btn-danger'));
        if (focusTarget) setTimeout(() => focusTarget.focus(), 30);
        return { el: dialog, body, footer, close, result };
    };

    /** Barre d'actions standard : [Annuler] [Action principale] */
    UI.modalActions = function (close, actions) {
        const frag = document.createDocumentFragment();
        for (const a of actions) {
            if (a === 'spacer') { frag.appendChild(h('div', { class: 'spacer' })); continue; }
            frag.appendChild(UI.button({
                label: a.label, icon: a.icon, variant: a.variant, disabled: a.disabled,
                onClick: async () => {
                    if (a.onClick) {
                        const r = await a.onClick();
                        if (r === false) return;
                        close(a.value !== undefined ? a.value : r);
                    } else close(a.value);
                }
            }));
        }
        return frag;
    };
})();
