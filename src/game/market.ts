// Market rules that only depend on the date and price (section 9). No game state here.
import { MARKET_BASE_PRICE, MARKET_EVENTS, MARKET_EVENT_CHANCE, PLANK_BASE_PRICE, Product } from './data';

/** Turns a text (like a date) into a steady random number from 0 to 1. */
export function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  // final mix so texts that differ only at the end (like dates) give very different numbers
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

export const BASE_PRICE: Record<'wood' | 'planks', number> = { wood: MARKET_BASE_PRICE, planks: PLANK_BASE_PRICE };

/** Today's news event, or null. */
export function marketEvent(dayKey: string) {
  if (hash('event:' + dayKey) > MARKET_EVENT_CHANCE) return null;
  return MARKET_EVENTS[Math.floor(hash('which:' + dayKey) * MARKET_EVENTS.length)];
}

/** Season: wood sells a bit better in winter, furniture in spring. */
export function seasonMult(dayKey: string, p: Product) {
  const month = Number(dayKey.split('-')[1]); // 1..12
  const winter = month === 12 || month <= 2;
  const spring = month >= 3 && month <= 5;
  if (p === 'wood' && winter) return 1.1;
  if (p === 'furniture' && spring) return 1.1;
  return 1;
}

/** Demand for a product today (0.3 to 2.5, normal is about 1). */
export function demandOf(dayKey: string, p: Product) {
  const base = 0.85 + hash(`demand:${p === 'wood' ? '' : p}${dayKey}`) * 0.35; // 0.85 to 1.2 before news and season. BALANCE
  const ev = marketEvent(dayKey) as { demand: Partial<Record<Product, number>> } | null;
  const e = ev?.demand[p] ?? 1;
  return Math.max(0.3, Math.min(2.5, base * e * seasonMult(dayKey, p)));
}

export function demandLabel(d: number) {
  if (d < 0.85) return 'Low';
  if (d < 1.05) return 'Normal';
  if (d < 1.25) return 'High';
  return 'Very High';
}

export type Weather = { id: 'sunny' | 'rain' | 'snow' | 'storm'; icon: string; mult: number };
/** Today's weather. Storms and snow make wood dearer (people rebuild and heat their homes). */
export function weatherOf(dayKey: string): Weather {
  const month = Number(dayKey.split('-')[1]);
  const winter = month === 12 || month <= 2;
  const r = hash('weather:' + dayKey);
  if (r < 0.1) return { id: 'storm', icon: '⛈️', mult: 1.12 };
  if (r < 0.35) return winter ? { id: 'snow', icon: '❄️', mult: 1.06 } : { id: 'rain', icon: '🌧️', mult: 0.96 };
  return { id: 'sunny', icon: '☀️', mult: 1 };
}

/**
 * Update 2: one market price set by the game. Base $0.10 for wood, moved by demand
 * (which includes news events and season), weather and a small daily wobble.
 */
export function marketPriceOf(dayKey: string, p: 'wood' | 'planks') {
  const wobble = 0.92 + hash(`price:${p === 'wood' ? '' : p}${dayKey}`) * 0.16;
  return BASE_PRICE[p] * wobble * demandOf(dayKey, p) * weatherOf(dayKey).mult;
}

/** What one crafted item sells for today. */
export function itemPriceOf(dayKey: string, value: number) {
  return value * demandOf(dayKey, 'furniture') * weatherOf(dayKey).mult;
}

export function yesterdayOf(dayKey: string) {
  const [y, m, d] = dayKey.split('-').map(Number);
  const t = new Date(y, m - 1, d - 1);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

/** +1 up, -1 down, 0 about the same as yesterday. */
export function priceTrend(dayKey: string, p: 'wood' | 'planks' | 'furniture') {
  const today = p === 'furniture' ? itemPriceOf(dayKey, 1) : marketPriceOf(dayKey, p);
  const before = p === 'furniture' ? itemPriceOf(yesterdayOf(dayKey), 1) : marketPriceOf(yesterdayOf(dayKey), p);
  const r = today / before;
  return r > 1.01 ? 1 : r < 0.99 ? -1 : 0;
}
