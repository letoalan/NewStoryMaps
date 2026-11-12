/**
 * StoryMap — Sérialisation sécurisée des blocs pour la publication HTML enrichie & Brochure (V01/V04/V08/V09/N2/N3)
 */

import type { StoryMap } from '../types/story';
import type { Block, Page } from '../types/project';
import type { PageFormat } from '../types/grid';
import type { OutputProfile } from '../types/theme';
import { getGridDimensions } from './grid';
import { sanitizeHTML, escapeAttr, sanitizeSafeUrl, clampInt } from './sanitize';
import { resolveVisualStyle, hexToRgba } from './themeResolver';
import { renderPublishedHeroHTML } from './heroRenderer';
import { parseVideoEmbedUrl } from './videoEmbed';

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

export function renderPublishedBlockHTML(
  b: Block,
  safeAccent: string,
  story?: Partial<StoryMap> | null,
  page?: Partial<Page> | null,
  outputProfile: OutputProfile = 'web-interactive'
): string {
  const safeId = escapeAttr(b.id || 'blk');
  const colStart = clampInt(b.x, 0, 24, 0) + 1;
  const rowStart = clampInt(b.y, 0, 24, 0) + 1;
  const colSpan = clampInt(b.w, 1, 24, 1);
  const rowSpan = clampInt(b.h, 1, 24, 1);
  const vStyle = resolveVisualStyle(story, page, b, outputProfile);
  const effectiveAccent = vStyle.accentColor || safeAccent;

  const bindingAttrs = b.binding
    ? ` data-binding-map="${escapeAttr(b.binding.mapId)}" data-binding-feature="${escapeAttr(b.binding.targetFeatureId || '')}" data-binding-action="${escapeAttr(b.binding.action || 'highlight')}"`
    : '';

  const bindingBadge = b.binding && b.type !== 'map'
    ? `<button type="button" class="binding-pill" data-action="narrative-binding" data-map-id="${escapeAttr(b.binding.mapId)}" data-feature-id="${escapeAttr(b.binding.targetFeatureId || '')}" data-binding-action="${escapeAttr(b.binding.action || 'highlight')}">#${clampInt(b.binding.numberIndex, 1, 999, 1)} · ${escapeAttr(b.binding.action || 'focus')}</button>`
    : '';

  let content = '';

  if (b.type === 'title') {
    const lvl = clampInt(b.data.level, 1, 6, 2);
    const heroConfig = page?.hero?.enabled ? page.hero : story?.hero?.enabled ? story.hero : undefined;
    if (heroConfig?.enabled) {
      const parsedVid = parseVideoEmbedUrl(heroConfig.mediaUrl);
      const isVid = (heroConfig.mediaType === 'video' || parsedVid.isEmbed || heroConfig.mediaUrl?.startsWith('data:video/') || /\.(mp4|webm|ogg|mov|m4v)/i.test(heroConfig.mediaUrl || '')) && outputProfile !== 'print';
      const imgSrc = outputProfile === 'print' || !isVid ? heroConfig.posterUrl || heroConfig.mediaUrl || '' : '';
      const vCol = (heroConfig.veilColor && heroConfig.veilColor !== '#0f172a' ? heroConfig.veilColor : vStyle.primaryColor) || '#0f172a';
      const vOp = Math.max(0, Math.min(1, heroConfig.veilOpacity ?? 0.45));
      const veil = heroConfig.veilStyle === 'solid' ? hexToRgba(vCol, vOp) : `linear-gradient(135deg, ${hexToRgba(vCol, Math.min(0.95, vOp * 1.25))} 0%, ${hexToRgba(vCol, Math.max(0.1, vOp * 0.4))} 100%)`;
      const mediaHtml = isVid && heroConfig.mediaUrl
        ? (parsedVid.isEmbed
          ? `<iframe class="hero-video hero-iframe" src="${escapeAttr(parsedVid.embedUrl)}" allow="autoplay; fullscreen; picture-in-picture" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:max(100%,178vh);height:max(100%,56.25vw,540px);min-width:100%;min-height:100%;border:none;pointer-events:none;z-index:1;"></iframe>`
          : `<video class="hero-video" src="${escapeAttr(heroConfig.mediaUrl)}" poster="${escapeAttr(heroConfig.posterUrl || '')}" autoplay loop muted playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;"></video>`)
        : `<img class="hero-photo" src="${escapeAttr(imgSrc)}" alt="Couverture" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;"/>`;
      const heroLogo = heroConfig.logoUrl || story?.brand?.logo || vStyle.logo;
      const logoHtml = heroLogo ? `<img class="hero-logo" src="${escapeAttr(heroLogo)}" alt="Logo" style="max-height:40px;max-width:160px;object-fit:contain;margin-bottom:6px;"/>` : '';
      content = `<div class="hero-title-wrap" style="position:relative;width:100%;height:100%;overflow:hidden;border-radius:${escapeAttr(vStyle.radiusCss)};display:flex;flex-direction:column;justify-content:center;padding:12px 16px;color:#fff;">${mediaHtml}<div style="position:absolute;inset:0;background:${veil};z-index:2;pointer-events:none;"></div><div style="position:relative;z-index:3;">${bindingBadge}${logoHtml}<h${lvl} style="margin:0;color:#fff;text-shadow:0 2px 6px rgba(0,0,0,0.6);font-family:${escapeAttr(vStyle.headingFont)},sans-serif;">${sanitizeHTML((b.data.text as string) || story?.title || '')}</h${lvl}>${story?.subtitle ? `<p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.92);">${sanitizeHTML(story.subtitle)}</p>` : ''}</div></div>`;
    } else {
      content = `${bindingBadge}<h${lvl} style="margin:0;color:${escapeAttr(vStyle.textColor)};font-family:${escapeAttr(vStyle.headingFont)},sans-serif;">${sanitizeHTML((b.data.text as string) || '')}</h${lvl}>`;
    }
  } else if (b.type === 'callout') {
    content = `${bindingBadge}<div style="padding:10px;background:#f0f9ff;border-left:4px solid ${escapeAttr(effectiveAccent)};border-radius:${escapeAttr(vStyle.radiusCss)};color:${escapeAttr(vStyle.textColor)};">${sanitizeHTML((b.data.text as string) || '')}</div>`;
  } else if (b.type === 'table') {
    const rows = Array.isArray(b.data.rows) ? (b.data.rows as string[][]) : [['-']];
    const rowsMarkup = rows
      .map((r, ri) => {
        const cells = Array.isArray(r) ? r : [];
        return `<tr>${cells
          .map((c) =>
            ri === 0
              ? `<th style="border:1px solid #cbd5e1;padding:6px;background:#f8fafc;color:#0f172a;">${sanitizeHTML(String(c ?? ''))}</th>`
              : `<td style="border:1px solid #cbd5e1;padding:6px;color:${escapeAttr(vStyle.textColor)};">${sanitizeHTML(String(c ?? ''))}</td>`
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
        ? (b.data.images as Array<string | { url: string; caption?: string }>).map((u) => (typeof u === 'string' ? { url: u, caption: '' } : { url: u?.url || '', caption: u?.caption || '' }))
        : [];
    const caption = escapeAttr((b.data.caption as string) || '');

    if ((b.data.isContactSheet || outputProfile === 'print') && (contactItems.length > 0 || galleryItems.length > 1)) {
      const sheetList = contactItems.length > 0 ? contactItems : galleryItems;
      const cells = sheetList
        .map((it, idx) => {
          const u = sanitizeSafeUrl(it?.url);
          const cap = escapeAttr(it?.caption || `Photo ${idx + 1}`);
          return `<figure style="margin:0;border:1px solid #e2e8f0;border-radius:${escapeAttr(vStyle.radiusCss)};overflow:hidden;background:#f8fafc;">${u ? `<img src="${u}" alt="${cap}" style="width:100%;height:80px;object-fit:cover;display:block;"/>` : ''}<figcaption style="font-size:10px;padding:3px 6px;color:#334155;">${cap}</figcaption></figure>`;
        })
        .join('');
      content = `<div class="contact-sheet" style="display:grid;grid-template-columns:repeat(${Math.min(3, Math.max(1, sheetList.length))},1fr);gap:6px;">${cells}</div>`;
    } else if (b.type === 'gallery' && galleryItems.length > 1) {
      const slides = galleryItems
        .map((it, idx) => {
          const u = sanitizeSafeUrl(it?.url);
          const cap = escapeAttr(it?.caption || caption || `Vue ${idx + 1}`);
          return `<img class="gallery-slide" data-gallery="${safeId}" data-idx="${idx}" src="${u}" alt="${cap}" style="display:${idx === 0 ? 'block' : 'none'};position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;border-radius:${escapeAttr(vStyle.radiusCss)};"/>`;
        })
        .join('');
      content = `<div class="gallery-box" id="gal-${safeId}" data-count="${galleryItems.length}" data-cur="0" style="position:relative;width:100%;height:100%;min-height:0;overflow:hidden;border-radius:${escapeAttr(vStyle.radiusCss)};">${slides}<div style="position:absolute;bottom:6px;right:6px;background:rgba(15,23,42,0.75);color:#fff;border-radius:999px;padding:2px 8px;display:flex;gap:6px;align-items:center;z-index:5;"><button type="button" data-carousel-control="true" data-action="gallery-prev" data-gallery-id="${safeId}" aria-label="Image précédente" style="background:none;border:0;color:#fff;cursor:pointer;">◀</button><span id="gal-lbl-${safeId}" style="font-size:11px;">1/${galleryItems.length}</span><button type="button" data-carousel-control="true" data-action="gallery-next" data-gallery-id="${safeId}" aria-label="Image suivante" style="background:none;border:0;color:#fff;cursor:pointer;">▶</button></div></div>`;
    } else {
      const safeUrl = sanitizeSafeUrl(b.data.url || b.data.src || galleryItems[0]?.url);
      content = `<figure style="margin:0;height:100%;min-height:0;width:100%;display:flex;flex-direction:column;overflow:hidden;">${safeUrl ? `<div style="flex:1;position:relative;min-height:0;width:100%;"><img src="${safeUrl}" alt="${caption}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;border-radius:${escapeAttr(vStyle.radiusCss)};"/></div>` : `<div style="flex:1;display:grid;place-items:center;background:#f1f5f9;color:#64748b;font-size:11px;">Image non définie</div>`}${caption ? `<figcaption style="font-size:11px;color:#475569;padding-top:4px;">${caption}</figcaption>` : ''}</figure>`;
    }
  } else if (b.type === 'map') {
    const mapId = escapeAttr((b.binding?.mapId || (b.data.mapId as string) || ''));
    const targetFeat = escapeAttr(b.binding?.targetFeatureId || '');
    const action = escapeAttr(b.binding?.action || 'highlight');
    const title = escapeAttr((b.data.title as string) || 'Carte interactive');
    const cap = escapeAttr((b.data.caption as string) || '');
    content = `<div class="doc-map-wrapper" style="position:relative;width:100%;height:100%;min-height:140px;border-radius:${escapeAttr(vStyle.radiusCss)};overflow:hidden;background:#e2e8f0;">
      <div class="doc-map-canvas" id="doc-map-${safeId}" data-map-id="${mapId}" data-target-feature="${targetFeat}" data-action="${action}" aria-label="${title}" style="position:absolute;inset:0;width:100%;height:100%;"></div>
      <div class="doc-map-fallback" id="doc-map-fb-${safeId}" style="display:none;position:absolute;inset:0;background:#1e293b;color:#e2e8f0;padding:12px;align-items:center;justify-content:center;text-align:center;font-size:12px;">Carte "${title}" (mode hors-ligne)</div>
      <div class="doc-map-attrib" style="position:absolute;bottom:3px;right:5px;background:rgba(255,255,255,0.88);color:#334155;padding:1px 5px;border-radius:3px;font-size:9px;z-index:5;">${cap ? `${cap} · ` : ''}© OpenStreetMap · © CARTO</div>
    </div>`;
  } else if (b.type === 'legend' || b.type === 'source') {
    content = `<div style="font-size:11px;color:${escapeAttr(vStyle.mutedTextColor)};font-style:${b.type === 'source' ? 'italic' : 'normal'};">${sanitizeHTML((b.data.text as string) || '')}</div>`;
  } else if (b.type === 'text') {
    content = `${bindingBadge}<div style="font-size:13px;line-height:1.55;color:${escapeAttr(vStyle.textColor)};font-family:${escapeAttr(vStyle.bodyFont)},sans-serif;">${sanitizeHTML((b.data.text as string) || '')}</div>`;
  } else {
    content = `<div class="unsupported-block-notice" style="padding:8px;background:#fef3c7;color:#92400e;border:1px solid #f59e0b;border-radius:4px;font-size:11px;">Bloc de type "${escapeAttr(b.type)}" non pris en charge sur ce support.</div>`;
  }

  const isHero = b.type === 'title' && Boolean((page?.hero?.enabled ? page.hero : story?.hero?.enabled ? story.hero : undefined)?.enabled);
  const blockBg = isHero ? 'transparent' : escapeAttr(vStyle.surfaceCssBackground), blockBorder = isHero ? 'none' : escapeAttr(vStyle.borderCss), blockPad = isHero ? '0' : escapeAttr(vStyle.paddingCss), blockOverflow = isHero ? 'hidden' : 'auto';

  return `<div class="block" id="block-${safeId}" data-style-mode="${escapeAttr(b.styleOverride?.styleMode || 'inherit')}"${bindingAttrs} style="grid-column:${colStart} / span ${colSpan};grid-row:${rowStart} / span ${rowSpan};background:${blockBg};border:${blockBorder};border-radius:${escapeAttr(vStyle.radiusCss)};padding:${blockPad};box-shadow:${escapeAttr(vStyle.shadowCss)};color:${escapeAttr(vStyle.textColor)};overflow:${blockOverflow};position:relative;min-width:0;min-height:0;box-sizing:border-box;">${content}</div>`;
}

export function renderPublishedPageHTML(
  page: Page,
  pIdx: number,
  fallbackFormat: PageFormat,
  safeAccent: string,
  story?: Partial<StoryMap> | null,
  outputProfile: OutputProfile = 'web-interactive'
): string {
  const fmt = page.layout?.format || fallbackFormat || 'a4-portrait';
  const dims = getGridDimensions(fmt);
  const pageStyle = resolveVisualStyle(story, page, null, outputProfile);
  const heroConfig = page.hero?.enabled ? page.hero : pIdx === 0 && story?.hero?.enabled ? story.hero : undefined;
  const hasTitle = (page.blocks || []).some((b) => b.type === 'title');
  const heroHtml = heroConfig && !hasTitle
    ? renderPublishedHeroHTML(heroConfig, page.title || story?.title || '', story?.subtitle || '', story?.brand?.logo || '', outputProfile, `p${pIdx}`)
    : '';
  const blocksHtml = (page.blocks || []).map((b) => renderPublishedBlockHTML(b, safeAccent, story, page, outputProfile)).join('\n');
  const safePageTitle = escapeAttr(page.title || `Page ${pIdx + 1}`);

  return `<section class="doc-page ${pIdx === 0 ? 'active' : ''}" id="page-${pIdx}" data-page-index="${pIdx}" aria-label="${safePageTitle}" style="display:${pIdx === 0 ? 'inline-block' : 'none'};padding:${dims.marginMm}mm;background:${escapeAttr(pageStyle.pageBackground)};color:${escapeAttr(pageStyle.textColor)};font-family:${escapeAttr(pageStyle.bodyFont)},sans-serif;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.18);margin:16px auto;aspect-ratio:${dims.aspectRatio};width:${fmt === 'screen-16-9' ? '1240px' : fmt === 'a4-landscape' ? '1180px' : fmt === 'a4-portrait' ? '740px' : '100%'};max-width:100%;box-sizing:border-box;">
    ${heroHtml ? `<div style="width:100%;margin-bottom:${dims.gapPx}px;">${heroHtml}</div>` : ''}
    <div class="page-grid" style="display:grid;grid-template-columns:repeat(${dims.cols}, minmax(0, 1fr));grid-template-rows:repeat(${dims.rows}, minmax(0, 1fr));gap:${dims.gapPx}px;position:relative;width:100%;height:100%;box-sizing:border-box;">
      ${blocksHtml}
    </div>
  </section>`;
}
