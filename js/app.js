// =========================================================================
// App shell: tiny state store, router, and global event delegation.
//
// Navigation is team-first: the sidebar picks a team, each team module
// exports a list of subtabs (the exact dashboards that team asked for) and
// a render/mount pair that switches on state.subtab internally. Overview
// has no subtabs.
// =========================================================================

import { esc } from './utils.js';
import { renderSidebar, renderSubtabs } from './components.js';
import { renderDevicePanel } from './devicePanel.js';
import { DEVICES } from './data.js';
import { DEFAULT_FILTERS } from './filters.js';

import * as overview from './pages/overview.js';
import * as rd from './teams/rd.js';
import * as product from './teams/product.js';
import * as commerce from './teams/commerce.js';
import * as ops from './teams/ops.js';
import * as software from './teams/software.js';

const TEAM_MODULES = { overview, rd, product, commerce, ops, software };

const state = {
  team: 'overview',
  subtab: null,
  filters: { ...DEFAULT_FILTERS },
  ui: {},
  selectedDeviceId: null,
};

const sidebarEl = document.getElementById('sidebar');
const pageRoot = document.getElementById('page-root');
const scrimEl = document.getElementById('overlay-scrim');
const panelEl = document.getElementById('side-panel');
const tooltipEl = document.getElementById('viz-tooltip');

function currentModule() { return TEAM_MODULES[state.team]; }

function renderApp(resetScroll) {
  sidebarEl.innerHTML = renderSidebar(state.team);
  const mod = currentModule();
  pageRoot.innerHTML = mod.render(state);
  mod.mount(pageRoot, state);
  if (resetScroll) window.scrollTo(0, 0);
}

function goTeam(teamKey) {
  state.team = teamKey;
  const mod = TEAM_MODULES[teamKey];
  state.subtab = mod && mod.TABS ? mod.TABS[0].key : null;
  renderApp(true);
}

function goSubtab(subtabKey) {
  state.subtab = subtabKey;
  renderApp(true);
}

function openPanel(id) {
  const device = DEVICES.find(d => d.id === id);
  if (!device) return;
  state.selectedDeviceId = id;
  panelEl.innerHTML = renderDevicePanel(device);
  scrimEl.classList.add('visible');
  panelEl.classList.add('visible');
}

function closePanel() {
  scrimEl.classList.remove('visible');
  panelEl.classList.remove('visible');
}

// -------------------------------------------------------------------------
// Global delegated interactions
// -------------------------------------------------------------------------

document.addEventListener('click', (e) => {
  const navEl = e.target.closest('[data-nav]');
  if (navEl) { goTeam(navEl.getAttribute('data-nav')); return; }

  const subtabEl = e.target.closest('[data-subtab]');
  if (subtabEl) { goSubtab(subtabEl.getAttribute('data-subtab')); return; }

  const tabBtn = e.target.closest('.tab-btn[data-tabvalue]');
  if (tabBtn) {
    const group = tabBtn.closest('[data-tabgroup]');
    const name = group.getAttribute('data-tabgroup');
    const value = tabBtn.getAttribute('data-tabvalue');
    const uiKey = `${state.team}:${state.subtab}`;
    if (!state.ui[uiKey]) state.ui[uiKey] = {};
    state.ui[uiKey][name] = value;
    renderApp();
    return;
  }

  const resetBtn = e.target.closest('[data-action="reset-filters"]');
  if (resetBtn) { state.filters = { ...DEFAULT_FILTERS }; renderApp(); return; }

  const closeBtn = e.target.closest('[data-action="close-panel"]');
  if (closeBtn) { closePanel(); return; }

  if (e.target === scrimEl) { closePanel(); return; }

  const deviceEl = e.target.closest('[data-device-id]');
  if (deviceEl) { openPanel(deviceEl.getAttribute('data-device-id')); return; }
});

document.addEventListener('change', (e) => {
  const sel = e.target.closest('[data-filter]');
  if (sel) {
    state.filters[sel.getAttribute('data-filter')] = sel.value;
    renderApp();
  }
});

document.addEventListener('app:selectDevice', (e) => openPanel(e.detail.id));
document.addEventListener('app:goto', (e) => {
  if (e.detail.team) goTeam(e.detail.team);
  if (e.detail.subtab) goSubtab(e.detail.subtab);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closePanel();
});

// -------------------------------------------------------------------------
// Shared floating tooltip - any element with data-tt (plain text) or
// data-tt-html (rich content) triggers it on hover.
// -------------------------------------------------------------------------

let ttTarget = null;

document.addEventListener('mouseover', (e) => {
  const el = e.target.closest('[data-tt],[data-tt-html]');
  if (!el || el === ttTarget) return;
  ttTarget = el;
  const html = el.getAttribute('data-tt-html');
  const text = el.getAttribute('data-tt');
  tooltipEl.innerHTML = html ? html : esc(text || '');
  tooltipEl.style.left = e.clientX + 'px';
  tooltipEl.style.top = e.clientY + 'px';
  tooltipEl.classList.add('visible');
});

document.addEventListener('mousemove', (e) => {
  if (!ttTarget) return;
  tooltipEl.style.left = e.clientX + 'px';
  tooltipEl.style.top = e.clientY + 'px';
});

document.addEventListener('mouseout', (e) => {
  if (!ttTarget) return;
  if (e.relatedTarget && ttTarget.contains(e.relatedTarget)) return;
  ttTarget = null;
  tooltipEl.classList.remove('visible');
});

renderApp();
