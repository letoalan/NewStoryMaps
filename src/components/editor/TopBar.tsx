/**
 * StoryMap — Barre supérieure de l'éditeur
 */

import React from 'react';
import { useStory } from '../../context/StoryContext';
import {
  ArrowLeft,
  Check,
  Eye,
  Play,
  RotateCcw,
  RotateCw,
  Map as MapIcon,
  Table,
  Layers,
  Share2,
  Settings,
} from 'lucide-react';
import { SheetViewMode } from '../../types/sheet';

interface TopBarProps {
  onBack: () => void;
  onPreview: () => void;
  onPlay: () => void;
  viewMode: SheetViewMode;
  onToggleViewMode: () => void;
  onOpenStylePicker: () => void;
  onOpenShare: () => void;
  onOpenSettings: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onBack,
  onPreview,
  onPlay,
  viewMode,
  onToggleViewMode,
  onOpenStylePicker,
  onOpenShare,
  onOpenSettings,
}) => {
  const { story, updateStoryTitle, isSaving, undo, redo, canUndo, canRedo } = useStory();

  if (!story) return null;

  return (
    <header className="topbar">
      <div className="tb-left">
        <button className="btn btn-ghost btn-icon" onClick={onBack} title="Retour au tableau de bord">
          <ArrowLeft size={18} />
        </button>
        <div className="tb-titlebox">
          <input
            type="text"
            className="tb-title"
            value={story.title}
            onChange={(e) => updateStoryTitle(e.target.value)}
            placeholder="Titre de la storymap"
          />
        </div>
        <div className={`save-status ${isSaving ? '' : 'saved'}`}>
          {isSaving ? (
            <>
              <span className="dot" />
              <span>Enregistrement…</span>
            </>
          ) : (
            <>
              <Check size={14} className="icon" />
              <span>Enregistré</span>
            </>
          )}
        </div>
      </div>

      <div className="tb-center" style={{ display: 'flex', gap: '4px' }}>
        <button
          className="btn btn-ghost btn-icon"
          onClick={undo}
          disabled={!canUndo}
          title="Annuler (Ctrl+Z)"
        >
          <RotateCcw size={16} />
        </button>
        <button
          className="btn btn-ghost btn-icon"
          onClick={redo}
          disabled={!canRedo}
          title="Rétablir (Ctrl+Y)"
        >
          <RotateCw size={16} />
        </button>
      </div>

      <div className="tb-right" style={{ display: 'flex', gap: '6px' }}>
        <button
          className={`btn ${viewMode === 'sheet' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={onToggleViewMode}
          title={viewMode === 'canvas' ? 'Basculer en vue Tableur' : 'Basculer en vue Carte'}
        >
          {viewMode === 'canvas' ? <Table size={16} /> : <MapIcon size={16} />}
          <span>{viewMode === 'canvas' ? 'Tableur' : 'Carte'}</span>
        </button>

        <button className="btn btn-ghost" onClick={onOpenStylePicker} title="Changer le style de carte">
          <Layers size={16} />
          <span>Fonds de carte</span>
        </button>

        <button className="btn btn-ghost" onClick={onOpenShare} title="Partager et exporter">
          <Share2 size={16} />
          <span>Partager</span>
        </button>

        <button className="btn btn-ghost btn-icon" onClick={onOpenSettings} title="Paramètres du récit">
          <Settings size={16} />
        </button>

        <button className="btn btn-ghost" onClick={onPreview} title="Aperçu dans l’éditeur">
          <Eye size={16} />
          <span>Aperçu</span>
        </button>

        <button className="btn btn-primary" onClick={onPlay} title="Lancer le lecteur plein écran">
          <Play size={16} />
          <span>Lire</span>
        </button>
      </div>
    </header>
  );
};
