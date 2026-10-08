// =========================================================================
// Operations - Dashboard A (Device Health Monitor), Dashboard B (Predictive
// / Fleet Pattern Explorer)
// =========================================================================

import { esc, fmtNum, fmtMinutes, fmtCompact, fmtDate, timeAgo } from '../utils.js';
import {
  renderTeamPage, filterSelect, filterDivider, filterResetButton, kpiCard,
  cardHead, tabGroup, availPill, infoDot, statusBadge, mountDataTable,
} from '../components.js';
import { hBarChart, vBarChart, lineAreaChart, donutChart, sparkline, SERIES_COLORS } from '../charts.js';
import {
  DEVICES, CUSTOMERS, COUNTRIES, SOFTWARE_VERSIONS, DEVICE_TYPES, PBIT_COMPONENTS,
  PBIT_FLEET_STATS, REMOTE_ACTIONS, RECURRING_ISSUES, FAILURE_BY_BATCH, FAILURE_BY_REVISION,
  FAILURE_BY_DISTRIBUTOR, ERRORS_BY_VERSION, ERROR_TIMELINE,
} from '../data.js';
import { applyDeviceFilters } from '../filters.js';

export const TABS = [
  { key: 'monitor', label: 'Device Health Monitor' },
  { key: 'patterns', label: 'Fleet Pattern Explorer' },
];

const LATEST_VERSION = SOFTWARE_VERSIONS[0];
function pbitOverall(device) {
  const vals = Object.values(device.pbit);
  if (vals.includes('fail')) return 'fail';
  if (vals.includes('warning')) return 'warning';
  return 'pass';
}

// -------------------------------------------------------------------------
// Device Health Monitor
// -------------------------------------------------------------------------

function renderMonitor(state) {
  const f = state.filters;
  const filtered = applyDeviceFilters(DEVICES, f);
  const healthy = filtered.filter(d => d.technicalHealth === 'healthy').length;
  const attention = filtered.filter(d => d.technicalHealth === 'attention').length;
  const action = filtered.filter(d => d.technicalHealth === 'action').length;
  const offline = filtered.filter(d => d.technicalHealth === 'offline').length;

  const pbitItems = PBIT_FLEET_STATS.map((p, i) => ({ label: p.component, value: p.fail + p.warning, color: p.fail > 0 ? 'var(--status-critical)' : 'var(--status-warning)', sub: `${p.fail} failing, ${p.warning} watch` }));

  const body = `
    <div class="grid grid-kpi">
      ${kpiCard({ label: 'Healthy', value: fmtNum(healthy), tooltip: 'Defined health rules - agreed direction, exact thresholds still to confirm with Operations.' })}
      ${kpiCard({ label: 'Attention needed', value: fmtNum(attention) })}
      ${kpiCard({ label: 'Action needed', value: fmtNum(action) })}
      ${kpiCard({ label: 'Offline', value: fmtNum(offline) })}
    </div>

    <div class="card">
      <div class="flex items-center justify-between" style="margin-bottom:4px">
        <div class="titles"><h3 style="font-size:13.5px;font-weight:700">Device status table</h3><div class="card-sub">Serial, last seen, software, usage status, errors, PBIT state - click a row for full detail</div></div>
        <div class="flex gap-2">${availPill('integration')}${availPill('planned')}</div>
      </div>
      <div data-table-mount="devices"></div>
    </div>

    <div class="grid grid-12">
      <div class="card span-6">
        ${cardHead('PBIT component view', 'Devices with a watch/failing state, by component', availPill('planned'))}
        ${hBarChart({ items: pbitItems, formatValue: (v) => fmtNum(v) + ' devices' })}
      </div>
      <div class="card span-6">
        ${cardHead('Error timeline', 'SPDLOG error lines per day, fleet-wide (crash/freeze data not in ES yet)', availPill('available'))}
        ${lineAreaChart({ labels: ERROR_TIMELINE.map(r => r.date), values: ERROR_TIMELINE.map(r => r.errors), color: 'var(--status-critical)', fillColor: 'var(--status-critical)', formatLabel: (d) => fmtDate(d), formatValue: (v) => fmtNum(v) + ' errors' })}
      </div>
    </div>

    <div class="grid grid-12">
      <div class="card span-6">
        <div class="flex items-center justify-between" style="margin-bottom:4px">
          <div class="titles"><h3 style="font-size:13.5px;font-weight:700">Recurring issue alerts</h3><div class="card-sub">Online devices logging 1,000+ error lines in the last 7 days of data</div></div>
          ${availPill('available')}
        </div>
        <div class="feed-list">
          ${RECURRING_ISSUES.slice(0, 7).map(ri => `
            <div class="feed-item" data-device-id="${esc(ri.device.id)}" style="cursor:pointer">
              <span class="feed-dot" style="background:var(--status-action)"></span>
              <div class="feed-main"><div class="feed-title">${esc(ri.device.serial)} · ${esc(ri.device.customer)}</div><div class="feed-meta">${esc(ri.pattern)}</div></div>
              <div class="feed-time">since ${fmtDate(ri.firstSeen)}</div>
            </div>`).join('')}
        </div>
      </div>
      <div class="card span-6">
        <div class="flex items-center justify-between" style="margin-bottom:4px">
          <div class="titles"><h3 style="font-size:13.5px;font-weight:700">Remote action outcome</h3><div class="card-sub">Was a fix pushed, and did health recover?</div></div>
          ${availPill('new-tracking')}
        </div>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead><tr><th>Device</th><th>Action</th><th>Outcome</th></tr></thead>
            <tbody>
              ${REMOTE_ACTIONS.slice(0, 7).map(a => `
                <tr data-device-id="${esc(a.device.id)}" style="cursor:pointer">
                  <td class="mono">${esc(a.device.serial)}</td>
                  <td>${esc(a.action)}</td>
                  <td>${a.outcome === 'improved' ? statusBadge('good', 'Improved') : a.outcome === 'pending' ? statusBadge('offline', 'Pending') : statusBadge('action', 'No change')}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  return renderTeamPage(TABS, state, {
    eyebrow: 'Operations · Dashboard A',
    title: 'Device Health Monitor',
    desc: 'Whether devices are functioning correctly, and what needs a remote fix or a field visit.',
    sharedWith: 'Product (same tech/usage split, less operational depth) and Commerce (simplified reliability view)',
    filtersHtml: `
      ${filterSelect('customer', 'Partner', [{ value: 'all', label: 'All partners' }, ...CUSTOMERS.map(c => ({ value: c.id, label: c.name }))], f.customer)}
      ${filterSelect('country', 'Country', [{ value: 'all', label: 'All countries' }, ...COUNTRIES.map(c => ({ value: c.code, label: c.name }))], f.country)}
      ${filterSelect('deviceType', 'Device type', [{ value: 'all', label: 'All device types' }, ...DEVICE_TYPES.map(d => ({ value: d, label: d }))], f.deviceType)}
      ${filterSelect('version', 'Software version', [{ value: 'all', label: 'All versions' }, ...SOFTWARE_VERSIONS.map(v => ({ value: v, label: 'v' + v }))], f.version)}
      ${filterResetButton()}
    `,
    bodyHtml: body,
  });
}

