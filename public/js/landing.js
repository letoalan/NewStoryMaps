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

    // Gestion du lecteur vidéo promotionnel
    document.addEventListener('DOMContentLoaded', function () {
        var video = document.getElementById('lp-player');
        var play = document.getElementById('lp-play');
        var box = document.getElementById('video');
        var watchBtn = document.getElementById('lp-watch');

        if (!video || !play || !box) return;

        function start() {
            var p = video.play();
            if (p && p.catch) p.catch(function () { });
        }

        video.addEventListener('play', function () {
            box.classList.add('is-started');
        });

        play.addEventListener('click', start);

        if (watchBtn) {
            watchBtn.addEventListener('click', function (e) {
                e.preventDefault();
                var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
                box.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' });
                start();
            });
        }
    });
})();

