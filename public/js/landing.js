/* ==========================================================================
   StoryMap — scripts pour la page de présentation (landing page)
   ========================================================================== */
(function () {
    'use strict';

    // Thème appliqué avant le premier rendu
    var pref = 'auto';
    try { pref = JSON.parse(localStorage.getItem('atelier-storymap:prefs') || '{}').uiTheme || 'auto'; } catch (e) { }
    var dark = pref === 'dark' || (pref === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');

    document.addEventListener('DOMContentLoaded', function () {
        // Bascule de thème clair / sombre
        var themeBtn = document.getElementById('lp-theme-toggle');
        if (themeBtn) {
            themeBtn.addEventListener('click', function () {
                var current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
                var next = current === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', next);
                try {
                    var saved = JSON.parse(localStorage.getItem('atelier-storymap:prefs') || '{}');
                    saved.uiTheme = next;
                    localStorage.setItem('atelier-storymap:prefs', JSON.stringify(saved));
                } catch (e) { }
            });
        }

        // Gestion de la lecture exclusive entre les 3 vidéos de présentation
        var videos = document.querySelectorAll('.lp-mode-video');
        videos.forEach(function (vid) {
            vid.addEventListener('play', function () {
                videos.forEach(function (other) {
                    if (other !== vid && !other.paused) {
                        other.pause();
                    }
                });
            });
        });
    });
})();
