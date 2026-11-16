/**
 * StoryMap — Bloc Formulaire Client connectable à une adresse web (Mode 2 Page Web uniquement)
 */

import React, { useState } from 'react';
import { Block } from '../../../types/project';
import { ResolvedVisualStyle } from '../../../types/theme';
import {
  FORM_PRESETS, FormFieldConfig, FormPresetId, FormSubmissionMode, getDefaultFormBlockData,
} from '../../../core/webFormCatalog';
import { Send, CheckCircle2, Globe } from 'lucide-react';

interface FormBlockProps {
  block: Block;
  onChange: (patch: Record<string, unknown>) => void;
  isEditable?: boolean;
  visualStyle?: ResolvedVisualStyle;
  storyTitle?: string;
}

export const FormBlock: React.FC<FormBlockProps> = ({
  block, onChange, isEditable = true, visualStyle, storyTitle = '',
}) => {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  const data = block.data || {};
  const title = (data.title as string) ?? 'Contactez-nous';
  const endpointUrl = (data.endpointUrl as string) ?? 'https://formspree.io/f/exemple-client';
  const submissionMode: FormSubmissionMode = (data.submissionMode as FormSubmissionMode) || 'webhook';
  const submitLabel = (data.submitLabel as string) || 'Envoyer';
  const successMessage = (data.successMessage as string) || 'Merci ! Votre formulaire a bien été transmis.';
  const includeMapContext = data.includeMapContext !== false;
  const fields: FormFieldConfig[] =
    Array.isArray(data.fields) && data.fields.length > 0
      ? (data.fields as FormFieldConfig[])
      : FORM_PRESETS.contact.fields;

  const primaryCol = visualStyle?.primaryColor || '#0284c7';
  const radiusCss = visualStyle?.radiusCss || '6px';
  const headingFont = visualStyle?.headingFont || 'inherit';

  const handleApplyPreset = (presetId: FormPresetId) => {
    const next = getDefaultFormBlockData(presetId);
    onChange({ ...next, endpointUrl });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const formData = new FormData(formEl);
    if (formData.get('_gotcha')) return;

    const payload: Record<string, unknown> = {};
    formData.forEach((val, key) => {
      if (key !== '_gotcha') payload[key] = val;
    });
    if (includeMapContext) {
      payload._storyTitle = storyTitle || 'Document StoryMap';
      payload._submittedAt = new Date().toISOString();
    }

    if (isEditable) {
      setStatus('success');
      setStatusMsg(`Test OK → ${endpointUrl} (${Object.keys(payload).length} champs)`);
      setTimeout(() => setStatus('idle'), 2800);
      return;
    }

    if (submissionMode === 'mailto' || endpointUrl.startsWith('mailto:')) {
      const email = endpointUrl.replace(/^mailto:/i, '');
      const subj = encodeURIComponent(String(payload.objet || payload.secteur || title));
      const bodyLines = Object.entries(payload).map(([k, v]) => `${k} : ${v}`);
      window.location.href = `mailto:${email}?subject=${subj}&body=${encodeURIComponent(bodyLines.join('\n'))}`;
      setStatus('success');
      setStatusMsg(successMessage);
      return;
    }

    if (submissionMode === 'html-post') {
      formEl.submit();
      return;
    }

    setStatus('sending');
    setStatusMsg('Envoi en cours…');
    try {
      const resp = await fetch(endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      setStatus('success');
      setStatusMsg(successMessage);
      formEl.reset();
    } catch {
      setStatus('error');
      setStatusMsg('Impossible de joindre le serveur cible. Vérifiez l’adresse web.');
    }
  };

  return (
    <form
      className="doc-client-form" action={endpointUrl} method="POST" onSubmit={handleSubmit}
      onClick={(e) => isEditable && e.stopPropagation()}
      style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%', padding: '6px', boxSizing: 'border-box' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {isEditable ? (
          <input
            type="text" value={title} onChange={(e) => onChange({ title: e.target.value })} placeholder="Titre du formulaire..."
            style={{ fontWeight: 700, fontSize: '14px', fontFamily: headingFont, border: '1px dashed var(--border)', borderRadius: '4px', padding: '2px 6px', background: 'transparent', color: 'inherit', flex: 1 }}
          />
        ) : (
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, fontFamily: headingFont }}>{title}</h4>
        )}

        {isEditable && (
          <select
            className="input"
            value={(data.preset as string) || 'contact'}
            onChange={(e) => handleApplyPreset(e.target.value as FormPresetId)}
            title="Choisir un modèle de formulaire"
            style={{ fontSize: '11px', height: '24px', padding: '0 6px', width: 'auto' }}
          >
            {Object.entries(FORM_PRESETS).map(([k, v]) => (
              <option key={k} value={k}>Modèle : {v.label}</option>
            ))}
          </select>
        )}
      </div>

      <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" style={{ display: 'none' }} aria-hidden="true" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '7px' }}>
        {fields.map((f) => (
          <div key={f.id || f.name} style={{ display: 'flex', flexDirection: 'column', gap: '2px', gridColumn: f.type === 'textarea' ? '1 / -1' : undefined }}>
            <label style={{ fontSize: '11px', fontWeight: 600 }}>
              {f.label} {f.required && <span style={{ color: '#e11d48' }}>*</span>}
            </label>
            {f.type === 'textarea' ? (
              <textarea name={f.name} rows={2} required={!isEditable && f.required} placeholder={f.placeholder || ''} style={{ width: '100%', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: radiusCss, fontSize: '12px', resize: 'vertical', boxSizing: 'border-box' }} />
            ) : f.type === 'select' ? (
              <select name={f.name} required={!isEditable && f.required} style={{ width: '100%', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: radiusCss, fontSize: '12px', boxSizing: 'border-box', background: '#fff' }}>
                {(f.options || ['Option 1', 'Option 2']).map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : f.type === 'checkbox' ? (
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                <input type="checkbox" name={f.name} value="oui" required={!isEditable && f.required} />
                <span>{f.placeholder || f.label}</span>
              </label>
            ) : (
              <input type={f.type} name={f.name} required={!isEditable && f.required} placeholder={f.placeholder || ''} style={{ width: '100%', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: radiusCss, fontSize: '12px', boxSizing: 'border-box' }} />
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: 'auto', paddingTop: '4px', flexWrap: 'wrap' }}>
        {isEditable ? (
          <span style={{ fontSize: '10px', color: 'var(--text-3)', display: 'inline-flex', alignItems: 'center', gap: '4px', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <Globe size={11} /> {submissionMode.toUpperCase()} → {endpointUrl}
          </span>
        ) : <span />}

        <button
          type="submit"
          disabled={status === 'sending'}
          style={{ background: primaryCol, color: '#ffffff', border: 'none', borderRadius: radiusCss, padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Send size={12} />
          <span>{status === 'sending' ? 'Envoi…' : submitLabel}</span>
        </button>
      </div>

      {status !== 'idle' && (
        <div style={{ fontSize: '11px', fontWeight: 600, color: status === 'error' ? '#dc2626' : '#15803d', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <CheckCircle2 size={13} /> <span>{statusMsg}</span>
        </div>
      )}
    </form>
  );
};
