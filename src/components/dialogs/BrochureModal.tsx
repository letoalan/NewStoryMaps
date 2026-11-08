/**
 * StoryMap — Dialogue de Prévol Brochure A4, conversion Mode 2 -> 3 et export PDF (P5 — J02, J03, J10, J11 / C08)
 */

import React, { useState } from 'react';
import { useStory } from '../../context/StoryContext';
import {
  convertRichDocumentToBrochure,
  runBrochurePreflight,
  BrochureConversionReport,
} from '../../core/brochure';
import { generateBrochurePrintHTML } from '../../core/publishBrochure';
import { exportStoryToBrochureHTML } from '../../core/io';
import { db } from '../../core/db';
import { X, Printer, Download, Copy, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

interface BrochureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BrochureModal: React.FC<BrochureModalProps> = ({ isOpen, onClose }) => {
  const { story, setStory } = useStory();
  const [conversionReport, setConversionReport] = useState<BrochureConversionReport | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  if (!isOpen || !story) return null;

  const preflight = runBrochurePreflight(story);

  const handleConvertMode2To3 = async () => {
    setIsConverting(true);
    try {
      const { brochure, report } = convertRichDocumentToBrochure(story);
      await db.saveStory(brochure);
      setConversionReport(report);
      setStory(brochure);
    } finally {
      setIsConverting(false);
    }
  };

  const handleOpenPrintWindow = () => {
    const html = generateBrochurePrintHTML(story);
    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
    } else {
      exportStoryToBrochureHTML(story);
    }
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.72)', zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        style={{
          width: '100%', maxWidth: '640px', background: 'var(--surface)', borderRadius: 'var(--r-lg)',
          border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Printer size={18} color="var(--accent)" />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Brochure statique A4 & Export PDF (P5)</h2>
          </div>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '75vh', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            <div style={{ padding: '10px', background: 'var(--surface-2)', borderRadius: 'var(--r)', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>{preflight.pageCount}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Page(s) A4</div>
            </div>
            <div style={{ padding: '10px', background: 'var(--surface-2)', borderRadius: 'var(--r)', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>{preflight.mapCount}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Carte(s)</div>
            </div>
            <div style={{ padding: '10px', background: 'var(--surface-2)', borderRadius: 'var(--r)', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: preflight.selectableTextPresent ? 'var(--success)' : 'var(--text-3)' }}>
                {preflight.selectableTextPresent ? 'Texte HTML' : 'Aucun'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>Flux textuel</div>
            </div>
            <div style={{ padding: '10px', background: 'var(--surface-2)', borderRadius: 'var(--r)', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: preflight.attributionsPresent ? 'var(--success)' : 'var(--warning)' }}>
                {preflight.attributionsPresent ? 'Conformes' : 'Incomplètes'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>Attributions</div>
            </div>
          </div>

          <div style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {preflight.ready ? <CheckCircle2 size={15} color="var(--success)" /> : <AlertTriangle size={15} color="var(--danger)" />}
              <span>Contrôle prévol (Preflight C07 / J10) : {preflight.ready ? 'Prêt pour impression A4' : 'Corrections requises'}</span>
            </div>
            {preflight.issues.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>Aucune anomalie bloquante. Marges A4, flux de texte et attributions sont configurés.</div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {preflight.issues.map((iss, idx) => (
                  <li key={idx} style={{ color: iss.severity === 'error' ? 'var(--danger)' : iss.severity === 'warning' ? '#d97706' : 'var(--text-2)' }}>
                    <strong>[{iss.code}]</strong> {iss.message}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {story.mode === 'rich-document' && (
            <div style={{ padding: '12px', background: 'rgba(11, 127, 176, 0.08)', border: '1px solid var(--accent)', borderRadius: 'var(--r)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '12px' }}>
                <strong>Conversion Mode 2 → Mode 3 (J02 / J03)</strong>
                <div style={{ color: 'var(--text-2)', marginTop: '2px' }}>Crée une copie Brochure A4 dédiée en développant les galeries en planches et synchronisant les liaisons.</div>
              </div>
              <button type="button" className="btn btn-primary" disabled={isConverting} onClick={handleConvertMode2To3}>
                <Copy size={14} /> <span>Créer copie Brochure</span>
              </button>
            </div>
          )}

          {conversionReport && (
            <div style={{ padding: '10px 12px', background: 'var(--surface-3)', borderRadius: 'var(--r)', fontSize: '12px' }}>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Info size={14} color="var(--accent)" /> Copie Brochure créée ({conversionReport.targetFormat})
              </div>
              {conversionReport.notes.map((n, i) => <div key={i}>• {n}</div>)}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: 'var(--surface-2)' }}>
          <button type="button" className="btn btn-ghost" onClick={() => exportStoryToBrochureHTML(story)} title="Télécharge le fichier autonome avec données rééditables">
            <Download size={14} /> <span>HTML Rééditable (.brochure.html)</span>
          </button>
          <button type="button" className="btn btn-primary" disabled={!preflight.ready} onClick={handleOpenPrintWindow} title="Génère la mise en page A4 pour impression papier ou diffusion PDF">
            <Printer size={14} /> <span>Imprimer / PDF A4 (Diffusion)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
