/**
 * StoryMap — Atelier d'édition documentaire & intégration carte (P2 / P3 — H01 à H08)
 */

import React, { useState } from 'react';
import { useStory } from '../../context/StoryContext';
import { PageGrid } from './PageGrid';
import { PageFormat } from '../../types/grid';
import { getGridDimensions, refitBlocksToGrid } from '../../core/grid';
import { Page, Block, NarrativeBinding, ProjectMap } from '../../types/project';
import { createDefaultProjectMap, validateNarrativeBindings } from '../../core/mapScene';
import { MapStudioModal } from '../dialogs/MapStudioModal';
import { BindingPickerModal } from '../dialogs/BindingPickerModal';
import { ShareModal } from '../dialogs/ShareModal';
import { ArrowLeft, Save, Plus, Trash2, ChevronLeft, ChevronRight, FileText, Check, AlertCircle, Map, Play, Share2 } from 'lucide-react';

export const DocumentEditor: React.FC<{ onBack: () => void; onPlay?: () => void }> = ({ onBack, onPlay }) => {
  const { story, updateStory, saveStatus, flushSave } = useStory();
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [isMapStudioOpen, setIsMapStudioOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [bindingBlock, setBindingBlock] = useState<Block | null>(null);

  if (!story) return null;

  const maps: ProjectMap[] = story.maps && story.maps.length > 0 ? story.maps : [createDefaultProjectMap()];
  const pages: Page[] = story.pages && story.pages.length > 0 ? story.pages : [{
    id: 'page-1', title: 'Page 1',
    layout: { format: story.format || 'a4-portrait', gridColumns: 6, gridRows: 8, marginMm: 15 },
    blocks: [{ id: 'b1', type: 'title', x: 0, y: 0, w: 4, h: 1, data: { text: story.title, level: 1 } }],
  }];

  const safeIndex = Math.min(Math.max(0, currentPageIndex), pages.length - 1);
  const currentPage = pages[safeIndex];
  const currentFormat: PageFormat = currentPage.layout.format || story.format || 'a4-portrait';

  const handleUpdateCurrentBlocks = (newBlocks: Block[]) => {
    updateStory({ pages: pages.map((p, idx) => (idx === safeIndex ? { ...p, blocks: newBlocks } : p)) });
  };

  const handleFormatChange = (fmt: PageFormat) => {
    const dims = getGridDimensions(fmt);
    const updated = pages.map((p, idx) => {
      if (idx !== safeIndex) return p;
      const refitted = refitBlocksToGrid(p.blocks || [], dims.cols, dims.rows);
      return { ...p, layout: { ...p.layout, format: fmt }, blocks: refitted };
    });
    updateStory({ format: fmt, pages: updated });
  };

  const handleBack = async () => {
    await flushSave();
    onBack();
  };

  const handleAddPage = () => {
    const newPage: Page = {
      id: `page-${Date.now()}`, title: `Page ${pages.length + 1}`,
      layout: { format: currentFormat, gridColumns: 6, gridRows: 8, marginMm: 15 }, blocks: [],
    };
    updateStory({ pages: [...pages, newPage] });
    setCurrentPageIndex(pages.length);
  };

  const handleDeletePage = () => {
    if (pages.length <= 1) return;
    updateStory({ pages: pages.filter((_, idx) => idx !== safeIndex) });
    setCurrentPageIndex(Math.max(0, safeIndex - 1));
  };

  const handleSaveBinding = (blockId: string, binding?: NarrativeBinding) => {
    const updated = pages.map((page) => ({
      ...page,
      blocks: page.blocks.map((b) => (b.id === blockId ? { ...b, binding } : b)),
    }));
    updateStory({ pages: updated });
  };

  const handleUpdateMaps = (updatedMaps: ProjectMap[]) => {
    const validation = validateNarrativeBindings(pages, updatedMaps);
    updateStory({ maps: updatedMaps, pages: validation.cleanPages });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--surface-2)' }}>
      <header style={{ height: '56px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-ghost" onClick={handleBack} title="Retour"><ArrowLeft size={16} /> <span>Retour</span></button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="var(--accent)" />
            <input type="text" value={story.title} onChange={(e) => updateStory({ title: e.target.value })} style={{ fontWeight: 600, fontSize: '15px', border: 'none', background: 'transparent', outline: 'none' }} />
            <span className="badge badge-accent" style={{ fontSize: '11px' }}>{story.mode === 'brochure' ? 'Brochure A4' : 'Document'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-3)', borderRadius: 'var(--r)', padding: '2px 6px' }}>
            <button className="btn btn-ghost btn-icon" disabled={safeIndex <= 0} onClick={() => setCurrentPageIndex((p) => Math.max(0, p - 1))}><ChevronLeft size={16} /></button>
            <span style={{ fontSize: '12px', fontWeight: 600, padding: '0 6px' }}>Page {safeIndex + 1} / {pages.length}</span>
            <button className="btn btn-ghost btn-icon" disabled={safeIndex >= pages.length - 1} onClick={() => setCurrentPageIndex((p) => Math.min(pages.length - 1, p + 1))}><ChevronRight size={16} /></button>
          </div>
          <button className="btn btn-ghost" onClick={handleAddPage}><Plus size={14} /> <span>Page</span></button>
          {pages.length > 1 && <button className="btn btn-ghost btn-danger" onClick={handleDeletePage}><Trash2 size={14} /></button>}
          <select className="input" value={currentFormat} onChange={(e) => handleFormatChange(e.target.value as PageFormat)} style={{ height: '30px', fontSize: '12px', padding: '0 8px' }}>
            <option value="a4-portrait">A4 Portrait</option>
            <option value="a4-landscape">A4 Paysage</option>
            <option value="screen-16-9">Écran 16:9</option>
            <option value="responsive">Responsive</option>
          </select>
          <button className="btn btn-ghost" onClick={() => setIsMapStudioOpen(true)} title="Gérer les scènes cartographiques">
            <Map size={14} color="var(--accent)" /> <span>Atelier Carte ({maps.length})</span>
          </button>
          {onPlay && (
            <button className="btn btn-ghost" onClick={onPlay} title="Lire / Présenter en plein écran">
              <Play size={14} color="var(--accent)" /> <span>Lire</span>
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => setIsShareOpen(true)} title="Partager et exporter">
            <Share2 size={14} /> <span>Partager</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {saveStatus === 'saved' && <span style={{ fontSize: '12px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={14} /> Enregistré</span>}
          {saveStatus === 'saving' && <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>Sauvegarde…</span>}
          {saveStatus === 'dirty' && <span style={{ fontSize: '12px', color: 'var(--accent)' }}>Modifié</span>}
          {saveStatus === 'error' && <span style={{ fontSize: '12px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={14} /> Erreur</span>}
          <button className="btn btn-primary" onClick={flushSave}><Save size={15} /> <span>Enregistrer</span></button>
        </div>
      </header>

      <main style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '32px 16px' }}>
        <PageGrid format={currentFormat} blocks={currentPage.blocks || []} onChangeBlocks={handleUpdateCurrentBlocks} onOpenBinding={(b) => setBindingBlock(b)} />
      </main>

      <MapStudioModal isOpen={isMapStudioOpen} maps={maps} onClose={() => setIsMapStudioOpen(false)} onUpdateMaps={handleUpdateMaps} />
      <BindingPickerModal isOpen={!!bindingBlock} block={bindingBlock} maps={maps} onClose={() => setBindingBlock(null)} onSaveBinding={handleSaveBinding} />
      <ShareModal isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} />
    </div>
  );
};
