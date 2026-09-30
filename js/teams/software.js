// =========================================================================
// Software - internal telemetry/data-quality view rather than a separate
// business dashboard (per the planning doc: Software's meeting was about
// what's technically possible, scalable and maintainable).
// =========================================================================

import { fmtNum, fmtCompact, fmtDate } from '../utils.js';
import { renderTeamPage, filterSelect, filterResetButton, kpiCard, cardHead, availPill, infoDot, renderRoadmapRow } from '../components.js';
import { lineAreaChart, vBarChart, hBarChart, SERIES_COLORS } from '../charts.js';
import { EVENT_VOLUME, ERRORS_BY_VERSION, ERROR_TIMELINE, PBIT_FLEET_STATS, SOFTWARE_VERSIONS, METRIC_ROADMAP, DATA_STATUS } from '../data.js';

export const TABS = [
  { key: 'telemetry', label: 'Telemetry & Ingestion' },
  { key: 'errors', label: 'Errors & Diagnostics' },
  { key: 'roadmap', label: 'Metric Roadmap' },
];

// -------------------------------------------------------------------------
// Telemetry & Ingestion
// -------------------------------------------------------------------------

function renderTelemetry(state) {
  const totalEvents = EVENT_VOLUME.reduce((s, r) => s + r.events, 0);
  const totalMissing = EVENT_VOLUME.reduce((s, r) => s + r.missingFields, 0);
  const volumeGB = EVENT_VOLUME.map(r => ({ date: r.date, gb: r.events * 0.00019 }));

  const body = `
    <div class="grid grid-kpi">
      ${kpiCard({ label: 'Events received', value: fmtCompact(totalEvents), sub: '30-day total', tooltip: 'Elasticsearch queries/API preferred over repeated large raw exports, per Software\'s own guidance.' })}
      ${kpiCard({ label: 'Missing required fields', value: fmtCompact(totalMissing), sub: '30-day total' })}
      ${kpiCard({ label: 'Est. data volume', value: fmtCompact(volumeGB[volumeGB.length - 1].gb), unit: 'GB/day', sub: 'illustrative, for scalability judgement' })}
      ${kpiCard({ label: 'Live vs. batched', value: '91%', unit: 'live', sub: 'Simulated estimate - no field marks ingestion path per event yet', tooltip: 'Needs a field marking ingestion path per event. Value shown is a simulated estimate, not measured.' })}
    </div>

    <div class="grid grid-12">
      <div class="card span-7">
        ${cardHead('Event volume & ingestion status', 'Ingested events per day, last 30 days', availPill('available'))}
        ${lineAreaChart({ labels: EVENT_VOLUME.map(r => r.date), values: EVENT_VOLUME.map(r => r.events), color: 'var(--accent-yellow-deep)', fillColor: 'var(--accent-yellow)', formatLabel: (d) => fmtDate(d), formatValue: (v) => fmtCompact(v) + ' events' })}
      </div>
      <div class="card span-5">
        ${cardHead('Missing / invalid fields', 'By event type, per day', availPill('available'))}
        ${lineAreaChart({ labels: EVENT_VOLUME.map(r => r.date), values: EVENT_VOLUME.map(r => r.missingFields), color: 'var(--status-critical)', fillColor: 'var(--status-critical)', formatLabel: (d) => fmtDate(d), formatValue: (v) => fmtCompact(v) + ' events' })}
      </div>
    </div>

    <div class="card">
      ${cardHead('Storage / data-volume trend', 'To judge whether new tracking requests are scalable', availPill('mock'))}
      ${lineAreaChart({ labels: volumeGB.map(r => r.date), values: volumeGB.map(r => r.gb), color: 'var(--series-6)', fillColor: 'var(--series-6)', formatLabel: (d) => fmtDate(d), formatValue: (v) => v.toFixed(1) + ' GB' })}
    </div>
  `;

  return renderTeamPage(TABS, state, {
    eyebrow: 'Software · Telemetry & Data Quality',
    title: 'Telemetry & Ingestion',
    desc: 'What’s technically possible, scalable and maintainable - not a separate business dashboard.',
    sharedWith: 'Operations (same reliability checks, fleet-operations framing)',
    filtersHtml: filterResetButton(),
    bodyHtml: body,
  });
}

