// =========================================================================
// Customers - Dashboard A (My Tovertafels), Dashboard B (Care Home Reports),
// Dashboard C (Highlights For You). A simplified, jargon-free reframing of
// existing team dashboards for the care-home audience named in PRODUCT.md
// as a confirmed future audience - same underlying signals, no new data.
// =========================================================================

import { esc, fmtNum, fmtMinutes, fmtCompact, fmtPct, fmtDate } from '../utils.js';
import {
  renderTeamPage, filterSelect, filterResetButton, kpiCard,
  cardHead, availPill, statusBadge, mountDataTable, legend,
} from '../components.js';
import { hBarChart, donutChart, SERIES_COLORS } from '../charts.js';
import {
  CUSTOMERS, COUNTRIES, DEVICE_TYPES, DEVICES, CUSTOMER_VALUE,
  GAME_STATS, CATEGORY_STATS, SELECTION_SOURCE, UPTIME_TREND, GAMES,
} from '../data.js';
import { applyDeviceFilters } from '../filters.js';

export const TABS = [
  { key: 'devices', label: 'My Tovertafels' },
  { key: 'carehomes', label: 'Care Home Reports' },
  { key: 'highlights', label: 'Highlights For You' },
];

function hashCode(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return Math.abs(h); }
function favoriteGame(d) { return GAMES[hashCode(d.id) % GAMES.length]; }

const FRIENDLY_STATUS = {
  healthy: 'Working well',
  attention: 'Worth a check',
  action: 'Needs attention',
  offline: 'Offline',
};

// -------------------------------------------------------------------------
// My Tovertafels
// -------------------------------------------------------------------------

function renderDevices(state) {
  const f = state.filters;
  const filtered = applyDeviceFilters(DEVICES, f);
  const totalMinutes = filtered.reduce((s, d) => s + d.minutesLast30d, 0);
  const totalSessions = filtered.reduce((s, d) => s + d.sessionsLast30d, 0);
  const avgSession = totalSessions > 0 ? totalMinutes / totalSessions : 0;
  const workingWell = filtered.filter(d => d.technicalHealth === 'healthy').length;

  const body = `
    <div class="grid grid-kpi">
      ${kpiCard({ label: 'Tovertafels in this fleet', value: fmtNum(filtered.length) })}
      ${kpiCard({ label: 'Minutes played', value: fmtCompact(totalMinutes), sub: 'last 30 days' })}
      ${kpiCard({ label: 'Avg. session length', value: fmtMinutes(avgSession) })}
      ${kpiCard({ label: 'Working well', value: fmtNum(workingWell), sub: `of ${fmtNum(filtered.length)} devices` })}
    </div>

    <div class="card">
      <div class="flex items-center justify-between" style="margin-bottom:4px">
        <div class="titles"><h3 style="font-size:13.5px;font-weight:700">Your Tovertafels</h3><div class="card-sub">Every device in this fleet, and how it's doing</div></div>
        <div class="flex gap-2">${availPill('available')}${availPill('mock')}</div>
      </div>
      <div data-table-mount="devices"></div>
    </div>
  `;

  return renderTeamPage(TABS, state, {
    eyebrow: 'Customers · Dashboard A',
    title: 'My Tovertafels',
    desc: 'A per-device report a care home could see about their own fleet, without the internal engineering detail.',
    sharedWith: 'A reframed, simplified version of Product\'s Device & Fleet Health and Operations\' Device Health Monitor.',
    filtersHtml: `
      ${filterSelect('customer', 'Care home', [{ value: 'all', label: 'All care homes (preview)' }, ...CUSTOMERS.map(c => ({ value: c.id, label: c.name }))], f.customer)}
      ${filterSelect('deviceType', 'Product', [{ value: 'all', label: 'All products' }, ...DEVICE_TYPES.map(d => ({ value: d, label: d }))], f.deviceType)}
      ${filterResetButton()}
    `,
    bodyHtml: body,
  });
}

function mountDevices(root, state) {
  const filtered = applyDeviceFilters(DEVICES, state.filters);
  mountDataTable(root, 'devices', {
    rows: filtered, rowKey: 'id', searchFields: ['serial', 'customer'], searchPlaceholder: 'Search serial…',
    defaultSort: { col: 'minutesLast30d', dir: 'desc' },
    onRowClick: (id) => document.dispatchEvent(new CustomEvent('app:selectDevice', { detail: { id } })),
    columns: [
      { key: 'serial', label: 'Tovertafel', render: (r) => `<span class="mono">${esc(r.serial)}</span>` },
      { key: 'type', label: 'Product' },
      { key: 'installedAt', label: 'Installed', render: (r) => fmtDate(r.installedAt, { year: 'numeric', month: 'short', day: 'numeric' }) },
      { key: 'minutesLast30d', label: 'Minutes played', align: 'right', render: (r) => fmtMinutes(r.minutesLast30d) },
      { key: 'favoriteGame', label: 'Favourite game', sortValue: (r) => favoriteGame(r).name, render: (r) => esc(favoriteGame(r).name) },
      { key: 'technicalHealth', label: 'Status', render: (r) => statusBadge(r.technicalHealth, FRIENDLY_STATUS[r.technicalHealth]) },
    ],
  });
}

