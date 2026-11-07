/* ==========================================================================
   StoryMap — scripts pour la page d'accueil (landing page)
   ========================================================================== */
(function () {
    'use strict';

    // Thème appliqué avant le premier rendu
    var pref = 'auto';
    try { pref = JSON.parse(localStorage.getItem('atelier-storymap:prefs') || '{}').uiTheme || 'auto'; } catch (e) { }
    var dark = pref === 'dark' || (pref === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');

    // Redirection des anciens liens directs vers app.html
    if (/^#\//.test(location.hash)) {
        location.replace('app.html' + location.hash);
        return;
    }
})();
