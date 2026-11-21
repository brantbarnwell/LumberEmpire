// Pure game rules. No React here, so it can be tested and simulated.
import {
  AXES, CHOPS_PER_TREE, CRIT_CHANCE, CRIT_MULT, FELL_BONUS_CHOPS, GOLDEN_GOLD_MAX, GOLDEN_GOLD_MIN,
  GOLDEN_MONEY_PER_POWER, GOLDEN_TREE_CHANCE, GOLDEN_TREE_SECONDS, MARKET_BASE_PRICE, OFFLINE_MAX_HOURS,
  PRICE_SENSITIVITY, BUYERS_PER_WOOD_IN_STOCK, RANKS, VIP_DAILY_GOLD, VIP_MONEY_MULT, Grant, productById,
} from './data';

export interface Boost {
  kind: 'wood' | 'money';
  mult: number;
  until: number; // ms timestamp
}

export interface GameState {
  version: 1;
  money: number;
  gold: number;
  wood: number; // can be fractional inside, shown rounded down
  sellCarry: number;
  totalWoodChopped: number;
  totalMoneyEarned: number;
  totalChops: number;

  axeIndex: number;
  axeDurability: number; // 0..100
  chopsSinceWear: number;

  treeChops: number;
  treeGoldenUntil: number | null; // when set, the current tree is a Golden Tree
  treesFelled: number;
  goldenTreesFound: number;

  sellPrice: number;
  selling: boolean;
  dayKey: string;
  soldToday: number;
  moneyToday: number;

  boosts: Boost[];
  vipActive: boolean;
  vipLastClaimDay: string | null;

  owned: {
    products: string[]; // one-time packs already granted
    skins: string[];
    exclusiveAxes: string[];
    noAds: boolean;
    pendingHelpers: number; // from packs, handed out when Helpers are built
    pendingBuildings: string[];
    pendingLand: string[];
  };
  processedTx: string[];
  lastSaved: number;
}

