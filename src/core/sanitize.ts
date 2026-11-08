/**
 * StoryMap — Assainissement HTML sécurisé, échappement d'attributs et validation d'URL (V08 / C01)
 */

const DANGEROUS_TAGS = new Set([
  'script', 'style', 'link', 'meta', 'base', 'object', 'embed',
  'applet', 'frame', 'frameset', 'noscript', 'template', 'animate', 'set',
]);

const URL_ATTRS = new Set(['href', 'src', 'xlink:href', 'action', 'formaction', 'poster']);

function isSafeUrl(val: string, attr: string, tag: string): boolean {
  const v = val.replace(/[\u0000-\u0020\u007F-\u009F]/g, '').toLowerCase();
  if (/^(javascript|vbscript|livescript|data:text\/html):/.test(v)) return false;
  if (v.startsWith('data:')) {
    if (attr === 'src' && tag === 'img' && /^data:image\/(png|jpe?g|gif|webp|svg\+xml|bmp)/i.test(v)) return true;
    return false;
  }
  return true;
}

/** Échappe strictement une valeur destinée à un attribut ou texte HTML */
export function escapeAttr(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Valide et assainit une URL (renvoie la chaîne brute canonique sûre sans double échappement) */
export function sanitizeSafeUrl(rawUrl: unknown): string {
  if (typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  const normalized = trimmed.replace(/[\u0000-\u0020\u007F-\u009F]/g, '').toLowerCase();
  if (/^(javascript|vbscript|livescript|file):/.test(normalized)) return '';
  if (normalized.startsWith('data:')) {
    return /^data:image\/(png|jpe?g|gif|webp|bmp)/i.test(normalized) ? trimmed : '';
  }
  if (/^(https?:\/\/|blob:|\/|\.\.?\/|[a-z0-9_-]+\/|[a-z0-9_.-]+\.(png|jpe?g|gif|webp|svg))/i.test(normalized)) {
    return trimmed;
  }
  return '';
}

/** Borne un entier dans l'intervalle [min, max] avec valeur de repli */
export function clampInt(val: unknown, min: number, max: number, fallback: number): number {
  const n = typeof val === 'string' ? parseInt(val, 10) : Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export function sanitizeHTML(dirtyHtml: string): string {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';
  if (dirtyHtml.indexOf('<') === -1) return dirtyHtml;

  if (typeof DOMParser === 'undefined') {
    return dirtyHtml
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/\s*on\w+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '')
      .replace(/href\s*=\s*(["']\s*javascript:[^"']*["']|\s*javascript:[^\s>]+)/gi, '')
      .replace(/src\s*=\s*(["']\s*javascript:[^"']*["']|\s*javascript:[^\s>]+)/gi, '');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<!DOCTYPE html><html><body>${dirtyHtml}</body></html>`, 'text/html');
  const elements = Array.from(doc.body.querySelectorAll('*'));

  for (const el of elements) {
    const tagName = el.tagName.toLowerCase();
    if (DANGEROUS_TAGS.has(tagName)) {
      el.remove();
      continue;
    }

    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      const name = attr.name.toLowerCase();
      const val = attr.value;
      if (name.startsWith('on') || (URL_ATTRS.has(name) && !isSafeUrl(val, name, tagName))) {
        el.removeAttribute(attr.name);
      }
    }
  }

  return doc.body.innerHTML;
}
