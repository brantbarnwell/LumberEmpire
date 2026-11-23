// npm run pacing
// Plays the real game rules with a simple pretend player and prints how long things take.
import {
  newGame, chop, tick, buyAxe, repair, repairCost, hireHelper, hireCost, levelHelper, levelCost, ensureListings,
  makeOffer, startBuild, computeOffline, collectOffline, buyLandUpgrade, landUpgradeCost, GameState,
  buyTool, repairAll, repairAllCost, buyStorage, storageCap, storageUpgradeCost, toolPower, bestPrice, sellAll, hireYardSeller, passiveValuePerSec, passiveWoodPerSec, woodMarketPrice, chopType, tapGoldenLog, goldenLogVisible,
} from '../src/game/logic';
import { canPrestige, prestigeGain } from '../src/game/meta';
import { startAuction, placeBid, minNextBid } from '../src/game/rivals';
import { AXES, HELPERS, LAND, LAND_UPGRADES, WORKSHOPS, PRESTIGE_AT, PACING_TARGETS, TOOLS, WOOD } from '../src/game/data';

// tuning aid: LATE=0.5 scales late helpers/land output (veteran and up, hillside and up) for this run only
if (process.env.NORUSH) (require('../src/game/data') as any).RUSH_BONUS = 0;
if (process.env.LANDK) { const k = Number(process.env.LANDK); LAND.slice(Number(process.env.LANDFROM ?? 5)).forEach((l) => (l.woodPerSec *= k)); }
if (process.env.CREW) { const c = Number(process.env.CREW); LAND.forEach((l, i) => { if (i >= Number(process.env.CREWFROM ?? 0)) l.crew = Math.min(l.crew, c); }); }
if (process.env.COSTK) { const k = Number(process.env.COSTK); HELPERS.slice(3).forEach((h) => (h.cost *= k)); }
if (process.env.LATE) { const k = Number(process.env.LATE); HELPERS.slice(Number(process.env.LATEH ?? 2)).forEach((h) => (h.woodPerSec *= k)); LAND.slice(2).forEach((l) => (l.woodPerSec *= k)); }
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const T0 = new Date(2026, 10, 23 + Number(process.env.START ?? 0), 10, 0, 0).getTime(); // START=days after Monday Nov 23

let lastSell = 0;
function upkeep(s: GameState, now = 0) {
  // section 24: until the Yard Seller is hired, the player taps SELL about every 15 seconds
  if (!s.yardSeller && now - lastSell >= 15_000) { s = sellAll(s, 'wood', now).state; lastSell = now; }
  // an active player taps the Golden Log when it shows up (TAP_LOGS=0 to model an idle player)
  if (process.env.TAP_LOGS !== '0' && goldenLogVisible(s, now)) s = tapGoldenLog(s, now + 2000) ?? s;
  if (!s.yardSeller && process.env.NO_SELLER === undefined && s.money >= 1500 && Object.keys(s.helpers).length > 0 && !(globalThis as any).__planMode) s = hireYardSeller(s) ?? s;
  const bp = process.env.FIXED_PRICE ? s.sellPrice : bestPrice(s.dayKey); // a sensible player follows the best-price tip
  if (Math.abs(s.sellPrice - bp) > 0.001) s = { ...s, sellPrice: bp };
  if (s.axeDurability < 50 && s.money >= repairCost(s, 100)) s = repair(s, 100) ?? s;
  const worn = Object.values(s.tools).some((t) => t.durability < 50);
  if (worn && s.money >= repairAllCost(s)) s = repairAll(s) ?? s;
  const sc = storageUpgradeCost(s);
  if (s.wood > storageCap(s) * 0.85 && sc !== null && s.money >= sc) s = buyStorage(s) ?? s;
  return s;
}

