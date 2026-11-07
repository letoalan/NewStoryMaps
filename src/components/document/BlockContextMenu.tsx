/**
 * StoryMap — Barre contextuelle d'actions sur un bloc sélectionné (G03 / G06 / H05)
 */

import React from 'react';
import { Block, BlockType } from '../../types/project';
import { ArrowRight, ArrowDown, Minimize2, Copy, Trash2, Link2 } from 'lucide-react';

interface BlockContextMenuProps {
  block: Block;
  onChangeType: (type: BlockType) => void;
  onExpand: (dir: 'right' | 'down') => void;
  onShrink: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onOpenBinding?: () => void;
}

const BLOCK_TYPES: Array<{ type: BlockType; label: string }> = [
  { type: 'text', label: 'Texte' },
  { type: 'title', label: 'Titre' },
  { type: 'callout', label: 'Encadré' },
  { type: 'image', label: 'Image' },
  { type: 'gallery', label: 'Galerie' },
  { type: 'table', label: 'Tableau' },
  { type: 'map', label: 'Carte' },
  { type: 'legend', label: 'Légende' },
  { type: 'source', label: 'Source' },
];

export const BlockContextMenu: React.FC<BlockContextMenuProps> = ({
  block,
  onChangeType,
  onExpand,
  onShrink,
  onDuplicate,
  onDelete,
  onOpenBinding,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: '-42px',
        left: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r)',
        boxShadow: 'var(--shadow-md)',
        padding: '3px 6px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <select
        className="input"
        value={block.type}
        onChange={(e) => onChangeType(e.target.value as BlockType)}
        style={{ height: '24px', fontSize: '11px', fontWeight: 600, padding: '0 6px' }}
      >
        {BLOCK_TYPES.map((bt) => (
          <option key={bt.type} value={bt.type}>
            {bt.label}
          </option>
        ))}
      </select>

      <span style={{ color: 'var(--border)', margin: '0 2px' }}>|</span>

      {onOpenBinding && (
        <button
          type="button"
          className={`btn btn-xs ${block.binding ? 'btn-primary' : 'btn-ghost btn-icon'}`}
          onClick={onOpenBinding}
          title={block.binding ? `Liaison active : ${block.binding.action || 'focus'}` : 'Associer à un élément de carte'}
          style={{ height: '24px', padding: block.binding ? '0 6px' : '0 4px', fontSize: '11px' }}
        >
          <Link2 size={13} />
          {block.binding && <span>Lié</span>}
        </button>
      )}

      <button
        type="button"
        className="btn btn-ghost btn-xs btn-icon"
        onClick={() => onExpand('right')}
        title="Agrandir vers la droite"
      >
        <ArrowRight size={13} />
      </button>

      <button
        type="button"
        className="btn btn-ghost btn-xs btn-icon"
        onClick={() => onExpand('down')}
        title="Agrandir vers le bas"
      >
        <ArrowDown size={13} />
      </button>

      {(block.w > 1 || block.h > 1) && (
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-icon"
          onClick={onShrink}
          title="Réduire d’une cellule"
        >
          <Minimize2 size={13} />
        </button>
      )}

      <span style={{ color: 'var(--border)', margin: '0 2px' }}>|</span>

      <button
        type="button"
        className="btn btn-ghost btn-xs btn-icon"
        onClick={onDuplicate}
        title="Dupliquer le bloc"
      >
        <Copy size={13} />
      </button>

      <button
        type="button"
        className="btn btn-ghost btn-xs btn-icon"
        onClick={onDelete}
        title="Supprimer le bloc"
      >
        <Trash2 size={13} color="var(--danger)" />
      </button>

      <span style={{ fontSize: '10px', color: 'var(--text-3)', marginLeft: '4px' }}>
        {block.w}×{block.h}
      </span>
    </div>
  );
};
