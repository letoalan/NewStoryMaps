/**
 * StoryMap — Assistant de création d'un nouveau projet (3 modes & charte)
 */

import React, { useState } from 'react';
import { X, Map, Layers, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { ProjectBrand, ProjectMode } from '../../types/project';

interface NewStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (opts: { title: string; mode: ProjectMode; brand?: ProjectBrand }) => void;
}

export const NewStoryModal: React.FC<NewStoryModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<ProjectMode>('storymap');
  const [showBrand, setShowBrand] = useState(false);
  const [primaryFont, setPrimaryFont] = useState('Inter');
  const [secondaryFont, setSecondaryFont] = useState('Inter');
  const [primaryColor, setPrimaryColor] = useState('#0b7fb0');
  const [secondaryColor, setSecondaryColor] = useState('#161b25');
  const [accentColor, setAccentColor] = useState('#ffcf5c');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const brand: ProjectBrand = {
      primaryFont, secondaryFont,
      colors: [primaryColor, secondaryColor, accentColor],
    };
    onCreate({
      title: title.trim() || (mode === 'storymap' ? 'Nouvelle StoryMap' : mode === 'rich-document' ? 'Nouveau Document' : 'Nouvelle Brochure'),
      mode, brand: showBrand ? brand : undefined,
    });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, backgroundColor: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', padding: '16px' }} onClick={onClose}>
      <div className="dialog-box" style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', width: '100%', maxWidth: '560px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Créer un nouveau projet</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>1. Choisissez le mode de restitution</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div style={{ border: mode === 'storymap' ? '2px solid var(--accent)' : '1px solid var(--border)', borderRadius: 'var(--r)', padding: '12px 10px', cursor: 'pointer', background: mode === 'storymap' ? 'var(--accent-soft)' : 'var(--surface-2)' }} onClick={() => setMode('storymap')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <Map size={16} color="var(--accent)" /><span style={{ fontSize: '12px', fontWeight: 700 }}>StoryMap</span>
                </div>
                <span className="badge" style={{ fontSize: '9.5px', background: '#dcfce7', color: '#15803d' }}>Disponible</span>
                <p style={{ fontSize: '11px', color: 'var(--text-2)', margin: '6px 0 0', lineHeight: 1.3 }}>Récit guidé, carte dynamique 3D, tableur.</p>
              </div>

              <div style={{ border: mode === 'rich-document' ? '2px solid #7e22ce' : '1px solid var(--border)', borderRadius: 'var(--r)', padding: '12px 10px', cursor: 'pointer', background: mode === 'rich-document' ? 'rgba(126, 34, 206, 0.08)' : 'var(--surface-2)' }} onClick={() => setMode('rich-document')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <Layers size={16} color="#7e22ce" /><span style={{ fontSize: '12px', fontWeight: 700 }}>Document</span>
                </div>
                <span className="badge" style={{ fontSize: '9.5px', background: '#f3e8ff', color: '#7e22ce' }}>Phase P2/P3</span>
                <p style={{ fontSize: '11px', color: 'var(--text-2)', margin: '6px 0 0', lineHeight: 1.3 }}>Grille de blocs, cartes liées, présentation.</p>
              </div>

              <div style={{ border: mode === 'brochure' ? '2px solid #b45309' : '1px solid var(--border)', borderRadius: 'var(--r)', padding: '12px 10px', cursor: 'pointer', background: mode === 'brochure' ? 'rgba(180, 83, 9, 0.08)' : 'var(--surface-2)' }} onClick={() => setMode('brochure')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <FileText size={16} color="#b45309" /><span style={{ fontSize: '12px', fontWeight: 700 }}>Brochure A4</span>
                </div>
                <span className="badge" style={{ fontSize: '9.5px', background: '#fef3c7', color: '#b45309' }}>Phase P5</span>
                <p style={{ fontSize: '11px', color: 'var(--text-2)', margin: '6px 0 0', lineHeight: 1.3 }}>Mise en page fixe, cartes statiques, PDF.</p>
              </div>
            </div>
            {mode !== 'storymap' && (
              <p style={{ fontSize: '11.5px', color: 'var(--text-2)', marginTop: '8px', padding: '6px 10px', background: 'var(--surface-3)', borderRadius: '6px' }}>
                ℹ️ Ce mode est en cours d’implémentation. Le projet est initialisé avec la charte choisie.
              </p>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>2. Titre du projet</label>
            <input type="text" className="input" style={{ width: '100%' }} placeholder={mode === 'storymap' ? 'Ex: Le tour du monde en cinq capitales' : 'Ex: Atlas territorial 2026'} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
            <button type="button" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 0 }} onClick={() => setShowBrand(!showBrand)}>
              <span style={{ fontSize: '12.5px', fontWeight: 600 }}>3. Charte graphique facultative</span>
              {showBrand ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showBrand && (
              <div style={{ padding: '14px', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Police principale</label>
                    <select className="input" value={primaryFont} onChange={(e) => setPrimaryFont(e.target.value)} style={{ width: '100%' }}>
                      <option value="Inter">Inter (Sans-serif)</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Lora">Lora (Serif)</option>
                      <option value="Merriweather">Merriweather</option>
                      <option value="Cinzel">Cinzel (Titrage)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Police secondaire</label>
                    <select className="input" value={secondaryFont} onChange={(e) => setSecondaryFont(e.target.value)} style={{ width: '100%' }}>
                      <option value="Inter">Inter</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Lora">Lora</option>
                      <option value="Merriweather">Merriweather</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>3 Couleurs de charte (Primaire, Secondaire, Accent)</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} title="Couleur primaire" />
                    <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} title="Couleur secondaire" />
                    <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} title="Couleur d’accentuation" />
                    <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{primaryColor} · {secondaryColor} · {accentColor}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary">Créer le projet</button>
          </div>
        </form>
      </div>
    </div>
  );
};