function buyLandAtAsking(s: GameState, id: string, now: number) {
  s = ensureListings(s, now);
  const def = LAND.find((l) => l.id === id)!;
  const L = s.listings[id];
  if (!L || L.status === 'sold' || L.status === 'gone' || s.money < def.asking) return null;
  if (L.saleType === 'auction') {
    // play the auction: bid the minimum when outbid, up to 1.3x asking (time inside the auction is not counted)
    let st = startAuction(s, id, now);
    if (!st) return null;
    let t = now;
    while (st.auction && t < now + 600_000) {
      t += 1000;
      st = tick(st, 1, t);
      if (st.auction && st.auction.leader !== 'you') {
        const bid = minNextBid(st.auction);
        if (bid <= Math.min(st.money, def.asking * 1.3)) st = placeBid(st, bid, t).state;
      }
    }
    return st.lands[id] ? st : ({ ...st, __lostAuction: true } as GameState);
  }
  const offer = Math.max(def.asking, (L.rivalOffer?.amount ?? 0) * 1.05);
  if (s.money < offer) return null;
  const r = makeOffer(s, id, offer, now);
  if (r.outcome.kind === 'accepted') return r.state;
  const c = r.state.listings[id]?.counter;
  if (r.outcome.kind === 'countered' && c && r.state.money >= c) {
    return { ...r.state, money: r.state.money - c, lands: { ...r.state.lands, [id]: { upgrades: [], paid: c } } } as GameState;
  }
  return null;
}

// ---------- 1. first hours, fixed buying order (same style as Part 1) ----------
type Step = { label: string; key: string; buy: (s: GameState, now: number) => GameState | null; cost: (s: GameState) => number };
const axe = (i: number): Step => ({ label: AXES[i].name, key: 'axe', buy: (s) => buyAxe(s, i), cost: () => AXES[i].cost });
const helper = (id: string): Step => ({ label: HELPERS.find((h) => h.id === id)!.name, key: 'helper', buy: (s) => hireHelper(s, id), cost: (s) => hireCost(s, id) });
const plan: Step[] = [
  axe(1), helper('apprentice'), axe(2), helper('apprentice'), helper('lumberjack'), helper('apprentice'), axe(3),
  { label: 'Small Clearing (land)', key: 'land', buy: (s, now) => buyLandAtAsking(s, 'clearing', now), cost: () => LAND[0].asking },
  { label: 'Backyard Shed (workshop)', key: 'workshop', buy: (s, now) => startBuild(s, now), cost: () => WORKSHOPS[0].cost },
];

function early(tps: number, t0 = T0) {
  (globalThis as any).__planMode = true;
  lastSell = 0;
  let s = newGame(t0);
  let carry = 0;
  let i = 0;
  const firsts: Record<string, number> = {};
  const out: string[] = [];
  for (let t = 0; t < 4 * 3600 && i < plan.length; t += 0.25) {
    const now = t0 + t * 1000;
    carry += tps * 0.25;
    while (carry >= 1) { carry--; s = chop(s, now, rand).state; }
    s = upkeep(tick(s, 0.25, now), now);
    const st = plan[i];
    if (s.money >= st.cost(s)) {
      const n = st.buy(s, now);
      if (n) {
        s = n;
        let m = t / 60;
        if (st.key === 'workshop') m += WORKSHOPS[0].buildMinutes;
        if (firsts[st.key] === undefined) firsts[st.key] = m;
        out.push(`${st.label} ${m.toFixed(0)}m`);
        i++;
      }
    }
  }
  return { firsts, out };
}

console.log('=== Early game (fixed buying order, steady tapping) ===');
console.log(`Targets: first axe ${PACING_TARGETS.firstAxeMinutes}m, helper ${PACING_TARGETS.firstHelperMinutes}m, land ${PACING_TARGETS.firstLandMinutes}m, workshop ${PACING_TARGETS.firstWorkshopMinutes}m (shed counts when built)`);
for (const tps of [1.5, 2, 3]) {
  const r = early(tps);
  console.log(`${tps} taps/sec: axe ${r.firsts.axe?.toFixed(0)}m | helper ${r.firsts.helper?.toFixed(0)}m | land ${r.firsts.land?.toFixed(0)}m | workshop ${r.firsts.workshop?.toFixed(0)}m`);
  console.log('   ' + r.out.join(' > '));
}

// same, 2 taps/sec, starting on each day of a week (demand changes every day)
{
  const keys = ['axe', 'helper', 'land', 'workshop'];
  const runs = Array.from({ length: 7 }, (_, i) => early(2, new Date(2026, 10, 23 + i, 10).getTime()).firsts);
  const med = (k: string) => { const v = runs.map((r) => r[k]).sort((a, b) => a - b); return `${v[3].toFixed(0)}m (${v[0].toFixed(0)}-${v[6].toFixed(0)})`; };
  console.log('2 taps/sec, 7 different start days, typical (range): ' + keys.map((k) => `${k} ${med(k)}`).join(' | '));
}

