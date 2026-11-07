/**
 * StoryMap — Extraction des coordonnées GPS à partir des métadonnées EXIF (JPEG)
 */

export interface ExifGeoCoordinates {
  latitude: number;
  longitude: number;
}

export function extractGpsFromExif(buffer: ArrayBuffer): ExifGeoCoordinates | null {
  const view = new DataView(buffer);
  if (view.byteLength < 2 || view.getUint16(0, false) !== 0xffd8) {
    return null; // Pas un fichier JPEG
  }

  let offset = 2;
  const length = view.byteLength;

  while (offset < length) {
    if (view.getUint8(offset) !== 0xff) return null;
    const marker = view.getUint8(offset + 1);

    if (marker === 0xe1) {
      // APP1 Marker (EXIF)
      return parseExif(view, offset + 4);
    }
    offset += 2 + view.getUint16(offset + 2, false);
  }

  return null;
}

function parseExif(view: DataView, start: number): ExifGeoCoordinates | null {
  // Vérification de l'en-tête "Exif\0\0"
  if (
    view.getUint32(start, false) !== 0x45786966 ||
    view.getUint16(start + 4, false) !== 0x0000
  ) {
    return null;
  }

  const tiffStart = start + 6;
  const bigEndian = view.getUint16(tiffStart, false) === 0x4d4d;

  const getU16 = (off: number) => view.getUint16(off, !bigEndian);
  const getU32 = (off: number) => view.getUint32(off, !bigEndian);

  if (getU16(tiffStart + 2) !== 0x002a) return null;

  const ifd0Offset = getU32(tiffStart + 4);
  const ifd0 = tiffStart + ifd0Offset;
  const numEntries = getU16(ifd0);

  let gpsOffset = 0;
  for (let i = 0; i < numEntries; i++) {
    const entry = ifd0 + 2 + i * 12;
    const tag = getU16(entry);
    if (tag === 0x8825) {
      // GPS IFD Pointer
      gpsOffset = getU32(entry + 8);
      break;
    }
  }

  if (!gpsOffset) return null;

  const gpsIfd = tiffStart + gpsOffset;
  const numGpsEntries = getU16(gpsIfd);

  let latRef = 'N';
  let lonRef = 'E';
  let latVal: number[] | null = null;
  let lonVal: number[] | null = null;

  for (let i = 0; i < numGpsEntries; i++) {
    const entry = gpsIfd + 2 + i * 12;
    const tag = getU16(entry);
    const valueOffset = getU32(entry + 8);

    if (tag === 0x0001) latRef = String.fromCharCode(view.getUint8(entry + 8));
    if (tag === 0x0003) lonRef = String.fromCharCode(view.getUint8(entry + 8));
    if (tag === 0x0002) latVal = readRationals(view, tiffStart + valueOffset, 3, bigEndian);
    if (tag === 0x0004) lonVal = readRationals(view, tiffStart + valueOffset, 3, bigEndian);
  }

  if (!latVal || !lonVal) return null;

  const latitude = (latVal[0] + latVal[1] / 60 + latVal[2] / 3600) * (latRef === 'S' ? -1 : 1);
  const longitude = (lonVal[0] + lonVal[1] / 60 + lonVal[2] / 3600) * (lonRef === 'W' ? -1 : 1);

  return { latitude, longitude };
}

function readRationals(view: DataView, offset: number, count: number, bigEndian: boolean): number[] {
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    const num = view.getUint32(offset + i * 8, !bigEndian);
    const den = view.getUint32(offset + i * 8 + 4, !bigEndian);
    result.push(den === 0 ? 0 : num / den);
  }
  return result;
}

