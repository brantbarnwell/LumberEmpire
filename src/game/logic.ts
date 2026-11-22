// Pure game rules. No React here, so it can be tested and simulated (npm test, npm run pacing).
import {
  AXES, CHOPS_PER_TREE, CRIT_CHANCE, CRIT_MULT, FELL_BONUS_CHOPS, GOLDEN_GOLD_MAX, GOLDEN_GOLD_MIN,
  GOLDEN_MONEY_PER_POWER, GOLDEN_TREE_CHANCE, GOLDEN_TREE_SECONDS, MARKET_BASE_PRICE, OFFLINE_MAX_HOURS, OFFLINE_RATE,
  PRICE_SENSITIVITY, BUYERS_PER_WOOD_IN_STOCK, RANKS, VIP_DAILY_GOLD, VIP_MONEY_MULT, Grant, productById,
  HELPERS, HELPER_COPY_SCALE, HELPER_LEVEL_BONUS, HELPER_LEVEL_COST_BASE, HELPER_LEVEL_COST_GROWTH, HELPER_MAX_LEVEL,
  LAND, LAND_UPGRADES, PERSONALITY, Personality, SELLER_NAMES, SELLER_WALKAWAY_HOURS, MAX_REJECTIONS,
  WORKSHOPS, ITEMS, GOLD_PER_MINUTE_SKIP, WoodType, HOME_WOOD, RUSH_DAYS, RUSH_BONUS, Metric, PRODUCTS,
  TOOLS, HELPER_WAGES, WAGE_LEVEL_GROWTH, UNPAID_HELPER_SPEED, STORAGE_LEVELS, AXE_SKINS,
  PLANK_BASE_PRICE, PLANK_WOOD, PLANK_CUT_PER_SEC, MARKET_SIZE_MULT, MIN_BUYERS_PER_SEC, Product,
  MANAGER_COST, MANAGER_SELL_AT, MANAGER_EXTRA_BUYERS, BULK_BUYERS, BULK_ORDERS_PER_DAY, BULK_COUNTER_BONUS, BULK_COUNTER_CHANCE,
} from './data';
import { planRivals, rivalTick } from './rivals';
import { bestCommodityPrice, commodityRate, demandOf, hash, marketPriceOf as mpo, sellCurve as sc, marketPriceOf, sellCurve, demandLabel as demandLabelM } from './market';

export interface Boost {
  kind: 'wood' | 'money';
  mult: number;
  until: number; // ms timestamp
  source?: 'pack' | 'ad' | 'gold' | 'daily';
}

export interface Listing {
  landId: string;
  seller: string;
  personality: Personality;
  min: number; // secret minimum price
  mood: number; // 0..100
  rejections: number;
  status: 'open' | 'counter' | 'gone' | 'sold';
  counter: number | null;
  greedyCountered: boolean;
  history: { who: 'you' | 'seller'; text: string }[];
  // Part 6: rivals
  saleType: 'negotiate' | 'auction';
  createdAt: number;
  rivalPlan: { at: number; rival: string; amount: number }[]; // rival offers still to come
  rivalOffer: { rival: string; amount: number } | null; // best rival offer so far
  rivalBuysAt: number | null; // when a rival buys it if you have not
  soldTo?: string;
  soldFor?: number;
}

export interface Craft { itemId: string; startedAt: number; doneAt: number }
export interface SaleItem { id: number; itemId: string; price: number; listedAt: number; sellAt: number | null }
export interface SaleRecord { itemId: string; price: number; minutes: number; at: number }
export interface Quest { id: string; target: number; baseline: number; claimed: boolean }

export type Stats = Record<Metric, number>;

export interface GameState {
  version: 2;
  money: number;
  gold: number;
  wood: number; // fractional inside, shown rounded down
  sellCarry: number;
  totalWoodChopped: number;
  totalMoneyEarned: number; // all time, for ranks
  runMoneyEarned: number; // since last prestige
  totalChops: number;

  axeIndex: number;
  axeDurability: number;
  chopsSinceWear: number;

  treeChops: number;
  treeGoldenUntil: number | null;
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
    products: string[];
    skins: string[];
    exclusiveAxes: string[];
    noAds: boolean;
    pendingHelpers: number; // old saves only; moved into helpers on load
    pendingBuildings: string[]; // Sawmill etc, handed out when Buildings are built
    pendingLand: string[]; // old saves only
  };
  processedTx: string[];
  lastSaved: number;

  // Part 2
  helpers: Record<string, { count: number; level: number }>;
  lands: Record<string, { upgrades: string[]; paid: number }>;
  listings: Record<string, Listing>;
  listingsDay: string;
  landGoneUntil: Record<string, number>;
  reputation: number; // 0..100
  workshop: {
    level: number; // -1 = none
    buildingTo: number | null;
    buildDoneAt: number | null;
    queue: Craft[];
    inventory: Record<string, number>;
    forSale: SaleItem[];
    history: SaleRecord[];
    nextSaleId: number;
  };

  // Part 3
  stats: Stats;
  daily: { dayKey: string; quests: Quest[] };
  weekly: { weekKey: string; quest: Quest | null };
  login: { index: number; lastClaimDay: string | null };
  ads: { dayKey: string; goldVideos: number };
  prestige: { count: number; mult: number };
  notif: { asked: boolean; granted: boolean; lastFireDay: string | null; scheduledAt: number | null };
  firstWin: boolean;
  pendingOffline: OfflineResult | null; // Welcome Back money waiting to be collected

  // Part 4
  tools: Record<string, { durability: number; chopWear: number; minuteWear: number; keep?: boolean }>; // keep = bought with Gold, survives prestige
  storageLevel: number;
  wagesOwed: number;
  equippedSkin: string | null;

  // Part 5: Market
  planks: number;
  plankPrice: number;
  plankSelling: boolean;
  plankCarry: number;
  cutting: boolean;
  // Part 7
  manager: Manager;
  // Part 6
  auction: Auction | null;
  feed: FeedItem[];
  watched: string[];
  chopRate: number; // wood/sec from your own chopping, smoothed
  chopAcc: number;
  buyers: { wood: number; planks: number }; // buyers a second at market price, updated every tick
  market: {
    days: DayStats[]; // last 7 days
    orders: BulkOrder[];
    ordersDay: string;
    log: SaleLog[]; // bulk orders and furniture sales, newest first
  };
}

export interface Auction {
  landId: string;
  startedAt: number;
  endsAt: number;
  bid: number; // current highest bid (or the opening price if nobody has bid)
  leader: string | null; // 'you', a rival name, or nobody yet
  participants: { rival: string; max: number }[];
  lastSec: number;
  log: { who: string; amount: number; at: number }[];
  outbid: boolean; // a rival just took the lead from you
}
export interface Manager {
  hired: boolean;
  on: boolean;
  carry: number;
  day: string;
  soldToday: number; // wood he sold today
  moneyToday: number; // Money from his sales today
  collectedToday: number; // Money he collected for you when you came back
  soldTotal: number;
  moneyTotal: number;
}
export interface FeedItem { at: number; text: string; kind: 'rival' | 'you' | 'win' | 'lose'; landId?: string }
export interface DayStats { day: string; wood: number; planks: number; furniture: number; money: number; woodMoney: number }
export interface BulkOrder { id: string; buyer: string; product: 'wood' | 'planks'; amount: number; price: number; status: 'open' | 'done' | 'gone'; countered: boolean }
export interface SaleLog { what: string; units: number; price: number; at: number; minutes: number | null }

