/**
 * StoryMap — Rendu de bloc Bouton d'action calibrable (Mode 2 Page Web uniquement)
 */

import React, { useState } from 'react';
import { Block } from '../../../types/project';
import { ResolvedVisualStyle } from '../../../types/theme';
import {
  ButtonTriggerType, ButtonVariant, ButtonSize, ButtonAlign, ButtonIconType, getButtonVisualCss,
} from '../../../core/webFormCatalog';
import { ExternalLink, Compass, ArrowRight, Mail, Calendar, Download } from 'lucide-react';

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
  const icon: ButtonIconType = (block.data?.icon as ButtonIconType) || (triggerType === 'url' ? 'external' : 'compass');

  const action = (block.binding?.action || block.data?.action || 'zoom') as string;
  const mapId = (block.binding?.mapId || block.data?.mapId || '') as string;
  const featureId = (block.binding?.targetFeatureId || block.data?.targetFeatureId || '') as string;
  const targetPageIndex = Number(block.data?.targetPageIndex || 0);
  const prefillValue = (block.data?.prefillValue as string) || label;

  const renderIcon = () => {
    const s = size === 'sm' ? 12 : size === 'lg' ? 16 : 14;
    if (icon === 'none') return null;
    if (icon === 'external') return <ExternalLink size={s} />;
    if (icon === 'arrow') return <ArrowRight size={s} />;
    if (icon === 'mail') return <Mail size={s} />;
    if (icon === 'calendar') return <Calendar size={s} />;
    if (icon === 'download') return <Download size={s} />;
    return <Compass size={s} />;
  };

  const executeTrigger = (isTest: boolean) => {
    if (triggerType === 'url' && url) {
      if (!isTest) window.open(url, block.data?.targetBlank === false ? '_self' : '_blank', 'noopener,noreferrer');
      setFeedback(isTest ? `Lien testé : ${url}` : 'Lien ouvert');
    } else if (triggerType === 'page') {
      const targetEl = document.getElementById(`reader-page-${targetPageIndex}`) || document.getElementById(`page-${targetPageIndex}`);
      targetEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setFeedback(`Navigation → Page ${targetPageIndex + 1}`);
    } else if (triggerType === 'prefill-form') {
      const formEl = document.querySelector('.doc-client-form') as HTMLFormElement | null;
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const subjInput = formEl.querySelector('input[name="objet"], input[name="secteur"], input[type="text"]:not([name="_gotcha"])') as HTMLInputElement | null;
        if (subjInput) { subjInput.value = prefillValue; subjInput.focus(); }
      }
      setFeedback(`Formulaire pré-rempli : « ${prefillValue} »`);
    } else {
      if (onTriggerAction && mapId) onTriggerAction(mapId, featureId, action);
      setFeedback(isTest ? `Action carte "${action}" testée` : `Action "${action}" exécutée`);
    }
    setTimeout(() => setFeedback(null), 1800);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isEditable) { e.stopPropagation(); executeTrigger(true); return; }
    executeTrigger(false);
  };

  const primaryCol = visualStyle?.primaryColor || '#0284c7';
  const accentCol = visualStyle?.accentColor || primaryCol;
  const radiusCss = visualStyle?.radiusCss || '6px';
  const btnFont = visualStyle?.headingFont || 'inherit';
  const css = getButtonVisualCss(variant, size, accentCol, primaryCol);
  const alignItems = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';

  const summaryBadge =
    triggerType === 'url' ? `Lien : ${url || 'non défini'}`
    : triggerType === 'page' ? `Aller à Page ${targetPageIndex + 1}`
    : triggerType === 'prefill-form' ? `Formulaire : ${prefillValue}`
    : `${action}${featureId ? ` (${featureId})` : ''}`;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems, justifyContent: 'center', padding: '8px', boxSizing: 'border-box', gap: '6px' }}>
      {isEditable ? (
        <input
          type="text" value={label} onChange={(e) => onChange({ label: e.target.value })} onClick={(e) => e.stopPropagation()} placeholder="Libellé du bouton..."
          style={{ background: css.bg, color: css.fg, border: css.border, borderRadius: radiusCss, padding: css.pad, fontFamily: btnFont, fontSize: css.fontSize, fontWeight: 600, textAlign: 'center', cursor: 'text', boxShadow: variant === 'ghost' ? 'none' : '0 2px 6px rgba(0,0,0,0.15)', width: css.width === '100%' ? '100%' : '200px', maxWidth: '100%' }}
        />
      ) : (
        <button
          type="button" onClick={handleClick}
          style={{ background: css.bg, color: css.fg, border: css.border, borderRadius: radiusCss, padding: css.pad, fontFamily: btnFont, fontSize: css.fontSize, fontWeight: 600, cursor: 'pointer', width: css.width, boxShadow: variant === 'ghost' ? 'none' : '0 2px 6px rgba(0,0,0,0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          {renderIcon()}
          <span>{label}</span>
        </button>
      )}

      {isEditable && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
          <button type="button" onClick={handleClick} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '11px', color: 'var(--text)' }}>
            Tester
          </button>
          <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summaryBadge}</span>
        </div>
      )}

      {feedback && <span style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 600 }}>{feedback}</span>}
    </div>
  );
};
