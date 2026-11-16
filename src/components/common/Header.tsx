/**
 * StoryMap — En-tête globale de l'application
 */

import React from 'react';
import { Compass, Moon, Sun, Plus } from 'lucide-react';

interface HeaderProps {
  onNewStory?: () => void;
  onGoHome?: () => void;
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ onNewStory, onGoHome, title }) => {
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light');

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <header className="app-header">
      <button
        className="brand"
        onClick={onGoHome || (() => { window.location.href = './landing.html'; })}
        style={{ background: 'none', border: 0, cursor: 'pointer' }}
      >
        <div style={{ background: 'var(--accent)', borderRadius: '8px', padding: '6px', display: 'grid', placeItems: 'center', color: '#fff' }}>
          <Compass size={20} />
        </div>
        <div className="brand-text">
          <span className="brand-name">StoryMap</span>
          <span className="brand-tag">Studio cartographique & éditorial</span>
        </div>
      </button>

      {title && (
        <span style={{ marginLeft: '12px', fontWeight: 600, color: 'var(--text-2)' }}>
          / {title}
        </span>
      )}

      <div className="spacer" />

      <a
        href="./landing.html"
        className="btn btn-ghost btn-sm"
        title="Retourner à la page de présentation et aux vidéos des 3 modes"
        style={{ fontSize: '13px', color: 'var(--text-2)' }}
      >
        Présentation
      </a>

      {onNewStory && (
        <button className="btn btn-primary" onClick={onNewStory}>
          <Plus size={16} />
          <span>Créer un nouveau récit</span>
        </button>
      )}

      <button
        className="btn btn-ghost btn-icon"
        onClick={toggleTheme}
        aria-label="Basculer le thème"
        title="Basculer le thème"
      >
        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
      </button>
    </header>
  );
};

