/**
 * StoryMap — Sérialisation sécurisée des blocs pour la publication HTML enrichie & Brochure (V01/V04/V08/V09)
 */

import type { StoryMap } from '../types/story';
import type { Block, Page } from '../types/project';
import type { PageFormat } from '../types/grid';
import { getGridDimensions } from './grid';
import { sanitizeHTML, escapeAttr, sanitizeSafeUrl, clampInt } from './sanitize';

export function sanitizePublishedStory(story: StoryMap, safeAccent: string): StoryMap {
  return {
    ...story,
    title: sanitizeHTML(story.title || 'Document StoryMap'),
    appearance: { ...story.appearance, accentColor: safeAccent },
    steps: story.steps || [],
    pages: (story.pages || []).map((p) => ({
      ...p,
      title: sanitizeHTML(p.title || ''),
      blocks: (p.blocks || []).map((b) => {
        const d = { ...b.data };
        if (typeof d.text === 'string') d.text = sanitizeHTML(d.text);
        if (typeof d.url === 'string') d.url = sanitizeSafeUrl(d.url);
        if (typeof d.alt === 'string') d.alt = sanitizeHTML(d.alt);
        if (typeof d.caption === 'string') d.caption = sanitizeHTML(d.caption);
        if (d.level !== undefined) d.level = clampInt(d.level, 1, 6, 2);
        return { ...b, data: d };
      }),
    })),
  };
}