// -------------------------------------------------------------------------
// Care Home Reports
// -------------------------------------------------------------------------

function renderCareHomes(state) {
  const f = state.filters;
  const rows = CUSTOMER_VALUE.filter(c => (f.customer === 'all' || c.id === f.customer) && (f.country === 'all' || c.country === f.country));
  const totalDevices = rows.reduce((s, c) => s + c.deviceCount, 0);
  const totalMinutes = rows.reduce((s, c) => s + c.minutes, 0);
  const avgEngagement = rows.length ? rows.reduce((s, c) => s + c.engagementTrend, 0) / rows.length : 0;

  const fleetItems = rows.slice(0, 10).map((c, i) => ({ label: c.name, value: c.minutes, color: SERIES_COLORS[i % SERIES_COLORS.length] }));
  const byProduct = DEVICE_TYPES.map((t, i) => {
    const devs = DEVICES.filter(d => d.type === t && (f.customer === 'all' || d.customerId === f.customer) && (f.country === 'all' || d.countryCode === f.country));
    return { label: t, value: devs.reduce((s, d) => s + d.minutesLast30d, 0), color: SERIES_COLORS[i % SERIES_COLORS.length] };
  });

  const body = `
    <div class="grid grid-kpi">
      ${kpiCard({ label: 'Care homes represented', value: fmtNum(rows.length) })}
      ${kpiCard({ label: 'Tovertafels across these homes', value: fmtNum(totalDevices) })}
      ${kpiCard({ label: 'Minutes played', value: fmtCompact(totalMinutes), sub: 'last 30 days' })}
      ${kpiCard({ label: 'Engagement trend', value: `${avgEngagement >= 0 ? '+' : ''}${avgEngagement.toFixed(1)}%`, sub: 'vs prior period' })}
    </div>

    <div class="grid grid-12">
      <div class="card span-7">
        ${cardHead('Minutes played by care home', 'Last 30 days', availPill('integration'))}
        ${fleetItems.length ? hBarChart({ items: fleetItems, formatValue: (v) => fmtCompact(v) + ' min' }) : `<div class="empty-state">No care homes match this filter.</div>`}
      </div>
      <div class="card span-5">
        ${cardHead('Minutes played by product', 'Tovertafel 3 vs. Pixie', availPill('available'))}
        <div class="flex items-center gap-4" style="flex-wrap:wrap">
          ${donutChart({ items: byProduct, formatValue: (v) => fmtCompact(v) + ' min' })}
          <div style="flex:1;min-width:150px">${legend(byProduct)}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="flex items-center justify-between" style="margin-bottom:4px">
        <div class="titles"><h3 style="font-size:13.5px;font-weight:700">Care home report</h3><div class="card-sub">One row per care home / fleet, ready to share back</div></div>
        ${availPill('definition')}
      </div>
      <div data-table-mount="carehomes"></div>
    </div>
  `;

  return renderTeamPage(TABS, state, {
    eyebrow: 'Customers · Dashboard B',
    title: 'Care Home Reports',
    desc: 'Usage and engagement rolled up per care home / fleet, and per product line.',
    sharedWith: 'The same underlying data as Commerce\'s Customer & Fleet Value dashboard, reframed for the care home itself.',
    filtersHtml: `
      ${filterSelect('customer', 'Care home', [{ value: 'all', label: 'All care homes' }, ...CUSTOMERS.map(c => ({ value: c.id, label: c.name }))], f.customer)}
      ${filterSelect('country', 'Country', [{ value: 'all', label: 'All countries' }, ...COUNTRIES.map(c => ({ value: c.code, label: c.name }))], f.country)}
      ${filterResetButton()}
    `,
    bodyHtml: body,
  });
}

