// =========================================================================
// Data layer for Tover Insights.
//
// Real data comes from SNAPSHOT (js/realData.js), an Elasticsearch extract
// produced by scripts/build_snapshot.py:
//   - usagelog-*  one doc per game session -> minutes, sessions, games
//   - eventlog-*  PING / lifecycle events  -> fleet, last seen, version,
//                 partner, GeoIP; SPDLOG   -> device error log lines
//
// Anything Elasticsearch doesn't hold (subscriptions, hardware revision,
// batches, PBIT, hands/motion, crashes, uptime, remote actions) is still
// generated from a seeded RNG and keeps its 'mock' / 'planned' / 'integration'
// pill in the UI. Pages only consume plain objects from here, so swapping a
// mock for a real source later still only touches this file.
// =========================================================================

import { makeRng, pick, randInt, randFloat, clamp, daysAgo } from './utils.js';
import { SNAPSHOT } from './realData.js';

const rng = makeRng(20260922);

const SNAPSHOT_NOW = new Date(SNAPSHOT.meta.snapshotAt).getTime();
const localDate = (iso) => { const [y, m, d] = iso.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };

// The windows the real numbers cover - shown in page copy so nobody reads a
// 30-day total ending 29 Sep as "the last 30 days from today".
export const DATA_WINDOW = {
  snapshotAt: new Date(SNAPSHOT.meta.snapshotAt),
  usageFrom: localDate(SNAPSHOT.meta.usageFrom),
  usageTo: localDate(SNAPSHOT.meta.usageTo),
  usage30From: localDate(SNAPSHOT.meta.usage30From),
  errors7From: localDate(SNAPSHOT.meta.last7From),
};

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

const COUNTRY_NAMES = {
  NL: 'Netherlands', DE: 'Germany', BE: 'Belgium', GB: 'United Kingdom', US: 'United States', FR: 'France',
  DK: 'Denmark', AU: 'Australia', CA: 'Canada', SE: 'Sweden', NO: 'Norway', CH: 'Switzerland', AT: 'Austria',
  IE: 'Ireland', ES: 'Spain', NZ: 'New Zealand', LU: 'Luxembourg', GG: 'Guernsey', GF: 'French Guiana',
  IT: 'Italy', FI: 'Finland', PL: 'Poland', PT: 'Portugal', JP: 'Japan', SG: 'Singapore',
};

// Product line is encoded in the serial number pattern; ES's numeric
// device_type agrees (1 = M-serials, 2/5 = 00xxH-serials, 3 = T3, 4/6 = P).
// Serials matching none of these are dev machines / test rigs and are left
// out of the fleet.
const SERIAL_TYPES = [
  { re: /^T3-[0-9A-Z]{3}-[0-9A-Z]{5}$/, type: 'Tovertafel 3' },
  { re: /^P-[0-9A-Z]{3}-[0-9A-Z]{5}$/, type: 'Pixie' },
  { re: /^\d{4}[A-Z]\d{4}$/, type: 'Tovertafel 2' },
  { re: /^M\d{2}H/, type: 'Tovertafel Original' },
];
const typeForSerial = (s) => (SERIAL_TYPES.find(t => t.re.test(s)) || {}).type || null;

export const DEVICE_TYPES = ['Tovertafel 2', 'Tovertafel 3', 'Tovertafel Original', 'Pixie'];

// Release builds only (vX.Y.Z), most widely installed, newest first.
// SOFTWARE_VERSIONS[0] is treated as "latest" for update-adoption views.
const stripV = (v) => v ? v.replace(/^v(?=\d)/, '') : 'unknown';
const isRelease = (v) => /^\d+\.\d+\.\d+$/.test(v);
const semverCmp = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); return (y[0] - x[0]) || (y[1] - x[1]) || (y[2] - x[2]); };

export const SUBSCRIPTIONS = ['Base Light', 'Base Plus', 'Plus Complete', 'Light Complete'];

export const GAME_CATEGORIES = ['Cognitive', 'Physical', 'Sensory', 'Social'];

