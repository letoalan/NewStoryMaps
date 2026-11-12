import assert from 'node:assert';
import { getGridDimensions, isRectValid, hasCollision } from '../src/core/grid.ts';
import { resolveVisualStyle, extractProjectThemeTokens } from '../src/core/themeResolver.ts';

console.log('--- Test Porte R6 : Géométrie, Hero et Ergonomie transversale ---');

// 1. R6.1 & R6.2 : Dimensions physiques et géométrie de grille par format
{
  const formats = ['a4-portrait', 'a4-landscape', 'screen-16-9', 'responsive'];
  for (const fmt of formats) {
    const dims = getGridDimensions(fmt);
    assert.ok(dims.cols > 0 && dims.rows > 0, `Cols et rows valides pour ${fmt}`);
    assert.ok(dims.cellWidthPx > 0 && dims.cellHeightPx > 0, `Cellules positives pour ${fmt}`);
    assert.ok(dims.gapPx > 0, `Gouttière positive pour ${fmt}`);
    assert.ok(dims.marginMm > 0, `Marges physiques positives pour ${fmt}`);
  }

  // Vérifier ratio 16/9 physique
  const s169 = getGridDimensions('screen-16-9');
  assert.strictEqual(s169.aspectRatio, '16 / 9');
  assert.strictEqual(s169.cols, 8);
  assert.strictEqual(s169.rows, 5);

  // Vérifier A4 portrait & paysage
  const a4p = getGridDimensions('a4-portrait');
  assert.strictEqual(a4p.aspectRatio, '210 / 297');
  assert.strictEqual(a4p.physicalWidthMm, 210);
  assert.strictEqual(a4p.physicalHeightMm, 297);

  const a4l = getGridDimensions('a4-landscape');
  assert.strictEqual(a4l.aspectRatio, '297 / 210');
  assert.strictEqual(a4l.physicalWidthMm, 297);
  assert.strictEqual(a4l.physicalHeightMm, 210);

  console.log('✅ R6.1 / R6.2 : Dimensions physiques, ratios et géométrie de grille vérifiés');
}

// 2. R6.2 : Détection des collisions et validité des formes
{
  const blocks = [
    { id: 'b1', type: 'text', x: 0, y: 0, w: 4, h: 2, data: {} },
    { id: 'b2', type: 'map', x: 4, y: 0, w: 2, h: 4, data: {} },
  ];

  // Forme valide dans les bornes (aire paire 4x2=8)
  assert.strictEqual(isRectValid({ x: 0, y: 0, w: 4, h: 2 }, 6, 8), true);

  // Forme invalide (déborde de la grille x+w > cols)
  assert.strictEqual(isRectValid({ x: 4, y: 0, w: 4, h: 2 }, 6, 8), false);

  // Collision détectée
  assert.strictEqual(hasCollision({ x: 2, y: 1, w: 3, h: 2 }, blocks), true);

  // Pas de collision dans un espace libre
  assert.strictEqual(hasCollision({ x: 0, y: 2, w: 4, h: 2 }, blocks), false);

  console.log('✅ R6.2 : Contrôle des débordements et collisions validé');
}

// 3. R6.4 & R6.5 : Cohérence des thèmes, profils et exceptions locales
{
  const project = {
    title: 'Atlas Test',
    themeTokens: {
      primaryColor: '#0f172a',
      secondaryColor: '#38bdf8',
      accentColor: '#0b7fb0',
      textColor: '#f8fafc',
      pageBackground: '#020617',
      surfaceBackground: '#1e293b',
      headingFont: 'Cinzel',
      bodyFont: 'Inter',
      radiusPx: 4,
    },
  };

  // Résolution normale au niveau page
  const pageStyle = resolveVisualStyle(project, null, null, 'web-interactive');
  assert.strictEqual(pageStyle.primaryColor, '#0f172a');
  assert.strictEqual(pageStyle.textColor, '#f8fafc');
  assert.strictEqual(pageStyle.pageBackground, '#020617');

  // Résolution avec exception locale sur un bloc
  const blockWithOverride = {
    id: 'b-custom',
    type: 'callout',
    x: 0, y: 0, w: 2, h: 2,
    data: { text: 'Alerte' },
    styleOverride: {
      styleMode: 'custom',
      accentColor: '#fbbf24',
      backgroundColor: '#881337',
    },
  };

  const customStyle = resolveVisualStyle(project, null, blockWithOverride, 'web-interactive');
  assert.strictEqual(customStyle.accentColor, '#fbbf24', 'L’override local d’accent doit prévaloir');
  assert.strictEqual(customStyle.surfaceBackground, '#881337', 'L’override de fond doit prévaloir');

  // Héritage ('inherit') supprime l’override et restaure les tokens globaux
  const blockInherited = {
    ...blockWithOverride,
    styleOverride: { styleMode: 'inherit' },
  };
  const inheritedStyle = resolveVisualStyle(project, null, blockInherited, 'web-interactive');
  assert.strictEqual(inheritedStyle.accentColor, '#0b7fb0', 'Mode inherit doit reprendre les tokens du projet');

  console.log('✅ R6.4 / R6.5 : Thème global, héritage et exceptions locales validés');
}

console.log('Tous les tests de la Porte R6 sont validés avec succès !');
