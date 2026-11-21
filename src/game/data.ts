// Game data from GAME_SPEC.md. Numbers marked "BALANCE" are not in the spec yet
// and are placeholders for Muse to tune.

export interface Axe {
  id: string;
  name: string;
  cost: number; // Money
  power: number; // wood per chop
  wearEvery: number; // loses 1% durability every N chops
  repairCost: number; // Money for a full 0% -> 100% repair
  head: string; // colour of the axe head in the UI
}

// Spec section 5, with Balance v2 (harder pacing): all prices +20%, Stone and Iron a bit more,
// Rusty Axe starts at 0.8 wood per chop. Wear: Rusty 20 and Iron 15 from the spec, rest BALANCE.
// Repair: spec examples +20% (Rusty $12, Iron $90), rest BALANCE.
export const AXES: Axe[] = [
  { id: 'rusty', name: 'Rusty Axe', cost: 0, power: 0.8, wearEvery: 20, repairCost: 12, head: '#9c6b4e' },
  { id: 'stone', name: 'Stone Axe', cost: 75, power: 2, wearEvery: 18, repairCost: 30, head: '#8d939a' },
  { id: 'iron', name: 'Iron Axe', cost: 350, power: 5, wearEvery: 15, repairCost: 90, head: '#b9c2cc' },
  { id: 'steel', name: 'Steel Axe', cost: 1_200, power: 12, wearEvery: 12, repairCost: 240, head: '#d7e1ea' },
  { id: 'titanium', name: 'Titanium Axe', cost: 6_000, power: 30, wearEvery: 10, repairCost: 720, head: '#9fb7d0' },
  { id: 'diamond', name: 'Diamond Axe', cost: 30_000, power: 75, wearEvery: 8, repairCost: 2_400, head: '#7fe3f0' },
  { id: 'mythic', name: 'Mythic Golden Axe', cost: 120_000, power: 200, wearEvery: 6, repairCost: 7_200, head: '#f5c542' },
];

export const CRIT_CHANCE = 0.1; // spec: 10%
export const CRIT_MULT = 5; // spec: 5x wood

// Trees on the Chop screen
export const CHOPS_PER_TREE = 18; // BALANCE
export const FELL_BONUS_CHOPS = 3; // felling a tree gives 3 chops worth of bonus wood. BALANCE
export const GOLDEN_TREE_CHANCE = 0.002; // spec: 0.2% when a new tree grows
export const GOLDEN_TREE_SECONDS = 60; // spec
export const GOLDEN_GOLD_MIN = 3; // spec
export const GOLDEN_GOLD_MAX = 10; // spec
export const GOLDEN_MONEY_PER_POWER = 25; // bonus Money = 25 x axe power. BALANCE

// Selling wood (simple first version of the Market, spec section 9)
export const MARKET_BASE_PRICE = 0.12; // $ per wood at normal demand. Tuned so the Stone Axe takes ~5 min. BALANCE
// Price slider goes from 20% to 300% of market price
export const PRICE_MIN_FACTOR = 0.2;
export const PRICE_MAX_FACTOR = 3;
// Sales fall off as price goes over market price. Fits the spec example:
// 2x price sells ~30%, half price sells ~2x.
export const PRICE_SENSITIVITY = 1.2;
export const BUYERS_PER_WOOD_IN_STOCK = 0.02; // more wood in the yard draws more buyers. BALANCE
export const OFFLINE_MAX_HOURS = 8; // BALANCE

// Empire ranks (spec section 10). Thresholds are total Money earned, +20% in Balance v2. BALANCE
export const RANKS = [
  { name: 'Solo Lumberjack', at: 0 },
  { name: 'Sawmill Owner', at: 1_200 },
  { name: 'Logging Company', at: 30_000 },
  { name: 'Timber Business', at: 300_000 },
  { name: 'Lumber Empire', at: 1_200_000 },
  { name: 'Global Timber Tycoon', at: 12_000_000 },
];

export const VIP_DAILY_GOLD = 100; // spec
export const VIP_MONEY_MULT = 2; // spec: 2x earnings

