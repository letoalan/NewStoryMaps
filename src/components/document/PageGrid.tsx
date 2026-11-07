/**
 * StoryMap — Grille de mise en page documentaire (P2 — G01/G02/G03/G05)
 */

import React, { useState } from 'react';
import { Block, BlockType } from '../../types/project';
import { PageFormat } from '../../types/grid';
import { getGridDimensions, expandBlock, shrinkBlock, duplicateBlock, deleteBlock, addBlock } from '../../core/grid';
import { BlockContextMenu } from './BlockContextMenu';
import { EmptyCellMenu } from './EmptyCellMenu';
import { BlockRenderer } from './BlockRenderer';
import { Plus } from 'lucide-react';

interface PageGridProps {
  format: PageFormat;
  blocks: Block[];
  onChangeBlocks: (blocks: Block[]) => void;
  onOpenBinding?: (block: Block) => void;
  isEditable?: boolean;
}

export const PageGrid: React.FC<PageGridProps> = ({ format, blocks, onChangeBlocks, onOpenBinding, isEditable = true }) => {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [activeEmptyCell, setActiveEmptyCell] = useState<{ x: number; y: number } | null>(null);

  const { cols, rows, cellWidthPx, cellHeightPx, gapPx, marginMm } = getGridDimensions(format);

  const occupiedMatrix: Array<Array<Block | null>> = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null)
  );

  blocks.forEach((b) => {
    for (let dy = 0; dy < b.h && b.y + dy < rows; dy++) {
      for (let dx = 0; dx < b.w && b.x + dx < cols; dx++) {
        occupiedMatrix[b.y + dy][b.x + dx] = b;
      }
    }
  });

  const handleUpdateBlockData = (id: string, patch: Record<string, unknown>) => {
    onChangeBlocks(blocks.map((b) => (b.id === id ? { ...b, data: { ...b.data, ...patch } } : b)));
  };
  const handleTypeChange = (id: string, type: BlockType) => {
    onChangeBlocks(blocks.map((b) => (b.id === id ? { ...b, type } : b)));
  };

  const handleExpand = (blockId: string, dir: 'right' | 'down') => {
    const res = expandBlock(blocks, blockId, dir, cols, rows);
    if (res.success) onChangeBlocks(res.blocks); else if (res.error) alert(res.error);
  };

  const handleShrink = (blockId: string) => {
    const res = shrinkBlock(blocks, blockId);
    if (res.success) onChangeBlocks(res.blocks); else if (res.error) alert(res.error);
  };

  const handleDuplicate = (blockId: string) => {
    const res = duplicateBlock(blocks, blockId, cols, rows);
    if (res.success) {
      onChangeBlocks(res.blocks);
      const cloned = res.blocks[res.blocks.length - 1];
      if (cloned) setSelectedBlockId(cloned.id);
    } else if (res.error) alert(res.error);
  };

  const handleDelete = (blockId: string) => {
    onChangeBlocks(deleteBlock(blocks, blockId));
    if (selectedBlockId === blockId) setSelectedBlockId(null);
  };

  const handleAddBlockToCell = (x: number, y: number, type: BlockType) => {
    const newBlock: Block = {
      id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      x,
      y,
      w: 1,
      h: 1,
      data: type === 'table' ? { rows: [['En-tête 1', 'En-tête 2'], ['Donnée 1', 'Donnée 2']] } : { text: '' },
    };
    const res = addBlock(blocks, newBlock, cols, rows);
    if (res.success) {
      onChangeBlocks(res.blocks);
      setSelectedBlockId(newBlock.id);
      setActiveEmptyCell(null);
    } else if (res.error) alert(res.error);
  };

  return (
    <div
      className="page-grid-container"
      style={{
        display: 'inline-block',
        padding: `${marginMm}mm`,
        background: '#fff',
        boxShadow: 'var(--shadow-lg)',
        borderRadius: 'var(--r)',
        position: 'relative',
        userSelect: 'none',
      }}
      onClick={() => { setSelectedBlockId(null); setActiveEmptyCell(null); }}
    >
      <div
        className="page-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${cellWidthPx}px)`,
          gridTemplateRows: `repeat(${rows}, ${cellHeightPx}px)`,
          gap: `${gapPx}px`,
          position: 'relative',
        }}
      >
        {Array.from({ length: rows }).map((_, y) =>
          Array.from({ length: cols }).map((__, x) => {
            const isOccupied = !!occupiedMatrix[y][x];
            const isCurrentActive = activeEmptyCell?.x === x && activeEmptyCell?.y === y;
            return (
              <div
                key={`cell-${x}-${y}`}
                style={{
                  gridColumn: x + 1,
                  gridRow: y + 1,
                  border: isOccupied ? 'none' : '1px dashed var(--border)',
                  borderRadius: 'var(--r)',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {!isOccupied && isEditable && (
                  <>
                    <button
                      className="btn btn-ghost btn-icon"
                      style={{ opacity: 0.35, borderRadius: '50%', width: '28px', height: '28px' }}
                      title={`Ajouter un bloc en (${x + 1}, ${y + 1})`}
                      onClick={(e) => { e.stopPropagation(); setActiveEmptyCell({ x, y }); }}
                    >
                      <Plus size={16} />
                    </button>
                    {isCurrentActive && (
                      <EmptyCellMenu
                        x={x}
                        y={y}
                        onSelectType={(t) => handleAddBlockToCell(x, y, t)}
                        onClose={() => setActiveEmptyCell(null)}
                      />
                    )}
                  </>
                )}
              </div>
            );
          })
        )}

        {blocks.map((b) => {
          const isSelected = selectedBlockId === b.id;
          return (
            <div
              key={b.id}
              style={{
                gridColumn: `${b.x + 1} / span ${b.w}`,
                gridRow: `${b.y + 1} / span ${b.h}`,
                position: 'relative',
                zIndex: isSelected ? 30 : 10,
                outline: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                outlineOffset: '2px',
                borderRadius: 'var(--r)',
                background: 'var(--surface)',
                overflow: 'visible',
              }}
              onClick={(e) => { e.stopPropagation(); setSelectedBlockId(b.id); }}
            >
              {isSelected && isEditable && (
                <BlockContextMenu
                  block={b}
                  onChangeType={(t) => handleTypeChange(b.id, t)}
                  onExpand={(d) => handleExpand(b.id, d)}
                  onShrink={() => handleShrink(b.id)}
                  onDuplicate={() => handleDuplicate(b.id)}
                  onDelete={() => handleDelete(b.id)}
                  onOpenBinding={onOpenBinding ? () => onOpenBinding(b) : undefined}
                />
              )}
              <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
                <BlockRenderer block={b} onChange={(p) => handleUpdateBlockData(b.id, p)} isEditable={isEditable} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
