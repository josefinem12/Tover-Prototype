// =========================================================================
// Operations - Dashboard A (Device Health Monitor), Dashboard B (Predictive
// / Fleet Pattern Explorer), Dashboard C (Data Reliability Monitor)
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
  FAILURE_BY_DISTRIBUTOR, ERRORS_BY_VERSION, ERROR_TIMELINE, EVENT_VOLUME, DQ_ISSUE_TYPES, generateDqIssues,
} from '../data.js';
import { applyDeviceFilters } from '../filters.js';

export const TABS = [
  { key: 'monitor', label: 'Device Health Monitor' },
  { key: 'patterns', label: 'Fleet Pattern Explorer' },
  { key: 'reliability', label: 'Data Reliability Monitor' },
];

let issuesCache = null;
function getIssues() { if (!issuesCache) issuesCache = generateDqIssues(34); return issuesCache; }

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
        ${cardHead('Error & crash/freeze timeline', 'Fleet-wide daily count, last 30 days', availPill('integration'))}
        ${lineAreaChart({ labels: ERROR_TIMELINE.map(r => r.date), values: ERROR_TIMELINE.map(r => r.errors), color: 'var(--status-critical)', fillColor: 'var(--status-critical)', formatLabel: (d) => fmtDate(d), formatValue: (v) => fmtNum(v) + ' errors' })}
      </div>
    </div>

    <div class="grid grid-12">
      <div class="card span-6">
        <div class="flex items-center justify-between" style="margin-bottom:4px">
          <div class="titles"><h3 style="font-size:13.5px;font-weight:700">Recurring issue alerts</h3><div class="card-sub">Repeated failures or a worsening state, not one-off blips</div></div>
          ${availPill('new-tracking')}
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
      ${filterSelect('customer', 'Customer / fleet', [{ value: 'all', label: 'All customers / fleets' }, ...CUSTOMERS.map(c => ({ value: c.id, label: c.name }))], f.customer)}
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
      { key: 'customer', label: 'Customer / fleet' },
      { key: 'batch', label: 'Batch' },
      { key: 'lastSeenMinutes', label: 'Last seen', align: 'right', render: (r) => timeAgo(new Date(Date.now() - r.lastSeenMinutes * 60000)) },
      { key: 'softwareVersion', label: 'Version', align: 'right', render: (r) => `<span class="mono">v${esc(r.softwareVersion)}</span>` },
      { key: 'errorCount7d', label: 'Errors (7d)', align: 'right', render: (r) => r.errorCount7d > 0 ? `<span style="color:var(--status-critical);font-weight:700">${r.errorCount7d}</span>` : '0' },
      { key: 'crashCount30d', label: 'Crashes (30d)', align: 'right', render: (r) => fmtNum(r.crashCount30d) },
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
// Data Reliability Monitor
// -------------------------------------------------------------------------

