/**
 * StoryMap — Contexte React pour l'état d'édition avec Undo/Redo
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { StoryMap } from '../types/story';
import { StoryStep } from '../types/step';
import { db } from '../core/db';
import { createDefaultStep, createDefaultStory } from '../core/defaults';

interface StoryContextType {
  story: StoryMap | null;
  activeStepIndex: number;
  isSaving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  setStory: (story: StoryMap) => void;
  setActiveStepIndex: (index: number) => void;
  updateStory: (fields: Partial<StoryMap>) => void;
  updateStoryTitle: (title: string) => void;
  updateStep: (index: number, step: Partial<StoryStep>) => void;
  addStep: () => void;
  deleteStep: (index: number) => void;
  reorderSteps: (startIndex: number, endIndex: number) => void;
  saveCurrentStory: () => Promise<void>;
  loadStory: (id: string) => Promise<void>;
  newStory: (customTitle?: string) => void;
}

const StoryContext = createContext<StoryContextType | null>(null);

export const StoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [story, setStoryState] = useState<StoryMap | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const historyRef = useRef<StoryMap[]>([]);
  const futureRef = useRef<StoryMap[]>([]);

  const setStory = (newStory: StoryMap, trackHistory = true) => {
    if (trackHistory && story) {
      historyRef.current.push(story);
      futureRef.current = [];
    }
    setStoryState(newStory);
  };

  const undo = () => {
    if (historyRef.current.length === 0 || !story) return;
    const prev = historyRef.current.pop()!;
    futureRef.current.push(story);
    setStoryState(prev);
  };

  const redo = () => {
    if (futureRef.current.length === 0 || !story) return;
    const next = futureRef.current.pop()!;
    historyRef.current.push(story);
    setStoryState(next);
  };

  const saveCurrentStory = useCallback(async () => {
    if (!story) return;
    setIsSaving(true);
    try {
      await db.saveStory(story);
    } finally {
      setIsSaving(false);
    }
  }, [story]);

  // Sauvegarde automatique temporisée
  useEffect(() => {
    if (!story) return;
    const timer = setTimeout(() => {
      saveCurrentStory();
    }, 1200);
    return () => clearTimeout(timer);
  }, [story, saveCurrentStory]);

  // Raccourcis clavier Undo / Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const loadStory = async (id: string) => {
    const loaded = await db.getStory(id);
    if (loaded) {
      historyRef.current = [];
      futureRef.current = [];
      setStoryState(loaded);
      setActiveStepIndex(0);
    }
  };

  const newStory = (customTitle?: string) => {
    const created = createDefaultStory();
    if (customTitle) created.title = customTitle;
    historyRef.current = [];
    futureRef.current = [];
    setStoryState(created);
    setActiveStepIndex(0);
    db.saveStory(created);
  };

  const updateStory = (fields: Partial<StoryMap>) => {
    if (!story) return;
    setStory({ ...story, ...fields, modified: Date.now() });
  };

  const updateStoryTitle = (title: string) => {
    updateStory({ title });
  };

  const updateStep = (index: number, updatedFields: Partial<StoryStep>) => {
    if (!story || !story.steps[index]) return;
    const steps = [...story.steps];
    steps[index] = { ...steps[index], ...updatedFields };
    setStory({ ...story, steps, modified: Date.now() });
  };

  const addStep = () => {
    if (!story) return;
    const newStepItem = createDefaultStep(story.steps.length + 1);
    const steps = [...story.steps, newStepItem];
    setStory({ ...story, steps, modified: Date.now() });
    setActiveStepIndex(steps.length - 1);
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
        story,
        activeStepIndex,
        isSaving,
        canUndo: historyRef.current.length > 0,
        canRedo: futureRef.current.length > 0,
        undo,
        redo,
        setStory,
        setActiveStepIndex,
        updateStory,
        updateStoryTitle,
        updateStep,
        addStep,
        deleteStep,
        reorderSteps,
        saveCurrentStory,
        loadStory,
        newStory,
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
