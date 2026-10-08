// =========================================================================
// Device detail slide-over - drill-down from any device table / map dot.
// =========================================================================

import { esc, fmtNum, fmtMinutes, fmtDateTime, timeAgo } from './utils.js';
import { icon, flapMark } from './icons.js';
import { statusBadge, availPill, infoDot } from './components.js';
import { sparkline } from './charts.js';
import { PBIT_COMPONENTS, PBIT_CHECK_DESC } from './data.js';

const PBIT_ICON = {
  'Projector': 'projector', 'Daughter Board': 'board', 'IR Remote Sensor': 'wifi', 'IR Emitter': 'bolt',
  'RGB Camera': 'camera', 'IR Camera': 'camera', 'Accelerometer': 'accel', 'Speaker': 'speaker',
  'Wi-Fi': 'wifi', 'Modem / SIM': 'sim', 'TPU': 'chip', 'Focus Wheel': 'focus', 'Disk Usage': 'disk',
};

function pbitStatusColor(s) {
  if (s === 'pass') return 'var(--status-good)';
  if (s === 'warning') return 'var(--status-warning)';
  return 'var(--status-critical)';
}

function pbitStatusClass(s) {
  if (s === 'pass') return 'good';
  if (s === 'warning') return 'warning';
  return 'critical';
}

function pbitStatusLabel(s) {
  if (s === 'pass') return 'Nominal';
  if (s === 'warning') return 'Watch';
  return 'Failing';
}

export function renderDevicePanel(device) {
  if (!device) return '';
  const dayLabels = ['6d ago', '5d', '4d', '3d', '2d', 'Yest.', 'Today'];
  const errorEvents = device.errorCount30d > 0
    ? `
        <div class="feed-item">
          <span class="feed-dot" style="background:var(--status-critical)"></span>
          <div class="feed-main">
            <div class="feed-title">Most frequent error line</div>
            <div class="feed-meta mono" style="word-break:break-word">${esc(device.topError || '-')}</div>
          </div>
          <div class="feed-time">${device.firstErrorAt ? 'since ' + fmtDateTime(device.firstErrorAt) : ''}</div>
        </div>`
    : `<div class="empty-state">No SPDLOG errors logged in the 30-day window.</div>`;

  const pbitGrid = PBIT_COMPONENTS.map(c => `
    <div class="pbit-item" data-tt="${esc(pbitStatusLabel(device.pbit[c]))} - check: ${esc(PBIT_CHECK_DESC[c] || c)}">
      <span class="pbit-icon" style="color:${pbitStatusColor(device.pbit[c])}">${icon(PBIT_ICON[c] || 'chip')}</span>
      <span class="label">${esc(c)}</span>
      <span class="pbit-mark" style="color:${pbitStatusColor(device.pbit[c])}">${flapMark(pbitStatusClass(device.pbit[c]), 12)}</span>
    </div>
  `).join('');

  return `
    <div class="side-panel-head">
      <button class="side-panel-close" data-action="close-panel">${icon('close')}</button>
      <div class="helper-text mono" style="margin-bottom:4px">${esc(device.serial)}</div>
      <h3 style="font-size:17px;font-weight:800;font-family:var(--font-display)">${esc(device.customer)}</h3>
      <div class="flex items-center gap-2 mt-2" style="flex-wrap:wrap">
        ${statusBadge(device.technicalHealth)}
        ${statusBadge(device.usageHealth)}
        <span class="helper-text">${esc(device.country)}${device.countryInferred ? " (inferred from partner)" : device.city ? " · " + esc(device.city) : ""}</span>
      </div>
    </div>
    <div class="side-panel-body">

      <div class="kv-grid">
        <div class="kv-item"><div class="k">Device type</div><div class="v">${esc(device.type)}</div></div>
        <div class="kv-item"><div class="k">Subscription (simulated)</div><div class="v">${esc(device.subscription)}</div></div>
        <div class="kv-item"><div class="k">Software version</div><div class="v">${esc(device.softwareVersion)}</div></div>
        <div class="kv-item"><div class="k">Days played (30d)</div><div class="v">${fmtNum(device.activeDays30)}</div></div>
        <div class="kv-item"><div class="k">Last seen</div><div class="v">${esc(timeAgo(device.lastSeenMinutes === 0 ? new Date() : new Date(Date.now() - device.lastSeenMinutes * 60000)))}</div></div>
        <div class="kv-item"><div class="k">Restarts (30d)</div><div class="v">${fmtNum(device.restarts30d)}</div></div>
      </div>

      <hr class="hairline" />

      <div>
        <div class="flex items-center justify-between">
          <h3 style="font-size:12.5px;font-weight:700">Usage, last 7 days of data</h3>
          ${availPill('available')}
        </div>
        <div class="flex items-center gap-3 mt-2">
          ${sparkline(device.trend7d, { width: 160, height: 40, color: 'var(--accent-yellow-deep)' })}
          <div>
            <div class="stat-inline"><span class="n">${fmtMinutes(device.minutesLast30d)}</span></div>
            <div class="helper-text">last 30 days · ${fmtNum(device.sessionsLast30d)} sessions</div>
          </div>
        </div>
      </div>

      <hr class="hairline" />

      <div>
        <div class="flex items-center justify-between">
          <h3 style="font-size:12.5px;font-weight:700">Hardware diagnostics (PBIT)</h3>
          ${availPill('planned')}
        </div>
        <div class="pbit-grid mt-3">${pbitGrid}</div>
      </div>

      <hr class="hairline" />

      <div>
        <div class="flex items-center justify-between">
          <h3 style="font-size:12.5px;font-weight:700">Recent errors</h3>
          <span class="helper-text">${fmtNum(device.errorCount7d)} in 7d · ${fmtNum(device.errorCount30d)} in 30d (SPDLOG lines)</span>
        </div>
        <div class="feed-list mt-2">${errorEvents}</div>
      </div>

      <hr class="hairline" />

      <div class="helper-text" style="line-height:1.6">
        <strong style="color:var(--ink-secondary)">Reading this panel:</strong>
        technical health and usage health are tracked independently - a device can
        be fully healthy and simply not in active use, or well-used on an older
        software version. ${infoDot('This separation is a deliberate constraint from the Device & Fleet Health planning notes.')}
      </div>
    </div>
  `;
}
