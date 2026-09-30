// Minimal inline icon set - stroke-based, 1.6px, matches the thin/clean chart language.
const s = (inner, vb = '0 0 24 24') =>
  `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

export const ICONS = {
  overview: s('<rect x="3.5" y="3.5" width="7" height="7"/><rect x="13.5" y="3.5" width="7" height="7"/><rect x="3.5" y="13.5" width="7" height="7"/><rect x="13.5" y="13.5" width="7" height="7"/>'),
  usage: s('<path d="M4 19V10M10 19V5M16 19V13M22 19V8"/>'),
  world: s('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.5 4 5.4 4 8.5s-1.4 6-4 8.5c-2.6-2.5-4-5.4-4-8.5s1.4-6 4-8.5Z"/>'),
  cursor: s('<path d="M5 3.5 19 10l-6 1.4L11 18 5 3.5Z"/>'),
  chip: s('<rect x="6.5" y="6.5" width="11" height="11"/><path d="M9 3.5v3M12 3.5v3M15 3.5v3M9 17.5v3M12 17.5v3M15 17.5v3M3.5 9h3M3.5 12h3M3.5 15h3M17.5 9h3M17.5 12h3M17.5 15h3"/>'),
  quality: s('<path d="M12 3.5 20 7v5.2c0 4.4-3.2 7.6-8 8.8-4.8-1.2-8-4.4-8-8.8V7l8-3.5Z"/><path d="m9 12 2.2 2.2L15.5 10"/>'),
  search: s('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m19.5 19.5-4.3-4.3"/>'),
  close: s('<path d="M5 5l14 14M19 5 5 19"/>'),
  chevronRight: s('<path d="m9 5 7 7-7 7"/>'),
  info: s('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none"/>'),
  arrowUp: s('<path d="M12 19V5M6 11l6-6 6 6"/>'),
  arrowDown: s('<path d="M12 5v14M6 13l6 6 6-6"/>'),
  arrowFlat: s('<path d="M5 12h14"/>'),
  pin: s('<path d="M12 21s-6.5-5.8-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.2-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.2"/>'),
  clock: s('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  device: s('<rect x="4" y="4.5" width="16" height="11"/><path d="M9 19.5h6M12 15.5v4"/>'),
  hand: s('<path d="M9 12.5V5.8a1.3 1.3 0 0 1 2.6 0V11M11.6 11V4.6a1.3 1.3 0 0 1 2.6 0V11M14.2 11V6.3a1.3 1.3 0 0 1 2.6 0V13M9 12.7 7.4 11a1.3 1.3 0 0 0-2 1.7l3.4 5.1c1 1.6 2.8 2.6 4.7 2.6h1.3c2.7 0 4.9-2.2 4.9-4.9V9.3"/>'),
  motion: s('<path d="M3 15c2-4 4-6 6-6s3 3 5 3 3.5-4.5 7-4.5M3 19c2-4 4-6 6-6s3 3 5 3 3.5-4.5 7-4.5"/>'),
  bolt: s('<path d="M13 3 5 13.5h5.5L11 21l8-11h-5.5L13 3Z"/>'),
  play: s('<path d="M7 4.5v15l13-7.5-13-7.5Z"/>'),
  wifi: s('<path d="M4.5 9.5a11 11 0 0 1 15 0M7.6 12.8a6.8 6.8 0 0 1 8.8 0M10.7 16a2.6 2.6 0 0 1 2.6 0"/><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/>'),
  sim: s('<path d="M8 3.5h6L18.5 8v11.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M9 12.5h6M9 15.5h4"/>'),
  disk: s('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.4"/><path d="M12 3.5v5M20.5 12h-5"/>'),
  speaker: s('<path d="M5 9.5h3.3L13 6v12l-4.7-3.5H5v-5Z"/><path d="M16.5 9.3a4 4 0 0 1 0 5.4"/>'),
  focus: s('<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3"/>'),
  camera: s('<rect x="3.5" y="7" width="17" height="12"/><path d="M8 7 9.6 4.5h4.8L16 7"/><circle cx="12" cy="13" r="3.2"/>'),
  board: s('<rect x="4" y="4" width="16" height="16"/><circle cx="8.5" cy="8.5" r="1"/><circle cx="15.5" cy="8.5" r="1"/><circle cx="8.5" cy="15.5" r="1"/><path d="M11 8.5h2.5M8.5 11v2.5"/>'),
  projector: s('<rect x="3" y="8" width="13" height="8"/><circle cx="9.5" cy="12" r="2.4"/><path d="M16 11.5 21 9v6l-5-2.5Z"/>'),
  accel: s('<rect x="6" y="6" width="12" height="12"/><path d="M12 9v3l2.2 1.3"/>'),
  briefcase: s('<rect x="3.5" y="7.5" width="17" height="11.5"/><path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5M3.5 12.5h17"/>'),
  wrench: s('<path d="M14.7 6.3a4 4 0 0 0-5.4 4.7L4 16.3a1.8 1.8 0 0 0 2.5 2.5l5.3-5.3a4 4 0 0 0 4.7-5.4l-2.6 2.6-2-2 2.6-2.6Z"/>'),
  terminal: s('<rect x="3.5" y="4.5" width="17" height="15"/><path d="m7.5 9.5 3 3-3 3M12.5 15.5h4"/>'),
  home: s('<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9.5h12V10"/><path d="M10 19.5v-6h4v6"/>'),
};

export function icon(name, cls = '') {
  return `<span class="${cls}" aria-hidden="true">${ICONS[name] || ''}</span>`;
}

// -------------------------------------------------------------------------
// Flap marks - the board's own state language (Ruled-State Rule): a status
// is a drawn mark, never a colored dot alone. Four named positions, same as
// a real split-flap character: hairline (at rest / no signal), filled
// (resolved), bracketed (flagged, watch this), struck (needs action).
// -------------------------------------------------------------------------

const FLAP = {
  hairline: '<rect x="2.5" y="2.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.3"/>',
  half: '<rect x="2.5" y="2.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.3"/><rect x="2" y="7" width="10" height="5" fill="currentColor"/>',
  filled: '<rect x="2" y="2" width="10" height="10" fill="currentColor"/>',
  bracketed: '<rect x="2.5" y="2.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M1 4.2V1h3.2M13 4.2V1H9.8M1 9.8V13h3.2M13 9.8V13H9.8" stroke="currentColor" stroke-width="1.3" fill="none"/>',
  struck: '<rect x="2.5" y="2.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M2.7 2.7l8.6 8.6" stroke="currentColor" stroke-width="1.3"/>',
};

// Maps the badge's existing semantic classes onto the flap positions -
// good/warning/action/critical/offline all fold onto one consistent mark
// vocabulary instead of five arbitrary dot colors.
const FLAP_BY_CLASS = {
  good: 'filled', warning: 'bracketed', action: 'struck', critical: 'struck', offline: 'hairline', neutral: 'hairline',
  // data-availability system (see DATA_STATUS): same drawn-mark vocabulary,
  // read as a progression toward "real" rather than a severity scale.
  available: 'filled', integration: 'half', planned: 'bracketed',
  'new-tracking': 'hairline', definition: 'hairline', mock: 'struck',
};

export function flapMark(cls, size = 11) {
  const kind = FLAP_BY_CLASS[cls] || 'hairline';
  return `<svg class="flap-mark" width="${size}" height="${size}" viewBox="0 0 14 14" aria-hidden="true">${FLAP[kind]}</svg>`;
}
