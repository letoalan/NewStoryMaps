/* ==========================================================================
   StoryMap — contrôles de formulaire
   Chaque contrôle renvoie { el, set(value), get() } ; set() n'écrase jamais
   un champ en cours de saisie.
   ========================================================================== */
(function () {
    'use strict';

    const SM = window.SM;
    const U = SM.util;
    const h = U.h;
    const UI = SM.ui;

    const isFocused = el => document.activeElement === el;

    /* ---------- Interrupteur ---------- */

    UI.toggle = function (o) {
        const input = h('input', { type: 'checkbox', role: 'switch', checked: !!o.checked, disabled: !!o.disabled, 'aria-label': o.label || null });
        if (o.id) input.id = o.id;
        input.addEventListener('change', () => o.onChange && o.onChange(input.checked));
        const el = h('span', { class: 'switch' }, input, h('span', { class: 'track' }), h('span', { class: 'thumb' }));
        return {
            el, input,
            set(v) { input.checked = !!v; },
            get: () => input.checked,
            disable(d) { input.disabled = !!d; }
        };
    };

    /* ---------- Contrôle segmenté ---------- */

    UI.segmented = function (o) {
        let value = o.value;
        const el = h('div', { class: 'segmented' + (o.large ? ' segmented-lg' : ''), role: 'group', 'aria-label': o.label || null });
        const buttons = o.options.map(opt => {
            const b = h('button', {
                type: 'button', 'aria-pressed': String(opt.value === value),
                'data-tip': opt.tip || (o.iconOnly ? opt.label : null)
            },
                opt.icon ? SM.icon(opt.icon, o.large ? 20 : 15) : null,
                o.iconOnly ? h('span', { class: 'visually-hidden' }, opt.label) : h('span', {}, opt.short || opt.label));
            b.addEventListener('click', () => {
                if (value === opt.value && !o.allowSame) return;
                set(opt.value);
                if (o.onChange) o.onChange(opt.value);
            });
            el.appendChild(b);
            return b;
        });
        function set(v) {
            value = v;
            o.options.forEach((opt, i) => buttons[i].setAttribute('aria-pressed', String(opt.value === v)));
        }
        return { el, set, get: () => value };
    };

    /* ---------- Champ numérique ---------- */

    function fmt(v, decimals) {
        if (v === undefined || v === null || v === '' || !isFinite(v)) return '';
        return decimals === undefined ? String(v) : String(U.round(v, decimals));
    }

    UI.numberInput = function (o) {
        const input = h('input', {
            type: 'number', class: 'input num-input' + (o.unit ? ' has-unit' : '') + (o.className ? ' ' + o.className : ''),
            step: o.step || 'any', min: o.min, max: o.max, placeholder: o.placeholder || '',
            'aria-label': o.label || null, inputmode: 'decimal'
        });
        input.value = fmt(o.value, o.decimals);
        const read = () => {
            if (input.value.trim() === '') return o.allowEmpty ? undefined : null;
            let v = Number(input.value.replace(',', '.'));
            if (!isFinite(v)) return null;
            if (o.min !== undefined) v = Math.max(o.min, v);
            if (o.max !== undefined) v = Math.min(o.max, v);
            return v;
        };
        input.addEventListener('input', () => {
            const v = read();
            if (v !== null && o.onInput) o.onInput(v);
        });
        input.addEventListener('change', () => {
            const v = read();
            if (v === null) { input.value = fmt(o.lastValue, o.decimals); return; }
            input.value = fmt(v, o.decimals);
            if (o.onChange) o.onChange(v);
        });
        input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
        const set = v => { o.lastValue = v; if (!isFocused(input)) input.value = fmt(v, o.decimals); };
        o.lastValue = o.value;
        let el = input;
        if (o.unit) el = h('span', { class: 'num-wrap' }, input, h('span', { class: 'unit' }, o.unit));
        return { el, input, set, get: read };
    };

    /* ---------- Curseur + champ numérique ---------- */

    UI.slider = function (o) {
        const decimals = o.decimals === undefined ? 2 : o.decimals;
        const range = h('input', { type: 'range', class: 'range', min: o.min, max: o.max, step: o.step || 'any', 'aria-label': o.label || null });
        const updateFill = () => {
            const v = Number(range.value);
            range.style.setProperty('--pct', ((v - o.min) / (o.max - o.min) * 100) + '%');
        };
        const num = UI.numberInput({
            value: o.value, min: o.min, max: o.max, step: o.numStep || o.step, decimals, unit: o.unit, label: o.label,
            placeholder: o.placeholder, allowEmpty: o.allowEmpty,
            onInput: v => { if (v !== undefined) { range.value = v; updateFill(); } if (o.onInput) o.onInput(v); },
            onChange: v => { if (v !== undefined) { range.value = v; updateFill(); } if (o.onChange) o.onChange(v, true); }
        });
        range.value = o.value === undefined || o.value === null ? (o.fallback !== undefined ? o.fallback : o.min) : o.value;
        updateFill();
        range.addEventListener('input', () => {
            const v = Number(range.value);
            num.input.value = fmt(v, decimals);
            updateFill();
            if (o.onInput) o.onInput(v);
        });
        range.addEventListener('change', () => { if (o.onChange) o.onChange(Number(range.value), true); });
        const el = h('div', { class: 'slider-field' }, range, num.el);
        let current = o.value;
        return {
            el, range,
            set(v) {
                current = v;
                if (!isFocused(range)) {
                    range.value = v === undefined || v === null ? (o.fallback !== undefined ? o.fallback : o.min) : v;
                    updateFill();
                }
                num.set(v);
            },
            get: () => num.get(),
            /** Valeur « automatique » affichée quand le champ est vide. */
            setFallback(v, placeholder) {
                o.fallback = v;
                num.input.placeholder = placeholder === undefined ? '' : placeholder;
                if ((current === undefined || current === null) && !isFocused(range)) {
                    range.value = v;
                    updateFill();
                }
            }
        };
    };

    /* ---------- Texte ---------- */

    UI.textInput = function (o) {
        const input = h(o.multiline ? 'textarea' : 'input', {
            type: o.multiline ? null : (o.type || 'text'),
            class: (o.multiline ? 'textarea' : 'input') + (o.small ? ' input-sm' : '') + (o.code ? ' code' : '') + (o.className ? ' ' + o.className : ''),
            placeholder: o.placeholder || '', maxlength: o.maxLength, spellcheck: o.spellcheck === false ? 'false' : null,
            'aria-label': o.label || null, rows: o.rows, autocomplete: 'off'
        });
        input.value = o.value || '';
        if (o.onInput) input.addEventListener('input', () => o.onInput(input.value));
        if (o.onChange) input.addEventListener('change', () => o.onChange(input.value));
        if (!o.multiline) input.addEventListener('keydown', e => { if (e.key === 'Enter' && o.blurOnEnter !== false) input.blur(); });
        return {
            el: input, input,
            set(v) { if (!isFocused(input)) input.value = v || ''; },
            get: () => input.value
        };
    };

    UI.select = function (o) {
        const select = h('select', { class: 'select' + (o.small ? ' input-sm' : ''), 'aria-label': o.label || null });
        const render = options => {
            U.clear(select);
            for (const opt of options) {
                if (opt.group) {
                    const g = h('optgroup', { label: opt.group });
                    for (const sub of opt.options) g.appendChild(h('option', { value: sub.value }, sub.label));
                    select.appendChild(g);
                } else select.appendChild(h('option', { value: opt.value, disabled: !!opt.disabled }, opt.label));
            }
        };
        render(o.options);
        select.value = o.value === undefined ? '' : o.value;
        select.addEventListener('change', () => o.onChange && o.onChange(select.value));
        return {
            el: select, input: select,
            set(v) { select.value = v === undefined ? '' : v; },
            get: () => select.value,
            setOptions(options, v) { render(options); select.value = v === undefined ? '' : v; }
        };
    };

    /* ---------- Couleur ---------- */

    function toHex(color) {
        if (!color) return '#000000';
        if (/^#[0-9a-f]{6}$/i.test(color)) return color.toLowerCase();
        if (/^#[0-9a-f]{3}$/i.test(color)) return ('#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3]).toLowerCase();
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillStyle = color;
        const v = ctx.fillStyle;
        return /^#[0-9a-f]{6}$/i.test(v) ? v : '#000000';
    }
    UI.toHex = toHex;

    UI.colorInput = function (o) {
        let value = o.value || '#000000';
        const chip = h('span', { class: 'chip' });
        const picker = h('input', { type: 'color', 'aria-label': o.label || 'Couleur' });
        const text = h('input', { type: 'text', class: 'input input-sm mono', spellcheck: 'false', 'aria-label': (o.label || 'Couleur') + ' (code)', style: 'width:110px' });
        const presets = o.presets ? h('div', { class: 'color-presets' }) : null;
        const presetBtns = [];
        const sync = () => {
            chip.style.background = value;
            picker.value = toHex(value);
            if (!isFocused(text)) text.value = value;
            presetBtns.forEach(b => b.setAttribute('aria-pressed', String(toHex(b.dataset.color) === toHex(value))));
        };
        const commit = (v, final) => {
            value = v;
            sync();
            const fn = final ? (o.onChange || o.onInput) : o.onInput;
            if (fn) fn(v);
        };
        picker.addEventListener('input', () => commit(picker.value, false));
        picker.addEventListener('change', () => commit(picker.value, true));
        text.addEventListener('change', () => {
            const v = text.value.trim();
            if (!v) { text.value = value; return; }
            const probe = new Option().style;
            probe.color = v;
            if (!probe.color) { text.value = value; UI.toast('Couleur non reconnue : « ' + v + ' ».', { type: 'warning' }); return; }
            commit(v, true);
        });
        text.addEventListener('keydown', e => { if (e.key === 'Enter') text.blur(); });
        if (presets) {
            for (const c of o.presets) {
                const b = h('button', { type: 'button', 'data-color': c, 'data-tip': c, style: 'background:' + c, 'aria-label': 'Couleur ' + c });
                b.addEventListener('click', () => commit(c, true));
                presets.appendChild(b);
                presetBtns.push(b);
            }
        }
        const el = h('div', {},
            h('div', { class: 'color-field' }, h('label', { class: 'color-swatch-input' }, chip, picker), text),
            presets);
        sync();
        return { el, set(v) { value = v || '#000000'; sync(); }, get: () => value };
    };

    /* ---------- Mise en page des champs ---------- */

    UI.field = function (label, control, o) {
        o = o || {};
        const ctrlEl = control && control.el ? control.el : control;
        const id = control && control.input && !control.input.id ? (control.input.id = U.uid('f')) : null;
        return h('div', { class: 'field' + (o.className ? ' ' + o.className : '') },
            label ? h('label', { class: 'field-label', for: id },
                label,
                o.tip ? h('span', { class: 'hint-icon', 'data-tip': o.tip, tabindex: '0' }, SM.icon('help', 13)) : null,
                o.aside || null) : null,
            ctrlEl,
            o.hint ? h('div', { class: 'field-hint' }, o.hint) : null);
    };

    UI.fieldRow = function (label, control, o) {
        o = o || {};
        const ctrlEl = control && control.el ? control.el : control;
        const id = control && control.input && !control.input.id ? (control.input.id = U.uid('f')) : null;
        return h('div', { class: 'field-row' + (o.className ? ' ' + o.className : '') },
            h('div', { class: 'field-text' },
                h('label', { class: 'field-label', for: id }, o.icon ? SM.icon(o.icon, 15) : null, label,
                    o.tip ? h('span', { class: 'hint-icon', 'data-tip': o.tip, tabindex: '0' }, SM.icon('help', 13)) : null),
                o.hint ? h('div', { class: 'field-hint' }, o.hint) : null),
            ctrlEl);
    };

    /* ---------- Illustrations (mini-cartes) ---------- */

    const DEFAULT_COLORS = { land: '#f3efe7', water: '#a9cdd6', road: '#f6c98d', park: '#dcebd0', minor: '#ffffff' };

    function svgEl(markup) {
        const tpl = document.createElement('template');
        tpl.innerHTML = markup.trim();
        return tpl.content.firstChild;
    }

    function miniMapMarkup(c, o) {
        o = o || {};
        const tex = o.satellite
            ? '<g opacity=".35">' +
            '<ellipse cx="30" cy="20" rx="26" ry="12" fill="#2f4226"/><ellipse cx="120" cy="30" rx="30" ry="14" fill="#6b7350"/>' +
            '<ellipse cx="70" cy="50" rx="24" ry="10" fill="#324a2a"/><ellipse cx="140" cy="52" rx="18" ry="9" fill="#5a6a44"/>' +
            '<ellipse cx="20" cy="56" rx="16" ry="8" fill="#7a7456"/></g>'
            : '';
        const labels = o.labels
            ? '<g font-family="Arial, sans-serif" font-size="7" font-weight="700" fill="#fff" stroke="rgba(0,0,0,.45)" stroke-width="1.6" paint-order="stroke">' +
            '<text x="58" y="30">Ville</text><text x="112" y="58">Village</text></g>'
            : '';
        return '<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
            '<rect width="160" height="100" fill="' + c.land + '"/>' + tex +
            '<path d="M0 76 C 26 66 46 88 78 81 S 128 62 160 72 L160 100 L0 100 Z" fill="' + c.water + '"/>' +
            '<path d="M104 -2 C 99 18 112 32 106 48 S 95 70 104 80" stroke="' + c.water + '" stroke-width="5" fill="none"/>' +
            '<ellipse cx="42" cy="27" rx="21" ry="12" fill="' + c.park + '"/>' +
            '<ellipse cx="136" cy="16" rx="14" ry="8" fill="' + c.park + '"/>' +
            '<g stroke="' + c.minor + '" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="' + (o.satellite ? '.55' : '1') + '">' +
            '<path d="M0 17 L160 33"/><path d="M22 0 L36 74"/><path d="M68 0 L63 76"/><path d="M130 0 L141 64"/><path d="M0 53 L160 59"/></g>' +
            '<path d="M-2 41 C 40 30 80 53 162 36" stroke="' + c.road + '" stroke-width="3.6" fill="none" stroke-linecap="round"/>' +
            '<path d="M86 -2 C 91 30 78 50 88 80" stroke="' + c.road + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
            labels + '</svg>';
    }

    /** Petite carte stylisée aux couleurs d'un fond de carte. */
    UI.miniMap = function (colors, o) {
        return svgEl(miniMapMarkup(Object.assign({}, DEFAULT_COLORS, colors || {}), o));
    };

    /** Illustration d'une storymap (carte + panneau de récit + marqueur + mini-carte). */
    UI.storyArt = function (colors, o) {
        o = o || {};
        const c = Object.assign({}, DEFAULT_COLORS, colors || {});
        const dark = o.theme !== 'light';
        const panel = dark ? '#444' : '#fafafa';
        const ink = dark ? '#fafafa' : '#444';
        const map = miniMapMarkup(c, o).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
        return svgEl('<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
            map +
            '<g opacity=".93"><rect x="9" y="12" width="52" height="70" rx="2" fill="' + panel + '"/>' +
            '<rect x="15" y="18" width="30" height="4" rx="1" fill="' + ink + '"/>' +
            '<rect x="15" y="26" width="40" height="20" rx="1" fill="' + (dark ? '#7a8a96' : '#c9d3da') + '"/>' +
            '<path d="M15 46 l10 -9 8 6 6 -4 16 7 z" fill="' + (dark ? '#9fb1bd' : '#aebfca') + '"/>' +
            '<rect x="15" y="51" width="40" height="2.4" rx="1" fill="' + ink + '" opacity=".75"/>' +
            '<rect x="15" y="56" width="36" height="2.4" rx="1" fill="' + ink + '" opacity=".75"/>' +
            '<rect x="15" y="61" width="38" height="2.4" rx="1" fill="' + ink + '" opacity=".75"/>' +
            '<rect x="15" y="66" width="24" height="2.4" rx="1" fill="' + ink + '" opacity=".75"/></g>' +
            '<g transform="translate(104 38)"><path d="M0 12 C -6 5 -7 2 -7 -1 a7 7 0 0 1 14 0 c0 3 -1 6 -7 13z" fill="#3FB1CE" stroke="#fff" stroke-width="1.2"/><circle cx="0" cy="-1" r="2.4" fill="#fff"/></g>' +
            '<g><rect x="126" y="68" width="27" height="24" rx="1.5" fill="#f2f2ef" stroke="#fff" stroke-width="1.4"/>' +
            '<path d="M128 80 c 6 -4 10 2 14 -2 s 6 2 9 0" stroke="#cfd6d8" stroke-width="3" fill="none"/>' +
            '<circle cx="139.5" cy="78" r="1.8" fill="orange" stroke="#fff" stroke-width=".8"/></g>' +
            '</svg>');
    };

    /* ---------- Section repliable ---------- */

    UI.section = function (o) {
        const key = o.id ? 'section:' + o.id : null;
        let open = key ? U.storage.get(key, o.open !== false) : o.open !== false;
        const body = h('div', { class: 'insp-section-body' });
        if (o.body) U.append(body, [o.body]);
        const toggleBtn = h('button', { type: 'button', class: 'insp-section-toggle', 'aria-expanded': String(open) },
            o.icon ? SM.icon(o.icon, 15, 'insp-section-icon') : null,
            h('span', { class: 'insp-section-title' }, o.title),
            o.badge ? h('span', { class: 'badge' + (o.badgeClass ? ' ' + o.badgeClass : '') }, o.badge) : null,
            SM.icon('chevron-down', 15, 'insp-section-chevron'));
        const header = h('div', { class: 'insp-section-header' }, toggleBtn, o.actions ? h('div', { class: 'insp-section-actions' }, o.actions) : null);
        const el = h('section', { class: 'insp-section' + (open ? ' open' : '') }, header, body);
        toggleBtn.addEventListener('click', () => {
            open = !open;
            el.classList.toggle('open', open);
            toggleBtn.setAttribute('aria-expanded', String(open));
            if (key) U.storage.set(key, open);
        });
        return { el, body, setBadge(text, cls) {
            let b = toggleBtn.querySelector('.badge');
            if (!text) { if (b) b.remove(); return; }
            if (!b) { b = h('span', { class: 'badge' }); toggleBtn.insertBefore(b, toggleBtn.lastChild); }
            b.className = 'badge' + (cls ? ' ' + cls : '');
            b.textContent = text;
        } };
    };
})();
