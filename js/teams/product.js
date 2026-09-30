// =========================================================================
// Product - Dashboard A (Live World View), Dashboard B (Product Behaviour
// & UI), Dashboard C (Device & Fleet Health)
// =========================================================================

import { esc, fmtNum, fmtMinutes, timeAgo } from '../utils.js';
import {
  renderTeamPage, filterSelect, filterDivider, filterResetButton, kpiCard,
  cardHead, availPill, infoDot, statusBadge, mountDataTable, renderFunnel, renderHeatmapMock,
} from '../components.js';
import { worldMapSvg, hBarChart, sparkline, SERIES_COLORS } from '../charts.js';
import {
  DEVICES, COUNTRIES, CUSTOMERS, SOFTWARE_VERSIONS, DEVICE_TYPES, SUBSCRIPTIONS,
  GAMES, GAME_CATEGORIES, generateLiveFeed, SELECTION_FUNNEL, INTERACTION_STATS,
} from '../data.js';
import { applyDeviceFilters } from '../filters.js';

export const TABS = [
  { key: 'world', label: 'Live World View' },
  { key: 'behaviour', label: 'Product Behaviour & UI' },
  { key: 'health', label: 'Device & Fleet Health' },
];

// -------------------------------------------------------------------------
// Live World View
// -------------------------------------------------------------------------

function hashCode(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return Math.abs(h); }
function gameForDevice(d) { return d.currentGame || GAMES[hashCode(d.id) % GAMES.length].name; }
function deviceGame(d) { return GAMES.find(g => g.name === gameForDevice(d)); }
function gameNameMatchesFilters(name, f) {
  if (f.game === 'all' && f.category === 'all') return true;
  const g = GAMES.find(x => x.name === name);
  if (!g) return false;
  if (f.game !== 'all' && g.id !== f.game) return false;
  if (f.category !== 'all' && g.category !== f.category) return false;
  return true;
}
function matchesGameFilters(d, f) { return gameNameMatchesFilters(gameForDevice(d), f); }
function mapStatus(d) { if (d.isOffline) return 'offline'; if (d.lastSeenMinutes < 15) return 'now'; if (d.lastSeenMinutes < 180) return 'recent'; return 'offline'; }
const STATUS_LABEL = { now: 'Active now', recent: 'Recently active', offline: 'Offline / not recently seen' };
const FEED_META = {
  start: { dot: 'var(--status-good)', verb: 'started a session' },
  end: { dot: 'var(--ink-faint)', verb: 'ended a session' },
  reconnect: { dot: 'var(--series-3)', verb: 'reconnected' },
  offline: { dot: 'var(--status-offline)', verb: 'went offline' },
};
let feedCache = null;
function getFeed() { if (!feedCache) feedCache = generateLiveFeed(18); return feedCache; }

