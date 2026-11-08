/**
 * StoryMap — Atelier d'édition documentaire & intégration carte (P2 / P3 / N1 / N2 / N3)
 */

import React, { useState } from 'react';
import { useStory } from '../../context/StoryContext';
import { PageGrid } from './PageGrid';
import { HeroSection } from './HeroSection';
import { PageFormat } from '../../types/grid';
import { getGridDimensions, refitBlocksDetailed } from '../../core/grid';
import { PAGE_STRUCTURAL_TEMPLATES, previewStructuralTemplate } from '../../core/layoutTemplates';
import { Page, Block, NarrativeBinding, ProjectMap } from '../../types/project';
import { createDefaultProjectMap, validateNarrativeBindings } from '../../core/mapScene';
import { MapStudioModal } from '../dialogs/MapStudioModal';
import { BindingPickerModal } from '../dialogs/BindingPickerModal';
import { ShareModal } from '../dialogs/ShareModal';
import { BrochureModal } from '../dialogs/BrochureModal';
import { SettingsModal } from '../dialogs/SettingsModal';
import { ArrowLeft, Save, Plus, Trash2, ChevronLeft, ChevronRight, FileText, Check, AlertCircle, Map, Play, Share2, Printer, Palette, LayoutTemplate } from 'lucide-react';