// ---------------- App Store products (spec section 3) ----------------

export interface Grant {
  gold?: number;
  skins?: string[];
  axeId?: string; // a Money axe tier, e.g. Diamond Axe
  exclusiveAxes?: string[]; // Gold-only axes like the Dragon Axe
  woodBoost?: { mult: number; hours: number };
  moneyBoost?: { mult: number; hours: number };
  helpers?: number; // stored now, handed out when the Helpers tab is built
  buildings?: string[]; // stored now, handed out when Buildings are built
  land?: string[]; // stored now, handed out when the Land tab is built
  noAds?: boolean;
}

export type ProductKind = 'gold' | 'pack' | 'vip';

export interface ShopProduct {
  id: string;
  kind: ProductKind;
  title: string;
  usd: string; // shown until Apple's real local price loads
  perks: string[];
  badge?: string;
  grant: Grant;
}

export const PRODUCTS: ShopProduct[] = [
  // Gold packs (consumable)
  { id: 'com.lumberempire.gold100', kind: 'gold', title: '100 Gold', usd: '$0.99', perks: [], grant: { gold: 100 } },
  { id: 'com.lumberempire.gold550', kind: 'gold', title: '550 Gold', usd: '$4.99', perks: [], grant: { gold: 550 } },
  { id: 'com.lumberempire.gold1200', kind: 'gold', title: '1,200 Gold', usd: '$9.99', perks: [], badge: 'Popular', grant: { gold: 1200 } },
  { id: 'com.lumberempire.gold3000', kind: 'gold', title: '3,000 Gold', usd: '$19.99', perks: [], grant: { gold: 3000 } },
  { id: 'com.lumberempire.gold7000', kind: 'gold', title: '7,000 Gold', usd: '$49.99', perks: [], grant: { gold: 7000 } },
  { id: 'com.lumberempire.gold15000', kind: 'gold', title: '15,000 Gold', usd: '$99.99', perks: [], badge: 'Best Value', grant: { gold: 15000 } },

  // One-time packs (non-consumable)
  {
    id: 'com.lumberempire.starterpack', kind: 'pack', title: 'Starter Pack', usd: '$4.99', badge: 'Best for new players',
    perks: ['500 Gold', 'Steel Axe skin', '2x Wood for 24 hours'],
    grant: { gold: 500, skins: ['steel-axe-skin'], woodBoost: { mult: 2, hours: 24 } },
  },
  {
    id: 'com.lumberempire.propack', kind: 'pack', title: 'Pro Logger Pack', usd: '$19.99',
    perks: ['2,500 Gold', 'Diamond Axe', '3 helpers', '2x Money for 7 days'],
    grant: { gold: 2500, axeId: 'diamond', helpers: 3, moneyBoost: { mult: 2, hours: 24 * 7 } },
  },
  {
    id: 'com.lumberempire.megapack', kind: 'pack', title: 'Empire Pack', usd: '$49.99',
    perks: ['7,000 Gold', 'Dragon Axe', 'Sawmill', '5x Wood for 7 days'],
    grant: { gold: 7000, exclusiveAxes: ['dragon'], buildings: ['sawmill'], woodBoost: { mult: 5, hours: 24 * 7 } },
  },
  {
    id: 'com.lumberempire.landpack', kind: 'pack', title: 'Land Baron Pack', usd: '$29.99',
    perks: ['Redwood Forest unlocked', '1,000 Gold', '10 helpers'],
    grant: { gold: 1000, land: ['redwood'], helpers: 10 },
  },
  {
    id: 'com.lumberempire.noads', kind: 'pack', title: 'Remove Ads', usd: '$4.99',
    perks: ['Removes all ads forever'], grant: { noAds: true },
  },

  // Subscriptions
  {
    id: 'com.lumberempire.vip.monthly', kind: 'vip', title: 'VIP Tycoon Monthly', usd: '$9.99 / month',
    perks: ['2x earnings', '100 free Gold every day', 'Exclusive VIP axe', 'No ads'], grant: {},
  },
  {
    id: 'com.lumberempire.vip.yearly', kind: 'vip', title: 'VIP Tycoon Yearly', usd: '$59.99 / year', badge: 'Save 50%',
    perks: ['2x earnings', '100 free Gold every day', 'Exclusive VIP axe', 'No ads'], grant: {},
  },
];