function renderWorld(state) {
  const f = state.filters;
  const filtered = applyDeviceFilters(DEVICES, f).filter(d => matchesGameFilters(d, f));
  const now = filtered.filter(d => mapStatus(d) === 'now');
  const recent = filtered.filter(d => mapStatus(d) === 'recent');
  const offline = filtered.filter(d => mapStatus(d) === 'offline');
  const markers = filtered.map(d => ({ id: d.id, lat: d.geo.lat, lon: d.geo.lon, status: mapStatus(d), serial: d.serial, customer: d.customer, country: d.country, statusLabel: STATUS_LABEL[mapStatus(d)] }));

  const gameCounts = {};
  now.forEach(d => { const g = gameForDevice(d); gameCounts[g] = (gameCounts[g] || 0) + 1; });
  const topGames = Object.entries(gameCounts).map(([name, count]) => ({ label: name, value: count, color: 'var(--accent-yellow-deep)' })).sort((a, b) => b.value - a.value).slice(0, 7);
  const feed = getFeed().filter(e => applyDeviceFilters([e.device], f).length > 0 && gameNameMatchesFilters(e.game, f)).slice(0, 10);
  const byCountry = COUNTRIES.map(c => ({ country: c.name, total: filtered.filter(d => d.countryCode === c.code).length })).filter(r => r.total > 0);

  const body = `
    <div class="grid grid-kpi">
      ${kpiCard({ label: 'Active right now', value: fmtNum(now.length), sub: 'session in progress', tooltip: 'Devices with a live signal in the last 15 minutes. Supported once MQTT event querying is reliable.' })}
      ${kpiCard({ label: 'Recently active', value: fmtNum(recent.length), sub: 'seen within 3 hours' })}
      ${kpiCard({ label: 'Offline / stale', value: fmtNum(offline.length), sub: 'no signal in 3+ hours' })}
      ${kpiCard({ label: 'Countries reporting', value: fmtNum(byCountry.length), sub: `of ${fmtNum(COUNTRIES.length)} tracked regions` })}
    </div>

    <div class="grid grid-12">
      <div class="card span-8 card-flush" style="padding:0">
        <div style="padding:20px 20px 4px" class="flex items-center justify-between">
          <div class="titles"><h3 style="font-size:13.5px;font-weight:700">Fleet map</h3><div class="card-sub">Dot-grid projection · hover a marker for device detail</div></div>
          <div class="flex gap-2">${availPill('integration')}${availPill('mock')}</div>
        </div>
        <div class="map-wrap" style="margin:14px 20px 20px">
          ${worldMapSvg({ markers })}
          <div class="map-legend">
            <span class="legend-item"><span class="legend-swatch" style="background:var(--status-good);border-radius:50%"></span>Active now</span>
            <span class="legend-item"><span class="legend-swatch" style="background:var(--series-3);border-radius:50%"></span>Recently active</span>
            <span class="legend-item"><span class="legend-swatch" style="background:var(--status-offline);border-radius:50%"></span>Offline</span>
          </div>
        </div>
      </div>
      <div class="card span-4">
        ${cardHead('Recent activity', 'Live feed', availPill('mock'))}
        <div class="feed-list">
          ${feed.length ? feed.map(e => `
            <div class="feed-item" data-device-id="${esc(e.device.id)}" style="cursor:pointer">
              <span class="feed-dot" style="background:${FEED_META[e.kind].dot}"></span>
              <div class="feed-main"><div class="feed-title">${esc(e.device.customer)}</div><div class="feed-meta">${FEED_META[e.kind].verb}${e.kind === 'start' ? ' · ' + esc(e.game) : ''}</div></div>
              <div class="feed-time">${timeAgo(e.time)}</div>
            </div>`).join('') : `<div class="empty-state">No recent activity for this filter.</div>`}
        </div>
      </div>
    </div>

    <div class="grid grid-12">
      <div class="card span-5">
        ${cardHead('Top games right now', now.length ? `Across ${fmtNum(now.length)} live sessions` : 'No live sessions match this filter', availPill('mock'))}
        ${topGames.length ? hBarChart({ items: topGames, formatValue: (v) => fmtNum(v) + ' playing' }) : `<div class="empty-state">Nothing playing right now.</div>`}
      </div>
      <div class="card span-7">
        <div class="flex items-center justify-between" style="margin-bottom:4px">
          <div class="titles"><h3 style="font-size:13.5px;font-weight:700">Regional usage</h3><div class="card-sub">Live vs. recent vs. offline share by country / region</div></div>
          ${availPill('integration')}
        </div>
        <div data-table-mount="countries"></div>
      </div>
    </div>

    <div class="helper-text" style="max-width:760px">
      ${infoDot('')} Device coordinates are illustrative GeoIP-style placements, not a customer’s
      configured interface language or locale - those are two different fields, and only physical location belongs on this map.
    </div>
  `;

  return renderTeamPage(TABS, state, {
    eyebrow: 'Product · Dashboard A',
    title: 'Live World View',
    desc: 'Where the fleet is active right now, for design decisions and Customer Success.',
    sharedWith: 'Commerce (same map, partner-facing framing)',
    filtersHtml: `
      ${filterSelect('category', 'Game category', [{ value: 'all', label: 'All categories' }, ...GAME_CATEGORIES.map(c => ({ value: c, label: c }))], f.category)}
      ${filterSelect('game', 'Game', [{ value: 'all', label: 'All games' }, ...GAMES.map(g => ({ value: g.id, label: g.name }))], f.game)}
      ${filterDivider()}
      ${filterSelect('country', 'Country / region', [{ value: 'all', label: 'All countries / regions' }, ...COUNTRIES.map(c => ({ value: c.code, label: c.name }))], f.country)}
      ${filterSelect('deviceType', 'Device type', [{ value: 'all', label: 'All device types' }, ...DEVICE_TYPES.map(d => ({ value: d, label: d }))], f.deviceType)}
      ${filterSelect('customer', 'Customer / fleet', [{ value: 'all', label: 'All customers / fleets' }, ...CUSTOMERS.map(c => ({ value: c.id, label: c.name }))], f.customer)}
      ${filterSelect('version', 'Software version', [{ value: 'all', label: 'All versions' }, ...SOFTWARE_VERSIONS.map(v => ({ value: v, label: 'v' + v }))], f.version)}
      ${filterSelect('subscription', 'Subscription', [{ value: 'all', label: 'All subscriptions' }, ...SUBSCRIPTIONS.map(s => ({ value: s, label: s }))], f.subscription)}
      ${filterResetButton()}
    `,
    bodyHtml: body,
  });
}

