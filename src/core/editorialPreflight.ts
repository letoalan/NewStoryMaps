/**
 * StoryMap — Contrôle prévol technique et éditorial honnête pour PAO & Brochure (Mode 3 / M7)
 */

import type { Page } from '../types/project';
import type { PublicationIssue } from '../types/editorial';
import { calculateEffectiveDpi } from './editorialLayout';

export function runEditorialPreflight(pages: Page[]): {
  issues: PublicationIssue[];
  hasErrors: boolean;
  warningsCount: number;
} {
  const issues: PublicationIssue[] = [];

  pages.forEach((page, pIdx) => {
    const cols = page.layout.gridColumns || 8;
    const rows = page.layout.gridRows || 12;

    page.blocks.forEach((b) => {
      // 1. Contrôle des débordements physiques hors grille (Erreur mesurée)
      if (b.x < 0 || b.y < 0 || b.x + b.w > cols || b.y + b.h > rows) {
        issues.push({
          id: `overflow-${b.id}`,
          level: 'error',
          pageIndex: pIdx,
          blockId: b.id,
          message: `Le bloc "${b.type}" (${b.id}) dépasse les limites de la page (${cols}x${rows}).`,
          evidence: 'measured',
          remediation: 'Redimensionner ou replacer le bloc à l’intérieur de la grille utile.',
        });
      }

      // 2. Contrôle de scène cartographique manquante (Erreur mesurée)
      if (b.type === 'map') {
        const mapId = b.data?.mapId as string | undefined;
        if (!mapId && b.binding && !b.binding.mapId) {
          issues.push({
            id: `missing-map-${b.id}`,
            level: 'warning',
            pageIndex: pIdx,
            blockId: b.id,
            message: `Le bloc carte "${b.id}" n’a aucune scène cartographique sélectionnée.`,
            evidence: 'measured',
            remediation: 'Associer une scène cartographique valide dans l’inspecteur.',
          });
        }
      }

      // 3. Contrôle de résolution d'image / DPI faible (Avertissement mesuré ou heuristique)
      if (b.type === 'image') {
        const url = b.data?.url as string | undefined;
        if (!url) {
          issues.push({
            id: `empty-image-${b.id}`,
            level: 'warning',
            pageIndex: pIdx,
            blockId: b.id,
            message: `Le bloc image "${b.id}" n’a aucun média renseigné.`,
            evidence: 'measured',
            remediation: 'Choisir ou importer une photographie.',
          });
        } else if (b.imageCrop?.naturalWidth && b.imageCrop?.naturalHeight) {
          const blockWidthMm = (b.w / cols) * 190; // Estimation A4
          const blockHeightMm = (b.h / rows) * 270;
          const { dpi, quality } = calculateEffectiveDpi(
            b.imageCrop.naturalWidth,
            b.imageCrop.naturalHeight,
            blockWidthMm,
            blockHeightMm,
            b.imageCrop
          );
          if (quality === 'low') {
            issues.push({
              id: `low-dpi-${b.id}`,
              level: 'warning',
              pageIndex: pIdx,
              blockId: b.id,
              message: `Définition faible sur l’image (${dpi} DPI à l’échelle d’impression).`,
              evidence: 'measured',
              remediation: 'Utiliser une image de résolution supérieure ou réduire le cadre.',
            });
          }
        }
      }

      // 4. Contrôle de titre vide (Avertissement)
      if (b.type === 'title') {
        const titleText = (b.data?.title as string | undefined)?.trim();
        if (!titleText) {
          issues.push({
            id: `empty-title-${b.id}`,
            level: 'warning',
            pageIndex: pIdx,
            blockId: b.id,
            message: `Le bloc titre "${b.id}" est vide.`,
            evidence: 'measured',
            remediation: 'Saisir un titre ou supprimer le bloc inutilisé.',
          });
        }
      }
    });

    // 5. Contrôle de Hero vidéo sans poster statique obligatoire pour impression A4 (M7.03)
    if (page.hero && page.hero.enabled && page.hero.mediaType === 'video' && !page.hero.posterUrl) {
      issues.push({
        id: `hero-missing-poster-${page.id}`,
        level: 'error',
        pageIndex: pIdx,
        message: `La couverture Hero vidéo de la page "${page.title}" nécessite un poster statique obligatoire pour l’impression A4.`,
        evidence: 'measured',
        remediation: 'Renseigner une image de repli (posterUrl) dans les paramètres du Hero.',
      });
    }
  });

  const hasErrors = issues.some((i) => i.level === 'error');
  const warningsCount = issues.filter((i) => i.level === 'warning').length;

  return { issues, hasErrors, warningsCount };
}
