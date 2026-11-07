/* ==========================================================================
   StoryMap — archives ZIP (écriture « stockée » et lecture)
   ========================================================================== */
(function () {
    'use strict';

    const SM = window.SM;

    const CRC_TABLE = (function () {
        const t = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
            t[n] = c >>> 0;
        }
        return t;
    })();

    function crc32(bytes) {
        let c = 0xFFFFFFFF;
        for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
        return (c ^ 0xFFFFFFFF) >>> 0;
    }

    async function toBytes(data) {
        if (data instanceof Uint8Array) return data;
        if (data instanceof ArrayBuffer) return new Uint8Array(data);
        if (data instanceof Blob) return new Uint8Array(await data.arrayBuffer());
        return new TextEncoder().encode(String(data));
    }

    function dosDateTime(date) {
        const d = date || new Date();
        const time = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF;
        const day = (((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
        return { time, day };
    }

    const Z = SM.zip = {};

    /**
     * Crée une archive ZIP (sans compression : les images sont déjà compressées).
     * @param {{name: string, data: string|Blob|Uint8Array}[]} entries
     * @returns {Promise<Blob>}
     */
    Z.create = async function (entries) {
        const enc = new TextEncoder();
        const parts = [];
        const central = [];
        let offset = 0;
        const { time, day } = dosDateTime();

        for (const entry of entries) {
            const nameBytes = enc.encode(entry.name);
            const data = await toBytes(entry.data);
            const crc = crc32(data);

            const local = new DataView(new ArrayBuffer(30));
            local.setUint32(0, 0x04034b50, true);
            local.setUint16(4, 20, true);
            local.setUint16(6, 0x0800, true);      // noms en UTF-8
            local.setUint16(8, 0, true);           // stockage sans compression
            local.setUint16(10, time, true);
            local.setUint16(12, day, true);
            local.setUint32(14, crc, true);
            local.setUint32(18, data.length, true);
            local.setUint32(22, data.length, true);
            local.setUint16(26, nameBytes.length, true);
            local.setUint16(28, 0, true);
            parts.push(new Uint8Array(local.buffer), nameBytes, data);

            const cd = new DataView(new ArrayBuffer(46));
            cd.setUint32(0, 0x02014b50, true);
            cd.setUint16(4, 20, true);
            cd.setUint16(6, 20, true);
            cd.setUint16(8, 0x0800, true);
            cd.setUint16(10, 0, true);
            cd.setUint16(12, time, true);
            cd.setUint16(14, day, true);
            cd.setUint32(16, crc, true);
            cd.setUint32(20, data.length, true);
            cd.setUint32(24, data.length, true);
            cd.setUint16(28, nameBytes.length, true);
            cd.setUint16(30, 0, true);
            cd.setUint16(32, 0, true);
            cd.setUint16(34, 0, true);
            cd.setUint16(36, 0, true);
            cd.setUint32(38, 0, true);
            cd.setUint32(42, offset, true);
            central.push(new Uint8Array(cd.buffer), nameBytes);

            offset += 30 + nameBytes.length + data.length;
        }

        const cdSize = central.reduce((s, a) => s + a.length, 0);
        const end = new DataView(new ArrayBuffer(22));
        end.setUint32(0, 0x06054b50, true);
        end.setUint16(4, 0, true);
        end.setUint16(6, 0, true);
        end.setUint16(8, entries.length, true);
        end.setUint16(10, entries.length, true);
        end.setUint32(12, cdSize, true);
        end.setUint32(16, offset, true);
        end.setUint16(20, 0, true);

        return new Blob(parts.concat(central, [new Uint8Array(end.buffer)]), { type: 'application/zip' });
    };

    async function inflateRaw(bytes) {
        if (typeof DecompressionStream === 'undefined') {
            throw new Error('Votre navigateur ne sait pas décompresser cette archive. Décompressez-la puis importez les fichiers.');
        }
        const ds = new DecompressionStream('deflate-raw');
        const stream = new Blob([bytes]).stream().pipeThrough(ds);
        return new Uint8Array(await new Response(stream).arrayBuffer());
    }

    /**
     * Lit une archive ZIP.
     * @returns {Promise<{name: string, bytes: () => Promise<Uint8Array>, text: () => Promise<string>}[]>}
     */
    Z.read = async function (blob) {
        const buf = new Uint8Array(await blob.arrayBuffer());
        const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
        // Recherche de l'enregistrement de fin de répertoire central
        let eocd = -1;
        for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
            if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
        }
        if (eocd < 0) throw new Error('Archive ZIP invalide ou corrompue.');
        const count = view.getUint16(eocd + 10, true);
        let ptr = view.getUint32(eocd + 16, true);
        const dec8 = new TextDecoder('utf-8');
        const dec437 = new TextDecoder('windows-1252');
        const entries = [];
        for (let n = 0; n < count; n++) {
            if (view.getUint32(ptr, true) !== 0x02014b50) throw new Error('Répertoire de l’archive ZIP illisible.');
            const flags = view.getUint16(ptr + 8, true);
            const method = view.getUint16(ptr + 10, true);
            const compSize = view.getUint32(ptr + 20, true);
            const nameLen = view.getUint16(ptr + 28, true);
            const extraLen = view.getUint16(ptr + 30, true);
            const commentLen = view.getUint16(ptr + 32, true);
            const localOffset = view.getUint32(ptr + 42, true);
            const nameBytes = buf.subarray(ptr + 46, ptr + 46 + nameLen);
            const name = (flags & 0x0800 ? dec8 : dec437).decode(nameBytes);
            ptr += 46 + nameLen + extraLen + commentLen;
            if (name.endsWith('/')) continue;

            const lNameLen = view.getUint16(localOffset + 26, true);
            const lExtraLen = view.getUint16(localOffset + 28, true);
            const start = localOffset + 30 + lNameLen + lExtraLen;
            const raw = buf.subarray(start, start + compSize);
            let cache = null;
            const bytes = async () => {
                if (cache) return cache;
                if (method === 0) cache = raw;
                else if (method === 8) cache = await inflateRaw(raw);
                else throw new Error('Méthode de compression non prise en charge dans « ' + name + ' ».');
                return cache;
            };
            entries.push({ name, bytes, text: async () => dec8.decode(await bytes()) });
        }
        return entries;
    };

    Z.crc32 = crc32;
})();
