/**
 * StoryMap — Modal d'importation de charte graphique : 1 ou 3 fichiers (Claire / Sombre / Coloré)
 */

import React, { useState } from 'react';
import type { GraphicCharterDoc, CharterContextType } from '../../types/graphicCharter';
import { parseGraphicCharterJson } from '../../core/graphicCharter';
import { detectCharterContext, bundleCharterVariants, DEFAULT_CHARTER_VARIANTS } from '../../core/charterContext';
import { CharterPreviewCard } from './CharterPreviewCard';
import { X, Upload, Download, Check, AlertCircle, Sparkles, Layers, FileCode } from 'lucide-react';

interface CharterImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (doc: GraphicCharterDoc) => void;
  initialCharter?: GraphicCharterDoc | null;
}

const CONTEXT_META: Record<CharterContextType, { label: string; icon: string }> = {
  light: { label: 'Claire (Impression & Clair)', icon: '☀️' },
  dark: { label: 'Sombre (Nocturne & Carto)', icon: '🌙' },
  colored: { label: 'Colorée (Accent & Vif)', icon: '🎨' },
};

export const CharterImportModal: React.FC<CharterImportModalProps> = ({ isOpen, onClose, onApply, initialCharter }) => {
  const [importMode, setImportMode] = useState<'single' | 'multi'>(initialCharter?.variants ? 'multi' : 'single');
  const [variants, setVariants] = useState<Record<CharterContextType, GraphicCharterDoc>>(() => {
    if (initialCharter?.variants?.light || initialCharter?.variants?.dark || initialCharter?.variants?.colored) {
      return {
        light: initialCharter.variants.light || DEFAULT_CHARTER_VARIANTS.light,
        dark: initialCharter.variants.dark || DEFAULT_CHARTER_VARIANTS.dark,
        colored: initialCharter.variants.colored || DEFAULT_CHARTER_VARIANTS.colored,
      };
    }
    const detected = initialCharter ? detectCharterContext(initialCharter) : 'light';
    return { ...DEFAULT_CHARTER_VARIANTS, [detected]: initialCharter || DEFAULT_CHARTER_VARIANTS[detected] };
  });
  const [activeTab, setActiveTab] = useState<CharterContextType>(initialCharter?.context || 'light');
  const [jsonText, setJsonText] = useState<string>(() => JSON.stringify(variants[activeTab], null, 2));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentDoc = variants[activeTab];
  const detectedCtx = detectCharterContext(currentDoc);

  const updateActiveJson = (text: string) => {
    setJsonText(text);
    const res = parseGraphicCharterJson(text);
    if (res.success) {
      setErrorMsg(null);
      setVariants((prev) => ({ ...prev, [activeTab]: res.doc }));
    } else {
      setErrorMsg(res.error);
    }
  };

  const handleSelectTab = (tab: CharterContextType) => {
    setActiveTab(tab);
    setJsonText(JSON.stringify(variants[tab], null, 2));
    setErrorMsg(null);
  };

  const handleMultiFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const updated = { ...variants };
    const logs: string[] = [];
    let completed = 0;

    files.slice(0, 3).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || '');
        const res = parseGraphicCharterJson(text);
        if (res.success) {
          const ctx = detectCharterContext(res.doc);
          updated[ctx] = { ...res.doc, context: ctx };
          logs.push(`${file.name} -> ${CONTEXT_META[ctx].label}`);
        }
        completed += 1;
        if (completed === files.slice(0, 3).length) {
          setVariants(updated);
          setImportMode('multi');
          setJsonText(JSON.stringify(updated[activeTab], null, 2));
          setFeedback(`Algorithme de tri : ${logs.join(' · ')}`);
        }
      };
      reader.readAsText(file);
    });
  };

  const handleApply = () => {
    const master = importMode === 'multi' ? bundleCharterVariants(variants, activeTab) : variants[activeTab];
    onApply(master);
    onClose();
  };

  const handleDownload = () => {
    const exportData = importMode === 'multi' ? bundleCharterVariants(variants, activeTab) : variants[activeTab];
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `charte-${importMode === 'multi' ? 'pack-3-contextes' : activeTab}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, backgroundColor: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', padding: '16px' }} onClick={onClose}>
      <div className="dialog-box" style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', width: '100%', maxWidth: '780px', maxHeight: '92vh', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCode size={18} color="var(--accent)" />
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Importateur de Charte Graphique (1 ou 3 contextes)</h2>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ padding: '14px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'inline-flex', background: 'var(--surface-2)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <button type="button" className={`btn btn-xs ${importMode === 'single' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setImportMode('single')}>1 Fichier unique</button>
              <button type="button" className={`btn btn-xs ${importMode === 'multi' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setImportMode('multi')}>3 Fichiers (Claire · Sombre · Colorée)</button>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <label className="btn btn-ghost btn-xs" style={{ cursor: 'pointer' }}>
                <Upload size={12} /> <span>Importer 1 à 3 fichiers JSON</span>
                <input type="file" multiple accept=".json,application/json" onChange={handleMultiFilesUpload} style={{ display: 'none' }} />
              </label>
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => { setVariants(DEFAULT_CHARTER_VARIANTS); setJsonText(JSON.stringify(DEFAULT_CHARTER_VARIANTS[activeTab], null, 2)); setFeedback('Modèle Pack 3 contextes chargé'); }}><Sparkles size={12} /> Modèle démo</button>
              <button type="button" className="btn btn-ghost btn-xs" onClick={handleDownload}><Download size={12} /> Exporter JSON</button>
            </div>
          </div>

          {feedback && <div style={{ fontSize: '11px', color: 'var(--accent)', background: 'var(--accent-soft)', padding: '4px 8px', borderRadius: '4px' }}>{feedback}</div>}

          {importMode === 'multi' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--text-2)' }}>
                <Layers size={13} /> <span>Sélection contextuelle par l’algorithme : 3 univers prêts à être appliqués</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {(['light', 'dark', 'colored'] as CharterContextType[]).map((ctx) => (
                  <CharterPreviewCard key={ctx} contextType={ctx} label={CONTEXT_META[ctx].label} icon={CONTEXT_META[ctx].icon} doc={variants[ctx]} isActive={activeTab === ctx} onSelect={() => handleSelectTab(ctx)} onFileUpload={(f) => { const r = new FileReader(); r.onload = () => { const res = parseGraphicCharterJson(String(r.result || '')); if (res.success) { setVariants((p) => ({ ...p, [ctx]: { ...res.doc, context: ctx } })); if (activeTab === ctx) setJsonText(String(r.result || '')); } }; r.readAsText(f); }} />
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontWeight: 600 }}>Éditer le JSON de la variante ({CONTEXT_META[activeTab].label}) :</label>
              <span className="badge" style={{ fontSize: '10px' }}>Contexte détecté : {CONTEXT_META[detectedCtx].label}</span>
            </div>
            <textarea className="input" value={jsonText} onChange={(e) => updateActiveJson(e.target.value)} style={{ width: '100%', height: '180px', fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.4' }} placeholder="Code JSON de la charte..." />
            {errorMsg && <div style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}><AlertCircle size={13} /> <span>{errorMsg}</span></div>}
          </div>
        </div>

        <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>L’algorithme basculera automatiquement selon l’ambiance de la page et de la carte.</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
            <button type="button" className="btn btn-primary" onClick={handleApply} disabled={Boolean(errorMsg)}><Check size={14} /> <span>Appliquer la charte ({importMode === 'multi' ? '3 contextes' : CONTEXT_META[activeTab].label})</span></button>
          </div>
        </div>
      </div>
    </div>
  );
};
