/**
 * StoryMap — Atelier Carte dédié & gestion des scènes cartographiques (P3 — H01 à H04)
 */

import React, { useState } from 'react';
import { ProjectMap, MapFeature, MapSceneLayer } from '../../types/project';
import { createDefaultProjectMap, addFeatureToLayer, deleteFeatureFromLayer } from '../../core/mapScene';
import { X, Map, Plus, Trash2, Layers, Eye, EyeOff, Check } from 'lucide-react';

interface MapStudioModalProps {
  isOpen: boolean;
  maps: ProjectMap[];
  onClose: () => void;
  onUpdateMaps: (updatedMaps: ProjectMap[]) => void;
}

export const MapStudioModal: React.FC<MapStudioModalProps> = ({
  isOpen,
  maps,
  onClose,
  onUpdateMaps,
}) => {
  if (!isOpen) return null;

  const currentMaps = maps.length > 0 ? maps : [createDefaultProjectMap()];
  const [selectedMapIndex, setSelectedMapIndex] = useState(0);
  const activeMap = currentMaps[Math.min(selectedMapIndex, currentMaps.length - 1)];

  const [newFeatureName, setNewFeatureName] = useState('');
  const [newFeatureType, setNewFeatureType] = useState<'Point' | 'LineString' | 'Polygon'>('Point');

  const updateActiveMap = (patch: Partial<ProjectMap>) => {
    const updated = currentMaps.map((m, idx) => (idx === selectedMapIndex ? { ...m, ...patch } : m));
    onUpdateMaps(updated);
  };

  const handleAddMap = () => {
    const newMap = createDefaultProjectMap(`map-${Date.now()}`, `Carte ${currentMaps.length + 1}`);
    const updated = [...currentMaps, newMap];
    onUpdateMaps(updated);
    setSelectedMapIndex(updated.length - 1);
  };

  const handleDeleteMap = (mapId: string) => {
    if (currentMaps.length <= 1) return;
    const updated = currentMaps.filter((m) => m.id !== mapId);
    onUpdateMaps(updated);
    setSelectedMapIndex(Math.max(0, selectedMapIndex - 1));
  };

  const handleAddLayer = () => {
    const newLayer: MapSceneLayer = {
      id: `layer-${Date.now()}`,
      name: `Couche ${((activeMap.layers || []).length + 1)}`,
      visible: true,
      color: '#0b7fb0',
      features: [],
    };
    updateActiveMap({ layers: [...(activeMap.layers || []), newLayer] });
  };

  const handleToggleLayer = (layerId: string) => {
    const updated = (activeMap.layers || []).map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l));
    updateActiveMap({ layers: updated });
  };

  const handleAddFeature = (layerId: string) => {
    if (!newFeatureName.trim()) return;
    const feat: MapFeature = {
      id: `feat-${Date.now()}`,
      name: newFeatureName.trim(),
      geometryType: newFeatureType,
      coordinates: [activeMap.view.center[0] + (Math.random() - 0.5) * 0.05, activeMap.view.center[1] + (Math.random() - 0.5) * 0.05],
      color: '#0b7fb0',
      numberIndex: ((activeMap.layers || []).flatMap((l) => l.features).length + 1),
    };
    onUpdateMaps(currentMaps.map((m, idx) => (idx === selectedMapIndex ? addFeatureToLayer(m, layerId, feat) : m)));
    setNewFeatureName('');
  };

  const handleDeleteFeature = (layerId: string, featId: string) => {
    onUpdateMaps(currentMaps.map((m, idx) => (idx === selectedMapIndex ? deleteFeatureFromLayer(m, layerId, featId) : m)));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, backgroundColor: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', padding: '16px' }} onClick={onClose}>
      <div className="dialog-box" style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', width: '100%', maxWidth: '640px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Map size={18} color="var(--accent)" />
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Atelier Carte & Scènes</h2>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ padding: '18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Sélection de la carte */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <select className="select" style={{ flex: 1 }} value={selectedMapIndex} onChange={(e) => setSelectedMapIndex(Number(e.target.value))}>
              {currentMaps.map((m, idx) => (
                <option key={m.id} value={idx}>{m.name} ({m.layers?.length || 0} couches)</option>
              ))}
            </select>
            <button className="btn btn-ghost btn-sm" onClick={handleAddMap}><Plus size={14} /> Nouvelle carte</button>
            {currentMaps.length > 1 && (
              <button className="btn btn-ghost btn-danger btn-sm" onClick={() => handleDeleteMap(activeMap.id)}><Trash2 size={14} /></button>
            )}
          </div>

          {/* Propriétés de la carte active */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Nom de la carte</label>
              <input type="text" className="input" value={activeMap.name} onChange={(e) => updateActiveMap({ name: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Fond cartographique</label>
              <select className="select" style={{ width: '100%' }} value={activeMap.mapStyle} onChange={(e) => updateActiveMap({ mapStyle: e.target.value })}>
                <option value="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json">Positron Clair</option>
                <option value="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json">Dark Matter Sombre</option>
                <option value="esri-satellite">Satellite Esri</option>
              </select>
            </div>
          </div>

          {/* Couches et entités */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={14} /> Couches & Objets ({activeMap.layers?.length || 0})
              </span>
              <button className="btn btn-ghost btn-xs" onClick={handleAddLayer}><Plus size={12} /> Ajouter couche</button>
            </div>

            {(activeMap.layers || []).map((l) => (
              <div key={l.id} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '10px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button className="btn btn-ghost btn-icon btn-xs" onClick={() => handleToggleLayer(l.id)}>
                      {l.visible ? <Eye size={13} color="var(--accent)" /> : <EyeOff size={13} />}
                    </button>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>{l.name}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{l.features?.length || 0} objet(s)</span>
                </div>

                {/* Liste des features */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '24px' }}>
                  {(l.features || []).map((f) => (
                    <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', background: 'var(--surface)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                      <span>{f.numberIndex ? `#${f.numberIndex} ` : ''}{f.name} ({f.geometryType})</span>
                      <button className="btn btn-ghost btn-icon btn-xs" onClick={() => handleDeleteFeature(l.id, f.id)}><Trash2 size={12} color="var(--danger)" /></button>
                    </div>
                  ))}

                  {/* Ajout d'objet dans la couche */}
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                    <input type="text" className="input" placeholder="Nom de l'objet…" style={{ height: '24px', fontSize: '11px', flex: 1 }} value={newFeatureName} onChange={(e) => setNewFeatureName(e.target.value)} />
                    <select className="select" style={{ height: '24px', fontSize: '11px' }} value={newFeatureType} onChange={(e) => setNewFeatureType(e.target.value as any)}>
                      <option value="Point">Point</option>
                      <option value="LineString">Ligne</option>
                      <option value="Polygon">Polygone</option>
                    </select>
                    <button className="btn btn-primary btn-xs" onClick={() => handleAddFeature(l.id)}><Plus size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onClose}><Check size={14} /> Fermer l'Atelier</button>
        </div>
      </div>
    </div>
  );
};
