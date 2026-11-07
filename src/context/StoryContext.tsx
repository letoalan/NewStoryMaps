/**
 * StoryMap — Contexte d'état, historique et persistance
 */

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { StoryMap } from '../types/story';
import { Step } from '../types/step';
import { ProjectBrand, ProjectMode } from '../types/project';
import { SaveStatus, StoryContextType } from '../types/context';
import { db } from '../core/db';
import { createDefaultStory } from '../core/defaults';
import { useStoryShortcuts } from './useStoryShortcuts';

export type { SaveStatus, StoryContextType };

const StoryContext = createContext<StoryContextType | null>(null);

export const StoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [story, setStoryState] = useState<StoryMap | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSaveError, setLastSaveError] = useState<string | null>(null);
  const historyRef = useRef<StoryMap[]>([]);
  const futureRef = useRef<StoryMap[]>([]);
  const saveTimeoutRef = useRef<number | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const latestStoryRef = useRef<StoryMap | null>(null);
  latestStoryRef.current = story;

  const setStory = (newStory: StoryMap, trackHistory = true) => {
    if (trackHistory && story) {
      historyRef.current.push(story);
      futureRef.current = [];
    }
    setSaveStatus('dirty');
    setStoryState(newStory);
  };

  const undo = useCallback(() => {
    if (historyRef.current.length === 0 || !story) return;
    const prev = historyRef.current.pop()!;
    futureRef.current.push(story);
    setSaveStatus('dirty');
    setStoryState(prev);
  }, [story]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0 || !story) return;
    const next = futureRef.current.pop()!;
    historyRef.current.push(story);
    setSaveStatus('dirty');
    setStoryState(next);
  }, [story]);

  useStoryShortcuts({ saveStatus, undo, redo });

  const persistToDB = useCallback(async (storyToSave: StoryMap) => {
    setSaveStatus('saving');
    setLastSaveError(null);
    try {
      await db.saveStory(storyToSave);
      setSaveStatus('saved');
    } catch (err) {
      setSaveStatus('error');
      setLastSaveError((err as Error).message || 'Erreur lors de l’enregistrement');
    }
  }, []);

  const flushSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const current = latestStoryRef.current;
    if (current && saveStatus === 'dirty') {
      queueRef.current = queueRef.current.then(() => persistToDB(current));
      await queueRef.current;
    }
  }, [persistToDB, saveStatus]);

  useEffect(() => {
    if (!story || saveStatus !== 'dirty') return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => {
      const current = latestStoryRef.current;
      if (current) queueRef.current = queueRef.current.then(() => persistToDB(current));
    }, 1000);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [story, saveStatus, persistToDB]);

  const loadStory = async (id: string) => {
    await flushSave();
    const loaded = await db.getStory(id);
    if (!loaded) throw new Error('Récit introuvable');
    historyRef.current = [];
    futureRef.current = [];
    setStoryState(loaded);
    setActiveStepIndex(0);
    setSaveStatus('saved');
    setLastSaveError(null);
  };

  const newStory = async (opts?: string | { title?: string; mode?: ProjectMode; brand?: ProjectBrand }) => {
    await flushSave();
    const created = createDefaultStory();
    if (typeof opts === 'string') {
      if (opts) created.title = opts;
    } else if (opts) {
      if (opts.title) created.title = opts.title;
      if (opts.mode) created.mode = opts.mode;
      if (opts.brand) created.brand = opts.brand;
    }
    historyRef.current = [];
    futureRef.current = [];
    setStoryState(created);
    setActiveStepIndex(0);
    setSaveStatus('saving');
    await db.saveStory(created);
    setSaveStatus('saved');
  };

  const updateStory = (fields: Partial<StoryMap>) => {
    if (!story) return;
    setStory({ ...story, ...fields, modified: Date.now() });
  };

  const updateStep = (index: number, stepPatch: Partial<Step>) => {
    if (!story || !story.steps[index]) return;
    const updated = [...story.steps];
    updated[index] = { ...updated[index], ...stepPatch };
    setStory({ ...story, steps: updated, modified: Date.now() });
  };

  const addStep = () => {
    if (!story) return;
    const last = story.steps[story.steps.length - 1];
    const newStep: Step = {
      id: 'step-' + Date.now(),
      title: 'Nouvelle étape',
      description: '<p>Description de l’étape...</p>',
      camera: last ? { ...last.camera } : { center: [2.3522, 48.8566], zoom: 4, pitch: 0, bearing: 0 },
      markers: [{ coordinates: last ? [...last.camera.center] : [2.3522, 48.8566], style: { color: story.appearance.accentColor || '#0b7fb0' } }],
    };
    setStory({ ...story, steps: [...story.steps, newStep], modified: Date.now() });
    setActiveStepIndex(story.steps.length);
  };

  const deleteStep = (index: number) => {
    if (!story || story.steps.length <= 1) return;
    const steps = story.steps.filter((_, i) => i !== index);
    setStory({ ...story, steps, modified: Date.now() });
    if (activeStepIndex >= steps.length) setActiveStepIndex(Math.max(0, steps.length - 1));
  };

  const reorderSteps = (startIndex: number, endIndex: number) => {
    if (!story) return;
    const steps = [...story.steps];
    const [removed] = steps.splice(startIndex, 1);
    steps.splice(endIndex, 0, removed);
    setStory({ ...story, steps, modified: Date.now() });
    setActiveStepIndex(endIndex);
  };

  return (
    <StoryContext.Provider
      value={{
        story, activeStepIndex, saveStatus, lastSaveError,
        canUndo: historyRef.current.length > 0,
        canRedo: futureRef.current.length > 0,
        undo, redo, setStory, setActiveStepIndex, updateStory,
        updateStoryTitle: (title: string) => updateStory({ title }),
        updateStep, addStep, deleteStep, reorderSteps, flushSave, loadStory, newStory,
      }}
    >
      {children}
    </StoryContext.Provider>
  );
};

export const useStory = () => {
  const context = useContext(StoryContext);
  if (!context) throw new Error('useStory must be used within a StoryProvider');
  return context;
};