export function dayKeyOf(now: number) {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Monday-based week key. */
export function weekKeyOf(now: number) {
  const d = new Date(now);
  const day = (d.getDay() + 6) % 7; // Mon=0
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  return dayKeyOf(monday.getTime());
}

export const emptyStats = (): Stats => ({
  chops: 0, felled: 0, woodSold: 0, moneyEarned: 0, helpersHired: 0, itemsCrafted: 0, landOffers: 0,
});

/** The parts of the game that reset when you prestige. */
export function freshRun(now: number) {
  return {
    money: 0,
    wood: 0,
    sellCarry: 0,
    runMoneyEarned: 0,
    axeIndex: 0,
    axeDurability: 100,
    chopsSinceWear: 0,
    treeChops: 0,
    treeGoldenUntil: null as number | null,
    sellPrice: MARKET_BASE_PRICE,
    helpers: {} as GameState['helpers'],
    lands: {} as GameState['lands'],
    listings: {} as GameState['listings'],
    listingsDay: '',
    landGoneUntil: {} as Record<string, number>,
    workshop: { level: -1, buildingTo: null, buildDoneAt: null, queue: [], inventory: {}, forSale: [], history: [], nextSaleId: 1 } as GameState['workshop'],
    tools: {} as GameState['tools'],
    storageLevel: 0,
    wagesOwed: 0,
    planks: 0,
    plankPrice: PLANK_BASE_PRICE,
    plankSelling: true,
    plankCarry: 0,
    cutting: false,
    chopRate: 0,
    chopAcc: 0,
    buyers: { wood: MIN_BUYERS_PER_SEC * MARKET_SIZE_MULT, planks: MIN_BUYERS_PER_SEC * MARKET_SIZE_MULT },
    auction: null as Auction | null,
    manager: { hired: false, on: true, carry: 0, day: '', soldToday: 0, moneyToday: 0, collectedToday: 0, soldTotal: 0, moneyTotal: 0 } as Manager,
  };
}

export function newGame(now = Date.now()): GameState {
  return {
    version: 2,
    gold: 0,
    totalWoodChopped: 0,
    totalMoneyEarned: 0,
    totalChops: 0,
    treesFelled: 0,
    goldenTreesFound: 0,
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
    reputation: 50,
    stats: emptyStats(),
    daily: { dayKey: '', quests: [] },
    weekly: { weekKey: '', quest: null },
    login: { index: 0, lastClaimDay: null },
    ads: { dayKey: dayKeyOf(now), goldVideos: 0 },
    prestige: { count: 0, mult: 1 },
    notif: { asked: false, granted: false, lastFireDay: null, scheduledAt: null },
    firstWin: false,
    pendingOffline: null,
    equippedSkin: null,
    market: { days: [], orders: [], ordersDay: '', log: [] },
    feed: [],
    watched: [],
    ...freshRun(now),
  };
}

// ---------- seeded random ----------

export { hash };

// ---------- money ----------

/** Adds earned Money and keeps every "earned" counter in step. */
export function addMoney(s: GameState, amount: number): GameState {
  if (amount <= 0) return s;
  return {
    ...s,
    money: s.money + amount,
    totalMoneyEarned: s.totalMoneyEarned + amount,
    runMoneyEarned: s.runMoneyEarned + amount,
    moneyToday: s.moneyToday + amount,
    stats: { ...s.stats, moneyEarned: s.stats.moneyEarned + amount },
  };
}

function bump(s: GameState, m: Metric, n = 1): GameState {
  return { ...s, stats: { ...s.stats, [m]: s.stats[m] + n } };
}

// ---------- multipliers ----------
// Boosts ADD together (spec Part 3): 2x + 2x = 3x, not 4x.

export function boostBonus(s: GameState, kind: Boost['kind'], now: number) {
  let b = 0;
  for (const x of s.boosts) if (x.kind === kind && x.until > now) b += x.mult - 1;
  return b;
}

/** Old name kept for screens: total multiplier from boosts of one kind. */
export function boostMult(s: GameState, kind: Boost['kind'], now: number) {
  return 1 + boostBonus(s, kind, now);
}

export function moneyMult(s: GameState, now: number) {
  return 1 + boostBonus(s, 'money', now) + (s.vipActive ? VIP_MONEY_MULT - 1 : 0);
}

/** Timber Rush: Friday to Sunday, 2x output on one wood type you own. */
export function rushInfo(s: GameState, now: number) {
  const d = new Date(now);
  const wk = weekKeyOf(now);
  const owned = ownedWoodTypes(s);
  const type = owned[Math.floor(hash('rush:' + wk) * owned.length)] ?? HOME_WOOD;
  const active = RUSH_DAYS.includes(d.getDay());
  const sunday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + ((7 - d.getDay()) % 7), 23, 59, 59);
  const friday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + ((5 - d.getDay() + 7) % 7), 0, 0, 0);
  return { active, type, endsAt: sunday.getTime(), startsAt: friday.getTime() };
}

export function ownedWoodTypes(s: GameState): WoodType[] {
  const set = new Set<WoodType>([HOME_WOOD]);
  for (const l of LAND) if (s.lands[l.id]) set.add(l.wood);
  return [...set];
}

/** Multiplier for wood of one type: boosts and Timber Rush add, prestige multiplies. */
export function woodMultFor(s: GameState, now: number, type: WoodType) {
  const r = rushInfo(s, now);
  const rush = r.active && r.type === type ? RUSH_BONUS : 0;
  return (1 + boostBonus(s, 'wood', now) + rush) * s.prestige.mult;
}

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
  const base = p === 0 ? AXES[0].power : axe.power * p;
  const fx = toolFx(s);
  return (base + fx.chopFlat) * (1 + fx.chopPct) * woodMultFor(s, now, HOME_WOOD);
}

// ---------- tools ----------

export function toolPower(s: GameState, id: string) {
  const t = s.tools[id];
  return t ? durabilityPower(t.durability) : 0;
}

/** What all your tools add up to right now (worn tools give less, broken give nothing). */
export function toolFx(s: GameState) {
  const fx = { chopPct: 0, chopFlat: 0, helperPct: 0, passiveFlat: 0, woodSalePct: 0, plankSalePct: 0, fellsTrees: false };
  const hasHelpers = helperCount(s) > 0;
  for (const d of TOOLS) {
    const p = toolPower(s, d.id);
    if (!p) continue;
    fx.chopPct += (d.chopPct ?? 0) * p;
    fx.chopFlat += (d.chopFlat ?? 0) * p;
    fx.helperPct += (d.helperPct ?? 0) * p;
    if (!d.needsHelpers || hasHelpers) fx.passiveFlat += (d.passiveFlat ?? 0) * p;
    fx.woodSalePct += (d.woodSalePct ?? 0) * p;
    fx.plankSalePct += (d.plankSalePct ?? 0) * p;
    if (d.fellsTrees) fx.fellsTrees = true;
  }
  return fx;
}

export function buyTool(s: GameState, id: string): GameState | null {
  const d = TOOLS.find((x) => x.id === id);
  if (!d || s.tools[id] || s.money < d.cost) return null;
  return { ...s, money: s.money - d.cost, tools: { ...s.tools, [id]: { durability: 100, chopWear: 0, minuteWear: 0 } }, firstWin: true };
}

