// =========================================================================
// Software - Dashboard A (Errors & Diagnostics): what's technically going
// wrong across releases and hardware, rather than a business view.
// =========================================================================

import { fmtNum, fmtDate } from '../utils.js';
import { renderTeamPage, filterResetButton, kpiCard, cardHead, availPill } from '../components.js';
import { lineAreaChart, vBarChart, hBarChart, SERIES_COLORS } from '../charts.js';
import { ERRORS_BY_VERSION, ERROR_TIMELINE, PBIT_FLEET_STATS } from '../data.js';

export const TABS = [
  { key: 'errors', label: 'Errors & Diagnostics' },
];

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
    eyebrow: 'Software · Dashboard A',
    title: 'Errors & Diagnostics',
    desc: 'Error, crash and PBIT-failure counts by software version - helps separate a bad release from a fleet-wide issue.',
    filtersHtml: filterResetButton(),
    bodyHtml: body,
  });
}

export function render(state) {
  return renderErrors(state);
}

export function mount() {}
