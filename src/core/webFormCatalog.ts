/**
 * StoryMap — Modèles, préréglages et rendu HTML des boutons calibrables et formulaires clients (Mode 2 Web uniquement)
 */

import type { Block } from '../types/project';
import type { ResolvedVisualStyle } from '../types/theme';
import { escapeAttr, sanitizeHTML, sanitizeSafeUrl, clampInt } from './sanitize';

export type ButtonTriggerType = 'map' | 'url' | 'page' | 'prefill-form';
export type ButtonVariant = 'primary' | 'accent' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'full';
export type ButtonAlign = 'left' | 'center' | 'right';
export type ButtonIconType = 'compass' | 'external' | 'arrow' | 'mail' | 'calendar' | 'download' | 'none';

export type FormSubmissionMode = 'webhook' | 'html-post' | 'mailto';
export type FormPresetId = 'contact' | 'reservation' | 'signalement';
export type FormFieldType = 'text' | 'email' | 'tel' | 'date' | 'number' | 'select' | 'textarea' | 'checkbox';

export interface FormFieldConfig {
  id: string;
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

export const FORM_PRESETS: Record<FormPresetId, { label: string; title: string; submitLabel: string; fields: FormFieldConfig[] }> = {
  contact: {
    label: 'Contact rapide',
    title: 'Contactez-nous',
    submitLabel: 'Envoyer le message',
    fields: [
      { id: 'f-name', name: 'nom', label: 'Nom complet', type: 'text', required: true, placeholder: 'Votre nom' },
      { id: 'f-email', name: 'email', label: 'Adresse e-mail', type: 'email', required: true, placeholder: 'nom@domaine.fr' },
      { id: 'f-subject', name: 'objet', label: 'Objet / Étape concernée', type: 'text', required: false, placeholder: 'Sujet de votre demande' },
      { id: 'f-msg', name: 'message', label: 'Votre message', type: 'textarea', required: true, placeholder: 'Précisez votre demande…' },
    ],
  },
  reservation: {
    label: 'Réservation / Inscription itinéraire',
    title: 'Réserver une étape ou un circuit',
    submitLabel: 'Envoyer la demande de réservation',
    fields: [
      { id: 'f-name', name: 'nom', label: 'Nom & Prénom', type: 'text', required: true, placeholder: 'Votre nom' },
      { id: 'f-email', name: 'email', label: 'E-mail', type: 'email', required: true, placeholder: 'nom@domaine.fr' },
      { id: 'f-tel', name: 'telephone', label: 'Téléphone', type: 'tel', required: false, placeholder: '06 00 00 00 00' },
      { id: 'f-date', name: 'date_souhaitee', label: 'Date souhaitée', type: 'date', required: true },
      { id: 'f-pax', name: 'participants', label: 'Participants', type: 'number', required: true, placeholder: '2' },
      { id: 'f-subject', name: 'objet', label: 'Étape / Circuit choisi', type: 'text', required: false, placeholder: 'Ex: Étape 2 — Belvédère' },
    ],
  },
  signalement: {
    label: 'Contribution / Signalement territorial',
    title: 'Contribuer à l’observatoire territorial',
    submitLabel: 'Transmettre l’observation',
    fields: [
      { id: 'f-name', name: 'auteur', label: 'Contributeur', type: 'text', required: false, placeholder: 'Nom ou structure' },
      { id: 'f-email', name: 'email', label: 'E-mail de suivi', type: 'email', required: true, placeholder: 'contact@territoire.fr' },
      { id: 'f-subject', name: 'secteur', label: 'Lieu / Secteur géographique', type: 'text', required: true, placeholder: 'Secteur concerné' },
      { id: 'f-cat', name: 'categorie', label: 'Catégorie', type: 'select', required: true, options: ['Patrimoine', 'Mobilité', 'Environnement', 'Aménagement'] },
      { id: 'f-msg', name: 'observation', label: 'Observation détaillée', type: 'textarea', required: true, placeholder: 'Décrivez votre observation…' },
    ],
  },
};

export function getDefaultFormBlockData(preset: FormPresetId = 'contact'): Record<string, unknown> {
  const tpl = FORM_PRESETS[preset] || FORM_PRESETS.contact;
  return {
    preset,
    title: tpl.title,
    endpointUrl: 'https://formspree.io/f/exemple-client',
    submissionMode: 'webhook' as FormSubmissionMode,
    submitLabel: tpl.submitLabel,
    successMessage: 'Merci ! Votre formulaire a bien été transmis.',
    includeMapContext: true,
    fields: tpl.fields.map((f) => ({ ...f })),
  };
}

export function getButtonVisualCss(
  variant: ButtonVariant,
  size: ButtonSize,
  effectiveAccent: string,
  primaryColor: string
): { bg: string; fg: string; border: string; pad: string; fontSize: string; width: string } {
  const baseCol = variant === 'accent' ? effectiveAccent : primaryColor || effectiveAccent;
  const bg = variant === 'outline' || variant === 'ghost' ? 'transparent' : baseCol;
  const fg = variant === 'outline' || variant === 'ghost' ? baseCol : '#ffffff';
  const border = variant === 'outline' ? `2px solid ${baseCol}` : variant === 'ghost' ? '1px solid transparent' : 'none';
  const pad = size === 'sm' ? '5px 11px' : size === 'lg' ? '12px 24px' : size === 'full' ? '11px 18px' : '8px 16px';
  const fontSize = size === 'sm' ? '11.5px' : size === 'lg' ? '15px' : '13px';
  const width = size === 'full' ? '100%' : 'auto';
  return { bg, fg, border, pad, fontSize, width };
}

export function renderPublishedButtonBlockHTML(b: Block, effectiveAccent: string, vStyle: ResolvedVisualStyle): string {
  const btnLabel = escapeAttr((b.data.label as string) || (b.data.text as string) || 'Action');
  const triggerType = ((b.data.triggerType as ButtonTriggerType) || (b.data.url ? 'url' : 'map'));
  const variant = ((b.data.variant as ButtonVariant) || 'primary');
  const size = ((b.data.size as ButtonSize) || 'md');
  const align = ((b.data.align as ButtonAlign) || 'center');
  const icon = ((b.data.icon as ButtonIconType) || 'compass');
  const iconGlyph = icon === 'external' ? '↗' : icon === 'arrow' ? '→' : icon === 'mail' ? '✉' : icon === 'calendar' ? '📅' : icon === 'download' ? '⬇' : icon === 'none' ? '' : '⌖';

  const css = getButtonVisualCss(variant, size, effectiveAccent, vStyle.primaryColor);
  const justify = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
  const commonStyle = `display:inline-flex;align-items:center;justify-content:center;gap:6px;background:${escapeAttr(css.bg)};color:${escapeAttr(css.fg)};border:${escapeAttr(css.border)};padding:${css.pad};border-radius:${escapeAttr(vStyle.radiusCss)};cursor:pointer;font-weight:600;font-size:${css.fontSize};width:${css.width};text-decoration:none;box-shadow:${variant === 'ghost' ? 'none' : escapeAttr(vStyle.shadowCss)};box-sizing:border-box;`;

  if (triggerType === 'url') {
    const url = sanitizeSafeUrl((b.data.url as string) || '#');
    const target = b.data.targetBlank === false ? '_self' : '_blank';
    return `<div style="display:flex;align-items:center;justify-content:${justify};height:100%;width:100%;"><a href="${url}" target="${target}" rel="noopener noreferrer" class="doc-action-btn" style="${commonStyle}">${iconGlyph ? `<span>${iconGlyph}</span>` : ''}<span>${btnLabel}</span></a></div>`;
  }
  if (triggerType === 'page') {
    const pageIdx = clampInt(b.data.targetPageIndex, 0, 99, 0);
    return `<div style="display:flex;align-items:center;justify-content:${justify};height:100%;width:100%;"><button type="button" class="doc-action-btn" data-action="goto-page" data-page-idx="${pageIdx}" style="${commonStyle}">${iconGlyph ? `<span>${iconGlyph}</span>` : ''}<span>${btnLabel}</span></button></div>`;
  }
  if (triggerType === 'prefill-form') {
    const prefill = escapeAttr((b.data.prefillValue as string) || btnLabel);
    return `<div style="display:flex;align-items:center;justify-content:${justify};height:100%;width:100%;"><button type="button" class="doc-action-btn" data-action="prefill-form" data-prefill-value="${prefill}" style="${commonStyle}">${iconGlyph ? `<span>${iconGlyph}</span>` : ''}<span>${btnLabel}</span></button></div>`;
  }

  const mapId = escapeAttr((b.binding?.mapId || (b.data.mapId as string) || ''));
  const featId = escapeAttr((b.binding?.targetFeatureId || (b.data.targetFeatureId as string) || ''));
  const action = escapeAttr((b.binding?.action || (b.data.action as string) || 'zoom'));
  const hasCustomCoords = typeof b.data.targetLng === 'number' && typeof b.data.targetLat === 'number';
  const coordAttrs = hasCustomCoords
    ? ` data-target-lng="${Number(b.data.targetLng)}" data-target-lat="${Number(b.data.targetLat)}" data-target-zoom="${Number(b.data.targetZoom || 14)}"`
    : '';

  return `<div style="display:flex;align-items:center;justify-content:${justify};height:100%;width:100%;"><button type="button" class="doc-action-btn" data-action="narrative-binding" data-map-id="${mapId}" data-feature-id="${featId}" data-binding-action="${action}"${coordAttrs} style="${commonStyle}">${iconGlyph ? `<span>${iconGlyph}</span>` : ''}<span>${btnLabel}</span></button></div>`;
}

export function renderPublishedFormBlockHTML(b: Block, effectiveAccent: string, vStyle: ResolvedVisualStyle, storyTitle = ''): string {
  const safeId = escapeAttr(b.id || 'form');
  const title = sanitizeHTML((b.data.title as string) || 'Formulaire de contact');
  const endpointUrl = sanitizeSafeUrl((b.data.endpointUrl as string) || '');
  const mode = escapeAttr(((b.data.submissionMode as FormSubmissionMode) || 'webhook'));
  const submitLabel = escapeAttr((b.data.submitLabel as string) || 'Envoyer');
  const successMsg = escapeAttr((b.data.successMessage as string) || 'Merci ! Votre message a bien été envoyé.');
  const includeCtx = b.data.includeMapContext !== false ? 'true' : 'false';
  const rawFields = Array.isArray(b.data.fields) && b.data.fields.length > 0
    ? (b.data.fields as FormFieldConfig[])
    : FORM_PRESETS.contact.fields;

  const fieldsHtml = rawFields.map((f) => {
    const fName = escapeAttr(f.name || f.id || 'champ');
    const fLabel = sanitizeHTML(f.label || fName);
    const fPh = escapeAttr(f.placeholder || '');
    const reqAttr = f.required ? ' required' : '';
    const inputStyle = `width:100%;padding:6px 9px;border:1px solid #cbd5e1;border-radius:${escapeAttr(vStyle.radiusCss)};font-size:12px;box-sizing:border-box;background:#fff;color:#0f172a;`;
    if (f.type === 'textarea') {
      return `<div style="display:flex;flex-direction:column;gap:3px;"><label style="font-size:11px;font-weight:600;">${fLabel}${f.required ? ' *' : ''}</label><textarea name="${fName}" rows="2" placeholder="${fPh}"${reqAttr} style="${inputStyle}resize:vertical;"></textarea></div>`;
    }
    if (f.type === 'select') {
      const opts = (Array.isArray(f.options) && f.options.length > 0 ? f.options : ['Option 1', 'Option 2'])
        .map((o) => `<option value="${escapeAttr(o)}">${sanitizeHTML(o)}</option>`).join('');
      return `<div style="display:flex;flex-direction:column;gap:3px;"><label style="font-size:11px;font-weight:600;">${fLabel}${f.required ? ' *' : ''}</label><select name="${fName}"${reqAttr} style="${inputStyle}">${opts}</select></div>`;
    }
    if (f.type === 'checkbox') {
      return `<label style="display:flex;align-items:center;gap:6px;font-size:11px;cursor:pointer;"><input type="checkbox" name="${fName}" value="oui"${reqAttr}/><span>${fLabel}${f.required ? ' *' : ''}</span></label>`;
    }
    return `<div style="display:flex;flex-direction:column;gap:3px;"><label style="font-size:11px;font-weight:600;">${fLabel}${f.required ? ' *' : ''}</label><input type="${escapeAttr(f.type || 'text')}" name="${fName}" placeholder="${fPh}"${reqAttr} style="${inputStyle}"/></div>`;
  }).join('');

  return `<form class="doc-client-form" id="form-${safeId}" action="${endpointUrl}" method="POST" data-endpoint="${endpointUrl}" data-submission-mode="${mode}" data-include-context="${includeCtx}" data-story-title="${escapeAttr(storyTitle)}" data-success-msg="${successMsg}" style="display:flex;flex-direction:column;gap:8px;height:100%;box-sizing:border-box;">
    <h4 style="margin:0;font-size:14px;font-weight:700;color:${escapeAttr(vStyle.textColor)};font-family:${escapeAttr(vStyle.headingFont)},sans-serif;">${title}</h4>
    <input type="text" name="_gotcha" tabindex="-1" autocomplete="off" style="display:none !important;" aria-hidden="true"/>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;">${fieldsHtml}</div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:auto;padding-top:4px;">
      <span class="doc-form-status" id="form-status-${safeId}" aria-live="polite" style="font-size:11px;font-weight:600;color:${escapeAttr(effectiveAccent)};"></span>
      <button type="submit" class="doc-form-submit" style="background:${escapeAttr(vStyle.primaryColor || effectiveAccent)};color:#fff;border:none;border-radius:${escapeAttr(vStyle.radiusCss)};padding:7px 16px;font-size:12px;font-weight:600;cursor:pointer;">${submitLabel}</button>
    </div>
  </form>`;
}
