// =========================================================================
// Software - Dashboard A (Errors & Diagnostics): what's technically going
// wrong across releases and hardware, rather than a business view.
// =========================================================================

import { esc, fmtNum, fmtDate } from '../utils.js';
import { renderTeamPage, filterResetButton, kpiCard, cardHead, availPill } from '../components.js';
import { lineAreaChart, vBarChart, hBarChart, SERIES_COLORS } from '../charts.js';
import { ERRORS_BY_VERSION, ERROR_TIMELINE, ERROR_MESSAGES, PBIT_FLEET_STATS } from '../data.js';

export const TABS = [
  { key: 'errors', label: 'Errors & Diagnostics' },
];

function renderErrors(state) {
  const pbitItems = PBIT_FLEET_STATS.map(p => ({ label: p.component, value: p.fail + p.warning, color: p.fail > 0 ? 'var(--status-critical)' : 'var(--status-warning)' }));
  const versionItems = ERRORS_BY_VERSION.map((r, i) => ({ label: 'v' + r.version, value: r.errors, color: SERIES_COLORS[i % SERIES_COLORS.length] }));
  const totalErrors = ERROR_TIMELINE.reduce((s, r) => s + r.errors, 0);
  const peakDevices = Math.max(0, ...ERROR_TIMELINE.map(r => r.errorDevices));

  const body = `
    <div class="grid grid-kpi">
      ${kpiCard({ label: 'Error lines (30d)', value: fmtNum(totalErrors), sub: `up to ${fmtNum(peakDevices)} devices logging per day`, tooltip: 'SPDLOG events in eventlog-*. Heavily skewed: a handful of devices log the same line millions of times.' })}
      ${kpiCard({ label: 'Crashes / freezes (30d)', value: fmtNum(ERRORS_BY_VERSION.reduce((s, r) => s + r.crashes, 0)), tooltip: 'Simulated. Exists in Toverview today; not yet joined into Elasticsearch.' })}
      ${kpiCard({ label: 'PBIT failures (30d)', value: fmtNum(ERRORS_BY_VERSION.reduce((s, r) => s + r.pbitFailures, 0)), tooltip: 'Simulated. Planned feature - will change once PBIT results are flowing in.' })}
    </div>

    <div class="grid grid-12">
      <div class="card span-7">
        ${cardHead('Error timeline', 'SPDLOG error lines per day, fleet-wide', availPill('available'))}
        ${lineAreaChart({ labels: ERROR_TIMELINE.map(r => r.date), values: ERROR_TIMELINE.map(r => r.errors), color: 'var(--status-critical)', fillColor: 'var(--status-critical)', formatLabel: (d) => fmtDate(d), formatValue: (v) => fmtNum(v) + ' errors' })}
      </div>
      <div class="card span-5">
        ${cardHead('Errors by software version', 'Error lines in the 30-day window', availPill('available'))}
        ${vBarChart({ items: versionItems, color: 'var(--status-critical)', formatValue: (v) => fmtNum(v) + ' errors' })}
      </div>
    </div>

    <div class="card">
      ${cardHead('Most frequent error lines', 'Top SPDLOG messages - volume vs. how many devices hit them', availPill('available'))}
      <table class="data-table">
        <thead><tr><th>Message</th><th class="num">Lines</th><th class="num">Devices</th></tr></thead>
        <tbody>
          ${ERROR_MESSAGES.slice(0, 12).map(m => `<tr><td class="mono" style="white-space:normal;word-break:break-word">${esc(m.message)}</td><td class="num">${fmtNum(m.count)}</td><td class="num">${fmtNum(m.devices)}</td></tr>`).join('')}
        </tbody>
      </table>
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
