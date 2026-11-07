/**
 * StoryMap — Volet latéral droit : Inspecteur d'étape
 */

import React, { useRef } from 'react';
import { useStory } from '../../context/StoryContext';
import { Sliders, Image, MapPin, Type, Upload } from 'lucide-react';
import { RichTextToolbar } from './RichTextToolbar';
import { extractGpsFromExif } from '../../core/exif';

export const Inspector: React.FC = () => {
  const { story, activeStepIndex, updateStep } = useStory();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentStep = story?.steps[activeStepIndex];

  if (!story || !currentStep) return null;

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      updateStep(activeStepIndex, {
        media: { type: 'image', url: dataUrl, caption: file.name },
      });
    };
    reader.readAsDataURL(file);

    // Extraction EXIF GPS
    const bufReader = new FileReader();
    bufReader.onload = (evt) => {
      const buffer = evt.target?.result as ArrayBuffer;
      const coords = extractGpsFromExif(buffer);
      if (coords) {
        updateStep(activeStepIndex, {
          camera: {
            ...currentStep.camera,
            center: [coords.longitude, coords.latitude],
          },
        });
      }
    };
    bufReader.readAsArrayBuffer(file);
  };

  return (
    <aside className="inspector scroll">
      <div className="panel-head">
        <h2 className="panel-title">
          <Sliders size={16} color="var(--accent)" />
          <span>Propriétés de l’étape {activeStepIndex + 1}</span>
        </h2>
      </div>

      <div className="insp-body" style={{ padding: '16px' }}>
        <div className="field">
          <label className="field-label"><Type size={14} /> Titre de l'étape</label>
          <input
            type="text"
            className="input"
            value={currentStep.title}
            onChange={(e) => updateStep(activeStepIndex, { title: e.target.value })}
            placeholder="Ex : Arrivée à Paris"
          />
        </div>

        <div className="field">
          <label className="field-label">Description du récit</label>
          <RichTextToolbar
            textareaRef={textareaRef}
            value={currentStep.description}
            onChange={(val) => updateStep(activeStepIndex, { description: val })}
          />
          <textarea
            ref={textareaRef}
            className="textarea"
            rows={5}
            value={currentStep.description}
            onChange={(e) => updateStep(activeStepIndex, { description: e.target.value })}
            placeholder="Racontez les événements associés à ce lieu…"
          />
        </div>

        <div className="divider" />

        <div className="field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="field-label"><Image size={14} /> Illustration</label>
            <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
              <Upload size={12} /> Photo locale / EXIF
              <input type="file" accept="image/*" onChange={handleImageFile} style={{ display: 'none' }} />
            </label>
          </div>
          <input
            type="text"
            className="input"
            value={currentStep.media?.url || ''}
            onChange={(e) =>
              updateStep(activeStepIndex, {
                media: e.target.value
                  ? { type: 'image', url: e.target.value, caption: currentStep.media?.caption }
                  : undefined,
              })
            }
            placeholder="https://exemple.com/image.jpg ou fichier"
          />
          {currentStep.media?.url && (
            <div style={{ marginTop: '8px' }}>
              <input
                type="text"
                className="input input-sm"
                value={currentStep.media.caption || ''}
                onChange={(e) =>
                  updateStep(activeStepIndex, {
                    media: { ...currentStep.media!, caption: e.target.value },
                  })
                }
                placeholder="Légende de l'image"
              />
              <img
                src={currentStep.media.url}
                alt="Aperçu"
                style={{ width: '100%', maxHeight: '120px', objectFit: 'cover', borderRadius: '6px', marginTop: '6px' }}
              />
            </div>
          )}
        </div>

        <div className="divider" />

        <div className="field">
          <label className="field-label"><MapPin size={14} /> Position & Caméra</label>
          <div className="field-grid">
            <div>
              <span className="field-hint">Longitude</span>
              <input
                type="number"
                step="0.0001"
                className="input input-sm"
                value={currentStep.camera.center[0]}
                onChange={(e) => updateStep(activeStepIndex, {
                  camera: { ...currentStep.camera, center: [parseFloat(e.target.value) || 0, currentStep.camera.center[1]] },
                })}
              />
            </div>
            <div>
              <span className="field-hint">Latitude</span>
              <input
                type="number"
                step="0.0001"
                className="input input-sm"
                value={currentStep.camera.center[1]}
                onChange={(e) => updateStep(activeStepIndex, {
                  camera: { ...currentStep.camera, center: [currentStep.camera.center[0], parseFloat(e.target.value) || 0] },
                })}
              />
            </div>
          </div>

          <div className="field-grid" style={{ marginTop: '6px' }}>
            <div>
              <span className="field-hint">Zoom : {currentStep.camera.zoom.toFixed(1)}</span>
              <input
                type="range" min="1" max="20" step="0.5" className="range"
                value={currentStep.camera.zoom}
                onChange={(e) => updateStep(activeStepIndex, {
                  camera: { ...currentStep.camera, zoom: parseFloat(e.target.value) },
                })}
              />
            </div>
            <div>
              <span className="field-hint">Inclinaison : {Math.round(currentStep.camera.pitch)}°</span>
              <input
                type="range" min="0" max="60" step="5" className="range"
                value={currentStep.camera.pitch}
                onChange={(e) => updateStep(activeStepIndex, {
                  camera: { ...currentStep.camera, pitch: parseFloat(e.target.value) },
                })}
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
