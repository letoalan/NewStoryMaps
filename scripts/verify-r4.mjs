import assert from 'node:assert';
import vm from 'node:vm';
import { createCanonicalMode2TerritorialDoc } from '../src/core/canonicalFixtures.ts';
import { generateDocumentHTML } from '../src/core/publishDocument.ts';
import { generateBrochurePrintHTML } from '../src/core/publishBrochure.ts';
import { extractStoryFromHTML } from '../src/core/publish.ts';
import { validateNarrativeBindings } from '../src/core/mapScene.ts';
import { isBlockAllowedInBrochure, convertRichDocumentToBrochure } from '../src/core/brochure.ts';
import { getDefaultFormBlockData } from '../src/core/webFormCatalog.ts';

console.log('--- Test Porte R4 : Tranche Mode 2, Bouton d’action et cartes liées ---');
const mode2Story = createCanonicalMode2TerritorialDoc();

// 1. R4.1 & R4.2 : Vérification du modèle de tranche carte-récit et bloc Bouton
{
  assert.strictEqual(mode2Story.mode, 'rich-document');
  assert.strictEqual(mode2Story.maps.length, 2, 'Doit comporter deux cartes indépendantes');
  const page1 = mode2Story.pages[0];
  const btnBlock = page1.blocks.find((b) => b.type === 'button');
  assert.ok(btnBlock, 'Le bloc bouton doit être présent dans la tranche');
  assert.strictEqual(btnBlock.data.label, 'Explorer le fleuve');
  assert.strictEqual(btnBlock.binding?.mapId, 'map-seine');
  assert.strictEqual(btnBlock.binding?.action, 'zoom');

  const val = validateNarrativeBindings(mode2Story.pages, mode2Story.maps);
  assert.strictEqual(val.valid, true);
  assert.strictEqual(val.brokenCount, 0);
  console.log('✅ R4.1 / R4.2 : Modèle, 2 cartes et bloc bouton validés');
}

// 2. R4.6 : Sauvegarde, export HTML autonome et réimport sans perte
{
  const html = generateDocumentHTML(mode2Story);
  assert.ok(html.includes('class="doc-action-btn"'), 'Le bouton doit être rendu dans le HTML');
  assert.ok(html.includes('data-action="narrative-binding"'), 'data-action doit être présent');
  assert.ok(!html.includes('badge-technique-debug'), 'Aucun badge technique de debug imposé');

  const reimported = extractStoryFromHTML(html);
  assert.ok(reimported, 'Le récit doit être extrait fidèlement du HTML');
  assert.strictEqual(reimported.mode, 'rich-document');
  assert.strictEqual(reimported.maps.length, 2, 'Les 2 cartes doivent être restaurées');
  const reimpBtn = reimported.pages[0].blocks.find((b) => b.type === 'button');
  assert.ok(reimpBtn, 'Le bloc bouton doit être restauré sans perte');
  assert.strictEqual(reimpBtn.data.label, 'Explorer le fleuve');
  assert.strictEqual(reimpBtn.binding?.mapId, 'map-seine');
  console.log('✅ R4.6 : Export HTML et réimport aller-retour sans perte');
}