export function buyToolWithGold(s: GameState, id: string): GameState | null {
  const d = TOOLS.find((x) => x.id === id);
  if (!d || !d.goldCost || s.tools[id] || s.gold < d.goldCost) return null;
  return { ...s, gold: s.gold - d.goldCost, tools: { ...s.tools, [id]: { durability: 100, chopWear: 0, minuteWear: 0, keep: true } }, firstWin: true };
}

export function toolRepairCost(s: GameState, id: string, to: number) {
  const t = s.tools[id];
  const d = TOOLS.find((x) => x.id === id);
  if (!t || !d) return 0;
  const missing = Math.max(0, to - t.durability);
  return missing === 0 ? 0 : Math.max(1, Math.ceil((d.repairCost * missing) / 100));
}

export function repairTool(s: GameState, id: string, to: number): GameState | null {
  const cost = toolRepairCost(s, id, to);
  if (cost === 0 || s.money < cost) return null;
  return { ...s, money: s.money - cost, tools: { ...s.tools, [id]: { ...s.tools[id], durability: to, chopWear: 0, minuteWear: 0 } } };
}

/** Cost to repair the axe and every tool to 100%. */
export function repairAllCost(s: GameState) {
  return repairCost(s, 100) + Object.keys(s.tools).reduce((a, id) => a + toolRepairCost(s, id, 100), 0);
}

export function repairAll(s: GameState): GameState | null {
  const cost = repairAllCost(s);
  if (cost === 0 || s.money < cost) return null;
  return fixEverything({ ...s, money: s.money - cost });
}

export function fixEverything(s: GameState): GameState {
  const tools: GameState['tools'] = {};
  for (const id of Object.keys(s.tools)) tools[id] = { ...s.tools[id], durability: 100, chopWear: 0, minuteWear: 0 };
  return { ...s, axeDurability: 100, chopsSinceWear: 0, tools };
}

function toolInUse(s: GameState, id: string) {
  const d = TOOLS.find((x) => x.id === id)!;
  if (d.woodSalePct) return s.selling && s.wood >= 1;
  if (d.plankSalePct) return s.plankSelling && s.planks >= 1;
  if (d.helperPct || d.needsHelpers) return helperCount(s) > 0;
  return true;
}

function wearTools(s: GameState, chops: number, minutes: number): GameState {
  let changed = false;
  const tools = { ...s.tools };
  for (const d of TOOLS) {
    const t = tools[d.id];
    if (!t || t.durability <= 0) continue;
    let { durability, chopWear, minuteWear } = t;
    if (chops && d.wearChops) {
      chopWear += chops;
      while (chopWear >= d.wearChops && durability > 0) { chopWear -= d.wearChops; durability -= 1; }
    }
    if (minutes && d.wearMinutes && toolInUse(s, d.id)) {
      minuteWear += minutes;
      while (minuteWear >= d.wearMinutes && durability > 0) { minuteWear -= d.wearMinutes; durability -= 1; }
    }
    if (durability !== t.durability || chopWear !== t.chopWear || minuteWear !== t.minuteWear) {
      tools[d.id] = { ...t, durability: Math.max(0, durability), chopWear, minuteWear };
      changed = true;
    }
  }
  return changed ? { ...s, tools } : s;
}

// ---------- storage ----------

export function storageCap(s: GameState) {
  return STORAGE_LEVELS[Math.min(s.storageLevel, STORAGE_LEVELS.length - 1)].cap;
}

export function storageUpgradeCost(s: GameState) {
  return STORAGE_LEVELS[s.storageLevel + 1]?.cost ?? null;
}

export function buyStorage(s: GameState): GameState | null {
  const cost = storageUpgradeCost(s);
  if (cost === null || s.money < cost) return null;
  return { ...s, money: s.money - cost, storageLevel: s.storageLevel + 1 };
}

/** Wood and planks share the yard (a plank takes the space of the wood it was cut from). */
export function storageUsed(s: GameState) {
  return s.wood + s.planks * PLANK_WOOD;
}

function addWood(s: GameState, amount: number): { state: GameState; added: number } {
  const room = Math.max(0, storageCap(s) - storageUsed(s));
  const added = Math.max(0, Math.min(amount, room));
  if (added === 0) return { state: s, added };
  return { state: { ...s, wood: s.wood + added, totalWoodChopped: s.totalWoodChopped + added }, added };
}

// ---------- wages ----------

export function wagePerHour(s: GameState) {
  let w = 0;
  for (const h of HELPERS) {
    const o = s.helpers[h.id];
    if (o?.count) w += o.count * HELPER_WAGES[h.id] * (1 + WAGE_LEVEL_GROWTH * o.level);
  }
  return w;
}

export function helperWageSpeed(s: GameState) {
  return s.wagesOwed > 0 ? UNPAID_HELPER_SPEED : 1;
}

function payWages(s: GameState, dtSec: number): GameState {
  const rate = wagePerHour(s);
  if (rate === 0 && s.wagesOwed === 0) return s;
  const due = s.wagesOwed + (rate * dtSec) / 3600;
  if (s.money >= due) return { ...s, money: s.money - due, wagesOwed: 0 };
  return { ...s, wagesOwed: due };
}

export function equipSkin(s: GameState, id: string | null): GameState | null {
  if (id !== null && (!s.owned.skins.includes(id) || !AXE_SKINS[id])) return null;
  return { ...s, equippedSkin: id };
}

// ---------- helpers ----------

export function helperOutputBase(id: string, h: { count: number; level: number } | undefined) {
  const def = HELPERS.find((x) => x.id === id)!;
  if (!h || h.count === 0) return 0;
  return def.woodPerSec * h.count * (1 + HELPER_LEVEL_BONUS * h.level);
}

export function hireCost(s: GameState, id: string) {
  const def = HELPERS.find((x) => x.id === id)!;
  return Math.round(def.cost * Math.pow(HELPER_COPY_SCALE, s.helpers[id]?.count ?? 0));
}

export function levelCost(s: GameState, id: string) {
  const def = HELPERS.find((x) => x.id === id)!;
  const lvl = s.helpers[id]?.level ?? 0;
  if (lvl >= HELPER_MAX_LEVEL) return null;
  return Math.round(def.cost * HELPER_LEVEL_COST_BASE * Math.pow(HELPER_LEVEL_COST_GROWTH, lvl));
}

export function hireHelper(s: GameState, id: string): GameState | null {
  const cost = hireCost(s, id);
  if (s.money < cost) return null;
  const h = s.helpers[id] ?? { count: 0, level: 0 };
  const st = { ...s, money: s.money - cost, helpers: { ...s.helpers, [id]: { ...h, count: h.count + 1 } }, firstWin: true };
  return bump(st, 'helpersHired');
}

export function levelHelper(s: GameState, id: string): GameState | null {
  const cost = levelCost(s, id);
  const h = s.helpers[id];
  if (cost === null || !h || h.count === 0 || s.money < cost) return null;
  return { ...s, money: s.money - cost, helpers: { ...s.helpers, [id]: { ...h, level: h.level + 1 } } };
}

export function helperCount(s: GameState) {
  return Object.values(s.helpers).reduce((a, h) => a + h.count, 0);
}

// ---------- land ----------

