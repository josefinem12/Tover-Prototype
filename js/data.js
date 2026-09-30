// =========================================================================
// Mock data layer for the Tover Insights prototype.
//
// Everything here is generated client-side from a seeded RNG so the
// dashboard is deterministic across reloads. This file is the ONLY place
// that knows data is mocked - components/pages just consume plain objects,
// so a later swap to real Elasticsearch/API/MQTT data only touches this file.
// =========================================================================

import { makeRng, pick, randInt, randFloat, clamp, daysAgo, minutesAgo } from './utils.js';

const rng = makeRng(20260922);

// -------------------------------------------------------------------------
// Data availability labels (see planning doc §8)
// -------------------------------------------------------------------------

export const DATA_STATUS = {
  available:     { key: 'available',    label: 'Available now',            short: 'Live',    desc: 'Can be built today from data Tover already collects.' },
  integration:   { key: 'integration',  label: 'Needs integration',        short: 'Integrate', desc: 'The data exists somewhere already, but is not yet joined or exposed for this view.' },
  planned:       { key: 'planned',      label: 'Planned / coming',         short: 'Planned', desc: 'On the near-term roadmap - for example PBIT hardware diagnostics.' },
  'new-tracking':{ key: 'new-tracking', label: 'New tracking needed',      short: 'New event', desc: 'Would require a new event, field, or more granular logging than exists today.' },
  definition:    { key: 'definition',   label: 'Definition needed',        short: 'Define',  desc: 'Technically possible, but the team has not yet agreed what this should mean.' },
  mock:          { key: 'mock',         label: 'Simulated data',           short: 'Mock',    desc: 'Standing in for a metric that is not wired up to real data yet.' },
};

// -------------------------------------------------------------------------
// Reference dimensions
// -------------------------------------------------------------------------

export const TEAMS = {
  rd: { key: 'rd', label: 'Research & Design', color: 'var(--series-2)' },
  product: { key: 'product', label: 'Product', color: 'var(--series-3)' },
  commerce: { key: 'commerce', label: 'Commerce', color: 'var(--series-1)' },
  ops: { key: 'ops', label: 'Operations', color: 'var(--series-5)' },
  software: { key: 'software', label: 'Software', color: 'var(--series-6)' },
  customers: { key: 'customers', label: 'Customers', color: 'var(--series-4)' },
};

export const COUNTRIES = [
  { code: 'NL', name: 'Netherlands', lat: 52.2, lon: 5.4 },
  { code: 'DE', name: 'Germany', lat: 51.0, lon: 10.2 },
  { code: 'BE', name: 'Belgium', lat: 50.7, lon: 4.6 },
  { code: 'GB', name: 'United Kingdom', lat: 53.0, lon: -1.8 },
  { code: 'US', name: 'United States', lat: 39.5, lon: -98.0 },
  { code: 'FR', name: 'France', lat: 47.0, lon: 2.5 },
  { code: 'DK', name: 'Denmark', lat: 56.1, lon: 9.9 },
  { code: 'AU', name: 'Australia', lat: -27.0, lon: 133.5 },
  { code: 'CA', name: 'Canada', lat: 51.5, lon: -100.0 },
  { code: 'SE', name: 'Sweden', lat: 60.5, lon: 16.8 },
];

export const DEVICE_TYPES = ['Tovertafel 3', 'Pixie'];

export const SOFTWARE_VERSIONS = ['4.12.1', '4.12.0', '4.11.2', '4.11.0', '4.10.3', '4.9.1'];
const SW_WEIGHTS = [0.30, 0.22, 0.18, 0.14, 0.10, 0.06];

export const SUBSCRIPTIONS = ['Base Light', 'Base Plus', 'Plus Complete', 'Light Complete'];

export const GAME_CATEGORIES = ['Cognitive', 'Physical', 'Sensory', 'Social'];

