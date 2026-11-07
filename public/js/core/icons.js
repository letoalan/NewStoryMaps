/* ==========================================================================
   StoryMap — jeu d'icônes (SVG 24×24, trait 2 px)
   ========================================================================== */
(function () {
    'use strict';

    const SM = window.SM = window.SM || {};

    const P = {
        plus: '<path d="M12 5v14M5 12h14"/>',
        minus: '<path d="M5 12h14"/>',
        x: '<path d="M18 6 6 18M6 6l12 12"/>',
        check: '<path d="M20 6 9 17l-5-5"/>',
        'chevron-left': '<path d="m15 18-6-6 6-6"/>',
        'chevron-right': '<path d="m9 18 6-6-6-6"/>',
        'chevron-down': '<path d="m6 9 6 6 6-6"/>',
        'arrow-left': '<path d="M19 12H5M12 19l-7-7 7-7"/>',
        'arrow-up': '<path d="M12 19V5M5 12l7-7 7 7"/>',
        more: '<circle class="fill" cx="5" cy="12" r="1.7"/><circle class="fill" cx="12" cy="12" r="1.7"/><circle class="fill" cx="19" cy="12" r="1.7"/>',
        grip: '<circle class="fill" cx="9" cy="6" r="1.5"/><circle class="fill" cx="15" cy="6" r="1.5"/><circle class="fill" cx="9" cy="12" r="1.5"/><circle class="fill" cx="15" cy="12" r="1.5"/><circle class="fill" cx="9" cy="18" r="1.5"/><circle class="fill" cx="15" cy="18" r="1.5"/>',
        trash: '<path d="M3 6h18M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6M18.5 6l-.9 13.1A2 2 0 0 1 15.6 21H8.4a2 2 0 0 1-2-1.9L5.5 6M10 11v5.5M14 11v5.5"/>',
        copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5"/>',
        undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
        redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
        eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
        'eye-off': '<path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.4 0 10 8 10 8a17.6 17.6 0 0 1-2.2 3.2M6.6 6.6C3.9 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6M14.1 14.1a3 3 0 1 1-4.2-4.2M3 3l18 18"/>',
        play: '<path d="M7 4.5v15a.8.8 0 0 0 1.2.7l12.3-7.5a.8.8 0 0 0 0-1.4L8.2 3.8A.8.8 0 0 0 7 4.5z"/>',
        stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
        download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
        upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
        image: '<rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.8"/><path d="m21 15-4.6-4.6a1.5 1.5 0 0 0-2.1 0L4 21"/>',
        'image-plus': '<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><path d="M16 5h6M19 2v6"/><circle cx="9" cy="9" r="1.8"/><path d="m21 15-3.1-3.1a1.5 1.5 0 0 0-2.1 0L6 21"/>',
        map: '<path d="M9 4 3 6.2v13.8l6-2.2 6 2.2 6-2.2V4l-6 2.2z"/><path d="M9 4v13.8M15 6.2V20"/>',
        pin: '<path d="M12 21.5s-7-6.2-7-11.8a7 7 0 1 1 14 0c0 5.6-7 11.8-7 11.8z"/><circle cx="12" cy="9.7" r="2.6"/>',
        search: '<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.3-4.3"/>',
        sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
        settings: '<path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.6a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.6a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
        layers: '<path d="m12 3 9 4.8-9 4.8-9-4.8z"/><path d="m3 12.2 9 4.8 9-4.8"/><path d="m3 16.4 9 4.8 9-4.8"/>',
        'panel-left': '<rect x="2.5" y="4" width="19" height="16" rx="2.5"/><rect class="fill" x="5" y="7" width="6" height="10" rx="1"/>',
        'panel-center': '<rect x="2.5" y="4" width="19" height="16" rx="2.5"/><rect class="fill" x="8.5" y="7" width="7" height="10" rx="1"/>',
        'panel-right': '<rect x="2.5" y="4" width="19" height="16" rx="2.5"/><rect class="fill" x="13" y="7" width="6" height="10" rx="1"/>',
        'panel-full': '<rect x="2.5" y="4" width="19" height="16" rx="2.5"/><rect class="fill" x="5" y="9" width="14" height="6" rx="1"/>',
        'sidebar-left': '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M9 4v16"/>',
        'sidebar-right': '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M15 4v16"/>',
        bold: '<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/>',
        italic: '<path d="M19 4h-9M14 20H5M15 4 9 20"/>',
        underline: '<path d="M6 4v6a6 6 0 0 0 12 0V4M4 20h16"/>',
        strike: '<path d="M16 6.5A4 4 0 0 0 12.5 5H11a3.5 3.5 0 0 0-1.3 6.7M14.5 13.5A3.5 3.5 0 0 1 13 19h-1.5A4 4 0 0 1 8 17.5M4 12h16"/>',
        link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
        unlink: '<path d="m18.8 13.8 1.7-1.7a5 5 0 0 0-7-7l-1.7 1.7M5.2 10.2l-1.7 1.7a5 5 0 0 0 7 7l1.7-1.7M8 2v3M2 8h3M16 22v-3M22 16h-3"/>',
        list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle class="fill" cx="4.5" cy="6" r="1.3"/><circle class="fill" cx="4.5" cy="12" r="1.3"/><circle class="fill" cx="4.5" cy="18" r="1.3"/>',
        'list-ordered': '<path d="M10 6h11M10 12h11M10 18h11M4 4.5h1.2V9M3.8 9h2.6M6.4 19.5H3.8c0-1.2 2.6-1.7 2.6-3.1a1.3 1.3 0 0 0-2.5-.4"/>',
        'clear-format': '<path d="M4 7V4h16v3M5 20h6M13 4 8 20M15 15l5 5M20 15l-5 5"/>',
        'align-left': '<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>',
        'align-center': '<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>',
        'align-right': '<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>',
        'align-justify': '<path d="M4 6h16M4 10h16M4 14h16M4 18h16"/>',
        padding: '<rect x="3" y="3" width="18" height="18" rx="2.5"/><rect x="7.5" y="7.5" width="9" height="9" rx="1" stroke-dasharray="2 2"/>',
        transparency: '<rect x="3" y="3" width="18" height="18" rx="2.5"/><path class="fill" d="M3 5.5A2.5 2.5 0 0 1 5.5 3H9v6H3zM9 9h6v6H9zM15 3h3.5A2.5 2.5 0 0 1 21 5.5V9h-6zM3 15h6v6H5.5A2.5 2.5 0 0 1 3 18.5zM15 15h6v3.5a2.5 2.5 0 0 1-2.5 2.5H15z" opacity=".45"/>',
        code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
        share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
        'qr-code': '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v.01M14 21h3M21 17v4h-4"/>',
        palette: '<path d="M12 21a9 9 0 1 1 9-9c0 2.5-2 3.5-3.5 3.5H15a1.8 1.8 0 0 0-1.3 3.1A1.5 1.5 0 0 1 12 21z"/><circle class="fill" cx="7.5" cy="11" r="1.3"/><circle class="fill" cx="10.5" cy="7" r="1.3"/><circle class="fill" cx="15" cy="7.5" r="1.3"/>',
        external: '<path d="M15 3h6v6M10 14 21 3M18 13.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5.5"/>',
        file: '<path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z"/><path d="M14 3v5h5"/>',
        'file-json': '<path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z"/><path d="M14 3v5h5"/><path d="M10 12.5a1 1 0 0 0-1 1v.6a1 1 0 0 1-1 1 1 1 0 0 1 1 1v.6a1 1 0 0 0 1 1M14 12.5a1 1 0 0 1 1 1v.6a1 1 0 0 0 1 1 1 1 0 0 0-1 1v.6a1 1 0 0 1-1 1"/>',
        globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
        archive: '<rect x="3" y="4" width="18" height="5" rx="1.2"/><path d="M5 9v9.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V9M10 13h4"/>',
        monitor: '<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
        laptop: '<rect x="4.5" y="5" width="15" height="10.5" rx="1.5"/><path d="M2 19.5h20"/>',
        tablet: '<rect x="4.5" y="2.5" width="15" height="19" rx="2"/><path d="M11 18.5h2"/>',
        'tablet-landscape': '<rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="M18.5 11v2"/>',
        phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.2"/><path d="M11 18.5h2"/>',
        rotate: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
        compass: '<circle cx="12" cy="12" r="9"/><path class="fill" d="m12 5.5 2.6 6.5h-5.2z"/><path d="m9.4 12 2.6 6.5 2.6-6.5"/>',
        navigation: '<path d="m12 2.5 7.5 19-7.5-4.3-7.5 4.3z"/>',
        mountain: '<path d="m8.5 4.5 4.2 7.3 2.3-3.3 7 11H2z"/>',
        cube: '<path d="m12 2.8 8.5 4.7v9L12 21.2l-8.5-4.7v-9z"/><path d="m3.5 7.5 8.5 4.7 8.5-4.7M12 12.2v9"/>',
        sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
        moon: '<path d="M20.5 13.4A8.5 8.5 0 1 1 10.6 3.5a6.6 6.6 0 0 0 9.9 9.9z"/>',
        contrast: '<circle cx="12" cy="12" r="9"/><path class="fill" d="M12 3a9 9 0 0 1 0 18z"/>',
        crosshair: '<circle cx="12" cy="12" r="8"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>',
        help: '<circle cx="12" cy="12" r="9"/><path d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.4-2.7 4M12 17.3h.01"/>',
        keyboard: '<rect x="2" y="5.5" width="20" height="13" rx="2"/><path d="M6 9.5h.01M10 9.5h.01M14 9.5h.01M18 9.5h.01M6 13h.01M18 13h.01M9 15h6"/>',
        info: '<circle cx="12" cy="12" r="9"/><path d="M12 16.5v-5M12 8h.01"/>',
        alert: '<path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4M12 17h.01"/>',
        'alert-circle': '<circle cx="12" cy="12" r="9"/><path d="M12 8v4.5M12 16h.01"/>',
        'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8.2 12.2 2.6 2.6 5-5.3"/>',
        'x-circle': '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>',
        loader: '<path d="M12 3a9 9 0 1 0 9 9"/>',
        save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-7.5H7V21M7 3v4.5h8"/>',
        cloud: '<path d="M17.5 19H8a5.5 5.5 0 1 1 1.3-10.9A6.5 6.5 0 0 1 21 11.5 4 4 0 0 1 17.5 19z"/>',
        'cloud-check': '<path d="M17.5 19H8a5.5 5.5 0 1 1 1.3-10.9A6.5 6.5 0 0 1 21 11.5 4 4 0 0 1 17.5 19z"/><path d="m9.5 13.5 2 2 3.5-3.8"/>',
        edit: '<path d="M16.8 3.6a2.3 2.3 0 0 1 3.3 3.3L7.8 19.2 3 21l1.8-4.8z"/><path d="m15 5.5 3.5 3.5"/>',
        type: '<path d="M4 7V4.5h16V7M9 20h6M12 4.5V20"/>',
        heading: '<path d="M6 4v16M18 4v16M6 12h12"/>',
        video: '<rect x="2.5" y="5.5" width="14" height="13" rx="2"/><path d="m16.5 10.5 5-3v9l-5-3"/>',
        book: '<path d="M2.5 4.5h6a3.5 3.5 0 0 1 3.5 3.5v12.5a2.6 2.6 0 0 0-2.6-2.6H2.5zM21.5 4.5h-6A3.5 3.5 0 0 0 12 8v12.5a2.6 2.6 0 0 1 2.6-2.6h6.9z"/>',
        sparkles: '<path d="M12 3.5 13.7 8a2 2 0 0 0 1.2 1.2l4.6 1.8-4.6 1.8a2 2 0 0 0-1.2 1.2L12 18.5l-1.7-4.5a2 2 0 0 0-1.2-1.2L4.5 11l4.6-1.8A2 2 0 0 0 10.3 8z"/><path d="M19 3v4M17 5h4"/>',
        folder: '<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4.4l2 2h8.6a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/>',
        'folder-open': '<path d="M4 19.5 6.6 12a1.5 1.5 0 0 1 1.4-1h13a1 1 0 0 1 .9 1.3L19.5 19a1.5 1.5 0 0 1-1.4 1H4.5A1.5 1.5 0 0 1 3 18.5v-11A1.5 1.5 0 0 1 4.5 6h4.4l2 2H17a1.5 1.5 0 0 1 1.5 1.5V11"/>',
        grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
        sort: '<path d="M3 6h12M3 12h8M3 18h5M18 5v14M15 16l3 3 3-3"/>',
        refresh: '<path d="M21 12a9 9 0 0 1-15.3 6.4L3 16M3 12a9 9 0 0 1 15.3-6.4L21 8M21 3v5h-5M3 21v-5h5"/>',
        maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
        inset: '<rect x="3" y="3" width="18" height="18" rx="2.5"/><rect x="12" y="12" width="6" height="6" rx="1"/>',
        marker: '<path d="M12 21.5s-7-6.2-7-11.8a7 7 0 1 1 14 0c0 5.6-7 11.8-7 11.8z"/><circle class="fill" cx="12" cy="9.7" r="2.4"/>',
        'auto-play': '<path d="M4 5v14M8.5 5.5v13a.7.7 0 0 0 1 .6l10.6-6.5a.7.7 0 0 0 0-1.2L9.5 4.9a.7.7 0 0 0-1 .6z"/>',
        wand: '<path d="m14.5 5.5 4 4L7 21l-4-4zM18 2v3M21.5 5.5h-3M17 9"/>',
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        database: '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
        shield: '<path d="M12 21.5s8-3.5 8-10V5l-8-2.5L4 5v6.5c0 6.5 8 10 8 10z"/><path d="m8.8 12 2.2 2.2 4.2-4.4"/>',
        paste: '<rect x="8" y="2.5" width="8" height="4" rx="1"/><path d="M16 4.5h1.5A1.5 1.5 0 0 1 19 6v14a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V6a1.5 1.5 0 0 1 1.5-1.5H8"/>',
        target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle class="fill" cx="12" cy="12" r="1.6"/>',
        'insert-below': '<rect x="3" y="3.5" width="18" height="8" rx="1.5"/><path d="M12 15v6M9 18h6"/>',
        'insert-above': '<rect x="3" y="12.5" width="18" height="8" rx="1.5"/><path d="M12 3v6M9 6h6"/>',
        table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9.5h18M3 14.8h18M9 9.5V20"/>',
        columns: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/>',
        scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/>',
        'file-table': '<path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z"/><path d="M14 3v5h5"/><path d="M8.5 12h7v5.5h-7zM8.5 14.75h7M12 12v5.5"/>',
        'move-up': '<path d="M12 20V6M6 12l6-6 6 6M5 3h14"/>',
        'move-down': '<path d="M12 4v14M18 12l-6 6-6-6M5 21h14"/>',
        route: '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5"/>',
        geodata: '<path d="m4 17.5 5-8.5 5.5 5 5.5-9.5"/><circle class="fill" cx="4" cy="17.5" r="2"/><circle class="fill" cx="9" cy="9" r="2"/><circle class="fill" cx="14.5" cy="14" r="2"/><circle class="fill" cx="20" cy="4.5" r="2"/>',
        logo: '<path d="M7.5 10.2 13 8l6 2.2L24.5 8v13.8L19 24l-6-2.2-5.5 2.2z" transform="translate(-4 -4)"/><path d="M9 4v13.8M15 6.2V20" opacity=".6"/>'
    };

    /**
     * Renvoie un élément SVG.
     * @param {string} name  nom de l'icône
     * @param {number} [size=16]
     * @param {string} [cls]  classes supplémentaires
     */
    SM.icon = function (name, size, cls) {
        const s = size || 16;
        const body = P[name] || P.info;
        const tpl = document.createElement('template');
        tpl.innerHTML = '<svg class="icon' + (cls ? ' ' + cls : '') + '" width="' + s + '" height="' + s +
            '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + body + '</svg>';
        return tpl.content.firstChild;
    };

    SM.icon.has = name => Object.prototype.hasOwnProperty.call(P, name);

    /** Logo de l'application (carte pliée sur fond coloré). */
    SM.logo = function (size) {
        const s = size || 28;
        const tpl = document.createElement('template');
        tpl.innerHTML = '<svg class="app-logo" width="' + s + '" height="' + s + '" viewBox="0 0 32 32" aria-hidden="true">' +
            '<defs><linearGradient id="lg-logo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#15a3d6"/><stop offset="1" stop-color="#0a6f9c"/></linearGradient></defs>' +
            '<rect width="32" height="32" rx="8" fill="url(#lg-logo)"/>' +
            '<path d="M7.5 10.2 13 8l6 2.2L24.5 8v13.8L19 24l-6-2.2-5.5 2.2z" fill="rgba(255,255,255,.14)" stroke="#fff" stroke-width="1.9" stroke-linejoin="round"/>' +
            '<path d="M13 8v13.8M19 10.2V24" stroke="#fff" stroke-width="1.9" opacity=".62"/>' +
            '<circle cx="21.6" cy="10.4" r="3.1" fill="#ffcf5c" stroke="#0a6f9c" stroke-width="1.2"/></svg>';
        return tpl.content.firstChild;
    };
})();