export function landOutputBase(id: string, s: GameState) {
  const l = s.lands[id];
  if (!l) return 0;
  const def = LAND.find((x) => x.id === id)!;
  const bonus = LAND_UPGRADES.filter((u) => l.upgrades.includes(u.id)).reduce((a, u) => a + u.bonus, 0);
  return def.woodPerSec * (1 + bonus);
}

/** Wood per second from helpers and land, with boosts, Timber Rush and prestige. */
export function passiveWoodPerSec(s: GameState, now: number) {
  let total = 0;
  const home = woodMultFor(s, now, HOME_WOOD);
  const fx = toolFx(s);
  let helpers = 0;
  for (const h of HELPERS) helpers += helperOutputBase(h.id, s.helpers[h.id]);
  total += helpers * (1 + fx.helperPct) * helperWageSpeed(s) * home;
  total += fx.passiveFlat * home;
  for (const l of LAND) if (s.lands[l.id]) total += landOutputBase(l.id, s) * woodMultFor(s, now, l.wood);
  return total;
}

function repFactor(rep: number) {
  return 1 + (50 - rep) / 500; // rep 100 = sellers want 10% less, rep 0 = 10% more
}

/** New sellers every day for every piece of land you don't own. */
export function ensureListings(s: GameState, now: number): GameState {
  const dk = dayKeyOf(now);
  if (s.listingsDay === dk || s.auction) return s;
  const listings: Record<string, Listing> = {};
  LAND.forEach((l, i) => {
    if (s.lands[l.id]) return;
    if ((s.landGoneUntil[l.id] ?? 0) > now) return;
    const r = (k: string) => hash(`${dk}:${l.id}:${k}:${s.prestige.count}`);
    const kinds = Object.keys(PERSONALITY) as Personality[];
    const personality = kinds[Math.floor(r('p') * kinds.length)];
    const p = PERSONALITY[personality];
    const min = Math.round(l.asking * (p.minLo + r('m') * (p.minHi - p.minLo)) * repFactor(s.reputation));
    listings[l.id] = {
      landId: l.id,
      seller: SELLER_NAMES[(Math.floor(r('n') * SELLER_NAMES.length) + i) % SELLER_NAMES.length],
      personality, min, mood: 70, rejections: 0, status: 'open', counter: null, greedyCountered: false, history: [],
      ...planRivals(l.id, l.asking, dk, s.prestige.count, now),
    };
  });
  return { ...s, listings, listingsDay: dk };
}

export type OfferOutcome = { kind: 'accepted' | 'countered' | 'rejected' | 'walked' | 'error'; message: string };

export function buyLand(s: GameState, id: string, price: number): GameState {
  const def = LAND.find((x) => x.id === id)!;
  const fair = price >= def.asking * 0.9;
  const listings = { ...s.listings };
  delete listings[id];
  return {
    ...s,
    money: s.money - price,
    lands: { ...s.lands, [id]: { upgrades: [], paid: price } },
    listings,
    reputation: Math.max(0, Math.min(100, s.reputation + (fair ? 2 : 0))),
    firstWin: true,
  };
}

export function makeOffer(s: GameState, id: string, amount: number, now: number): { state: GameState; outcome: OfferOutcome } {
  const L = s.listings[id];
  const def = LAND.find((x) => x.id === id);
  if (!L || !def || L.status === 'gone') return { state: s, outcome: { kind: 'error', message: 'This land is not for sale right now.' } };
  amount = Math.round(amount);
  if (!(amount > 0)) return { state: s, outcome: { kind: 'error', message: 'Type an offer first.' } };
  if (amount > s.money) return { state: s, outcome: { kind: 'error', message: "You don't have that much Money." } };

  let st = bump(s, 'landOffers');
  const l: Listing = { ...L, history: [...L.history, { who: 'you', text: `You offered $${amount.toLocaleString('en-US')}` }] };
  const ratio = amount / l.min;
  const say = (t: string) => l.history.push({ who: 'seller', text: t });
  let outcome: OfferOutcome;

  // a rival already offered more: the seller asks you to beat it
  if (l.rivalOffer && amount < l.rivalOffer.amount * 1.02) {
    l.counter = Math.max(l.counter ?? 0, Math.round(l.rivalOffer.amount * 1.05));
    l.status = 'counter';
    say(`${l.rivalOffer.rival} already offered $${l.rivalOffer.amount.toLocaleString('en-US')}. Beat it: $${l.counter.toLocaleString('en-US')} and it's yours.`);
    return { state: { ...st, listings: { ...st.listings, [id]: l } }, outcome: { kind: 'countered', message: `${l.rivalOffer.rival} offered more. The seller wants you to beat it.` } };
  }

  if (ratio >= 1 && !(l.personality === 'greedy' && !l.greedyCountered)) {
    say('Deal! The land is yours.');
    st = buyLand(st, id, amount);
    if (amount < def.asking * 0.75) st.reputation = Math.max(0, st.reputation - 1);
    return { state: st, outcome: { kind: 'accepted', message: `${l.seller} accepted! You bought ${def.name}.` } };
  }
  if (ratio >= 1) {
    l.greedyCountered = true;
    l.counter = Math.round(Math.max(amount * 1.08, def.asking * 1.02));
    l.status = 'counter';
    say(`Hmm, I could do $${l.counter.toLocaleString('en-US')}.`);
    outcome = { kind: 'countered', message: `${l.seller} wants more and countered.` };
  } else if (ratio >= 0.85) {
    l.counter = Math.round((l.min + Math.max(def.asking, l.min)) / 2);
    l.status = 'counter';
    l.mood = Math.max(0, l.mood - 8);
    say(`Close. Meet me at $${l.counter.toLocaleString('en-US')}?`);
    outcome = { kind: 'countered', message: `${l.seller} made a counteroffer.` };
  } else if (ratio >= 0.6) {
    l.rejections += 1;
    l.mood = Math.max(0, l.mood - 20);
    l.status = 'open';
    l.counter = null;
    say('No, that is too low.');
    outcome = { kind: 'rejected', message: `${l.seller} said no.` };
  } else {
    l.rejections += 1;
    l.mood = Math.max(0, l.mood - 35);
    l.min = Math.round(l.min * 1.05);
    l.status = 'open';
    l.counter = null;
    st.reputation = Math.max(0, st.reputation - 3);
    say('Are you kidding me? My price just went up.');
    outcome = { kind: 'rejected', message: `${l.seller} is insulted and raised the price.` };
  }
  if (l.rejections >= MAX_REJECTIONS || l.mood <= 0) {
    l.status = 'gone';
    say('Forget it. I am not selling to you.');
    st = { ...st, landGoneUntil: { ...st.landGoneUntil, [id]: now + SELLER_WALKAWAY_HOURS * 3600_000 } };
    outcome = { kind: 'walked', message: `${l.seller} walked away. ${def.name} is gone for 24 hours.` };
  }
  return { state: { ...st, listings: { ...st.listings, [id]: l } }, outcome };
}

export function acceptCounter(s: GameState, id: string): GameState | null {
  const l = s.listings[id];
  if (!l || l.status !== 'counter' || l.counter === null || s.money < l.counter) return null;
  return buyLand(s, id, l.counter);
}

