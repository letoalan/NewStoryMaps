/**
 * StoryMap — Contexte d'état, historique et persistance sécurisée
 */

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { StoryMap } from '../types/story';
import { Step } from '../types/step';
import { ProjectBrand, ProjectMode } from '../types/project';
import { SaveStatus, StoryContextType } from '../types/context';
import { db } from '../core/db';
import { createDefaultStory } from '../core/defaults';
import { useStoryShortcuts } from './useStoryShortcuts';
import { performAddStep, performDeleteStep, performUpdateStep, performReorderSteps } from './stepOperations';

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
  const revisionRef = useRef<number>(0);
  const savedRevisionRef = useRef<number>(0);
  latestStoryRef.current = story;

  const setStory = (newStory: StoryMap, trackHistory = true) => {
    if (trackHistory && story) {
      historyRef.current.push(story);
      futureRef.current = [];
    }
    revisionRef.current += 1;
    setSaveStatus('dirty');
    setStoryState(newStory);
  };

  const undo = useCallback(() => {
    if (historyRef.current.length === 0 || !story) return;
    const prev = historyRef.current.pop()!;
    futureRef.current.push(story);
    revisionRef.current += 1;
    setSaveStatus('dirty');
    setStoryState(prev);
  }, [story]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0 || !story) return;
    const next = futureRef.current.pop()!;
    historyRef.current.push(story);
    revisionRef.current += 1;
    setSaveStatus('dirty');
    setStoryState(next);
  }, [story]);

  useStoryShortcuts({ saveStatus, undo, redo });

  const persistToDB = useCallback(async (storyToSave: StoryMap, revToSave: number) => {
    setSaveStatus('saving');
    setLastSaveError(null);
    try {
      await db.saveStory(storyToSave);
      savedRevisionRef.current = Math.max(savedRevisionRef.current, revToSave);
      setSaveStatus(revisionRef.current === revToSave ? 'saved' : 'dirty');
    } catch (err) {
      setSaveStatus('error');
      const msg = (err as Error).message || 'Erreur lors de l’enregistrement';
      setLastSaveError(msg);
      throw err;
    }
  }, []);

  const flushSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const current = latestStoryRef.current;
    const currentRev = revisionRef.current;
    if (current && savedRevisionRef.current < currentRev) {
      queueRef.current = queueRef.current.then(() => persistToDB(current, currentRev));
    }
    await queueRef.current;
  }, [persistToDB]);

  useEffect(() => {
    if (!story || savedRevisionRef.current >= revisionRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => {
      const current = latestStoryRef.current;
      const currentRev = revisionRef.current;
      if (current && savedRevisionRef.current < currentRev) {
        queueRef.current = queueRef.current.then(() => persistToDB(current, currentRev));
      }
    }, 1000);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [story, persistToDB]);

  const loadStory = async (id: string) => {
    await flushSave();
    const loaded = await db.getStory(id);
    if (!loaded) throw new Error('Récit introuvable');
    historyRef.current = [];
    futureRef.current = [];
    revisionRef.current = 0;
    savedRevisionRef.current = 0;
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
    revisionRef.current = 0;
    savedRevisionRef.current = 0;
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
    if (!story) return;
    setStory(performUpdateStep(story, index, stepPatch));
  };

  const addStep = () => {
    if (!story) return;
    const { updatedStory, newIndex } = performAddStep(story);
    setStory(updatedStory);
    setActiveStepIndex(newIndex);
  };

  const deleteStep = (index: number) => {
    if (!story) return;
    const { updatedStory, newIndex } = performDeleteStep(story, index, activeStepIndex);
    setStory(updatedStory);
    setActiveStepIndex(newIndex);
  };

  const reorderSteps = (startIndex: number, endIndex: number) => {
    if (!story) return;
    setStory(performReorderSteps(story, startIndex, endIndex));
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
