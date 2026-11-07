/* ==========================================================================
   StoryMap — fichiers CSV (lecture et écriture)
   --------------------------------------------------------------------------
   Format tabulaire RFC 4180 : une ligne par enregistrement, champs séparés
   par un point-virgule (Excel en français), une virgule, une tabulation…,
   entre guillemets s'ils contiennent le séparateur, un guillemet ("" dans
   le champ) ou un retour à la ligne.
   Lecture : UTF-8 (avec ou sans BOM), UTF-16 (« Texte Unicode » d'Excel) ou
   Windows-1252 (CSV enregistrés par Excel sous Windows) ; séparateur détecté.
   Écriture : UTF-8 avec BOM (reconnu par Excel), fins de ligne CRLF.
   ========================================================================== */
(function () {
    'use strict';

    const SM = window.SM;
    const C = SM.csv = {};

    C.ACCEPT = '.csv,.tsv,.txt,text/csv,text/tab-separated-values';
    C.MAX_BYTES = 20 * 1024 * 1024;

    const BOM = String.fromCharCode(0xFEFF);
    const TAB = String.fromCharCode(9);

    /** Séparateurs reconnus, par ordre de préférence en cas d'égalité. */
    C.DELIMITERS = [';', ',', TAB, '|'];

    C.DELIMITER_LABELS = { ';': 'point-virgule', ',': 'virgule', '|': 'barre verticale' };
    C.DELIMITER_LABELS[TAB] = 'tabulation';

    C.isCsvName = name => /\.(csv|tsv)$/i.test(name || '');

    /**
     * Texte d'un fichier : UTF-16 (BOM), UTF-8 (BOM retiré), sinon Windows-1252.
     * @returns {{text: string, encoding: string}}
     */
    C.decode = function (bytes) {
        const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
        if (u8[0] === 0xFF && u8[1] === 0xFE) return { text: new TextDecoder('utf-16le').decode(u8.subarray(2)), encoding: 'UTF-16' };
        if (u8[0] === 0xFE && u8[1] === 0xFF) return { text: new TextDecoder('utf-16be').decode(u8.subarray(2)), encoding: 'UTF-16' };
        let text;
        let encoding = 'UTF-8';
        try {
            text = new TextDecoder('utf-8', { fatal: true }).decode(u8);
        } catch (e) {
            text = new TextDecoder('windows-1252').decode(u8);
            encoding = 'Windows-1252';
        }
        if (text.startsWith(BOM)) text = text.slice(1);
        return { text, encoding };
    };

    /** Lit un fichier CSV (File ou Blob). */
    C.readFile = async function (file) {
        if (file.size > C.MAX_BYTES) throw new Error('Fichier trop volumineux (' + SM.util.formatBytes(file.size) + ') : 20 Mo au plus.');
        return C.decode(new Uint8Array(await file.arrayBuffer()));
    };

    /**
     * Découpe un texte CSV en lignes de champs (guillemets, "" et retours à la
     * ligne dans les champs pris en charge ; un guillemet isolé au milieu d'un
     * champ est gardé tel quel).
     * @param {string} text
     * @param {object} [opts] { delimiter (détecté par défaut), maxRows }
     * @returns {string[][]}
     */
    C.parse = function (text, opts) {
        const s = String(text || '');
        const d = (opts && opts.delimiter) || C.detectDelimiter(s);
        const max = (opts && opts.maxRows) || Infinity;
        const rows = [];
        let row = [];
        let field = '';
        let quoted = false;   // à l'intérieur de guillemets
        let wasQuoted = false; // le champ courant a commencé par un guillemet
        const n = s.length;
        let i = 0;
        while (i < n) {
            const ch = s[i];
            if (quoted) {
                if (ch === '"') {
                    if (s[i + 1] === '"') { field += '"'; i += 2; continue; }
                    quoted = false;
                    i++;
                    continue;
                }
                field += ch;
                i++;
                continue;
            }
            if (ch === '"' && field === '' && !wasQuoted) { quoted = true; wasQuoted = true; i++; continue; }
            if (ch === d) { row.push(field); field = ''; wasQuoted = false; i++; continue; }
            if (ch === '\r' || ch === '\n') {
                row.push(field);
                rows.push(row);
                row = [];
                field = '';
                wasQuoted = false;
                if (rows.length >= max) return rows;
                i += ch === '\r' && s[i + 1] === '\n' ? 2 : 1;
                continue;
            }
            field += ch;
            i++;
        }
        if (field !== '' || row.length || wasQuoted) {
            row.push(field);
            rows.push(row);
        }
        return rows;
    };

    /**
     * Séparateur le plus probable : celui qui donne à la ligne d'en-tête au
     * moins deux champs, et le même nombre de champs au plus grand nombre de
     * lignes suivantes.
     */
    C.detectDelimiter = function (text) {
        const sample = String(text || '').slice(0, 30000);
        const truncated = sample.length < String(text || '').length;
        let best = ';';
        let bestScore = -1;
        for (const d of C.DELIMITERS) {
            const rows = C.parse(sample, { delimiter: d, maxRows: 40 }).filter(r => r.length > 1 || r[0].trim() !== '');
            if (truncated && rows.length > 2) rows.pop(); // dernière ligne peut-être coupée
            if (!rows.length || rows[0].length < 2) continue;
            const n = rows[0].length;
            const same = rows.filter(r => r.length === n).length / rows.length;
            const score = same * 100 + Math.min(n, 40);
            if (score > bestScore) { best = d; bestScore = score; }
        }
        return best;
    };

    /**
     * Texte CSV. opts = { delimiter (;), bom (true), eol ('\r\n') }.
     * Les champs sont mis entre guillemets s'ils contiennent le séparateur, un
     * guillemet, un retour à la ligne ou commencent / finissent par une espace.
     */
    C.stringify = function (rows, opts) {
        opts = opts || {};
        const d = opts.delimiter || ';';
        const eol = opts.eol || '\r\n';
        const esc = v => {
            const s = v === undefined || v === null ? '' : String(v);
            const quote = s.indexOf(d) >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0 || s.indexOf('\r') >= 0 || /^\s|\s$/.test(s);
            return quote ? '"' + s.replace(/"/g, '""') + '"' : s;
        };
        return (opts.bom === false ? '' : BOM) + rows.map(r => r.map(esc).join(d)).join(eol) + (opts.trailing === false ? '' : eol);
    };

    C.TAB = TAB;
})();
