/**
 * StoryMap — Volet narratif flottant du lecteur (Player)
 */

import React from 'react';
import { Step } from '../../types/step';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { sanitizeHTML } from '../../core/sanitize';

interface PlayerNarrativeProps {
  step: Step;
  index: number;
  total: number;
  isPlaying: boolean;
  position?: 'left' | 'right' | 'center';
  font?: string;
  onPrev: () => void;
  onNext: () => void;
  onTogglePlay: () => void;
}

export const PlayerNarrative: React.FC<PlayerNarrativeProps> = ({
  step,
  index,
  total,
  isPlaying,
  position = 'left',
  font = 'Inter',
  onPrev,
  onNext,
  onTogglePlay,
}) => {
  const isRight = position === 'right';

  return (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        left: isRight ? 'auto' : '20px',
        right: isRight ? '20px' : 'auto',
        bottom: '20px',
        width: 'min(420px, calc(100vw - 40px))',
        background: 'var(--surface)',
        borderRadius: '16px',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10,
        overflow: 'hidden',
        fontFamily: font,
      }}
    >
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <span className="badge badge-accent">
          Étape {index + 1} sur {total}
        </span>
        <h2 style={{ margin: '8px 0 0', fontSize: '18px', fontWeight: 700 }}>{step.title}</h2>
      </div>

      <div className="scroll" style={{ flex: 1, padding: '20px' }}>
        {step.media?.url && (
          <div style={{ marginBottom: '16px' }}>
            <img
              src={step.media.url}
              alt={step.title}
              style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px' }}
            />
            {step.media.caption && (
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-3)' }}>
                {step.media.caption}
              </p>
            )}
          </div>
        )}
        <div
          style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-2)' }}
          dangerouslySetInnerHTML={{ __html: sanitizeHTML(step.description) }}
        />
      </div>

      <div
        style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--surface-2)',
        }}
      >
        <button className="btn btn-ghost btn-icon" onClick={onPrev} disabled={index === 0}>
          <ChevronLeft size={18} />
        </button>
        <button className="btn btn-primary btn-sm" onClick={onTogglePlay}>
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          <span>{isPlaying ? 'Pause' : 'Lecture'}</span>
        </button>
        <button className="btn btn-ghost btn-icon" onClick={onNext} disabled={index === total - 1}>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};
