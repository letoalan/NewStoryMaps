/**
 * StoryMap — Panneau de couches et d'entités pour l'Atelier Carte (MapStudio)
 */

import React from 'react';
import { ProjectMap } from '../../types/project';
import { deleteFeatureFromLayer } from '../../core/mapScene';
import { Layers, Plus, Eye, EyeOff, Trash2 } from 'lucide-react';

interface MapStudioLayersProps {
  activeMap: ProjectMap;
  selectedMapIndex: number;
  currentMaps: ProjectMap[];
  newFeatureName: string;
  newFeatureType: 'Point' | 'LineString' | 'Polygon';
  setNewFeatureName: (name: string) => void;
  setNewFeatureType: (type: 'Point' | 'LineString' | 'Polygon') => void;
  setDraftVertices: (v: [number, number][]) => void;
  updateActiveMap: (patch: Partial<ProjectMap>) => void;
  onUpdateMaps: (maps: ProjectMap[]) => void;
  onAddFeature: (layerId: string) => void;
}

export const MapStudioLayers: React.FC<MapStudioLayersProps> = ({
  activeMap, selectedMapIndex, currentMaps, newFeatureName, newFeatureType,
  setNewFeatureName, setNewFeatureType, setDraftVertices, updateActiveMap, onUpdateMaps, onAddFeature,
}) => {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600 }}><Layers size={13} /> Couches & Entités</span>
        <button className="btn btn-ghost btn-xs" onClick={() => updateActiveMap({ layers: [...(activeMap.layers || []), { id: `layer-${Date.now()}`, name: `Couche ${(activeMap.layers || []).length + 1}`, visible: true, features: [] }] })}>
          <Plus size={11} /> Couche
        </button>
      </div>
      {(activeMap.layers || []).map((l) => (
        <div key={l.id} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '8px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 600 }}>{l.name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <button type="button" className="btn btn-ghost btn-icon btn-xs" title={l.visible ? 'Masquer' : 'Afficher'} onClick={() => updateActiveMap({ layers: activeMap.layers?.map((ly) => (ly.id === l.id ? { ...ly, visible: !ly.visible } : ly)) })}>
                {l.visible ? <Eye size={12} color="var(--accent)" /> : <EyeOff size={12} />}
              </button>
              <button type="button" className="btn btn-ghost btn-icon btn-xs" title="Supprimer la couche" onClick={() => updateActiveMap({ layers: activeMap.layers?.filter((ly) => ly.id !== l.id) })}>
                <Trash2 size={12} color="var(--danger)" />
              </button>
            </div>
          </div>
          {(l.features || []).map((f) => (
            <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', background: 'var(--surface)', padding: '2px 6px', borderRadius: '3px', marginBottom: '2px' }}>
              <span>#{f.numberIndex || 1} {f.name} ({f.geometryType})</span>
              <button className="btn btn-ghost btn-icon btn-xs" onClick={() => onUpdateMaps(currentMaps.map((m, idx) => (idx === selectedMapIndex ? deleteFeatureFromLayer(m, l.id, f.id) : m)))}>
                <Trash2 size={11} color="var(--danger)" />
              </button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
            <input type="text" className="input" placeholder="Nom…" style={{ height: '22px', fontSize: '11px', flex: 1 }} value={newFeatureName} onChange={(e) => setNewFeatureName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') onAddFeature(l.id); }} />
            <select className="select" style={{ height: '22px', fontSize: '10.5px' }} value={newFeatureType} onChange={(e) => { setNewFeatureType(e.target.value as any); setDraftVertices([]); }}>
              <option value="Point">Point</option><option value="LineString">Ligne</option><option value="Polygon">Polygone</option>
            </select>
            <button className="btn btn-primary btn-xs" onClick={() => onAddFeature(l.id)} title="Créer ce figuré"><Plus size={11} /></button>
          </div>
        </div>
      ))}
    </div>
  );
};