// -------------------------------------------------------------------------
// Errors & Diagnostics
// -------------------------------------------------------------------------

function renderErrors(state) {
  const pbitItems = PBIT_FLEET_STATS.map(p => ({ label: p.component, value: p.fail + p.warning, color: p.fail > 0 ? 'var(--status-critical)' : 'var(--status-warning)' }));
  const versionItems = ERRORS_BY_VERSION.map((r, i) => ({ label: 'v' + r.version, value: r.errors, color: SERIES_COLORS[i % SERIES_COLORS.length] }));

  const body = `
    <div class="grid grid-kpi">
      ${kpiCard({ label: 'Errors (30d)', value: fmtNum(ERRORS_BY_VERSION.reduce((s, r) => s + r.errors, 0)) })}
      ${kpiCard({ label: 'Crashes / freezes (30d)', value: fmtNum(ERRORS_BY_VERSION.reduce((s, r) => s + r.crashes, 0)), tooltip: 'Exists in Toverview today; not yet joined into Elasticsearch.' })}
      ${kpiCard({ label: 'PBIT failures (30d)', value: fmtNum(ERRORS_BY_VERSION.reduce((s, r) => s + r.pbitFailures, 0)), tooltip: 'Planned feature - will change once PBIT results are flowing in.' })}
    </div>

    <div class="grid grid-12">
      <div class="card span-7">
        ${cardHead('Error & crash timeline', 'Fleet-wide, last 30 days', availPill('integration'))}
        ${lineAreaChart({ labels: ERROR_TIMELINE.map(r => r.date), values: ERROR_TIMELINE.map(r => r.errors), color: 'var(--status-critical)', fillColor: 'var(--status-critical)', formatLabel: (d) => fmtDate(d), formatValue: (v) => fmtNum(v) + ' errors' })}
      </div>
      <div class="card span-5">
        ${cardHead('Errors by software version', 'By game and device also possible once joined', availPill('integration'))}
        ${vBarChart({ items: versionItems, color: 'var(--status-critical)', formatValue: (v) => fmtNum(v) + ' errors' })}
      </div>
    </div>

    <div class="card">
      ${cardHead('PBIT failures by component', 'Fleet-wide count of watch/failing devices', availPill('planned'))}
      ${hBarChart({ items: pbitItems, formatValue: (v) => fmtNum(v) + ' devices' })}
    </div>
  `;

  return renderTeamPage(TABS, state, {
    eyebrow: 'Software · Telemetry & Data Quality',
    title: 'Errors & Diagnostics',
    desc: 'Error, crash and PBIT-failure counts by software version - helps separate a bad release from a fleet-wide issue.',
    filtersHtml: filterResetButton(),
    bodyHtml: body,
  });
}

// -------------------------------------------------------------------------
// Metric Roadmap
// -------------------------------------------------------------------------

function renderRoadmap(state) {
  const f = state.filters;
  const items = f.status === 'all' ? METRIC_ROADMAP : METRIC_ROADMAP.filter(m => m.status === f.status);

  const body = `
    <div class="card">
      <div class="flex items-center justify-between" style="margin-bottom:4px">
        <div class="titles"><h3 style="font-size:13.5px;font-weight:700">Requested metrics and current status</h3><div class="card-sub">${fmtNum(items.length)} items raised across the five stakeholder sessions</div></div>
        ${infoDot('Every panel across this dashboard that isn’t "Available now" links back to one of these rows.')}
      </div>
      <div>${items.map(renderRoadmapRow).join('')}</div>
    </div>
  `;

  return renderTeamPage(TABS, state, {
    eyebrow: 'Software · Telemetry & Data Quality',
    title: 'Metric Roadmap',
    desc: 'What each requested-but-not-live metric would take to build.',
    filtersHtml: `${filterSelect('status', 'Status', [{ value: 'all', label: 'All statuses' }, ...Object.values(DATA_STATUS).filter(s => s.key !== 'available').map(s => ({ value: s.key, label: s.label }))], f.status)}${filterResetButton()}`,
    bodyHtml: body,
  });
}

// -------------------------------------------------------------------------

export function render(state) {
  if (state.subtab === 'errors') return renderErrors(state);
  if (state.subtab === 'roadmap') return renderRoadmap(state);
  return renderTelemetry(state);
}

export function mount() {}
