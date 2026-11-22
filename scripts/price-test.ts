// npm run price-test: does a higher price really sell slower? Uses the real game rules.
import { newGame, tick, listForSale, GameState, sellOdds } from '../src/game/logic';
import { demandOf, marketPriceOf } from '../src/game/market';
import { ITEMS } from '../src/game/data';

const T0 = new Date(2026, 10, 23, 10).getTime(); // a Monday
const day = new Date(T0).getFullYear() + '-' + (new Date(T0).getMonth() + 1) + '-' + new Date(T0).getDate();
const factors = [0.5, 0.75, 1, 1.5, 2, 3];

function sellPile(p: 'wood' | 'planks', factor: number) {
  const market = marketPriceOf(day, p);
  let s: GameState = { ...newGame(T0), storageLevel: 9, selling: p === 'wood', plankSelling: p === 'planks' };
  s = p === 'wood' ? { ...s, wood: 5000, sellPrice: market * factor } : { ...s, planks: 5000, plankPrice: market * factor };
  const left = () => (p === 'wood' ? s.wood : s.planks);
  let t = 0, money1h = 0, sold1h = 0, done: number | null = null;
  while (t < 7 * 86400) {
    s = tick(s, 5, T0 + t * 1000);
    t += 5;
    if (t === 3600) { money1h = s.money; sold1h = 5000 - left(); }
    if (done === null && left() <= 500) { done = t; break; }
  }
  if (t < 3600) { money1h = s.money; sold1h = 5000 - left(); }
  return { price: market * factor, minutes90: done === null ? null : done / 60, sold1h, money1h, money: s.money };
}

console.log(`Demand that day: wood ${demandOf(day, 'wood').toFixed(2)}, planks ${demandOf(day, 'planks').toFixed(2)}, furniture ${demandOf(day, 'furniture').toFixed(2)}`);
for (const p of ['wood', 'planks'] as const) {
  console.log(`\n${p.toUpperCase()}: pile of 5,000, nothing new coming in`);
  console.log('price      | time to sell 90% | sold in 1st hour | Money in 1st hour | Money total');
  for (const f of factors) {
    const r = sellPile(p, f);
    console.log(`${('$' + r.price.toFixed(3) + ` (${f}x)`).padEnd(16)}| ${(r.minutes90 === null ? '> 7 days' : r.minutes90.toFixed(0) + ' min').padEnd(17)}| ${String(Math.round(r.sold1h)).padEnd(17)}| $${r.money1h.toFixed(0).padEnd(17)}| $${r.money.toFixed(0)}`);
  }
}

console.log('\nFURNITURE: 1,000 Wooden Chairs listed at each price');
console.log('price        | shown chance | sold within 24h | avg time to sell');
const chair = ITEMS.find((i) => i.id === 'chair')!;
let seed = 3;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
for (const f of factors) {
  const price = Math.round(chair.value * f);
  let base: GameState = { ...newGame(T0), dayKey: day, workshop: { ...newGame(T0).workshop, level: 0, inventory: { chair: 1000 } } };
  for (let i = 0; i < 1000; i++) base = listForSale(base, 'chair', price, T0, rand)!;
  const sold = base.workshop.forSale.filter((x) => x.sellAt !== null && x.sellAt <= T0 + 86400_000);
  const avg = sold.reduce((a, x) => a + (x.sellAt! - T0), 0) / Math.max(1, sold.length) / 60000;
  console.log(`$${price} (${f}x)`.padEnd(14) + `| ${Math.round(sellOdds(base, 'chair', price).chance * 100)}%`.padEnd(15) + `| ${(sold.length / 10).toFixed(0)}%`.padEnd(18) + `| ${sold.length ? avg.toFixed(0) + ' min' : '-'}`);
}

console.log('\nRUNNING BUSINESS: 10 Apprentice helpers (20 wood/sec), 10,000 yard, 4 hours');
console.log('price           | Money earned | wood sold | wood wasted (yard full) | yard at end');
for (const f of factors) {
  const market = marketPriceOf(day, 'wood');
  let s: GameState = { ...newGame(T0), helpers: { apprentice: { count: 10, level: 0 } }, money: 1e6, sellPrice: market * f };
  const start = s.money;
  let made = 0;
  for (let t = 0; t < 4 * 3600; t += 5) {
    const before = s.totalWoodChopped;
    s = tick(s, 5, T0 + t * 1000);
    made += s.totalWoodChopped - before;
  }
  const wasted = 20 * 4 * 3600 - made;
  console.log(`$${(market * f).toFixed(3)} (${f}x)`.padEnd(16) + `| $${(s.money - start).toFixed(0).padEnd(12)}| ${String(s.stats.woodSold).padEnd(10)}| ${String(Math.round(wasted)).padEnd(24)}| ${Math.round(s.wood)}`);
}
