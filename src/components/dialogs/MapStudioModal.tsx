/**
 * StoryMap — Atelier Carte dédié : dessin sommet par sommet & scènes GeoJSON (P3 — V02/V03)
 */

import React, { useState, useEffect, useRef } from 'react';
import { Map as MLMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ProjectMap, MapFeature } from '../../types/project';
import { createDefaultProjectMap, addFeatureToLayer, deleteFeatureFromLayer } from '../../core/mapScene';
import { renderSceneLayersOnMap } from '../../core/mapSceneRender';
import { MAP_STYLES, resolveMapStyle, getMapStyleId } from '../../types/map';
import { X, Map, Plus, Trash2, Layers, Eye, EyeOff, Check, Camera, Crosshair, RotateCcw } from 'lucide-react';

interface MapStudioModalProps {
  isOpen: boolean;
  maps: ProjectMap[];
  onClose: () => void;
  onUpdateMaps: (updatedMaps: ProjectMap[]) => void;
}

const MapStudioModalContent: React.FC<Omit<MapStudioModalProps, 'isOpen'>> = ({ maps, onClose, onUpdateMaps }) => {
  const currentMaps = maps.length > 0 ? maps : [createDefaultProjectMap()];
  const [selectedMapIndex, setSelectedMapIndex] = useState(0);
  const activeMap = currentMaps[Math.min(selectedMapIndex, currentMaps.length - 1)];

  const [newFeatureName, setNewFeatureName] = useState('');
  const [newFeatureType, setNewFeatureType] = useState<'Point' | 'LineString' | 'Polygon'>('Point');
  const [cursorPos, setCursorPos] = useState<[number, number]>(activeMap.view?.center || [2.3522, 48.8566]);
  const [draftVertices, setDraftVertices] = useState<[number, number][]>([]);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const cursorMarkerRef = useRef<Marker | null>(null);
  const currentStyleRef = useRef(activeMap.mapStyle);
  const typeRef = useRef(newFeatureType);
  typeRef.current = newFeatureType;

  const updateActiveMap = (patch: Partial<ProjectMap>) => {
    onUpdateMaps(currentMaps.map((m, idx) => (idx === selectedMapIndex ? { ...m, ...patch } : m)));
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;
    mapContainerRef.current.innerHTML = '';
    const center = activeMap.view?.center || [2.3522, 48.8566];
    const map = new MLMap({
      container: mapContainerRef.current, style: resolveMapStyle(activeMap.mapStyle),
      center, zoom: activeMap.view?.zoom || 11, pitch: activeMap.view?.pitch || 0, bearing: activeMap.view?.bearing || 0,
    });
    currentStyleRef.current = activeMap.mapStyle;
    map.on('click', (e) => {
      const pt: [number, number] = [Number(e.lngLat.lng.toFixed(5)), Number(e.lngLat.lat.toFixed(5))];
      setCursorPos(pt);
      if (typeRef.current !== 'Point') setDraftVertices((prev) => [...prev, pt]);
    });
    mapRef.current = map;
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      cursorMarkerRef.current?.remove();
      cursorMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [selectedMapIndex]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activeMap.mapStyle || (map as any)._removed) return;
    if (currentStyleRef.current === activeMap.mapStyle) return;
    currentStyleRef.current = activeMap.mapStyle;
    map.setStyle(resolveMapStyle(activeMap.mapStyle));
    const handleStyleLoad = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = renderSceneLayersOnMap(map, activeMap, undefined, draftVertices);
    };
    if (map.isStyleLoaded()) handleStyleLoad(); else map.once('style.load', handleStyleLoad);
  }, [activeMap.mapStyle]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || (map as any)._removed) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = renderSceneLayersOnMap(map, activeMap, undefined, draftVertices);
  }, [activeMap.layers, draftVertices]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || (map as any)._removed) return;
    cursorMarkerRef.current?.remove();
    cursorMarkerRef.current = null;
    if (newFeatureType === 'Point') {
      const el = document.createElement('div');
      el.style.cssText = 'width:22px;height:22px;border-radius:50%;background:rgba(11,127,176,0.25);border:2px dashed #0b7fb0;display:flex;align-items:center;justify-content:center;color:#0b7fb0;font-size:12px;font-weight:700;pointer-events:none;';
      el.textContent = '+';
      cursorMarkerRef.current = new Marker({ element: el }).setLngLat(cursorPos).addTo(map);
    }
  }, [cursorPos, newFeatureType]);

  const handleCaptureView = () => {
    const map = mapRef.current;
    if (!map) return;
    const center = map.getCenter(), b = map.getBounds();
    updateActiveMap({
      view: {
        center: [center.lng, center.lat], zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing(),
        bounds: [[b.getWest(), b.getSouth()], [b.getEast(), b.getNorth()]],
      },
    });
  };

  const handleAddFeature = (layerId: string) => {
    const totalFeats = (activeMap.layers || []).flatMap((l) => l.features || []).length + 1;
    const typeLabel = newFeatureType === 'Point' ? 'Point' : newFeatureType === 'LineString' ? 'Tracé' : 'Zone';
    const name = newFeatureName.trim() || `${typeLabel} #${totalFeats}`;
    const [lng, lat] = cursorPos;
    let coords: any = [lng, lat];
    if (newFeatureType === 'LineString') {
      coords = draftVertices.length >= 2 ? draftVertices : [[lng, lat], [lng + 0.01, lat + 0.005]];
    } else if (newFeatureType === 'Polygon') {
      coords = draftVertices.length >= 3 ? [[...draftVertices, draftVertices[0]]] : [[[lng, lat], [lng + 0.01, lat], [lng + 0.01, lat + 0.01], [lng, lat + 0.01], [lng, lat]]];
    }
    const feat: MapFeature = {
      id: `feat-${activeMap.id}-${Date.now()}`, name, geometryType: newFeatureType,
      coordinates: coords, color: '#0b7fb0', numberIndex: totalFeats,
    };
    onUpdateMaps(currentMaps.map((m, idx) => (idx === selectedMapIndex ? addFeatureToLayer(m, layerId, feat) : m)));
    setNewFeatureName('');
    setDraftVertices([]);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, backgroundColor: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', padding: '16px' }} onClick={onClose}>
      <div className="dialog-box" style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', width: '100%', maxWidth: '900px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Map size={18} color="var(--accent)" /><h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Atelier Carte & Scènes Cartographiques</h2>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', flex: 1, minHeight: '440px', overflow: 'hidden' }}>
          <div style={{ padding: '14px', borderRight: '1px solid var(--border)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <select className="select" style={{ flex: 1, fontSize: '12px' }} value={selectedMapIndex} onChange={(e) => setSelectedMapIndex(Number(e.target.value))}>
                {currentMaps.map((m, idx) => (<option key={m.id} value={idx}>{m.name}</option>))}
              </select>
              <button className="btn btn-ghost btn-sm" onClick={() => { onUpdateMaps([...currentMaps, createDefaultProjectMap(`map-${Date.now()}`, `Carte ${currentMaps.length + 1}`)]); setSelectedMapIndex(currentMaps.length); }}><Plus size={13} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600 }}>Nom & Fond de carte</label>
              <input type="text" className="input" style={{ height: '26px', fontSize: '12px' }} value={activeMap.name} onChange={(e) => updateActiveMap({ name: e.target.value })} />
              <select className="select" style={{ height: '26px', fontSize: '11px' }} value={getMapStyleId(activeMap.mapStyle)} onChange={(e) => updateActiveMap({ mapStyle: e.target.value })}>
                {MAP_STYLES.map((st) => (<option key={st.id} value={st.id}>{st.name} ({st.provider})</option>))}
              </select>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600 }}><Layers size={13} /> Couches & Entités</span>
                <button className="btn btn-ghost btn-xs" onClick={() => updateActiveMap({ layers: [...(activeMap.layers || []), { id: `layer-${Date.now()}`, name: `Couche ${(activeMap.layers || []).length + 1}`, visible: true, features: [] }] })}><Plus size={11} /> Couche</button>
              </div>

              {(activeMap.layers || []).map((l) => (
                <div key={l.id} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 600 }}>{l.name}</span>
                    <button className="btn btn-ghost btn-icon btn-xs" onClick={() => updateActiveMap({ layers: activeMap.layers?.map((ly) => (ly.id === l.id ? { ...ly, visible: !ly.visible } : ly)) })}>
                      {l.visible ? <Eye size={12} color="var(--accent)" /> : <EyeOff size={12} />}
                    </button>
                  </div>
                  {(l.features || []).map((f) => (
                    <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', background: 'var(--surface)', padding: '2px 6px', borderRadius: '3px', marginBottom: '2px' }}>
                      <span>#{f.numberIndex || 1} {f.name} ({f.geometryType})</span>
                      <button className="btn btn-ghost btn-icon btn-xs" onClick={() => onUpdateMaps(currentMaps.map((m, idx) => (idx === selectedMapIndex ? deleteFeatureFromLayer(m, l.id, f.id) : m)))}><Trash2 size={11} color="var(--danger)" /></button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                    <input type="text" className="input" placeholder="Nom ou laisser vide…" style={{ height: '22px', fontSize: '11px', flex: 1 }} value={newFeatureName} onChange={(e) => setNewFeatureName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddFeature(l.id); }} />
                    <select className="select" style={{ height: '22px', fontSize: '10.5px' }} value={newFeatureType} onChange={(e) => { setNewFeatureType(e.target.value as any); setDraftVertices([]); }}>
                      <option value="Point">Point</option>
                      <option value="LineString">Ligne</option>
                      <option value="Polygon">Polygone</option>
                    </select>
                    <button className="btn btn-primary btn-xs" onClick={() => handleAddFeature(l.id)} title="Créer ce figuré (ou Entrée)"><Plus size={11} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div ref={mapContainerRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
            <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(15,23,42,0.88)', color: '#fff', padding: '5px 10px', borderRadius: '4px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10 }}>
              <Crosshair size={12} color="var(--accent)" />
              <span>{newFeatureType === 'Point' ? `Point [${cursorPos[0].toFixed(3)}, ${cursorPos[1].toFixed(3)}] (cliquez pour déplacer)` : `Sommets : ${draftVertices.length} (cliquez pour tracer)`}</span>
              {draftVertices.length > 0 && (
                <button className="btn btn-ghost btn-xs" style={{ color: '#f87171', padding: '0 4px', height: '18px' }} onClick={() => setDraftVertices([])} title="Effacer les sommets"><RotateCcw size={11} /></button>
              )}
            </div>
            <button className="btn btn-primary btn-xs" style={{ position: 'absolute', bottom: '12px', right: '12px', zIndex: 10 }} onClick={handleCaptureView}>
              <Camera size={13} style={{ marginRight: '4px' }} /> Capturer cette vue
            </button>
          </div>
        </div>

        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary btn-sm" onClick={onClose}><Check size={14} style={{ marginRight: '4px' }} /> Enregistrer & Fermer</button>
        </div>
      </div>
    </div>
  );
};

export const MapStudioModal: React.FC<MapStudioModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <MapStudioModalContent {...props} />;
};
