/**
 * StoryMap — Barre d'outils de formatage de texte rapide (Markdown / HTML)
 */

import React from 'react';
import { Bold, Italic, Link2, Quote, List } from 'lucide-react';

interface RichTextToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (newValue: string) => void;
}

export const RichTextToolbar: React.FC<RichTextToolbarProps> = ({
  textareaRef,
  value,
  onChange,
}) => {
  const insertFormat = (prefix: string, suffix: string = '') => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const selected = value.substring(start, end) || 'texte';
    const replacement = `${prefix}${selected}${suffix}`;
    const nextVal = value.substring(0, start) + replacement + value.substring(end);

    onChange(nextVal);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  return (
    <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
      <button
        type="button"
        className="btn btn-icon btn-ghost btn-sm"
        onClick={() => insertFormat('**', '**')}
        title="Gras (**texte**)"
      >
        <Bold size={13} />
      </button>
      <button
        type="button"
        className="btn btn-icon btn-ghost btn-sm"
        onClick={() => insertFormat('*', '*')}
        title="Italique (*texte*)"
      >
        <Italic size={13} />
      </button>
      <button
        type="button"
        className="btn btn-icon btn-ghost btn-sm"
        onClick={() => insertFormat('[', '](https://)')}
        title="Lien ([titre](url))"
      >
        <Link2 size={13} />
      </button>
      <button
        type="button"
        className="btn btn-icon btn-ghost btn-sm"
        onClick={() => insertFormat('> ')}
        title="Citation (> texte)"
      >
        <Quote size={13} />
      </button>
      <button
        type="button"
        className="btn btn-icon btn-ghost btn-sm"
        onClick={() => insertFormat('- ')}
        title="Liste à puces (- élément)"
      >
        <List size={13} />
      </button>
    </div>
  );
};

