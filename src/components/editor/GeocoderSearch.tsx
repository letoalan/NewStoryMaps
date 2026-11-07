/**
 * StoryMap — Barre de recherche et de géocodage de lieux
 */

import React, { useState } from 'react';
import { Search, MapPin } from 'lucide-react';
import { searchPlaces, GeoSearchResult } from '../../core/geocoder';

interface GeocoderSearchProps {
  onSelectPlace: (result: GeoSearchResult) => void;
}

export const GeocoderSearch: React.FC<GeocoderSearchProps> = ({ onSelectPlace }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeoSearchResult[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      const results = await searchPlaces(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error('Erreur recherche de lieu:', err);
    }
  };

  const handleSelect = (r: GeoSearchResult) => {
    onSelectPlace(r);
    setSearchResults([]);
    setSearchQuery('');
  };

  return (
    <form onSubmit={handleSearch} style={{ position: 'relative', width: '260px' }}>
      <div className="input-affix">
        <Search size={14} className="icon" />
        <input
          type="text"
          className="input input-sm"
          placeholder="Chercher un lieu, une ville…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      {searchResults.length > 0 && (
        <div className="geo-results open" style={{ top: '34px', width: '320px' }}>
          {searchResults.map((r, i) => (
            <div key={i} className="geo-item" onClick={() => handleSelect(r)}>
              <MapPin size={14} className="icon" />
              <div className="geo-text">
                <div className="geo-label">{r.name}</div>
                <div className="geo-sub">{r.displayName}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </form>
  );
};