export function rejectCounter(s: GameState, id: string): GameState | null {
  const l = s.listings[id];
  if (!l || l.status !== 'counter') return null;
  return {
    ...s,
    listings: {
      ...s.listings,
      [id]: { ...l, status: 'open', counter: null, mood: Math.max(1, l.mood - 5), history: [...l.history, { who: 'you', text: 'You said no to the counteroffer.' }] },
    },
  };
}

export function landUpgradeCost(id: string, upId: string) {
  const def = LAND.find((x) => x.id === id)!;
  const u = LAND_UPGRADES.find((x) => x.id === upId)!;
  return Math.round(def.asking * u.costFrac);
}

export function buyLandUpgrade(s: GameState, id: string, upId: string): GameState | null {
  const l = s.lands[id];
  if (!l || l.upgrades.includes(upId)) return null;
  const cost = landUpgradeCost(id, upId);
  if (s.money < cost) return null;
  return { ...s, money: s.money - cost, lands: { ...s.lands, [id]: { ...l, upgrades: [...l.upgrades, upId] } } };
}

// ---------- workshop ----------

export function workshopUnlocked(s: GameState) {
  return Object.keys(s.lands).length > 0;
}

export function goldToSkip(msLeft: number) {
  return Math.max(1, Math.ceil((msLeft / 60000) * GOLD_PER_MINUTE_SKIP));
}

export function startBuild(s: GameState, now: number): GameState | null {
  const w = s.workshop;
  const next = w.level + 1;
  const def = WORKSHOPS[next];
  if (!def || w.buildingTo !== null || s.money < def.cost) return null;
  if (next === 0 && !workshopUnlocked(s)) return null;
  return { ...s, money: s.money - def.cost, workshop: { ...w, buildingTo: next, buildDoneAt: now + def.buildMinutes * 60000 } };
}

export function finishBuildWithGold(s: GameState, now: number): GameState | null {
  const w = s.workshop;
  if (w.buildingTo === null || w.buildDoneAt === null) return null;
  const g = goldToSkip(w.buildDoneAt - now);
  if (s.gold < g) return null;
  return { ...s, gold: s.gold - g, workshop: { ...w, level: w.buildingTo, buildingTo: null, buildDoneAt: null } };
}

export function craftTimeMs(s: GameState, itemId: string) {
  const it = ITEMS.find((x) => x.id === itemId)!;
  const speed = WORKSHOPS[Math.max(0, s.workshop.level)].speed;
  return (it.minutes * 60000) / speed;
}

export function startCraft(s: GameState, itemId: string, now: number): GameState | null {
  const w = s.workshop;
  const it = ITEMS.find((x) => x.id === itemId);
  if (!it || w.level < 0 || it.tier > w.level) return null;
  if (w.queue.length >= WORKSHOPS[w.level].slots || s.wood < it.wood) return null;
  return {
    ...s,
    wood: s.wood - it.wood,
    workshop: { ...w, queue: [...w.queue, { itemId, startedAt: now, doneAt: now + craftTimeMs(s, itemId) }] },
  };
}

export function finishCraftWithGold(s: GameState, index: number, now: number): GameState | null {
  const c = s.workshop.queue[index];
  if (!c) return null;
  const g = goldToSkip(c.doneAt - now);
  if (s.gold < g) return null;
  const queue = s.workshop.queue.map((q, i) => (i === index ? { ...q, doneAt: now } : q));
  return { ...s, gold: s.gold - g, workshop: { ...s.workshop, queue } };
}

// Sell chance and time for crafted items (spec section 9 chair example), with today's furniture demand.
export function sellOdds(s: GameState, itemId: string, price: number) {
  const it = ITEMS.find((x) => x.id === itemId)!;
  const c = sellCurve(price / it.value);
  const demand = demandOf(s.dayKey, 'furniture');
  return { chance: Math.min(0.99, c.chance * demand), minutes: c.minutes / demand };
}

/** Price with the most Money per item on average. */
export function bestItemPrice(s: GameState, itemId: string) {
  const it = ITEMS.find((x) => x.id === itemId)!;
  let best = it.value;
  let bestV = 0;
  for (let r = 0.3; r <= 3; r += 0.05) {
    const p = Math.round(it.value * r);
    const v = p * sellOdds(s, itemId, p).chance;
    if (v > bestV) [bestV, best] = [v, p];
  }
  return best;
}

function rollSale(s: GameState, itemId: string, price: number, now: number, rand: () => number) {
  const o = sellOdds(s, itemId, price);
  return rand() < o.chance ? now + o.minutes * 60000 * (0.5 + rand()) : null;
}

export function listForSale(s: GameState, itemId: string, price: number, now: number, rand = Math.random): GameState | null {
  const w = s.workshop;
  if (!(w.inventory[itemId] > 0) || !(price > 0)) return null;
  const item: SaleItem = { id: w.nextSaleId, itemId, price: Math.round(price), listedAt: now, sellAt: rollSale(s, itemId, price, now, rand) };
  return {
    ...s,
    workshop: { ...w, inventory: { ...w.inventory, [itemId]: w.inventory[itemId] - 1 }, forSale: [...w.forSale, item], nextSaleId: w.nextSaleId + 1 },
  };
}

export function changeSalePrice(s: GameState, saleId: number, price: number, now: number, rand = Math.random): GameState | null {
  const w = s.workshop;
  const it = w.forSale.find((x) => x.id === saleId);
  if (!it || !(price > 0)) return null;
  const forSale = w.forSale.map((x) => (x.id === saleId ? { ...x, price: Math.round(price), listedAt: now, sellAt: rollSale(s, x.itemId, price, now, rand) } : x));
  return { ...s, workshop: { ...w, forSale } };
}

export function cancelSale(s: GameState, saleId: number): GameState | null {
  const w = s.workshop;
  const it = w.forSale.find((x) => x.id === saleId);
  if (!it) return null;
  return {
    ...s,
    workshop: { ...w, forSale: w.forSale.filter((x) => x.id !== saleId), inventory: { ...w.inventory, [it.itemId]: (w.inventory[it.itemId] ?? 0) + 1 } },
  };
}

function tickWorkshop(s: GameState, now: number): GameState {
  let st = s;
  let w = st.workshop;
  if (w.buildingTo !== null && w.buildDoneAt !== null && w.buildDoneAt <= now) {
    w = { ...w, level: w.buildingTo, buildingTo: null, buildDoneAt: null };
    st = { ...st, workshop: w };
  }
  if (w.queue.some((c) => c.doneAt <= now)) {
    const done = w.queue.filter((c) => c.doneAt <= now);
    const inventory = { ...w.inventory };
    for (const c of done) inventory[c.itemId] = (inventory[c.itemId] ?? 0) + 1;
    w = { ...w, queue: w.queue.filter((c) => c.doneAt > now), inventory };
    st = bump({ ...st, workshop: w }, 'itemsCrafted', done.length);
  }
  if (w.forSale.some((x) => x.sellAt !== null && x.sellAt <= now)) {
    const sold = w.forSale.filter((x) => x.sellAt !== null && x.sellAt <= now);
    const mm = moneyMult(st, now);
    for (const x of sold) {
      const it = ITEMS.find((i) => i.id === x.itemId)!;
      st = recordSale(st, 'furniture', 1, x.price * mm, x.sellAt!, { what: it.name, price: x.price * mm, minutes: Math.round((x.sellAt! - x.listedAt) / 60000) });
    }
    const history = [
      ...sold.map((x) => ({ itemId: x.itemId, price: x.price * mm, minutes: Math.round((x.sellAt! - x.listedAt) / 60000), at: x.sellAt! })),
      ...w.history,
    ].slice(0, 25);
    w = { ...w, forSale: w.forSale.filter((x) => !sold.includes(x)), history };
    st = addMoney({ ...st, workshop: w }, sold.reduce((a, x) => a + x.price * mm, 0));
  }
  return st;
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
  axeLow: boolean;
  storageFull: boolean;
}

