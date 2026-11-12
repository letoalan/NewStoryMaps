/**
 * Test reproducteur et validation R1 : callback attachLineVehicle et déclaration de t (R1.1 à R1.4)
 */

import assert from 'node:assert';
import vm from 'node:vm';
import { createCanonicalMode2TerritorialDoc } from '../src/core/canonicalFixtures.ts';
import { generateDocumentHTML } from '../src/core/publishDocument.ts';

console.log('=== TEST REPRODUCTEUR R1 : EXÉCUTION DU CALLBACK ATTACHLINEVEHICLE ===\n');

const doc = createCanonicalMode2TerritorialDoc();
const html = generateDocumentHTML(doc);
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/i);
assert.ok(scriptMatch, 'Script runtime trouvé dans le document publié');
const runtimeScript = scriptMatch[1];

// Environnement simulé avec capture des timers setInterval
const intervals = [];
const markers = [];
const jumps = [];

const mockMarker = {
  setLngLat(lngLat) {
    this.pos = lngLat;
    return this;
  },
  addTo() {
    markers.push(this);
    return this;
  },
};

const mockMap = {
  getZoom: () => 12,
  on: function(evt, cb) {
    if (evt === 'load') cb();
  },
  jumpTo: (opt) => jumps.push(opt),
  addSource: () => {},
  addLayer: () => {},
};

const sandbox = {
  window: {
    matchMedia: () => ({ matches: false }),
    addEventListener: () => {},
  },
  document: {
    hidden: false,
    fullscreenElement: null,
    documentElement: { requestFullscreen: async () => {} },
    getElementById: (id) => {
      if (id === 'storymap-data') return { textContent: JSON.stringify(doc) };
      return {
        id,
        disabled: false,
        textContent: '',
        innerHTML: '',
        style: { display: 'block' },
        classList: { toggle: () => {} },
        setAttribute: () => {},
        removeAttribute: () => {},
        appendChild: (c) => c,
      };
    },
    querySelectorAll: (sel) => {
      if (sel === '.doc-map-canvas') {
        return [{
          id: 'doc-map-seine',
          getAttribute: (name) => {
            if (name === 'data-map-id') return 'map-seine';
            if (name === 'data-target-feature') return null;
            return null;
          },
          setAttribute: () => {},
        }];
      }
      return [];
    },
    createElement: (tag) => ({
      tagName: tag.toUpperCase(),
      className: '',
      style: { cssText: '', transform: '' },
      appendChild: (c) => c,
      setAttribute: () => {},
      getAttribute: () => null,
    }),
    addEventListener: () => {},
  },
  maplibregl: {
    Map: function() {
      this.on = (evt, cb) => {
        if (evt === 'load') setTimeout(cb, 0);
      };
      return Object.assign(this, mockMap);
    },
    Marker: function() {
      return Object.assign(Object.create(mockMarker), { pos: null });
    },
  },
  setInterval: (cb, ms) => {
    intervals.push({ cb, ms });
    return intervals.length;
  },
  clearInterval: () => {},
  setTimeout: (cb) => { cb(); return 1; },
  clearTimeout: () => {},
};

vm.createContext(sandbox);
vm.runInContext(runtimeScript, sandbox);

console.log(`Timers enregistrés : ${intervals.length}`);
assert.ok(intervals.length > 0, 'Au moins un intervalle véhicule doit être enregistré par attachLineVehicle');

// 1. Exécution du callback temporel et déplacement observable (R1.1 à R1.3)
const initialPos = markers[markers.length - 1]?.pos ? [...markers[markers.length - 1].pos] : null;
for (let step = 0; step < 5; step++) {
  intervals[0].cb();
}
const movedPos = markers[markers.length - 1]?.pos;
assert.ok(initialPos && movedPos, 'Position du marqueur enregistrée');
assert.ok(movedPos[0] !== initialPos[0] || movedPos[1] !== initialPos[1], 'Le marqueur s’est déplacé le long de la ligne');
console.log('✅ R1.3 : Déplacement observable du véhicule sans ReferenceError validé.');

