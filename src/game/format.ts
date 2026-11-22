const SUFFIX = [
  [1e12, 'T'],
  [1e9, 'B'],
  [1e6, 'M'],
] as const;

function compact(n: number) {
  for (const [v, s] of SUFFIX) if (n >= v) return (n / v).toFixed(n / v >= 100 ? 0 : 2).replace(/\.?0+$/, '') + s;
  return null;
}

/** $1,250 style. Shows cents under $100 so early sales are visible. */
export function money(n: number) {
  const c = compact(n);
  if (c) return '$' + c;
  if (n < 100) return '$' + (Math.floor(n * 100) / 100).toFixed(2);
  return '$' + Math.floor(n).toLocaleString('en-US');
}

export function whole(n: number) {
  const c = compact(n);
  if (c) return c;
  return Math.floor(n).toLocaleString('en-US');
}

/** Wood per chop like 0.8, 2, 12. */
export function small(n: number) {
  if (n >= 100) return whole(n);
  return (Math.round(n * 10) / 10).toString();
}

export function duration(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

/** Always the full dollar amount, like $1,250,000 (for warnings that must be exact). */
export function exactMoney(n: number) {
  return '$' + Math.round(n).toLocaleString('en-US');
}