export function renderPublishedBlockHTML(b: Block, safeAccent: string): string {
  const safeId = escapeAttr(b.id || 'blk');
  const colStart = clampInt(b.x, 0, 24, 0) + 1;
  const rowStart = clampInt(b.y, 0, 24, 0) + 1;
  const colSpan = clampInt(b.w, 1, 24, 1);
  const rowSpan = clampInt(b.h, 1, 24, 1);

  const bindingAttrs = b.binding
    ? ` data-binding-map="${escapeAttr(b.binding.mapId)}" data-binding-feature="${escapeAttr(b.binding.targetFeatureId || '')}" data-binding-action="${escapeAttr(b.binding.action || 'highlight')}"`
    : '';

  const bindingBadge = b.binding && b.type !== 'map'
    ? `<button type="button" class="binding-pill" onclick="triggerNarrativeBinding('${escapeAttr(b.binding.mapId)}','${escapeAttr(b.binding.targetFeatureId || '')}','${escapeAttr(b.binding.action || 'highlight')}')">#${clampInt(b.binding.numberIndex, 1, 999, 1)} · ${escapeAttr(b.binding.action || 'focus')}</button>`
    : '';

  let content = '';

  if (b.type === 'title') {
    const lvl = clampInt(b.data.level, 1, 6, 2);
    content = `${bindingBadge}<h${lvl} style="margin:0;color:#0f172a;">${sanitizeHTML((b.data.text as string) || '')}</h${lvl}>`;
  } else if (b.type === 'callout') {
    content = `${bindingBadge}<div style="padding:10px;background:#f0f9ff;border-left:4px solid ${safeAccent};border-radius:4px;color:#0f172a;">${sanitizeHTML((b.data.text as string) || '')}</div>`;
  } else if (b.type === 'table') {
    const rows = Array.isArray(b.data.rows) ? (b.data.rows as string[][]) : [['-']];
    const rowsMarkup = rows
      .map((r, ri) => {
        const cells = Array.isArray(r) ? r : [];
        return `<tr>${cells
          .map((c) =>
            ri === 0
              ? `<th style="border:1px solid #cbd5e1;padding:6px;background:#f8fafc;color:#0f172a;">${sanitizeHTML(String(c ?? ''))}</th>`
              : `<td style="border:1px solid #cbd5e1;padding:6px;color:#1e293b;">${sanitizeHTML(String(c ?? ''))}</td>`
          )
          .join('')}</tr>`;
      })
      .join('');
    content = `${bindingBadge}<table style="width:100%;border-collapse:collapse;font-size:12px;">${rowsMarkup}</table>`;
  } else if (b.type === 'image' || b.type === 'gallery') {
    const contactItems = Array.isArray(b.data.contactSheetItems)
      ? (b.data.contactSheetItems as Array<{ url: string; caption?: string }>)
      : [];
    const galleryItems: Array<{ url: string; caption?: string }> = Array.isArray(b.data.items)
      ? (b.data.items as Array<{ url: string; caption?: string }>)
      : Array.isArray(b.data.images)
        ? (b.data.images as string[]).map((u) => ({ url: u, caption: '' }))
        : [];
    const caption = escapeAttr((b.data.caption as string) || '');

    if (b.data.isContactSheet && contactItems.length > 0) {
      const cells = contactItems
        .map((it, idx) => {
          const u = sanitizeSafeUrl(it?.url);
          const cap = escapeAttr(it?.caption || `Photo ${idx + 1}`);
          return `<figure style="margin:0;border:1px solid #e2e8f0;border-radius:4px;overflow:hidden;background:#f8fafc;">${u ? `<img src="${u}" alt="${cap}" style="width:100%;height:80px;object-fit:cover;display:block;"/>` : ''}<figcaption style="font-size:10px;padding:3px 6px;color:#334155;">${cap}</figcaption></figure>`;
        })
        .join('');
      content = `<div class="contact-sheet" style="display:grid;grid-template-columns:repeat(${Math.min(3, Math.max(1, contactItems.length))},1fr);gap:6px;">${cells}</div>`;
    } else if (b.type === 'gallery' && galleryItems.length > 1) {
      const slides = galleryItems
        .map((it, idx) => {
          const u = sanitizeSafeUrl(it?.url);
          const cap = escapeAttr(it?.caption || caption || `Vue ${idx + 1}`);
          return `<img class="gallery-slide" data-gallery="${safeId}" data-idx="${idx}" src="${u}" alt="${cap}" style="display:${idx === 0 ? 'block' : 'none'};width:100%;height:100%;object-fit:cover;border-radius:4px;"/>`;
        })
        .join('');
      content = `<div class="gallery-box" id="gal-${safeId}" data-count="${galleryItems.length}" data-cur="0" style="position:relative;width:100%;height:100%;">${slides}<div style="position:absolute;bottom:6px;right:6px;background:rgba(15,23,42,0.75);color:#fff;border-radius:999px;padding:2px 8px;display:flex;gap:6px;align-items:center;"><button type="button" data-carousel-control="true" aria-label="Image précédente" onclick="stepGallery('${safeId}',-1)" style="background:none;border:0;color:#fff;cursor:pointer;">◀</button><span id="gal-lbl-${safeId}" style="font-size:11px;">1/${galleryItems.length}</span><button type="button" data-carousel-control="true" aria-label="Image suivante" onclick="stepGallery('${safeId}',1)" style="background:none;border:0;color:#fff;cursor:pointer;">▶</button></div></div>`;
    } else {
      const safeUrl = sanitizeSafeUrl(b.data.url || galleryItems[0]?.url);
      content = `<figure style="margin:0;height:100%;display:flex;flex-direction:column;">${safeUrl ? `<img src="${safeUrl}" alt="${caption}" style="width:100%;flex:1;min-height:0;object-fit:cover;border-radius:4px;"/>` : `<div style="flex:1;display:grid;place-items:center;background:#f1f5f9;color:#64748b;font-size:11px;">Image non définie</div>`}${caption ? `<figcaption style="font-size:11px;color:#475569;padding-top:4px;">${caption}</figcaption>` : ''}</figure>`;
    }
  } else if (b.type === 'map') {
    const mapId = escapeAttr((b.binding?.mapId || (b.data.mapId as string) || 'default'));
    const targetFeat = escapeAttr(b.binding?.targetFeatureId || '');
    const action = escapeAttr(b.binding?.action || 'highlight');
    const title = escapeAttr((b.data.title as string) || 'Carte interactive');
    const cap = escapeAttr((b.data.caption as string) || '');
    content = `<div class="doc-map-wrapper" style="position:relative;width:100%;height:100%;min-height:140px;border-radius:4px;overflow:hidden;background:#e2e8f0;">
      <div class="doc-map-canvas" id="doc-map-${safeId}" data-map-id="${mapId}" data-target-feature="${targetFeat}" data-action="${action}" aria-label="${title}" style="position:absolute;inset:0;width:100%;height:100%;"></div>
      <div class="doc-map-fallback" id="doc-map-fb-${safeId}" style="display:none;position:absolute;inset:0;background:#1e293b;color:#e2e8f0;padding:12px;align-items:center;justify-content:center;text-align:center;font-size:12px;">Carte "${title}" (mode hors-ligne)</div>
      <div class="doc-map-attrib" style="position:absolute;bottom:3px;right:5px;background:rgba(255,255,255,0.88);color:#334155;padding:1px 5px;border-radius:3px;font-size:9px;z-index:5;">${cap ? `${cap} · ` : ''}© OpenStreetMap · © CARTO</div>
    </div>`;
  } else if (b.type === 'legend' || b.type === 'source') {
    content = `<div style="font-size:11px;color:#475569;font-style:${b.type === 'source' ? 'italic' : 'normal'};">${sanitizeHTML((b.data.text as string) || '')}</div>`;
  } else if (b.type === 'text') {
    content = `${bindingBadge}<div style="font-size:13px;line-height:1.55;color:#1e293b;">${sanitizeHTML((b.data.text as string) || '')}</div>`;
  } else {
    content = `<div class="unsupported-block-notice" style="padding:8px;background:#fef3c7;color:#92400e;border:1px solid #f59e0b;border-radius:4px;font-size:11px;">Bloc de type "${escapeAttr(b.type)}" non pris en charge sur ce support.</div>`;
  }

  return `<div class="block" id="block-${safeId}"${bindingAttrs} style="grid-column:${colStart} / span ${colSpan};grid-row:${rowStart} / span ${rowSpan};background:#fff;border-radius:6px;padding:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);overflow:auto;position:relative;">${content}</div>`;
}

export function renderPublishedPageHTML(page: Page, pIdx: number, fallbackFormat: PageFormat, safeAccent: string): string {
  const fmt = page.layout?.format || fallbackFormat || 'a4-portrait';
  const dims = getGridDimensions(fmt);
  const blocksHtml = (page.blocks || []).map((b) => renderPublishedBlockHTML(b, safeAccent)).join('\n');
  const safePageTitle = escapeAttr(page.title || `Page ${pIdx + 1}`);

  return `<section class="doc-page ${pIdx === 0 ? 'active' : ''}" id="page-${pIdx}" data-page-index="${pIdx}" aria-label="${safePageTitle}" style="display:${pIdx === 0 ? 'inline-block' : 'none'};padding:${dims.marginMm}mm;background:#fff;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.18);margin:16px auto;aspect-ratio:${dims.aspectRatio};">
    <div style="display:grid;grid-template-columns:repeat(${dims.cols}, ${dims.cellWidthPx}px);grid-template-rows:repeat(${dims.rows}, ${dims.cellHeightPx}px);gap:${dims.gapPx}px;">
      ${blocksHtml}
    </div>
  </section>`;
}
