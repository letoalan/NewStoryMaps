/**
 * StoryMap — Palette flottante d'insertion et remplacement de bloc via Portail hors-grille (N1.01 -> N1.08)
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BlockType, ProjectMode } from '../../types/project';
import { useStory } from '../../context/StoryContext';
import {
  CATALOG_CATEGORIES,
  getAvailableCatalogItems,
  computeFloatingPalettePosition,
  FloatingPalettePlacement,
} from '../../core/blockCatalog';
import { Type, Heading, Quote, Image, Layers, Table, Map, BookOpen, Bookmark, Compass, ClipboardList, X, LucideIcon } from 'lucide-react';

export interface EmptyCellMenuProps {
  x: number;
  y: number;
  anchorEl?: HTMLElement | null;
  mode?: ProjectMode;
  title?: string;
  titleLabel?: string;
  onSelectType: (type: BlockType) => void;
  onClose: () => void;
}

const ICONS_BY_TYPE: Record<BlockType, LucideIcon> = {
  title: Heading, text: Type, callout: Quote, image: Image,
  gallery: Layers, map: Map, table: Table, legend: BookOpen, source: Bookmark,
  button: Compass, form: ClipboardList,
};

export const EmptyCellMenu: React.FC<EmptyCellMenuProps> = ({
  x, y, anchorEl, mode: propMode, title, titleLabel, onSelectType, onClose,
}) => {
  const { story } = useStory();
  const effectiveMode = propMode || story?.mode || 'rich-document';
  const items = getAvailableCatalogItems(effectiveMode);
  const headingText = title || titleLabel || `Insérer un bloc · Cellule (${x + 1}, ${y + 1})`;
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const [placement, setPlacement] = useState<FloatingPalettePlacement>(() =>
    computeFloatingPalettePosition(
      anchorEl?.getBoundingClientRect() || { top: 200, left: 200, right: 228, bottom: 228, width: 28, height: 28 },
      typeof window !== 'undefined' ? window.innerWidth : 1024,
      typeof window !== 'undefined' ? window.innerHeight : 768
    )
  );

  const closeAndRestoreFocus = useCallback(() => {
    const trigger = anchorEl;
    onClose();
    if (trigger && typeof trigger.focus === 'function' && document.body.contains(trigger)) {
      setTimeout(() => trigger.focus(), 0);
    }
  }, [anchorEl, onClose]);

  const updatePosition = useCallback(() => {
    if (anchorEl && !document.body.contains(anchorEl)) {
      onClose();
      return;
    }
    const rect = anchorEl?.getBoundingClientRect() || { top: 200, left: 200, right: 228, bottom: 228, width: 28, height: 28 };
    setPlacement(computeFloatingPalettePosition(rect, window.innerWidth, window.innerHeight));
  }, [anchorEl, onClose]);

  useEffect(() => {
    updatePosition();
    btnRefs.current[0]?.focus();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [updatePosition]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeAndRestoreFocus();
        return;
      }
      if (['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(e.key)) {
        const activeIdx = btnRefs.current.findIndex((b) => b === document.activeElement);
        if (activeIdx !== -1 && items.length > 0) {
          e.preventDefault();
          const delta = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
          btnRefs.current[(activeIdx + delta + items.length) % items.length]?.focus();
        }
      }
    };
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || anchorEl?.contains(target)) return;
      closeAndRestoreFocus();
    };
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('mousedown', handlePointerDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('mousedown', handlePointerDown, true);
    };
  }, [closeAndRestoreFocus, anchorEl, items.length]);

  const isBottomSheet = placement.layout === 'bottom-sheet';
  let flatIdx = 0;

  const paletteNode = (
    <>
      {isBottomSheet && <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', zIndex: 2090 }} onClick={closeAndRestoreFocus} />}
      <div
        ref={menuRef} role="dialog" aria-modal="false" aria-label={headingText} data-palette-layout={placement.layout}
        style={{
          position: 'fixed', top: isBottomSheet ? 'auto' : `${placement.top}px`, bottom: isBottomSheet ? '0px' : 'auto',
          left: `${placement.left}px`, width: `${placement.width}px`, maxHeight: `${placement.maxHeight}px`, zIndex: 2100,
          background: 'var(--surface, #ffffff)', color: 'var(--text, #0f172a)', border: '1px solid var(--border, #cbd5e1)',
          borderRadius: isBottomSheet ? '16px 16px 0 0' : '12px', boxShadow: '0 20px 38px rgba(15, 23, 42, 0.24)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2, #f8fafc)' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--accent, #0b7fb0)' }}>{headingText}</span>
          <button type="button" className="btn btn-ghost btn-xs btn-icon" aria-label="Fermer la palette d’insertion" onClick={closeAndRestoreFocus}><X size={15} /></button>
        </div>

        <div style={{ padding: '10px 12px', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {CATALOG_CATEGORIES.map((category) => {
            const catItems = items.filter((i) => i.category === category);
            if (catItems.length === 0) return null;
            return (
              <div key={category}>
                <div style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-3, #64748b)', marginBottom: '4px' }}>{category}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {catItems.map((item) => {
                    const Icon = ICONS_BY_TYPE[item.type] || Type;
                    const idx = flatIdx++;
                    return (
                      <button
                        key={item.type} ref={(el) => { btnRefs.current[idx] = el; }} type="button" className="btn btn-ghost"
                        aria-label={`${item.label} — ${item.description}`}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', width: '100%', padding: '8px 10px', height: 'auto', textAlign: 'left', whiteSpace: 'normal', border: '1px solid var(--border, #e2e8f0)', borderRadius: '8px', background: 'var(--surface, #fff)' }}
                        onClick={() => onSelectType(item.type)}
                      >
                        <Icon size={16} color="var(--accent, #0b7fb0)" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text, #0f172a)' }}>{item.label}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-3, #64748b)', lineHeight: 1.25 }}>{item.description}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );

  if (typeof document === 'undefined') return paletteNode;
  return createPortal(paletteNode, document.body);
};
