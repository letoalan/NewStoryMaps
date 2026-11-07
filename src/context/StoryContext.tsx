/**
 * StoryMap — Contexte React pour l'état d'édition avec Undo/Redo & Sauvegarde sérialisée
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { StoryMap } from '../types/story';
import { Step } from '../types/step';
import { db } from '../core/db';
import { createDefaultStep, createDefaultStory } from '../core/defaults';

export type SaveStatus = 'saved' | 'saving' | 'dirty' | 'error';

interface StoryContextType {
  story: StoryMap | null;
  activeStepIndex: number;
  saveStatus: SaveStatus;
  lastSaveError: string | null;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  setStory: (story: StoryMap) => void;
  setActiveStepIndex: (index: number) => void;
  updateStory: (fields: Partial<StoryMap>) => void;
  updateStoryTitle: (title: string) => void;
  updateStep: (index: number, step: Partial<Step>) => void;
  addStep: () => void;
  deleteStep: (index: number) => void;
  reorderSteps: (startIndex: number, endIndex: number) => void;
  flushSave: () => Promise<void>;
  loadStory: (id: string) => Promise<void>;
  newStory: (customTitle?: string) => void;
}

const StoryContext = createContext<StoryContextType | null>(null);

export const StoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [story, setStoryState] = useState<StoryMap | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSaveError, setLastSaveError] = useState<string | null>(null);

  const historyRef = useRef<StoryMap[]>([]);
  const futureRef = useRef<StoryMap[]>([]);
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

  const undo = () => {
    if (historyRef.current.length === 0 || !story) return;
    const prev = historyRef.current.pop()!;
    futureRef.current.push(story);
    setSaveStatus('dirty');
    setStoryState(prev);
  };

  const redo = () => {
    if (futureRef.current.length === 0 || !story) return;
    const next = futureRef.current.pop()!;
    historyRef.current.push(story);
    setSaveStatus('dirty');
    setStoryState(next);
  };

  const flushSave = useCallback(async () => {
    const toSave = latestStoryRef.current;
    if (!toSave) return;
    setSaveStatus('saving');
    queueRef.current = queueRef.current
      .then(async () => {
        await db.saveStory(toSave);
        setSaveStatus('saved');
        setLastSaveError(null);
      })
      .catch((err) => {
        setSaveStatus('error');
        setLastSaveError(err.message || 'Erreur de sauvegarde');
      });
    await queueRef.current;
  }, []);

  useEffect(() => {
    if (!story || saveStatus !== 'dirty') return;
    const timer = setTimeout(() => { flushSave(); }, 1200);
    return () => clearTimeout(timer);
  }, [story, saveStatus, flushSave]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTargetInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName);
      if (isTargetInput) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) redo(); else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const loadStory = async (id: string) => {
    await flushSave();
    const loaded = await db.getStory(id);
    if (loaded) {
      historyRef.current = [];
      futureRef.current = [];
      setStoryState(loaded);
      setActiveStepIndex(0);
      setSaveStatus('saved');
    }
  };

  const newStory = async (customTitle?: string) => {
    await flushSave();
    const created = createDefaultStory();
    if (customTitle) created.title = customTitle;
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

  const updateStep = (index: number, updatedFields: Partial<Step>) => {
    if (!story || !story.steps[index]) return;
    const steps = [...story.steps];
    steps[index] = { ...steps[index], ...updatedFields };
    setStory({ ...story, steps, modified: Date.now() });
  };

  const addStep = () => {
    if (!story) return;
    const newStepItem = createDefaultStep(story.steps.length + 1);
    setStory({ ...story, steps: [...story.steps, newStepItem], modified: Date.now() });
    setActiveStepIndex(story.steps.length);
  };

  const deleteStep = (index: number) => {
    if (!story || story.steps.length <= 1) return;
    const steps = story.steps.filter((_, i) => i !== index);
    setStory({ ...story, steps, modified: Date.now() });
    if (activeStepIndex >= steps.length) {
      setActiveStepIndex(Math.max(0, steps.length - 1));
    }
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