function mountWorld(root, state) {
  const filtered = applyDeviceFilters(DEVICES, state.filters).filter(d => matchesGameFilters(d, state.filters));
  const rows = COUNTRIES.map(c => {
    const devs = filtered.filter(d => d.countryCode === c.code);
    return { id: c.code, country: c.name, total: devs.length, now: devs.filter(d => mapStatus(d) === 'now').length, recent: devs.filter(d => mapStatus(d) === 'recent').length, offline: devs.filter(d => mapStatus(d) === 'offline').length };
  }).filter(r => r.total > 0);
  mountDataTable(root, 'countries', {
    rows, rowKey: 'id', searchFields: ['country'], searchPlaceholder: 'Search country…', defaultSort: { col: 'total', dir: 'desc' },
    columns: [
      { key: 'country', label: 'Country / region' },
      { key: 'total', label: 'Devices', align: 'right', render: (r) => fmtNum(r.total) },
      { key: 'now', label: 'Active now', align: 'right', render: (r) => `<span style="color:var(--status-good);font-weight:700">${fmtNum(r.now)}</span>` },
      { key: 'recent', label: 'Recent', align: 'right', render: (r) => fmtNum(r.recent) },
      { key: 'offline', label: 'Offline', align: 'right', render: (r) => fmtNum(r.offline) },
    ],
  });
}

// -------------------------------------------------------------------------
// Product Behaviour & UI
// -------------------------------------------------------------------------

