// =========================================================================
// Shared filter application - kept separate so pages don't each re-derive
// "does this device match the current filter bar" logic.
// =========================================================================

import { DEVICES, GAME_STATS, CATEGORY_STATS } from './data.js';

export const DEFAULT_FILTERS = {
  dateRange: '30d',
  game: 'all',
  category: 'all',
  device: 'all',
  customer: 'all',
  country: 'all',
  version: 'all',
  deviceType: 'all',
  subscription: 'all',
  status: 'all',
};

export function applyDeviceFilters(devices, f) {
  return devices.filter(d =>
    (f.customer === 'all' || d.customerId === f.customer) &&
    (f.country === 'all' || d.countryCode === f.country) &&
    (f.version === 'all' || d.softwareVersion === f.version) &&
    (f.deviceType === 'all' || d.type === f.deviceType) &&
    (f.subscription === 'all' || d.subscription === f.subscription)
  );
}

// A device-scope filter narrows the fleet, which in turn should visibly
// move fleet-wide usage numbers even though there's no full per-device
// usage fact table yet. We scale by the matched share of the fleet -
// deterministic, and honest about being an approximation.
export function usageScale(f) {
  const filtered = applyDeviceFilters(DEVICES, f);
  const scale = filtered.length / DEVICES.length;
  return Math.max(0.04, scale);
}

export function filteredGameStats(f) {
  let rows = GAME_STATS;
  if (f.category !== 'all') rows = rows.filter(g => g.category === f.category);
  if (f.game !== 'all') rows = rows.filter(g => g.id === f.game);
  return rows;
}

export function filteredCategoryStats(f) {
  if (f.category === 'all') return CATEGORY_STATS;
  return CATEGORY_STATS.filter(c => c.category === f.category);
}

export function dateRangeDays(f) {
  switch (f.dateRange) {
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    case '12mo': return 90; // prototype only carries 90 days of daily mock history; scaled below
    default: return 30;
  }
}

export function dateRangeMultiplier(f) {
  return f.dateRange === '12mo' ? 4.1 : 1;
}
