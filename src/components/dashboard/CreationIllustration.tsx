/**
 * StoryMap — Illustration vectorielle riche pour la page de création (Dashboard)
 */

import React from 'react';

export const CreationIllustration: React.FC = () => {
  return (
    <svg
      viewBox="0 0 480 340"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ width: '100%', height: '100%', display: 'block', borderRadius: 'inherit' }}
    >
      <defs>
        <linearGradient id="sm-sky-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e8f1f5" />
          <stop offset="55%" stopColor="#f3efe6" />
          <stop offset="100%" stopColor="#e6eedf" />
        </linearGradient>
        <linearGradient id="sm-water" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8fd3e8" />
          <stop offset="100%" stopColor="#4ba3c3" />
        </linearGradient>
        <linearGradient id="sm-card-photo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0b7fb0" />
          <stop offset="100%" stopColor="#1e3a5f" />
        </linearGradient>
        <filter id="sm-drop-shadow" x="-10%" y="-10%" width="125%" height="125%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0f172a" floodOpacity="0.18" />
        </filter>
      </defs>

      {/* Fond de carte topographique */}
      <rect width="480" height="340" fill="url(#sm-sky-bg)" />

      {/* Parcs et reliefs */}
      <ellipse cx="130" cy="78" rx="75" ry="42" fill="#d4e9c6" opacity="0.85" />
      <ellipse cx="395" cy="64" rx="62" ry="34" fill="#d4e9c6" opacity="0.8" />
      <ellipse cx="320" cy="210" rx="58" ry="32" fill="#dcebd0" opacity="0.75" />

      {/* Mer et fleuve sinueux */}
      <path
        d="M0 258 C 85 232, 155 288, 250 264 S 390 212, 480 242 L 480 340 L 0 340 Z"
        fill="url(#sm-water)"
      />
      <path
        d="M322 -6 C 305 55, 342 98, 324 152 S 288 220, 314 265"
        stroke="#7bc6de"
        strokeWidth="14"
        fill="none"
        strokeLinecap="round"
      />

      {/* Réseau routier secondaire et principal */}
      <g stroke="#ffffff" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.9">
        <path d="M0 52 L480 105" />
        <path d="M74 0 L118 245" />
        <path d="M210 0 L192 255" />
        <path d="M390 0 L425 220" />
        <path d="M0 165 L480 184" />
      </g>
      <path
        d="M-8 128 C 125 94, 245 162, 488 110"
        stroke="#f7c873"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
      />

      {/* Itinéraire narratif animé (voie & tracé) */}
      <path
        d="M195 198 Q 258 95 322 136 T 426 82"
        fill="none"
        stroke="#0b7fb0"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M195 198 Q 258 95 322 136 T 426 82"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeDasharray="6 6"
        strokeLinecap="round"
      />

      {/* Étape 1 */}
      <g transform="translate(195, 198)">
        <circle r="13" fill="#0b7fb0" stroke="#ffffff" strokeWidth="3" />
        <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="700" fontFamily="Inter, sans-serif">1</text>
      </g>

      {/* Étape 2 (Active avec halo) */}
      <g transform="translate(322, 136)">
        <circle r="22" fill="#e8590c" opacity="0.22" />
        <circle r="14" fill="#e8590c" stroke="#ffffff" strokeWidth="3" />
        <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="700" fontFamily="Inter, sans-serif">2</text>
        <rect x="-52" y="18" width="104" height="22" rx="6" fill="#0f172a" opacity="0.88" />
        <text x="0" y="33" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="600" fontFamily="Inter, sans-serif">Étape 2 · Belvédère</text>
      </g>

      {/* Étape 3 */}
      <g transform="translate(426, 82)">
        <circle r="13" fill="#0b7fb0" stroke="#ffffff" strokeWidth="3" />
        <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="700" fontFamily="Inter, sans-serif">3</text>
      </g>

      {/* Boussole Nord fixe (en haut à droite) */}
      <g transform="translate(442, 34)" filter="url(#sm-drop-shadow)">
        <circle r="19" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
        <polygon points="0,-13 -5,3 5,3" fill="#dc2626" />
        <polygon points="0,13 -5,3 5,3" fill="#94a3b8" />
        <text x="0" y="-1" textAnchor="middle" fill="#0f172a" fontSize="7" fontWeight="800" fontFamily="Inter, sans-serif">N</text>
      </g>

      {/* Panneau narratif flottant (à gauche) */}
      <g transform="translate(20, 22)" filter="url(#sm-drop-shadow)">
        <rect width="154" height="224" rx="12" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />
        <rect x="10" y="10" width="134" height="76" rx="8" fill="url(#sm-card-photo)" />
        {/* Soleil & montagnes stylisés dans la vignette photo */}
        <circle cx="118" cy="30" r="9" fill="#ffcf5c" />
        <path d="M10 86 L48 48 L78 72 L106 52 L144 86 Z" fill="#38bdf8" opacity="0.45" />
        <rect x="18" y="18" width="54" height="14" rx="7" fill="rgba(255,255,255,0.22)" />
        <text x="45" y="28" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="700" fontFamily="Inter, sans-serif">CHAPITRE 2</text>

        {/* Contenu éditorial du chapitre */}
        <rect x="12" y="98" width="96" height="9" rx="4" fill="#0f172a" />
        <rect x="12" y="116" width="128" height="6" rx="3" fill="#64748b" opacity="0.65" />
        <rect x="12" y="128" width="118" height="6" rx="3" fill="#64748b" opacity="0.65" />
        <rect x="12" y="140" width="124" height="6" rx="3" fill="#64748b" opacity="0.65" />
        <rect x="12" y="152" width="80" height="6" rx="3" fill="#64748b" opacity="0.65" />

        {/* Barre de progression & véhicule */}
        <rect x="12" y="172" width="130" height="7" rx="3.5" fill="#e2e8f0" />
        <rect x="12" y="172" width="76" height="7" rx="3.5" fill="#0b7fb0" />

        {/* Badges des 3 modes */}
        <rect x="12" y="192" width="40" height="18" rx="5" fill="#dcfce7" />
        <text x="32" y="204" textAnchor="middle" fill="#15803d" fontSize="7.5" fontWeight="700" fontFamily="Inter, sans-serif">Carte</text>
        <rect x="56" y="192" width="42" height="18" rx="5" fill="#f3e8ff" />
        <text x="77" y="204" textAnchor="middle" fill="#7e22ce" fontSize="7.5" fontWeight="700" fontFamily="Inter, sans-serif">Atlas</text>
        <rect x="102" y="192" width="40" height="18" rx="5" fill="#fef3c7" />
        <text x="122" y="204" textAnchor="middle" fill="#b45309" fontSize="7.5" fontWeight="700" fontFamily="Inter, sans-serif">A4 300</text>
      </g>

      {/* Mini-carte de situation (en bas à droite) */}
      <g transform="translate(372, 242)" filter="url(#sm-drop-shadow)">
        <rect width="90" height="76" rx="8" fill="#ffffff" stroke="#ffffff" strokeWidth="2.5" />
        <rect x="3" y="3" width="84" height="70" rx="6" fill="#e2eff5" />
        <path d="M3 52 C 25 40, 50 58, 87 42 L 87 73 L 3 73 Z" fill="#99d5e8" />
        <rect x="28" y="22" width="34" height="24" rx="3" fill="rgba(11, 127, 176, 0.18)" stroke="#0b7fb0" strokeWidth="1.5" />
        <circle cx="45" cy="34" r="4" fill="#e8590c" stroke="#ffffff" strokeWidth="1.2" />
      </g>
    </svg>
  );
};