function mountMonitor(root, state) {
  const filtered = applyDeviceFilters(DEVICES, state.filters);
  mountDataTable(root, 'devices', {
    rows: filtered, rowKey: 'id', searchFields: ['serial', 'customer', 'batch', 'distributor'], searchPlaceholder: 'Search serial, customer, batch…',
    defaultSort: { col: 'technicalHealth', dir: 'asc' },
    onRowClick: (id) => document.dispatchEvent(new CustomEvent('app:selectDevice', { detail: { id } })),
    columns: [
      { key: 'serial', label: 'Serial', render: (r) => `<span class="mono">${esc(r.serial)}</span>` },
      { key: 'customer', label: 'Partner' },
      { key: 'batch', label: 'Batch' },
      { key: 'lastSeenMinutes', label: 'Last seen', align: 'right', render: (r) => timeAgo(new Date(Date.now() - r.lastSeenMinutes * 60000)) },
      { key: 'softwareVersion', label: 'Version', align: 'right', render: (r) => `<span class="mono">v${esc(r.softwareVersion)}</span>` },
      { key: 'errorCount7d', label: 'Errors (7d)', align: 'right', render: (r) => r.errorCount7d > 0 ? `<span style="color:var(--status-critical);font-weight:700">${fmtNum(r.errorCount7d)}</span>` : '0' },
      { key: 'restarts30d', label: 'Restarts (30d)', align: 'right', render: (r) => fmtNum(r.restarts30d) },
      { key: 'pbit', label: 'PBIT', sortValue: (r) => ({ pass: 0, warning: 1, fail: 2 })[pbitOverall(r)], render: (r) => statusBadge(pbitOverall(r), pbitOverall(r) === 'pass' ? 'Nominal' : pbitOverall(r) === 'warning' ? 'Watch' : 'Failing') },
      { key: 'technicalHealth', label: 'Status', render: (r) => statusBadge(r.technicalHealth) },
    ],
  });
}

// -------------------------------------------------------------------------
// Fleet Pattern Explorer
// -------------------------------------------------------------------------