function renderBehaviour(state) {
  const f = state.filters;
  const CAT_ICON = { Cognitive: 'chip', Physical: 'bolt', Sensory: 'hand', Social: 'world' };
  const tiles = GAME_CATEGORIES.map(c => ({ label: c, icon: CAT_ICON[c] })).concat([{ label: 'Shuffle a game', icon: 'bolt', span: 2, accent: true }]);

  const assetItems = INTERACTION_STATS.filter(g => g.tpu && (f.category === 'all' || g.category === f.category) && (f.game === 'all' || g.id === f.game)).sort((a, b) => b.avgHands - a.avgHands).slice(0, 8)
    .map(g => ({ label: g.name, value: g.avgHands, color: 'var(--series-2)' }));
  const effortItems = INTERACTION_STATS.filter(g => (f.category === 'all' || g.category === f.category) && (f.game === 'all' || g.id === f.game)).sort((a, b) => b.effort - a.effort).slice(0, 8)
    .map(g => ({ label: g.name, value: g.effort, color: 'var(--series-5)' }));

  const body = `
    <div class="grid grid-12">
      <div class="card span-7">
        <div class="flex items-center justify-between" style="margin-bottom:4px">
          <div class="titles"><h3 style="font-size:13.5px;font-weight:700">Menu interaction heatmap</h3><div class="card-sub">Concept for where taps concentrate, and whether it matches the intended design</div></div>
        </div>
        ${renderHeatmapMock(tiles)}
      </div>
      <div class="card span-5">
        <div class="flex items-center justify-between" style="margin-bottom:2px">
          <div class="titles"><h3 style="font-size:13.5px;font-weight:700">Navigation journey</h3><div class="card-sub">Screens visited on the way to a game</div></div>
          <div class="flex gap-2">${availPill('integration')}</div>
        </div>
        ${renderFunnel(SELECTION_FUNNEL.map(s => ({ ...s })))}
        <div class="helper-text mt-2">Broad screen paths can already be reconstructed; the exact catalogue/button-level journey cannot yet.</div>
      </div>
    </div>

    <div class="grid grid-12">
      <div class="card span-6">
        <div class="flex items-center justify-between" style="margin-bottom:4px">
          <div class="titles"><h3 style="font-size:13.5px;font-weight:700">Game asset interaction</h3><div class="card-sub">Hand-collision intensity with in-game assets, TPU games</div></div>
          ${availPill('mock')}
        </div>
        ${assetItems.length ? hBarChart({ items: assetItems, formatValue: (v) => v.toFixed(1) + ' avg hands' }) : `<div class="empty-state">No TPU games in this filter.</div>`}
        <div class="helper-text mt-3">TPU can identify individual hands only in TPU-enabled games - this is not a general analytics field yet.</div>
      </div>
      <div class="card span-6">
        ${cardHead('Player effort by game', 'Could later feed design recommendations', availPill('definition'))}
        ${hBarChart({ items: effortItems, formatValue: (v) => v + '/100' })}
      </div>
    </div>
  `;

  return renderTeamPage(TABS, state, {
    eyebrow: 'Product · Dashboard B',
    title: 'Product Behaviour & UI',
    desc: 'Where people tap, how they navigate to a game, and how much interaction different games involve - to improve design and recommendations.',
    sharedWith: 'Research & Design (interaction concepts) and Commerce (adoption framing)',
    filtersHtml: `
      ${filterSelect('category', 'Category', [{ value: 'all', label: 'All categories' }, ...GAME_CATEGORIES.map(c => ({ value: c, label: c }))], f.category)}
      ${filterSelect('game', 'Game', [{ value: 'all', label: 'All games' }, ...GAMES.map(g => ({ value: g.id, label: g.name }))], f.game)}
      ${filterResetButton()}
    `,
    bodyHtml: body,
  });
}

// -------------------------------------------------------------------------
// Device & Fleet Health
// -------------------------------------------------------------------------

const LATEST_VERSION = SOFTWARE_VERSIONS[0];
function pbitOverall(device) {
  const vals = Object.values(device.pbit);
  if (vals.includes('fail')) return 'fail';
  if (vals.includes('warning')) return 'warning';
  return 'pass';
}
function healthTile(label, count, statusKey, tooltip) {
  return `
    <div class="kpi-card" style="gap:8px">
      <div class="kpi-label-row"><span class="kpi-label">${esc(label)}</span>${tooltip ? `<span class="info-dot" data-tt="${esc(tooltip)}">i</span>` : ''}</div>
      <div class="flex items-center gap-2"><div class="kpi-value">${fmtNum(count)}</div>${statusBadge(statusKey, '')}</div>
    </div>`;
}