export const VIP_ENTITLEMENT = 'vip'; // RevenueCat entitlement id
export const VIP_PRODUCT_IDS = PRODUCTS.filter((p) => p.kind === 'vip').map((p) => p.id);

export function productById(id: string) {
  return PRODUCTS.find((p) => p.id === id);
}

// ---------------- Prices for parts not built yet (Balance v2, all +20%) ----------------
// Kept here so the whole economy lives in one file. Output numbers are unchanged from the spec.

export const PACING_TARGETS = {
  firstAxeMinutes: 5,
  firstHelperMinutes: 20,
  firstLandMinutes: 60,
  firstWorkshopMinutes: 120,
};

export const HELPERS = [
  { id: 'apprentice', name: 'Apprentice Helper', cost: 180, woodPerSec: 2 },
  { id: 'lumberjack', name: 'Lumberjack Helper', cost: 600, woodPerSec: 5 },
  { id: 'veteran', name: 'Veteran Logger', cost: 2_400, woodPerSec: 15 },
  { id: 'feller', name: 'Tree Feller Pro', cost: 12_000, woodPerSec: 50 },
  { id: 'master', name: 'Master Lumberjack', cost: 60_000, woodPerSec: 200 },
  { id: 'crew', name: 'Elite Logging Crew', cost: 300_000, woodPerSec: 1_000 },
];

export const TOOLS = [
  { id: 'stone', name: 'Sharpening Stone', cost: 120 },
  { id: 'handsaw', name: 'Hand Saw', cost: 360 },
  { id: 'handle', name: 'Heavy Duty Axe Handle', cost: 960 },
  { id: 'chainsaw', name: 'Chainsaw', cost: 1_800 },
  { id: 'splitter', name: 'Log Splitter', cost: 6_000 },
  { id: 'chipper', name: 'Wood Chipper', cost: 14_400 },
  { id: 'truck', name: 'Logging Truck', cost: 30_000 },
  { id: 'crane', name: 'Crane', cost: 90_000 },
  { id: 'harvester', name: 'Harvester Machine', cost: 240_000 },
];

export const LAND = [
  { id: 'clearing', name: 'Small Clearing', cost: 1_200, trees: 10, woodPerSec: 5 },
  { id: 'pine', name: 'Pine Grove', cost: 6_000, trees: 25, woodPerSec: 20 },
  { id: 'hillside', name: 'Hillside Forest', cost: 24_000, trees: 50, woodPerSec: 75 },
  { id: 'river', name: 'River Valley Forest', cost: 90_000, trees: 100, woodPerSec: 250 },
  { id: 'redwood', name: 'Redwood Forest', cost: 300_000, trees: 250, woodPerSec: 800 },
  { id: 'mountain', name: 'Mountain Timberland', cost: 1_200_000, trees: 500, woodPerSec: 3_000 },
];

export const WORKSHOPS = [
  { id: 'shed', name: 'Backyard Shed', cost: 600, slots: 1 },
  { id: 'trailer', name: 'Work Trailer', cost: 3_000, slots: 2 },
  { id: 'workshop', name: 'Small Workshop', cost: 12_000, slots: 3 },
  { id: 'shop', name: 'Lumber Shop', cost: 48_000, slots: 4 },
  { id: 'warehouse', name: 'Warehouse', cost: 180_000, slots: 5 },
  { id: 'factory', name: 'Furniture Factory', cost: 600_000, slots: 6 },
  { id: 'plant', name: 'Timber Plant', cost: 1_800_000, slots: 8 },
  { id: 'hub', name: 'Global Manufacturing Hub', cost: 6_000_000, slots: 10 },
];
