// =========================================================================
// Commerce - Dashboard A (Customer / Fleet Value), Dashboard B (Reliability
// & Adoption), Dashboard C (Product Discovery / Menu Behaviour)
// =========================================================================

import { esc, fmtNum, fmtMinutes, fmtCompact, fmtPct } from '../utils.js';
import {
  renderTeamPage, filterSelect, filterDivider, filterResetButton, kpiCard,
  cardHead, availPill, infoDot, mountDataTable, renderFunnel, legend,
} from '../components.js';
import { hBarChart, donutChart, lineAreaChart, vBarChart, SERIES_COLORS } from '../charts.js';
import {
  CUSTOMERS, COUNTRIES, DEVICE_TYPES, SOFTWARE_VERSIONS, DEVICES, CUSTOMER_VALUE,
  RELIABILITY_BY_TYPE, UPTIME_TREND, SELECTION_FUNNEL, SELECTION_SOURCE,
} from '../data.js';
import { applyDeviceFilters, filteredGameStats } from '../filters.js';

export const TABS = [
  { key: 'value', label: 'Customer & Fleet Value' },
  { key: 'reliability', label: 'Reliability & Adoption' },
  { key: 'discovery', label: 'Product Discovery' },
];

// -------------------------------------------------------------------------
// Customer & Fleet Value
// -------------------------------------------------------------------------

function renderValue(state) {
  const f = state.filters;
  const rows = f.customer === 'all' ? CUSTOMER_VALUE : CUSTOMER_VALUE.filter(c => c.id === f.customer);
  const totalMinutes = rows.reduce((s, c) => s + c.minutes, 0);
  const totalSessions = rows.reduce((s, c) => s + c.sessions, 0);
  const totalDevices = rows.reduce((s, c) => s + c.deviceCount, 0);
  const totalActive = rows.reduce((s, c) => s + c.activeDevices, 0);
  const gameStats = filteredGameStats(f).slice(0, 8).map((g, i) => ({ label: g.name, value: g.minutes, color: SERIES_COLORS[i % SERIES_COLORS.length], sub: g.category }));

  const fleetItems = rows.slice(0, 10).map((c, i) => ({ label: c.name, value: c.minutes, color: SERIES_COLORS[i % SERIES_COLORS.length] }));

  const body = `
    <div class="grid grid-kpi">
      ${kpiCard({ label: 'Minutes played', value: fmtCompact(totalMinutes), sub: 'last 30 days', tooltip: 'Usage exists today; customer mapping needs integration to fully trust cross-fleet totals.' })}
      ${kpiCard({ label: 'Sessions', value: fmtCompact(totalSessions), sub: 'last 30 days' })}
      ${kpiCard({ label: 'Active devices', value: fmtNum(totalActive), sub: `of ${fmtNum(totalDevices)} devices` })}
      ${kpiCard({ label: 'Fleets represented', value: fmtNum(rows.length), sub: 'customers / care-home groups' })}
    </div>

    <div class="grid grid-12">
      <div class="card span-7">
        <div class="flex items-center justify-between" style="margin-bottom:4px">
          <div class="titles"><h3 style="font-size:13.5px;font-weight:700">Fleet comparison</h3><div class="card-sub">Minutes played by customer / care-home group, last 30 days</div></div>
          ${availPill('integration')}
        </div>
        ${hBarChart({ items: fleetItems, formatValue: (v) => fmtCompact(v) + ' min' })}
      </div>
      <div class="card span-5">
        ${cardHead('Games played', 'Top games across the filtered fleet', availPill('available'))}
        ${hBarChart({ items: gameStats, formatValue: (v) => fmtCompact(v) + ' min' })}
      </div>
    </div>

    <div class="card">
      <div class="flex items-center justify-between" style="margin-bottom:4px">
        <div class="titles"><h3 style="font-size:13.5px;font-weight:700">ROI story</h3><div class="card-sub">A concise summary of fleet usage and engagement change, per customer</div></div>
        <div class="flex gap-2">${availPill('definition')}</div>
      </div>
      <div data-table-mount="value"></div>
      <div class="helper-text mt-3">Engagement trend is illustrative here - the actual ROI definition (minutes? active days? caregiver-reported outcomes?) needs to be agreed with Commerce before this becomes a real report.</div>
    </div>
  `;

  return renderTeamPage(TABS, state, {
    eyebrow: 'Commerce · Dashboard A',
    title: 'Customer & Fleet Value',
    desc: 'Demonstrating value and reliability to customers and partners - usage, engagement and fleet comparison.',
    filtersHtml: `
      ${filterSelect('customer', 'Customer / fleet', [{ value: 'all', label: 'All customers / fleets' }, ...CUSTOMERS.map(c => ({ value: c.id, label: c.name }))], f.customer)}
      ${filterSelect('country', 'Country', [{ value: 'all', label: 'All countries' }, ...COUNTRIES.map(c => ({ value: c.code, label: c.name }))], f.country)}
      ${filterResetButton()}
    `,
    bodyHtml: body,
  });
}

