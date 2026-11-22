// Market rules that only depend on the date and price (section 9). No game state here.
import { MARKET_BASE_PRICE, MARKET_EVENTS, MARKET_EVENT_CHANCE, MARKET_SIZE_MULT, PLANK_BASE_PRICE, Product, SELL_CURVE } from './data';

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

/** Average price other sellers ask today (within 10% of base). */
export function marketPriceOf(dayKey: string, p: 'wood' | 'planks') {
  return BASE_PRICE[p] * (0.9 + hash(`price:${p === 'wood' ? '' : p}${dayKey}`) * 0.2);
}

/** Chance a buyer says yes and typical minutes to sell one item, by price / market price. Before demand. */
export function sellCurve(ratio: number) {
  const r = Math.max(SELL_CURVE[0].r, Math.min(SELL_CURVE[SELL_CURVE.length - 1].r, ratio));
  let i = 0;
  while (i < SELL_CURVE.length - 2 && r > SELL_CURVE[i + 1].r) i++;
  const a = SELL_CURVE[i];
  const b = SELL_CURVE[i + 1];
  const t = (Math.log(r) - Math.log(a.r)) / (Math.log(b.r) - Math.log(a.r));
  return {
    chance: a.chance + (b.chance - a.chance) * t,
    minutes: Math.exp(Math.log(a.min) + (Math.log(b.min) - Math.log(a.min)) * t),
  };
}

const BASE_CHANCE = 0.7; // chance at market price

/**
 * Units sold per second. Two limits, the smaller wins:
 *  - buyers: `buyers` a second at market price, fewer say yes at a higher price
 *  - your pile: a small pile can't serve many buyers (this is why a bigger yard sells faster)
 */
export function commodityRate(dayKey: string, p: 'wood' | 'planks', price: number, stock: number, buyersPerStock: number, buyers: number) {
  if (stock < 1 || price <= 0) return 0;
  const yes = (sellCurve(price / marketPriceOf(dayKey, p)).chance / BASE_CHANCE) * demandOf(dayKey, p);
  return yes * Math.min(buyers, Math.max(1, stock * buyersPerStock));
}

/** Shown sell chance (per buyer) including today's demand. */
export function shownChance(dayKey: string, p: Product, ratio: number) {
  return Math.min(0.99, sellCurve(ratio).chance * demandOf(dayKey, p));
}

/** Seconds to sell `stock` if nothing new comes in. Infinity if it would take more than a week. */
export function timeToSell(dayKey: string, p: 'wood' | 'planks', price: number, stock: number, buyersPerStock: number, buyers: number) {
  let left = stock;
  let t = 0;
  while (left >= 1 && t < 7 * 86400) {
    const r = commodityRate(dayKey, p, price, left, buyersPerStock, buyers);
    if (r <= 0) return Infinity;
    const dt = Math.max(1, (0.05 * left) / r);
    left -= r * dt;
    t += dt;
  }
  return left >= 1 ? Infinity : t;
}

/**
 * Best price tip: the highest price where buyers still take everything you make (so your yard never fills).
 * On a very slow day where even cheap wood can't all sell, it picks the price with the most Money per hour.
 */
export function bestCommodityPrice(dayKey: string, p: 'wood' | 'planks') {
  const m = marketPriceOf(dayKey, p);
  const d = demandOf(dayKey, p);
  const takes = (r: number) => MARKET_SIZE_MULT * d * (sellCurve(r).chance / BASE_CHANCE);
  let best = 0;
  for (let r = 0.3; r <= 3; r += 0.01) if (takes(r) >= 1.02) best = r;
  if (best === 0) {
    let bestV = 0;
    for (let r = 0.3; r <= 3; r += 0.01) {
      const v = r * Math.min(1, takes(r));
      if (v > bestV) [bestV, best] = [v, r];
    }
  }
  return Math.round(m * best * 100) / 100;
}
