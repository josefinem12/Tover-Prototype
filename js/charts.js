// =========================================================================
// Lightweight inline-SVG chart primitives. No charting library - thin
// strokes, restrained gridlines, hover targets carry data-tt for the
// shared tooltip (wired once, globally, in app.js).
// =========================================================================

import { esc, fmtCompact } from './utils.js';

// Fixed categorical order - never cycled/reassigned per filter. Reused
// across every team page so a given slot always reads as the same hue.
export const SERIES_COLORS = [
  'var(--series-1)', 'var(--series-2)', 'var(--series-3)',
  'var(--series-4)', 'var(--series-5)', 'var(--series-6)',
];

function scaleLinear(domainMin, domainMax, rangeMin, rangeMax) {
  const d = (domainMax - domainMin) || 1;
  return (v) => rangeMin + ((v - domainMin) / d) * (rangeMax - rangeMin);
}

function niceMax(v) {
  if (v <= 0) return 10;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * mag;
}

function ttAttr(html) {
  return `data-tt-html='${html.replace(/'/g, '&#39;')}'`;
}

// -------------------------------------------------------------------------
// Line / area chart - single series, with light gridlines + hover points.
// -------------------------------------------------------------------------

export function lineAreaChart({ labels, values, color = 'var(--accent-yellow-deep)', fillColor = 'var(--accent-yellow)', width = 640, height = 200, formatValue = (v) => fmtCompact(v), formatLabel = (l) => l, yMax }) {
  const padL = 8, padR = 8, padT = 14, padB = 26;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const max = yMax || niceMax(Math.max(...values) * 1.15);
  const x = scaleLinear(0, values.length - 1, padL, padL + innerW);
  const y = scaleLinear(0, max, padT + innerH, padT);

  const gridCount = 3;
  const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => {
    const v = (max / gridCount) * i;
    const gy = y(v);
    return `<line class="chart-grid-line" x1="${padL}" x2="${padL + innerW}" y1="${gy}" y2="${gy}"/>
      <text x="2" y="${gy + 3}" font-size="9.5">${esc(fmtCompact(v))}</text>`;
  }).join('');

  const points = values.map((v, i) => [x(i), y(v)]);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const areaPath = `${path} L${points[points.length - 1][0].toFixed(1)},${padT + innerH} L${points[0][0].toFixed(1)},${padT + innerH} Z`;

  const step = Math.max(1, Math.round(values.length / 6));
  const xLabels = labels.map((l, i) => (i % step === 0 || i === values.length - 1) ? `<text x="${x(i)}" y="${height - 6}" font-size="9.5" text-anchor="middle">${esc(formatLabel(l))}</text>` : '').join('');

  const hoverTargets = points.map((p, i) => `
    <circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="9" fill="transparent" class="hover-target"
      ${ttAttr(`<div class='tt-title'>${esc(formatLabel(labels[i]))}</div><div class='tt-row'><span class='tt-swatch' style='background:${color}'></span>${esc(formatValue(values[i]))}</div>`)} />
    <circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.4" fill="${color}" class="chart-point-dot" style="opacity:0" />
  `).join('');

  const gid = 'g' + Math.random().toString(36).slice(2, 9);

  return `
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img">
      <defs>
        <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${fillColor}" stop-opacity="0.32"/>
          <stop offset="100%" stop-color="${fillColor}" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      ${gridLines}
      <path d="${areaPath}" fill="url(#${gid})" stroke="none"/>
      <path d="${path}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      ${xLabels}
      <g class="chart-hover-layer">${hoverTargets}</g>
    </svg>
  `;
}

// -------------------------------------------------------------------------
// Horizontal ranking bars (e.g. game popularity)
// -------------------------------------------------------------------------

