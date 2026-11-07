/**
 * StoryMap — Types du mode Tableur (Sheet)
 */

export interface SheetColumn {
  id: string;
  label: string;
  width?: number;
  readOnly?: boolean;
}

export type SheetViewMode = 'canvas' | 'sheet';

export interface SheetRowData {
  id: string;
  index: number;
  title: string;
  lat: number;
  lng: number;
  zoom: number;
  pitch: number;
  bearing: number;
  description: string;
  mediaUrl: string;
}

