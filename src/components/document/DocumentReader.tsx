/**
 * StoryMap — Lecteur / Présentateur immersif de documents enrichis (Mode 2 / Mode 3, P4)
 */

import React, { useState, useEffect, useRef } from 'react';
import { useStory } from '../../context/StoryContext';
import { PageGrid } from './PageGrid';
import { PageFormat } from '../../types/grid';
import { Page } from '../../types/project';
import { ChevronLeft, ChevronRight, Maximize, Minimize, X, List, Columns, Rows, Monitor } from 'lucide-react';

export type ReaderProfile = 'slide' | 'vertical' | 'horizontal';

interface DocumentReaderProps {
  onExit: () => void;
}

export const DocumentReader: React.FC<DocumentReaderProps> = ({ onExit }) => {
  const { story } = useStory();
  const [profile, setProfile] = useState<ReaderProfile>('slide');
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSommaireOpen, setIsSommaireOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const pages: Page[] = story?.pages && story.pages.length > 0 ? story.pages : [{
    id: 'p1', title: 'Page 1',
    layout: { format: story?.format || 'a4-portrait', gridColumns: 6, gridRows: 8, marginMm: 15 },
    blocks: [],
  }];

  const totalPages = pages.length;
  const currentFormat: PageFormat = pages[currentPageIndex]?.layout.format || story?.format || 'a4-portrait';

  const next = () => setCurrentPageIndex((p) => Math.min(totalPages - 1, p + 1));
  const prev = () => setCurrentPageIndex((p) => Math.max(0, p - 1));

  // Clavier : Flèche Gauche / Droite, Echap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') next();
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') prev();
      else if (e.key === 'Escape') {
        if (isSommaireOpen) setIsSommaireOpen(false);
        else onExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalPages, isSommaireOpen, onExit]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  return (
    <div ref={containerRef} style={{ width: '100vw', height: '100vh', background: '#0f172a', color: '#f8fafc', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {/* Barre d'outils du lecteur */}
      <header style={{ height: '52px', background: 'rgba(15, 23, 42, 0.95)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setIsSommaireOpen(!isSommaireOpen)} title="Sommaire des pages">
            <List size={16} /> <span>Sommaire</span>
          </button>
          <span style={{ fontWeight: 600, fontSize: '14px', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {story?.title}
          </span>
        </div>

        {/* Profils de présentation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--r)', padding: '2px' }}>
          <button className={`btn btn-xs ${profile === 'slide' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setProfile('slide')} title="Mode Diapositive"><Monitor size={14} /></button>
          <button className={`btn btn-xs ${profile === 'vertical' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setProfile('vertical')} title="Défilement Vertical"><Rows size={14} /></button>
          <button className={`btn btn-xs ${profile === 'horizontal' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setProfile('horizontal')} title="Défilement Horizontal"><Columns size={14} /></button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={toggleFullscreen} title={isFullscreen ? 'Quitter plein écran' : 'Plein écran'}>
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onExit} title="Fermer la présentation"><X size={16} /></button>
        </div>
      </header>

      {/* Contenu principal selon profil */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: profile === 'slide' ? 'center' : 'flex-start', padding: '24px' }}>
        {profile === 'slide' && (
          <div style={{ transform: 'scale(0.92)', transformOrigin: 'center center', transition: 'transform 0.2s ease' }}>
            <PageGrid format={currentFormat} blocks={pages[currentPageIndex]?.blocks || []} onChangeBlocks={() => {}} isEditable={false} />
          </div>
        )}

        {profile === 'vertical' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', alignItems: 'center' }}>
            {pages.map((p, idx) => (
              <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Page {idx + 1} — {p.title}</span>
                <PageGrid format={p.layout.format || currentFormat} blocks={p.blocks || []} onChangeBlocks={() => {}} isEditable={false} />
              </div>
            ))}
          </div>
        )}

        {profile === 'horizontal' && (
          <div style={{ display: 'flex', flexDirection: 'row', gap: '32px', alignItems: 'flex-start' }}>
            {pages.map((p, idx) => (
              <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Page {idx + 1} — {p.title}</span>
                <PageGrid format={p.layout.format || currentFormat} blocks={p.blocks || []} onChangeBlocks={() => {}} isEditable={false} />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Barre de navigation inférieure (Mode Slide) */}
      {profile === 'slide' && (
        <footer style={{ height: '48px', background: 'rgba(15, 23, 42, 0.95)', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <button className="btn btn-ghost btn-icon btn-sm" disabled={currentPageIndex <= 0} onClick={prev} title="Page précédente"><ChevronLeft size={18} /></button>
          {/* Puces de pagination (Dots) */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {pages.map((_, i) => (
              <div
                key={i}
                onClick={() => setCurrentPageIndex(i)}
                style={{ width: i === currentPageIndex ? '20px' : '8px', height: '8px', borderRadius: '4px', backgroundColor: i === currentPageIndex ? 'var(--accent)' : 'rgba(255,255,255,0.3)', cursor: 'pointer', transition: 'all 0.2s' }}
                title={`Aller à la page ${i + 1}`}
              />
            ))}
          </div>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>{currentPageIndex + 1} / {totalPages}</span>
          <button className="btn btn-ghost btn-icon btn-sm" disabled={currentPageIndex >= totalPages - 1} onClick={next} title="Page suivante"><ChevronRight size={18} /></button>
        </footer>
      )}

      {/* Tiroir latéral Sommaire */}
      {isSommaireOpen && (
        <aside style={{ position: 'absolute', top: '52px', left: 0, bottom: 0, width: '280px', background: '#1e293b', borderRight: '1px solid rgba(255,255,255,0.1)', zIndex: 110, padding: '16px', overflowY: 'auto' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#e2e8f0' }}>Sommaire</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {pages.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => { setCurrentPageIndex(idx); setIsSommaireOpen(false); }}
                style={{ textAlign: 'left', padding: '8px 10px', borderRadius: 'var(--r)', background: idx === currentPageIndex ? 'var(--accent)' : 'transparent', color: idx === currentPageIndex ? '#fff' : '#cbd5e1', border: 'none', cursor: 'pointer', fontSize: '13px' }}
              >
                <strong>{idx + 1}.</strong> {p.title || `Page ${idx + 1}`}
              </button>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
};

