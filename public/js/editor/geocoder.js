/* ==========================================================================
   StoryMap — recherche de lieux (Photon / Nominatim, coordonnées)
   ========================================================================== */
(function () {
    'use strict';

    const SM = window.SM;
    const U = SM.util;
    const h = U.h;

    const TYPE_ZOOM = { country: 5, state: 7, county: 9, city: 11.5, town: 12.5, village: 13.5, district: 13, locality: 13.5, street: 15.5, house: 17 };
    const TYPE_LABEL = {
        country: 'Pays', state: 'Région', county: 'Département', city: 'Ville', town: 'Ville', village: 'Village', district: 'Quartier',
        locality: 'Lieu-dit', street: 'Rue', house: 'Adresse', other: 'Lieu'
    };

    /** Reconnaît « 48.8566, 2.3522 », « 48,8566 2,3522 »… (latitude, longitude). */
    function parseCoords(q) {
        const s = q.trim();
        let parts = s.split(/\s*;\s*|\s+|,\s+/).filter(Boolean);
        // « 48.8566,2.3522 » (points décimaux) ; « 35,0116 » est un nombre à virgule, pas une paire
        if (parts.length !== 2 && /^-?\d+\.\d+,-?\d+\.\d+$/.test(s)) parts = s.split(',');
        if (parts.length !== 2) return null;
        const a = Number(parts[0].replace(',', '.'));
        const b = Number(parts[1].replace(',', '.'));
        if (!isFinite(a) || !isFinite(b)) return null;
        let lat = a;
        let lng = b;
        if (Math.abs(a) > 90 && Math.abs(b) <= 90) { lat = b; lng = a; }
        if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
        return { lat, lng };
    }

    async function photon(q, signal) {
        const url = 'https://photon.komoot.io/api/?limit=7&lang=fr&q=' + encodeURIComponent(q);
        const res = await fetch(url, { signal });
        if (!res.ok) throw new Error('Photon ' + res.status);
        const data = await res.json();
        return (data.features || []).map(f => {
            const p = f.properties || {};
            const name = p.name || [p.street, p.housenumber].filter(Boolean).join(' ') || p.city || p.country || 'Lieu';
            const parts = [];
            for (const v of [p.city, p.state, p.country]) {
                if (v && v !== name && !parts.includes(v)) parts.push(v);
            }
            const e = p.extent;
            return {
                label: name,
                sublabel: parts.join(', '),
                type: TYPE_LABEL[p.type] || TYPE_LABEL.other,
                center: f.geometry.coordinates,
                bbox: e && e.length === 4 ? [e[0], e[3], e[2], e[1]] : null,
                zoom: TYPE_ZOOM[p.type] || 14
            };
        });
    }

    async function nominatim(q, signal) {
        const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=7&accept-language=fr&q=' + encodeURIComponent(q);
        const res = await fetch(url, { signal, headers: { 'Accept-Language': 'fr' } });
        if (!res.ok) throw new Error('Nominatim ' + res.status);
        const data = await res.json();
        return data.map(d => {
            const bb = d.boundingbox ? d.boundingbox.map(Number) : null;
            const parts = String(d.display_name || '').split(',').map(s => s.trim());
            const t = d.addresstype || d.type;
            return {
                label: d.name || parts[0],
                sublabel: parts.slice(1).filter((v, i, a) => a.indexOf(v) === i).slice(-3).join(', '),
                type: TYPE_LABEL[t] || TYPE_LABEL.other,
                center: [Number(d.lon), Number(d.lat)],
                bbox: bb ? [bb[2], bb[0], bb[3], bb[1]] : null,
                zoom: TYPE_ZOOM[t] || 14
            };
        });
    }

    class Geocoder {
        constructor(opts) {
            this.opts = opts;
            this.results = [];
            this.active = -1;
            this.abort = null;
            this.input = h('input', {
                type: 'search', class: 'input geo-input', placeholder: opts.placeholder || 'Rechercher un lieu ou des coordonnées…',
                'aria-label': 'Rechercher un lieu', autocomplete: 'off', spellcheck: 'false', role: 'combobox',
                'aria-autocomplete': 'list', 'aria-expanded': 'false'
            });
            this.list = h('div', { class: 'geo-results', role: 'listbox' });
            this.spinner = SM.icon('loader', 15, 'spinner geo-spinner');
            this.el = h('div', { class: 'geo' },
                h('div', { class: 'input-affix' }, SM.icon('search', 15), this.input, this.spinner),
                this.list);
            this.spinner.style.display = 'none';

            const run = U.debounce(() => this.search(), SM.prefs.get('geocoder') === 'photon' ? 280 : 700);
            this.input.addEventListener('input', () => {
                const q = this.input.value.trim();
                const coords = q.length >= 2 ? parseCoords(q) : null;
                if (q.length < 2 || coords) {
                    // Annule toute recherche en attente ou en cours (ses résultats seraient périmés)
                    run.cancel();
                    this.cancelSearch();
                    if (coords) this.showCoords(coords); else { this.results = []; this.close(); }
                    return;
                }
                if (SM.prefs.get('geocoder') === 'photon') run(); else this.hint();
            });
            this.input.addEventListener('keydown', e => this.onKey(e, run));
            this.input.addEventListener('focus', () => { if (this.results.length) this.open(); });
            this.input.addEventListener('blur', () => setTimeout(() => this.close(), 150));
        }

        cancelSearch() {
            if (this.abort) { this.abort.abort(); this.abort = null; }
            this.spinner.style.display = 'none';
        }

        hint() {
            this.results = [];
            U.clear(this.list);
            this.list.appendChild(h('div', { class: 'geo-empty' }, 'Appuyez sur Entrée pour lancer la recherche.'));
            this.open();
        }

        async search() {
            const q = this.input.value.trim();
            if (q.length < 2) return;
            if (this.abort) this.abort.abort();
            const ctrl = new AbortController();
            this.abort = ctrl;
            this.spinner.style.display = '';
            let results = [];
            let failed = false;
            const primary = SM.prefs.get('geocoder') === 'nominatim' ? nominatim : photon;
            const fallback = primary === photon ? nominatim : photon;
            try {
                results = await primary(q, ctrl.signal);
            } catch (e) {
                if (e.name === 'AbortError') return;
                try { results = await fallback(q, ctrl.signal); } catch (err) { if (err.name === 'AbortError') return; failed = true; }
            }
            if (ctrl !== this.abort) return;
            this.spinner.style.display = 'none';
            this.render(results, failed ? 'La recherche est indisponible (connexion Internet ?).' : 'Aucun lieu trouvé pour « ' + q + ' ».');
        }

        showCoords(c) {
            this.render([{
                label: U.formatNumber(U.round(c.lat, 5)) + ' ; ' + U.formatNumber(U.round(c.lng, 5)),
                sublabel: 'Latitude ; longitude',
                type: 'Coordonnées',
                center: [c.lng, c.lat],
                bbox: null,
                zoom: null
            }]);
        }

        render(results, emptyText) {
            this.results = results;
            this.active = results.length ? 0 : -1;
            U.clear(this.list);
            if (!results.length) {
                this.list.appendChild(h('div', { class: 'geo-empty' }, emptyText || 'Aucun résultat.'));
            }
            results.forEach((r, i) => {
                const item = h('div', { class: 'geo-item' + (i === this.active ? ' active' : ''), role: 'option', 'aria-selected': String(i === this.active) },
                    SM.icon(r.type === 'Coordonnées' ? 'crosshair' : 'pin', 15),
                    h('div', { class: 'geo-text' },
                        h('div', { class: 'geo-label' }, r.label),
                        r.sublabel ? h('div', { class: 'geo-sub' }, r.sublabel) : null),
                    h('span', { class: 'geo-type' }, r.type));
                item.addEventListener('mousedown', e => { e.preventDefault(); this.choose(i); });
                item.addEventListener('mousemove', () => this.setActive(i));
                this.list.appendChild(item);
            });
            if (results.length && results[0].type !== 'Coordonnées') {
                this.list.appendChild(h('div', { class: 'geo-credit' }, 'Recherche © contributeurs OpenStreetMap'));
            }
            this.open();
        }

        setActive(i) {
            this.active = i;
            Array.from(this.list.querySelectorAll('.geo-item')).forEach((el, k) => {
                el.classList.toggle('active', k === i);
                el.setAttribute('aria-selected', String(k === i));
            });
        }

        onKey(e, run) {
            if (e.key === 'ArrowDown' && this.results.length) { e.preventDefault(); this.setActive((this.active + 1) % this.results.length); }
            else if (e.key === 'ArrowUp' && this.results.length) { e.preventDefault(); this.setActive((this.active - 1 + this.results.length) % this.results.length); }
            else if (e.key === 'Enter') {
                e.preventDefault();
                if (this.results.length && this.active >= 0 && this.list.classList.contains('open')) this.choose(this.active);
                else { run.cancel(); this.search(); }
            } else if (e.key === 'Escape') {
                if (this.list.classList.contains('open')) { e.preventDefault(); e.stopPropagation(); this.close(); }
                else this.input.blur();
            }
        }

        choose(i) {
            const r = this.results[i];
            if (!r) return;
            this.close();
            this.input.value = r.label;
            this.input.blur();
            if (this.opts.onSelect) this.opts.onSelect(r);
        }

        open() {
            this.list.classList.add('open');
            this.input.setAttribute('aria-expanded', 'true');
        }

        close() {
            this.list.classList.remove('open');
            this.input.setAttribute('aria-expanded', 'false');
        }

        focus() {
            this.input.focus();
            this.input.select();
        }
    }

    Geocoder.parseCoords = parseCoords;
    SM.Geocoder = Geocoder;
})();