function renderPatterns(state) {
  const ui = state.ui['ops:patterns'] || (state.ui['ops:patterns'] = { metric: 'errors' });
  const metricConf = { errors: { key: 'errors', label: 'Errors', color: 'var(--status-critical)' }, crashes: { key: 'crashes', label: 'Crashes / freezes', color: 'var(--status-action)' }, pbitFailures: { key: 'pbitFailures', label: 'PBIT failures', color: 'var(--series-6)' } }[ui.metric];
  const versionItems = ERRORS_BY_VERSION.map(r => ({ label: 'v' + r.version, value: r[metricConf.key], color: metricConf.color }));
  const batchItems = FAILURE_BY_BATCH.map((b, i) => ({ label: b.key, value: b.failureRate, color: SERIES_COLORS[i % SERIES_COLORS.length], sub: `${b.deviceCount} devices` }));
  const revisionItems = FAILURE_BY_REVISION.map((b, i) => ({ label: b.key, value: b.failureRate, color: SERIES_COLORS[i % SERIES_COLORS.length], sub: `${b.deviceCount} devices` }));
  const hotBatch = FAILURE_BY_BATCH.reduce((a, b) => b.failureRate > a.failureRate ? b : a, FAILURE_BY_BATCH[0]);
  const hotRevision = FAILURE_BY_REVISION.reduce((a, b) => b.failureRate > a.failureRate ? b : a, FAILURE_BY_REVISION[0]);

  const body = `
    <div class="card" style="border-top:2px solid var(--status-action)">
      <div class="flex items-center gap-2"><span style="color:var(--status-action)">${infoDot('This is pattern exploration, not failure prediction - there isn’t enough historical PBIT/diagnostic data yet to claim early-warning detection.')}</span><h3 style="font-size:13px;font-weight:700">Pattern flag</h3>${availPill('mock')}</div>
      <div class="helper-text mt-2" style="line-height:1.6">
        Batch <strong style="color:var(--ink-primary)">${esc(hotBatch.key)}</strong> / hardware <strong style="color:var(--ink-primary)">${esc(hotRevision.key)}</strong>
        is running notably hotter than the rest of the fleet (${hotBatch.failureRate}% of that batch flagged attention/action, vs.
        ${Math.round(FAILURE_BY_BATCH.reduce((s, b) => s + b.failureRate, 0) / FAILURE_BY_BATCH.length)}% fleet average) - worth a closer look
        before it’s treated as more than a pattern worth watching.
      </div>
    </div>

    <div class="grid grid-12">
      <div class="card span-4">
        ${cardHead('Failure rate by batch', '% of devices flagged attention/action', availPill('integration'))}
        ${hBarChart({ items: batchItems, formatValue: (v) => v + '%' })}
      </div>
      <div class="card span-4">
        ${cardHead('Failure rate by hardware revision', '% of devices flagged attention/action', availPill('integration'))}
        ${hBarChart({ items: revisionItems, formatValue: (v) => v + '%' })}
      </div>
      <div class="card span-4">
        <div class="flex items-center justify-between" style="margin-bottom:4px">
          <div class="titles"><h3 style="font-size:13.5px;font-weight:700">By distributor</h3><div class="card-sub">Where batch/hardware metadata may live in Salesforce</div></div>
          ${availPill('integration')}
        </div>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead><tr><th>Distributor</th><th style="text-align:right">Devices</th><th style="text-align:right">Failure rate</th></tr></thead>
            <tbody>${FAILURE_BY_DISTRIBUTOR.map(d => `<tr><td>${esc(d.key)}</td><td class="num">${fmtNum(d.deviceCount)}</td><td class="num">${d.failureRate}%</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card">
      ${cardHead('Before / after software releases', metricConf.label + ' by version', tabGroup('metric', [{ value: 'errors', label: 'Errors' }, { value: 'crashes', label: 'Crashes' }, { value: 'pbitFailures', label: 'PBIT' }], ui.metric) + availPill('integration'))}
      ${vBarChart({ items: versionItems, color: metricConf.color, formatValue: (v) => fmtNum(v) + ' ' + metricConf.label.toLowerCase() })}
    </div>
  `;

  return renderTeamPage(TABS, state, {
    eyebrow: 'Operations · Dashboard B',
    title: 'Fleet Pattern Explorer',
    desc: 'Grouping failures by hardware revision, batch, distributor and software version to spot patterns before they scale.',
    filtersHtml: filterResetButton(),
    bodyHtml: body,
  });
}

// -------------------------------------------------------------------------

export function render(state) {
  if (state.subtab === 'patterns') return renderPatterns(state);
  return renderMonitor(state);
}

export function mount(root, state) {
  if (state.subtab === 'monitor' || !state.subtab) mountMonitor(root, state);
}
