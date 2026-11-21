import { newGame, chop, tick, buyAxe, repair, repairCost } from '../src/game/logic';
import { AXES, HELPERS, LAND, WORKSHOPS, MARKET_BASE_PRICE } from '../src/game/data';
let seed = 7; const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
type Step = { label: string; cost: number; axe?: number; wps?: number };
const plan: Step[] = [
  { label: 'Stone Axe', cost: AXES[1].cost, axe: 1 },
  { label: 'Apprentice #1', cost: HELPERS[0].cost, wps: 2 },
  { label: 'Iron Axe', cost: AXES[2].cost, axe: 2 },
  { label: 'Apprentice #2', cost: HELPERS[0].cost, wps: 2 },
  { label: 'Lumberjack Helper', cost: HELPERS[1].cost, wps: 5 },
  { label: 'Small Clearing (land)', cost: LAND[0].cost, wps: 5 },
  { label: 'Steel Axe', cost: AXES[3].cost, axe: 3 },
  { label: 'Backyard Shed (workshop)', cost: WORKSHOPS[0].cost },
];
function run(tps: number) {
  let s = newGame(0); let wps = 0, carry = 0, i = 0; const out: string[] = [];
  for (let t = 0; t < 4 * 3600 && i < plan.length; t += 0.25) {
    const now = t * 1000; carry += tps * 0.25;
    while (carry >= 1) { carry--; s = chop(s, now, rand).state; }
    s = tick({ ...s, wood: s.wood + wps * 0.25 }, 0.25, now);
    if (s.axeDurability < 50 && s.money >= repairCost(s, 100) + plan[i].cost * 0) s = repair(s, 100) ?? s;
    const st = plan[i];
    if (s.money >= st.cost) {
      s = st.axe ? buyAxe(s, st.axe)! : { ...s, money: s.money - st.cost };
      if (st.wps) wps += st.wps; out.push(`${st.label} @${(t / 60).toFixed(1)}m`); i++;
    }
  }
  return out.join(' | ');
}
console.log('price/wood', MARKET_BASE_PRICE);
for (const tps of [1.5, 2, 3]) console.log(tps + ' taps/s: ' + run(tps));
