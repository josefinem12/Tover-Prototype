// =========================================================================
// Reusable UI components - pure functions returning HTML strings, plus a
// handful of "mount" helpers for the pieces that need local interactivity
// (the shared tooltip, and the data table with search/sort).
// All app-level wiring (nav, global filters, tabs) is done once via event
// delegation in app.js; components stay declarative.
// =========================================================================

import { esc, fmtNum } from './utils.js';
import { icon, flapMark } from './icons.js';
import { TEAMS, DATA_STATUS } from './data.js';
import { SERIES_COLORS } from './charts.js';

// -------------------------------------------------------------------------
// Sidebar
// -------------------------------------------------------------------------

export const NAV_ITEMS = [
  { key: 'overview', label: 'Overview', icon: 'overview' },
  { key: 'rd', label: TEAMS.rd.label, icon: 'search' },
  { key: 'product', label: TEAMS.product.label, icon: 'world' },
  { key: 'commerce', label: TEAMS.commerce.label, icon: 'briefcase' },
  { key: 'customers', label: TEAMS.customers.label, icon: 'home' },
  { key: 'ops', label: TEAMS.ops.label, icon: 'wrench' },
  { key: 'software', label: TEAMS.software.label, icon: 'terminal' },
];

export function renderSidebar(activeTeam) {
  const items = NAV_ITEMS.map(n => {
    const isActive = n.key === activeTeam;
    return `
      <li>
        <button class="nav-item ${isActive ? 'active' : ''}" data-nav="${n.key}">
          <span class="nav-icon">${icon(n.icon)}</span>
          <span>${esc(n.label)}</span>
          ${isActive ? `<span class="nav-mark" style="color:var(--accent-yellow)">${flapMark('good', 9)}</span>` : ''}
        </button>
      </li>`;
  }).join('');

  return `
    <div class="sidebar-brand">
      <div class="sidebar-brand-mark">
        <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" stroke="#15130F" stroke-width="1.8"/><path d="M4 12h16" stroke="#15130F" stroke-width="1.8"/></svg>
      </div>
      <div class="sidebar-brand-text">
        <div class="name">Tover Insights</div>
        <div class="sub">Fleet analytics · Sep 2026</div>
      </div>
    </div>
    <div class="nav-label">By team</div>
    <ul class="nav-list">${items}</ul>
  `;
}

// -------------------------------------------------------------------------
// Page header + subtab bar + filter bar
// -------------------------------------------------------------------------

export function renderPageHeader({ eyebrow, title, desc, sharedWith, subtabsHtml, filtersHtml }) {
  return `
    <div class="page-header">
      <div class="page-header-top">
        <div class="page-title-block">
          <div class="title-row">
            <h1>${esc(title)}</h1>
            ${eyebrow ? `<span class="platform-tag">${esc(eyebrow)}</span>` : ''}
          </div>
          ${desc ? `<div class="desc">${esc(desc)}</div>` : ''}
          ${sharedWith ? `<div class="helper-text mt-2">Same underlying data also shown to: ${esc(sharedWith)}</div>` : ''}
        </div>
      </div>
      ${subtabsHtml ? `<div class="subtab-bar">${subtabsHtml}</div>` : ''}
      ${filtersHtml ? `<div class="filter-bar">${filtersHtml}</div>` : ''}
    </div>
  `;
}

export function renderSubtabs(subtabs, activeKey) {
  return subtabs.map(s => `
    <button class="subtab-btn ${s.key === activeKey ? 'active' : ''}" data-subtab="${esc(s.key)}">${esc(s.label)}</button>
  `).join('');
}

// One team page = header (eyebrow/title/desc + subtab bar + filters) + body.
// Every team module composes its subtab content this way.
export function renderTeamPage(tabs, state, { eyebrow, title, desc, sharedWith, filtersHtml, bodyHtml }) {
  return renderPageHeader({
    eyebrow, title, desc, sharedWith, filtersHtml,
    subtabsHtml: renderSubtabs(tabs, state.subtab),
  }) + `<div class="page-body">${bodyHtml}</div>`;
}