export function chop(s: GameState, now: number, rand: () => number = Math.random): { state: GameState; result: ChopResult } {
  const axe = AXES[s.axeIndex];
  const crit = rand() < CRIT_CHANCE;
  const per = woodPerChop(s, now);
  const wood = per * (crit ? CRIT_MULT : 1);

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

  let treeChops = s.treeChops + 1;
  let felled = false;
  let fellBonus = 0;
  let golden: ChopResult['golden'] = null;
  let treeGoldenUntil = s.treeGoldenUntil;
  let newGoldenTree = false;
  let st: GameState = s;

  if (treeChops >= CHOPS_PER_TREE || toolFx(s).fellsTrees) {
    felled = true;
    treeChops = 0;
    fellBonus = per * FELL_BONUS_CHOPS;
    if (treeGoldenUntil && treeGoldenUntil > now) {
      const g = GOLDEN_GOLD_MIN + Math.floor(rand() * (GOLDEN_GOLD_MAX - GOLDEN_GOLD_MIN + 1));
      const m = Math.max(GOLDEN_MONEY_PER_POWER, GOLDEN_MONEY_PER_POWER * axe.power);
      golden = { gold: g, money: m };
      st = addMoney({ ...st, gold: st.gold + g, goldenTreesFound: st.goldenTreesFound + 1 }, m);
      fellBonus *= 3;
    }
    treeGoldenUntil = null;
    if (rand() < GOLDEN_TREE_CHANCE) {
      treeGoldenUntil = now + GOLDEN_TREE_SECONDS * 1000;
      newGoldenTree = true;
    }
  }

  const added = addWood(st, wood + fellBonus);
  st = { ...added.state, chopAcc: added.state.chopAcc + added.added };
  const storageFull = added.added < wood + fellBonus - 1e-9;
  st = {
    ...wearTools(st, 1, 0),
    totalChops: st.totalChops + 1,
    axeDurability: dur,
    chopsSinceWear: since,
    treeChops,
    treeGoldenUntil,
    treesFelled: st.treesFelled + (felled ? 1 : 0),
    stats: { ...st.stats, chops: st.stats.chops + 1, felled: st.stats.felled + (felled ? 1 : 0) },
  };
  return { state: st, result: { wood: storageFull ? added.added : wood, crit, felled, fellBonus: storageFull ? 0 : fellBonus, golden, newGoldenTree, axeBroke, axeLow, storageFull } };
}

export function devSpawnGolden(s: GameState, now: number): GameState {
  return { ...s, treeGoldenUntil: now + GOLDEN_TREE_SECONDS * 1000 };
}

// ---------- market ----------

export function demandFor(dayKey: string) {
  return demandOf(dayKey, 'wood');
}

export function demandLabel(d: number) {
  return demandLabelM(d);
}

export function marketPriceFor(dayKey: string) {
  return marketPriceOf(dayKey, 'wood');
}

export function salesPerSec(s: GameState, price = s.sellPrice, wood = s.wood) {
  if (!s.selling) return 0;
  return commodityRate(s.dayKey, 'wood', price, wood, BUYERS_PER_WOOD_IN_STOCK, s.buyers.wood);
}

export function plankSalesPerSec(s: GameState, price = s.plankPrice, planks = s.planks) {
  if (!s.plankSelling) return 0;
  return commodityRate(s.dayKey, 'planks', price, planks, BUYERS_PER_WOOD_IN_STOCK, s.buyers.planks);
}

export function bestPrice(dayKey: string) {
  return bestCommodityPrice(dayKey, 'wood');
}

/** Rough Money per minute right now (helpers, land and steady chopping). Used to size rewards. */
export function incomePerMin(s: GameState, now: number) {
  const chopWoodPerMin = 60 * woodPerChop(s, now);
  return (passiveWoodPerSec(s, now) * 60 + chopWoodPerMin) * marketPriceFor(s.dayKey);
}

export function woodPerMinEstimate(s: GameState, now: number) {
  return passiveWoodPerSec(s, now) * 60 + 60 * woodPerChop(s, now);
}

/** Runs one step of time. `offline` makes helpers and land work at the offline rate. */
export function tick(s: GameState, dtSec: number, now: number, offline = false): GameState {
  let next = s;
  const dk = dayKeyOf(now);
  if (dk !== s.dayKey) next = { ...next, dayKey: dk, soldToday: 0, moneyToday: 0 };
  if (next.treeGoldenUntil && next.treeGoldenUntil <= now) next = { ...next, treeGoldenUntil: null };
  if (next.boosts.some((b) => b.until <= now)) next = { ...next, boosts: next.boosts.filter((b) => b.until > now) };

  next = payWages(next, dtSec);
  const passive = passiveWoodPerSec(next, now) * (offline ? OFFLINE_RATE : 1);
  if (dtSec > 0) {
    const a = 1 - Math.exp(-dtSec / 30);
    const chopRate = next.chopRate + a * (next.chopAcc / dtSec - next.chopRate);
    const made = passive + chopRate;
    next = {
      ...next,
      chopRate,
      chopAcc: 0,
      buyers: {
        wood: MARKET_SIZE_MULT * Math.max(MIN_BUYERS_PER_SEC, made),
        planks: MARKET_SIZE_MULT * Math.max(MIN_BUYERS_PER_SEC, next.cutting ? PLANK_CUT_PER_SEC : 0),
      },
    };
  }
  if (passive > 0) next = addWood(next, passive * dtSec).state;
  if (dtSec > 0) next = wearTools(next, 0, dtSec / 60);

  if (next.cutting && next.wood >= PLANK_WOOD && dtSec > 0) {
    const n = Math.min(PLANK_CUT_PER_SEC * dtSec, next.wood / PLANK_WOOD);
    next = { ...next, wood: next.wood - n * PLANK_WOOD, planks: next.planks + n };
  }

  const rate = salesPerSec(next);
  if (rate > 0) {
    const units = rate * dtSec + next.sellCarry;
    const whole = Math.floor(units);
    const sold = Math.min(whole, Math.floor(next.wood));
    const carry = sold < whole ? 0 : units - whole;
    if (sold > 0 || carry !== next.sellCarry) {
      const earned = sold * next.sellPrice * moneyMult(next, now) * (1 + toolFx(next).woodSalePct);
      next = { ...next, wood: next.wood - sold, sellCarry: carry, soldToday: next.soldToday + sold };
      next = addMoney(bump(next, 'woodSold', sold), earned);
      if (sold > 0) next = recordSale(next, 'wood', sold, earned, now);
    }
  }

  next = managerTick(next, dtSec, now);

  const prate = plankSalesPerSec(next);
  if (prate > 0) {
    const units = prate * dtSec + next.plankCarry;
    const whole = Math.floor(units);
    const sold = Math.min(whole, Math.floor(next.planks));
    const carry = sold < whole ? 0 : units - whole;
    if (sold > 0 || carry !== next.plankCarry) {
      const earned = sold * next.plankPrice * moneyMult(next, now) * (1 + toolFx(next).plankSalePct);
      next = addMoney({ ...next, planks: next.planks - sold, plankCarry: carry }, earned);
      if (sold > 0) next = recordSale(next, 'planks', sold, earned, now);
    }
  }
  return rivalTick(tickWorkshop(next, now), now);
}

