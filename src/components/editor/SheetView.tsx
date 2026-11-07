/**
 * StoryMap — Mode Tableur pour l'édition tabulaire des étapes
 */

import React from 'react';
import { useStory } from '../../context/StoryContext';
import { StoryStep } from '../../types/step';
import { Plus, Trash2, ArrowUp, ArrowDown, Download } from 'lucide-react';
import { createDefaultStep } from '../../core/defaults';

export const SheetView: React.FC = () => {
  const { story, activeStepIndex, setActiveStepIndex, updateStory } = useStory();

  if (!story) return null;

  const steps = story.steps;

  const handleCellChange = (
    index: number,
    field: keyof StoryStep | 'lat' | 'lng' | 'zoom',
    value: string | number
  ) => {
    const updated = [...steps];
    const step = { ...updated[index] };

    if (field === 'lat' || field === 'lng' || field === 'zoom') {
      const camera = { ...step.camera };
      if (field === 'lat') camera.center = [camera.center[0], Number(value) || 0];
      if (field === 'lng') camera.center = [Number(value) || 0, camera.center[1]];
      if (field === 'zoom') camera.zoom = Number(value) || 0;
      step.camera = camera;
    } else {
      (step as Record<string, unknown>)[field] = value;
    }

    updated[index] = step;
    updateStory({ steps: updated });
  };

  const handleAddStep = () => {
    const newStep = createDefaultStep(steps.length + 1);
    updateStory({ steps: [...steps, newStep] });
    setActiveStepIndex(steps.length);
  };

  const handleDeleteStep = (index: number) => {
    if (steps.length <= 1) return;
    const updated = steps.filter((_, i) => i !== index);
    updateStory({ steps: updated });
    if (activeStepIndex >= updated.length) {
      setActiveStepIndex(updated.length - 1);
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= steps.length) return;
    const updated = [...steps];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);
    updateStory({ steps: updated });
    setActiveStepIndex(targetIdx);
  };

  const exportCSV = () => {
    const headers = ['Ordre', 'Titre', 'Latitude', 'Longitude', 'Zoom', 'Description', 'Image'];
    const rows = steps.map((s, i) => [
      i + 1,
      `"${(s.title || '').replace(/"/g, '""')}"`,
      s.camera.center[1],
      s.camera.center[0],
      s.camera.zoom,
      `"${(s.description || '').replace(/"/g, '""')}"`,
      `"${(s.media?.url || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${story.id || 'storymap'}-etapes.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="sheet-container" style={{ padding: '16px', overflow: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" onClick={handleAddStep}>
            <Plus size={16} /> Ajouter une étape
          </button>
          <button className="btn btn-ghost" onClick={exportCSV}>
            <Download size={16} /> Exporter CSV
          </button>
        </div>
        <span style={{ color: 'var(--text-3)', fontSize: '13px', alignSelf: 'center' }}>
          {steps.length} étape(s) enregistrée(s)
        </span>
      </div>

      <table className="sheet-grid" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--surface-2)', textAlign: 'left', fontSize: '12px' }}>
            <th style={{ padding: '8px', border: '1px solid var(--border)', width: '50px' }}>#</th>
            <th style={{ padding: '8px', border: '1px solid var(--border)' }}>Titre</th>
            <th style={{ padding: '8px', border: '1px solid var(--border)', width: '90px' }}>Lat</th>
            <th style={{ padding: '8px', border: '1px solid var(--border)', width: '90px' }}>Lng</th>
            <th style={{ padding: '8px', border: '1px solid var(--border)', width: '70px' }}>Zoom</th>
            <th style={{ padding: '8px', border: '1px solid var(--border)' }}>Description</th>
            <th style={{ padding: '8px', border: '1px solid var(--border)', width: '100px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step, idx) => (
            <tr
              key={step.id}
              style={{
                background: idx === activeStepIndex ? 'var(--accent-soft)' : 'transparent',
                fontSize: '13px',
              }}
              onClick={() => setActiveStepIndex(idx)}
            >
              <td style={{ padding: '6px', border: '1px solid var(--border)', textAlign: 'center' }}>
                {idx + 1}
              </td>
              <td style={{ padding: '6px', border: '1px solid var(--border)' }}>
                <input type="text" className="input" value={step.title}
                  onChange={(e) => handleCellChange(idx, 'title', e.target.value)} />
              </td>
              <td style={{ padding: '6px', border: '1px solid var(--border)' }}>
                <input type="number" step="0.0001" className="input" value={step.camera.center[1]}
                  onChange={(e) => handleCellChange(idx, 'lat', e.target.value)} />
              </td>
              <td style={{ padding: '6px', border: '1px solid var(--border)' }}>
                <input type="number" step="0.0001" className="input" value={step.camera.center[0]}
                  onChange={(e) => handleCellChange(idx, 'lng', e.target.value)} />
              </td>
              <td style={{ padding: '6px', border: '1px solid var(--border)' }}>
                <input type="number" step="0.5" className="input" value={step.camera.zoom}
                  onChange={(e) => handleCellChange(idx, 'zoom', e.target.value)} />
              </td>
              <td style={{ padding: '6px', border: '1px solid var(--border)' }}>
                <input type="text" className="input" value={step.description || ''}
                  onChange={(e) => handleCellChange(idx, 'description', e.target.value)} />
              </td>
              <td style={{ padding: '6px', border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                  <button
                    className="btn btn-icon btn-ghost"
                    disabled={idx === 0}
                    onClick={(e) => { e.stopPropagation(); handleMove(idx, 'up'); }}
                    title="Monter"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    className="btn btn-icon btn-ghost"
                    disabled={idx === steps.length - 1}
                    onClick={(e) => { e.stopPropagation(); handleMove(idx, 'down'); }}
                    title="Descendre"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    className="btn btn-icon btn-ghost"
                    disabled={steps.length <= 1}
                    onClick={(e) => { e.stopPropagation(); handleDeleteStep(idx); }}
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
