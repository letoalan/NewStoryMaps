/**
 * StoryMap — Vue principale de l'éditeur (Carte & Tableur)
 */

import React, { useState } from 'react';
import { TopBar } from './TopBar';
import { Outline } from './Outline';
import { Canvas } from './Canvas';
import { Inspector } from './Inspector';
import { SheetView } from './SheetView';
import { Player } from '../player/Player';
import { SheetViewMode } from '../../types/sheet';
import { StylePickerModal } from '../dialogs/StylePickerModal';
import { ShareModal } from '../dialogs/ShareModal';
import { SettingsModal } from '../dialogs/SettingsModal';

interface EditorProps {
  onBack: () => void;
  onPlay: () => void;
}

export const Editor: React.FC<EditorProps> = ({ onBack, onPlay }) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isStylePickerOpen, setIsStylePickerOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<SheetViewMode>('canvas');

  return (
    <div className="editor">
      <TopBar
        onBack={onBack}
        onPreview={() => setIsPreviewOpen(true)}
        onPlay={onPlay}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode(viewMode === 'canvas' ? 'sheet' : 'canvas')}
        onOpenStylePicker={() => setIsStylePickerOpen(true)}
        onOpenShare={() => setIsShareOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {viewMode === 'canvas' ? (
        <>
          <Outline />
          <Canvas />
          <Inspector />
        </>
      ) : (
        <div style={{ gridArea: 'outline / outline / inspector / inspector', height: '100%' }}>
          <SheetView />
        </div>
      )}

      {/* Boîtes de dialogue */}
      <StylePickerModal
        isOpen={isStylePickerOpen}
        onClose={() => setIsStylePickerOpen(false)}
      />
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Modal d'aperçu immersif */}
      {isPreviewOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'var(--bg)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '12px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--surface)',
            }}
          >
            <span style={{ fontWeight: 600 }}>Aperçu du récit</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setIsPreviewOpen(false)}>
              Fermer l'aperçu
            </button>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <Player onExit={() => setIsPreviewOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
};