export interface OfflineResult { away: number; earned: number; gross?: number; sold: number; produced: number; collectedBy?: 'manager' } // earned = after wages

/**
 * Runs the time the player was away (50% helper/land rate, 8 hour cap).
 * The Money earned is held back so the Welcome Back screen can give it (or 2x with a video).
 */
export function computeOffline(s: GameState, now: number): { state: GameState; result: OfflineResult | null } {
  const realAway = (now - s.lastSaved) / 1000;
  const away = Math.min(realAway, OFFLINE_MAX_HOURS * 3600);
  if (realAway < 60) return { state: s, result: null };
  let st = s;
  const step = 10;
  const start = now - away * 1000;
  for (let t = 0; t < away; t += step) st = tick(st, Math.min(step, away - t), start + t * 1000, true);
  st = tick(st, 0, now);
  const gross = st.runMoneyEarned - s.runMoneyEarned;
  const earned = Math.max(0, Math.min(gross, st.money - s.money)); // what is left after wages
  const produced = st.totalWoodChopped - s.totalWoodChopped;
  const sold = st.stats.woodSold - s.stats.woodSold;
  // hold the Money back until collected
  st = {
    ...st,
    money: st.money - earned,
    totalMoneyEarned: st.totalMoneyEarned - gross,
    runMoneyEarned: st.runMoneyEarned - gross,
    moneyToday: Math.max(0, st.moneyToday - gross),
    stats: { ...st.stats, moneyEarned: st.stats.moneyEarned - gross },
    lastSaved: now,
  };
  if (earned < 0.01 && produced < 1) return { state: st, result: null };
  return { state: st, result: { away, earned, gross, sold, produced } };
}

export function collectOffline(s: GameState, r: OfflineResult, mult: number): GameState {
  const gross = r.gross ?? r.earned;
  const st = addMoney(s, gross + r.earned * (mult - 1));
  return { ...st, money: s.money + r.earned * mult };
}

// ---------- upgrades ----------

export function buyAxe(s: GameState, index: number): GameState | null {
  const axe = AXES[index];
  if (!axe || index <= s.axeIndex || s.money < axe.cost) return null;
  return { ...s, money: s.money - axe.cost, axeIndex: index, axeDurability: 100, chopsSinceWear: 0, firstWin: true };
}

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

export function addBoost(boosts: Boost[], kind: Boost['kind'], mult: number, hours: number, now: number, source: Boost['source'] = 'pack'): Boost[] {
  return [...boosts, { kind, mult, until: now + hours * 3600_000, source }];
}

function addApprentices(s: GameState, n: number): GameState {
  if (n <= 0) return s;
  const h = s.helpers.apprentice ?? { count: 0, level: 0 };
  return { ...s, helpers: { ...s.helpers, apprentice: { ...h, count: h.count + n } } };
}

function addLand(s: GameState, ids: string[]): GameState {
  const lands = { ...s.lands };
  const listings = { ...s.listings };
  for (const id of ids) {
    if (!lands[id]) lands[id] = { upgrades: [], paid: 0 };
    delete listings[id];
  }
  return { ...s, lands, listings };
}

/** Helpers, land and axe from packs. Applied on purchase and again after prestige, because they were paid for. */
function applyPackPerks(s: GameState, g: Grant): GameState {
  let st = s;
  if (g.axeId) {
    const idx = AXES.findIndex((a) => a.id === g.axeId);
    if (idx > st.axeIndex) st = { ...st, axeIndex: idx, axeDurability: 100, chopsSinceWear: 0 };
  }
  if (g.helpers) st = addApprentices(st, g.helpers);
  if (g.land) st = addLand(st, g.land);
  return st;
}

export function reapplyOwnedPacks(s: GameState): GameState {
  let st = s;
  for (const id of s.owned.products) {
    const p = productById(id);
    if (p) st = applyPackPerks(st, p.grant);
  }
  return st;
}

export function applyGrant(s: GameState, g: Grant, now: number): GameState {
  let st = { ...s, owned: { ...s.owned } };
  if (g.gold) st.gold += g.gold;
  if (g.skins) st.owned.skins = [...new Set([...st.owned.skins, ...g.skins])];
  if (g.exclusiveAxes) st.owned.exclusiveAxes = [...new Set([...st.owned.exclusiveAxes, ...g.exclusiveAxes])];
  if (g.woodBoost) st.boosts = addBoost(st.boosts, 'wood', g.woodBoost.mult, g.woodBoost.hours, now);
  if (g.moneyBoost) st.boosts = addBoost(st.boosts, 'money', g.moneyBoost.mult, g.moneyBoost.hours, now);
  if (g.buildings) st.owned.pendingBuildings = [...new Set([...st.owned.pendingBuildings, ...g.buildings])];
  if (g.noAds) st.owned.noAds = true;
  if (g.landIfMissing) {
    if (st.lands[g.landIfMissing.id]) st.gold += g.landIfMissing.elseGold;
    else st = addLand(st, [g.landIfMissing.id]);
  }
  return st;
}

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

/** Fixes up saves from older versions. */
export function migrate(s: GameState): GameState {
  let st = s;
  if (st.owned.pendingHelpers > 0) st = addApprentices({ ...st, owned: { ...st.owned, pendingHelpers: 0 } }, st.owned.pendingHelpers);
  if (st.owned.pendingLand.length) st = addLand({ ...st, owned: { ...st.owned, pendingLand: [] } }, st.owned.pendingLand);
  if (st.runMoneyEarned === 0 && st.prestige.count === 0 && st.totalMoneyEarned > 0) st = { ...st, runMoneyEarned: st.totalMoneyEarned };
  if (Object.values(st.listings).some((l) => !l.saleType || !l.rivalPlan)) st = { ...st, listings: {}, listingsDay: '' }; // pre-rivals saves
  return { ...st, version: 2 };
}

export function canClaimVip(s: GameState, now: number) {
  return s.vipActive && s.vipLastClaimDay !== dayKeyOf(now);
}

export function claimVip(s: GameState, now: number): GameState | null {
  if (!canClaimVip(s, now)) return null;
  return { ...s, gold: s.gold + VIP_DAILY_GOLD, vipLastClaimDay: dayKeyOf(now) };
}

export { PRODUCTS };

// ---------- market: history and bulk orders ----------

export function recordSale(s: GameState, p: Product, units: number, money: number, at: number, log?: { what: string; price: number; minutes: number | null }): GameState {
  const day = dayKeyOf(at);
  const days = [...s.market.days];
  let d = days.find((x) => x.day === day);
  if (!d) {
    d = { day, wood: 0, planks: 0, furniture: 0, money: 0, woodMoney: 0 };
    days.push(d);
  }
  const nd = { ...d, [p]: d[p] + units, money: d.money + money, woodMoney: d.woodMoney + (p === 'wood' ? money : 0) };
  const out = days.map((x) => (x.day === day ? nd : x)).slice(-7);
  const logs = log ? [{ what: log.what, units, price: log.price, at, minutes: log.minutes }, ...s.market.log].slice(0, 25) : s.market.log;
  return { ...s, market: { ...s.market, days: out, log: logs } };
}