function renderReliability(state) {
  const issues = getIssues();
  const missingEnd = issues.filter(i => i.type === 'Missing GAME_END').length;
  const invalidSessions = issues.filter(i => i.type === 'Negative duration' || i.type === 'Extreme duration (>4h)').length;
  const stoppedLogging = issues.filter(i => i.type === 'Stopped logging suddenly').length;
  const issueDonutData = DQ_ISSUE_TYPES.map((t, i) => ({ label: t.label, value: issues.filter(x => x.type === t.label).length, color: SERIES_COLORS[i % SERIES_COLORS.length] })).filter(d => d.value > 0);

  const body = `
    <div class="grid grid-kpi">
      ${kpiCard({ label: 'Missing GAME_END pairs', value: fmtNum(missingEnd) })}
      ${kpiCard({ label: 'Invalid sessions', value: fmtNum(invalidSessions), sub: 'negative or extreme duration' })}
      ${kpiCard({ label: 'Devices stopped logging', value: fmtNum(stoppedLogging), sub: 'unexpected silence' })}
      ${kpiCard({ label: 'Events received (30d)', value: fmtCompact(EVENT_VOLUME.reduce((s, r) => s + r.events, 0)) })}
    </div>

    <div class="grid grid-12">
      <div class="card span-7">
        ${cardHead('Event volume by device / software version', 'Ingested events per day, last 30 days', availPill('available'))}
        ${lineAreaChart({ labels: EVENT_VOLUME.map(r => r.date), values: EVENT_VOLUME.map(r => r.events), color: 'var(--accent-yellow-deep)', fillColor: 'var(--accent-yellow)', formatLabel: (d) => fmtDate(d), formatValue: (v) => fmtCompact(v) + ' events' })}
      </div>
      <div class="card span-5">
        ${cardHead('Issues by type', `${fmtNum(issues.length)} flagged in the sampled window`, availPill('mock'))}
        ${donutChart({ items: issueDonutData })}
      </div>
    </div>

    <div class="card">
      <div class="flex items-center justify-between" style="margin-bottom:4px">
        <div class="titles"><h3 style="font-size:13.5px;font-weight:700">Needs investigation</h3><div class="card-sub">Missing GAME_START/END pairs, missing IDs, negative/extreme durations, placeholder values - click a row to open the device</div></div>
        <div class="flex gap-2">${availPill('mock')}${availPill('new-tracking')}</div>
      </div>
      <div data-table-mount="issues"></div>
    </div>

    <div class="card" style="background:var(--surface-sunken)">
      <h3 style="font-size:12.5px;font-weight:700">A useful validation step</h3>
      <div class="helper-text mt-2" style="line-height:1.6">Comparing known physical test sessions on an office Tovertafel against what actually appears in the backend is a concrete way to sanity-check this page before trusting it fleet-wide.</div>
    </div>
  `;

  return renderTeamPage(TABS, state, {
    eyebrow: 'Operations · Dashboard C',
    title: 'Data Reliability Monitor',
    desc: 'Whether the dataset itself can be trusted, and why information might be missing.',
    sharedWith: 'Software (same reliability checks, ingestion-pipeline framing)',
    filtersHtml: filterResetButton(),
    bodyHtml: body,
  });
}

function mountReliability(root, state) {
  const issues = getIssues();
  mountDataTable(root, 'issues', {
    rows: issues, rowKey: 'id', searchFields: ['type'], searchPlaceholder: 'Search issue type…', defaultSort: { col: 'detectedAt', dir: 'desc' },
    onRowClick: (id) => { const issue = issues.find(i => i.id === id); if (issue) document.dispatchEvent(new CustomEvent('app:selectDevice', { detail: { id: issue.device.id } })); },
    columns: [
      { key: 'type', label: 'Issue type' },
      { key: 'sev', label: 'Severity', sortValue: (r) => ({ critical: 2, action: 1, attention: 0 })[r.sev], render: (r) => statusBadge(r.sev === 'action' ? 'action' : r.sev === 'critical' ? 'critical' : 'warning', r.sev === 'critical' ? 'Critical' : r.sev === 'action' ? 'Action needed' : 'Attention') },
      { key: 'serial', label: 'Device', sortValue: (r) => r.device.serial, render: (r) => `<span class="mono">${esc(r.device.serial)}</span>` },
      { key: 'customer', label: 'Customer / fleet', sortValue: (r) => r.device.customer, render: (r) => esc(r.device.customer) },
      { key: 'detail', label: 'Detail', render: (r) => `<span class="text-secondary">${esc(r.detail)}</span>` },
      { key: 'detectedAt', label: 'Detected', align: 'right', render: (r) => timeAgo(r.detectedAt) },
    ],
  });
}

// -------------------------------------------------------------------------

export function render(state) {
  if (state.subtab === 'patterns') return renderPatterns(state);
  if (state.subtab === 'reliability') return renderReliability(state);
  return renderMonitor(state);
}

export function mount(root, state) {
  if (state.subtab === 'reliability') mountReliability(root, state);
  else if (state.subtab === 'monitor' || !state.subtab) mountMonitor(root, state);
}
