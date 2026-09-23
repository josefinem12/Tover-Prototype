// =========================================================================
// Shared helpers: seeded randomness, formatting, small DOM utilities.
// Kept independent of mock data / UI so both layers can use it.
// =========================================================================

// Mulberry32 seeded PRNG - deterministic mock data across renders.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
export function randInt(rng, min, max) { return Math.floor(rng() * (max - min + 1)) + min; }
export function randFloat(rng, min, max, digits = 1) {
  const v = rng() * (max - min) + min;
  return Number(v.toFixed(digits));
}
export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
export function lerp(a, b, t) { return a + (b - a) * t; }

export function esc(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

export function fmtNum(n) {
  if (n === null || n === undefined) return '-';
  return new Intl.NumberFormat('en-US').format(Math.round(n));
}

export function fmtCompact(n) {
  if (n === null || n === undefined) return '-';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export function fmtMinutes(mins) {
  if (mins === null || mins === undefined) return '-';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  return `${fmtNum(h)}h ${m}m`;
}

export function fmtPct(n, digits = 0) {
  if (n === null || n === undefined) return '-';
  return `${n.toFixed(digits)}%`;
}

export function fmtDate(d, opts = { month: 'short', day: 'numeric' }) {
  const date = (d instanceof Date) ? d : new Date(d);
  return date.toLocaleDateString('en-US', opts);
}

export function fmtDateTime(d) {
  const date = (d instanceof Date) ? d : new Date(d);
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function timeAgo(d) {
  const date = (d instanceof Date) ? d : new Date(d);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export function minutesAgo(n) {
  const d = new Date();
  d.setMinutes(d.getMinutes() - n);
  return d;
}

// Tiny DOM helper: build an element from an HTML string.
export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function qs(root, sel) { return root.querySelector(sel); }
export function qsa(root, sel) { return Array.from(root.querySelectorAll(sel)); }

export function debounce(fn, wait = 150) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}
