/* ==========================================================================
   StoryMap — démarrage et navigation
   #/            → tableau de bord
   #/edit/<id>   → éditeur
   ========================================================================== */
(function () {
    'use strict';

    const SM = window.SM;
    const U = SM.util;
    const h = U.h;
    const UI = SM.ui;

    const root = document.getElementById('app');
    let view = null;
    let queue = Promise.resolve();

    function parseRoute() {
        const m = /^#\/edit\/([\w-]+)/.exec(location.hash);
        return m ? { name: 'edit', id: m[1] } : { name: 'home' };
    }

    function showLoading(text) {
        U.clear(root);
        root.appendChild(h('div', { class: 'app-loading' }, SM.logo(40), h('div', { class: 'app-loading-text' }, SM.icon('loader', 16, 'spinner'), text)));
    }

    async function route() {
        const r = parseRoute();
        if (view && view.type === 'editor' && r.name === 'edit' && view.id === r.id) return;
        if (view && view.type === 'dashboard' && r.name === 'home') return;

        if (view) {
            const v = view;
            view = null;
            try {
                if (v.type === 'editor') await v.instance.close();
                else v.instance.destroy();
            } catch (e) { console.error(e); }
        }
        UI.closeMenu();
        UI.hideTooltip();

        if (r.name === 'edit') {
            showLoading('Ouverture de la storymap…');
            try {
                const editor = await SM.Editor.open(root, r.id);
                view = { type: 'editor', id: r.id, instance: editor };
            } catch (e) {
                console.error(e);
                UI.toast(e.message || String(e), { type: 'error' });
                history.replaceState(null, '', '#/');
                view = { type: 'dashboard', instance: new SM.Dashboard(root, { onOpen }) };
            }
        } else {
            view = { type: 'dashboard', instance: new SM.Dashboard(root, { onOpen }) };
        }
    }

    function onOpen(id) {
        location.hash = '#/edit/' + id;
    }

    /** Accès à la vue courante (utile pour le débogage dans la console). */
    SM.app = {
        get view() { return view ? view.instance : null; }
    };

    function schedule() {
        queue = queue.then(route).catch(e => console.error(e));
    }

    /* ---------- Clavier ---------- */

    document.addEventListener('keydown', e => {
        if (view && view.instance.onKey && view.instance.onKey(e)) return;
        if (e.key === '?' && !e.defaultPrevented && !U.isTypingTarget(e.target) && !document.querySelector('dialog[open]') && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            UI.showShortcuts();
        }
    });

    /* ---------- Erreurs inattendues ---------- */

    window.addEventListener('unhandledrejection', e => {
        const msg = e.reason && e.reason.message ? e.reason.message : String(e.reason || '');
        if (!msg || /AbortError|aborted/i.test(msg)) return;
        console.error(e.reason);
    });

    /* ---------- Démarrage ---------- */

    /** Styles de la storymap (ceux des pages publiées), placés avant les aides d'édition du cadre. */
    function injectPlayerStyles() {
        const style = document.createElement('style');
        style.id = 'sm-player-styles';
        style.textContent = window.SMPlayer.CSS;
        document.head.insertBefore(style, document.querySelector('link[href$="frame.css"]'));
    }

    function boot() {
        SM.applyTheme();
        injectPlayerStyles();
        UI.initTooltips();
        window.addEventListener('hashchange', schedule);
        // Modèle HTML personnalisé des versions 1.x : sans objet depuis la version 2
        SM.db.getKV('customTemplate', null).then(v => { if (v) return SM.db.deleteKV('customTemplate'); }).catch(() => { });

        // Stockage persistant : demandé silencieusement là où le navigateur n'affiche pas d'invite.
        if (navigator.storage && navigator.storage.persisted && !/Firefox\//.test(navigator.userAgent)) {
            navigator.storage.persisted().then(p => { if (!p) SM.db.requestPersistence(); }).catch(() => { });
        }
        schedule();
    }

    try {
        boot();
    } catch (e) {
        console.error(e);
        U.clear(root);
        root.appendChild(h('div', { class: 'boot-error' }, h('h1', {}, 'Impossible de démarrer l’éditeur'), h('p', {}, e.message)));
    }
})();
