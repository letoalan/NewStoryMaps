/**
 * StoryMap — Aiguilleur de rendu de bloc documentaire (G07 / G09 / N2)
 */

import React from 'react';
import { Block } from '../../types/project';
import { ResolvedVisualStyle, HeroConfig } from '../../types/theme';
import { TextBlock } from './blocks/TextBlock';
import { MediaBlock } from './blocks/MediaBlock';
import { TableBlock } from './blocks/TableBlock';
import { MapBlockPreview } from './blocks/MapBlockPreview';

interface BlockRendererProps {
  block: Block;
  onChange: (patch: Record<string, unknown>) => void;
  isEditable?: boolean;
  visualStyle?: ResolvedVisualStyle;
  hero?: HeroConfig | null;
  onUpdateHero?: (patch: Partial<HeroConfig>) => void;
  subtitle?: string;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({ block, onChange, isEditable = true, visualStyle, hero, onUpdateHero, subtitle }) => {
  if (['title', 'text', 'callout', 'source', 'legend'].includes(block.type)) {
    return <TextBlock block={block} onChange={onChange} isEditable={isEditable} visualStyle={visualStyle} hero={hero} onUpdateHero={onUpdateHero} subtitle={subtitle} />;
  }
  if (block.type === 'image' || block.type === 'gallery') {
    return <MediaBlock block={block} onChange={onChange} isEditable={isEditable} visualStyle={visualStyle} />;
  }
  if (block.type === 'table') {
    return <TableBlock block={block} onChange={onChange} isEditable={isEditable} visualStyle={visualStyle} />;
  }
  if (block.type === 'map') {
    return <MapBlockPreview block={block} onChange={onChange} isEditable={isEditable} visualStyle={visualStyle} />;
  }
  return <div style={{ padding: '8px' }}>Bloc {block.type}</div>;
};
