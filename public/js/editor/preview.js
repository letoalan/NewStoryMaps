/* ==========================================================================
   StoryMap — aperçu de la storymap finale
   --------------------------------------------------------------------------
   La page publiée elle-même (lecteur + données, comme l'export HTML) est
   exécutée dans une iframe isolée (sandbox) : le rendu est exactement celui
   qui sera publié.
   ========================================================================== */
(function () {
    'use strict';

    const SM = window.SM;
    const U = SM.util;
    const h = U.h;
    const UI = SM.ui;

    let current = null;

    function devices() {
        return [{ id: 'fit', label: 'Taille de la fenêtre', icon: 'maximize' }].concat(SM.Canvas ? SM.Canvas.DEVICES : []);
    }

    let opening = null;

    SM.Preview = {
        /**
         * @param {object} config
         * @param {object} [opts] { startChapterId }
         */
        open(config, opts) {
            // Évite d'empiler deux aperçus (double-clic pendant la préparation de la page)
            if (opening) return opening;
            opening = SM.Preview.openNow(config, opts).finally(() => { opening = null; });
            return opening;
        },

        async openNow(config, opts) {
            opts = opts || {};
            if (current) current.close();
            let html;
            let fullHtml;
            try {
                html = SM.io.buildHtml({ config }, { preview: true, start: opts.startChapterId || null });
                fullHtml = opts.startChapterId ? null : html;
            } catch (e) {
                UI.toast('Aperçu impossible : ' + e.message, { type: 'error' });
                return;
            }

            let deviceId = U.storage.get('previewDevice', 'fit');
            if (!devices().some(d => d.id === deviceId)) deviceId = 'fit';
            const iframe = h('iframe', {
                class: 'preview-frame', title: 'Aperçu de la storymap',
                sandbox: 'allow-scripts allow-popups allow-popups-to-escape-sandbox',
                allow: 'fullscreen; autoplay; picture-in-picture'
            });
            const frameWrap = h('div', { class: 'preview-frame-wrap' }, iframe);
            const stage = h('div', { class: 'preview-stage' }, frameWrap);
            const scaleLabel = h('span', { class: 'canvas-zoom' });

            const deviceBtn = h('button', { type: 'button', class: 'btn btn-ghost btn-sm device-btn', 'aria-haspopup': 'menu' });
            const renderDeviceBtn = () => {
                const d = devices().find(x => x.id === deviceId);
                U.clear(deviceBtn);
                deviceBtn.append(SM.icon(d.icon, 15), h('span', {}, d.label));
                if (d.w) deviceBtn.append(h('span', { class: 'subtle' }, d.w + ' × ' + d.h));
                deviceBtn.append(SM.icon('chevron-down', 13));
            };
            deviceBtn.addEventListener('click', () => {
                UI.menu(deviceBtn, devices().map(d => ({
                    label: d.label, desc: d.w ? d.w + ' × ' + d.h + ' px' : 'Utilise tout l’espace disponible', icon: d.icon, checked: d.id === deviceId,
                    onClick: () => { deviceId = d.id; U.storage.set('previewDevice', d.id); renderDeviceBtn(); layout(); }
                })), { align: 'end', minWidth: 250 });
            });

            const layout = () => {
                const d = devices().find(x => x.id === deviceId);
                const r = { width: stage.clientWidth, height: stage.clientHeight };
                if (!d.w) {
                    frameWrap.classList.add('fit');
                    iframe.style.width = iframe.style.height = '';
                    iframe.style.transform = '';
                    frameWrap.style.width = frameWrap.style.height = '';
                    scaleLabel.textContent = '100 %';
                    return;
                }
                frameWrap.classList.remove('fit');
                const pad = 24;
                const s = Math.min((r.width - pad * 2) / d.w, (r.height - pad * 2) / d.h, 1);
                iframe.style.width = d.w + 'px';
                iframe.style.height = d.h + 'px';
                iframe.style.transform = 'scale(' + s + ')';
                frameWrap.style.width = Math.round(d.w * s) + 'px';
                frameWrap.style.height = Math.round(d.h * s) + 'px';
                scaleLabel.textContent = Math.round(s * 100) + ' %';
            };

            // Page complète (depuis le début)
            const buildFull = () => SM.io.buildHtml({ config }, { preview: true });

            const reload = fromStart => {
                if (fromStart) {
                    if (!fullHtml) fullHtml = buildFull();
                    iframe.srcdoc = fullHtml;
                } else iframe.srcdoc = html;
            };

            const openTab = () => {
                // Dans un onglet, la page est celle de l'export HTML (sans le raccourci Échap de l'aperçu)
                const full = SM.io.buildHtml({ config });
                const url = URL.createObjectURL(new Blob([full], { type: 'text/html' }));
                const w = window.open(url, '_blank');
                if (!w) UI.toast('Le navigateur a bloqué l’ouverture d’un nouvel onglet.', { type: 'warning' });
                setTimeout(() => URL.revokeObjectURL(url), 120000);
            };

            const close = () => {
                ro.disconnect();
                document.removeEventListener('keydown', onKey, true);
                window.removeEventListener('message', onMessage);
                overlay.remove();
                current = null;
                if (opts.onClose) opts.onClose();
            };
            // Échap pressé dans la storymap (l'iframe garde le focus clavier)
            const onMessage = e => {
                if (e.source === iframe.contentWindow && e.data && e.data.type === 'storymap-preview-escape') close();
            };
            window.addEventListener('message', onMessage);
            // Focus sur la storymap : la navigation au clavier fonctionne tout de suite
            iframe.addEventListener('load', () => { try { iframe.focus(); } catch (e) { /* ignore */ } });
            const onKey = e => {
                if (e.key === 'Escape' && !document.querySelector('dialog[open]') && !document.querySelector('.menu')) {
                    e.preventDefault();
                    e.stopPropagation();
                    close();
                }
            };

            const title = config.title || 'Sans titre';
            const overlay = h('div', { class: 'preview-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Aperçu de la storymap' },
                h('div', { class: 'preview-bar' },
                    h('div', { class: 'preview-title' },
                        h('span', { class: 'badge badge-accent' }, SM.icon('play', 12), 'Aperçu'),
                        h('strong', {}, U.truncate(title, 60)),
                        h('span', { class: 'subtle preview-hint' }, 'Faites défiler pour parcourir les chapitres')),
                    h('div', { class: 'preview-actions' },
                        deviceBtn, scaleLabel,
                        UI.button({ label: 'Depuis le début', icon: 'refresh', size: 'sm', variant: 'ghost', onClick: () => reload(true) }),
                        UI.button({ label: 'Nouvel onglet', icon: 'external', size: 'sm', variant: 'ghost', tip: 'Ouvrir la page complète dans un nouvel onglet', onClick: openTab }),
                        UI.button({ label: 'Fermer', icon: 'x', size: 'sm', shortcut: 'Escape', onClick: close }))),
                stage);

            document.body.appendChild(overlay);
            document.addEventListener('keydown', onKey, true);
            const ro = new ResizeObserver(() => layout());
            ro.observe(stage);
            renderDeviceBtn();
            layout();
            iframe.srcdoc = html;
            requestAnimationFrame(() => iframe.focus());
            current = { close };
            return current;
        },

        close() {
            if (current) current.close();
        },

        isOpen: () => !!current
    };
})();
