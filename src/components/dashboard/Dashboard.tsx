/**
 * StoryMap — Tableau de bord des récits
 */

import React, { useState, useEffect } from 'react';
import { StoryListItem } from '../../types/story';
import { db } from '../../core/db';
import { StoryCard } from './StoryCard';
import { Header } from '../common/Header';
import { Plus, Upload, Search, Map, BookOpen, Archive } from 'lucide-react';
import { parseStoryFile, exportAllStoriesBackupZip } from '../../core/io';
import { EXAMPLE_STORY } from '../../data/exampleStory';
import { NewStoryModal } from '../dialogs/NewStoryModal';

interface DashboardProps {
  onOpenStory: (id: string) => void;
  onPlayStory: (id: string) => void;
  onNewStory: (customTitle?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenStory, onPlayStory, onNewStory }) => {
  const [stories, setStories] = useState<StoryListItem[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      setStories(await db.getAllStories());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const handleDelete = async (id: string) => {
    await db.deleteStory(id);
    await loadAll();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await parseStoryFile(file);
      for (const story of imported) await db.saveStory(story);
      await loadAll();
    } catch (err) {
      alert('Erreur lors de l’import : ' + (err as Error).message);
    } finally {
      e.target.value = '';
    }
  };

  const handleBackupAll = async () => {
    if (stories.length === 0) return;
    const full = await Promise.all(stories.map(async (s) => (await db.getStory(s.id))!));
    await exportAllStoriesBackupZip(full.filter(Boolean));
  };

  const handleLoadExample = async () => {
    await db.saveStory(EXAMPLE_STORY);
    await loadAll();
  };

  const filtered = stories.filter((s) =>
    s.title.toLowerCase().includes(filter.toLowerCase()) ||
    (s.subtitle && s.subtitle.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="dash">
      <Header onNewStory={onNewStory} />
      <main className="dash-main">
        <div className="dash-head">
          <div>
            <h1 className="dash-title">
              Mes StoryMaps <span className="count">({stories.length})</span>
            </h1>
            <p className="dash-sub">
              Créez, éditez et partagez des récits multimédias interactifs géolocalisés.
            </p>
          </div>
          <div className="dash-actions">
            <button className="btn btn-ghost" onClick={handleLoadExample} title="Charger le récit d'exemple">
              <BookOpen size={16} /> <span>Exemple</span>
            </button>
            <button className="btn btn-ghost" onClick={handleBackupAll} title="Sauvegarder tout en archive ZIP" disabled={stories.length === 0}>
              <Archive size={16} /> <span>Sauvegarder tout</span>
            </button>
            <label className="btn btn-ghost" style={{ cursor: 'pointer' }} title="Importer un fichier .json, .html ou archive .zip">
              <Upload size={16} /> <span>Importer</span>
              <input type="file" accept=".json,.html,.htm,.zip,application/json,text/html,application/zip" onChange={handleImport} style={{ display: 'none' }} />
            </label>
            <button className="btn btn-primary" onClick={() => setIsNewModalOpen(true)}>
              <Plus size={16} /> <span>Nouvelle StoryMap</span>
            </button>
          </div>
        </div>

        <div className="dash-toolbar">
          <div className="input-affix">
            <Search size={16} className="icon" />
            <input
              type="text"
              className="input"
              placeholder="Rechercher un récit…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-3)' }}>
            Chargement de vos récits…
          </div>
        ) : filtered.length === 0 ? (
          <div className="dash-empty">
            <div>
              <h2>{filter ? 'Aucun résultat trouvé' : 'Commencez votre premier récit'}</h2>
              <p>
                StoryMap vous permet de concevoir des parcours guidés combinant cartes interactives,
                points d’intérêt, descriptions et photographies.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => setIsNewModalOpen(true)}>
                  <Plus size={16} /> Créer un premier récit
                </button>
                <button className="btn btn-ghost" onClick={handleLoadExample}>
                  <BookOpen size={16} /> Découvrir l'exemple
                </button>
              </div>
            </div>
            <div className="dash-empty-art" style={{ display: 'grid', placeItems: 'center', background: 'var(--surface-3)' }}>
              <Map size={84} opacity={0.3} color="var(--accent)" />
            </div>
          </div>
        ) : (
          <div className="story-grid">
            <div className="story-card new-card" onClick={() => setIsNewModalOpen(true)}>
              <div className="new-card-icon"><Plus size={24} /></div>
              <strong>Nouveau récit</strong>
              <span>Créer une nouvelle storymap</span>
            </div>
            {filtered.map((item) => (
              <StoryCard
                key={item.id}
                item={item}
                onOpen={onOpenStory}
                onPlay={onPlayStory}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      <NewStoryModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreate={(title) => onNewStory(title)}
      />
    </div>
  );
};
