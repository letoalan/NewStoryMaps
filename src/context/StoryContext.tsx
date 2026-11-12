/**
 * StoryMap — Contexte d'état, historique et persistance sécurisée
 */

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { StoryMap } from '../types/story';
import { Step } from '../types/step';
import { PageFormat } from '../types/grid';
import { SaveStatus, StoryContextType, CreateStoryOptions } from '../types/context';
import { db } from '../core/db';
import { createDefaultStory } from '../core/defaults';
import { PAGE_STRUCTURAL_TEMPLATES } from '../core/layoutTemplates';
import { getGridDimensions } from '../core/grid';
import { createStoryFromCharter } from '../core/graphicCharter';
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
      if (historyRef.current.length > 50) historyRef.current.shift();
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
      setLastSaveError((err as Error).message || 'Erreur lors de l’enregistrement');
      throw err;
    }
  }, []);

  const flushSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const current = latestStoryRef.current, currentRev = revisionRef.current;
    if (current && savedRevisionRef.current < currentRev) {
      queueRef.current = queueRef.current.catch(() => {}).then(() => persistToDB(current, currentRev));
    }
    await queueRef.current;
  }, [persistToDB]);

  useEffect(() => {
    if (!story || savedRevisionRef.current >= revisionRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => {
      const cur = latestStoryRef.current, rev = revisionRef.current;
      if (cur && savedRevisionRef.current < rev) queueRef.current = queueRef.current.catch(() => {}).then(() => persistToDB(cur, rev));
    }, 1000);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [story, persistToDB]);

  const loadStory = async (id: string) => {
    await flushSave();
    const loaded = await db.getStory(id);
    if (!loaded) throw new Error('Récit introuvable');
    historyRef.current = []; futureRef.current = [];
    revisionRef.current = 0; savedRevisionRef.current = 0;
    setStoryState(loaded); setActiveStepIndex(0);
    setSaveStatus('saved'); setLastSaveError(null);
  };

  const newStory = async (opts?: string | CreateStoryOptions) => {
    await flushSave();
    const created = createDefaultStory();
    if (typeof opts === 'string') {
      if (opts) created.title = opts;
    } else if (opts) {
      if (opts.title) created.title = opts.title;
      if (opts.mode) created.mode = opts.mode;
      if (opts.brand) created.brand = opts.brand;
      if (opts.themeTokens) created.themeTokens = opts.themeTokens;
      if (opts.hero) created.hero = opts.hero;
      if (opts.routeAnimation) created.routeAnimation = opts.routeAnimation;
      if (opts.graphicCharter) {
        Object.assign(created, createStoryFromCharter(opts.graphicCharter, opts.mode || 'rich-document'));
        if (opts.title && !opts.title.startsWith('Nouvelle ') && !opts.title.startsWith('Nouveau ')) created.title = opts.title;
      }
      const prim = created.themeTokens?.primaryColor || created.brand?.primaryColor;
      if (prim && !opts.graphicCharter) {
        const hF = created.themeTokens?.headingFont || created.brand?.fontTitle || 'Inter', bF = created.themeTokens?.bodyFont || created.brand?.fontBody || 'Inter';
        created.appearance = { ...created.appearance, accentColor: prim, headingFont: hF, bodyFont: bF, font: (bF as any) || 'Inter', panelBackground: created.themeTokens?.surfaceBackground || '#ffffff', textColor: created.themeTokens?.textColor || '#1a1816', routeColor: prim };
      }
      const fmt: PageFormat = opts.format || 'a4-portrait';
      created.format = fmt;
      if (!opts.graphicCharter && (opts.mode === 'rich-document' || opts.mode === 'brochure')) {
        const dims = getGridDimensions(fmt);
        const tpl = opts.templateId ? PAGE_STRUCTURAL_TEMPLATES.find((t) => t.id === opts.templateId) : undefined;
        const blocks = tpl ? tpl.slots.map((s, idx) => ({ id: `b-${idx + 1}`, type: (s.preferredTypes[0] || 'text') as any, x: s.x, y: s.y, w: s.w, h: s.h, data: s.preferredTypes[0] === 'title' ? { text: created.title, level: 1 } : { text: '' } })) : [
          { id: 'b1', type: 'title' as const, x: 0, y: 0, w: dims.cols, h: 1, data: { text: created.title, level: 1 } },
          { id: 'b2', type: 'text' as const, x: 0, y: 1, w: Math.floor(dims.cols / 2), h: 2, data: { text: created.subtitle || 'Présentation du territoire.' } },
          { id: 'b3', type: 'callout' as const, x: Math.floor(dims.cols / 2), y: 1, w: Math.ceil(dims.cols / 2), h: 2, data: { text: 'Points clés du parcours' } },
        ];
        created.pages = [{ id: 'page-1', title: 'Page 1', hero: opts.hero?.enabled ? opts.hero : undefined, layout: { format: fmt, gridColumns: dims.cols, gridRows: dims.rows, marginMm: dims.marginMm }, blocks }];
      }
    }
    historyRef.current = []; futureRef.current = []; revisionRef.current = 0; savedRevisionRef.current = 0;
    setStoryState(created); setActiveStepIndex(0); setSaveStatus('saving');
    await db.saveStory(created); setSaveStatus('saved');
  };

  const updateStory = (fields: Partial<StoryMap>) => { if (story) setStory({ ...story, ...fields, modified: Date.now() }); };
  const updateStep = (index: number, stepPatch: Partial<Step>) => { if (story) setStory(performUpdateStep(story, index, stepPatch)); };
  const addStep = () => {
    if (!story) return;
    const { updatedStory, newIndex } = performAddStep(story);
    setStory(updatedStory); setActiveStepIndex(newIndex);
  };
  const deleteStep = (index: number) => {
    if (!story) return;
    const { updatedStory, newIndex } = performDeleteStep(story, index, activeStepIndex);
    setStory(updatedStory); setActiveStepIndex(newIndex);
  };
  const reorderSteps = (start: number, end: number) => {
    if (!story) return;
    setStory(performReorderSteps(story, start, end)); setActiveStepIndex(end);
  };

  return (
    <StoryContext.Provider
      value={{
        story, activeStepIndex, saveStatus, lastSaveError,
        canUndo: historyRef.current.length > 0, canRedo: futureRef.current.length > 0,
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