(globalThis as any).__planMode = false;
lastSell = 0;
// ---------- 2. a few days of normal play, smart buying ----------
// 4 sessions a day of 30 minutes at 1 tap/sec, offline in between (50% rate, 8h cap).
function bestBuy(s: GameState, now: number): { cost: number; buy: () => GameState | null } | null {
  // update 4: every gain is measured in Money per second, so better tree types are valued by their price
  const opts: { cost: number; gain: number; buy: () => GameState | null }[] = [];
  const v0 = passiveValuePerSec(s, now);
  const dv = (x: GameState | null) => (x ? passiveValuePerSec(x, now) - v0 : 0);
  const pine = 0.1;
  const nextAxe = AXES[s.axeIndex + 1];
  if (nextAxe) opts.push({ cost: nextAxe.cost, gain: (nextAxe.power - AXES[s.axeIndex].power) * 1.6 * 0.8 * woodMarketPrice(s.dayKey, chopType(s)) * Math.pow(WOOD[chopType(s)].price / pine, 0.3) / (WOOD[chopType(s)].price / pine), buy: () => buyAxe(s, s.axeIndex + 1) });
  for (const h of HELPERS) {
    opts.push({ cost: hireCost(s, h.id), gain: dv(hireHelper({ ...s, money: 1e18 }, h.id)), buy: () => hireHelper(s, h.id) });
    const lc = levelCost(s, h.id);
    if (lc !== null && (s.helpers[h.id]?.count ?? 0) > 0) opts.push({ cost: lc, gain: dv(levelHelper({ ...s, money: 1e18 }, h.id)), buy: () => levelHelper(s, h.id) });
  }
  for (const l of LAND) {
    if (!s.lands[l.id]) {
      const L = ensureListings(s, now).listings[l.id];
      const open = L && (L.status === 'open' || L.status === 'counter');
      if (open) opts.push({ cost: l.asking * (L.saleType === 'auction' ? 1.15 : 1), gain: dv({ ...s, lands: { ...s.lands, [l.id]: { upgrades: [], paid: 0 } } }), buy: () => buyLandAtAsking(s, l.id, now) });
    }
    else for (const u of LAND_UPGRADES) if (!s.lands[l.id].upgrades.includes(u.id)) opts.push({ cost: landUpgradeCost(l.id, u.id), gain: dv(buyLandUpgrade({ ...s, money: 1e18 }, l.id, u.id)), buy: () => buyLandUpgrade(s, l.id, u.id) });
  }
  const helperWps = HELPERS.reduce((a, h) => a + h.woodPerSec * (s.helpers[h.id]?.count ?? 0) * (1 + 0.25 * (s.helpers[h.id]?.level ?? 0)), 0);
  const nHelpers = Object.values(s.helpers).reduce((a, h) => a + h.count, 0);
  const avg = v0 > 0 ? v0 / Math.max(1e-9, passiveWoodPerSec(s, now)) : pine;
  for (const t of TOOLS) {
    if (s.tools[t.id]) continue;
    const gain = ((t.chopFlat ?? 0) * 0.15 + (t.chopPct ?? 0) * 0.2 + (t.helperPct ?? 0) * helperWps
      + (t.needsHelpers && !nHelpers ? 0 : t.passiveFlat ?? 0) + (t.woodSalePct ?? 0) * helperWps + (t.plankSalePct ? 0.01 : 0)) * avg;
    if (gain > 0) opts.push({ cost: t.cost, gain, buy: () => buyTool(s, t.id) });
  }
  // a full yard means more output is wasted: storage first
  const sc = storageUpgradeCost(s);
  if (s.wood > storageCap(s) * 0.85 && sc !== null) return { cost: sc, buy: () => buyStorage(s) };
  opts.sort((a, b) => a.cost / Math.max(1e-12, a.gain) - b.cost / Math.max(1e-12, b.gain));
  return opts[0] ?? null;
}

