/**
 * StoryMap — Point d'entrée de l'application React
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { setWorkerUrl } from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';

// Configuration du Web Worker MapLibre GL pour Vite
setWorkerUrl(maplibreWorkerUrl);
import '../public/css/app.css';
import '../public/css/dashboard.css';
import '../public/css/editor.css';
import '../public/css/sheet.css';
import '../public/css/frame.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

