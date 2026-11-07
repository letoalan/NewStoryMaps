/**
 * StoryMap — Modal des paramètres : apparence, tracé multi-styles & marqueurs
 */

import React from 'react';
import { useStory } from '../../context/StoryContext';
import { StoryFont, RouteLineStyle, MarkerShape } from '../../types/story';
import { X, Settings, Palette, Type, Clock, Layout, Navigation, MapPin } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FONTS: StoryFont[] = ['Inter', 'Lora', 'Merriweather', 'Roboto', 'Cinzel'];
const ACCENT_COLORS = ['#0b7fb0', '#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c'];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { story, updateStory } = useStory();

  if (!isOpen || !story) return null;
  const app = story.appearance;

  const updateApp = (partial: Partial<typeof app>) => {
    updateStory({ appearance: { ...app, ...partial } });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'grid',
        placeItems: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="dialog-box"
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--r-lg)',
          width: '100%',
          maxWidth: '540px',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} color="var(--accent)" />
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Paramètres du récit</h2>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Couleur d'accentuation */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              <Palette size={14} /> Couleur d'accentuation & tracé
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {ACCENT_COLORS.map((col) => (
                <div
                  key={col}
                  onClick={() => updateApp({ accentColor: col })}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: col,
                    cursor: 'pointer',
                    boxShadow: app.accentColor === col ? '0 0 0 3px var(--surface), 0 0 0 5px ' + col : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Style du tracé & Forme des marqueurs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                <Navigation size={14} /> Style du tracé
              </label>
              <select
                className="select"
                style={{ width: '100%' }}
                value={app.routeStyle || 'dashed'}
                onChange={(e) => updateApp({ routeStyle: e.target.value as RouteLineStyle })}
              >
                <option value="dashed">Pointillés standards</option>
                <option value="solid">Ligne pleine</option>
                <option value="dotted">Petits points fins</option>
                <option value="curved">Ligne incurvée (arc)</option>
                <option value="arrow">Flèches directrices</option>
                <option value="double-arrow">Doubles flèches</option>
                <option value="airplane">Avion (Indiana Jones)</option>
                <option value="ship">Navire (Croisière)</option>
                <option value="none">Aucun tracé</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                <MapPin size={14} /> Forme des marqueurs
              </label>
              <select
                className="select"
                style={{ width: '100%' }}
                value={app.markerShape || 'pin'}
                onChange={(e) => updateApp({ markerShape: e.target.value as MarkerShape })}
              >
                <option value="pin">Épingle classique</option>
                <option value="number">Numéroté (1, 2, 3...)</option>
                <option value="circle">Pastille circulaire</option>
                <option value="square">Diamant / Carré</option>
                <option value="airplane">Avion ✈️</option>
                <option value="ship">Navire 🚢</option>
                <option value="flag">Drapeau 🚩</option>
                <option value="star">Étoile ⭐</option>
              </select>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={app.showAllMarkers ?? true}
              onChange={(e) => updateApp({ showAllMarkers: e.target.checked })}
            />
            <span>Afficher tous les marqueurs des étapes sur la carte</span>
          </label>

          {/* Police narrative */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              <Type size={14} /> Police narrative
            </label>
            <select
              className="select"
              style={{ width: '100%' }}
              value={app.font}
              onChange={(e) => updateApp({ font: e.target.value as StoryFont })}
            >
              {FONTS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Volet et Défilement */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                <Layout size={14} /> Volet narratif
              </label>
              <select className="select" style={{ width: '100%' }} value={app.panelPosition} onChange={(e) => updateApp({ panelPosition: e.target.value as 'left' | 'right' })}>
                <option value="left">À gauche</option>
                <option value="right">À droite</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                <Clock size={14} /> Défilement auto
              </label>
              <select className="select" style={{ width: '100%' }} value={app.autoplayInterval || 5000} onChange={(e) => updateApp({ autoplayInterval: Number(e.target.value) })}>
                <option value={3000}>3 s</option>
                <option value={5000}>5 s</option>
                <option value={8000}>8 s</option>
                <option value={12000}>12 s</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