export function filterSelect(name, label, options, value) {
  const opts = options.map(o => {
    const v = typeof o === 'string' ? o : o.value;
    const l = typeof o === 'string' ? o : o.label;
    return `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(l)}</option>`;
  }).join('');
  return `
    <div class="filter-control">
      <span class="ticket-notch" aria-hidden="true"></span>
      <select class="filter-select" data-filter="${esc(name)}" aria-label="${esc(label)}">${opts}</select>
    </div>
  `;
}

export function filterResetButton() {
  return `<button class="filter-reset" data-action="reset-filters">Reset filters</button>`;
}

export function filterDivider() { return `<div class="filter-divider"></div>`; }

// -------------------------------------------------------------------------
// KPI card
// -------------------------------------------------------------------------

export function kpiCard({ label, value, unit, delta, sub, tooltip }) {
  let deltaHtml = '';
  if (delta !== undefined && delta !== null) {
    const dir = delta > 0.05 ? 'up' : delta < -0.05 ? 'down' : 'flat';
    const arrow = dir === 'up' ? 'arrowUp' : dir === 'down' ? 'arrowDown' : 'arrowFlat';
    deltaHtml = `<span class="kpi-delta ${dir}">${icon(arrow)}${Math.abs(delta).toFixed(1)}% <span class="text-muted" style="font-weight:500">vs prior period</span></span>`;
  }
  return `
    <div class="kpi-card">
      <div class="kpi-label-row">
        <span class="kpi-label">${esc(label)}</span>
        ${tooltip ? infoDot(tooltip) : ''}
      </div>
      <div class="kpi-value">${value}${unit ? `<span class="unit">${esc(unit)}</span>` : ''}</div>
      ${deltaHtml}
      ${sub ? `<div class="kpi-sub">${esc(sub)}</div>` : ''}
    </div>
  `;
}

// -------------------------------------------------------------------------
// Info dot + shared floating tooltip (delegated globally in app.js)
// -------------------------------------------------------------------------

export function infoDot(text) {
  return `<span class="info-dot" data-tt="${esc(text)}">i</span>`;
}

export function availPill(statusKey) {
  const s = DATA_STATUS[statusKey] || DATA_STATUS.mock;
  return `<span class="avail-pill" data-avail="${s.key}" data-tt="${esc(s.label + ' - ' + s.desc)}">${flapMark(s.key, 10)}${esc(s.short)}</span>`;
}

// -------------------------------------------------------------------------
// Status badges
// -------------------------------------------------------------------------

const HEALTH_META = {
  healthy:   { cls: 'good',     label: 'Healthy' },
  attention: { cls: 'warning',  label: 'Attention needed' },
  action:    { cls: 'action',   label: 'Action needed' },
  offline:   { cls: 'offline',  label: 'Offline' },
  active:    { cls: 'good',     label: 'Active' },
  light:     { cls: 'warning',  label: 'Light use' },
  quiet:     { cls: 'action',   label: 'Quiet' },
  dormant:   { cls: 'offline',  label: 'Dormant' },
  good:      { cls: 'good',     label: 'Good' },
  critical:  { cls: 'critical', label: 'Critical' },
  pass:      { cls: 'good',     label: 'Pass' },
  warning:   { cls: 'warning',  label: 'Warning' },
  fail:      { cls: 'critical', label: 'Fail' },
};

export function statusBadge(key, labelOverride) {
  const m = HEALTH_META[key] || { cls: 'neutral', label: key };
  return `<span class="badge badge-${m.cls}">${flapMark(m.cls)}${esc(labelOverride || m.label)}</span>`;
}

export function pbitDotColor(status) {
  if (status === 'pass') return 'var(--status-good)';
  if (status === 'warning') return 'var(--status-warning)';
  return 'var(--status-critical)';
}

// -------------------------------------------------------------------------
// Tabs
// -------------------------------------------------------------------------

export function tabGroup(name, options, value) {
  return `<div class="tab-group" data-tabgroup="${esc(name)}">${options.map(o => `
    <button class="tab-btn ${o.value === value ? 'active' : ''}" data-tabvalue="${esc(o.value)}">${esc(o.label)}</button>
  `).join('')}</div>`;
}

// -------------------------------------------------------------------------
// Cards
// -------------------------------------------------------------------------