// 2. Tests de robustesse : zéro ligne, disabled, reduced-motion (R1.4)
console.log('\n2. Tests des cas limites : zéro ligne, plusieurs lignes, désactivé, reduced-motion...');
function runWithDoc(customDoc, prefersReduced = false) {
  const customHtml = generateDocumentHTML(customDoc);
  const m = customHtml.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/i);
  const timers = [], vmMarkers = [];
  const sbx = {
    window: { matchMedia: () => ({ matches: prefersReduced }), addEventListener: () => {} },
    document: {
      hidden: false, fullscreenElement: null,
      getElementById: (id) => id === 'storymap-data' ? { textContent: JSON.stringify(customDoc) } : { id, disabled: false, textContent: '', innerHTML: '', style: {}, classList: { toggle: () => {} }, setAttribute: () => {}, removeAttribute: () => {}, appendChild: (c) => c },
      querySelectorAll: (sel) => sel === '.doc-map-canvas' ? [{ id: 'doc-map-c', getAttribute: () => 'map-1', setAttribute: () => {} }] : [],
      createElement: () => ({ tagName: 'DIV', className: '', style: {}, appendChild: (c) => c, setAttribute: () => {}, getAttribute: () => null }),
      addEventListener: () => {},
    },
    maplibregl: {
      Map: function() { this.on = (evt, cb) => { if (evt === 'load') cb(); }; return Object.assign(this, mockMap); },
      Marker: function() { const m = { pos: null, setLngLat(p) { this.pos = p; return this; }, addTo() { vmMarkers.push(this); return this; } }; return m; },
    },
    setInterval: (cb, ms) => { timers.push({ cb, ms }); return timers.length; },
    clearInterval: () => {}, setTimeout: (cb) => { cb(); return 1; }, clearTimeout: () => {},
  };
  vm.createContext(sbx);
  vm.runInContext(m[1], sbx);
  return { timers, markers: vmMarkers };
}

// 2a. Zéro ligne
const docZeroLines = { ...doc, maps: [{ id: 'map-1', name: 'M1', layers: [{ id: 'l1', visible: true, features: [{ id: 'pt1', geometryType: 'Point', coordinates: [2.3, 48.8] }] }] }] };
assert.strictEqual(runWithDoc(docZeroLines).timers.length, 0, 'Zéro ligne : aucun timer');

// 2b. Animation désactivée
const docDisabled = { ...doc, maps: [{ id: 'map-1', name: 'M1', routeAnimation: { enabled: false }, layers: [{ id: 'l1', visible: true, features: [{ id: 'line1', geometryType: 'LineString', coordinates: [[2.3, 48.8], [2.4, 48.9]] }] }] }] };
assert.strictEqual(runWithDoc(docDisabled).timers.length, 0, 'Animation désactivée : aucun timer');

// 2c. Reduced motion
const docReduced = { ...doc, maps: [{ id: 'map-1', name: 'M1', routeAnimation: { enabled: true, vehicle: 'car' }, layers: [{ id: 'l1', visible: true, features: [{ id: 'line1', geometryType: 'LineString', coordinates: [[2.3, 48.8], [2.4, 48.9]] }] }] }] };
const reducedRes = runWithDoc(docReduced, true);
assert.strictEqual(reducedRes.timers.length, 0, 'Reduced motion : aucun timer actif');
assert.ok(reducedRes.markers.length > 0, 'Marqueur statique positionné sur le dernier point');

// 2d. Plusieurs lignes avec animation
const docMultiLines = { ...doc, maps: [{ id: 'map-1', name: 'M1', routeAnimation: { enabled: true, vehicle: 'bus' }, layers: [{ id: 'l1', visible: true, features: [
  { id: 'lineA', geometryType: 'LineString', coordinates: [[2.3, 48.8], [2.4, 48.9]] },
  { id: 'lineB', geometryType: 'LineString', coordinates: [[2.5, 48.8], [2.6, 48.9]] },
] }] }] };
assert.strictEqual(runWithDoc(docMultiLines).timers.length, 2, 'Deux lignes animées : deux timers créés');
console.log('✅ R1.4 : Cas zéro ligne, désactivé, reduced-motion et plusieurs lignes validés.');

console.log('\n✅ PORTE R1 VALIDÉE AVEC SUCCÈS : RUNTIME PUBLIÉ OPÉRATIONNEL ET ROBUSTE.');