function mountValue(root, state) {
  const f = state.filters;
  const rows = f.customer === 'all' ? CUSTOMER_VALUE : CUSTOMER_VALUE.filter(c => c.id === f.customer);
  mountDataTable(root, 'value', {
    rows, rowKey: 'id', searchFields: ['name', 'country'], searchPlaceholder: 'Search customer…', defaultSort: { col: 'minutes', dir: 'desc' },
    columns: [
      { key: 'name', label: 'Customer / fleet' },
      { key: 'country', label: 'Country' },
      { key: 'deviceCount', label: 'Devices', align: 'right', render: (r) => fmtNum(r.deviceCount) },
      { key: 'minutes', label: 'Minutes (30d)', align: 'right', render: (r) => fmtCompact(r.minutes) },
      { key: 'activeDevices', label: 'Active devices', align: 'right', render: (r) => fmtNum(r.activeDevices) },
      { key: 'engagementTrend', label: 'Engagement trend', align: 'right', render: (r) => `<span style="color:${r.engagementTrend >= 0 ? 'var(--status-good)' : 'var(--status-critical)'};font-weight:700">${r.engagementTrend >= 0 ? '+' : ''}${r.engagementTrend.toFixed(1)}%</span>` },
      { key: 'subscriptionMix', label: 'Subscriptions', render: (r) => esc(r.subscriptionMix.join(', ')) },
    ],
  });
}

// -------------------------------------------------------------------------
// Reliability & Adoption
// -------------------------------------------------------------------------

