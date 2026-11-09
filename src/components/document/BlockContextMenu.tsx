/**
 * StoryMap — Barre contextuelle d'actions sur un bloc sélectionné (G03 / G06 / H05 / N1)
 *
 * Barre courte : Modifier contenu, Remplacer type (palette), Style, Lier,
 * Agrandir/Réduire, Dupliquer, Supprimer.
 */

import React, { useState, useRef } from 'react';
import { Block, BlockType, ProjectMode } from '../../types/project';
import { getAvailableCatalogItems } from '../../core/blockCatalog';
import { EmptyCellMenu } from './EmptyCellMenu';
import { ArrowRight, ArrowLeft, ArrowUp, ArrowDown, Minimize2, Copy, Trash2, Link2, Sliders, Edit3, RefreshCw, RotateCcw } from 'lucide-react';

interface BlockContextMenuProps {
  block: Block;
  mode?: ProjectMode;
  onChangeType: (type: BlockType) => void;
  onExpand: (dir: 'right' | 'down' | 'left' | 'up') => void;
  onShrink: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onReset?: () => void;
  onOpenBinding?: () => void;
  onOpenInspector?: (tab: 'content' | 'replace' | 'style') => void;
}

export const BlockContextMenu: React.FC<BlockContextMenuProps> = ({
  block,
  mode = 'rich-document',
  onChangeType,
  onExpand,
  onShrink,
  onDuplicate,
  onDelete,
  onReset,
  onOpenBinding,
  onOpenInspector,
}) => {
  const [isReplacePaletteOpen, setIsReplacePaletteOpen] = useState(false);
  const replaceBtnRef = useRef<HTMLButtonElement | null>(null);
  const availableItems = getAvailableCatalogItems(mode);

  return (
    <div
      className="block-context-menu"
      style={{
        position: 'absolute',
        top: '-38px',
        left: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r)',
        boxShadow: 'var(--shadow-md)',
        padding: '3px 6px',
        whiteSpace: 'nowrap',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
        <RefreshCw size={11} /> Transformer :
      </span>
      <select
        className="input"
        aria-label="Changer le type de bloc"
        value={block.type}
        onChange={(e) => onChangeType(e.target.value as BlockType)}
        style={{ height: '24px', fontSize: '11px', fontWeight: 600, padding: '0 6px' }}
      >
        {availableItems.map((bt) => (
          <option key={bt.type} value={bt.type}>
            {bt.label}
          </option>
        ))}
      </select>

      <button
        ref={replaceBtnRef}
        type="button"
        className="btn btn-ghost btn-xs btn-icon"
        onClick={() => setIsReplacePaletteOpen((v) => !v)}
        title="Remplacer via la palette de blocs"
      >
        <RefreshCw size={12} />
      </button>

      {isReplacePaletteOpen && (
        <EmptyCellMenu
          x={block.x}
          y={block.y}
          anchorEl={replaceBtnRef.current}
          mode={mode}
          title="Remplacer le type de bloc"
          onSelectType={(t) => {
            onChangeType(t);
            setIsReplacePaletteOpen(false);
          }}
          onClose={() => setIsReplacePaletteOpen(false)}
        />
      )}

      {onOpenInspector && (
        <>
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-icon"
            onClick={() => onOpenInspector('content')}
            title="Modifier le contenu dans l’inspecteur"
          >
            <Edit3 size={13} />
          </button>
          <button
            type="button"
            className={`btn btn-xs ${block.styleOverride && block.styleOverride.styleMode !== 'inherit' ? 'btn-primary' : 'btn-ghost btn-icon'}`}
            onClick={() => onOpenInspector('style')}
            title="Style, bordure et transparence du bloc"
            style={{ height: '24px', padding: '0 5px', fontSize: '11px' }}
          >
            <Sliders size={12} />
          </button>
        </>
      )}

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

      <button type="button" className="btn btn-ghost btn-xs btn-icon" onClick={() => onExpand('left')} title="Agrandir vers la gauche">
        <ArrowLeft size={13} />
      </button>
      <button type="button" className="btn btn-ghost btn-xs btn-icon" onClick={() => onExpand('right')} title="Agrandir vers la droite">
        <ArrowRight size={13} />
      </button>
      <button type="button" className="btn btn-ghost btn-xs btn-icon" onClick={() => onExpand('up')} title="Agrandir vers le haut">
        <ArrowUp size={13} />
      </button>
      <button type="button" className="btn btn-ghost btn-xs btn-icon" onClick={() => onExpand('down')} title="Agrandir vers le bas">
        <ArrowDown size={13} />
      </button>
      {(block.w > 1 || block.h > 1) && (
        <button type="button" className="btn btn-ghost btn-xs btn-icon" onClick={onShrink} title="Réduire d’une cellule">
          <Minimize2 size={13} />
        </button>
      )}
      {onReset && (
        <button type="button" className="btn btn-ghost btn-xs" onClick={onReset} title="Remise à zéro de la case (taille 1x1, style par défaut et contenu vierge)" style={{ height: '24px', padding: '0 5px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}>
          <RotateCcw size={12} /> <span>RÀZ</span>
        </button>
      )}

      <span style={{ color: 'var(--border)', margin: '0 2px' }}>|</span>

      <button type="button" className="btn btn-ghost btn-xs btn-icon" onClick={onDuplicate} title="Dupliquer le bloc">
        <Copy size={13} />
      </button>
      <button type="button" className="btn btn-ghost btn-xs" onClick={onDelete} title="Vider la case (supprimer le bloc et restaurer la cellule vide)" style={{ color: 'var(--danger)', height: '24px', padding: '0 6px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}>
        <Trash2 size={12} /> <span>Vider</span>
      </button>

      <span style={{ fontSize: '10px', color: 'var(--text-3)', marginLeft: '4px' }}>
        {block.w}×{block.h}
      </span>
    </div>
  );
};
