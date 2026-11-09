/**
 * StoryMap — Assistant de création d'un nouveau projet (3 modes, charte partagée, Hero & Véhicules — N2/N3/N4)
 */

import React, { useState } from 'react';
import { X, Map, Layers, FileText, ChevronDown, ChevronUp, Image, Navigation, Palette, LayoutTemplate } from 'lucide-react';
import { ProjectBrand, ProjectMode } from '../../types/project';
import { PageFormat } from '../../types/grid';
import { SharedThemeTokens, HeroConfig, RouteAnimationConfig, VehicleType } from '../../types/theme';
import { CreateStoryOptions } from '../../types/context';
import { FONT_CATALOG, DEFAULT_THEME_TOKENS } from '../../core/themeResolver';
import { VEHICLE_CATALOG } from '../../core/vehicleCatalog';
import { cleanGoogleRedirectUrl } from '../../core/videoEmbed';
import { PAGE_STRUCTURAL_TEMPLATES } from '../../core/layoutTemplates';

const DEFAULT_HERO_PHOTO = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="450" viewBox="0 0 1200 450"><defs><linearGradient id="sky" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0f172a"/><stop offset="55%" stop-color="#0369a1"/><stop offset="100%" stop-color="#0284c7"/></linearGradient></defs><rect width="1200" height="450" fill="url(#sky)"/><circle cx="960" cy="120" r="56" fill="#fde047" fill-opacity="0.88"/><path d="M0 340 L260 190 L510 310 L790 155 L1050 285 L1200 220 L1200 450 L0 450 Z" fill="#1e293b" fill-opacity="0.65"/><path d="M0 375 L340 240 L640 355 L930 215 L1200 330 L1200 450 L0 450 Z" fill="#0f172a" fill-opacity="0.85"/></svg>');

interface NewStoryModalProps {
  isOpen: boolean;
  initialMode?: ProjectMode;
  onClose: () => void;
  onCreate: (opts: CreateStoryOptions) => void;
}