export function cardHead(title, sub, actionsHtml) {
  return `
    <div class="card-head">
      <div class="titles">
        <h3>${esc(title)}</h3>
        ${sub ? `<div class="card-sub">${esc(sub)}</div>` : ''}
      </div>
      ${actionsHtml ? `<div class="card-head-actions">${actionsHtml}</div>` : ''}
    </div>
  `;
}

export function legend(items) {
  return `<div class="legend-row">${items.map(it => `
    <span class="legend-item"><span class="legend-swatch ${it.line ? 'line' : ''}" style="background:${it.color}"></span>${esc(it.label)}</span>
  `).join('')}</div>`;
}

// -------------------------------------------------------------------------
// Selection / navigation funnel - reused by R&D, Product and Commerce,
// each with their own step counts and framing.
// -------------------------------------------------------------------------

export function renderFunnel(steps) {
  const max = steps[0].count;
  const min = steps[steps.length - 1].count;
  return `<div class="journey-row">${steps.map((s, i) => {
    const size = 44 + ((s.count - min) / (max - min || 1)) * 26;
    const prev = i > 0 ? steps[i - 1].count : null;
    const drop = prev ? Math.round(((prev - s.count) / prev) * 100) : null;
    const hue = SERIES_COLORS[i % SERIES_COLORS.length];
    return `
      <div class="journey-step">
        ${drop !== null ? `<div class="journey-drop">&minus;${drop}%</div>` : `<div class="journey-drop" style="visibility:hidden">-</div>`}
        <div class="journey-bubble" style="background:${hue}">${(s.count / 1000).toFixed(1)}k</div>
        <div class="journey-label">${esc(s.step)}</div>
        <div class="journey-sub">${esc(s.sub)}</div>
      </div>`;
  }).join('')}</div>`;
}

// -------------------------------------------------------------------------
// Mock UI heatmap - reused by Product (Product Behaviour & UI) and R&D
// (Game Selection & Interaction). Always carries the "mock" pill.
// -------------------------------------------------------------------------

export function renderHeatmapMock(tiles, opts) {
  const o = opts || {};
  const tileHtml = tiles.map(t => `
    <div class="heat-tile" ${t.span ? `style="grid-column:span ${t.span}${t.accent ? ';background:var(--accent-yellow-tint);border-color:var(--accent-yellow-deep)' : ''}"` : ''}>
      <span style="width:18px;height:18px;color:${t.accent ? 'var(--accent-yellow-deep)' : 'var(--ink-secondary)'}">${icon(t.icon || 'world')}</span>
      <span style="font-weight:${t.accent ? 700 : 600}">${esc(t.label)}</span>
    </div>`).join('');

  return `
    <div class="heatmap-frame" style="padding:22px">
      <span class="heatmap-mock-badge">${availPill('mock')}</span>
      <div style="background:var(--surface);border:1px solid var(--border-strong);padding:16px;position:relative;overflow:hidden">
        <div style="font-size:11px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px">${esc(o.caption || 'Illustrative menu layout - not an actual screenshot')}</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;position:relative;z-index:1">${tileHtml}</div>
        <div style="position:absolute;inset:0;z-index:0;pointer-events:none;
          background:${o.heat || `
            radial-gradient(circle at 22% 30%, rgba(196,121,90,0.5), transparent 40%),
            radial-gradient(circle at 78% 88%, rgba(232,184,75,0.6), transparent 38%),
            radial-gradient(circle at 55% 55%, rgba(232,184,75,0.45), transparent 45%),
            radial-gradient(circle at 12% 85%, rgba(166,119,155,0.32), transparent 35%)`};
          mix-blend-mode:multiply; opacity:.9"></div>
      </div>
      <style>.heat-tile{display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:14px 12px;background:var(--surface-sunken);border:1px solid var(--border-strong);font-size:11.5px;font-weight:600;color:var(--ink-primary)}</style>
      <div class="helper-text mt-3">${esc(o.note || 'Warmer areas indicate more simulated taps. Real interaction heat requires per-button menu telemetry that is not collected today.')}</div>
    </div>
  `;
}

// -------------------------------------------------------------------------
// Roadmap row - Software's "requested metric → status" list
// -------------------------------------------------------------------------