function renderHealth(state) {
  const f = state.filters;
  const filtered = applyDeviceFilters(DEVICES, f).filter(d => matchesGameFilters(d, f));
  const tech = {
    healthy: filtered.filter(d => d.technicalHealth === 'healthy').length,
    attention: filtered.filter(d => d.technicalHealth === 'attention').length,
    action: filtered.filter(d => d.technicalHealth === 'action').length,
    offline: filtered.filter(d => d.technicalHealth === 'offline').length,
    recent: filtered.filter(d => d.lastSeenMinutes < 60 * 24).length,
  };
  const usage = {
    active: filtered.filter(d => d.usageHealth === 'active').length,
    light: filtered.filter(d => d.usageHealth === 'light').length,
    quiet: filtered.filter(d => d.usageHealth === 'quiet').length,
    dormant: filtered.filter(d => d.usageHealth === 'dormant').length,
  };

  const body = `
    <div>
      <div class="flex items-center gap-2" style="margin-bottom:10px">
        <h2 style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-secondary)">Technical health</h2>
        <span class="helper-text">Connectivity, software, errors &amp; diagnostics - ${fmtNum(filtered.length)} devices matching filters</span>
      </div>
      <div class="grid grid-kpi">
        ${healthTile('Healthy', tech.healthy, 'healthy', 'No open errors, PBIT passing, seen recently.')}
        ${healthTile('Attention needed', tech.attention, 'attention', 'Minor errors or a single PBIT warning.')}
        ${healthTile('Action needed', tech.action, 'action', 'Repeated errors, crashes, or a failing PBIT component.')}
        ${healthTile('Offline', tech.offline, 'offline', 'No signal in over 3 days.')}
        ${healthTile('Recently connected', tech.recent, 'good', 'Reported within the last 24 hours.')}
      </div>
    </div>
    <div>
      <div class="flex items-center gap-2" style="margin-bottom:10px">
        <h2 style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-secondary)">Usage health</h2>
        <span class="helper-text">Independent of technical condition</span>
        ${infoDot('Usage health never feeds into the technical-health count above, and vice versa.')}
      </div>
      <div class="grid grid-kpi">
        ${healthTile('Active', usage.active, 'active', '≥900 minutes in the last 30 days.')}
        ${healthTile('Light use', usage.light, 'light', '200–900 minutes in the last 30 days.')}
        ${healthTile('Quiet', usage.quiet, 'quiet', '20–200 minutes in the last 30 days.')}
        ${healthTile('Dormant', usage.dormant, 'dormant', 'Under 20 minutes - worth a check-in call, not necessarily a fault.')}
      </div>
    </div>
    <div class="card">
      <div class="flex items-center justify-between" style="margin-bottom:4px">
        <div class="titles"><h3 style="font-size:13.5px;font-weight:700">Fleet device table</h3><div class="card-sub">Click any device for its full diagnostic and usage history</div></div>
        <div class="flex gap-2">${availPill('integration')}${availPill('planned')}</div>
      </div>
      <div data-table-mount="devices"></div>
    </div>
  `;

  return renderTeamPage(TABS, state, {
    eyebrow: 'Product · Dashboard C',
    title: 'Device & Fleet Health',
    desc: 'Technical condition and actual usage, tracked separately - a device can be fully healthy and simply unused.',
    sharedWith: 'Operations (deeper diagnostic detail) and Commerce (simplified reliability view)',
    filtersHtml: `
      ${filterSelect('category', 'Game category', [{ value: 'all', label: 'All categories' }, ...GAME_CATEGORIES.map(c => ({ value: c, label: c }))], f.category)}
      ${filterSelect('game', 'Game', [{ value: 'all', label: 'All games' }, ...GAMES.map(g => ({ value: g.id, label: g.name }))], f.game)}
      ${filterDivider()}
      ${filterSelect('customer', 'Customer / fleet', [{ value: 'all', label: 'All customers / fleets' }, ...CUSTOMERS.map(c => ({ value: c.id, label: c.name }))], f.customer)}
      ${filterSelect('country', 'Country', [{ value: 'all', label: 'All countries' }, ...COUNTRIES.map(c => ({ value: c.code, label: c.name }))], f.country)}
      ${filterSelect('deviceType', 'Device type', [{ value: 'all', label: 'All device types' }, ...DEVICE_TYPES.map(d => ({ value: d, label: d }))], f.deviceType)}
      ${filterSelect('version', 'Software version', [{ value: 'all', label: 'All versions' }, ...SOFTWARE_VERSIONS.map(v => ({ value: v, label: 'v' + v }))], f.version)}
      ${filterSelect('subscription', 'Subscription', [{ value: 'all', label: 'All subscriptions' }, ...SUBSCRIPTIONS.map(s => ({ value: s, label: s }))], f.subscription)}
      ${filterResetButton()}
    `,
    bodyHtml: body,
  });
}