function days(nDays: number) {
  let s = newGame(T0);
  if (process.env.PERM) s = { ...s, owned: { ...s.owned, products: process.env.PERM.split(",").map((x: string) => `com.lumberempire.${x}`) } }; // PERM=prod2x or starter: paid upgrades
  let now = T0;
  let prestigeAt = null as number | null;
  let gainAt = 0;
  const sessionStarts = [8, 12, 17, 21]; // hours
  const log: string[] = [];
  const marks = [5e6, 1e7, 2.5e7, 5e7, 1e8, 2.5e8];
  const hits: string[] = [];
  for (let d = 0; d < nDays; d++) {
    for (const h of sessionStarts) {
      const start = T0 + d * 86400_000 + (h - 10) * 3600_000;
      if (start > now) {
        s = { ...s, lastSaved: now };
        const off = computeOffline(s, start);
        s = off.result ? collectOffline(off.state, off.result, 1) : off.state;
        if (process.env.TRACE && d < 2) console.log(`  offline to ${h}h: +$${Math.round(off.result?.earned ?? 0)} sold ${Math.round(off.result?.sold ?? 0)} made ${Math.round(off.result?.produced ?? 0)} wood=${Math.round(s.wood)} price=${s.sellPrice} buyers=${s.buyers.wood.toFixed(1)} owed=${Math.round(s.wagesOwed)}`);
        now = start;
      }
      for (let t = 0; t < 1800; t += 1) {
        now += 1000;
        s = chop(s, now, rand).state;
        s = upkeep(tick(s, 1, now), now);
        for (let k = 0; k < 5; k++) {
          const b = bestBuy(s, now);
          if (!b || s.money < b.cost) break;
          const n = b.buy();
          if (!n) break;
          s = n;
        }
        if (prestigeAt === null && canPrestige(s)) { prestigeAt = (now - T0) / 86400_000; gainAt = prestigeGain(s); }
        if (process.env.TRACE && d < 2 && t === 1799) console.log(`  session ${h}h end: earned ${Math.round(s.runMoneyEarned)} money ${Math.round(s.money)} wood=${Math.round(s.wood)} helpers=${Object.values(s.helpers).reduce((a, x) => a + x.count, 0)} price=${s.sellPrice} rate=${(require('../src/game/logic').salesPerSec(s)).toFixed(2)} buyers=${s.buyers.wood.toFixed(1)}`);
        while (marks.length && s.runMoneyEarned >= marks[0]) hits.push(`$${marks.shift()! / 1e6}M after ${((now - T0) / 86400_000).toFixed(1)} days`);
      }
    }
    if (process.env.DEBUG) { const b = bestBuy(s, now); const L = require('../src/game/logic'); const noLand = { ...s, lands: {} }; console.log(`  d${d + 1} value/s ${Math.round(L.passiveValuePerSec(s, now))} (no land ${Math.round(L.passiveValuePerSec(noLand, now))}) chop$ ${(L.woodPerChop(s, now) * L.woodMarketPrice(s.dayKey, L.chopType(s))).toFixed(1)} prestige ${s.prestige.mult} boosts ${JSON.stringify(s.boosts)} money ${Math.round(s.money)} wps ${Math.round(require('../src/game/logic').passiveWoodPerSec(s, now))} helpers ${JSON.stringify(s.helpers)} lands ${Object.keys(s.lands)} tools ${Object.keys(s.tools)} next ${b?.cost}`); }
    log.push(`day ${d + 1}: earned ${Math.round(s.runMoneyEarned).toLocaleString()} this run, ${Object.values(s.helpers).reduce((a, h) => a + h.count, 0)} helpers, ${Object.keys(s.lands).length} lands, ${Object.keys(s.tools).length} tools, storage ${storageCap(s).toLocaleString()}`);
  }
  return { prestigeAt, gain: gainAt, log, hits };
}

console.log('\n=== Prestige (4 sessions x 30 min a day, offline between) ===');
const r = days(process.env.TRACE ? 2 : 6);
r.log.forEach((l) => console.log(l));
console.log('Money earned this run: ' + r.hits.join(' | '));
console.log(`Prestige needs $${PRESTIGE_AT.toLocaleString()} earned. Reached after ${r.prestigeAt ? r.prestigeAt.toFixed(2) + ' days' : 'more than 6 days'}. Run 2 speed if taken then: ${(1 + r.gain).toFixed(1)}x`);
