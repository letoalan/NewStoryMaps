/**
 * StoryMap — Sélecteur d'association narrative entre un bloc et un élément de carte (H05 / H07 / H08)
 */

import React, { useState } from 'react';
import { Block, NarrativeBinding, ProjectMap } from '../../types/project';
import { X, Link2, Unlink, Check } from 'lucide-react';

interface ContentProps {
  block: Block;
  maps: ProjectMap[];
  onClose: () => void;
  onSaveBinding: (blockId: string, binding?: NarrativeBinding) => void;
}

const BindingPickerContent: React.FC<ContentProps> = ({ block, maps, onClose, onSaveBinding }) => {
  const currentBinding = block.binding;
  const initialMapId = currentBinding?.mapId || maps[0]?.id || '';
  const [selectedMapId, setSelectedMapId] = useState<string>(initialMapId);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string>(currentBinding?.targetFeatureId || '');
  const [action, setAction] = useState<'highlight' | 'zoom' | 'filter'>(currentBinding?.action || 'highlight');
  const [numberIndex, setNumberIndex] = useState<number>(currentBinding?.numberIndex || 1);

  const selectedMap = maps.find((m) => m.id === selectedMapId) || maps[0];
  const allFeatures = (selectedMap?.layers || []).flatMap((l) => l.features || []);

  const handleSave = () => {
    if (!selectedMapId) return;
    const binding: NarrativeBinding = {
      mapId: selectedMapId,
      targetFeatureId: selectedFeatureId || undefined,
      action,
      numberIndex: numberIndex > 0 ? numberIndex : undefined,
    };
    onSaveBinding(block.id, binding);
    onClose();
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1200, backgroundColor: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', padding: '16px' }}
      onClick={onClose}
    >
      <div
        className="dialog-box"
        style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', width: '100%', maxWidth: '480px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link2 size={16} color="var(--accent)" />
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Lier le bloc à la carte</h3>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Carte cible</label>
            <select className="select" style={{ width: '100%' }} value={selectedMapId} onChange={(e) => { setSelectedMapId(e.target.value); setSelectedFeatureId(''); }}>
              {maps.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Élément cartographique associé</label>
            <select className="select" style={{ width: '100%' }} value={selectedFeatureId} onChange={(e) => setSelectedFeatureId(e.target.value)}>
              <option value="">(Toute la vue de la carte)</option>
              {allFeatures.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} {f.numberIndex ? `[Renvoi #${f.numberIndex}]` : `(${f.geometryType})`}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Action interactive (Mode 2)</label>
              <select className="select" style={{ width: '100%' }} value={action} onChange={(e) => setAction(e.target.value as any)}>
                <option value="highlight">Surbrillance</option>
                <option value="zoom">Zoom & cadrage</option>
                <option value="filter">Filtrer couches</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>N° Renvoi brochure (Mode 3)</label>
              <input
                type="number"
                className="input"
                min={1}
                value={numberIndex}
                onChange={(e) => setNumberIndex(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>
        </div>

        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {currentBinding ? (
            <button className="btn btn-ghost btn-danger" onClick={() => { onSaveBinding(block.id, undefined); onClose(); }} style={{ fontSize: '12px' }}>
              <Unlink size={14} /> Supprimer la liaison
            </button>
          ) : <div />}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost" onClick={onClose} style={{ fontSize: '12px' }}>Annuler</button>
            <button className="btn btn-primary" onClick={handleSave} style={{ fontSize: '12px' }}>
              <Check size={14} /> Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const BindingPickerModal: React.FC<{
  isOpen: boolean;
  block: Block | null;
  maps: ProjectMap[];
  onClose: () => void;
  onSaveBinding: (blockId: string, binding?: NarrativeBinding) => void;
}> = (props) => {
  if (!props.isOpen || !props.block) return null;
  return <BindingPickerContent block={props.block} maps={props.maps} onClose={props.onClose} onSaveBinding={props.onSaveBinding} />;
};
