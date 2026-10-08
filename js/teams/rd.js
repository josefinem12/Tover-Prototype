// =========================================================================
// Research & Design - Dashboard A (Game Usage & Interaction Explorer),
// Dashboard B (Game Selection Journey)
// =========================================================================

import { esc, fmtNum, fmtMinutes, fmtCompact, fmtDate, fmtPct } from '../utils.js';
import {
  renderTeamPage, filterSelect, filterDivider, filterResetButton, kpiCard,
  cardHead, tabGroup, legend, availPill, infoDot, mountDataTable, renderFunnel,
} from '../components.js';
import { lineAreaChart, hBarChart, donutChart, vBarChart, SERIES_COLORS } from '../charts.js';
import {
  USAGE_TIMESERIES, GAMES, GAME_CATEGORIES, CUSTOMERS, COUNTRIES, SOFTWARE_VERSIONS,
  DEVICE_TYPES, SUBSCRIPTIONS, SELECTION_SOURCE, SELECTION_FUNNEL, DEVICES, INTERACTION_STATS,
  DATA_WINDOW, CATEGORY_COVERAGE,
} from '../data.js';
import { applyDeviceFilters, usageScale, filteredGameStats, filteredCategoryStats, dateRangeDays, dateRangeMultiplier } from '../filters.js';

export const TABS = [
  { key: 'usage', label: 'Usage & Interaction' },
  { key: 'selection', label: 'Game Selection Journey' },
];

function slice(days) { const a = USAGE_TIMESERIES; return a.slice(a.length - days); }
function prevSlice(days) { const a = USAGE_TIMESERIES; const end = Math.max(0, a.length - days); return a.slice(Math.max(0, end - days), end); }
function sum(arr, key) { return arr.reduce((s, r) => s + r[key], 0); }
function pctDelta(cur, prev) { return prev > 0 ? ((cur - prev) / prev) * 100 : 0; }

function activeDaysBuckets(devices) {
  const buckets = [{ l: '1–5', min: 1, max: 5 }, { l: '6–10', min: 6, max: 10 }, { l: '11–15', min: 11, max: 15 }, { l: '16–20', min: 16, max: 20 }, { l: '21–25', min: 21, max: 25 }, { l: '26–30', min: 26, max: 30 }];
  return buckets.map((b, i) => ({
    label: b.l,
    value: devices.filter(d => d.activeDays30 >= b.min && d.activeDays30 <= b.max).length,
    color: SERIES_COLORS[Math.min(i, 5)],
  }));
}

function contextFilters(f, extra) {
  return `
    ${filterSelect('category', 'Category', [{ value: 'all', label: 'All categories' }, ...GAME_CATEGORIES.map(c => ({ value: c, label: c }))], f.category)}
    ${filterSelect('game', 'Game', [{ value: 'all', label: 'All games' }, ...GAMES.map(g => ({ value: g.id, label: g.name }))], f.game)}
    ${filterDivider()}
    ${filterSelect('customer', 'Partner', [{ value: 'all', label: 'All partners' }, ...CUSTOMERS.map(c => ({ value: c.id, label: c.name }))], f.customer)}
    ${filterSelect('country', 'Country / region', [{ value: 'all', label: 'All countries' }, ...COUNTRIES.map(c => ({ value: c.code, label: c.name }))], f.country)}
    ${extra || ''}
    ${filterResetButton()}
  `;
}

// -------------------------------------------------------------------------
// Usage & Interaction
// -------------------------------------------------------------------------