function renderReliability(state) {
  const f = state.filters;
  const filtered = applyDeviceFilters(DEVICES, f);
  const onlineNow = filtered.filter(d => d.lastSeenMinutes < 60 * 24).length;
  const versionCounts = SOFTWARE_VERSIONS.map((v, i) => ({ label: 'v' + v, value: filtered.filter(d => d.softwareVersion === v).length, color: SERIES_COLORS[i % SERIES_COLORS.length] }));
  const latestAdoptionPct = filtered.length ? Math.round((filtered.filter(d => d.softwareVersion === SOFTWARE_VERSIONS[0]).length / filtered.length) * 100) : 0;

  const body = `
    <div class="grid grid-kpi">
      ${kpiCard({ label: 'Online / reporting', value: fmtNum(onlineNow), sub: `of ${fmtNum(filtered.length)} devices, last 24h`, tooltip: 'Some fields exist today; a fully reliable "online now" signal still needs MQTT/Toverview integration.' })}
      ${kpiCard({ label: 'Latest version adoption', value: fmtPct(latestAdoptionPct), sub: `v${SOFTWARE_VERSIONS[0]}` })}
      ${kpiCard({ label: 'Avg. fleet uptime', value: fmtPct(UPTIME_TREND[UPTIME_TREND.length - 1].uptime, 1), sub: 'last 12 weeks, mock indicator' })}
    </div>

    <div class="grid grid-12">
      <div class="card span-6">
        <div class="flex items-center justify-between" style="margin-bottom:4px">
          <div class="titles"><h3 style="font-size:13.5px;font-weight:700">Connection rate by device type</h3><div class="card-sub">Especially relevant for TT3 vs. Pixie rollout</div></div>
          ${availPill('integration')}
        </div>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead><tr><th>Device type</th><th style="text-align:right">Devices</th><th style="text-align:right">Online rate</th><th style="text-align:right">Up-to-date rate</th></tr></thead>
            <tbody>
              ${RELIABILITY_BY_TYPE.map(r => `<tr><td>${esc(r.type)}</td><td class="num">${fmtNum(r.count)}</td><td class="num">${r.onlineRate}%</td><td class="num">${r.upToDateRate}%</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="card span-6">
        ${cardHead('Software version distribution', 'Update adoption across the filtered fleet', availPill('available'))}
        ${vBarChart({ items: versionCounts, formatValue: (v) => fmtNum(v) + ' devices' })}
      </div>
    </div>

    <div class="card">
      ${cardHead('Health trend', '12-week fleet uptime indicator - internal view; a simplified client-facing version could reuse this same chart', availPill('mock'))}
      ${lineAreaChart({ labels: UPTIME_TREND.map(r => r.week), values: UPTIME_TREND.map(r => r.uptime), color: 'var(--series-4)', fillColor: 'var(--series-4)', formatLabel: (l) => l, formatValue: (v) => v.toFixed(1) + '% uptime', yMax: 100 })}
    </div>
  `;

  return renderTeamPage(TABS, state, {
    eyebrow: 'Commerce · Dashboard B',
    title: 'Reliability & Adoption',
    desc: 'Connection rate, online status and update adoption - an internal view, with a simplified client-facing version possible later.',
    sharedWith: 'Product and Operations (same underlying health signals, more technical detail)',
    filtersHtml: `
      ${filterSelect('deviceType', 'Device type', [{ value: 'all', label: 'All device types' }, ...DEVICE_TYPES.map(d => ({ value: d, label: d }))], f.deviceType)}
      ${filterSelect('customer', 'Customer / fleet', [{ value: 'all', label: 'All customers / fleets' }, ...CUSTOMERS.map(c => ({ value: c.id, label: c.name }))], f.customer)}
      ${filterResetButton()}
    `,
    bodyHtml: body,
  });
}

// -------------------------------------------------------------------------
// Product Discovery / Menu Behaviour
// -------------------------------------------------------------------------

function renderDiscovery(state) {
  const f = state.filters;
  const sourceItems = SELECTION_SOURCE.map((s, i) => ({ label: s.source, value: s.pct, color: SERIES_COLORS[i % SERIES_COLORS.length] }));

  const body = `
    <div class="grid grid-kpi">
      ${kpiCard({ label: 'Steps before selection', value: '3.2', tooltip: 'Same underlying journey as R&D’s Game Selection Journey, viewed here for adoption / "did the UI change work".' })}
      ${kpiCard({ label: 'Handpicked rate', value: fmtPct(SELECTION_SOURCE[0].pct, 1), sub: 'confirmed via the handpicked flag' })}
      ${kpiCard({ label: 'Selection → start drop-off', value: fmtPct(Math.round(((SELECTION_FUNNEL[4].count - SELECTION_FUNNEL[5].count) / SELECTION_FUNNEL[4].count) * 100)) })}
    </div>

    <div class="card">
      <div class="flex items-center justify-between" style="margin-bottom:2px">
        <div class="titles"><h3 style="font-size:13.5px;font-weight:700">Menu → game path</h3><div class="card-sub">How easily people reach a game, and where they drop off</div></div>
        ${availPill('integration')}
      </div>
      ${renderFunnel(SELECTION_FUNNEL)}
    </div>

    <div class="card">
      <div class="flex items-center justify-between" style="margin-bottom:4px">
        <div class="titles"><h3 style="font-size:13.5px;font-weight:700">Manual vs. shuffle</h3><div class="card-sub">Adoption signal for recent menu/UI changes</div></div>
        ${availPill('integration')}
      </div>
      <div class="flex items-center gap-4" style="flex-wrap:wrap;margin-top:8px">
        ${donutChart({ items: sourceItems, formatValue: (v) => v + '%' })}
        <div style="flex:1;min-width:220px">
          ${legend(sourceItems)}
          <div class="helper-text mt-3">This overlaps strongly with R&amp;D and Product’s selection views - same underlying dashboard, reused here with a Commerce lens: is the menu working, and did the last change move the numbers?</div>
        </div>
      </div>
    </div>
  `;

  return renderTeamPage(TABS, state, {
    eyebrow: 'Commerce · Dashboard C',
    title: 'Product Discovery',
    desc: 'How users scroll the menu and reach a game - reused from the shared selection dashboard with an adoption-focused lens.',
    sharedWith: 'Research & Design and Product (same selection-journey data)',
    filtersHtml: filterResetButton(),
    bodyHtml: body,
  });
}

// -------------------------------------------------------------------------

export function render(state) {
  if (state.subtab === 'reliability') return renderReliability(state);
  if (state.subtab === 'discovery') return renderDiscovery(state);
  return renderValue(state);
}

export function mount(root, state) {
  if (state.subtab === 'value' || !state.subtab) mountValue(root, state);
}