// 3. R4.4 & R4.5 : Exécution du runtime, isolation entre deux cartes et actions zoom / overview
{
  const html = generateDocumentHTML(mode2Story);
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
  assert.ok(scriptMatch, 'Script runtime trouvé');

  const calls = { seineFlyTo: 0, seineFitBounds: 0, nordFlyTo: 0 };
  class MockMapInstance {
    constructor(id) { this.id = id; this._layers = {}; this._filters = {}; }
    flyTo() {
      if (this.id.includes('map-seine')) calls.seineFlyTo++;
      if (this.id.includes('map-nord')) calls.nordFlyTo++;
    }
    fitBounds() { if (this.id.includes('map-seine')) calls.seineFitBounds++; }
    panTo() {}
    setFilter(l, f) { this._filters[l] = f; }
    getLayer(id) { return this._layers[id]; }
    addLayer(l) { this._layers[l.id] = l; }
    removeLayer(id) { delete this._layers[id]; }
    on() {}
    resize() {}
    getSource() { return { setData() {} }; }
    addSource() {}
  }

  const eventListeners = {};
  const mockDoc = {
    addEventListener: (evt, cb) => { eventListeners[evt] = cb; },
    createElement: (tag) => ({ tagName: tag.toUpperCase(), className: '', style: {}, setAttribute: () => {}, removeAttribute: () => {}, appendChild: (c) => c, querySelector: () => null, querySelectorAll: () => [] }),
    querySelectorAll: (sel) => sel === '.doc-map-canvas' ? [
      { id: 'doc-map-b-map-1', getAttribute: (a) => a === 'data-map-id' ? 'map-seine' : '', querySelectorAll: () => [], removeAttribute: () => {}, setAttribute: () => {} },
      { id: 'doc-map-b-map-2', getAttribute: (a) => a === 'data-map-id' ? 'map-nord' : '', querySelectorAll: () => [], removeAttribute: () => {}, setAttribute: () => {} },
    ] : [],
    getElementById: (id) => id === 'storymap-data' ? { textContent: JSON.stringify(mode2Story) } : {
      id, disabled: false, textContent: '', innerHTML: '', style: { display: 'block' },
      classList: { toggle: () => {} }, setAttribute: () => {}, removeAttribute: () => {},
      querySelectorAll: () => [], appendChild: (c) => c,
    },
  };

  const sandbox = {
    document: mockDoc,
    window: { addEventListener: () => {}, matchMedia: () => ({ matches: false }) },
    maplibregl: {
      Map: function(opts) {
        const mid = opts.container?.getAttribute ? opts.container.getAttribute('data-map-id') : opts.container.id;
        return new MockMapInstance(mid);
      },
      Marker: function() { return { setLngLat: () => ({ addTo: () => {} }) }; },
    },
    console: { log: () => {}, warn: () => {}, error: () => {} },
    setTimeout: (cb) => { cb(); return 1; },
    setInterval: () => 1, clearInterval: () => {}, clearTimeout: () => {},
  };

  vm.createContext(sandbox);
  vm.runInContext(scriptMatch[1], sandbox);

  const clickHandler = eventListeners['click'];
  assert.ok(clickHandler, 'Écouteur de clic enregistré');

  // Déclencher le clic sur le bouton de la carte Seine (Action 'zoom')
  clickHandler({
    target: {
      closest: (sel) => sel === '[data-action]' ? {
        getAttribute: (attr) => ({
          'data-action': 'narrative-binding',
          'data-map-id': 'map-seine',
          'data-feature-id': 'f-corridor',
          'data-binding-action': 'zoom',
        }[attr] || null),
      } : null,
    },
  });

  assert.strictEqual(calls.seineFlyTo, 1, 'La carte Seine doit recevoir flyTo');
  assert.strictEqual(calls.nordFlyTo, 0, 'La carte Nord ne doit pas être impactée (isolation)');

  // Déclencher une action 'overview' sur la carte Seine
  clickHandler({
    target: {
      closest: (sel) => sel === '[data-action]' ? {
        getAttribute: (attr) => ({
          'data-action': 'narrative-binding',
          'data-map-id': 'map-seine',
          'data-binding-action': 'overview',
        }[attr] || null),
      } : null,
    },
  });

  assert.strictEqual(calls.seineFlyTo, 2, 'Overview doit réinitialiser la vue de la carte Seine');
  assert.strictEqual(calls.nordFlyTo, 0, 'La carte Nord reste strictement isolée');
  console.log('✅ R4.4 / R4.5 : Exécution partagée, actions zoom/overview et isolation validées');
}

// 4. Boutons d'action calibrables, Formulaire client connecté et exclusion stricte de Brochure / StoryMap
{
  assert.strictEqual(isBlockAllowedInBrochure('button'), false, 'Bouton interdit en mode brochure');
  assert.strictEqual(isBlockAllowedInBrochure('form'), false, 'Formulaire interdit en mode brochure');

  const webDoc = JSON.parse(JSON.stringify(mode2Story));
  webDoc.pages[0].blocks.push(
    {
      id: 'b-btn-cal', type: 'button', x: 0, y: 5, w: 2, h: 1,
      data: { label: 'Réserver Lyon', triggerType: 'prefill-form', prefillValue: 'Étape Lyon', variant: 'outline', size: 'lg', align: 'left', icon: 'calendar' },
    },
    {
      id: 'b-form-client', type: 'form', x: 2, y: 5, w: 4, h: 2,
      data: { ...getDefaultFormBlockData('reservation'), endpointUrl: 'https://hook.example.com/client-lead' },
    }
  );

  const webHtml = generateDocumentHTML(webDoc);
  assert.ok(webHtml.includes('data-action="prefill-form"'), 'Bouton calibré prefill-form rendu en Mode 2');
  assert.ok(webHtml.includes('data-prefill-value="Étape Lyon"'), 'Valeur prefill présente');
  assert.ok(webHtml.includes('class="doc-client-form"'), 'Formulaire client rendu en Mode 2');
  assert.ok(webHtml.includes('data-endpoint="https://hook.example.com/client-lead"'), 'Adresse web cible connectée');
  assert.ok(webHtml.includes('name="_gotcha"'), 'Champ anti-spam honeypot présent');

  const { brochure } = convertRichDocumentToBrochure(webDoc);
  const brochureBlocks = brochure.pages.flatMap((p) => p.blocks);
  assert.strictEqual(brochureBlocks.some((b) => b.type === 'button' || b.type === 'form'), false, 'Aucun bouton ni formulaire dans la brochure convertie');
  const printHtml = generateBrochurePrintHTML(webDoc);
  assert.ok(!printHtml.includes('class="doc-client-form"'), 'Aucun formulaire web dans le HTML brochure A4');
  assert.ok(!printHtml.includes('class="doc-action-btn"'), 'Aucun bouton web dans le HTML brochure A4');
  console.log('✅ Boutons calibrables, Formulaire client connecté et exclusion Mode 1 / Mode 3 validés');
}

console.log('Tous les tests de la Porte R4 sont validés avec succès !');
