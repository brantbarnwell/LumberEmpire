// npm run manager-test: does the yard still fill up when the manager is on? Uses the real game rules.
import { newGame, tick, GameState, storageCap, storageUsed, bestPrice } from '../src/game/logic';
import { demandOf, marketPriceOf } from '../src/game/market';

const T0 = new Date(2026, 11, 2, 10).getTime();
const day = `2026-12-2`;

function run(name: string, setup: (s: GameState) => GameState, managerOn: boolean) {
  let s: GameState = setup({ ...newGame(T0), money: 1e6 });
  s = { ...s, manager: { ...s.manager, hired: managerOn, on: managerOn } };
  const start = s.money;
  let made = 0, maxPct = 0, fullSecs = 0, mgrSold = 0;
  for (let t = 0; t < 4 * 3600; t += 5) {
    const before = s.totalWoodChopped;
    const ms = s.manager.soldTotal;
    s = tick(s, 5, T0 + t * 1000);
    const added = s.totalWoodChopped - before;
    made += added;
    mgrSold += s.manager.soldTotal - ms;
    const helperWps = s.helpers.apprentice ? s.helpers.apprentice.count * 2 : 0;
    const full = added < helperWps * 5 - 0.01; // some wood did not fit
    const pct = full ? 1 : storageUsed(s) / storageCap(s);
    maxPct = Math.max(maxPct, pct);
    if (full) fullSecs += 5;
  }
  const helperWps = s.helpers.apprentice ? s.helpers.apprentice.count * 2 : 0;
  const wasted = Math.max(0, helperWps * 4 * 3600 - made);
  return `${(managerOn ? 'ON ' : 'off')}  | yard max ${String(Math.round(maxPct * 100)).padStart(3)}% | end ${String(Math.round((storageUsed(s) / storageCap(s)) * 100)).padStart(3)}% | full for ${(fullSecs / 3600).toFixed(1)}h | wasted ${String(Math.round(wasted)).padStart(7)} | manager sold ${String(mgrSold).padStart(7)} | Money +$${Math.round(s.money - start)}`;
}

const market = marketPriceOf(day, 'wood');
console.log(`Day demand ${demandOf(day, 'wood').toFixed(2)}, market price $${market.toFixed(3)}, best-price tip $${bestPrice(day)}. 10,000 yard, 4 hours, helpers working.\n`);
const helpers = (n: number) => (s: GameState): GameState => ({ ...s, helpers: { apprentice: { count: n, level: 0 } } });
const scenarios: [string, (s: GameState) => GameState][] = [
  ['1. Normal: 10 helpers (20 wood/sec), best-price tip', (s) => ({ ...helpers(10)(s), sellPrice: bestPrice(day) })],
  ['2. Price too high: 10 helpers, 2x market price', (s) => ({ ...helpers(10)(s), sellPrice: market * 2 })],
  ['3. Selling paused (switch off), 10 helpers', (s) => ({ ...helpers(10)(s), selling: false })],
  ['4. Way too much wood: 200 helpers (400 wood/sec), best price', (s) => ({ ...helpers(200)(s), sellPrice: bestPrice(day) })],
  ['5. Way too much wood, but storage upgraded to 150,000', (s) => ({ ...helpers(200)(s), sellPrice: bestPrice(day), storageLevel: 3 })],
];
for (const [name, setup] of scenarios) {
  console.log(name);
  console.log('  ' + run(name, setup, false));
  console.log('  ' + run(name, setup, true));
}
