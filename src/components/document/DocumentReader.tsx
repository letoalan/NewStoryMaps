/**
 * StoryMap — Lecteur / Présentateur immersif de documents enrichis (Mode 2 / Mode 3, P4 — V04/V05)
 */

import React, { useState, useEffect, useRef } from 'react';
import { useStory } from '../../context/StoryContext';
import { PageGrid } from './PageGrid';
import { PageFormat } from '../../types/grid';
import { Page } from '../../types/project';
import { ReaderProfile, shouldIgnoreReaderKeyEvent, computeNextPageIndex } from '../../core/readerNavigation';
import { ChevronLeft, ChevronRight, Maximize, Minimize, X, List, Columns, Rows, Monitor } from 'lucide-react';

export type { ReaderProfile };

export const DocumentReader: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const { story } = useStory();
  const [profile, setProfile] = useState<ReaderProfile>('slide');
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSommaireOpen, setIsSommaireOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sommaireBtnRef = useRef<HTMLButtonElement>(null);

  const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const pages: Page[] = story?.pages && story.pages.length > 0 ? story.pages : [{
    id: 'p1', title: 'Page 1', layout: { format: story?.format || 'a4-portrait', gridColumns: 6, gridRows: 8, marginMm: 15 }, blocks: [],
  }];
  const totalPages = pages.length;
  const currentFormat: PageFormat = pages[currentPageIndex]?.layout.format || story?.format || 'a4-portrait';

  const goToPage = (targetIdx: number) => {
    const clamped = computeNextPageIndex(targetIdx, totalPages, 0);
    setCurrentPageIndex(clamped);
    if (profile !== 'slide') {
      const el = document.getElementById(`reader-page-${clamped}`);
      el?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start', inline: 'start' });
    }
  };

  const next = () => goToPage(computeNextPageIndex(currentPageIndex, totalPages, 1));
  const prev = () => goToPage(computeNextPageIndex(currentPageIndex, totalPages, -1));

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isSommaireOpen) { setIsSommaireOpen(false); sommaireBtnRef.current?.focus(); }
        else onExit();
        return;
      }
      if (shouldIgnoreReaderKeyEvent(e.target as HTMLElement)) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPageIndex, totalPages, isSommaireOpen, profile, onExit]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await containerRef.current?.requestFullscreen?.();
      else await document.exitFullscreen?.();
    } catch {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
  };

  return (
    <div ref={containerRef} style={{ width: '100vw', height: '100vh', background: '#0f172a', color: '#f8fafc', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <header style={{ height: '52px', background: 'rgba(15, 23, 42, 0.95)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button ref={sommaireBtnRef} type="button" className="btn btn-ghost btn-sm" aria-expanded={isSommaireOpen} onClick={() => setIsSommaireOpen(!isSommaireOpen)} title="Sommaire des pages">
            <List size={16} /> <span>Sommaire</span>
          </button>
          <span style={{ fontWeight: 600, fontSize: '14px', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{story?.title}</span>
        </div>
        <div role="group" aria-label="Profil de présentation" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--r)', padding: '2px' }}>
          <button type="button" className={`btn btn-xs ${profile === 'slide' ? 'btn-primary' : 'btn-ghost'}`} aria-pressed={profile === 'slide'} onClick={() => setProfile('slide')} title="Mode Diapositive"><Monitor size={14} /></button>
          <button type="button" className={`btn btn-xs ${profile === 'vertical' ? 'btn-primary' : 'btn-ghost'}`} aria-pressed={profile === 'vertical'} onClick={() => setProfile('vertical')} title="Défilement Vertical"><Rows size={14} /></button>
          <button type="button" className={`btn btn-xs ${profile === 'horizontal' ? 'btn-primary' : 'btn-ghost'}`} aria-pressed={profile === 'horizontal'} onClick={() => setProfile('horizontal')} title="Défilement Horizontal"><Columns size={14} /></button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={toggleFullscreen} aria-label={isFullscreen ? 'Quitter plein écran' : 'Plein écran'}>
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onExit} aria-label="Fermer la présentation"><X size={16} /></button>
        </div>
      </header>

      <main style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: profile === 'slide' ? 'center' : 'flex-start', padding: '24px' }}>
        {profile === 'slide' && (
          <div style={{ transform: 'scale(0.92)', transformOrigin: 'center center', transition: reducedMotion ? 'none' : 'transform 0.2s ease' }}>
            <PageGrid format={currentFormat} blocks={pages[currentPageIndex]?.blocks || []} onChangeBlocks={() => {}} isEditable={false} />
          </div>
        )}
        {(profile === 'vertical' || profile === 'horizontal') && (
          <div style={{ display: 'flex', flexDirection: profile === 'vertical' ? 'column' : 'row', gap: '32px', alignItems: profile === 'vertical' ? 'center' : 'flex-start' }}>
            {pages.map((p, idx) => (
              <div key={p.id} id={`reader-page-${idx}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Page {idx + 1} — {p.title}</span>
                <PageGrid format={p.layout.format || currentFormat} blocks={p.blocks || []} onChangeBlocks={() => {}} isEditable={false} />
              </div>
            ))}
          </div>
        )}
      </main>

      {profile === 'slide' && (
        <footer style={{ height: '48px', background: 'rgba(15, 23, 42, 0.95)', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" disabled={currentPageIndex <= 0} onClick={prev} aria-label="Page précédente"><ChevronLeft size={18} /></button>
          <div role="navigation" aria-label="Pagination des diapositives" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {pages.map((p, i) => (
              <button
                key={p.id || i} type="button" aria-label={`Aller à la page ${i + 1}`} aria-current={i === currentPageIndex ? 'page' : undefined} onClick={() => goToPage(i)}
                style={{ width: i === currentPageIndex ? '20px' : '10px', height: '10px', padding: 0, border: 'none', borderRadius: '5px', backgroundColor: i === currentPageIndex ? 'var(--accent)' : 'rgba(255,255,255,0.35)', cursor: 'pointer', transition: reducedMotion ? 'none' : 'all 0.2s' }}
              />
            ))}
          </div>
          <span aria-live="polite" style={{ fontSize: '12px', color: '#94a3b8' }}>{currentPageIndex + 1} / {totalPages}</span>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" disabled={currentPageIndex >= totalPages - 1} onClick={next} aria-label="Page suivante"><ChevronRight size={18} /></button>
        </footer>
      )}

      {isSommaireOpen && (
        <aside aria-label="Sommaire du document" style={{ position: 'absolute', top: '52px', left: 0, bottom: 0, width: '280px', background: '#1e293b', borderRight: '1px solid rgba(255,255,255,0.1)', zIndex: 110, padding: '16px', overflowY: 'auto' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#e2e8f0' }}>Sommaire</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {pages.map((p, idx) => (
              <button
                key={p.id} type="button" aria-current={idx === currentPageIndex ? 'page' : undefined} onClick={() => { goToPage(idx); setIsSommaireOpen(false); }}
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
