/**
 * StoryMap — Composant racine de l'application
 */

import React, { useState } from 'react';
import { StoryProvider, useStory } from './context/StoryContext';
import { Dashboard } from './components/dashboard/Dashboard';
import { Editor } from './components/editor/Editor';
import { Player } from './components/player/Player';
import { ProjectBrand, ProjectMode } from './types/project';

type AppView = 'dashboard' | 'editor' | 'player';

const AppContent: React.FC = () => {
  const [view, setView] = useState<AppView>('dashboard');
  const { loadStory, newStory } = useStory();

  const handleOpenStory = async (id: string) => {
    await loadStory(id);
    setView('editor');
  };

  const handlePlayStory = async (id: string) => {
    await loadStory(id);
    setView('player');
  };

  const handleNewStory = (opts?: string | { title?: string; mode?: ProjectMode; brand?: ProjectBrand }) => {
    newStory(opts);
    setView('editor');
  };

  if (view === 'player') {
    return <Player onExit={() => setView('dashboard')} />;
  }

  if (view === 'editor') {
    return (
      <Editor
        onBack={() => setView('dashboard')}
        onPlay={() => setView('player')}
      />
    );
  }

  return (
    <Dashboard
      onOpenStory={handleOpenStory}
      onPlayStory={handlePlayStory}
      onNewStory={handleNewStory}
    />
  );
};

export const App: React.FC = () => {
  return (
    <StoryProvider>
      <AppContent />
    </StoryProvider>
  );
};

export default App;
