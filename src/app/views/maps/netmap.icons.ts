// netmap.icons.ts - device icons for the network map, drawn as small SVGs.
// One image per (type, state, theme) is built once and reused, so a state change only
// swaps an image reference.

export const STATE_COLOR: { [s: string]: string } = {
  up: '#16a34a', down: '#dc2626', degraded: '#ea580c', warn: '#d97706', maint: '#2563eb',
  unknown: '#94a3b8', discovered: '#94a3b8', locked: '#9ca3af', cluster: '#475569',
};

const GLYPH: { [t: string]: string } = {
  // router: circle with four arrows
  router: '<circle cx="32" cy="32" r="13" fill="none" stroke="INK" stroke-width="3"/>' +
    '<path d="M32 13v10M32 41v10M13 32h10M41 32h10" stroke="INK" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M28 17l4-4 4 4M28 47l4 4 4-4M17 28l-4 4 4 4M47 28l4 4-4 4" fill="none" stroke="INK" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
  // switch: box with port row and two arrows
  switch: '<rect x="13" y="22" width="38" height="20" rx="3" fill="none" stroke="INK" stroke-width="3"/>' +
    '<path d="M19 36h4M27 36h4M35 36h4M43 36h2" stroke="INK" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M20 28h24M40 25l4 3-4 3" fill="none" stroke="INK" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  // access point: wifi arcs
  ap: '<path d="M18 30a20 20 0 0 1 28 0M22.5 35a13.5 13.5 0 0 1 19 0M27 40a7 7 0 0 1 10 0" fill="none" stroke="INK" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="32" cy="45" r="2.8" fill="INK"/>',
  // CPE / station radio: dish on a pole
  cpe: '<path d="M22 22a14 14 0 0 0 16 18z" fill="none" stroke="INK" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M30 31l9-9M32 41v10M26 51h12" stroke="INK" stroke-width="3" stroke-linecap="round"/>',
  radio: '<path d="M32 22v29M24 51h16M25 22l7-8 7 8" fill="none" stroke="INK" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M20 18a16 16 0 0 0 0 16M44 18a16 16 0 0 1 0 16" fill="none" stroke="INK" stroke-width="2.4" stroke-linecap="round"/>',
  server: '<rect x="19" y="15" width="26" height="12" rx="2" fill="none" stroke="INK" stroke-width="3"/>' +
    '<rect x="19" y="30" width="26" height="12" rx="2" fill="none" stroke="INK" stroke-width="3"/>' +
    '<circle cx="25" cy="21" r="1.8" fill="INK"/><circle cx="25" cy="36" r="1.8" fill="INK"/><path d="M32 45v5M24 50h16" stroke="INK" stroke-width="3" stroke-linecap="round"/>',
  vm: '<rect x="15" y="17" width="34" height="24" rx="3" fill="none" stroke="INK" stroke-width="3"/>' +
    '<path d="M24 47h16M32 41v6" stroke="INK" stroke-width="3" stroke-linecap="round"/><text x="32" y="34" font-size="11" font-family="Arial" font-weight="700" text-anchor="middle" fill="INK">VM</text>',
  unknown: '<path d="M25 25a7 7 0 1 1 10 6c-2 1-3 2.5-3 5v2" fill="none" stroke="INK" stroke-width="3.2" stroke-linecap="round"/>' +
    '<circle cx="32" cy="45" r="2.6" fill="INK"/>',
  locked: '<rect x="21" y="29" width="22" height="17" rx="3" fill="none" stroke="INK" stroke-width="3"/>' +
    '<path d="M25 29v-5a7 7 0 0 1 14 0v5" fill="none" stroke="INK" stroke-width="3"/><circle cx="32" cy="37.5" r="2.4" fill="INK"/>',
  cluster: '<circle cx="24" cy="26" r="7" fill="none" stroke="INK" stroke-width="2.6"/><circle cx="40" cy="26" r="7" fill="none" stroke="INK" stroke-width="2.6"/>' +
    '<circle cx="32" cy="40" r="7" fill="none" stroke="INK" stroke-width="2.6"/><path d="M29 31l-2 3M35 31l2 3M31 26h2" stroke="INK" stroke-width="2.2"/>',
};

const cache = new Map<string, string>();

/**
 * kind: managed | discovered | locked | cluster
 * state: up/down/... for managed devices and clusters
 */
export function nodeIcon(type: string, kind: string, state: string | null, dark: boolean): string {
  const key = type + '|' + kind + '|' + (state || '') + '|' + (dark ? 1 : 0);
  const hit = cache.get(key);
  if (hit) { return hit; }
  const g = GLYPH[kind === 'locked' ? 'locked' : (kind === 'cluster' ? 'cluster' : type)] || GLYPH['unknown'];
  const ring = kind === 'managed' || kind === 'cluster' ? STATE_COLOR[state || 'unknown'] : STATE_COLOR[kind];
  const down = kind === 'managed' && state === 'down';
  const fill = dark ? (down ? '#3b1414' : '#1f2937') : (down ? '#fee2e2' : '#ffffff');
  const ink = dark ? '#e5e7eb' : (kind === 'managed' || kind === 'cluster' ? '#1e293b' : '#64748b');
  const dash = kind === 'discovered' || kind === 'locked' ? ' stroke-dasharray="7 5"' : '';
  const width = kind === 'managed' ? (state === 'up' ? 4 : 5.5) : (kind === 'cluster' ? 5 : 3);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">' +
    '<circle cx="32" cy="32" r="28" fill="' + fill + '" stroke="' + ring + '" stroke-width="' + width + '"' + dash + '/>' +
    g.replace(/INK/g, ink) + '</svg>';
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  cache.set(key, url);
  return url;
}