function renderUsage(state) {
  const f = state.filters;
  const ui = state.ui['rd:usage'] || (state.ui['rd:usage'] = { rank: 'minutes' });
  const days = dateRangeDays(f), mult = dateRangeMultiplier(f);
  const cur = slice(days), prev = prevSlice(days);
  const scale = usageScale(f);
  const filteredDevices = applyDeviceFilters(DEVICES, f);

  const minutes = sum(cur, 'minutes') * mult * scale;
  const minutesPrev = sum(prev, 'minutes') * mult * scale;
  const sessions = sum(cur, 'sessions') * mult * scale;
  const sessionsPrev = sum(prev, 'sessions') * mult * scale;
  const activeDevices = Math.max(1, filteredDevices.filter(d => d.minutesLast30d > 20).length);
  const avgSession = sessions > 0 ? minutes / sessions : 0;
  const perDeviceAvg = filteredDevices.filter(d => d.sessionsLast30d > 0).map(d => d.minutesLast30d / d.sessionsLast30d).sort((a, b) => a - b);
  const medianSession = perDeviceAvg.length ? perDeviceAvg[Math.floor(perDeviceAvg.length / 2)] : avgSession;

  const gameStats = filteredGameStats(f);
  const topGame = gameStats[0];
  const categoryStats = filteredCategoryStats(f);
  const rankItems = gameStats.slice(0, 8).map((g, i) => ({ label: g.name, value: ui.rank === 'sessions' ? g.sessions : g.minutes, color: SERIES_COLORS[i % SERIES_COLORS.length], sub: g.category }));
  const catDonutItems = categoryStats.map((c, i) => ({ label: c.category, value: c.minutes, color: SERIES_COLORS[i % SERIES_COLORS.length] }));
  const playingDevices = filteredDevices.filter(d => d.activeDays30 > 0);
  const activeBuckets = activeDaysBuckets(playingDevices);

  const motionItems = INTERACTION_STATS.filter(g => f.category === 'all' || g.category === f.category).sort((a, b) => b.motion - a.motion).slice(0, 8)
    .map(g => ({ label: g.name, value: g.motion, color: g.type === 'active' ? 'var(--accent-yellow-deep)' : 'var(--series-3)', sub: g.type === 'active' ? 'Active play' : 'Ambient' }));
  const handsGames = INTERACTION_STATS.filter(g => g.tpu && (f.category === 'all' || g.category === f.category)).sort((a, b) => b.avgHands - a.avgHands).slice(0, 8)
    .map(g => ({ label: g.name, value: g.avgHands, color: 'var(--series-2)' }));
  const effortItems = INTERACTION_STATS.filter(g => g.type === 'active' && (f.category === 'all' || g.category === f.category)).sort((a, b) => b.effort - a.effort).slice(0, 8)
    .map(g => ({ label: g.name, value: g.effort, color: 'var(--series-5)', sub: 'Level ' + g.level }));
  const activeMinutes = gameStats.filter(g => g.type === 'active').reduce((s, g) => s + g.minutes, 0);
  const ambientMinutes = gameStats.filter(g => g.type === 'ambient').reduce((s, g) => s + g.minutes, 0);
  const activeShare = activeMinutes + ambientMinutes > 0 ? Math.round((activeMinutes / (activeMinutes + ambientMinutes)) * 100) : 0;
  const avaDonut = [{ label: 'Active-play games', value: activeShare, color: 'var(--accent-yellow-deep)' }, { label: 'Ambient / calm games', value: 100 - activeShare, color: 'var(--series-3)' }];

  const body = `
    <div class="grid grid-kpi">
      ${kpiCard({ label: 'Minutes played', value: fmtCompact(minutes), delta: pctDelta(minutes, minutesPrev), tooltip: 'Sum of reconstructed GAME_START/GAME_END durations. Available now.' })}
      ${kpiCard({ label: 'Sessions', value: fmtCompact(sessions), delta: pctDelta(sessions, sessionsPrev), tooltip: 'Count of completed game sessions. Available now.' })}
      ${kpiCard({ label: 'Active devices', value: fmtNum(activeDevices), sub: `of ${fmtNum(filteredDevices.length)} matching filters` })}
      ${kpiCard({ label: 'Avg / median session', value: `${fmtMinutes(avgSession)}`, sub: `median ${fmtMinutes(medianSession)}`, tooltip: 'Median is less skewed by a few very long ambient sessions.' })}
      ${kpiCard({ label: 'Most played game', value: `<span style="font-size:16px">${esc(topGame ? topGame.name : '-')}</span>`, sub: topGame ? topGame.category : '' })}
    </div>

    <div class="grid grid-12">
      <div class="card span-7">
        ${cardHead('Minutes played over time', `Last ${days} days of usage data, through ${fmtDate(DATA_WINDOW.usageTo)}`, availPill('available'))}
        ${lineAreaChart({ labels: cur.map(r => r.date), values: cur.map(r => r.minutes), color: 'var(--accent-yellow-deep)', fillColor: 'var(--accent-yellow)', formatLabel: (d) => fmtDate(d), formatValue: (v) => fmtCompact(v) + ' min' })}
      </div>
      <div class="card span-5">
        ${cardHead('Active days / usage frequency', `Days played in last 30, across the ${fmtNum(playingDevices.length)} devices that played`, availPill('available'))}
        ${vBarChart({ items: activeBuckets, formatValue: (v) => fmtNum(v) + ' devices' })}
      </div>
    </div>

    <div class="grid grid-12">
      <div class="card span-7">
        ${cardHead('Game popularity', 'Ranked by ' + (ui.rank === 'sessions' ? 'sessions' : 'minutes played'), tabGroup('rank', [{ value: 'minutes', label: 'Minutes' }, { value: 'sessions', label: 'Sessions' }], ui.rank) + availPill('available'))}
        ${hBarChart({ items: rankItems, formatValue: (v) => fmtCompact(v) + (ui.rank === 'sessions' ? ' sessions' : ' min') })}
      </div>
      <div class="card span-5">
        ${cardHead('Minutes by category', `Catalogued games only - ${CATEGORY_COVERAGE}% of all minutes`, availPill('available'))}
        <div class="flex items-center gap-4" style="flex-wrap:wrap">
          ${donutChart({ items: catDonutItems, centerLabel: 'categories', centerValue: categoryStats.length })}
          <div style="flex:1;min-width:150px">${legend(catDonutItems)}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="flex items-center justify-between" style="margin-bottom:4px">
        <div class="titles"><h3 style="font-size:13.5px;font-weight:700">Game leaderboard</h3><div class="card-sub">Minutes, sessions and device reach - sort any column</div></div>
        <div class="flex gap-2">${availPill('available')}${availPill('definition')}</div>
      </div>
      <div data-table-mount="games"></div>
    </div>

    <div class="grid grid-12">
      <div class="card span-4">
        ${cardHead('Interaction intensity', 'Motion coverage during play, top games', availPill('new-tracking'))}
        ${hBarChart({ items: motionItems, formatValue: (v) => v + '/100' })}
      </div>
      <div class="card span-4">
        <div class="flex items-center justify-between" style="margin-bottom:4px">
          <div class="titles"><h3 style="font-size:13.5px;font-weight:700">Hands / participation</h3><div class="card-sub">Avg. concurrent hands, TPU games</div></div>
          ${availPill('mock')}
        </div>
        ${handsGames.length ? hBarChart({ items: handsGames, formatValue: (v) => v.toFixed(1) + ' hands' }) : `<div class="empty-state">No TPU-enabled games in this filter.</div>`}
        <div class="helper-text mt-3" style="color:var(--status-action);font-weight:600">${infoDot('Hand count is a hardware signal from TPU-enabled games only - never a reliable count of people present.')} Hands ≠ people</div>
      </div>
      <div class="card span-4">
        ${cardHead('Player effort', 'Active games only, scored from average hands', availPill('definition'))}
        ${effortItems.length ? hBarChart({ items: effortItems, formatValue: (v) => v + '/100' }) : `<div class="empty-state">No active games in this filter.</div>`}
      </div>
    </div>

    <div class="grid grid-12">
      <div class="card span-5">
        <div class="flex items-center justify-between" style="margin-bottom:4px">
          <div class="titles"><h3 style="font-size:13.5px;font-weight:700">Active vs. ambient use</h3><div class="card-sub">Minutes on active-interaction vs. calmer games</div></div>
          ${availPill('definition')}
        </div>
        <div class="flex items-center gap-4" style="flex-wrap:wrap;margin-top:6px">
          ${donutChart({ items: avaDonut, formatValue: (v) => v + '%', centerLabel: 'active play', centerValue: activeShare + '%' })}
          <div style="flex:1;min-width:170px" class="helper-text" style="line-height:1.6">A game with little motion is not automatically low-engagement - ambient and sensory games can be intentionally calm. This split needs an agreed game-type taxonomy before it’s more than illustrative.</div>
        </div>
      </div>
      <div class="card span-7">
        <div class="flex items-center justify-between" style="margin-bottom:4px">
          <div class="titles"><h3 style="font-size:13.5px;font-weight:700">Pixie orientation</h3><div class="card-sub">Wall / floor / table-style usage split</div></div>
          ${availPill('integration')}
        </div>
        <div class="flex items-center gap-4" style="flex-wrap:wrap;margin-top:6px">
          ${donutChart({ items: [{ label: 'Table-style', value: 54, color: 'var(--series-1)' }, { label: 'Wall-mounted', value: 31, color: 'var(--series-3)' }, { label: 'Floor', value: 15, color: 'var(--series-4)' }], formatValue: (v) => v + '%' })}
          <div style="flex:1;min-width:200px" class="helper-text" style="line-height:1.6">ORIENTATION_CHANGED events are already logged on-device for Pixie - this view still needs the extraction/visualisation pipeline, not new instrumentation.</div>
        </div>
      </div>
    </div>
  `;

  return renderTeamPage(TABS, state, {
    eyebrow: 'Research & Design · Dashboard A',
    title: 'Game Usage & Interaction Explorer',
    desc: 'How the Tovertafel is actually being used, how people interact with games, and what usage patterns might mean.',
    filtersHtml: contextFilters(f, `${filterSelect('deviceType', 'Device type', [{ value: 'all', label: 'All device types' }, ...DEVICE_TYPES.map(d => ({ value: d, label: d }))], f.deviceType)}${filterSelect('subscription', 'Subscription', [{ value: 'all', label: 'All subscriptions' }, ...SUBSCRIPTIONS.map(s => ({ value: s, label: s }))], f.subscription)}`),
    bodyHtml: body,
  });
}