function mountHealth(root, state) {
  const filtered = applyDeviceFilters(DEVICES, state.filters).filter(d => matchesGameFilters(d, state.filters));
  mountDataTable(root, 'devices', {
    rows: filtered, rowKey: 'id', searchFields: ['serial', 'customer', 'country', 'softwareVersion'], searchPlaceholder: 'Search serial, customer, country…',
    defaultSort: { col: 'technicalHealth', dir: 'asc' },
    onRowClick: (id) => document.dispatchEvent(new CustomEvent('app:selectDevice', { detail: { id } })),
    columns: [
      { key: 'serial', label: 'Serial', render: (r) => `<span class="mono">${esc(r.serial)}</span>` },
      { key: 'customer', label: 'Customer / fleet' },
      { key: 'type', label: 'Type' },
      { key: 'lastSeenMinutes', label: 'Last seen', align: 'right', render: (r) => timeAgo(new Date(Date.now() - r.lastSeenMinutes * 60000)) },
      { key: 'minutesLast30d', label: 'Recent usage', align: 'right', render: (r) => `<div class="flex items-center gap-2" style="justify-content:flex-end">${sparkline(r.trend7d, { width: 46, height: 16 })}<span>${fmtMinutes(r.minutesLast30d)}</span></div>` },
      { key: 'softwareVersion', label: 'Version', align: 'right', render: (r) => `<span class="mono">v${esc(r.softwareVersion)}</span>` },
      { key: 'updateStatus', label: 'Update status', sortValue: (r) => r.softwareVersion === LATEST_VERSION ? 1 : 0, render: (r) => r.softwareVersion === LATEST_VERSION ? statusBadge('good', 'Up to date') : statusBadge('warning', 'Update available') },
      { key: 'errorCount7d', label: 'Errors (7d)', align: 'right', render: (r) => r.errorCount7d > 0 ? `<span style="color:var(--status-critical);font-weight:700">${r.errorCount7d}</span>` : '0' },
      { key: 'pbit', label: 'PBIT', sortValue: (r) => ({ pass: 0, warning: 1, fail: 2 })[pbitOverall(r)], render: (r) => statusBadge(pbitOverall(r), pbitOverall(r) === 'pass' ? 'Nominal' : pbitOverall(r) === 'warning' ? 'Watch' : 'Failing') },
      { key: 'technicalHealth', label: 'Technical', render: (r) => statusBadge(r.technicalHealth) },
      { key: 'usageHealth', label: 'Usage', render: (r) => statusBadge(r.usageHealth) },
    ],
  });
}

// -------------------------------------------------------------------------

export function render(state) {
  if (state.subtab === 'behaviour') return renderBehaviour(state);
  if (state.subtab === 'health') return renderHealth(state);
  return renderWorld(state);
}

export function mount(root, state) {
  if (state.subtab === 'health') mountHealth(root, state);
  else if (state.subtab === 'world' || !state.subtab) mountWorld(root, state);
}
