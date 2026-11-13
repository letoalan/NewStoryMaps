/**
 * StoryMap — Analyseur et importateur CSV pour étapes et récits (Mode 1)
 */

import type { Step } from '../types/step';
import type { StoryMap } from '../types/story';
import { createNewStory } from './defaults';

export function parseCSVRows(csvText: string): string[][] {
  if (!csvText || typeof csvText !== 'string') return [];
  const firstLine = csvText.split(/\r?\n/)[0] || '';
  const countComma = (firstLine.match(/,/g) || []).length;
  const countSemi = (firstLine.match(/;/g) || []).length;
  const countTab = (firstLine.match(/\t/g) || []).length;
  const delim = countTab > countComma && countTab > countSemi ? '\t' : countSemi > countComma ? ';' : ',';

  const rows: string[][] = [];
  let currentRow: string[] = [], currentCell = '', insideQuote = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i], nextCh = csvText[i + 1];
    if (insideQuote) {
      if (ch === '"') {
        if (nextCh === '"') { currentCell += '"'; i++; }
        else insideQuote = false;
      } else currentCell += ch;
    } else {
      if (ch === '"') insideQuote = true;
      else if (ch === delim) { currentRow.push(currentCell.trim()); currentCell = ''; }
      else if (ch === '\r') {
        if (nextCh === '\n') i++;
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c.length > 0)) rows.push(currentRow);
        currentRow = []; currentCell = '';
      } else if (ch === '\n') {
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c.length > 0)) rows.push(currentRow);
        currentRow = []; currentCell = '';
      } else currentCell += ch;
    }
  }
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) rows.push(currentRow);
  }
  return rows;
}

export function parseCSVToSteps(csvContent: string): Step[] {
  const rows = parseCSVRows(csvContent);
  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  let titleIdx = header.findIndex((h) => /^(titre|title|nom|name|lieu|label)$/i.test(h));
  let latIdx = header.findIndex((h) => /^(lat|latitude|y)$/i.test(h));
  let lngIdx = header.findIndex((h) => /^(lng|lon|long|longitude|x)$/i.test(h));
  let zoomIdx = header.findIndex((h) => /^(zoom|z|echelle|scale)$/i.test(h));
  let descIdx = header.findIndex((h) => /^(desc|description|texte|text|resume|content)$/i.test(h));
  let mediaIdx = header.findIndex((h) => /^(image|img|photo|media|illustration|url|picture)$/i.test(h));

  let startRow = 1;
  if (latIdx === -1 || lngIdx === -1) {
    if (rows[0].length >= 4 && (!isNaN(parseFloat(rows[0][2])) || !isNaN(parseFloat(rows[0][3])))) {
      startRow = 0; titleIdx = 1; latIdx = 2; lngIdx = 3; zoomIdx = 4; descIdx = 5; mediaIdx = 6;
    } else {
      for (let c = 0; c < (rows[1] || []).length; c++) {
        const val = parseFloat((rows[1][c] || '').replace(',', '.'));
        if (!isNaN(val)) {
          if (val >= -90 && val <= 90 && latIdx === -1) latIdx = c;
          else if (val >= -180 && val <= 180 && lngIdx === -1) lngIdx = c;
        }
      }
      if (titleIdx === -1) titleIdx = 0;
    }
  }

  const steps: Step[] = [];
  const parseNum = (v?: string): number => (v ? parseFloat(v.replace(',', '.')) : NaN);

  for (let i = startRow; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0 || r.every((c) => !c)) continue;
    let lat = latIdx >= 0 ? parseNum(r[latIdx]) : NaN;
    let lng = lngIdx >= 0 ? parseNum(r[lngIdx]) : NaN;
    if (isNaN(lat) || lat < -90 || lat > 90) lat = 48.8566;
    if (isNaN(lng) || lng < -180 || lng > 180) lng = 2.3522;
    const rawZoom = zoomIdx >= 0 ? parseNum(r[zoomIdx]) : NaN;
    const zoom = !isNaN(rawZoom) && rawZoom >= 1 && rawZoom <= 22 ? rawZoom : 10;
    const title = titleIdx >= 0 && r[titleIdx] ? r[titleIdx] : `Étape ${steps.length + 1}`;
    const desc = descIdx >= 0 && r[descIdx] ? r[descIdx] : '';
    const mediaUrl = mediaIdx >= 0 && r[mediaIdx] ? r[mediaIdx] : '';

    steps.push({
      id: `step-csv-${Date.now()}-${steps.length + 1}`,
      title,
      description: desc.startsWith('<') ? desc : `<p>${desc}</p>`,
      camera: {
        center: [Number(lng.toFixed(6)), Number(lat.toFixed(6))],
        zoom: Number(zoom.toFixed(1)),
        pitch: 0,
        bearing: 0,
      },
      markers: [{ coordinates: [Number(lng.toFixed(6)), Number(lat.toFixed(6))] }],
      media: mediaUrl ? { type: 'image', url: mediaUrl } : undefined,
    });
  }

  return steps;
}

export function parseStoryCSV(csvContent: string, defaultTitle?: string): StoryMap {
  const steps = parseCSVToSteps(csvContent);
  const story = createNewStory(defaultTitle || 'StoryMap importée');
  story.mode = 'storymap';
  if (steps.length > 0) story.steps = steps;
  return story;
}