export function hBarChart({ items, width = 560, barH = 22, gap = 10, color = 'var(--accent-yellow-deep)', formatValue = (v) => fmtCompact(v), maxValue, onClickAttr }) {
  const max = maxValue || Math.max(...items.map(d => d.value)) * 1.08;
  const labelW = 148;
  const valueW = 56;
  const trackW = width - labelW - valueW;
  const height = items.length * (barH + gap) - gap + 4;
  const bars = items.map((it, i) => {
    const y = i * (barH + gap);
    const w = Math.max(3, (it.value / max) * trackW);
    const barColor = it.color || color;
    return `
      <g transform="translate(0,${y})">
        <text x="${labelW - 10}" y="${barH / 2 + 4}" font-size="11.5" text-anchor="end" fill="var(--ink-primary)" font-weight="600">${esc(it.label)}</text>
        <rect x="${labelW}" y="2" width="${trackW}" height="${barH - 4}" rx="${(barH - 4) / 2}" fill="var(--surface-sunken)"/>
        <rect x="${labelW}" y="2" width="${w}" height="${barH - 4}" rx="${(barH - 4) / 2}" fill="${barColor}" class="hover-target" style="cursor:pointer"
          ${ttAttr(`<div class='tt-title'>${esc(it.label)}</div><div class='tt-row'><span class='tt-swatch' style='background:${barColor}'></span>${esc(formatValue(it.value))}${it.sub ? ' · ' + esc(it.sub) : ''}</div>`)} />
        <text x="${labelW + trackW + 8}" y="${barH / 2 + 4}" font-size="11" fill="var(--ink-secondary)" font-weight="600">${esc(formatValue(it.value))}</text>
      </g>
    `;
  }).join('');
  return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img">${bars}</svg>`;
}

// -------------------------------------------------------------------------
// Vertical bars (category / distribution)
// -------------------------------------------------------------------------

