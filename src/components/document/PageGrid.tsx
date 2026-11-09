/**
 * StoryMap — Grille de mise en page documentaire (P2 / N1 / N2)
 */

import React, { useState, useEffect } from 'react';
import { Block, BlockType, Page, ProjectMode } from '../../types/project';
import { Story } from '../../types/story';
import { PageFormat } from '../../types/grid';
import { BlockVisualOverride, HeroConfig, OutputProfile } from '../../types/theme';
import { getGridDimensions, expandBlock, shrinkBlock, duplicateBlock, deleteBlock, addBlock } from '../../core/grid';
import { convertBlockTypePreservingContent } from '../../core/blockCatalog';
import { resolveVisualStyle } from '../../core/themeResolver';
import { HeroSection } from './HeroSection';
import { BlockContextMenu } from './BlockContextMenu';
import { EmptyCellMenu } from './EmptyCellMenu';
import { BlockRenderer } from './BlockRenderer';
import { BlockInspectorModal } from '../dialogs/BlockInspectorModal';
import { Plus, ArrowRight, ArrowLeft, ArrowUp, ArrowDown } from 'lucide-react';

interface PageGridProps {
  format: PageFormat;
  blocks: Block[];
  onChangeBlocks: (blocks: Block[]) => void;
  onOpenBinding?: (block: Block) => void;
  isEditable?: boolean;
  story?: Partial<Story> | null;
  page?: Partial<Page> | null;
  hero?: HeroConfig | null;
  onUpdateHero?: (patch: Partial<HeroConfig>) => void;
  mode?: ProjectMode;
  outputProfile?: OutputProfile;
}