export const NewStoryModal: React.FC<NewStoryModalProps> = ({ isOpen, initialMode = 'storymap', onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<ProjectMode>(initialMode);
  const [format, setFormat] = useState<PageFormat>('a4-portrait');
  const [templateId, setTemplateId] = useState<string>('');
  const [cornerStyle, setCornerStyle] = useState<'rounded' | 'square'>('rounded');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [logo, setLogo] = useState('');
  const [headingFont, setHeadingFont] = useState('Inter');
  const [bodyFont, setBodyFont] = useState('Inter');
  const [primaryColor, setPrimaryColor] = useState('#0b7fb0');
  const [secondaryColor, setSecondaryColor] = useState('#161b25');
  const [accentColor, setAccentColor] = useState('#ffcf5c');
  const [vehicle, setVehicle] = useState<VehicleType>('none');
  const [heroEnabled, setHeroEnabled] = useState(false);
  const [heroMediaType, setHeroMediaType] = useState<'photo' | 'video'>('photo');
  const [heroMediaUrl, setHeroMediaUrl] = useState('');
  const [heroPosterUrl, setHeroPosterUrl] = useState('');

  if (!isOpen) return null;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setter(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedTitle = title.trim() || (mode === 'storymap' ? 'Nouvelle StoryMap' : mode === 'rich-document' ? 'Nouveau Document' : 'Nouvelle Brochure');
    const brand: ProjectBrand = {
      logo: logo || undefined, primaryFont: headingFont, secondaryFont: bodyFont,
      fontTitle: headingFont, fontBody: bodyFont, colors: [primaryColor, secondaryColor, accentColor], primaryColor, secondaryColor,
    };
    const themeTokens: Partial<SharedThemeTokens> = {
      ...DEFAULT_THEME_TOKENS, logo: logo || undefined, headingFont, bodyFont, fontTitle: headingFont, fontBody: bodyFont,
      primaryColor, secondaryColor, accentColor, defaultVehicle: vehicle, radiusPx: cornerStyle === 'square' ? 0 : 8,
    };
    const hero: HeroConfig | undefined = heroEnabled || mode !== 'storymap' ? {
      enabled: true, mediaType: heroMediaType, mediaUrl: cleanGoogleRedirectUrl(heroMediaUrl) || (heroMediaType === 'photo' ? DEFAULT_HERO_PHOTO : undefined), posterUrl: cleanGoogleRedirectUrl(heroPosterUrl) || DEFAULT_HERO_PHOTO,
      fit: 'cover', focalPoint: { x: 50, y: 50 }, veilStyle: 'gradient', veilColor: primaryColor, veilOpacity: 0.45,
      heightPreset: 'medium', contentAlign: 'center', title: resolvedTitle,
    } : undefined;
    const routeAnimation: RouteAnimationConfig | undefined = vehicle !== 'none' ? {
      enabled: true, vehicle, durationSec: 4, durationMs: 4000, loop: true, orientToRoute: true, progressiveTrail: true, cameraFollow: true, pace: 'normal', climbProfile: 'balanced',
    } : undefined;

    onCreate({
      title: resolvedTitle, mode, format,
      brand: showAdvanced ? brand : undefined, themeTokens: showAdvanced || cornerStyle === 'square' ? themeTokens : undefined,
      hero, routeAnimation, templateId: templateId || undefined,
    });
    onClose();
  };

  const handleModeKeyDown = (m: ProjectMode, e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setMode(m); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, backgroundColor: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', padding: '16px' }} onClick={onClose}>
      <div className="dialog-box" style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', width: '100%', maxWidth: '580px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Créer un nouveau projet</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>1. Choisissez le mode de restitution</label>
            <div role="radiogroup" aria-label="Mode de projet" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div role="radio" aria-checked={mode === 'storymap'} tabIndex={0} onKeyDown={(e) => handleModeKeyDown('storymap', e)} style={{ border: mode === 'storymap' ? '2px solid var(--accent)' : '1px solid var(--border)', borderRadius: 'var(--r)', padding: '12px 10px', cursor: 'pointer', background: mode === 'storymap' ? 'var(--accent-soft)' : 'var(--surface-2)', outline: 'none' }} onClick={() => setMode('storymap')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}><Map size={16} color="var(--accent)" /><span style={{ fontSize: '12px', fontWeight: 700 }}>StoryMap</span></div>
                <span className="badge" style={{ fontSize: '9.5px', background: '#dcfce7', color: '#15803d' }}>Disponible</span>
                <p style={{ fontSize: '11px', color: 'var(--text-2)', margin: '6px 0 0', lineHeight: 1.3 }}>Récit guidé, carte 3D, parcours animés & tableur.</p>
              </div>

              <div role="radio" aria-checked={mode === 'rich-document'} tabIndex={0} onKeyDown={(e) => handleModeKeyDown('rich-document', e)} style={{ border: mode === 'rich-document' ? '2px solid #7e22ce' : '1px solid var(--border)', borderRadius: 'var(--r)', padding: '12px 10px', cursor: 'pointer', background: mode === 'rich-document' ? 'rgba(126, 34, 206, 0.08)' : 'var(--surface-2)', outline: 'none' }} onClick={() => setMode('rich-document')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}><Layers size={16} color="#7e22ce" /><span style={{ fontSize: '12px', fontWeight: 700 }}>Document</span></div>
                <span className="badge" style={{ fontSize: '9.5px', background: '#dcfce7', color: '#15803d' }}>Disponible</span>
                <p style={{ fontSize: '11px', color: 'var(--text-2)', margin: '6px 0 0', lineHeight: 1.3 }}>Grille de blocs, couverture Hero, cartes liées & présentation.</p>
              </div>

              <div role="radio" aria-checked={mode === 'brochure'} tabIndex={0} onKeyDown={(e) => handleModeKeyDown('brochure', e)} style={{ border: mode === 'brochure' ? '2px solid #b45309' : '1px solid var(--border)', borderRadius: 'var(--r)', padding: '12px 10px', cursor: 'pointer', background: mode === 'brochure' ? 'rgba(180, 83, 9, 0.08)' : 'var(--surface-2)', outline: 'none' }} onClick={() => setMode('brochure')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}><FileText size={16} color="#b45309" /><span style={{ fontSize: '12px', fontWeight: 700 }}>Brochure A4</span></div>
                <span className="badge" style={{ fontSize: '9.5px', background: '#dcfce7', color: '#15803d' }}>Disponible</span>
                <p style={{ fontSize: '11px', color: 'var(--text-2)', margin: '6px 0 0', lineHeight: 1.3 }}>Mise en page A4 fixe, cartes statiques numérotées & PDF.</p>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: mode === 'storymap' ? '1fr' : '1.6fr 1fr 1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>2. Titre du projet</label>
              <input type="text" className="input" style={{ width: '100%' }} placeholder={mode === 'storymap' ? 'Ex: Le tour du monde en cinq capitales' : 'Ex: Atlas territorial 2026'} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            </div>
            {mode !== 'storymap' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Format</label>
                  <select className="input" style={{ width: '100%' }} value={format} onChange={(e) => setFormat(e.target.value as PageFormat)}><option value="a4-portrait">A4 Portrait</option><option value="a4-landscape">A4 Paysage</option><option value="screen-16-9">Écran 16/9</option><option value="responsive">Responsive</option></select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}><LayoutTemplate size={12} /> Structure</label>
                  <select className="input" style={{ width: '100%' }} value={templateId} onChange={(e) => setTemplateId(e.target.value)}><option value="">Grille libre</option>{PAGE_STRUCTURAL_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Bords</label>
                  <select className="input" style={{ width: '100%' }} value={cornerStyle} onChange={(e) => setCornerStyle(e.target.value as 'rounded' | 'square')}><option value="rounded">Bords arrondis</option><option value="square">Bords carrés</option></select>
                </div>
              </>
            )}
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
            <button type="button" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 0 }} onClick={() => setShowAdvanced(!showAdvanced)}>
              <span style={{ fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}><Palette size={14} color="var(--accent)" /> 3. Charte graphique, Couverture Hero & Parcours animé (facultatif)</span>
              {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showAdvanced && (
              <div style={{ padding: '14px', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div><label style={{ fontWeight: 500, display: 'block', marginBottom: '4px' }}>Logo (URL ou fichier local)</label><input type="text" className="input" placeholder="https://example.com/logo.png" value={logo} onChange={(e) => setLogo(e.target.value)} style={{ width: '100%' }} /></div>
                  <div><label style={{ fontWeight: 500, display: 'block', marginBottom: '4px' }}>Importer un logo</label><input type="file" accept="image/*" onChange={(e) => handleFile(e, setLogo)} style={{ fontSize: '11px', marginTop: '4px' }} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div><label style={{ fontWeight: 500, display: 'block', marginBottom: '4px' }}>Police de titrage</label><select className="input" value={headingFont} onChange={(e) => setHeadingFont(e.target.value)} style={{ width: '100%' }}>{FONT_CATALOG.map((f) => <option key={f.family} value={f.family}>{f.label} ({f.category})</option>)}</select></div>
                  <div><label style={{ fontWeight: 500, display: 'block', marginBottom: '4px' }}>Police de corps</label><select className="input" value={bodyFont} onChange={(e) => setBodyFont(e.target.value)} style={{ width: '100%' }}>{FONT_CATALOG.map((f) => <option key={f.family} value={f.family}>{f.label} ({f.category})</option>)}</select></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'center' }}>
                  <div>
                    <label style={{ fontWeight: 500, display: 'block', marginBottom: '4px' }}>3 Couleurs (Primaire, Secondaire, Accent)</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} title="Couleur primaire" /><input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} title="Couleur secondaire" /><input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} title="Couleur d’accentuation" /><span style={{ fontSize: '10.5px', color: 'var(--text-3)' }}>{primaryColor} · {accentColor}</span>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontWeight: 500, display: 'block', marginBottom: '4px' }}><Navigation size={12} /> Véhicule de parcours</label>
                    <select className="input" value={vehicle} onChange={(e) => setVehicle(e.target.value as VehicleType)} style={{ width: '100%' }}>{VEHICLE_CATALOG.map((v) => <option key={v.id} value={v.id}>{v.emoji} {v.label}</option>)}</select>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, cursor: 'pointer', marginBottom: heroEnabled ? '8px' : 0 }}>
                    <input type="checkbox" checked={heroEnabled} onChange={(e) => setHeroEnabled(e.target.checked)} /><Image size={14} color="var(--accent)" /><span>Activer une couverture Hero d’ouverture (Photo ou Vidéo)</span>
                  </label>
                  {heroEnabled && (
                    <div style={{ display: 'grid', gridTemplateColumns: mode === 'brochure' ? '1fr 1fr' : '110px 1fr auto', gap: '8px', alignItems: 'center' }}>
                      {mode !== 'brochure' && <select className="input" value={heroMediaType} onChange={(e) => setHeroMediaType(e.target.value as 'photo' | 'video')}><option value="photo">Photographie</option><option value="video">Vidéo Web</option></select>}
                      <input type="text" className="input" placeholder={heroMediaType === 'video' ? 'URL vidéo MP4/WebM...' : 'URL image de couverture...'} value={heroMediaUrl} onChange={(e) => setHeroMediaUrl(e.target.value)} />
                      <input type="file" accept={heroMediaType === 'video' ? 'video/mp4,video/webm,video/ogg' : 'image/*'} onChange={(e) => handleFile(e, setHeroMediaUrl)} style={{ fontSize: '10.5px', maxWidth: '150px' }} />
                      {heroMediaType === 'video' && <input type="text" className="input" style={{ gridColumn: '1 / -1' }} placeholder="URL image poster obligatoire pour l’impression A4..." value={heroPosterUrl} onChange={(e) => setHeroPosterUrl(e.target.value)} />}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary">Créer le projet</button>
          </div>
        </form>
      </div>
    </div>
  );
};