export function ensureOrders(s: GameState, now: number): GameState {
  const dk = dayKeyOf(now);
  if (s.market.ordersDay === dk) return s;
  const orders: BulkOrder[] = [];
  const cap = storageCap(s);
  for (let i = 0; i < BULK_ORDERS_PER_DAY; i++) {
    const r = (k: string) => hash(`order:${dk}:${i}:${k}`);
    const product: 'wood' | 'planks' = s.workshop.level >= 0 && r('p') < 0.4 ? 'planks' : 'wood';
    const raw = (product === 'wood' ? 0.2 : 0.06) * cap * (0.6 + r('a') * 0.8);
    const mag = Math.pow(10, Math.max(1, Math.floor(Math.log10(raw)) - 1));
    const amount = Math.max(100, Math.round(raw / mag) * mag);
    const price = Math.round(marketPriceOf(dk, product) * (0.85 + r('price') * 0.5) * 100) / 100;
    orders.push({ id: `${dk}-${i}`, buyer: BULK_BUYERS[(Math.floor(r('b') * BULK_BUYERS.length) + i) % BULK_BUYERS.length], product, amount, price, status: 'open', countered: false });
  }
  return { ...s, market: { ...s.market, orders, ordersDay: dk } };
}

export function acceptOrder(s: GameState, id: string, now: number): GameState | null {
  const o = s.market.orders.find((x) => x.id === id);
  if (!o || o.status !== 'open') return null;
  const have = o.product === 'wood' ? s.wood : s.planks;
  if (have < o.amount) return null;
  const fx = toolFx(s);
  const bonus = o.product === 'wood' ? fx.woodSalePct : fx.plankSalePct;
  const money = o.amount * o.price * moneyMult(s, now) * (1 + bonus);
  let st: GameState = o.product === 'wood' ? { ...s, wood: s.wood - o.amount } : { ...s, planks: s.planks - o.amount };
  if (o.product === 'wood') st = bump(st, 'woodSold', o.amount);
  st = addMoney(st, money);
  st = recordSale(st, o.product, o.amount, money, now, { what: `Bulk order: ${o.product} for ${o.buyer}`, price: money, minutes: null });
  return { ...st, market: { ...st.market, orders: st.market.orders.map((x) => (x.id === id ? { ...x, status: 'done' as const } : x)) } };
}

export function rejectOrder(s: GameState, id: string): GameState | null {
  const o = s.market.orders.find((x) => x.id === id);
  if (!o || o.status !== 'open') return null;
  return { ...s, market: { ...s.market, orders: s.market.orders.map((x) => (x.id === id ? { ...x, status: 'gone' as const } : x)) } };
}

/** Ask for 10% more, once. Half the buyers agree, the rest walk away. */
export function counterOrder(s: GameState, id: string): { state: GameState; agreed: boolean } | null {
  const o = s.market.orders.find((x) => x.id === id);
  if (!o || o.status !== 'open' || o.countered) return null;
  const agreed = hash('counter:' + id) < BULK_COUNTER_CHANCE;
  const next: BulkOrder = agreed
    ? { ...o, countered: true, price: Math.round(o.price * (1 + BULK_COUNTER_BONUS) * 100) / 100 }
    : { ...o, countered: true, status: 'gone' };
  return { state: { ...s, market: { ...s.market, orders: s.market.orders.map((x) => (x.id === id ? next : x)) } }, agreed };
}

// ---------- manager (Part 7) ----------

export function hireManager(s: GameState): GameState | null {
  if (s.manager.hired || s.money < MANAGER_COST) return null;
  return { ...s, money: s.money - MANAGER_COST, manager: { ...s.manager, hired: true, on: true }, firstWin: true };
}

export function setManagerOn(s: GameState, on: boolean): GameState | null {
  if (!s.manager.hired || s.manager.on === on) return null;
  return { ...s, manager: { ...s.manager, on } };
}

export function managerActive(s: GameState) {
  return s.manager.hired && s.manager.on && storageUsed(s) >= storageCap(s) * MANAGER_SELL_AT;
}

/**
 * When the yard is 80% full the manager brings extra buyers, at YOUR price (he never changes it),
 * and sells wood back down to 80%. He works even if you paused selling.
 * He can't beat the yard limit: a pile only sells so fast, so a yard can still fill if you make more than it can sell.
 */
function managerTick(s: GameState, dtSec: number, now: number): GameState {
  const dk = dayKeyOf(now);
  let st = s.manager.day !== dk && s.manager.hired ? { ...s, manager: { ...s.manager, day: dk, soldToday: 0, moneyToday: 0, collectedToday: 0 } } : s;
  if (!managerActive(st) || dtSec <= 0 || st.wood < 1) return st.manager.carry && !managerActive(st) ? { ...st, manager: { ...st.manager, carry: 0 } } : st;
  const yes = (sc(st.sellPrice / mpo(st.dayKey, 'wood')).chance / 0.7) * demandOf(st.dayKey, 'wood');
  const pile = Math.max(1, st.wood * BUYERS_PER_WOOD_IN_STOCK);
  const crowd = st.buyers.wood;
  const normal = st.selling ? yes * Math.min(crowd, pile) : 0;
  const withManager = yes * Math.min(crowd * (st.selling ? 1 + MANAGER_EXTRA_BUYERS : 1), pile);
  const extra = Math.max(0, withManager - normal);
  if (extra <= 0) return st;
  const excess = storageUsed(st) - storageCap(st) * MANAGER_SELL_AT;
  const units = extra * dtSec + st.manager.carry;
  const sold = Math.max(0, Math.min(Math.floor(units), Math.floor(st.wood), Math.ceil(excess)));
  const carry = sold < Math.floor(units) ? 0 : units - Math.floor(units);
  if (sold === 0) return { ...st, manager: { ...st.manager, carry } };
  const earned = sold * st.sellPrice * moneyMult(st, now) * (1 + toolFx(st).woodSalePct);
  st = { ...st, wood: st.wood - sold, soldToday: st.soldToday + sold };
  st = addMoney(bump(st, 'woodSold', sold), earned);
  st = recordSale(st, 'wood', sold, earned, now);
  const m = st.manager;
  return { ...st, manager: { ...m, carry, soldToday: m.soldToday + sold, moneyToday: m.moneyToday + earned, soldTotal: m.soldTotal + sold, moneyTotal: m.moneyTotal + earned } };
}

/** Manager collects the Welcome Back Money for you (1x). A video can still add the 2x bonus on top. */
export function managerCollect(s: GameState, r: OfflineResult): { state: GameState; result: OfflineResult } {
  if (!s.manager.hired || !s.manager.on || r.collectedBy) return { state: s, result: r };
  const st = collectOffline(s, r, 1);
  return { state: { ...st, manager: { ...st.manager, collectedToday: st.manager.collectedToday + r.earned } }, result: { ...r, collectedBy: 'manager' } };
}

/** Optional video bonus after the manager already collected: adds the second 1x. */
export function collectOfflineBonus(s: GameState, r: OfflineResult): GameState {
  return addMoney(s, r.earned);
}
