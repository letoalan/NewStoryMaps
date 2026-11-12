/**
 * StoryMap — Modal des paramètres du projet : Charte partagée (N2), Hero (N3) & Véhicules (N4)
 */

import React, { useState } from 'react';
import { useStory } from '../../context/StoryContext';
import { StoryFont, RouteLineStyle, MarkerShape } from '../../types/story';
import { VehicleType } from '../../types/theme';
import { DEFAULT_THEME_TOKENS, extractProjectThemeTokens, measureColorContrast } from '../../core/themeResolver';
import { applyCharterToStory } from '../../core/graphicCharter';
import { VEHICLE_CATALOG } from '../../core/vehicleCatalog';
import { parseVideoEmbedUrl, cleanGoogleRedirectUrl } from '../../core/videoEmbed';
import { CharterImportModal } from './CharterImportModal';
import { X, Settings, Palette, Image, Navigation, RotateCcw, AlertTriangle, FileCode } from 'lucide-react';

const FONTS: StoryFont[] = ['Inter', 'Nunito', 'Lora', 'Merriweather', 'Roboto', 'Cinzel'];
const ACCENT_COLORS = ['#0b7fb0', '#2563eb', '#16a34a', '#dc2626', '#9333ea', '#d97706'];

export const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { story, updateStory } = useStory();
  const [tab, setTab] = useState<'theme' | 'hero' | 'route'>('theme');
  const [isCharterModalOpen, setIsCharterModalOpen] = useState(false);

  if (!isOpen || !story) return null;
  const app = story.appearance;
  const tok = extractProjectThemeTokens(story);
  const hero = story.hero || {
    enabled: false, mediaType: 'photo', backgroundColor: tok.primaryColor || '#0f172a', veilColor: tok.primaryColor || '#0f172a', veilOpacity: 0.45,
    veilStyle: 'gradient', fit: 'cover', focalPoint: { x: 50, y: 50 }, contentAlign: 'center', heightPreset: 'medium',
  };
  const routeAnim = story.routeAnimation || {
    enabled: false, vehicle: 'none', durationSec: 4, loop: true, orientToRoute: true, progressiveTrail: true, cameraFollow: true,
  };
  const contrastRatio = measureColorContrast(tok.textColor, tok.surfaceBackground);

  const updateTheme = (patch: Partial<typeof tok>, logoUrl?: string) => {
    const nextTok = { ...tok, ...patch }, nextAccent = nextTok.accentColor || nextTok.primaryColor;
    const nextHero = story.hero ? { ...story.hero, veilColor: (!story.hero.veilColor || story.hero.veilColor === '#0f172a' || story.hero.veilColor === tok.primaryColor) ? nextTok.primaryColor : story.hero.veilColor, backgroundColor: nextTok.primaryColor, logoUrl: logoUrl !== undefined ? logoUrl : (story.hero.logoUrl || story.brand?.logo) } : undefined;
    updateStory({
      themeTokens: nextTok, ...(nextHero ? { hero: nextHero } : {}),
      brand: { primaryColor: nextTok.primaryColor, secondaryColor: nextTok.secondaryColor, fontTitle: nextTok.headingFont, fontBody: nextTok.bodyFont, logo: logoUrl !== undefined ? logoUrl : story.brand?.logo },
      appearance: { ...app, accentColor: nextAccent, font: (nextTok.bodyFont as StoryFont) || app.font, headingFont: nextTok.headingFont, bodyFont: nextTok.bodyFont, panelBackground: nextTok.surfaceBackground, textColor: nextTok.textColor },
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => updateTheme({}, String(reader.result || ''));
    reader.readAsDataURL(f);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, backgroundColor: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', padding: '16px' }} onClick={onClose}>
      <div className="dialog-box" style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', width: '100%', maxWidth: '580px', maxHeight: '88vh', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} color="var(--accent)" />
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Charte graphique, Couverture Hero & Parcours</h2>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', padding: '0 16px', gap: '6px' }}>
          <button type="button" className={`btn btn-xs ${tab === 'theme' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('theme')} style={{ margin: '6px 0' }}><Palette size={13} /> <span>Charte & Surfaces</span></button>
          <button type="button" className={`btn btn-xs ${tab === 'hero' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('hero')} style={{ margin: '6px 0' }}><Image size={13} /> <span>Couverture Hero</span></button>
          <button type="button" className={`btn btn-xs ${tab === 'route' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('route')} style={{ margin: '6px 0' }}><Navigation size={13} /> <span>Tracé & Véhicules</span></button>
        </div>

        <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
          {tab === 'theme' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div><label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Logo (URL ou fichier)</label><input type="text" className="input" value={story.brand?.logo || ''} onChange={(e) => updateTheme({}, e.target.value)} placeholder="https://..." /></div>
                <div><label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Importer un logo</label><input type="file" accept="image/*" onChange={handleLogoUpload} style={{ fontSize: '11px' }} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div><label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Police de titrage</label><select className="select" style={{ width: '100%' }} value={tok.headingFont} onChange={(e) => updateTheme({ headingFont: e.target.value })}>{FONTS.map((f) => <option key={f} value={f}>{f}</option>)}</select></div>
                <div><label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Police de texte</label><select className="select" style={{ width: '100%' }} value={tok.bodyFont} onChange={(e) => updateTheme({ bodyFont: e.target.value })}>{FONTS.map((f) => <option key={f} value={f}>{f}</option>)}</select></div>
              </div>
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Couleur principale / accent</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {ACCENT_COLORS.map((col) => <button key={col} type="button" onClick={() => updateTheme({ primaryColor: col, accentColor: col })} style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: col, border: tok.accentColor === col ? '2px solid #0f172a' : '1px solid transparent', cursor: 'pointer' }} />)}
                  <input type="color" value={tok.accentColor} onChange={(e) => updateTheme({ primaryColor: e.target.value, accentColor: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div><label style={{ fontWeight: 600 }}>Fond de page</label><input type="color" className="input" style={{ width: '100%', height: '30px' }} value={tok.pageBackground} onChange={(e) => updateTheme({ pageBackground: e.target.value })} /></div>
                <div><label style={{ fontWeight: 600 }}>Fond des blocs</label><input type="color" className="input" style={{ width: '100%', height: '30px' }} value={tok.surfaceBackground} onChange={(e) => updateTheme({ surfaceBackground: e.target.value })} /></div>
                <div><label style={{ fontWeight: 600 }}>Couleur du texte</label><input type="color" className="input" style={{ width: '100%', height: '30px' }} value={tok.textColor} onChange={(e) => updateTheme({ textColor: e.target.value })} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div><label style={{ fontWeight: 600 }}>Opacité ({Math.round(tok.surfaceOpacity * 100)}%)</label><input type="range" min={0} max={1} step={0.05} value={tok.surfaceOpacity} onChange={(e) => updateTheme({ surfaceOpacity: Number(e.target.value) })} style={{ width: '100%' }} /></div>
                <div><label style={{ fontWeight: 600 }}>Bordure ({tok.borderWidthPx}px)</label><input type="range" min={0} max={6} step={1} value={tok.borderWidthPx} onChange={(e) => updateTheme({ borderWidthPx: Number(e.target.value) })} style={{ width: '100%' }} /></div>
                <div><label style={{ fontWeight: 600 }}>Rayon ({tok.radiusPx}px)</label><input type="range" min={0} max={24} step={2} value={tok.radiusPx} onChange={(e) => updateTheme({ radiusPx: Number(e.target.value) })} style={{ width: '100%' }} /></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ fontWeight: 600 }}>Forme des bords des blocs (Page web & Brochure) :</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button type="button" className={`btn btn-xs ${tok.radiusPx > 0 ? 'btn-primary' : 'btn-ghost'}`} style={{ border: '1px solid var(--border)' }} onClick={() => updateTheme({ radiusPx: tok.radiusPx > 0 ? tok.radiusPx : 8 })}>Bords arrondis ({tok.radiusPx > 0 ? tok.radiusPx : 8}px)</button>
                  <button type="button" className={`btn btn-xs ${tok.radiusPx === 0 ? 'btn-primary' : 'btn-ghost'}`} style={{ border: '1px solid var(--border)' }} onClick={() => updateTheme({ radiusPx: 0 })}>Bords carrés (0px)</button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '6px', background: contrastRatio < 4.5 ? '#fef3c7' : '#f0fdf4', color: contrastRatio < 4.5 ? '#92400e' : '#166534' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>{contrastRatio < 4.5 && <AlertTriangle size={14} />} Contraste : <strong>{contrastRatio}:1</strong> {contrastRatio < 4.5 ? '(Avertissement WCAG < 4.5)' : '(Conforme WCAG AA)'}</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button type="button" className="btn btn-ghost btn-xs" onClick={() => setIsCharterModalOpen(true)} title="Importer ou exporter la charte graphique JSON"><FileCode size={12} /> <span>Charte JSON</span></button>
                  <button type="button" className="btn btn-ghost btn-xs" onClick={() => updateTheme(DEFAULT_THEME_TOKENS, '')}><RotateCcw size={12} /> <span>Réinitialiser</span></button>
                </div>
              </div>
            </>
          )}

          {tab === 'hero' && (
            <>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, cursor: 'pointer' }}>
                <input type="checkbox" checked={hero.enabled} onChange={(e) => updateStory({ hero: { ...hero, enabled: e.target.checked } })} />
                <span>Activer la couverture Hero d’ouverture</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div><label style={{ fontWeight: 600 }}>Type de média</label><select className="select" style={{ width: '100%' }} value={hero.mediaType} onChange={(e) => updateStory({ hero: { ...hero, mediaType: e.target.value as any } })}><option value="photo">Photographie</option><option value="video">Vidéo (avec poster)</option><option value="none">Couleur unie</option></select></div>
                <div><label style={{ fontWeight: 600 }}>Hauteur</label><select className="select" style={{ width: '100%' }} value={hero.heightPreset || 'medium'} onChange={(e) => updateStory({ hero: { ...hero, heightPreset: e.target.value as any } })}><option value="compact">Compacte</option><option value="medium">Moyenne</option><option value="tall">Haute</option><option value="fullscreen">Plein écran</option></select></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '8px', alignItems: 'end' }}>
                <div><label style={{ fontWeight: 600 }}>URL du média (YouTube, Vimeo ou vidéo MP4)</label><input type="text" className="input" value={hero.mediaUrl || ''} onChange={(e) => { const c = cleanGoogleRedirectUrl(e.target.value); const p = parseVideoEmbedUrl(c); updateStory({ hero: { ...hero, mediaUrl: c, mediaType: p.isEmbed || /\.(mp4|webm|ogg|mov)$/i.test(c) ? 'video' : hero.mediaType } }); }} placeholder="https://youtu.be/... ou https://..." /></div>
                <div><label style={{ fontWeight: 600 }}>Ou importer un fichier</label><input type="file" accept="image/*,video/mp4,video/webm,video/ogg" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const isVid = (f.type && f.type.startsWith('video/')) || /\.(mp4|webm|ogg|mov|m4v)$/i.test(f.name); const r = new FileReader(); r.onload = () => updateStory({ hero: { ...hero, enabled: true, mediaType: isVid ? 'video' : 'photo', mediaUrl: String(r.result || '') } }); r.readAsDataURL(f); }} style={{ fontSize: '10.5px' }} /></div>
              </div>
              {hero.mediaType === 'video' && (
                <div><label style={{ fontWeight: 600 }}>Image de repli obligatoire pour l’impression (posterUrl)</label><input type="text" className="input" value={hero.posterUrl || ''} onChange={(e) => updateStory({ hero: { ...hero, posterUrl: cleanGoogleRedirectUrl(e.target.value) } })} placeholder="URL image poster pour brochure A4" /></div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px', alignItems: 'end' }}>
                <div>
                  <label style={{ fontWeight: 600 }}>Voile (Charte)</label>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <input type="color" value={hero.veilColor || tok.primaryColor} onChange={(e) => updateStory({ hero: { ...hero, veilColor: e.target.value } })} style={{ height: '28px', width: '38px', padding: 0 }} />
                    <button type="button" className="btn btn-ghost btn-xs" onClick={() => updateStory({ hero: { ...hero, veilColor: tok.primaryColor } })}>Charte</button>
                  </div>
                </div>
                <div><label style={{ fontWeight: 600 }}>Opacité ({Math.round((hero.veilOpacity ?? 0.45) * 100)}%)</label><input type="range" min={0} max={0.9} step={0.05} value={hero.veilOpacity ?? 0.45} onChange={(e) => updateStory({ hero: { ...hero, veilOpacity: Number(e.target.value) } })} style={{ width: '100%' }} /></div>
                <div><label style={{ fontWeight: 600 }}>Crédit / Source</label><input type="text" className="input" value={hero.credit || ''} onChange={(e) => updateStory({ hero: { ...hero, credit: e.target.value } })} placeholder="© Source" /></div>
              </div>
            </>
          )}

          {tab === 'route' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontWeight: 600 }}>Style du tracé</label>
                  <select className="select" style={{ width: '100%' }} value={app.routeStyle || 'dashed'} onChange={(e) => updateStory({ appearance: { ...app, routeStyle: e.target.value as RouteLineStyle } })}>
                    <option value="dashed">Pointillés</option><option value="solid">Ligne pleine</option><option value="dotted">Points fins</option><option value="curved">Arc incurvé</option><option value="arrow">Flèches</option><option value="airplane">Avion</option><option value="ship">Navire</option><option value="none">Aucun tracé</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontWeight: 600 }}>Forme des marqueurs</label>
                  <select className="select" style={{ width: '100%' }} value={app.markerShape || 'pin'} onChange={(e) => updateStory({ appearance: { ...app, markerShape: e.target.value as MarkerShape } })}>
                    <option value="pin">Épingle</option><option value="number">Numéroté</option><option value="circle">Pastille</option><option value="square">Carré</option><option value="flag">Drapeau</option><option value="star">Étoile</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div><label style={{ fontWeight: 600 }}>Véhicule animé</label><select className="select" style={{ width: '100%' }} value={routeAnim.vehicle} onChange={(e) => { const v = e.target.value as VehicleType; updateStory({ routeAnimation: { ...routeAnim, vehicle: v, enabled: v !== 'none', cameraFollow: routeAnim.cameraFollow !== false } }); }}>{VEHICLE_CATALOG.map((v) => <option key={v.id} value={v.id}>{v.emoji} {v.label}</option>)}</select></div>
                <div><label style={{ fontWeight: 600 }}>Durée ({routeAnim.durationSec || 4} s)</label><input type="range" min={1} max={15} step={0.5} value={routeAnim.durationSec || 4} onChange={(e) => updateStory({ routeAnimation: { ...routeAnim, durationSec: Number(e.target.value) } })} style={{ width: '100%' }} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div><label style={{ fontWeight: 600 }}>Rythme de vol</label><select className="select" style={{ width: '100%' }} value={routeAnim.pace || 'normal'} onChange={(e) => updateStory({ routeAnimation: { ...routeAnim, pace: e.target.value as any } })}><option value="slow">Rythme Lent (0.18w/s)</option><option value="normal">Rythme Normal (0.35w/s)</option><option value="fast">Rythme Rapide (0.58w/s)</option></select></div>
                <div><label style={{ fontWeight: 600 }}>Prise de hauteur (zoom)</label><select className="select" style={{ width: '100%' }} value={routeAnim.climbProfile || 'balanced'} onChange={(e) => updateStory({ routeAnimation: { ...routeAnim, climbProfile: e.target.value as any } })}><option value="subtle">Prise discrète (-1.2 z)</option><option value="balanced">Prise équilibrée (-2.4 z)</option><option value="ample">Prise ample (-3.8 z)</option></select></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div><label style={{ fontWeight: 600 }}>Disposition volet (Mode 1)</label><select className="select" style={{ width: '100%' }} value={app.panelPosition} onChange={(e) => updateStory({ appearance: { ...app, panelPosition: e.target.value as 'left' | 'right' | 'center' } })}><option value="left">Volet gauche</option><option value="right">Volet droite</option><option value="center">Carte basse</option></select></div>
                <div><label style={{ fontWeight: 600 }}>Intervalle lecture auto</label><select className="select" style={{ width: '100%' }} value={app.autoplayInterval || 5000} onChange={(e) => updateStory({ appearance: { ...app, autoplayInterval: Number(e.target.value) } })}><option value={3000}>3 s</option><option value={5000}>5 s</option><option value={8000}>8 s</option></select></div>
              </div>
            </>
          )}
        </div>
      </div>
      <CharterImportModal
        isOpen={isCharterModalOpen}
        onClose={() => setIsCharterModalOpen(false)}
        onApply={(doc) => updateStory(applyCharterToStory(story, doc))}
        initialCharter={(story.graphicCharter as any) || null}
      />
    </div>
  );
};
