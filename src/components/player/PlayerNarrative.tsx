/**
 * StoryMap — Volet narratif flottant du lecteur (Player — Mode 1 + Distinction Statique / Transfert)
 */

import React from 'react';
import { Step } from '../../types/step';
import { Story } from '../../types/story';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { sanitizeHTML } from '../../core/sanitize';
import { resolveVisualStyle } from '../../core/themeResolver';
import { HeroSection } from '../document/HeroSection';

export interface PlayerTransferState {
  fromStep: Step;
  toStep: Step;
  progress: number;
}

interface PlayerNarrativeProps {
  step: Step;
  index: number;
  total: number;
  isPlaying: boolean;
  transfer?: PlayerTransferState | null;
  position?: 'left' | 'right' | 'center';
  font?: string;
  story?: Partial<Story> | null;
  onPrev: () => void;
  onNext: () => void;
  onTogglePlay: () => void;
}

export const PlayerNarrative: React.FC<PlayerNarrativeProps> = ({
  step, index, total, isPlaying, transfer, position = 'left', font = 'Inter', story, onPrev, onNext, onTogglePlay,
}) => {
  const vStyle = resolveVisualStyle(story, null, null, 'web-interactive');
  const effPos = story?.appearance?.panelPosition || position;
  const isRight = effPos === 'right', isCenter = effPos === 'center';
  const isTransfer = Boolean(transfer);

  return (
    <div
      style={{
        position: 'absolute', top: isCenter ? 'auto' : '20px',
        left: isCenter ? '50%' : isRight ? 'auto' : '20px', right: isRight ? '20px' : 'auto',
        bottom: '20px', transform: isCenter ? 'translateX(-50%)' : 'none',
        maxHeight: isCenter ? '58vh' : 'none', width: 'min(420px, calc(100vw - 40px))',
        background: vStyle.surfaceCssBackground, color: vStyle.textColor, border: vStyle.borderCss,
        borderRadius: vStyle.radiusCss, boxShadow: 'var(--shadow-lg)', display: 'flex',
        flexDirection: 'column', zIndex: 10, overflow: 'hidden', fontFamily: vStyle.bodyFont || font,
      }}
    >
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <span className="badge badge-accent" style={{ color: vStyle.accentColor }}>
          {isTransfer ? `Transfert · Étape ${index + 1} → ${index + 2}` : `Étape ${index + 1} sur ${total}`}
        </span>
        <h2 style={{ margin: '8px 0 0', fontSize: '18px', fontWeight: 700, fontFamily: vStyle.headingFont, color: vStyle.textColor }}>
          {isTransfer && transfer ? `En route vers ${transfer.toStep.title}` : step.title}
        </h2>
      </div>

      <div className="scroll" style={{ flex: 1, padding: '20px' }}>
        {isTransfer && transfer ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '12px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: vStyle.mutedTextColor }}>
              <span>Départ : <strong>{transfer.fromStep.title}</strong></span>
              <span>Arrivée : <strong>{transfer.toStep.title}</strong></span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(128,128,128,0.2)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.round(transfer.progress * 100)}%`, height: '100%', background: vStyle.accentColor, transition: 'width 0.08s linear' }} />
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: vStyle.mutedTextColor, textAlign: 'center' }}>
              Traversée de l’espace interstitiel ({Math.round(transfer.progress * 100)}%)
            </p>
          </div>
        ) : (
          <>
            {index === 0 && story?.hero?.enabled && (
              <HeroSection hero={story.hero} fallbackTitle={story.title} fallbackSubtitle={story.subtitle} fallbackLogo={story.brand?.logo} outputProfile="web-interactive" />
            )}
            {step.media?.url && (
              <div style={{ marginBottom: '16px' }}>
                <img src={step.media.url} alt={step.title} style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px' }} />
                {step.media.caption && <p style={{ margin: '6px 0 0', fontSize: '12px', color: vStyle.mutedTextColor }}>{step.media.caption}</p>}
              </div>
            )}
            <div style={{ fontSize: '14px', lineHeight: 1.6, color: vStyle.textColor }} dangerouslySetInnerHTML={{ __html: sanitizeHTML(step.description) }} />
          </>
        )}
      </div>

      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-2)' }}>
        <button className="btn btn-ghost btn-icon" onClick={onPrev} disabled={index === 0}>
          <ChevronLeft size={18} />
        </button>
        <button className="btn btn-primary btn-sm" onClick={onTogglePlay}>
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          <span>{isPlaying ? 'Pause' : 'Lecture'}</span>
        </button>
        <button className="btn btn-ghost btn-icon" onClick={onNext} disabled={index === total - 1 && !isTransfer}>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};