export const DocumentEditor: React.FC<{ onBack: () => void; onPlay?: () => void }> = ({ onBack, onPlay }) => {
  const { story, updateStory, saveStatus, flushSave } = useStory();
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [isMapStudioOpen, setIsMapStudioOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isBrochureOpen, setIsBrochureOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
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
  const activePreview = pendingTemplateId ? previewStructuralTemplate(currentPage, pendingTemplateId, currentFormat) : null;
  const displayedPage = activePreview ? activePreview.previewPage : currentPage;

  const handleUpdateCurrentBlocks = (newBlocks: Block[]) => {
    setPendingTemplateId(null);
    updateStory({ pages: pages.map((p, idx) => (idx === safeIndex ? { ...p, blocks: newBlocks } : p)) });
  };

  const applyPendingTemplate = () => {
    if (!activePreview) return;
    const dims = getGridDimensions(currentFormat);
    let overflow = [...activePreview.overflowBlocks];
    const updated = pages.map((p, idx) => (idx === safeIndex ? activePreview.previewPage : p));
    const spillPages: Page[] = [];
    let sIdx = 1;
    while (overflow.length > 0) {
      const r = refitBlocksDetailed(overflow, dims.cols, dims.rows);
      if (r.placed.length === 0) break;
      spillPages.push({
        id: `page-${Date.now()}-tpl-${sIdx}`, title: `Page ${pages.length + sIdx} (Suite modèle)`,
        layout: { format: currentFormat, gridColumns: dims.cols, gridRows: dims.rows, marginMm: dims.marginMm }, blocks: r.placed,
      });
      overflow = r.unplaced;
      sIdx++;
    }
    setPendingTemplateId(null);
    updateStory({ pages: [...updated, ...spillPages] });
  };

  const handleFormatChange = (fmt: PageFormat) => {
    const dims = getGridDimensions(fmt);
    let overflowBlocks: Block[] = [];
    const updated = pages.map((p, idx) => {
      if (idx !== safeIndex) return p;
      const res = refitBlocksDetailed(p.blocks || [], dims.cols, dims.rows);
      if (res.unplaced.length > 0) overflowBlocks = res.unplaced;
      return { ...p, layout: { ...p.layout, format: fmt }, blocks: res.placed };
    });
    const spillPages: Page[] = [];
    let spillIdx = 1;
    while (overflowBlocks.length > 0) {
      const spillRes = refitBlocksDetailed(overflowBlocks, dims.cols, dims.rows);
      if (spillRes.placed.length === 0) break;
      spillPages.push({
        id: `page-${Date.now()}-spill-${spillIdx}`, title: `Page ${pages.length + spillIdx} (Débordement)`,
        layout: { format: fmt, gridColumns: dims.cols, gridRows: dims.rows, marginMm: dims.marginMm }, blocks: spillRes.placed,
      });
      overflowBlocks = spillRes.unplaced;
      spillIdx++;
    }
    updateStory({ format: fmt, pages: [...updated, ...spillPages] });
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
    updateStory({ pages: pages.map((page) => ({ ...page, blocks: page.blocks.map((b) => (b.id === blockId ? { ...b, binding } : b)) })) });
  };

  const handleUpdateMaps = (updatedMaps: ProjectMap[]) => {
    const validation = validateNarrativeBindings(pages, updatedMaps);
    updateStory({ maps: updatedMaps, pages: validation.cleanPages });
  };

  const activeHero = displayedPage.hero?.enabled ? displayedPage.hero : safeIndex === 0 && story.hero?.enabled ? story.hero : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--surface-2)' }}>
      <header style={{ height: '56px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="btn btn-ghost" onClick={async () => { await flushSave(); onBack(); }} title="Retour"><ArrowLeft size={16} /> <span>Retour</span></button>
          <FileText size={18} color="var(--accent)" />
          <input type="text" value={story.title} onChange={(e) => updateStory({ title: e.target.value })} style={{ fontWeight: 600, fontSize: '15px', border: 'none', background: 'transparent', outline: 'none' }} />
          <span className="badge badge-accent" style={{ fontSize: '11px' }}>{story.mode === 'brochure' ? 'Brochure A4' : 'Document'}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-3)', borderRadius: 'var(--r)', padding: '2px 6px' }}>
            <button className="btn btn-ghost btn-icon" disabled={safeIndex <= 0} onClick={() => setCurrentPageIndex((p) => Math.max(0, p - 1))}><ChevronLeft size={16} /></button>
            <span style={{ fontSize: '12px', fontWeight: 600, padding: '0 6px' }}>Page {safeIndex + 1} / {pages.length}</span>
            <button className="btn btn-ghost btn-icon" disabled={safeIndex >= pages.length - 1} onClick={() => setCurrentPageIndex((p) => Math.min(pages.length - 1, p + 1))}><ChevronRight size={16} /></button>
          </div>
          <button className="btn btn-ghost" onClick={handleAddPage}><Plus size={14} /> <span>Page</span></button>
          {pages.length > 1 && <button className="btn btn-ghost btn-danger" onClick={handleDeletePage}><Trash2 size={14} /></button>}
          <select className="input" value={currentFormat} onChange={(e) => handleFormatChange(e.target.value as PageFormat)} style={{ height: '30px', fontSize: '12px', padding: '0 6px' }}>
            <option value="a4-portrait">A4 Portrait</option>
            <option value="a4-landscape">A4 Paysage</option>
            <option value="screen-16-9">Écran 16:9</option>
            <option value="responsive">Responsive</option>
          </select>
          <select className="input" value={pendingTemplateId || ''} onChange={(e) => setPendingTemplateId(e.target.value || null)} title="Prévisualiser un modèle de structure" style={{ height: '30px', fontSize: '12px', padding: '0 6px' }}>
            <option value="">Structure libre</option>
            {PAGE_STRUCTURAL_TEMPLATES.map((t) => <option key={t.id} value={t.id}>Modèle : {t.label}</option>)}
          </select>
          <button className="btn btn-ghost" onClick={() => setIsSettingsOpen(true)} title="Charte, Hero et Véhicules"><Palette size={14} color="var(--accent)" /> <span>Thème</span></button>
          <button className="btn btn-ghost" onClick={() => setIsMapStudioOpen(true)} title="Gérer les scènes cartographiques"><Map size={14} color="var(--accent)" /> <span>Cartes ({maps.length})</span></button>
          {onPlay && <button className="btn btn-ghost" onClick={onPlay} title="Lire / Présenter"><Play size={14} color="var(--accent)" /> <span>Lire</span></button>}
          <button className="btn btn-ghost" onClick={() => setIsBrochureOpen(true)} title="Brochure A4 / PDF"><Printer size={14} color="var(--accent)" /> <span>PDF</span></button>
          <button className="btn btn-ghost" onClick={() => setIsShareOpen(true)} title="Partager"><Share2 size={14} /></button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {saveStatus === 'saved' && <span style={{ fontSize: '12px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={14} /></span>}
          {saveStatus === 'error' && <span style={{ fontSize: '12px', color: 'var(--danger)' }}><AlertCircle size={14} /></span>}
          <button className="btn btn-primary" onClick={flushSave}><Save size={15} /> <span>Enregistrer</span></button>
        </div>
      </header>

      {activePreview && (
        <div style={{ background: '#eff6ff', borderBottom: '1px solid #bfdbfe', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#1e3a8a' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LayoutTemplate size={15} />
            Aperçu du modèle structurel ({activePreview.displacedCount} bloc(s) repositionné(s), {activePreview.preservedCount} bloc(s) conservé(s), 0 supprimé).
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => setPendingTemplateId(null)}>Annuler l’aperçu</button>
            <button type="button" className="btn btn-primary btn-xs" onClick={applyPendingTemplate}>Appliquer la structure</button>
          </div>
        </div>
      )}

      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 16px' }}>
        {activeHero && (
          <div style={{ width: '100%', maxWidth: '794px' }}>
            <HeroSection hero={activeHero} fallbackTitle={displayedPage.title || story.title} fallbackSubtitle={story.subtitle} fallbackLogo={story.brand?.logo} outputProfile="editor" />
          </div>
        )}
        <PageGrid format={currentFormat} blocks={displayedPage.blocks || []} onChangeBlocks={handleUpdateCurrentBlocks} onOpenBinding={(b) => setBindingBlock(b)} story={story} page={displayedPage} mode={story.mode} outputProfile="editor" />
      </main>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <MapStudioModal isOpen={isMapStudioOpen} maps={maps} onClose={() => setIsMapStudioOpen(false)} onUpdateMaps={handleUpdateMaps} />
      <BindingPickerModal isOpen={!!bindingBlock} block={bindingBlock} maps={maps} onClose={() => setBindingBlock(null)} onSaveBinding={handleSaveBinding} />
      <BrochureModal isOpen={isBrochureOpen} onClose={() => setIsBrochureOpen(false)} />
      <ShareModal isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} />
    </div>
  );
};