function mountUsage(root, state) {
  const gameStats = filteredGameStats(state.filters);
  mountDataTable(root, 'games', {
    rows: gameStats, rowKey: 'id', searchFields: ['name', 'category'], searchPlaceholder: 'Search games…',
    defaultSort: { col: 'minutes', dir: 'desc' },
    columns: [
      { key: 'name', label: 'Game' },
      { key: 'category', label: 'Category' },
      { key: 'type', label: 'Type', render: (r) => r.type === 'active' ? 'Active play' : r.type === 'ambient' ? 'Ambient' : '-' },
      { key: 'minutes', label: 'Minutes', align: 'right', render: (r) => fmtCompact(r.minutes) },
      { key: 'sessions', label: 'Sessions', align: 'right', render: (r) => fmtCompact(r.sessions) },
      { key: 'deviceReach', label: 'Device reach', align: 'right', render: (r) => fmtNum(r.deviceReach) },
      { key: 'manualPct', label: 'Manual %', align: 'right', render: (r) => r.manualPct == null ? '-' : r.manualPct + '%' },
    ],
  });
}

// -------------------------------------------------------------------------
// Game Selection Journey
// -------------------------------------------------------------------------

function renderSelection(state) {
  const f = state.filters;
  const sourceItems = SELECTION_SOURCE.map((s, i) => ({ label: s.source, value: s.pct, color: SERIES_COLORS[i % SERIES_COLORS.length] }));

  const body = `
    <div class="grid grid-kpi">
      ${kpiCard({ label: 'Handpicked rate', value: fmtPct(SELECTION_SOURCE[0].pct, 1), sub: 'confirmed via the handpicked flag', tooltip: 'From the 28 Jun - 1 Sep 2026 usage-data audit: 6.2% of usable GAME_START records were flagged handpicked.' })}
      ${kpiCard({ label: 'Avg. steps before selection', value: '3.2', tooltip: 'Home → Games → Category → Game viewed → Game selected. Broad screen paths exist; exact button-level steps need new tracking.' })}
      ${kpiCard({ label: 'Games viewed before choice', value: '2.6', sub: 'avg. cards opened per session', tooltip: 'Needs game-card impression tracking - not collected today.' })}
      ${kpiCard({ label: 'Selection → start drop-off', value: fmtPct(Math.round(((SELECTION_FUNNEL[4].count - SELECTION_FUNNEL[5].count) / SELECTION_FUNNEL[4].count) * 100)), sub: 'selected but never started' })}
    </div>

    <div class="card">
      <div class="flex items-center justify-between" style="margin-bottom:2px">
        <div class="titles"><h3 style="font-size:13.5px;font-weight:700">Selection funnel</h3><div class="card-sub">Home → Games → Category → Game viewed → Game selected → Game started</div></div>
        <div class="flex gap-2">${availPill('integration')}${availPill('new-tracking')}</div>
      </div>
      ${renderFunnel(SELECTION_FUNNEL)}
    </div>

    <div class="card">
      ${cardHead('Handpicked vs. the rest', 'Share of sessions by selection path', availPill('available'))}
      <div class="flex items-center gap-4" style="flex-wrap:wrap">
        ${donutChart({ items: sourceItems, formatValue: (v) => v + '%', centerLabel: 'handpicked', centerValue: SELECTION_SOURCE[0].pct + '%' })}
        <div style="flex:1;min-width:170px">${legend(sourceItems)}</div>
      </div>
      <div class="helper-text mt-3">The handpicked flag is real and audited. Splitting the remaining 93.8% into shuffle vs. un-flagged manual browsing needs an explicit selection-source field. ${availPill('new-tracking')}</div>
    </div>
  `;

  return renderTeamPage(TABS, state, {
    eyebrow: 'Research & Design · Dashboard B',
    title: 'Game Selection Journey',
    desc: 'How deliberately games are chosen, and how many steps or games are considered before a session starts.',
    sharedWith: 'Product and Commerce (adoption-focused views of the same underlying journey)',
    filtersHtml: contextFilters(f),
    bodyHtml: body,
  });
}

// -------------------------------------------------------------------------

export function render(state) {
  if (state.subtab === 'selection') return renderSelection(state);
  return renderUsage(state);
}

export function mount(root, state) {
  if (state.subtab === 'usage' || !state.subtab) mountUsage(root, state);
}
