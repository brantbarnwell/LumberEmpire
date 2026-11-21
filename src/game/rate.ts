// Tracks wood gained in the last few seconds for the "wood per second" display.
const WINDOW_MS = 5000;
let events: { t: number; n: number }[] = [];

export function recordWood(n: number, now = Date.now()) {
  events.push({ t: now, n });
  if (events.length > 400) events = events.slice(-200);
}

export function recentWoodPerSec(now = Date.now()) {
  events = events.filter((e) => now - e.t < WINDOW_MS);
  return events.reduce((a, e) => a + e.n, 0) / (WINDOW_MS / 1000);
}