function mountCareHomes(root, state) {
  const f = state.filters;
  const rows = CUSTOMER_VALUE.filter(c => (f.customer === 'all' || c.id === f.customer) && (f.country === 'all' || c.country === f.country));
  mountDataTable(root, 'carehomes', {
    rows, rowKey: 'id', searchFields: ['name', 'country'], searchPlaceholder: 'Search care home…', defaultSort: { col: 'minutes', dir: 'desc' },
    columns: [
      { key: 'name', label: 'Care home / fleet' },
      { key: 'country', label: 'Country' },
      { key: 'deviceCount', label: 'Tovertafels', align: 'right', render: (r) => fmtNum(r.deviceCount) },
      { key: 'minutes', label: 'Minutes (30d)', align: 'right', render: (r) => fmtCompact(r.minutes) },
      { key: 'activeDevices', label: 'Active devices', align: 'right', render: (r) => fmtNum(r.activeDevices) },
      { key: 'engagementTrend', label: 'Engagement trend', align: 'right', render: (r) => `<span style="color:${r.engagementTrend >= 0 ? 'var(--status-good)' : 'var(--status-critical)'};font-weight:700">${r.engagementTrend >= 0 ? '+' : ''}${r.engagementTrend.toFixed(1)}%</span>` },
    ],
  });
}

// -------------------------------------------------------------------------
// Highlights For You
// -------------------------------------------------------------------------

function renderHighlights(state) {
  const topGames = GAME_STATS.slice(0, 8).map((g, i) => ({ label: g.name, value: g.minutes, color: SERIES_COLORS[i % SERIES_COLORS.length], sub: g.category }));
  const catItems = CATEGORY_STATS.map((c, i) => ({ label: c.category, value: c.minutes, color: SERIES_COLORS[i % SERIES_COLORS.length] }));
  const topGame = GAME_STATS[0];
  const topCategory = CATEGORY_STATS[0];

  const body = `
    <div class="grid grid-kpi">
      ${kpiCard({ label: 'Most-loved game', value: `<span style="font-size:16px">${esc(topGame.name)}</span>`, sub: topGame.category, tooltip: 'Requested by Research & Design - which games people actually keep choosing.' })}
      ${kpiCard({ label: 'Favourite category', value: topCategory.category, tooltip: 'Requested by Product - where engagement concentrates across the catalogue.' })}
      ${kpiCard({ label: 'Handpicked rate', value: fmtPct(SELECTION_SOURCE[0].pct, 1), sub: 'chosen deliberately, not shuffled', tooltip: 'Requested by Research & Design - confirmed via the handpicked flag, from the 28 Jun - 1 Sep 2026 usage-data audit.' })}
      ${kpiCard({ label: 'Avg. fleet uptime', value: fmtPct(UPTIME_TREND[UPTIME_TREND.length - 1].uptime, 1), sub: 'last 12 weeks', tooltip: 'Requested by Commerce and Operations - how reliably the fleet stays online.' })}
    </div>

    <div class="grid grid-12">
      <div class="card span-7">
        ${cardHead('Top games across your fleet', 'Minutes played, last 30 days', availPill('available'))}
        ${hBarChart({ items: topGames, formatValue: (v) => fmtCompact(v) + ' min' })}
      </div>
      <div class="card span-5">
        ${cardHead('Where engagement concentrates', 'Minutes played by category', availPill('available'))}
        <div class="flex items-center gap-4" style="flex-wrap:wrap">
          ${donutChart({ items: catItems, formatValue: (v) => fmtCompact(v) + ' min', centerLabel: 'categories', centerValue: catItems.length })}
          <div style="flex:1;min-width:150px">${legend(catItems)}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3 style="font-size:13.5px;font-weight:700">Why these numbers</h3>
      <div class="card-sub" style="margin-top:2px">Every metric above already matters to one of our internal teams - this page just puts them in one place for you</div>
      <div class="helper-text mt-3" style="line-height:1.7">Game and category popularity come from Research &amp; Design's own usage explorer. Handpicked rate is the same audited figure R&amp;D tracks to understand deliberate vs. shuffled play. Fleet uptime is the same reliability number Commerce and Operations report on internally. Nothing here is calculated differently for this view - it's the same underlying signal, just framed for you instead of for us.</div>
    </div>
  `;

  return renderTeamPage(TABS, state, {
    eyebrow: 'Customers · Dashboard C',
    title: 'Highlights For You',
    desc: 'The metrics our own teams already track that matter most to a care home, gathered in one place.',
    filtersHtml: filterResetButton(),
    bodyHtml: body,
  });
}

// -------------------------------------------------------------------------

export function render(state) {
  if (state.subtab === 'carehomes') return renderCareHomes(state);
  if (state.subtab === 'highlights') return renderHighlights(state);
  return renderDevices(state);
}

export function mount(root, state) {
  if (state.subtab === 'carehomes') mountCareHomes(root, state);
  else if (state.subtab === 'devices' || !state.subtab) mountDevices(root, state);
}
