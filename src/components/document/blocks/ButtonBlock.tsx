/**
 * StoryMap — Rendu de bloc Bouton interactif (Mode 2 — D3 / D4 / R4)
 */

import React, { useState } from 'react';
import { Block } from '../../../types/project';
import { ResolvedVisualStyle } from '../../../types/theme';
import { ExternalLink, Compass } from 'lucide-react';

interface ButtonBlockProps {
  block: Block;
  onChange: (patch: Record<string, unknown>) => void;
  isEditable?: boolean;
  visualStyle?: ResolvedVisualStyle;
  onTriggerAction?: (mapId: string, featureId?: string, action?: string) => void;
}

export const ButtonBlock: React.FC<ButtonBlockProps> = ({
  block,
  onChange,
  isEditable = true,
  visualStyle,
  onTriggerAction,
}) => {
  const [feedback, setFeedback] = useState<string | null>(null);

  const label = (block.data?.label as string) || (block.data?.text as string) || 'Action';
  const action = (block.binding?.action || block.data?.action || 'zoom') as string;
  const mapId = (block.binding?.mapId || block.data?.mapId || '') as string;
  const featureId = (block.binding?.targetFeatureId || block.data?.targetFeatureId || '') as string;
  const url = (block.data?.url as string) || '';
  const isUrl = Boolean(url);

  const handleClick = (e: React.MouseEvent) => {
    if (isEditable) {
      // En mode édition, un clic permet de tester temporairement sans persister d'état
      e.stopPropagation();
      runAction(true);
      return;
    }
    if (isUrl) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    runAction(false);
  };

  const runAction = (isTest: boolean) => {
    if (onTriggerAction && mapId) {
      onTriggerAction(mapId, featureId, action);
    }
    setFeedback(isTest ? `Action "${action}" testée` : `Action "${action}" exécutée`);
    setTimeout(() => setFeedback(null), 1800);
  };

  const btnBg = visualStyle?.primaryColor || '#0284c7';
  const btnRadius = visualStyle?.radiusCss || '6px';
  const btnFont = visualStyle?.headingFont || 'inherit';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
        boxSizing: 'border-box',
        gap: '6px',
      }}
    >
      {isEditable ? (
        <input
          type="text"
          value={label}
          onChange={(e) => onChange({ label: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          placeholder="Libellé du bouton..."
          style={{
            background: btnBg,
            color: '#ffffff',
            border: 'none',
            borderRadius: btnRadius,
            padding: '8px 16px',
            fontFamily: btnFont,
            fontSize: '13px',
            fontWeight: 600,
            textAlign: 'center',
            cursor: 'text',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            width: 'calc(100% - 16px)',
            maxWidth: '280px',
          }}
        />
      ) : (
        <button
          type="button"
          onClick={handleClick}
          style={{
            background: btnBg,
            color: '#ffffff',
            border: 'none',
            borderRadius: btnRadius,
            padding: '8px 16px',
            fontFamily: btnFont,
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'transform 0.15s ease, opacity 0.15s ease',
          }}
        >
          {isUrl ? <ExternalLink size={14} /> : <Compass size={14} />}
          <span>{label}</span>
        </button>
      )}

      {isEditable && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
          <button
            type="button"
            onClick={handleClick}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: '2px 8px',
              cursor: 'pointer',
              fontSize: '11px',
              color: 'var(--text)',
            }}
          >
            Tester
          </button>
          <span>{action} {featureId ? `(${featureId})` : ''}</span>
        </div>
      )}

      {feedback && (
        <span style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 600 }}>{feedback}</span>
      )}
    </div>
  );
};
