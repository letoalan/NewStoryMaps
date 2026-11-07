/**
 * StoryMap — Aiguilleur de rendu de bloc documentaire (G07 / G09)
 */

import React from 'react';
import { Block } from '../../types/project';
import { TextBlock } from './blocks/TextBlock';
import { MediaBlock } from './blocks/MediaBlock';
import { TableBlock } from './blocks/TableBlock';
import { MapBlockPreview } from './blocks/MapBlockPreview';

interface BlockRendererProps {
  block: Block;
  onChange: (patch: Record<string, unknown>) => void;
  isEditable?: boolean;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({ block, onChange, isEditable = true }) => {
  if (['title', 'text', 'callout', 'source', 'legend'].includes(block.type)) {
    return <TextBlock block={block} onChange={onChange} isEditable={isEditable} />;
  }
  if (block.type === 'image' || block.type === 'gallery') {
    return <MediaBlock block={block} onChange={onChange} isEditable={isEditable} />;
  }
  if (block.type === 'table') {
    return <TableBlock block={block} onChange={onChange} isEditable={isEditable} />;
  }
  if (block.type === 'map') {
    return <MapBlockPreview block={block} onChange={onChange} isEditable={isEditable} />;
  }
  return <div style={{ padding: '8px' }}>Bloc {block.type}</div>;
};