export function vBarChart({ items, width = 560, height = 200, color = 'var(--accent-yellow-deep)', formatValue = (v) => fmtCompact(v) }) {
  const padB = 30, padT = 10;
  const innerH = height - padB - padT;
  const max = Math.max(...items.map(d => d.value)) * 1.15;
  const gap = 14;
  const barW = (width - gap * (items.length + 1)) / items.length;
  const bars = items.map((it, i) => {
    const x = gap + i * (barW + gap);
    const h = Math.max(3, (it.value / max) * innerH);
    const y = padT + innerH - h;
    const barColor = it.color || color;
    return `
      <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="4" fill="${barColor}" class="hover-target"
        ${ttAttr(`<div class='tt-title'>${esc(it.label)}</div><div class='tt-row'><span class='tt-swatch' style='background:${barColor}'></span>${esc(formatValue(it.value))}</div>`)} />
      <text x="${(x + barW / 2).toFixed(1)}" y="${height - 8}" font-size="9.5" text-anchor="middle">${esc(it.label)}</text>
    `;
  }).join('');
  return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img">
    <line class="chart-axis-line" x1="0" x2="${width}" y1="${padT + innerH}" y2="${padT + innerH}"/>
    ${bars}
  </svg>`;
}

// -------------------------------------------------------------------------
// Donut chart
// -------------------------------------------------------------------------

export function donutChart({ items, size = 168, thickness = 22, formatValue = (v) => fmtCompact(v), centerLabel, centerValue }) {
  const total = items.reduce((s, d) => s + d.value, 0) || 1;
  const r = size / 2;
  const rInner = r - thickness;
  let angle = -Math.PI / 2;
  const gapAngle = 0.018;
  const segs = items.map((it) => {
    const frac = it.value / total;
    const a0 = angle + gapAngle / 2;
    const a1 = angle + frac * Math.PI * 2 - gapAngle / 2;
    angle += frac * Math.PI * 2;
    const large = (a1 - a0) > Math.PI ? 1 : 0;
    const p = (a, rad) => [r + Math.cos(a) * rad, r + Math.sin(a) * rad];
    const [x0, y0] = p(a0, r), [x1, y1] = p(a1, r);
    const [ix1, iy1] = p(a1, rInner), [ix0, iy0] = p(a0, rInner);
    const d = `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)} L${ix1.toFixed(2)},${iy1.toFixed(2)} A${rInner},${rInner} 0 ${large} 0 ${ix0.toFixed(2)},${iy0.toFixed(2)} Z`;
    const pct = ((it.value / total) * 100).toFixed(0);
    return `<path d="${d}" fill="${it.color}" class="hover-target"
      ${ttAttr(`<div class='tt-title'>${esc(it.label)}</div><div class='tt-row'><span class='tt-swatch' style='background:${it.color}'></span>${esc(formatValue(it.value))} · ${pct}%</div>`)} />`;
  }).join('');

  const center = centerLabel ? `
    <text x="${r}" y="${r - 4}" text-anchor="middle" font-size="19" font-weight="800" fill="var(--ink-primary)" font-family="var(--font-display)">${esc(centerValue)}</text>
    <text x="${r}" y="${r + 13}" text-anchor="middle" font-size="9.5" fill="var(--ink-muted)">${esc(centerLabel)}</text>
  ` : '';

  return `<svg class="chart-svg" viewBox="0 0 ${size} ${size}" role="img" style="max-width:${size}px">${segs}${center}</svg>`;
}

// -------------------------------------------------------------------------
// Sparkline (no axes, no tooltip - compact table/KPI use)
// -------------------------------------------------------------------------

export function sparkline(values, { width = 72, height = 24, color = 'var(--accent-yellow-deep)' } = {}) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const x = scaleLinear(0, values.length - 1, 2, width - 2);
  const y = scaleLinear(min, max, height - 3, 3);
  const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="display:block">
    <path d="${path}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

// -------------------------------------------------------------------------
// Dot-grid world map (procedurally generated continents - not literal path
// data). Coarse and stylised on purpose: this view is explicitly "Mock for
// Prototype 1" for exact positioning; the point is showing spread + status.
// -------------------------------------------------------------------------

const LAND_BANDS = [
  [-168, -52, 48, 72], [-125, -66, 25, 49], [-118, -93, 14, 25], [-92, -77, 7, 18],
  [-55, -20, 60, 83],
  [-81, -34, -4, 12], [-75, -34, -20, -4], [-73, -53, -56, -20],
  [-10, 40, 36, 60], [-9, 30, 55, 71],
  [-18, 52, -35, 15], [-18, 35, 15, 37],
  [34, 63, 12, 42],
  [45, 145, 5, 55], [60, 180, 50, 77], [68, 92, 6, 30], [92, 141, -10, 25], [129, 146, 30, 46],
  [113, 154, -39, -10], [166, 179, -47, -34],
];

function isLand(lon, lat) {
  return LAND_BANDS.some(([lo0, lo1, la0, la1]) => lon >= lo0 && lon <= lo1 && lat >= la0 && lat <= la1);
}

export function projectGeo(lon, lat, width, height, latRange = 85) {
  const x = ((lon + 180) / 360) * width;
  const y = ((latRange - lat) / (latRange * 2)) * height;
  return [x, y];
}

export function worldMapSvg({ width = 780, height = 372, markers = [] }) {
  const cols = 84, rows = 40;
  const dots = [];
  for (let r = 0; r < rows; r++) {
    const lat = 85 - (r / (rows - 1)) * 170;
    for (let c = 0; c < cols; c++) {
      const lon = -180 + (c / (cols - 1)) * 360;
      if (isLand(lon, lat)) {
        const [x, y] = projectGeo(lon, lat, width, height);
        dots.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.7" fill="var(--ink-faint)"/>`);
      }
    }
  }

  // A fleet this size puts thousands of markers within a 780x372 viewBox -
  // sampled at an even stride so every status/country stays represented
  // without drawing (and animating) more dots than the map can usefully show.
  const MAX_MARKERS = 400;
  const stride = Math.max(1, Math.ceil(markers.length / MAX_MARKERS));
  const shown = stride > 1 ? markers.filter((_, i) => i % stride === 0) : markers;
  const MAX_PULSE = 60;
  let pulseCount = 0;

  const statusColor = { now: 'var(--status-good)', recent: 'var(--series-3)', offline: 'var(--status-offline)' };
  const markerEls = shown.map(m => {
    const [x, y] = projectGeo(m.lon, m.lat, width, height);
    const color = statusColor[m.status] || statusColor.offline;
    const r = m.status === 'now' ? 4.2 : 3.2;
    const canPulse = m.status === 'now' && pulseCount < MAX_PULSE;
    if (canPulse) pulseCount++;
    const pulse = canPulse ? `<circle class="map-pulse-ring" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${color}" opacity="0.35"/>` : '';
    return `<g class="map-dot" ${ttAttr(`<div class='tt-title'>${esc(m.serial)}</div><div class='tt-row'><span class='tt-swatch' style='background:${color}'></span>${esc(m.customer)}</div><div class='tt-row'>${esc(m.country)} · ${esc(m.statusLabel)}</div>`)} data-device-id="${esc(m.id)}">
      ${pulse}
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${color}" stroke="var(--surface)" stroke-width="1.2"/>
    </g>`;
  }).join('');

  return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" style="width:100%">
    <rect x="0" y="0" width="${width}" height="${height}" fill="transparent"/>
    ${dots.join('')}
    ${markerEls}
  </svg>`;
}
