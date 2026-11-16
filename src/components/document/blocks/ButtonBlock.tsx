/**
 * StoryMap — Rendu de bloc Bouton d'action calibrable (Mode 2 Page Web uniquement)
 */

import React, { useState } from 'react';
import { Block } from '../../../types/project';
import { ResolvedVisualStyle } from '../../../types/theme';
import {
  ButtonTriggerType, ButtonVariant, ButtonSize, ButtonAlign, ButtonShape, ButtonIconType, getButtonVisualCss,
} from '../../../core/webFormCatalog';
import { ExternalLink, Compass, ArrowRight, Mail, Calendar, Download, Search, Check } from 'lucide-react';

interface ButtonBlockProps {
  block: Block;
  onChange: (patch: Record<string, unknown>) => void;
  isEditable?: boolean;
  visualStyle?: ResolvedVisualStyle;
  onTriggerAction?: (mapId: string, featureId?: string, action?: string) => void;
}

export const ButtonBlock: React.FC<ButtonBlockProps> = ({
  block, onChange, isEditable = true, visualStyle, onTriggerAction,
}) => {
  const [feedback, setFeedback] = useState<string | null>(null);

  const label = (block.data?.label as string) || (block.data?.text as string) || 'Action';
  const url = (block.data?.url as string) || '';
  const triggerType: ButtonTriggerType = (block.data?.triggerType as ButtonTriggerType) || (url ? 'url' : 'map');
  const variant: ButtonVariant = (block.data?.variant as ButtonVariant) || 'primary';
  const size: ButtonSize = (block.data?.size as ButtonSize) || 'md';
  const align: ButtonAlign = (block.data?.align as ButtonAlign) || 'center';
  const shape: ButtonShape = (block.data?.shape as ButtonShape) || 'rounded';
  const icon: ButtonIconType = (block.data?.icon as ButtonIconType) || (triggerType === 'url' ? 'external' : 'compass');

  const action = (block.binding?.action || block.data?.action || 'zoom') as string;
  const mapId = (block.binding?.mapId || block.data?.mapId || '') as string;
  const featureId = (block.binding?.targetFeatureId || block.data?.targetFeatureId || '') as string;
  const targetPageIndex = Number(block.data?.targetPageIndex || 0);
  const prefillValue = (block.data?.prefillValue as string) || label;

  const renderIcon = (s: number) => {
    if (icon === 'none') return null;
    if (icon === 'external') return <ExternalLink size={s} style={{ flexShrink: 0 }} />;
    if (icon === 'arrow') return <ArrowRight size={s} style={{ flexShrink: 0 }} />;
    if (icon === 'mail') return <Mail size={s} style={{ flexShrink: 0 }} />;
    if (icon === 'calendar') return <Calendar size={s} style={{ flexShrink: 0 }} />;
    if (icon === 'download') return <Download size={s} style={{ flexShrink: 0 }} />;
    if (icon === 'search') return <Search size={s} style={{ flexShrink: 0 }} />;
    if (icon === 'check') return <Check size={s} style={{ flexShrink: 0 }} />;
    return <Compass size={s} style={{ flexShrink: 0 }} />;
  };

  const executeTrigger = (isTest: boolean) => {
    if (triggerType === 'url' && url) {
      if (!isTest) window.open(url, block.data?.targetBlank === false ? '_self' : '_blank', 'noopener,noreferrer');
      if (isTest) setFeedback(`Lien : ${url}`);
    } else if (triggerType === 'page') {
      window.dispatchEvent(new CustomEvent('storymap:goto-page', { detail: { pageIndex: targetPageIndex } }));
      const targetEl = document.getElementById(`reader-page-${targetPageIndex}`) || document.getElementById(`page-${targetPageIndex}`);
      targetEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (isTest) setFeedback(`Aller Page ${targetPageIndex + 1}`);
    } else if (triggerType === 'prefill-form') {
      const formEl = document.querySelector('.doc-client-form') as HTMLFormElement | null;
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const subjInput = formEl.querySelector('input[name="objet"], input[name="secteur"], input[type="text"]:not([name="_gotcha"])') as HTMLInputElement | null;
        if (subjInput) { subjInput.value = prefillValue; subjInput.focus(); }
      }
      if (isTest) setFeedback(`Form : « ${prefillValue} »`);
    } else {
      if (onTriggerAction && mapId) onTriggerAction(mapId, featureId, action);
      if (isTest) setFeedback(`Carte : ${action}`);
    }
    if (isTest) setTimeout(() => setFeedback(null), 2000);
  };

  const primaryCol = visualStyle?.primaryColor || '#0284c7';
  const accentCol = visualStyle?.accentColor || primaryCol;
  const radiusCss = visualStyle?.radiusCss || '8px';
  const css = getButtonVisualCss(variant, size, accentCol, primaryCol, shape, radiusCss);
  const alignItems = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';

  const summaryBadge =
    triggerType === 'url' ? (url ? `Lien ${url}` : 'Lien URL')
    : triggerType === 'page' ? `Page ${targetPageIndex + 1}`
    : triggerType === 'prefill-form' ? `Formulaire`
    : `Carte ${action}`;

  const buttonStyle: React.CSSProperties = {
    background: css.bg,
    color: css.fg,
    border: css.border,
    borderRadius: css.radius,
    padding: css.pad,
    height: css.height,
    minHeight: css.height,
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: css.fontSize,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    lineHeight: 1,
    width: css.width,
    maxWidth: '100%',
    boxShadow: css.shadow,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxSizing: 'border-box',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    transition: 'all 0.16s ease',
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems, justifyContent: 'center', padding: '4px', boxSizing: 'border-box' }}>
      {isEditable ? (
        <div style={{ ...buttonStyle, cursor: 'default' }}>
          {renderIcon(css.iconSize)}
          <input
            type="text"
            value={label}
            onChange={(e) => onChange({ label: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            placeholder="Libellé…"
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'inherit',
              font: 'inherit',
              fontSize: 'inherit',
              fontWeight: 'inherit',
              letterSpacing: 'inherit',
              textAlign: align === 'left' ? 'left' : align === 'right' ? 'right' : 'center',
              width: size === 'full' ? '100%' : `${Math.max(6, (label || '').length + 2)}ch`,
              maxWidth: '100%',
              cursor: 'text',
              padding: 0,
              margin: 0,
            }}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => executeTrigger(false)}
          style={{ ...buttonStyle, cursor: 'pointer' }}
          className="doc-action-btn"
        >
          {renderIcon(css.iconSize)}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        </button>
      )}

      {isEditable && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '4px', fontSize: '10px', color: 'var(--text-muted, #94a3b8)', maxWidth: '100%' }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); executeTrigger(true); }}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border, rgba(148,163,184,0.3))', borderRadius: '4px', padding: '1px 6px', cursor: 'pointer', fontSize: '10px', color: 'var(--text, #e2e8f0)', fontWeight: 600 }}
          >
            Tester
          </button>
          <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.85 }}>
            {feedback ? <span style={{ color: 'var(--accent, #38bdf8)', fontWeight: 700 }}>{feedback}</span> : summaryBadge}
          </span>
        </div>
      )}
    </div>
  );
};
