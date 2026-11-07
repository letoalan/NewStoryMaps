/**
 * StoryMap — Volet latéral gauche : Plan / Étapes
 */

import React from 'react';
import { useStory } from '../../context/StoryContext';
import { Plus, Trash2, ArrowUp, ArrowDown, MapPin } from 'lucide-react';

export const Outline: React.FC = () => {
  const { story, activeStepIndex, setActiveStepIndex, addStep, deleteStep, reorderSteps } = useStory();

  if (!story) return null;

  return (
    <aside className="outline">
      <div className="panel-head">
        <h2 className="panel-title">
          <MapPin size={16} color="var(--accent)" />
          <span>Étapes du récit ({story.steps.length})</span>
        </h2>
        <button className="btn btn-ghost btn-xs btn-icon" onClick={addStep} title="Ajouter une étape">
          <Plus size={16} />
        </button>
      </div>

      <div className="ol-list scroll">
        {story.steps.map((step, idx) => {
          const isSelected = idx === activeStepIndex;
          return (
            <div
              key={step.id}
              className="ol-item"
              aria-selected={isSelected}
              onClick={() => setActiveStepIndex(idx)}
            >
              <span className="ol-num">{idx + 1}</span>

              <div className="ol-text">
                <span className={`ol-title ${!step.title ? 'untitled' : ''}`}>
                  {step.title || 'Sans titre'}
                </span>
                <span className="ol-meta">
                  {step.camera.center[1].toFixed(3)}°, {step.camera.center[0].toFixed(3)}°
                </span>
              </div>

              <div className="ol-more" onClick={(e) => e.stopPropagation()}>
                {idx > 0 && (
                  <button
                    className="btn btn-ghost btn-xs btn-icon"
                    title="Monter"
                    onClick={() => reorderSteps(idx, idx - 1)}
                  >
                    <ArrowUp size={12} />
                  </button>
                )}
                {idx < story.steps.length - 1 && (
                  <button
                    className="btn btn-ghost btn-xs btn-icon"
                    title="Descendre"
                    onClick={() => reorderSteps(idx, idx + 1)}
                  >
                    <ArrowDown size={12} />
                  </button>
                )}
                {story.steps.length > 1 && (
                  <button
                    className="btn btn-ghost btn-xs btn-icon"
                    title="Supprimer l’étape"
                    onClick={() => {
                      if (confirm(`Supprimer l'étape ${idx + 1} ?`)) {
                        deleteStep(idx);
                      }
                    }}
                  >
                    <Trash2 size={12} color="var(--danger)" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="ol-foot">
        <button className="btn btn-soft btn-block" onClick={addStep}>
          <Plus size={15} />
          <span>Ajouter une étape</span>
        </button>
      </div>
    </aside>
  );
};

