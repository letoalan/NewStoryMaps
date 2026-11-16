/**
 * StoryMap — Contrôles d'inspection dédiés aux blocs Web : Bouton calibrable & Formulaire client (Mode 2 uniquement)
 */

import React from 'react';
import { Block, ProjectMode } from '../../types/project';
import {
  ButtonTriggerType, ButtonVariant, ButtonSize, ButtonAlign, ButtonIconType,
  FORM_PRESETS, FormFieldConfig, FormFieldType, FormPresetId, FormSubmissionMode, getDefaultFormBlockData,
} from '../../core/webFormCatalog';
import { Plus, Trash2 } from 'lucide-react';

interface BlockInspectorWebControlsProps {
  block: Block;
  mode: ProjectMode;
  onUpdateData: (id: string, patch: Record<string, unknown>) => void;
}

export const BlockInspectorWebControls: React.FC<BlockInspectorWebControlsProps> = ({ block, mode, onUpdateData }) => {
  if (mode !== 'rich-document') return null;
  const d = block.data || {};
  const patch = (p: Record<string, unknown>) => onUpdateData(block.id, p);

  if (block.type === 'button') {
    const trigger: ButtonTriggerType = (d.triggerType as ButtonTriggerType) || (d.url ? 'url' : 'map');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Libellé du bouton</label>
            <input type="text" className="input" style={{ width: '100%' }} value={String(d.label || d.text || '')} onChange={(e) => patch({ label: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Déclencheur d’action</label>
            <select className="input" style={{ width: '100%' }} value={trigger} onChange={(e) => patch({ triggerType: e.target.value as ButtonTriggerType })}>
              <option value="map">Action sur une carte</option><option value="url">Lien web / Email / Appel</option>
              <option value="page">Aller à une page</option><option value="prefill-form">Pré-remplir le formulaire</option>
            </select>
          </div>
        </div>

        {trigger === 'url' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Adresse URL / mailto: / tel:</label>
              <input type="text" className="input" style={{ width: '100%' }} placeholder="https://..." value={String(d.url || '')} onChange={(e) => patch({ url: e.target.value })} />
            </div>
            <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', paddingBottom: '6px' }}>
              <input type="checkbox" checked={d.targetBlank !== false} onChange={(e) => patch({ targetBlank: e.target.checked })} /><span>Nouvel onglet</span>
            </label>
          </div>
        )}

        {trigger === 'page' && (
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Numéro de page cible (1 = première page)</label>
            <input type="number" className="input" min={1} max={50} value={Number(d.targetPageIndex ?? 0) + 1} onChange={(e) => patch({ targetPageIndex: Math.max(0, Number(e.target.value) - 1) })} />
          </div>
        )}

        {trigger === 'prefill-form' && (
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Valeur à injecter dans le formulaire client</label>
            <input type="text" className="input" style={{ width: '100%' }} placeholder="Ex: Réservation Étape 2 — Lyon" value={String(d.prefillValue || '')} onChange={(e) => patch({ prefillValue: e.target.value })} />
          </div>
        )}

        {trigger === 'map' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px' }}>
            <div>
              <label style={{ fontSize: '10px', fontWeight: 600, display: 'block' }}>Action</label>
              <select className="input" style={{ width: '100%', fontSize: '11px' }} value={String(block.binding?.action || d.action || 'zoom')} onChange={(e) => patch({ action: e.target.value })}>
                <option value="zoom">Zoomer</option><option value="highlight">Mettre en évidence</option><option value="filter">Filtrer</option><option value="overview">Vue globale</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '10px', fontWeight: 600, display: 'block' }}>Lng (opt.)</label>
              <input type="number" step="0.001" className="input" value={d.targetLng !== undefined ? Number(d.targetLng) : ''} placeholder="2.35" onChange={(e) => patch({ targetLng: e.target.value === '' ? undefined : Number(e.target.value) })} />
            </div>
            <div>
              <label style={{ fontSize: '10px', fontWeight: 600, display: 'block' }}>Lat (opt.)</label>
              <input type="number" step="0.001" className="input" value={d.targetLat !== undefined ? Number(d.targetLat) : ''} placeholder="48.85" onChange={(e) => patch({ targetLat: e.target.value === '' ? undefined : Number(e.target.value) })} />
            </div>
            <div>
              <label style={{ fontSize: '10px', fontWeight: 600, display: 'block' }}>Zoom</label>
              <input type="number" step="0.5" min={1} max={20} className="input" value={Number(d.targetZoom ?? 14)} onChange={(e) => patch({ targetZoom: Number(e.target.value) })} />
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
          <div>
            <label style={{ fontSize: '10px', fontWeight: 600, display: 'block' }}>Style</label>
            <select className="input" style={{ width: '100%', fontSize: '11px' }} value={(d.variant as ButtonVariant) || 'primary'} onChange={(e) => patch({ variant: e.target.value })}>
              <option value="primary">Primaire</option><option value="accent">Accent</option><option value="outline">Contour</option><option value="ghost">Discret</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '10px', fontWeight: 600, display: 'block' }}>Calibre</label>
            <select className="input" style={{ width: '100%', fontSize: '11px' }} value={(d.size as ButtonSize) || 'md'} onChange={(e) => patch({ size: e.target.value })}>
              <option value="sm">Petit</option><option value="md">Moyen</option><option value="lg">Grand</option><option value="full">100% case</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '10px', fontWeight: 600, display: 'block' }}>Alignement</label>
            <select className="input" style={{ width: '100%', fontSize: '11px' }} value={(d.align as ButtonAlign) || 'center'} onChange={(e) => patch({ align: e.target.value })}>
              <option value="left">Gauche</option><option value="center">Centre</option><option value="right">Droite</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '10px', fontWeight: 600, display: 'block' }}>Icône</label>
            <select className="input" style={{ width: '100%', fontSize: '11px' }} value={(d.icon as ButtonIconType) || 'compass'} onChange={(e) => patch({ icon: e.target.value })}>
              <option value="compass">Boussole</option><option value="external">Lien ↗</option><option value="arrow">Flèche →</option><option value="mail">Email ✉</option><option value="calendar">Agenda</option><option value="download">Téléch.</option><option value="none">Aucune</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  if (block.type === 'form') {
    const fields: FormFieldConfig[] = Array.isArray(d.fields) && d.fields.length > 0 ? (d.fields as FormFieldConfig[]) : FORM_PRESETS.contact.fields;
    const updateField = (idx: number, fPatch: Partial<FormFieldConfig>) => patch({ fields: fields.map((f, i) => (i === idx ? { ...f, ...fPatch } : f)) });
    const addField = () => patch({ fields: [...fields, { id: `f-${Date.now().toString(36)}`, name: `champ_${fields.length + 1}`, label: 'Nouveau champ', type: 'text', required: false }] });
    const removeField = (idx: number) => fields.length > 1 && patch({ fields: fields.filter((_, i) => i !== idx) });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Modèle prédéfini</label>
            <select className="input" style={{ width: '100%' }} value={String(d.preset || 'contact')} onChange={(e) => patch({ ...getDefaultFormBlockData(e.target.value as FormPresetId), endpointUrl: d.endpointUrl })}>
              {Object.entries(FORM_PRESETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Mode de connexion web</label>
            <select className="input" style={{ width: '100%' }} value={(d.submissionMode as FormSubmissionMode) || 'webhook'} onChange={(e) => patch({ submissionMode: e.target.value })}>
              <option value="webhook">Webhook / API JSON (fetch)</option><option value="html-post">Formulaire HTML (POST)</option><option value="mailto">Courriel direct (mailto:)</option>
            </select>
          </div>
        </div>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Adresse web cible (Endpoint URL / Webhook / mailto:)</label>
          <input type="text" className="input" style={{ width: '100%' }} placeholder="https://formspree.io/f/... ou https://hook.make.com/..." value={String(d.endpointUrl || '')} onChange={(e) => patch({ endpointUrl: e.target.value })} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Texte du bouton d’envoi</label>
            <input type="text" className="input" style={{ width: '100%' }} value={String(d.submitLabel || 'Envoyer')} onChange={(e) => patch({ submitLabel: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Message de confirmation</label>
            <input type="text" className="input" style={{ width: '100%' }} value={String(d.successMessage || '')} onChange={(e) => patch({ successMessage: e.target.value })} />
          </div>
        </div>
        <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input type="checkbox" checked={d.includeMapContext !== false} onChange={(e) => patch({ includeMapContext: e.target.checked })} />
          <span>Transmettre automatiquement le contexte du récit et de la carte active</span>
        </label>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700 }}>Champs du formulaire ({fields.length})</span>
            <button type="button" className="btn btn-ghost btn-xs" onClick={addField}><Plus size={12} /> Ajouter un champ</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '140px', overflowY: 'auto' }}>
            {fields.map((f, idx) => (
              <div key={f.id || idx} style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr auto auto', gap: '5px', alignItems: 'center' }}>
                <input type="text" className="input" style={{ fontSize: '11px', padding: '3px 6px' }} value={f.label} onChange={(e) => updateField(idx, { label: e.target.value, name: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_') || f.name })} />
                <select className="input" style={{ fontSize: '11px', padding: '2px 4px' }} value={f.type} onChange={(e) => updateField(idx, { type: e.target.value as FormFieldType })}>
                  <option value="text">Texte</option><option value="email">E-mail</option><option value="tel">Téléphone</option><option value="date">Date</option><option value="number">Nombre</option><option value="select">Liste</option><option value="textarea">Zone texte</option><option value="checkbox">Case RGPD</option>
                </select>
                <label style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '2px' }} title="Champ obligatoire"><input type="checkbox" checked={Boolean(f.required)} onChange={(e) => updateField(idx, { required: e.target.checked })} /> Req.</label>
                <button type="button" className="btn btn-ghost btn-xs btn-icon" disabled={fields.length <= 1} onClick={() => removeField(idx)}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  return null;
};