// Curated catalogue metadata (categories, level, active/ambient, TPU), from
// the Tover Game Collections Analysis workbook. Usage itself comes from
// Elasticsearch; this table only supplies the descriptive fields for games
// that can be matched to an ES game id (see CATALOGUE_BY_ES_ID).
const CATALOGUE = [
  { id: 'g_birthday_cake', name: 'Birthday Cake', categories: ['Sensory', 'Social'], category: 'Sensory', level: 3, platforms: ['Pixie', 'Tovertafel'], type: 'ambient', tpu: false, weight: 15, mostPreferred: true, leastPreferred: false, highContrast: false },
  { id: 'g_flying_saucer', name: 'Flying Saucer', categories: ['Physical', 'Social'], category: 'Physical', level: 2, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: true, weight: 11, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_bubble_bath', name: 'Bubble Bath', categories: ['Physical', 'Sensory'], category: 'Physical', level: 2, platforms: ['Pixie', 'Tovertafel'], type: 'ambient', tpu: false, weight: 11, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_dream_stars', name: 'Dream Stars', categories: ['Sensory'], category: 'Sensory', level: 1, platforms: ['Pixie'], type: 'ambient', tpu: false, weight: 10, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_hamster_maze', name: 'Hamster Maze', categories: ['Cognitive', 'Social'], category: 'Cognitive', level: 5, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: true, weight: 10, mostPreferred: true, leastPreferred: false, highContrast: false },
  { id: 'g_monster_pairs', name: 'Monster Pairs', categories: ['Cognitive', 'Social'], category: 'Cognitive', level: 3, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: true, weight: 10, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_rainbow', name: 'Rainbow', categories: ['Physical', 'Sensory'], category: 'Physical', level: 2, platforms: ['Tovertafel'], type: 'ambient', tpu: false, weight: 10, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_soccer_match', name: 'Soccer Match', categories: ['Physical', 'Social'], category: 'Physical', level: 4, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: true, weight: 10, mostPreferred: true, leastPreferred: false, highContrast: true },
  { id: 'g_butterflies', name: 'Butterflies', categories: ['Physical', 'Sensory'], category: 'Physical', level: 2, platforms: ['Pixie', 'Tovertafel'], type: 'ambient', tpu: false, weight: 9, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_ladybirds', name: 'Ladybirds', categories: ['Physical', 'Sensory'], category: 'Physical', level: 3, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: true, weight: 9, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_fish', name: 'Fish', categories: ['Sensory', 'Social'], category: 'Sensory', level: 2, platforms: ['Pixie', 'Tovertafel'], type: 'ambient', tpu: false, weight: 8, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_seasonal_memo', name: 'Seasonal Memo', categories: ['Cognitive', 'Social'], category: 'Cognitive', level: 5, platforms: ['Tovertafel'], type: 'active', tpu: true, weight: 8, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_animal_sounds', name: 'Animal Sounds', categories: ['Cognitive', 'Social'], category: 'Cognitive', level: 4, platforms: ['Tovertafel'], type: 'ambient', tpu: false, weight: 8, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_hobby_sets', name: 'Hobby Sets', categories: ['Cognitive', 'Social'], category: 'Cognitive', level: 4, platforms: ['Pixie', 'Tovertafel'], type: 'ambient', tpu: false, weight: 8, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_paint_splatters', name: 'Paint Splatters', categories: ['Physical', 'Sensory'], category: 'Physical', level: 2, platforms: ['Pixie', 'Tovertafel'], type: 'ambient', tpu: false, weight: 8, mostPreferred: true, leastPreferred: false, highContrast: true },
  { id: 'g_windmills', name: 'Windmills', categories: ['Physical', 'Social'], category: 'Physical', level: 3, platforms: ['Tovertafel'], type: 'active', tpu: true, weight: 8, mostPreferred: true, leastPreferred: false, highContrast: false },
  { id: 'g_wordsmith', name: 'Wordsmith', categories: ['Cognitive', 'Social'], category: 'Cognitive', level: 4, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: true, weight: 8, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_molehunt', name: 'Molehunt', categories: ['Cognitive', 'Physical', 'Social'], category: 'Cognitive', level: 4, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: true, weight: 7, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_music_box', name: 'Music Box', categories: ['Cognitive', 'Social'], category: 'Cognitive', level: 3, platforms: ['Pixie', 'Tovertafel'], type: 'ambient', tpu: false, weight: 7, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_safe_cracker', name: 'Safe Cracker', categories: ['Cognitive', 'Social'], category: 'Cognitive', level: 5, platforms: ['Tovertafel'], type: 'active', tpu: true, weight: 7, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_sheet_music', name: 'Sheet Music', categories: ['Physical', 'Sensory'], category: 'Physical', level: 3, platforms: ['Pixie', 'Tovertafel'], type: 'ambient', tpu: false, weight: 7, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_match_maker', name: 'Match Maker', categories: ['Cognitive', 'Social'], category: 'Cognitive', level: 4, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: true, weight: 7, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_balloon', name: 'Balloon', categories: ['Physical', 'Social'], category: 'Physical', level: 4, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: true, weight: 6, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_lava_bubbles', name: 'Lava Bubbles', categories: ['Sensory'], category: 'Sensory', level: 1, platforms: ['Pixie'], type: 'ambient', tpu: false, weight: 6, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_sandy_beach', name: 'Sandy Beach', categories: ['Physical', 'Sensory'], category: 'Physical', level: 3, platforms: ['Pixie', 'Tovertafel'], type: 'ambient', tpu: false, weight: 6, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_animal_pairs', name: 'Animal Pairs', categories: ['Cognitive', 'Social'], category: 'Cognitive', level: 3, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: true, weight: 6, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_candy_fish', name: 'Candy Fish', categories: ['Physical', 'Social'], category: 'Physical', level: 4, platforms: ['Tovertafel'], type: 'active', tpu: true, weight: 6, mostPreferred: true, leastPreferred: false, highContrast: false },
  { id: 'g_masterpieces', name: 'Masterpieces', categories: ['Physical', 'Sensory'], category: 'Physical', level: 3, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: true, weight: 6, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_movement_dice', name: 'Movement Dice', categories: ['Physical', 'Social'], category: 'Physical', level: 3, platforms: ['Tovertafel'], type: 'active', tpu: true, weight: 6, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_pond', name: 'Pond', categories: ['Physical', 'Sensory'], category: 'Physical', level: 2, platforms: ['Pixie', 'Tovertafel'], type: 'ambient', tpu: false, weight: 6, mostPreferred: false, leastPreferred: false, highContrast: true },
  { id: 'g_steam_train', name: 'Steam Train', categories: ['Cognitive', 'Social'], category: 'Cognitive', level: 3, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: true, weight: 6, mostPreferred: true, leastPreferred: false, highContrast: false },
  { id: 'g_coral_reef', name: 'Coral Reef', categories: ['Physical', 'Sensory', 'Social'], category: 'Physical', level: 2, platforms: ['Pixie', 'Tovertafel'], type: 'ambient', tpu: false, weight: 5, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_transport_puzzle', name: 'Transport puzzle', categories: ['Social'], category: 'Social', level: 3, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: true, weight: 5, mostPreferred: false, leastPreferred: false, highContrast: true },
  { id: 'g_beach_ball', name: 'Beach Ball', categories: ['Physical', 'Social'], category: 'Physical', level: 2, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: true, weight: 5, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_chatterboxes', name: 'Chatterboxes', categories: ['Cognitive', 'Physical', 'Social'], category: 'Cognitive', level: 3, platforms: ['Pixie'], type: 'active', tpu: true, weight: 5, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_cloudy_sky', name: 'Cloudy Sky', categories: ['Sensory'], category: 'Sensory', level: 1, platforms: ['Pixie'], type: 'ambient', tpu: false, weight: 5, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_leaves', name: 'Leaves', categories: ['Physical', 'Sensory'], category: 'Physical', level: 2, platforms: ['Pixie', 'Tovertafel'], type: 'ambient', tpu: false, weight: 5, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_moles', name: 'Moles', categories: ['Physical', 'Social'], category: 'Physical', level: 4, platforms: ['Tovertafel'], type: 'active', tpu: true, weight: 5, mostPreferred: true, leastPreferred: false, highContrast: true },
  { id: 'g_nostalgia_puzzle', name: 'Nostalgia Puzzle', categories: ['Cognitive', 'Social'], category: 'Cognitive', level: 3, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: true, weight: 5, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_puppies', name: 'Puppies', categories: ['Sensory', 'Social'], category: 'Sensory', level: 3, platforms: ['Tovertafel'], type: 'ambient', tpu: false, weight: 5, mostPreferred: false, leastPreferred: false, highContrast: true },
  { id: 'g_evening_lights', name: 'Evening Lights', categories: ['Physical', 'Sensory'], category: 'Physical', level: 2, platforms: ['Pixie', 'Tovertafel'], type: 'ambient', tpu: false, weight: 4, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_marbles', name: 'Marbles', categories: ['Physical', 'Social'], category: 'Physical', level: 4, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: true, weight: 4, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_animal_puzzle', name: 'Animal Puzzle', categories: ['Social'], category: 'Social', level: 3, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: true, weight: 4, mostPreferred: false, leastPreferred: false, highContrast: true },
  { id: 'g_baby_monsters', name: 'Baby Monsters', categories: ['Cognitive', 'Social'], category: 'Cognitive', level: 5, platforms: ['Tovertafel'], type: 'active', tpu: true, weight: 4, mostPreferred: true, leastPreferred: false, highContrast: false },
  { id: 'g_colored_lens', name: 'Colored Lens', categories: ['Sensory'], category: 'Sensory', level: 1, platforms: ['Pixie'], type: 'ambient', tpu: false, weight: 4, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_constellations', name: 'Constellations', categories: ['Cognitive', 'Social'], category: 'Cognitive', level: 3, platforms: ['Tovertafel'], type: 'ambient', tpu: false, weight: 4, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_instrument_pairs', name: 'Instrument Pairs', categories: ['Cognitive', 'Social'], category: 'Cognitive', level: 3, platforms: ['Pixie', 'Tovertafel'], type: 'active', tpu: true, weight: 4, mostPreferred: false, leastPreferred: false, highContrast: false },
  { id: 'g_rocket_sums', name: 'Rocket Sums', categories: ['Cognitive', 'Social'], category: 'Cognitive', level: 5, platforms: ['Tovertafel'], type: 'active', tpu: true, weight: 4, mostPreferred: false, leastPreferred: true, highContrast: false },
];

// ES game ids (generic_string, with variant prefixes/suffixes stripped) that
// confidently match a catalogue entry. Unmatched ids are still shown with
// their real usage, just without category/level/type.
const CATALOGUE_BY_ES_ID = {
  BIRTHDAY: 'g_birthday_cake', BEACHBALL: 'g_beach_ball', FISHES: 'g_fish', BUTTERFLIES: 'g_butterflies',
  LEAVES: 'g_leaves', PAINTSPLATTERS: 'g_paint_splatters', BUBBLE_BATH: 'g_bubble_bath', HAMSTER_MAZE: 'g_hamster_maze',
  RAINBOW: 'g_rainbow', POND: 'g_pond', PUPPIES: 'g_puppies', LADYBUGS: 'g_ladybirds', CANDYFISH: 'g_candy_fish',
  MUSICBOX: 'g_music_box', MOLES: 'g_moles', BABY_MONSTERS: 'g_baby_monsters', MATCHMAKER: 'g_match_maker',
  PUZZLE_TRANSPORTATION: 'g_transport_puzzle', SOCCER: 'g_soccer_match',
};

const PRETTY_NAMES = {
  MUSICORGAN: 'Music Organ', SPINNINGTOPS: 'Spinning Tops', BIRDFEEDER: 'Bird Feeder', BLOBNOTES: 'Blob Notes',
  COLOURMILLS: 'Colour Mills', COLOURINGBOOK: 'Colouring Book', RUMMYTILES: 'Rummy Tiles', STARSIGNS: 'Star Signs',
  BALLGAME: 'Ball Game', HIDEANDSEEK: 'Hide and Seek', MATHRACE: 'Math Race', AIRHOCKEY: 'Air Hockey',
  SINGALONG: 'Sing-along', WHAC_A_MOLE: 'Whac-a-Mole', EMO_QUIZ: 'Emotion Quiz', BEACHCOMBING: 'Beachcombing',
};

// Variant markers on ES game ids -> label appended to the display name.
const VARIANT_SUFFIXES = [
  ['_ADULTS_UGC', 'adults, custom'], ['_KIDS_UGC', 'kids, custom'], ['_UGC', 'custom'],
  ['_ORIGINAL', 'Original'], ['_SPROUT', 'Sprout'], ['_UNQ', 'unique'], ['_UP', 'UP'],
];

const CATALOGUE_BY_ID = Object.fromEntries(CATALOGUE.map(g => [g.id, g]));
const titleCase = (s) => s.toLowerCase().split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

function describeEsGame(key) {
  let base = key;
  const variants = [];
  if (base.startsWith('VI_')) { base = base.slice(3); variants.push('VI'); }
  for (const [suffix, label] of VARIANT_SUFFIXES) {
    if (base.endsWith(suffix)) { base = base.slice(0, -suffix.length); variants.push(label); break; }
  }
  const cat = CATALOGUE_BY_ID[CATALOGUE_BY_ES_ID[base]];
  const baseName = cat ? cat.name : (PRETTY_NAMES[base] || titleCase(base));
  return { cat, name: variants.length ? `${baseName} (${variants.join(', ')})` : baseName };
}

const PIXIE_DEVICE_TYPES = new Set(['4', '6']);

// Every game played in the 30-day usage window, with real minutes/sessions/
// reach. Pages use this both as the game list (filters) and the stats table.
export const GAMES = SNAPSHOT.games30.map(r => {
  const { cat, name } = describeEsGame(r.key);
  const types = Object.keys(r.byDeviceType || {});
  const platforms = [
    ...(types.some(t => PIXIE_DEVICE_TYPES.has(t)) ? ['Pixie'] : []),
    ...(types.some(t => !PIXIE_DEVICE_TYPES.has(t)) ? ['Tovertafel'] : []),
  ];
  return {
    id: 'es_' + r.key.toLowerCase(),
    esId: r.key,
    catalogueId: cat ? cat.id : null,
    name,
    categories: cat ? cat.categories : [],
    category: cat ? cat.category : 'Uncategorised',
    level: cat ? cat.level : null,
    platforms,
    type: cat ? cat.type : null,
    tpu: cat ? cat.tpu : false,
    minutes: r.minutes,
    sessions: r.sessions,
    deviceReach: r.devices,
    manualPct: null,
  };
});

const GAME_NAME_BY_ES_ID = Object.fromEntries(GAMES.map(g => [g.esId, g.name]));
export const gameName = (esId) => GAME_NAME_BY_ES_ID[esId] || (esId ? describeEsGame(esId).name : null);

// -------------------------------------------------------------------------
// Simulated per-device fields (not in Elasticsearch)
// -------------------------------------------------------------------------

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

function weightedPick(r, items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let x = r() * total;
  for (let i = 0; i < items.length; i++) {
    x -= weights[i];
    if (x <= 0) return items[i];
  }
  return items[items.length - 1];
}

function mockPbit(r) {
  const pbit = {};
  const flagged = r() < 0.16 ? pick(r, PBIT_COMPONENTS) : null;
  PBIT_COMPONENTS.forEach(c => {
    if (c === flagged) pbit[c] = r() < 0.3 ? 'fail' : 'warning';
    else pbit[c] = r() < 0.03 ? 'warning' : 'pass';
  });
  return pbit;
}

// -------------------------------------------------------------------------
// Devices (real fleet from eventlog/usagelog, plus the simulated fields above)
// -------------------------------------------------------------------------

// Health thresholds on SPDLOG error lines in the last 7 days of log data.
// Error volume is extremely skewed (a few devices log millions of lines), so
// these sit around the fleet's 75th / 95th percentiles.
const ERRORS_ATTENTION = 100;
const ERRORS_ACTION = 1000;
const OFFLINE_MINUTES = 60 * 24 * 3;

const fleetRows = SNAPSHOT.devices
  .map(d => ({ ...d, type: typeForSerial(d.serial) }))
  .filter(d => d.type)
  .sort((a, b) => a.serial.localeCompare(b.serial));

// Many devices report through IPs GeoIP can't place. For those, fall back to
// the most common real country among the same partner's devices, and mark it.
const partnerCountry = (() => {
  const counts = {};
  fleetRows.forEach(d => {
    if (!d.countryCode || !d.partner) return;
    counts[d.partner] = counts[d.partner] || {};
    counts[d.partner][d.countryCode] = (counts[d.partner][d.countryCode] || 0) + 1;
  });
  return Object.fromEntries(Object.entries(counts).map(([p, c]) => [p, Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]]));
})();

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const UNASSIGNED_PARTNER = 'Unassigned partner';

export const DEVICES = fleetRows.map((row, idx) => {
  const r = rng;
  const partner = row.partner || UNASSIGNED_PARTNER;
  const countryCode = row.countryCode || partnerCountry[row.partner] || null;
  const lastSeenMinutes = Math.max(0, Math.round((SNAPSHOT_NOW - row.lastSeenAt) / 60000));
  const isOffline = lastSeenMinutes > OFFLINE_MINUTES;

  let technicalHealth;
  if (isOffline) technicalHealth = 'offline';
  else if (row.errors7d >= ERRORS_ACTION) technicalHealth = 'action';
  else if (row.errors7d >= ERRORS_ATTENTION) technicalHealth = 'attention';
  else technicalHealth = 'healthy';

  const minutesLast30d = row.minutes30;
  let usageHealth;
  if (minutesLast30d >= 900) usageHealth = 'active';
  else if (minutesLast30d >= 200) usageHealth = 'light';
  else if (minutesLast30d >= 20) usageHealth = 'quiet';
  else usageHealth = 'dormant';

  return {
    id: `d${idx}`,
    serial: row.serial,
    type: row.type,
    customer: partner,
    customerId: 'p_' + slug(partner),
    distributor: partner,
    country: countryCode ? (COUNTRY_NAMES[countryCode] || countryCode) : 'Unknown',
    countryCode: countryCode || 'XX',
    countryInferred: !row.countryCode && !!countryCode,
    city: row.city,
    geo: row.lat != null && row.lon != null ? { lat: row.lat, lon: row.lon } : null,
    softwareVersion: stripV(row.softwareVersion),
    lastSeenMinutes,
    isOffline,
    installedAt: null,
    errorCount7d: row.errors7d,
    errorCount30d: row.errors30d,
    topError: row.topError,
    firstErrorAt: row.firstErrorAt ? new Date(row.firstErrorAt) : null,
    crashCount30d: null,
    restarts30d: row.startups30,
    technicalHealth,
    usageHealth,
    minutesLast30d,
    sessionsLast30d: row.sessions30,
    activeDays30: row.activeDays30,
    minutesLast15d: row.minutesLast15,
    minutesPrev15d: row.minutesPrev15,
    trend7d: row.trend7d,
    currentGame: null,
    // simulated - no source in Elasticsearch
    subscription: weightedPick(r, SUBSCRIPTIONS, [0.36, 0.28, 0.22, 0.14]),
    hardwareRevision: weightedPick(r, HARDWARE_REVISIONS, [0.34, 0.40, 0.26]),
    batch: pick(r, BATCHES),
    pbit: mockPbit(r),
  };
});

const DEVICE_BY_SERIAL = Object.fromEntries(DEVICES.map(d => [d.serial, d]));

export const SOFTWARE_VERSIONS = (() => {
  const counts = {};
  DEVICES.forEach(d => { if (isRelease(d.softwareVersion)) counts[d.softwareVersion] = (counts[d.softwareVersion] || 0) + 1; });
  return Object.entries(counts).filter(([, n]) => n >= 10).map(([v]) => v).sort(semverCmp);
})();

export const COUNTRIES = (() => {
  const byCode = {};
  DEVICES.forEach(d => {
    if (d.countryCode === 'XX') return;
    const c = byCode[d.countryCode] || (byCode[d.countryCode] = { code: d.countryCode, name: d.country, n: 0, lat: 0, lon: 0, geoN: 0 });
    c.n++;
    if (d.geo && !d.countryInferred) { c.lat += d.geo.lat; c.lon += d.geo.lon; c.geoN++; }
  });
  return Object.values(byCode)
    .sort((a, b) => b.n - a.n)
    .map(c => ({ code: c.code, name: c.name, lat: c.geoN ? c.lat / c.geoN : null, lon: c.geoN ? c.lon / c.geoN : null }));
})();

// Partners (distributors / account holders) are the closest thing to a
// "customer" Elasticsearch knows about - care-home level mapping lives
// outside ES and still needs integration.
export const CUSTOMERS = (() => {
  const byId = {};
  DEVICES.forEach(d => {
    const c = byId[d.customerId] || (byId[d.customerId] = { id: d.customerId, name: d.customer, n: 0, countries: {} });
    c.n++;
    if (d.countryCode !== 'XX') c.countries[d.countryCode] = (c.countries[d.countryCode] || 0) + 1;
  });
  return Object.values(byId).sort((a, b) => b.n - a.n).map(c => ({
    id: c.id, name: c.name, country: (Object.entries(c.countries).sort((a, b) => b[1] - a[1])[0] || ['XX'])[0],
  }));
})();

export const DISTRIBUTORS = CUSTOMERS.map(c => c.name);

// -------------------------------------------------------------------------
// Usage timeseries (90 days, real)
// -------------------------------------------------------------------------

export const USAGE_DAYS = 90;

export const USAGE_TIMESERIES = (() => {
  const byDate = Object.fromEntries(SNAPSHOT.usageDaily.map(r => [r.date, r]));
  const out = [];
  const end = DATA_WINDOW.usageTo;
  for (let i = USAGE_DAYS - 1; i >= 0; i--) {
    const date = new Date(end.getFullYear(), end.getMonth(), end.getDate() - i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const row = byDate[key];
    out.push({ date, minutes: row ? row.minutes : 0, sessions: row ? row.sessions : 0, devices: row ? row.devices : 0 });
  }
  return out;
})();

// -------------------------------------------------------------------------
// Game-level aggregates (real, last 30 days of usage data)
// -------------------------------------------------------------------------

export const GAME_STATS = [...GAMES].sort((a, b) => b.minutes - a.minutes);

// Categories come from the curated catalogue, so they only cover games that
// matched it; CATEGORY_COVERAGE says how much of all play that is.
export const CATEGORY_STATS = GAME_CATEGORIES.map(cat => {
  const games = GAME_STATS.filter(g => g.category === cat);
  return {
    category: cat,
    minutes: games.reduce((s, g) => s + g.minutes, 0),
    sessions: games.reduce((s, g) => s + g.sessions, 0),
    gameCount: games.length,
  };
}).filter(c => c.gameCount > 0).sort((a, b) => b.minutes - a.minutes);

export const CATEGORY_COVERAGE = (() => {
  const total = GAME_STATS.reduce((s, g) => s + g.minutes, 0);
  const categorised = CATEGORY_STATS.reduce((s, c) => s + c.minutes, 0);
  return total > 0 ? Math.round((categorised / total) * 100) : 0;
})();

export const USAGE_BY_HOUR = SNAPSHOT.hours;

// -------------------------------------------------------------------------
// Interaction / effort concepts (Page 3) - explicitly mocked, on the curated
// catalogue. TPU hand counts only apply to TPU-enabled games; ambient games
// intentionally score low on motion without that meaning low engagement.
// -------------------------------------------------------------------------

// Effort is only scored for active games, and is derived from hands: average
// concurrent hands relative to a 4-hand reference, capped at 100. Ambient
// games get no effort score (their value is not in how much people move).
export const EFFORT_REFERENCE_HANDS = 4;

export const INTERACTION_STATS = CATALOGUE.map(g => {
  const motion = g.type === 'active'
    ? clamp(Math.round(randFloat(rng, 45, 92, 0)), 0, 100)
    : clamp(Math.round(randFloat(rng, 5, 30, 0)), 0, 100);
  const avgHands = g.tpu ? Number(randFloat(rng, 1.2, 2.6, 1)) + (g.level - 2) * 0.25 : null;
  const effort = g.type === 'active' && avgHands !== null
    ? clamp(Math.round((avgHands / EFFORT_REFERENCE_HANDS) * 100), 0, 100)
    : null;
  return { ...g, motion, avgHands: avgHands === null ? null : Number(avgHands.toFixed(1)), effort };
});

export function levelEffort(stats = INTERACTION_STATS) {
  return [2, 3, 4, 5].map(level => {
    const inLevel = stats.filter(g => g.level === level);
    const active = inLevel.filter(g => g.type === 'active');
    return {
      level,
      games: inLevel.length,
      activeGames: active.length,
      ambientGames: inLevel.length - active.length,
      avgHands: active.length ? active.reduce((s, g) => s + g.avgHands, 0) / active.length : null,
      effort: active.length ? Math.round(active.reduce((s, g) => s + g.effort, 0) / active.length) : null,
    };
  });
}

// -------------------------------------------------------------------------
// Game selection journey / funnel (simulated - menu events don't map 1:1
// onto these steps yet)
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
// (In the 31 Aug - 29 Sep window only ~0.6% of GAME_STARTs carry the flag at
// all, too sparse to replace the audited figure.)
export const SELECTION_SOURCE = [
  { source: 'Handpicked (confirmed)', pct: 6.2 },
  { source: 'Not flagged handpicked (shuffle or manual - not yet distinguished)', pct: 93.8 },
];

// -------------------------------------------------------------------------
// Live feed / world view (real snapshot)
// -------------------------------------------------------------------------

const FEED_KIND = { GAME_START: 'start', GAME_END: 'end', VPN_CONNECT: 'reconnect', STARTUP: 'reconnect', VPN_DISCONNECT: 'offline', SHUTDOWN: 'offline' };

// Most recent lifecycle event per device at snapshot time (newest first).
export function generateLiveFeed(n = 14) {
  return SNAPSHOT.feed
    .filter(e => DEVICE_BY_SERIAL[e.serial] && FEED_KIND[e.event])
    .slice(0, n)
    .map((e, i) => ({ id: `ev${i}`, kind: FEED_KIND[e.event], device: DEVICE_BY_SERIAL[e.serial], game: gameName(e.game), time: new Date(e.time) }));
}

// "Active" = sent any event (PING included) in the last 15 minutes before
// the snapshot - online, not necessarily mid-session.
export function currentlyActiveDevices() {
  return DEVICES.filter(d => !d.isOffline && d.lastSeenMinutes < 15);
}

// Live per-device game state isn't in ES, so this is the most-played games
// on the last full day of usage data instead.
export function topGamesRightNow() {
  return SNAPSHOT.gamesLastDay.slice(0, 8).map(g => ({ name: gameName(g.key), count: g.sessions }));
}

// Daily event volume across eventlog-*; missingFields = events without a
// serial or software version.
export const EVENT_VOLUME = SNAPSHOT.eventsDaily.map(r => ({ date: localDate(r.date), events: r.events, missingFields: r.missing, devices: r.devices }));

// Errors = SPDLOG error lines (real). Crash and PBIT counts aren't in ES yet,
// so those two columns remain simulated.
export const ERRORS_BY_VERSION = SNAPSHOT.errorsByVersion
  .filter(r => r.version !== 'null')
  .slice(0, 8)
  .map(r => ({
    version: stripV(r.version),
    errors: r.errors,
    errorDevices: r.devices,
    crashes: randInt(rng, 2, 40),
    pbitFailures: randInt(rng, 1, 25),
  }));

export const ERROR_MESSAGES = SNAPSHOT.errorMessages;

// -------------------------------------------------------------------------
// Operations - fleet-wide PBIT breakdown (simulated), remote actions
// (simulated), recurring issues (real), failure grouping
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

const shorten = (s, n = 90) => s && s.length > n ? s.slice(0, n - 1) + '…' : s;

export const RECURRING_ISSUES = DEVICES
  .filter(d => d.errorCount7d >= ERRORS_ACTION && !d.isOffline)
  .sort((a, b) => b.errorCount7d - a.errorCount7d)
  .slice(0, 18)
  .map(d => ({
    device: d,
    pattern: `${d.errorCount7d.toLocaleString()} error lines in 7 days - mostly "${shorten(d.topError)}"`,
    firstSeen: d.firstErrorAt || DATA_WINDOW.usage30From,
  }));

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
export const FAILURE_BY_DISTRIBUTOR = groupFailures(d => d.distributor).filter(g => g.deviceCount >= 5).sort((a, b) => b.failureRate - a.failureRate);

// -------------------------------------------------------------------------
// Commerce - customer/fleet value, reliability & adoption
// -------------------------------------------------------------------------

export const CUSTOMER_VALUE = CUSTOMERS.map(c => {
  const devs = DEVICES.filter(d => d.customerId === c.id);
  const minutes = devs.reduce((s, d) => s + d.minutesLast30d, 0);
  const sessions = devs.reduce((s, d) => s + d.sessionsLast30d, 0);
  const last15 = devs.reduce((s, d) => s + d.minutesLast15d, 0);
  const prev15 = devs.reduce((s, d) => s + d.minutesPrev15d, 0);
  const activeDevices = devs.filter(d => d.usageHealth === 'active' || d.usageHealth === 'light').length;
  return {
    ...c,
    deviceCount: devs.length,
    minutes,
    sessions,
    activeDevices,
    // last 15 days vs the 15 before, within the 30-day usage window
    engagementTrend: prev15 > 0 ? ((last15 - prev15) / prev15) * 100 : 0,
    subscriptionMix: [...new Set(devs.map(d => d.subscription))],
  };
}).filter(c => c.deviceCount > 0).sort((a, b) => b.minutes - a.minutes);

export const RELIABILITY_BY_TYPE = DEVICE_TYPES.map(t => {
  const devs = DEVICES.filter(d => d.type === t);
  const onlineRate = devs.length ? (devs.filter(d => d.lastSeenMinutes < 60 * 24).length / devs.length) * 100 : 0;
  const upToDateRate = devs.length ? (devs.filter(d => d.softwareVersion === SOFTWARE_VERSIONS[0]).length / devs.length) * 100 : 0;
  return { type: t, count: devs.length, onlineRate: Math.round(onlineRate), upToDateRate: Math.round(upToDateRate) };
});

export const UPTIME_TREND = Array.from({ length: 12 }, (_, i) => ({
  week: `W${i + 1}`,
  uptime: randFloat(rng, 96.2, 99.6, 1),
}));

// -------------------------------------------------------------------------
// Operations - error timeline (daily, real SPDLOG lines; crashes simulated)
// -------------------------------------------------------------------------

export const ERROR_TIMELINE = SNAPSHOT.errorsDaily.map(r => ({
  date: localDate(r.date),
  errors: r.errors,
  errorDevices: r.devices,
  crashes: randInt(rng, 0, 6),
}));