export function renderRoadmapRow(item) {
  return `
    <div class="roadmap-row">
      <div style="flex:1;min-width:0">
        <div class="roadmap-title">${esc(item.metric)}</div>
        <div class="roadmap-meta">${esc(item.note)}</div>
        <div class="roadmap-teams">${item.teams.map(t => `<span class="audience-chip">${esc(TEAMS[t].label)}</span>`).join('')}</div>
      </div>
      <div style="flex:none">${availPill(item.status)}</div>
    </div>
  `;
}

// -------------------------------------------------------------------------
// Generic sortable / searchable data table
// A page renders `<div data-table-mount="ID"></div>` in its markup, then
// calls mountDataTable(root, id, config) after inserting the HTML.
// The table owns its own re-renders so typing in search never disturbs the
// rest of the page.
// -------------------------------------------------------------------------

export function mountDataTable(root, mountId, { columns, rows, rowKey, searchFields, searchPlaceholder, defaultSort, onRowClick, toolbarExtra, emptyLabel }) {
  const host = root.querySelector(`[data-table-mount="${mountId}"]`);
  if (!host) return;

  let sortCol = defaultSort ? defaultSort.col : columns[0].key;
  let sortDir = defaultSort ? defaultSort.dir : 'desc';
  let query = '';

  function filteredSorted() {
    let r = rows;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      r = r.filter(row => searchFields.some(f => String(row[f] ?? '').toLowerCase().includes(q)));
    }
    const col = columns.find(c => c.key === sortCol);
    const getVal = col && col.sortValue ? col.sortValue : (row) => row[sortCol];
    r = [...r].sort((a, b) => {
      const av = getVal(a), bv = getVal(b);
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return r;
  }

  function draw(preserveFocus) {
    const data = filteredSorted();
    const theadCells = columns.map(c => `
      <th data-sort-col="${c.key}" class="${c.key === sortCol ? 'sorted' : ''}" style="${c.align === 'right' ? 'text-align:right' : ''}">
        ${esc(c.label)}${c.sortable === false ? '' : `<span class="sort-arrow">${c.key === sortCol ? (sortDir === 'asc' ? '▲' : '▼') : '·'}</span>`}
      </th>`).join('');

    const bodyRows = data.length ? data.map(row => `
      <tr data-row-key="${esc(row[rowKey])}" ${onRowClick ? 'tabindex="0"' : ''}>
        ${columns.map(c => `<td class="${c.align === 'right' ? 'num' : ''} ${c.mono ? 'mono' : ''}">${c.render ? c.render(row) : esc(row[c.key])}</td>`).join('')}
      </tr>`).join('') : `<tr><td colspan="${columns.length}"><div class="empty-state">${esc(emptyLabel || 'No matching rows.')}</div></td></tr>`;

    host.innerHTML = `
      <div class="table-toolbar">
        <div class="search-input">
          ${icon('search')}
          <input type="text" data-role="table-search" placeholder="${esc(searchPlaceholder || 'Search…')}" value="${esc(query)}" />
        </div>
        <div class="flex items-center gap-2">
          <span class="helper-text">${fmtNum(data.length)} of ${fmtNum(rows.length)}</span>
          ${toolbarExtra || ''}
        </div>
      </div>
      <div class="data-table-wrap">
        <table class="data-table">
          <thead><tr>${theadCells}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>
    `;

    const input = host.querySelector('[data-role="table-search"]');
    input.addEventListener('input', (e) => {
      query = e.target.value;
      const pos = e.target.selectionStart;
      draw();
      const again = host.querySelector('[data-role="table-search"]');
      again.focus();
      try { again.setSelectionRange(pos, pos); } catch (_) {}
    });

    host.querySelectorAll('th[data-sort-col]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-sort-col');
        if (col === sortCol) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        else { sortCol = col; sortDir = 'desc'; }
        draw();
      });
    });

    if (onRowClick) {
      host.querySelectorAll('tbody tr[data-row-key]').forEach(tr => {
        tr.addEventListener('click', () => onRowClick(tr.getAttribute('data-row-key')));
        tr.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(tr.getAttribute('data-row-key')); }
        });
      });
    }
  }

  draw();
}