export const PageGrid: React.FC<PageGridProps> = ({
  format, blocks, onChangeBlocks, onOpenBinding, isEditable = true, story, page, hero, onUpdateHero, mode, outputProfile,
}) => {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [activeEmptyCell, setActiveEmptyCell] = useState<{ x: number; y: number; anchorEl: HTMLElement | null } | null>(null);
  const [inspectedBlock, setInspectedBlock] = useState<{ id: string; tab: 'content' | 'replace' | 'style' } | null>(null);

  const effectiveMode: ProjectMode = mode || story?.mode || 'rich-document';
  const effectiveProfile: OutputProfile = outputProfile || (isEditable ? 'editor' : 'web-interactive');
  const pageStyle = resolveVisualStyle(story, page, null, effectiveProfile);
  const { cols, rows, gapPx, marginMm, aspectRatio } = getGridDimensions(format);

  useEffect(() => { setActiveEmptyCell(null); }, [format, page?.id]);

  const occupiedMatrix: Array<Array<Block | null>> = Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));
  blocks.forEach((b) => {
    for (let dy = 0; dy < b.h && b.y + dy < rows; dy++)
      for (let dx = 0; dx < b.w && b.x + dx < cols; dx++) occupiedMatrix[b.y + dy][b.x + dx] = b;
  });

  const handleUpdateBlockData = (id: string, patch: Record<string, unknown>) => {
    onChangeBlocks(blocks.map((b) => (b.id === id ? { ...b, data: { ...b.data, ...patch } } : b)));
  };

  const handleTypeChange = (id: string, targetType: BlockType) => {
    onChangeBlocks(blocks.map((b) => (b.id === id ? convertBlockTypePreservingContent(b, targetType) : b)));
  };

  const handleStyleChange = (id: string, styleOverride?: BlockVisualOverride) => {
    onChangeBlocks(blocks.map((b) => {
      if (b.id !== id) return b;
      const next = { ...b };
      if (!styleOverride || styleOverride.styleMode === 'inherit') delete next.styleOverride;
      else next.styleOverride = styleOverride;
      return next;
    }));
  };

  const handleExpand = (blockId: string, dir: 'right' | 'down' | 'left' | 'up') => {
    const res = expandBlock(blocks, blockId, dir, cols, rows);
    if (res.success) onChangeBlocks(res.blocks); else if (res.error) alert(res.error);
  };
  const handleShrink = (blockId: string) => {
    const res = shrinkBlock(blocks, blockId);
    if (res.success) onChangeBlocks(res.blocks); else if (res.error) alert(res.error);
  };
  const handleDuplicate = (blockId: string) => {
    const res = duplicateBlock(blocks, blockId, cols, rows);
    if (res.success) { onChangeBlocks(res.blocks); const c = res.blocks[res.blocks.length - 1]; if (c) setSelectedBlockId(c.id); }
    else if (res.error) alert(res.error);
  };
  const handleDelete = (blockId: string) => {
    onChangeBlocks(deleteBlock(blocks, blockId));
    if (selectedBlockId === blockId) setSelectedBlockId(null);
    if (inspectedBlock?.id === blockId) setInspectedBlock(null);
  };
  const handleReset = (blockId: string) => {
    onChangeBlocks(blocks.map((b) => (b.id === blockId ? { ...b, w: 1, h: 1, styleOverride: undefined, binding: undefined, data: b.type === 'table' ? { rows: [['-']] } : { text: '' } } : b)));
  };

  const handleAddBlockToCell = (x: number, y: number, type: BlockType) => {
    const seed = convertBlockTypePreservingContent({ id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type: 'text', x, y, w: 1, h: 1, data: { text: '' } }, type);
    const res = addBlock(blocks, seed, cols, rows);
    if (res.success) { onChangeBlocks(res.blocks); setSelectedBlockId(seed.id); setActiveEmptyCell(null); }
    else if (res.error) alert(res.error);
  };

  const activeInspectedBlock = inspectedBlock ? blocks.find((b) => b.id === inspectedBlock.id) || null : null;

  return (
    <div
      className="page-grid-container"
      style={{ display: 'inline-block', padding: `${marginMm}mm`, background: pageStyle.pageBackground, color: pageStyle.textColor, fontFamily: pageStyle.bodyFont, boxShadow: 'var(--shadow-lg)', borderRadius: pageStyle.radiusCss, position: 'relative', userSelect: 'none', aspectRatio, width: format === 'screen-16-9' ? '1240px' : format === 'a4-landscape' ? '1180px' : format === 'a4-portrait' ? '740px' : '100%', maxWidth: '100%', boxSizing: 'border-box' }}
      onClick={() => { setSelectedBlockId(null); setActiveEmptyCell(null); }}
    >
      {hero?.enabled && !blocks.some((b) => b.type === 'title') && (
        <div style={{ width: '100%', marginBottom: `${gapPx}px` }}>
          <HeroSection hero={hero} fallbackTitle={page?.title || story?.title} fallbackSubtitle={story?.subtitle} fallbackLogo={story?.brand?.logo} outputProfile={effectiveProfile} isEditable={isEditable} onUpdateHero={onUpdateHero} charterColor={pageStyle.primaryColor} />
        </div>
      )}
      <div className="page-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`, gap: `${gapPx}px`, position: 'relative', width: '100%', height: '100%', boxSizing: 'border-box' }}>
        {Array.from({ length: rows }).map((_, y) =>
          Array.from({ length: cols }).map((__, x) => {
            const isOccupied = !!occupiedMatrix[y][x];
            const isCurrentActive = activeEmptyCell?.x === x && activeEmptyCell?.y === y;
            return (
              <div key={`cell-${x}-${y}`} style={{ gridColumn: x + 1, gridRow: y + 1, border: isOccupied || !isEditable ? 'none' : '1px dashed var(--border)', borderRadius: pageStyle.radiusCss, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {!isOccupied && isEditable && (
                  <>
                    <button type="button" className="btn btn-ghost btn-icon" style={{ opacity: isCurrentActive ? 0.9 : 0.35, borderRadius: '50%', width: '28px', height: '28px' }} title={`Ajouter un bloc en (${x + 1}, ${y + 1})`} onClick={(e) => { e.stopPropagation(); setActiveEmptyCell({ x, y, anchorEl: e.currentTarget }); }}>
                      <Plus size={16} />
                    </button>
                    {isCurrentActive && <EmptyCellMenu x={x} y={y} anchorEl={activeEmptyCell.anchorEl} mode={effectiveMode} onSelectType={(t) => handleAddBlockToCell(x, y, t)} onClose={() => setActiveEmptyCell(null)} />}
                  </>
                )}
              </div>
            );
          })
        )}

        {blocks.map((b) => {
          const isSelected = selectedBlockId === b.id, isHero = b.type === 'title' && Boolean(hero?.enabled);
          const bStyle = resolveVisualStyle(story, page, b, effectiveProfile);
          const editorOutline = isEditable ? (isSelected ? '2px solid var(--accent)' : bStyle.showEditorGuide ? '1px dashed rgba(148, 163, 184, 0.55)' : 'none') : 'none';

          return (
            <div
              key={b.id} data-block-id={b.id} data-style-mode={b.styleOverride?.styleMode || 'inherit'}
              style={{ gridColumn: `${b.x + 1} / span ${b.w}`, gridRow: `${b.y + 1} / span ${b.h}`, position: 'relative', zIndex: isSelected ? 30 : 10, outline: editorOutline, outlineOffset: '2px', borderRadius: bStyle.radiusCss, background: isHero ? 'transparent' : bStyle.surfaceCssBackground, border: isHero ? 'none' : bStyle.borderCss, boxShadow: bStyle.shadowCss, color: bStyle.textColor, overflow: 'visible' }}
              onClick={(e) => { e.stopPropagation(); if (isEditable) setSelectedBlockId(b.id); }}
              onMouseEnter={() => { if (isEditable) setHoveredBlockId(b.id); }}
              onMouseLeave={() => { if (isEditable) setHoveredBlockId(null); }}
            >
              {isSelected && isEditable && (
                <BlockContextMenu
                  block={b} mode={effectiveMode} onChangeType={(t) => handleTypeChange(b.id, t)}
                  onExpand={(d) => handleExpand(b.id, d)} onShrink={() => handleShrink(b.id)}
                  onDuplicate={() => handleDuplicate(b.id)} onDelete={() => handleDelete(b.id)}
                  onReset={() => handleReset(b.id)}
                  onOpenBinding={onOpenBinding ? () => onOpenBinding(b) : undefined}
                  onOpenInspector={(tab) => setInspectedBlock({ id: b.id, tab })}
                />
              )}
              {isEditable && (isSelected || hoveredBlockId === b.id) && (
                ([
                  ['up', b.y > 0, ArrowUp, 'vers le haut', { top: '-13px', left: '50%', transform: 'translateX(-50%)' }],
                  ['down', b.y + b.h < rows, ArrowDown, 'vers le bas', { bottom: '-13px', left: '50%', transform: 'translateX(-50%)' }],
                  ['left', b.x > 0, ArrowLeft, 'vers la gauche', { left: '-13px', top: '50%', transform: 'translateY(-50%)' }],
                  ['right', b.x + b.w < cols, ArrowRight, 'vers la droite', { right: '-13px', top: '50%', transform: 'translateY(-50%)' }],
                ] as const).filter(([, can]) => can).map(([dir,, Icon, lbl, pos]) => (
                  <button
                    key={dir} type="button" className={`btn-expand-${dir}`} title={`Agrandir le conteneur ${lbl}`}
                    aria-label={`Agrandir ${lbl}`} onClick={(e) => { e.stopPropagation(); handleExpand(b.id, dir); }}
                    style={{ position: 'absolute', ...(pos as React.CSSProperties), width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent)', color: '#fff', border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 35, padding: 0 }}
                  >
                    <Icon size={13} strokeWidth={2.5} />
                  </button>
                ))
              )}
              <div style={{ width: '100%', height: '100%', overflow: isHero ? 'hidden' : 'auto', borderRadius: bStyle.radiusCss, padding: isHero ? 0 : bStyle.paddingCss, color: bStyle.textColor, fontFamily: bStyle.bodyFont }}>
                <BlockRenderer block={b} onChange={(p) => handleUpdateBlockData(b.id, p)} isEditable={isEditable} visualStyle={bStyle} hero={hero} onUpdateHero={onUpdateHero} subtitle={story?.subtitle} />
              </div>
            </div>
          );
        })}
      </div>

      <BlockInspectorModal
        isOpen={!!activeInspectedBlock} block={activeInspectedBlock} mode={effectiveMode}
        initialTab={inspectedBlock?.tab || 'content'} onClose={() => setInspectedBlock(null)}
        onUpdateData={handleUpdateBlockData} onChangeType={handleTypeChange} onUpdateStyle={handleStyleChange}
        onResetBlock={handleReset}
      />
    </div>
  );
};