// Real games, categories, difficulty levels and platform availability, from
// the Tover Game Collections Analysis workbook (Game Master List / Game Key
// & Package List). `category` is the primary tag (categories[0]) for the
// single-category groupings elsewhere in the app; `categories` carries the
// full multi-tag list. `weight` derives from real tier/package-appearance
// counts, so popularity ranking reflects actual catalogue reach, not a guess.
export const GAMES = [
  { id: 'g_birthday_cake', name: 'Birthday Cake', categories: ['Sensory', 'Social'], category: 'Sensory', level: 3, platforms: ['Pixie', 'Tovertafel'], type: 'ambient', tpu: true, weight: 15, mostPreferred: true, leastPreferred: false, highContrast: false },
  { id: 'g_flying_saucer', name: 'Flying Saucer', categories: ['Physical', 'Social'], category: 'Physical', level: 2, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: false, weight: 11, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_bubble_bath', name: 'Bubble Bath', categories: ['Physical', 'Sensory'], category: 'Physical', level: 2, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: false, weight: 11, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_dream_stars', name: 'Dream Stars', categories: ['Sensory'], category: 'Sensory', level: 1, platforms: ['Pixie'], type: 'ambient', tpu: false, weight: 10, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_hamster_maze', name: 'Hamster Maze', categories: ['Cognitive', 'Social'], category: 'Cognitive', level: 5, platforms: ['Pixie', 'Tovertafel'], type: 'ambient', tpu: false, weight: 10, mostPreferred: true, leastPreferred: false, highContrast: false },
  { id: 'g_monster_pairs', name: 'Monster Pairs', categories: ['Cognitive', 'Social'], category: 'Cognitive', level: 3, platforms: ['Pixie', 'Tovertafel'], type: 'ambient', tpu: true, weight: 10, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_rainbow', name: 'Rainbow', categories: ['Physical', 'Sensory'], category: 'Physical', level: 2, platforms: ['Tovertafel'], type: 'active', tpu: false, weight: 10, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_soccer_match', name: 'Soccer Match', categories: ['Physical', 'Social'], category: 'Physical', level: 4, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: false, weight: 10, mostPreferred: true, leastPreferred: false, highContrast: true },
  { id: 'g_butterflies', name: 'Butterflies', categories: ['Physical', 'Sensory'], category: 'Physical', level: 2, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: false, weight: 9, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_ladybirds', name: 'Ladybirds', categories: ['Physical', 'Sensory'], category: 'Physical', level: 3, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: false, weight: 9, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_fish', name: 'Fish', categories: ['Sensory', 'Social'], category: 'Sensory', level: 2, platforms: ['Pixie', 'Tovertafel'], type: 'ambient', tpu: false, weight: 8, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_seasonal_memo', name: 'Seasonal Memo', categories: ['Cognitive', 'Social'], category: 'Cognitive', level: 5, platforms: ['Tovertafel'], type: 'ambient', tpu: true, weight: 8, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_animal_sounds', name: 'Animal Sounds', categories: ['Cognitive', 'Social'], category: 'Cognitive', level: 4, platforms: ['Tovertafel'], type: 'ambient', tpu: false, weight: 8, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_hobby_sets', name: 'Hobby Sets', categories: ['Cognitive', 'Social'], category: 'Cognitive', level: 4, platforms: ['Pixie', 'Tovertafel'], type: 'ambient', tpu: false, weight: 8, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_paint_splatters', name: 'Paint Splatters', categories: ['Physical', 'Sensory'], category: 'Physical', level: 2, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: false, weight: 8, mostPreferred: true, leastPreferred: false, highContrast: true },
  { id: 'g_windmills', name: 'Windmills', categories: ['Physical', 'Social'], category: 'Physical', level: 3, platforms: ['Tovertafel'], type: 'active', tpu: true, weight: 8, mostPreferred: true, leastPreferred: false, highContrast: false },
  { id: 'g_wordsmith', name: 'Wordsmith', categories: ['Cognitive', 'Social'], category: 'Cognitive', level: 4, platforms: ['Pixie', 'Tovertafel'], type: 'ambient', tpu: false, weight: 8, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_molehunt', name: 'Molehunt', categories: ['Cognitive', 'Physical', 'Social'], category: 'Cognitive', level: 4, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: false, weight: 7, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_music_box', name: 'Music Box', categories: ['Cognitive', 'Social'], category: 'Cognitive', level: 3, platforms: ['Pixie', 'Tovertafel'], type: 'ambient', tpu: false, weight: 7, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_safe_cracker', name: 'Safe Cracker', categories: ['Cognitive', 'Social'], category: 'Cognitive', level: 5, platforms: ['Tovertafel'], type: 'ambient', tpu: true, weight: 7, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_sheet_music', name: 'Sheet Music', categories: ['Physical', 'Sensory'], category: 'Physical', level: 3, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: false, weight: 7, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_match_maker', name: 'Match Maker', categories: ['Cognitive', 'Social'], category: 'Cognitive', level: 4, platforms: ['Pixie', 'Tovertafel'], type: 'ambient', tpu: false, weight: 7, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_balloon', name: 'Balloon', categories: ['Physical', 'Social'], category: 'Physical', level: 4, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: true, weight: 6, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_lava_bubbles', name: 'Lava Bubbles', categories: ['Sensory'], category: 'Sensory', level: 1, platforms: ['Pixie'], type: 'ambient', tpu: false, weight: 6, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_sandy_beach', name: 'Sandy Beach', categories: ['Physical', 'Sensory'], category: 'Physical', level: 3, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: false, weight: 6, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_animal_pairs', name: 'Animal Pairs', categories: ['Cognitive', 'Social'], category: 'Cognitive', level: 3, platforms: ['Pixie', 'Tovertafel'], type: 'ambient', tpu: false, weight: 6, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_candy_fish', name: 'Candy Fish', categories: ['Physical', 'Social'], category: 'Physical', level: 4, platforms: ['Tovertafel'], type: 'active', tpu: true, weight: 6, mostPreferred: true, leastPreferred: false, highContrast: false },
  { id: 'g_masterpieces', name: 'Masterpieces', categories: ['Physical', 'Sensory'], category: 'Physical', level: 3, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: true, weight: 6, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_movement_dice', name: 'Movement Dice', categories: ['Physical', 'Social'], category: 'Physical', level: 3, platforms: ['Tovertafel'], type: 'active', tpu: false, weight: 6, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_pond', name: 'Pond', categories: ['Physical', 'Sensory'], category: 'Physical', level: 2, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: true, weight: 6, mostPreferred: false, leastPreferred: false, highContrast: true },
  { id: 'g_steam_train', name: 'Steam Train', categories: ['Cognitive', 'Social'], category: 'Cognitive', level: 3, platforms: ['Pixie', 'Tovertafel'], type: 'ambient', tpu: true, weight: 6, mostPreferred: true, leastPreferred: false, highContrast: false },
  { id: 'g_coral_reef', name: 'Coral Reef', categories: ['Physical', 'Sensory', 'Social'], category: 'Physical', level: 2, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: true, weight: 5, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_transport_puzzle', name: 'Transport puzzle', categories: ['Social'], category: 'Social', level: 3, platforms: ['Pixie', 'Tovertafel'], type: 'ambient', tpu: true, weight: 5, mostPreferred: false, leastPreferred: false, highContrast: true },
  { id: 'g_beach_ball', name: 'Beach Ball', categories: ['Physical', 'Social'], category: 'Physical', level: 2, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: false, weight: 5, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_chatterboxes', name: 'Chatterboxes', categories: ['Cognitive', 'Physical', 'Social'], category: 'Cognitive', level: 3, platforms: ['Pixie'], type: 'active', tpu: true, weight: 5, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_cloudy_sky', name: 'Cloudy Sky', categories: ['Sensory'], category: 'Sensory', level: 1, platforms: ['Pixie'], type: 'ambient', tpu: false, weight: 5, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_leaves', name: 'Leaves', categories: ['Physical', 'Sensory'], category: 'Physical', level: 2, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: true, weight: 5, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_moles', name: 'Moles', categories: ['Physical', 'Social'], category: 'Physical', level: 4, platforms: ['Tovertafel'], type: 'active', tpu: true, weight: 5, mostPreferred: true, leastPreferred: false, highContrast: true },
  { id: 'g_nostalgia_puzzle', name: 'Nostalgia Puzzle', categories: ['Cognitive', 'Social'], category: 'Cognitive', level: 3, platforms: ['Pixie', 'Tovertafel'], type: 'ambient', tpu: true, weight: 5, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_puppies', name: 'Puppies', categories: ['Sensory', 'Social'], category: 'Sensory', level: 3, platforms: ['Tovertafel'], type: 'ambient', tpu: false, weight: 5, mostPreferred: false, leastPreferred: false, highContrast: true },
  { id: 'g_evening_lights', name: 'Evening Lights', categories: ['Physical', 'Sensory'], category: 'Physical', level: 2, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: false, weight: 4, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_marbles', name: 'Marbles', categories: ['Physical', 'Social'], category: 'Physical', level: 4, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: false, weight: 4, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_animal_puzzle', name: 'Animal Puzzle', categories: ['Social'], category: 'Social', level: 3, platforms: ['Pixie', 'Tovertafel'], type: 'ambient', tpu: true, weight: 4, mostPreferred: false, leastPreferred: false, highContrast: true },
  { id: 'g_baby_monsters', name: 'Baby Monsters', categories: ['Cognitive', 'Social'], category: 'Cognitive', level: 5, platforms: ['Tovertafel'], type: 'ambient', tpu: true, weight: 4, mostPreferred: true, leastPreferred: false, highContrast: false },
  { id: 'g_colored_lens', name: 'Colored Lens', categories: ['Sensory'], category: 'Sensory', level: 1, platforms: ['Pixie'], type: 'ambient', tpu: false, weight: 4, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_constellations', name: 'Constellations', categories: ['Cognitive', 'Social'], category: 'Cognitive', level: 3, platforms: ['Tovertafel'], type: 'ambient', tpu: false, weight: 4, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_instrument_pairs', name: 'Instrument Pairs', categories: ['Cognitive', 'Social'], category: 'Cognitive', level: 3, platforms: ['Pixie', 'Tovertafel'], type: 'ambient', tpu: false, weight: 4, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_rocket_sums', name: 'Rocket Sums', categories: ['Cognitive', 'Social'], category: 'Cognitive', level: 5, platforms: ['Tovertafel'], type: 'ambient', tpu: false, weight: 4, mostPreferred: false, leastPreferred: true, highContrast: false },
];

export const CUSTOMERS = [
  { id: 'c01', name: 'Zonnehof Care Group', country: 'NL' },
  { id: 'c02', name: 'Rivierstaete Residences', country: 'NL' },
  { id: 'c03', name: 'Sonnenhaus Pflege', country: 'DE' },
  { id: 'c04', name: 'Waldblick Senioren', country: 'DE' },
  { id: 'c05', name: 'Maple Grove Care Homes', country: 'CA' },
  { id: 'c06', name: 'Willowbrook Senior Living', country: 'US' },
  { id: 'c07', name: 'Cedar Ridge Communities', country: 'US' },
  { id: 'c08', name: 'Ashford Manor Group', country: 'GB' },
  { id: 'c09', name: 'Blossom Hill Care', country: 'GB' },
  { id: 'c10', name: 'Les Jardins de Provence', country: 'FR' },
  { id: 'c11', name: 'Solstrand Omsorg', country: 'DK' },
  { id: 'c12', name: 'Harbourview Aged Care', country: 'AU' },
  { id: 'c13', name: 'Bellevue Zorggroep', country: 'BE' },
  { id: 'c14', name: 'Fjordlys Bofellesskap', country: 'SE' },
  { id: 'c15', name: 'Meadowlark Living', country: 'US' },
  { id: 'c16', name: 'Kastanjehof Verpleeghuis', country: 'NL' },
];

// The real planned PBIT (Power-on Built-in Test) checklist, per the
// Tovertafel knowledge base §16.
export const PBIT_COMPONENTS = [
  'Projector', 'Daughter Board', 'IR Remote Sensor', 'IR Emitter', 'RGB Camera',
  'IR Camera', 'Accelerometer', 'Speaker', 'Wi-Fi', 'Modem / SIM', 'TPU', 'Focus Wheel', 'Disk Usage',
];

export const PBIT_CHECK_DESC = {
  'Projector': 'HDMI connected and RS-232 responds',
  'Daughter Board': 'USB connected',
  'IR Remote Sensor': 'TT2 ACD only',
  'IR Emitter': 'Only in new daughterboard',
  'RGB Camera': 'USB connected',
  'IR Camera': 'USB connected',
  'Accelerometer': 'Device found',
  'Speaker': 'Only in new daughterboard',
  'Wi-Fi': 'Device found',
  'Modem / SIM': 'USB device found and SIM card found',
  'TPU': 'Device found',
  'Focus Wheel': 'Pixie 2 only',
  'Disk Usage': 'Flag when above 50% used',
};

export const HARDWARE_REVISIONS = ['Rev A', 'Rev B', 'Rev C'];
export const BATCHES = ['2024-Q1', '2024-Q3', '2025-Q1', '2025-Q2', '2025-Q4'];
export const DISTRIBUTORS = ['Direct (Tover)', 'CareTech Partners', 'Nordic Health Distribution', 'MedEquip Solutions'];
// One batch/revision pairing runs hot - a deliberate "bad batch" story for
// the Operations pattern-explorer view, not evenly-distributed noise.
const BAD_BATCH = '2024-Q3';
const BAD_REVISION = 'Rev B';

// -------------------------------------------------------------------------
// Devices
// -------------------------------------------------------------------------

function weightedPick(r, items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let x = r() * total;
  for (let i = 0; i < items.length; i++) {
    x -= weights[i];
    if (x <= 0) return items[i];
  }
  return items[items.length - 1];
}

function genSerial(r, type) {
  const prefix = type === 'Pixie' ? 'PIX' : 'TT3';
  return `${prefix}-${randInt(r, 1000, 9999)}-${randInt(r, 100, 999)}`;
}

function genDevice(r, idx) {
  const customer = pick(r, CUSTOMERS);
  const country = COUNTRIES.find(c => c.code === customer.country);
  const type = weightedPick(r, DEVICE_TYPES, [0.78, 0.22]);
  const softwareVersion = weightedPick(r, SOFTWARE_VERSIONS, SW_WEIGHTS);
  const subscription = weightedPick(r, SUBSCRIPTIONS, [0.36, 0.28, 0.22, 0.14]);
  const hardwareRevision = weightedPick(r, HARDWARE_REVISIONS, [0.34, 0.40, 0.26]);
  const batch = pick(r, BATCHES);
  const distributor = weightedPick(r, DISTRIBUTORS, [0.46, 0.24, 0.16, 0.14]);
  const badBatch = hardwareRevision === BAD_REVISION && batch === BAD_BATCH;

  // last seen: most devices recently seen, long tail of stale/offline ones
  const seenRoll = r();
  let lastSeenMinutes;
  if (seenRoll < 0.62) lastSeenMinutes = randInt(r, 0, 90);
  else if (seenRoll < 0.82) lastSeenMinutes = randInt(r, 90, 60 * 24 * 3);
  else if (seenRoll < 0.93) lastSeenMinutes = randInt(r, 60 * 24 * 3, 60 * 24 * 14);
  else lastSeenMinutes = randInt(r, 60 * 24 * 14, 60 * 24 * 90);

  const isOffline = lastSeenMinutes > 60 * 24 * 3;

  // errors / crashes skew toward a small set of unhealthy devices (realistic long tail);
  // the bad hardware batch/revision combo runs meaningfully hotter, on purpose
  const unluckyRoll = badBatch ? r() * 0.55 : r();
  const errorCount7d = unluckyRoll < 0.12 ? randInt(r, 6, 22) : unluckyRoll < 0.35 ? randInt(r, 1, 5) : 0;
  const crashCount30d = unluckyRoll < 0.08 ? randInt(r, 2, 9) : unluckyRoll < 0.25 ? randInt(r, 1, 2) : 0;

  // PBIT statuses - most pass, occasional single-component flag (more likely
  // on the bad batch, and biased toward the projector/daughterboard on it -
  // a plausible single root cause rather than random component noise)
  const pbit = {};
  const flagChance = badBatch ? 0.42 : 0.16;
  const flaggedComponent = r() < flagChance ? (badBatch && r() < 0.6 ? pick(r, ['Projector', 'Daughter Board']) : pick(r, PBIT_COMPONENTS)) : null;
  PBIT_COMPONENTS.forEach(c => {
    if (c === flaggedComponent) {
      pbit[c] = r() < (badBatch ? 0.55 : 0.3) ? 'fail' : 'warning';
    } else if (r() < 0.03) {
      pbit[c] = 'warning';
    } else {
      pbit[c] = 'pass';
    }
  });

  // technical health derives from connectivity + errors + pbit (kept separate from usage)
  let technicalHealth;
  if (isOffline) technicalHealth = 'offline';
  else if (errorCount7d > 8 || crashCount30d > 3 || flaggedComponent && pbit[flaggedComponent] === 'fail') technicalHealth = 'action';
  else if (errorCount7d > 2 || crashCount30d > 0 || flaggedComponent) technicalHealth = 'attention';
  else technicalHealth = 'healthy';

  // usage health is independent - a technically healthy device can be barely used
  const usageRoll = r();
  const minutesLast30d = usageRoll < 0.55 ? randInt(r, 900, 4200)
    : usageRoll < 0.8 ? randInt(r, 200, 900)
    : usageRoll < 0.94 ? randInt(r, 20, 200)
    : randInt(r, 0, 20);
  const sessionsLast30d = Math.round(minutesLast30d / randFloat(r, 4.6, 6.2, 1));
  let usageHealth;
  if (minutesLast30d >= 900) usageHealth = 'active';
  else if (minutesLast30d >= 200) usageHealth = 'light';
  else if (minutesLast30d >= 20) usageHealth = 'quiet';
  else usageHealth = 'dormant';

  const trend7d = Array.from({ length: 7 }, () => randInt(r, 20, 240));

  const geoJitter = () => randFloat(r, -3.4, 3.4, 2);

  return {
    id: `d${idx}`,
    serial: genSerial(r, type),
    type,
    customer: customer.name,
    customerId: customer.id,
    country: country.name,
    countryCode: country.code,
    geo: { lat: clamp(country.lat + geoJitter(), -85, 85), lon: clamp(country.lon + geoJitter() * 1.6, -179, 179) },
    softwareVersion,
    subscription,
    hardwareRevision,
    batch,
    distributor,
    lastSeenMinutes,
    isOffline,
    installedAt: daysAgo(randInt(r, 30, 1100)),
    errorCount7d,
    crashCount30d,
    pbit,
    technicalHealth,
    usageHealth,
    minutesLast30d,
    sessionsLast30d,
    trend7d,
    currentGame: !isOffline && lastSeenMinutes < 20 ? pick(r, GAMES).name : null,
  };
}

export const DEVICES = Array.from({ length: 1291 }, (_, i) => genDevice(rng, i));

// -------------------------------------------------------------------------
// Usage timeseries (90 days)
// -------------------------------------------------------------------------

export const USAGE_DAYS = 90;

export const USAGE_TIMESERIES = (() => {
  const out = [];
  let base = 5200;
  for (let i = USAGE_DAYS - 1; i >= 0; i--) {
    const date = daysAgo(i);
    const dow = date.getDay();
    const weekendDip = (dow === 0 || dow === 6) ? 0.86 : 1;
    const seasonal = 1 + 0.12 * Math.sin((USAGE_DAYS - i) / 14);
    const noise = randFloat(rng, 0.88, 1.12, 3);
    const minutes = Math.round(base * weekendDip * seasonal * noise);
    const sessions = Math.round(minutes / randFloat(rng, 4.7, 5.8, 1));
    out.push({ date, minutes, sessions });
    base += randFloat(rng, -20, 34, 1);
  }
  return out;
})();

// -------------------------------------------------------------------------
// Game-level aggregates
// -------------------------------------------------------------------------

export const GAME_STATS = GAMES.map(g => {
  const minutes = Math.round(g.weight * randFloat(rng, 850, 1250, 0) + randInt(rng, -400, 400));
  const sessions = Math.round(minutes / randFloat(rng, 4.6, 6.2, 1));
  const deviceReach = clamp(Math.round(g.weight * randFloat(rng, 4.2, 6, 1)), 8, 140);
  const manualPct = clamp(Math.round(randFloat(rng, 35, 80, 0) + (g.type === 'active' ? 8 : -8)), 15, 92);
  return { ...g, minutes: Math.max(120, minutes), sessions: Math.max(20, sessions), deviceReach, manualPct };
}).sort((a, b) => b.minutes - a.minutes);

export const CATEGORY_STATS = GAME_CATEGORIES.map(cat => {
  const games = GAME_STATS.filter(g => g.category === cat);
  return {
    category: cat,
    minutes: games.reduce((s, g) => s + g.minutes, 0),
    sessions: games.reduce((s, g) => s + g.sessions, 0),
    gameCount: games.length,
  };
}).sort((a, b) => b.minutes - a.minutes);

// -------------------------------------------------------------------------
// Interaction / effort concepts (Page 3) - explicitly mocked. TPU hand
// counts only apply to TPU-enabled games; ambient games intentionally
// score low on motion without that meaning low engagement.
// -------------------------------------------------------------------------

export const INTERACTION_STATS = GAMES.map(g => {
  const motion = g.type === 'active'
    ? clamp(Math.round(randFloat(rng, 45, 92, 0)), 0, 100)
    : clamp(Math.round(randFloat(rng, 5, 30, 0)), 0, 100);
  const avgHands = g.tpu ? Number(randFloat(rng, 1.1, 3.2, 1)) : null;
  const effort = g.type === 'active'
    ? clamp(Math.round(randFloat(rng, 40, 95, 0)), 0, 100)
    : clamp(Math.round(randFloat(rng, 10, 45, 0)), 0, 100);
  return { ...g, motion, avgHands, effort };
});

// -------------------------------------------------------------------------
// Game selection journey / funnel
// -------------------------------------------------------------------------

export const SELECTION_FUNNEL = [
  { step: 'Home', count: 18420, sub: 'Menu opened' },
  { step: 'Games', count: 15680, sub: 'Browsed catalogue' },
  { step: 'Category', count: 12140, sub: 'Filtered a category' },
  { step: 'Game viewed', count: 10380, sub: 'Card opened' },
  { step: 'Game selected', count: 8760, sub: 'Selection confirmed' },
  { step: 'Game started', count: 8290, sub: 'GAME_START logged' },
];

// From the usage-data audit (28 Jun - 1 Sep 2026): 6.2% of usable GAME_START
// records after cleaning were flagged handpicked. The remainder isn't
// currently split between shuffle and un-flagged manual browsing - that's a
// real, confirmed gap, not an estimate we're choosing not to show.
export const SELECTION_SOURCE = [
  { source: 'Handpicked (confirmed)', pct: 6.2 },
  { source: 'Not flagged handpicked (shuffle or manual - not yet distinguished)', pct: 93.8 },
];

// -------------------------------------------------------------------------
// Live feed / world view
// -------------------------------------------------------------------------

export function generateLiveFeed(n = 14) {
  const r = makeRng(Date.now() % 100000 + 7);
  const events = [];
  const kinds = ['start', 'end', 'reconnect', 'offline'];
  for (let i = 0; i < n; i++) {
    const device = pick(r, DEVICES);
    const kind = weightedPick(r, kinds, [0.46, 0.30, 0.16, 0.08]);
    const game = pick(r, GAMES);
    events.push({
      id: `ev${i}`,
      kind,
      device,
      game: game.name,
      time: minutesAgo(randInt(r, 0, 240)),
    });
  }
  return events.sort((a, b) => b.time - a.time);
}

export function currentlyActiveDevices() {
  return DEVICES.filter(d => !d.isOffline && d.lastSeenMinutes < 15);
}

export function topGamesRightNow(r = rng) {
  const active = currentlyActiveDevices();
  const counts = {};
  active.forEach(d => {
    const g = d.currentGame || pick(r, GAMES).name;
    counts[g] = (counts[g] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

// -------------------------------------------------------------------------
// Data quality / diagnostics
// -------------------------------------------------------------------------

export const DQ_ISSUE_TYPES = [
  { key: 'missing_end', label: 'Missing GAME_END', sev: 'action' },
  { key: 'missing_id', label: 'Missing Game ID', sev: 'attention' },
  { key: 'negative_duration', label: 'Negative duration', sev: 'critical' },
  { key: 'extreme_duration', label: 'Extreme duration (>4h)', sev: 'attention' },
  { key: 'placeholder_value', label: 'Placeholder / mixed-type value', sev: 'attention' },
  { key: 'stopped_logging', label: 'Stopped logging suddenly', sev: 'critical' },
];

export function generateDqIssues(n = 26) {
  const r = makeRng(4471);
  const out = [];
  for (let i = 0; i < n; i++) {
    const type = pick(r, DQ_ISSUE_TYPES);
    const device = pick(r, DEVICES);
    out.push({
      id: `dq${i}`,
      type: type.label,
      sev: type.sev,
      device,
      detectedAt: minutesAgo(randInt(r, 5, 60 * 24 * 6)),
      detail: dqDetail(type.key, r),
    });
  }
  return out.sort((a, b) => b.detectedAt - a.detectedAt);
}

function dqDetail(key, r) {
  switch (key) {
    case 'missing_end': return `GAME_START logged, no matching GAME_END within session window`;
    case 'missing_id': return `Session recorded with empty game_id field`;
    case 'negative_duration': return `Reconstructed duration: ${randInt(r, -240, -1)}s`;
    case 'extreme_duration': return `Reconstructed duration: ${randFloat(r, 4.2, 11, 1)}h`;
    case 'placeholder_value': return `Field contains literal "undefined" / "null" string`;
    case 'stopped_logging': return `No events received for ${randInt(r, 4, 21)} days after regular reporting`;
    default: return '';
  }
}

// Baseline derived from the usage-data audit: 827,500 events across 1,291
// devices over the 28 Jun - 1 Sep 2026 window (~9.85 events/device/day),
// matching this fleet's device count directly.
export const EVENT_VOLUME = (() => {
  const out = [];
  let base = 12720;
  for (let i = 29; i >= 0; i--) {
    const date = daysAgo(i);
    const noise = randFloat(rng, 0.9, 1.1, 3);
    out.push({ date, events: Math.round(base * noise), missingFields: Math.round(base * noise * randFloat(rng, 0.004, 0.02, 4)) });
    base += randFloat(rng, -105, 155, 0);
  }
  return out;
})();

export const ERRORS_BY_VERSION = SOFTWARE_VERSIONS.map((v, i) => ({
  version: v,
  errors: Math.round(randFloat(rng, 40, 90, 0) * SW_WEIGHTS[i] * 6),
  crashes: Math.round(randFloat(rng, 4, 14, 0) * SW_WEIGHTS[i] * 6),
  pbitFailures: Math.round(randFloat(rng, 2, 9, 0) * SW_WEIGHTS[i] * 6),
}));

// -------------------------------------------------------------------------
// Operations - fleet-wide PBIT breakdown, remote actions, recurring issues,
// and failure grouping by hardware revision / batch / distributor
// -------------------------------------------------------------------------

export const PBIT_FLEET_STATS = PBIT_COMPONENTS.map(c => {
  const counts = { pass: 0, warning: 0, fail: 0 };
  DEVICES.forEach(d => { counts[d.pbit[c]]++; });
  return { component: c, ...counts };
});

const REMOTE_ACTION_TYPES = ['Pushed software update', 'Remote restart', 'Config reset', 'Escalated to field service'];

export const REMOTE_ACTIONS = (() => {
  const r = makeRng(8823);
  const candidates = DEVICES.filter(d => d.technicalHealth === 'action' || d.technicalHealth === 'attention');
  return candidates.slice(0, 24).map((d, i) => {
    const outcome = weightedPick(r, ['improved', 'no change', 'pending'], [0.58, 0.22, 0.20]);
    return {
      id: `ra${i}`,
      device: d,
      action: pick(r, REMOTE_ACTION_TYPES),
      date: daysAgo(randInt(r, 1, 21)),
      outcome,
    };
  });
})();

export const RECURRING_ISSUES = (() => {
  const r = makeRng(5510);
  return DEVICES.filter(d => d.errorCount7d > 5 || d.crashCount30d > 2 || Object.values(d.pbit).includes('fail'))
    .slice(0, 18)
    .map(d => ({
      device: d,
      pattern: d.crashCount30d > 2
        ? `${d.crashCount30d} crash/freeze events in 30 days - recurring, not one-off`
        : Object.values(d.pbit).includes('fail')
          ? `Repeated PBIT state change on ${PBIT_COMPONENTS.find(c => d.pbit[c] === 'fail')}`
          : `${d.errorCount7d} errors in 7 days, trending up week over week`,
      firstSeen: daysAgo(randInt(r, 14, 60)),
    }));
})();

function groupFailures(keyFn) {
  const groups = {};
  DEVICES.forEach(d => {
    const k = keyFn(d);
    if (!groups[k]) groups[k] = { key: k, deviceCount: 0, action: 0, attention: 0, errors: 0 };
    groups[k].deviceCount++;
    if (d.technicalHealth === 'action') groups[k].action++;
    if (d.technicalHealth === 'attention') groups[k].attention++;
    groups[k].errors += d.errorCount7d;
  });
  return Object.values(groups).map(g => ({ ...g, failureRate: Math.round(((g.action + g.attention) / g.deviceCount) * 100) }));
}

export const FAILURE_BY_BATCH = groupFailures(d => d.batch).sort((a, b) => a.key.localeCompare(b.key));
export const FAILURE_BY_REVISION = groupFailures(d => d.hardwareRevision).sort((a, b) => a.key.localeCompare(b.key));
export const FAILURE_BY_DISTRIBUTOR = groupFailures(d => d.distributor).sort((a, b) => b.failureRate - a.failureRate);

// -------------------------------------------------------------------------
// Commerce - customer/fleet value, reliability & adoption
// -------------------------------------------------------------------------

export const CUSTOMER_VALUE = CUSTOMERS.map(c => {
  const devs = DEVICES.filter(d => d.customerId === c.id);
  const minutes = devs.reduce((s, d) => s + d.minutesLast30d, 0);
  const sessions = devs.reduce((s, d) => s + d.sessionsLast30d, 0);
  const activeDevices = devs.filter(d => d.usageHealth === 'active' || d.usageHealth === 'light').length;
  return {
    ...c,
    deviceCount: devs.length,
    minutes,
    sessions,
    activeDevices,
    engagementTrend: randFloat(rng, -8, 15, 1),
    subscriptionMix: [...new Set(devs.map(d => d.subscription))],
  };
}).filter(c => c.deviceCount > 0).sort((a, b) => b.minutes - a.minutes);

export const RELIABILITY_BY_TYPE = DEVICE_TYPES.map(t => {
  const devs = DEVICES.filter(d => d.type === t);
  const onlineRate = (devs.filter(d => d.lastSeenMinutes < 60 * 24).length / devs.length) * 100;
  const upToDateRate = (devs.filter(d => d.softwareVersion === SOFTWARE_VERSIONS[0]).length / devs.length) * 100;
  return { type: t, count: devs.length, onlineRate: Math.round(onlineRate), upToDateRate: Math.round(upToDateRate) };
});

export const UPTIME_TREND = Array.from({ length: 12 }, (_, i) => ({
  week: `W${i + 1}`,
  uptime: randFloat(rng, 96.2, 99.6, 1),
}));

// -------------------------------------------------------------------------
// Operations - error/crash timeline (daily, 30 days)
// -------------------------------------------------------------------------

export const ERROR_TIMELINE = (() => {
  const out = [];
  let base = 34;
  for (let i = 29; i >= 0; i--) {
    const date = daysAgo(i);
    const noise = randFloat(rng, 0.75, 1.3, 3);
    out.push({ date, errors: Math.max(0, Math.round(base * noise)), crashes: Math.max(0, Math.round(base * noise * 0.22)) });
    base += randFloat(rng, -3, 4, 1);
  }
  return out;
})();

// -------------------------------------------------------------------------
// Software - requested future metrics and current status (doc §8/§9)
// -------------------------------------------------------------------------

export const METRIC_ROADMAP = [
  { metric: 'Explicit selection-source field (manual / shuffle / quick-pick)', teams: ['rd', 'product', 'commerce'], status: 'integration', note: 'Handpicked already exists as a signal; a dedicated field would sharpen manual-vs-shuffle reporting.' },
  { metric: 'Game-card impression / catalogue navigation events', teams: ['rd'], status: 'new-tracking', note: 'Needed to know how many games were viewed before the one that got picked.' },
  { metric: 'Interaction / motion coverage as a general online metric', teams: ['rd', 'product', 'software'], status: 'new-tracking', note: 'Motion was previously available but isn’t a standard tracked field today - Software already flagged storage cost from the earlier motion-data approach.' },
  { metric: 'TPU hand-count exposed as an engagement signal', teams: ['rd', 'commerce'], status: 'definition', note: 'Technically possible for TPU-enabled games only, and must never be read as a count of people.' },
  { metric: 'Player effort metric', teams: ['rd', 'product'], status: 'definition', note: 'No agreed definition of "effort" yet - needs a formula before it can leave concept stage.' },
  { metric: 'Game category / use-type classification (active vs. ambient)', teams: ['rd', 'product'], status: 'definition', note: 'Needed before an active-vs-ambient comparison can be trusted as more than illustrative.' },
  { metric: 'Pixie orientation extraction (ORIENTATION_CHANGED)', teams: ['rd'], status: 'integration', note: 'Already tracked on-device - needs extraction and visualisation, not new instrumentation.' },
  { metric: 'Reliable local-time / geographic event time', teams: ['rd', 'product'], status: 'integration', note: 'Usage data exists; geographic and local-time reliability still needs work.' },
  { metric: 'GeoIP device location', teams: ['product', 'commerce'], status: 'integration', note: 'Collection has started, but isn’t yet reliable enough to be more than an approximate map.' },
  { metric: 'MQTT live event querying at fleet scale', teams: ['product'], status: 'integration', note: 'Technically supported direction; not yet queried reliably end-to-end for a live view.' },
  { metric: 'Per-button menu / UI heatmap telemetry', teams: ['product', 'rd'], status: 'new-tracking', note: 'Broad screen paths can be reconstructed; exact button presses cannot yet.' },
  { metric: 'Customer / fleet hierarchy', teams: ['product', 'commerce', 'ops'], status: 'integration', note: 'Needed for any aggregated, care-home-level, or fleet-level report.' },
  { metric: 'Subscription / entitlement data', teams: ['commerce', 'rd'], status: 'integration', note: 'Needed to separate "popular" from "one of the few games actually unlocked".' },
  { metric: 'PBIT hardware diagnostics', teams: ['product', 'ops'], status: 'planned', note: 'Planned feature - components are already identified, results are not yet flowing in.' },
  { metric: 'Crash / freeze logs in Elasticsearch', teams: ['ops', 'software'], status: 'integration', note: 'Exists in Toverview today; not yet joined into the same pipeline as everything else here.' },
  { metric: 'Hardware batch / distributor metadata', teams: ['ops'], status: 'integration', note: 'May live in Salesforce today - not yet joined to device telemetry for pattern analysis.' },
  { metric: 'Remote-management action logging', teams: ['ops'], status: 'new-tracking', note: 'Needed to actually measure whether a pushed fix resolved the issue, not just that it was sent.' },
  { metric: 'AI-generated explanations of graphs', teams: ['rd'], status: 'definition', note: 'Raised as an idea in the R&D session - doc note: wait until the underlying metrics are trustworthy first.' },
];
