import { esc, fmtNum, fmtCompact, fmtPct } from '../utils.js';
import { renderPageHeader, availPill, kpiCard } from '../components.js';
import { icon } from '../icons.js';
import { TEAMS, DATA_STATUS, USAGE_TIMESERIES, GAME_STATS, DEVICES, EVENT_VOLUME, UPTIME_TREND, CUSTOMER_VALUE, currentlyActiveDevices, generateDqIssues } from '../data.js';
import { TABS as RD_TABS } from '../teams/rd.js';
import { TABS as PRODUCT_TABS } from '../teams/product.js';
import { TABS as COMMERCE_TABS } from '../teams/commerce.js';
import { TABS as OPS_TABS } from '../teams/ops.js';
import { TABS as SOFTWARE_TABS } from '../teams/software.js';
import { TABS as CUSTOMERS_TABS } from '../teams/customers.js';

const TEAM_CARDS = [
  { key: 'rd', icon: 'search', tabs: RD_TABS, stat: () => `${fmtCompact(USAGE_TIMESERIES.slice(-30).reduce((s, r) => s + r.minutes, 0))} min played · ${GAME_STATS.length} games tracked` },
  { key: 'product', icon: 'world', tabs: PRODUCT_TABS, stat: () => `${fmtNum(currentlyActiveDevices().length)} devices active right now` },
  { key: 'commerce', icon: 'briefcase', tabs: COMMERCE_TABS, stat: () => `${fmtNum(DEVICES.length)} devices across the fleet` },
  { key: 'customers', icon: 'home', tabs: CUSTOMERS_TABS, stat: () => `${fmtNum(CUSTOMER_VALUE.length)} care homes with a live report` },
  { key: 'ops', icon: 'wrench', tabs: OPS_TABS, stat: () => `${fmtNum(DEVICES.filter(d => d.technicalHealth === 'action').length)} devices need action` },
  { key: 'software', icon: 'terminal', tabs: SOFTWARE_TABS, stat: () => `${fmtCompact(EVENT_VOLUME.reduce((s, r) => s + r.events, 0))} events / 30d` },
];

const RULES = [
  'Number of hands is never presented as number of people.',
  'Low motion is never read as low engagement for ambient / passive games.',
  'Locale is never used as physical location.',
  'Not every GAME_START is treated as meaningful play - browsing can trigger short sessions.',
  'Low usage is never treated as poor technical device health, or vice versa.',
];

export function render() {
  const countryCount = new Set(DEVICES.map(d => d.countryCode)).size;
  const minutesLast30d = USAGE_TIMESERIES.slice(-30).reduce((s, r) => s + r.minutes, 0);
  const avgUptime = UPTIME_TREND.slice(-4).reduce((s, r) => s + r.uptime, 0) / UPTIME_TREND.slice(-4).length;

  return `
    ${renderPageHeader({
      title: 'Tover Insights',
      desc: 'Pick a team on the left. Each one opens straight to its own dashboards, filters and drill-downs.',
    })}
    <div class="page-body">

      <div>
        <h2 style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-secondary);margin-bottom:10px">Fleet at a glance</h2>
        <div class="grid grid-kpi">
          ${kpiCard({ label: 'Devices across the fleet', value: fmtNum(DEVICES.length), sub: `across ${fmtNum(countryCount)} countries` })}
          ${kpiCard({ label: 'Active right now', value: fmtNum(currentlyActiveDevices().length), sub: 'session in progress' })}
          ${kpiCard({ label: 'Minutes played', value: fmtCompact(minutesLast30d), sub: 'last 30 days' })}
          ${kpiCard({ label: 'Games in rotation', value: fmtNum(GAME_STATS.length), sub: 'across Pixie and Tovertafel' })}
          ${kpiCard({ label: 'Avg. fleet uptime', value: fmtPct(avgUptime, 1), sub: 'last 4 weeks' })}
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between" style="flex-wrap:wrap;gap:10px">
          <h3 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-secondary)">Data status legend</h3>
        </div>
        <div class="flex items-center gap-4 mt-3" style="flex-wrap:wrap">
          ${Object.values(DATA_STATUS).map(s => `<span class="flex items-center gap-2" data-tt="${esc(s.desc)}" style="cursor:help">${availPill(s.key)}<span class="helper-text">${esc(s.label)}</span></span>`).join('')}
        </div>
      </div>

      <div>
        <h2 style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-secondary);margin-bottom:10px">By team</h2>
        <div class="board">
          ${TEAM_CARDS.map(c => {
            const t = TEAMS[c.key];
            return `
            <div class="board-row" data-nav="${c.key}">
              <div class="board-row-platform"><span class="nav-icon">${icon(c.icon)}</span>${esc(t.label)}</div>
              <div class="board-row-routes">${c.tabs.map(s => `<span>${esc(s.label)}</span>`).join('')}</div>
              <div class="board-row-status">${esc(c.stat())}</div>
              <div class="board-row-arrow">${icon('chevronRight')}</div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="card">
        <h3 style="font-size:13.5px;font-weight:700">Data interpretation guidelines</h3>
        <div class="card-sub" style="margin-top:2px">Held consistently across every team</div>
        <div class="grid grid-2 mt-3" style="gap:14px">
          ${RULES.map(r => `<div class="flex items-start gap-2"><span style="color:var(--status-action);flex:none;margin-top:1px">${icon('info')}</span><span style="font-size:12.5px;color:var(--ink-secondary);line-height:1.5">${esc(r)}</span></div>`).join('')}
        </div>
      </div>

    </div>
  `;
}

export function mount() {}
