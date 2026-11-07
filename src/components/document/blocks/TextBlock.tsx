/**
 * StoryMap — Blocs textuels (Titre, Texte riche, Encadré, Source, Légende) avec renvoi narratif
 */

import React from 'react';
import { Block } from '../../../types/project';
import { Link2 } from 'lucide-react';

interface TextBlockProps {
  block: Block;
  onChange: (patch: Record<string, unknown>) => void;
  isEditable?: boolean;
}

export const TextBlock: React.FC<TextBlockProps> = ({ block, onChange, isEditable = true }) => {
  const content = (block.data.text as string) || '';
  const level = (block.data.level as number) || 2;
  const binding = block.binding;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    onChange({ text: e.target.value });
  };

  const renderBindingBadge = () => {
    if (!binding) return null;
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(11, 127, 176, 0.12)', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '1px 6px', borderRadius: '999px', fontSize: '10px', fontWeight: 600, marginBottom: '4px' }}>
        <Link2 size={10} />
        <span>{binding.numberIndex ? `#${binding.numberIndex} ` : ''}{binding.action || 'focus'}</span>
      </div>
    );
  };

  if (block.type === 'title') {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '8px' }}>
        {renderBindingBadge()}
        {isEditable ? (
          <input
            type="text" className="input" value={content} placeholder={`Titre (Niveau ${level})…`}
            onChange={handleChange} style={{ width: '100%', fontSize: level === 1 ? '22px' : '18px', fontWeight: 700 }}
          />
        ) : (
          <h2 style={{ margin: 0, fontSize: level === 1 ? '24px' : '20px', fontWeight: 700 }}>
            {content || 'Titre vide'}
          </h2>
        )}
      </div>
    );
  }

  if (block.type === 'callout') {
    return (
      <div style={{ height: '100%', padding: '10px', background: 'var(--accent-soft)', borderLeft: '4px solid var(--accent)', borderRadius: 'var(--r)', display: 'flex', flexDirection: 'column' }}>
        {renderBindingBadge()}
        {isEditable ? (
          <textarea
            className="input" value={content} placeholder="Texte de l’encadré mis en avant…"
            onChange={handleChange} style={{ width: '100%', height: '100%', minHeight: '50px', resize: 'none', background: 'transparent', border: 0 }}
          />
        ) : (
          <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--text-1)' }}>{content}</p>
        )}
      </div>
    );
  }

  if (block.type === 'source' || block.type === 'legend') {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', padding: '6px', fontSize: '11px', color: 'var(--text-3)' }}>
        {isEditable ? (
          <input
            type="text" className="input" value={content}
            placeholder={block.type === 'source' ? 'Source : OpenStreetMap…' : 'Légende : Figure 1…'}
            onChange={handleChange} style={{ width: '100%', fontSize: '11px' }}
          />
        ) : (
          <span>{content}</span>
        )}
      </div>
    );
  }

  return (
    <div style={{ height: '100%', padding: '8px', display: 'flex', flexDirection: 'column' }}>
      {renderBindingBadge()}
      {isEditable ? (
        <textarea
          className="input" value={content} placeholder="Rédigez votre paragraphe de récit…"
          onChange={handleChange} style={{ width: '100%', height: '100%', resize: 'none', lineHeight: 1.5, fontSize: '13px' }}
        />
      ) : (
        <p style={{ margin: 0, lineHeight: 1.6, fontSize: '14px', color: 'var(--text-2)' }}>{content}</p>
      )}
    </div>
  );
};