export function dayKeyOf(now: number) {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function newGame(now = Date.now()): GameState {
  return {
    version: 1,
    money: 0,
    gold: 0,
    wood: 0,
    sellCarry: 0,
    totalWoodChopped: 0,
    totalMoneyEarned: 0,
    totalChops: 0,
    axeIndex: 0,
    axeDurability: 100,
    chopsSinceWear: 0,
    treeChops: 0,
    treeGoldenUntil: null,
    treesFelled: 0,
    goldenTreesFound: 0,
    sellPrice: MARKET_BASE_PRICE,
    selling: true,
    dayKey: dayKeyOf(now),
    soldToday: 0,
    moneyToday: 0,
    boosts: [],
    vipActive: false,
    vipLastClaimDay: null,
    owned: { products: [], skins: [], exclusiveAxes: [], noAds: false, pendingHelpers: 0, pendingBuildings: [], pendingLand: [] },
    processedTx: [],
    lastSaved: now,
  };
}

// ---------- multipliers ----------

export function boostMult(s: GameState, kind: Boost['kind'], now: number) {
  let m = 1;
  for (const b of s.boosts) if (b.kind === kind && b.until > now) m = Math.max(m, b.mult);
  return m;
}

export function moneyMult(s: GameState, now: number) {
  return boostMult(s, 'money', now) * (s.vipActive ? VIP_MONEY_MULT : 1);
}

/** Spec: above 50% full power, 26-50% = 75%, 1-25% = 50%, 0% = broken. */
export function durabilityPower(d: number) {
  if (d <= 0) return 0;
  if (d <= 25) return 0.5;
  if (d <= 50) return 0.75;
  return 1;
}

export function durabilityColor(d: number) {
  if (d >= 50) return '#4caf50';
  if (d >= 25) return '#f2c230';
  return '#e5483b';
}

export function woodPerChop(s: GameState, now: number) {
  const axe = AXES[s.axeIndex];
  const p = durabilityPower(s.axeDurability);
  // A broken axe gives no bonus: you are back to the Rusty Axe's bare-hands power.
  const base = p === 0 ? AXES[0].power : axe.power * p;
  return base * boostMult(s, 'wood', now);
}

// ---------- chopping ----------

export interface ChopResult {
  wood: number;
  crit: boolean;
  felled: boolean;
  fellBonus: number;
  golden: { gold: number; money: number } | null;
  newGoldenTree: boolean;
  axeBroke: boolean;
  axeLow: boolean; // just dropped to 25%
}

export function chop(s: GameState, now: number, rand: () => number = Math.random): { state: GameState; result: ChopResult } {
  const axe = AXES[s.axeIndex];
  const crit = rand() < CRIT_CHANCE;
  const per = woodPerChop(s, now);
  let wood = per * (crit ? CRIT_MULT : 1);

  // durability
  let dur = s.axeDurability;
  let since = s.chopsSinceWear + 1;
  let axeBroke = false;
  let axeLow = false;
  if (dur > 0 && since >= axe.wearEvery) {
    since = 0;
    dur = Math.max(0, dur - 1);
    if (dur === 0) axeBroke = true;
    if (dur === 25) axeLow = true;
  }

  // the tree
  let treeChops = s.treeChops + 1;
  let felled = false;
  let fellBonus = 0;
  let golden: ChopResult['golden'] = null;
  let treeGoldenUntil = s.treeGoldenUntil;
  let gold = s.gold;
  let money = s.money;
  let totalMoneyEarned = s.totalMoneyEarned;
  let goldenTreesFound = s.goldenTreesFound;
  let newGoldenTree = false;

  if (treeChops >= CHOPS_PER_TREE) {
    felled = true;
    treeChops = 0;
    fellBonus = per * FELL_BONUS_CHOPS;
    if (treeGoldenUntil && treeGoldenUntil > now) {
      const g = GOLDEN_GOLD_MIN + Math.floor(rand() * (GOLDEN_GOLD_MAX - GOLDEN_GOLD_MIN + 1));
      const m = Math.max(GOLDEN_MONEY_PER_POWER, GOLDEN_MONEY_PER_POWER * axe.power);
      golden = { gold: g, money: m };
      gold += g;
      money += m;
      totalMoneyEarned += m;
      goldenTreesFound += 1;
      fellBonus *= 3; // golden wood bonus
    }
    treeGoldenUntil = null;
    if (rand() < GOLDEN_TREE_CHANCE) {
      treeGoldenUntil = now + GOLDEN_TREE_SECONDS * 1000;
      newGoldenTree = true;
    }
  }

  const gained = wood + fellBonus;
  return {
    state: {
      ...s,
      wood: s.wood + gained,
      totalWoodChopped: s.totalWoodChopped + gained,
      totalChops: s.totalChops + 1,
      axeDurability: dur,
      chopsSinceWear: since,
      treeChops,
      treeGoldenUntil,
      treesFelled: s.treesFelled + (felled ? 1 : 0),
      gold,
      money,
      totalMoneyEarned,
      goldenTreesFound,
    },
    result: { wood, crit, felled, fellBonus, golden, newGoldenTree, axeBroke, axeLow },
  };
}

/** Dev builds only: make the current tree golden so it can be tested. */
export function devSpawnGolden(s: GameState, now: number): GameState {
  return { ...s, treeGoldenUntil: now + GOLDEN_TREE_SECONDS * 1000 };
}

// ---------- market ----------

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

/** Demand for the day, 0.7 to 1.4. Same for the whole day. */
export function demandFor(dayKey: string) {
  return 0.7 + hash('demand:' + dayKey) * 0.7;
}

export function demandLabel(d: number) {
  if (d < 0.85) return 'Low';
  if (d < 1.05) return 'Normal';
  if (d < 1.25) return 'High';
  return 'Very High';
}

/** Average competitor price for the day, within +/-10% of market base. */
export function marketPriceFor(dayKey: string) {
  return MARKET_BASE_PRICE * (0.9 + hash('price:' + dayKey) * 0.2);
}

export function salesPerSec(s: GameState, price = s.sellPrice, wood = s.wood) {
  if (!s.selling || wood < 1) return 0;
  const market = marketPriceFor(s.dayKey);
  const r = price / market;
  const priceFactor = Math.exp(-PRICE_SENSITIVITY * (r - 1));
  return demandFor(s.dayKey) * priceFactor * Math.max(1, wood * BUYERS_PER_WOOD_IN_STOCK);
}

/** Price with the best profit per hour (spec: "Best Price hint"). */
export function bestPrice(dayKey: string) {
  return marketPriceFor(dayKey) / PRICE_SENSITIVITY;
}

export function tick(s: GameState, dtSec: number, now: number): GameState {
  let next = s;
  const dk = dayKeyOf(now);
  if (dk !== s.dayKey) next = { ...next, dayKey: dk, soldToday: 0, moneyToday: 0 };
  if (next.treeGoldenUntil && next.treeGoldenUntil <= now) next = { ...next, treeGoldenUntil: null };
  if (next.boosts.some((b) => b.until <= now)) next = { ...next, boosts: next.boosts.filter((b) => b.until > now) };

  const rate = salesPerSec(next);
  if (rate > 0) {
    const units = rate * dtSec + next.sellCarry;
    const whole = Math.floor(units);
    const sold = Math.min(whole, Math.floor(next.wood));
    const carry = sold < whole ? 0 : units - whole;
    if (sold > 0 || carry !== next.sellCarry) {
      const earned = sold * next.sellPrice * moneyMult(next, now);
      next = {
        ...next,
        wood: next.wood - sold,
        sellCarry: carry,
        money: next.money + earned,
        totalMoneyEarned: next.totalMoneyEarned + earned,
        soldToday: next.soldToday + sold,
        moneyToday: next.moneyToday + earned,
      };
    }
  }
  return next;
}

/** Runs the market for the time the player was away. */
export function applyOffline(s: GameState, now: number) {
  const away = Math.min((now - s.lastSaved) / 1000, OFFLINE_MAX_HOURS * 3600);
  if (away < 30) return { state: s, away: 0, sold: 0, earned: 0 };
  const before = s;
  let st = s;
  const step = 10;
  for (let t = 0; t < away; t += step) st = tick(st, Math.min(step, away - t), s.lastSaved + t * 1000);
  st = tick(st, 0, now);
  const earned = st.totalMoneyEarned - before.totalMoneyEarned;
  return { state: st, away, sold: Math.round(before.wood - st.wood), earned };
}

// ---------- upgrades ----------

export function buyAxe(s: GameState, index: number): GameState | null {
  const axe = AXES[index];
  if (!axe || index <= s.axeIndex || s.money < axe.cost) return null;
  return { ...s, money: s.money - axe.cost, axeIndex: index, axeDurability: 100, chopsSinceWear: 0 };
}

/** Cost to repair the current axe up to `to`%. Repairs use Money only. */
export function repairCost(s: GameState, to: number) {
  const missing = Math.max(0, to - s.axeDurability);
  if (missing === 0) return 0;
  return Math.max(1, Math.ceil((AXES[s.axeIndex].repairCost * missing) / 100));
}

export function repair(s: GameState, to: number): GameState | null {
  const cost = repairCost(s, to);
  if (cost === 0 || s.money < cost) return null;
  return { ...s, money: s.money - cost, axeDurability: to, chopsSinceWear: 0 };
}

// ---------- ranks ----------

export function rankInfo(totalMoney: number) {
  let i = 0;
  while (i + 1 < RANKS.length && totalMoney >= RANKS[i + 1].at) i++;
  const cur = RANKS[i];
  const next = RANKS[i + 1];
  const progress = next ? (totalMoney - cur.at) / (next.at - cur.at) : 1;
  return { index: i, name: cur.name, next: next?.name ?? null, nextAt: next?.at ?? null, progress: Math.min(1, progress) };
}

// ---------- store purchases ----------

function addBoost(boosts: Boost[], kind: Boost['kind'], mult: number, hours: number, now: number): Boost[] {
  return [...boosts, { kind, mult, until: now + hours * 3600_000 }];
}

export function applyGrant(s: GameState, g: Grant, now: number): GameState {
  let st = { ...s, owned: { ...s.owned } };
  if (g.gold) st.gold += g.gold;
  if (g.skins) st.owned.skins = [...new Set([...st.owned.skins, ...g.skins])];
  if (g.exclusiveAxes) st.owned.exclusiveAxes = [...new Set([...st.owned.exclusiveAxes, ...g.exclusiveAxes])];
  if (g.axeId) {
    const idx = AXES.findIndex((a) => a.id === g.axeId);
    if (idx > st.axeIndex) st = { ...st, axeIndex: idx, axeDurability: 100, chopsSinceWear: 0 };
  }
  if (g.woodBoost) st.boosts = addBoost(st.boosts, 'wood', g.woodBoost.mult, g.woodBoost.hours, now);
  if (g.moneyBoost) st.boosts = addBoost(st.boosts, 'money', g.moneyBoost.mult, g.moneyBoost.hours, now);
  if (g.helpers) st.owned.pendingHelpers += g.helpers;
  if (g.buildings) st.owned.pendingBuildings = [...new Set([...st.owned.pendingBuildings, ...g.buildings])];
  if (g.land) st.owned.pendingLand = [...new Set([...st.owned.pendingLand, ...g.land])];
  if (g.noAds) st.owned.noAds = true;
  return st;
}

/** Gives the player what they paid for. Each Apple transaction is only granted once. */
export function grantProduct(s: GameState, productId: string, txId: string, now: number): GameState | null {
  const p = productById(productId);
  if (!p || s.processedTx.includes(txId)) return null;
  if (p.kind === 'pack' && s.owned.products.includes(productId)) {
    return { ...s, processedTx: [...s.processedTx, txId] };
  }
  let st = applyGrant(s, p.grant, now);
  st = { ...st, processedTx: [...st.processedTx, txId].slice(-500) };
  if (p.kind === 'pack') st.owned = { ...st.owned, products: [...st.owned.products, productId] };
  return st;
}

export function canClaimVip(s: GameState, now: number) {
  return s.vipActive && s.vipLastClaimDay !== dayKeyOf(now);
}

export function claimVip(s: GameState, now: number): GameState | null {
  if (!canClaimVip(s, now)) return null;
  return { ...s, gold: s.gold + VIP_DAILY_GOLD, vipLastClaimDay: dayKeyOf(now) };
}
