/**
 * StoryMap — Assainissement HTML sécurisé (Sanitization)
 */

const DANGEROUS_TAGS = new Set([
  'script',
  'style',
  'link',
  'meta',
  'base',
  'object',
  'embed',
  'applet',
  'frame',
  'frameset',
  'noscript',
  'template',
  'animate',
  'set',
]);

const URL_ATTRS = new Set(['href', 'src', 'xlink:href', 'action', 'formaction', 'poster']);

function isSafeUrl(val: string, attr: string, tag: string): boolean {
  const v = val.replace(/[\u0000-\u0020\u007F-\u009F]/g, '').toLowerCase();
  if (/^(javascript|vbscript|livescript|data:text\/html):/.test(v)) return false;
  if (v.startsWith('data:')) {
    if (attr === 'src' && tag === 'img' && /^data:image\//.test(v)) return true;
    return false;
  }
  return true;
}

export function sanitizeHTML(dirtyHtml: string): string {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';
  if (dirtyHtml.indexOf('<') === -1) return dirtyHtml;

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

      // Retrait des gestionnaires d'événements onclick, onerror, etc.
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
        continue;
      }

      // Filtrage des URLs javascript: etc.
      if (URL_ATTRS.has(name)) {
        if (!isSafeUrl(val, name, tagName)) {
          el.removeAttribute(attr.name);
        }
      }
    }
  }

  return doc.body.innerHTML;
}

