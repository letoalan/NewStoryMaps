/**
 * StoryMap — Inspecteur détaillé de bloc : contenu, remplacement de type et exceptions de style (N1.09 / N2.05 / N2.12)
 */

import React, { useState } from 'react';
import { Block, BlockType, ProjectMode } from '../../types/project';
import { BlockVisualOverride, BlockStyleMode } from '../../types/theme';
import { getAvailableCatalogItems } from '../../core/blockCatalog';
import { X, Sliders, RotateCcw, Check, Link2 } from 'lucide-react';

export interface BlockInspectorModalProps {
  isOpen: boolean;
  block: Block | null;
  mode: ProjectMode;
  initialTab?: 'content' | 'replace' | 'style';
  onUpdateData: (id: string, patch: Record<string, unknown>) => void;
  onChangeType: (id: string, newType: BlockType) => void;
  onUpdateStyle: (id: string, override?: BlockVisualOverride) => void;
  onResetBlock?: (id: string) => void;
  onOpenBinding?: () => void;
  onClose: () => void;
}

const BlockInspectorContent: React.FC<Omit<BlockInspectorModalProps, 'isOpen' | 'block'> & { block: Block }> = ({
  block, mode, initialTab, onUpdateData, onChangeType, onUpdateStyle, onResetBlock, onOpenBinding, onClose,
}) => {
  const [tab, setTab] = useState<'content' | 'style'>(initialTab === 'style' ? 'style' : 'content');
  const catalog = getAvailableCatalogItems(mode);
  const ov: BlockVisualOverride = block.styleOverride || { styleMode: 'inherit' };
  const styleMode: BlockStyleMode = ov.styleMode || 'inherit';

  const patchStyle = (partial: Partial<BlockVisualOverride>) => {
    onUpdateStyle(block.id, { ...ov, styleMode: partial.styleMode || (styleMode === 'inherit' ? 'custom' : styleMode), ...partial });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(15, 23, 42, 0.5)', display: 'grid', placeItems: 'center', padding: '16px' }} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`Inspecteur du bloc ${block.id}`} style={{ background: 'var(--surface, #fff)', color: 'var(--text, #0f172a)', borderRadius: '14px', width: '100%', maxWidth: '520px', border: '1px solid var(--border, #cbd5e1)', boxShadow: '0 24px 48px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '88vh' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={16} color="var(--accent)" />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Propriétés du bloc ({block.w}×{block.h})</h3>
          </div>
          <button type="button" className="btn btn-ghost btn-icon" aria-label="Fermer l’inspecteur" onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', padding: '0 18px', gap: '12px' }}>
          <button type="button" className="btn btn-ghost btn-sm" style={{ borderBottom: tab === 'content' ? '2px solid var(--accent)' : 'none', borderRadius: 0, fontWeight: 600 }} onClick={() => setTab('content')}>1. Contenu & Type</button>
          <button type="button" className="btn btn-ghost btn-sm" style={{ borderBottom: tab === 'style' ? '2px solid var(--accent)' : 'none', borderRadius: 0, fontWeight: 600 }} onClick={() => setTab('style')}>2. Apparence & Bordures</button>
        </div>

        <div style={{ padding: '16px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tab === 'content' ? (
            <>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Type de bloc (conserve les données compatibles)</label>
                <select className="input" style={{ width: '100%' }} value={block.type} onChange={(e) => onChangeType(block.id, e.target.value as BlockType)}>
                  {catalog.map((item) => <option key={item.type} value={item.type}>{item.label} — {item.description}</option>)}
                </select>
              </div>

              {['title', 'text', 'callout', 'legend', 'source'].includes(block.type) && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Texte / Contenu éditorial</label>
                  <textarea className="input" rows={4} style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit' }} value={String(block.data.text || '')} onChange={(e) => onUpdateData(block.id, { text: e.target.value })} />
                </div>
              )}

              {(block.type === 'image' || block.type === 'gallery') && (
                <>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>URL de l’image principale</label>
                    <input type="text" className="input" style={{ width: '100%' }} value={String(block.data.url || '')} onChange={(e) => onUpdateData(block.id, { url: e.target.value })} placeholder="https://..." />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Légende / Crédit</label>
                      <input type="text" className="input" style={{ width: '100%' }} value={String(block.data.caption || '')} onChange={(e) => onUpdateData(block.id, { caption: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Texte alternatif (Alt)</label>
                      <input type="text" className="input" style={{ width: '100%' }} value={String(block.data.alt || '')} onChange={(e) => onUpdateData(block.id, { alt: e.target.value })} />
                    </div>
                  </div>
                </>
              )}

              {block.type === 'map' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Titre de la carte</label>
                    <input type="text" className="input" style={{ width: '100%' }} value={String(block.data.title || '')} onChange={(e) => onUpdateData(block.id, { title: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Crédits / Attributions</label>
                    <input type="text" className="input" style={{ width: '100%' }} value={String(block.data.caption || '')} onChange={(e) => onUpdateData(block.id, { caption: e.target.value })} />
                  </div>
                </div>
              )}

              {onOpenBinding && (
                <div style={{ paddingTop: '6px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>Association narrative avec une carte</span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={onOpenBinding}><Link2 size={14} /> Configurer la liaison</button>
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', fontWeight: 700 }}>Mode de style du conteneur</label>
                {block.styleOverride && (
                  <button type="button" className="btn btn-ghost btn-xs" onClick={() => onUpdateStyle(block.id, undefined)} title="Effacer les exceptions locales">
                    <RotateCcw size={12} /> Revenir au style du projet
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {(['inherit', 'custom', 'frameless'] as BlockStyleMode[]).map((m) => (
                  <button key={m} type="button" className={`btn btn-sm ${styleMode === m ? 'btn-primary' : 'btn-ghost'}`} style={{ border: '1px solid var(--border)' }} onClick={() => patchStyle({ styleMode: m })}>
                    {m === 'inherit' ? 'Hériter' : m === 'custom' ? 'Personnaliser' : 'Sans fond ni bord'}
                  </button>
                ))}
              </div>

              {styleMode !== 'frameless' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Couleur de fond</label>
                      <input type="color" value={ov.backgroundColor || '#ffffff'} onChange={(e) => patchStyle({ backgroundColor: e.target.value })} style={{ width: '100%', height: '30px' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Couleur texte</label>
                      <input type="color" value={ov.textColor || '#0f172a'} onChange={(e) => patchStyle({ textColor: e.target.value })} style={{ width: '100%', height: '30px' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Opacité ({Math.round((ov.backgroundOpacity ?? 1) * 100)}%)</label>
                      <input type="range" min={0} max={1} step={0.05} value={ov.backgroundOpacity ?? 1} onChange={(e) => patchStyle({ backgroundOpacity: parseFloat(e.target.value) })} style={{ width: '100%' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600 }}>Forme des bords du bloc</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button type="button" className={`btn btn-xs ${(ov.radiusPx ?? 6) > 0 ? 'btn-primary' : 'btn-ghost'}`} style={{ border: '1px solid var(--border)' }} onClick={() => patchStyle({ radiusPx: (ov.radiusPx ?? 6) > 0 ? (ov.radiusPx ?? 6) : 8 })}>Bords arrondis</button>
                      <button type="button" className={`btn btn-xs ${ov.radiusPx === 0 ? 'btn-primary' : 'btn-ghost'}`} style={{ border: '1px solid var(--border)' }} onClick={() => patchStyle({ radiusPx: 0 })}>Bords carrés (0px)</button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Bordure</label>
                      <select className="input" style={{ width: '100%' }} value={ov.borderStyle || 'solid'} onChange={(e) => patchStyle({ borderStyle: e.target.value as any })}><option value="none">Aucune</option><option value="solid">Pleine</option><option value="dashed">Pointillée</option></select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Rayon (px)</label>
                      <input type="number" className="input" min={0} max={32} value={ov.radiusPx ?? 6} onChange={(e) => patchStyle({ radiusPx: Math.max(0, Math.min(32, Number(e.target.value) || 0)) })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Marge int.</label>
                      <input type="number" className="input" min={0} max={36} value={ov.paddingPx ?? 8} onChange={(e) => patchStyle({ paddingPx: Math.max(0, Math.min(36, Number(e.target.value) || 0)) })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Ombre</label>
                      <select className="input" style={{ width: '100%' }} value={ov.shadowPreset || 'sm'} onChange={(e) => patchStyle({ shadowPreset: e.target.value as any })}><option value="none">Aucune</option><option value="sm">Légère</option><option value="md">Moyenne</option><option value="lg">Forte</option></select>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {onResetBlock ? (
            <button type="button" className="btn btn-ghost btn-xs text-danger" onClick={() => { onResetBlock(block.id); onClose(); }} title="Remise à zéro de la case (taille 1x1, style par défaut et contenu vierge)">
              <RotateCcw size={12} /> <span>Remise à zéro de la case</span>
            </button>
          ) : <div />}
          <button type="button" className="btn btn-primary btn-sm" onClick={onClose}><Check size={14} /> Terminé</button>
        </div>
      </div>
    </div>
  );
};

export const BlockInspectorModal: React.FC<BlockInspectorModalProps> = (props) => {
  if (!props.isOpen || !props.block) return null;
  return <BlockInspectorContent {...props} block={props.block} />;
};
