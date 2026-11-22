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
  { id: 'stone', name: 'Stone Axe', cost: 82, power: 2, wearEvery: 18, repairCost: 30, head: '#8d939a' },
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
export const GOLDEN_TREE_CHANCE = 0.005; // update 3: 1 in 200 new trees (was 1 in 500)
export const GOLDEN_TREE_SECONDS = 60; // spec
export const GOLDEN_GOLD_MIN = 5; // update 3 (was 3)
export const GOLDEN_GOLD_MAX = 15; // update 3 (was 10)
export const GOLDEN_MONEY_PER_POWER = 25; // bonus Money = 25 x axe power. BALANCE

// Selling (update 2): everything sells at the market price, set by the game. No price slider.
export const MARKET_BASE_PRICE = 0.1; // $ per wood at normal demand. Re-tuned in Part 5 after the demand fix. BALANCE
export const OFFLINE_MAX_HOURS = 8; // spec Part 3: keep 8 hour cap
export const OFFLINE_RATE = 0.5; // spec Part 3: helpers and land work at 50% while you are away

// Empire ranks (spec section 10). Total Money earned, all time. Top rank matches prestige at $200M (Part 4).
export const RANKS = [
  { name: 'Solo Lumberjack', at: 0 },
  { name: 'Sawmill Owner', at: 1_200 },
  { name: 'Logging Company', at: 30_000 },
  { name: 'Timber Business', at: 300_000 },
  { name: 'Lumber Empire', at: 1_200_000 },
  { name: 'Timber Magnate', at: 12_000_000 },
  { name: 'National Lumber Co.', at: 40_000_000 },
  { name: 'International Timber Group', at: 100_000_000 },
  { name: 'Global Timber Tycoon', at: 200_000_000 },
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
  land?: string[]; // old pack design, no longer used
  landIfMissing?: { id: string; elseGold: number }; // Land Baron Pack
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
    perks: ['2,500 Gold', 'Diamond Axe skin (looks only, keeps your axe stats)', '2x Money for 7 days'],
    grant: { gold: 2500, skins: ['diamond-axe-skin'], moneyBoost: { mult: 2, hours: 24 * 7 } },
  },
  {
    id: 'com.lumberempire.megapack', kind: 'pack', title: 'Empire Pack', usd: '$49.99',
    perks: ['7,000 Gold', 'Dragon Axe', 'Sawmill', '5x Wood for 7 days'],
    grant: { gold: 7000, exclusiveAxes: ['dragon'], buildings: ['sawmill'], woodBoost: { mult: 5, hours: 24 * 7 } },
  },
  {
    id: 'com.lumberempire.landpack', kind: 'pack', title: 'Land Baron Pack', usd: '$29.99',
    perks: ['1,000 Gold', '2x Wood for 7 days', 'Small Clearing land (or +500 Gold if you own it)'],
    grant: { gold: 1000, woodBoost: { mult: 2, hours: 24 * 7 }, landIfMissing: { id: 'clearing', elseGold: 500 } },
  },
  {
    id: 'com.lumberempire.noads', kind: 'pack', title: 'Remove Ads', usd: '$4.99',
    perks: ['No ads ever: video rewards become instant'], grant: { noAds: true },
  },

  // Subscriptions
  {
    id: 'com.lumberempire.vip.monthly', kind: 'vip', title: 'VIP Tycoon Monthly', usd: '$4.99 / month',
    perks: ['2x earnings', '100 free Gold every day', 'Exclusive VIP cosmetics', 'No ads: video rewards are instant'], grant: {},
  },
  {
    id: 'com.lumberempire.vip.yearly', kind: 'vip', title: 'VIP Tycoon Yearly', usd: '$39.99 / year', badge: 'Save 33%',
    perks: ['2x earnings', '100 free Gold every day', 'Exclusive VIP cosmetics', 'No ads: video rewards are instant'], grant: {},
  },
];

export const VIP_ENTITLEMENT = 'vip'; // RevenueCat entitlement id
export const VIP_PRODUCT_IDS = PRODUCTS.filter((p) => p.kind === 'vip').map((p) => p.id);

export function productById(id: string) {
  return PRODUCTS.find((p) => p.id === id);
}

// ======================= PART 2: helpers, land, workshop =======================
// Prices from GAME_SPEC section 16 (Balance v2 for Part 2). Output numbers unchanged from the spec.

export const PACING_TARGETS = { firstAxeMinutes: 5, firstHelperMinutes: 20, firstLandMinutes: 60, firstWorkshopMinutes: 120 };

export type WoodType = 'pine' | 'oak' | 'maple' | 'redwood' | 'spruce';
export const WOOD_NAMES: Record<WoodType, string> = { pine: 'Pine', oak: 'Oak', maple: 'Maple', redwood: 'Redwood', spruce: 'Spruce' };
export const HOME_WOOD: WoodType = 'pine'; // your own trees and your helpers chop pine

export interface HelperDef { id: string; name: string; cost: number; woodPerSec: number; icon: string }
export const HELPERS: HelperDef[] = [
  { id: 'apprentice', name: 'Apprentice Helper', cost: 400, woodPerSec: 2, icon: '🧒' },
  { id: 'lumberjack', name: 'Lumberjack Helper', cost: 1_500, woodPerSec: 5, icon: '🧔' },
  { id: 'veteran', name: 'Veteran Logger', cost: 6_000, woodPerSec: 7.5, icon: '👷' },
  { id: 'feller', name: 'Tree Feller Pro', cost: 30_000, woodPerSec: 15, icon: '🦺' },
  { id: 'master', name: 'Master Lumberjack', cost: 150_000, woodPerSec: 38, icon: '🧙' },
  { id: 'crew', name: 'Elite Logging Crew', cost: 750_000, woodPerSec: 94, icon: '🚜' },
];
export const HELPER_COPY_SCALE = 1.1; // update 2 (Playbook 1): each extra copy costs 10% more. BALANCE
export const HELPER_MAX_LEVEL = 10; // spec
export const HELPER_LEVEL_BONUS = 0.25; // spec: +25% output per level
export const HELPER_LEVEL_COST_BASE = 1.0; // level 1 costs 1x the hire price... BALANCE
export const HELPER_LEVEL_COST_GROWTH = 1.15; // update 2 (Playbook 1): ...and each level after costs 10% more. BALANCE

export type Personality = 'flexible' | 'stubborn' | 'desperate' | 'greedy';
export const PERSONALITY: Record<Personality, { label: string; blurb: string; minLo: number; minHi: number }> = {
  flexible: { label: 'Flexible Seller', blurb: 'Accepts close to asking', minLo: 0.85, minHi: 0.95 },
  stubborn: { label: 'Stubborn Seller', blurb: 'Wants full price or more', minLo: 1.0, minHi: 1.08 },
  desperate: { label: 'Desperate Seller', blurb: 'Will take a low offer', minLo: 0.6, minHi: 0.75 },
  greedy: { label: 'Greedy Seller', blurb: 'Always counters high', minLo: 0.92, minHi: 1.02 },
};
export const SELLER_NAMES = [
  'Old Man Jenkins', 'Martha Hollis', 'Dale Pruitt', 'Rosie Kincaid', 'Hank Bodine', 'Lorna Fisk', 'Earl Tibbets',
  'June Calloway', 'Walt Breckner', 'Ida Sorensen', 'Cyrus Moody', 'Nell Avery',
];

export interface LandDef {
  id: string; name: string; asking: number; acres: number; trees: number; woodPerSec: number; wood: WoodType; icon: string;
  goldOnly?: boolean;
}
// Asking prices are 3x the first draft (section 16). Seller secret minimums scale with the asking price.
export const LAND: LandDef[] = [
  { id: 'clearing', name: 'Small Clearing', asking: 3_000, acres: 2, trees: 10, woodPerSec: 5, wood: 'pine', icon: '🌱' },
  { id: 'pine', name: 'Pine Grove', asking: 15_000, acres: 6, trees: 25, woodPerSec: 20, wood: 'pine', icon: '🌲' },
  { id: 'hillside', name: 'Hillside Forest', asking: 60_000, acres: 15, trees: 50, woodPerSec: 38, wood: 'oak', icon: '⛰️' },
  { id: 'river', name: 'River Valley Forest', asking: 225_000, acres: 40, trees: 100, woodPerSec: 107, wood: 'maple', icon: '🏞️' },
  { id: 'redwood', name: 'Redwood Forest', asking: 750_000, acres: 120, trees: 250, woodPerSec: 268, wood: 'redwood', icon: '🌳' },
  { id: 'mountain', name: 'Mountain Timberland', asking: 3_000_000, acres: 400, trees: 500, woodPerSec: 765, wood: 'spruce', icon: '🏔️' },
  // Section 24: bigger late-game forests (more land to buy)
  { id: 'oldgrowth', name: 'Old Growth Ridge', asking: 10_000_000, acres: 1_200, trees: 1_200, woodPerSec: 1_912, wood: 'oak', icon: '🌄' },
  { id: 'northwoods', name: 'Great Northwoods', asking: 30_000_000, acres: 4_000, trees: 3_000, woodPerSec: 4_590, wood: 'maple', icon: '🍁' },
  { id: 'rainforest', name: 'Coastal Rainforest', asking: 90_000_000, acres: 12_000, trees: 8_000, woodPerSec: 11_475, wood: 'redwood', icon: '🌴' },
];
export const LAND_UPGRADES = [
  { id: 'plant', name: 'Plant Trees', costFrac: 0.25, bonus: 0.2 },
  { id: 'fert', name: 'Fertilizer', costFrac: 0.4, bonus: 0.3 },
  { id: 'irrig', name: 'Irrigation', costFrac: 0.6, bonus: 0.5 },
  { id: 'road', name: 'Logging Road', costFrac: 1.0, bonus: 0.75 },
  { id: 'nursery', name: 'Tree Nursery', costFrac: 1.6, bonus: 1.0 },
]; // BALANCE. Section 24 added the last two.
// Section 24: manual selling
// Update 2: Golden Log. Spawns every 3 to 5 minutes, glows for 60 seconds; tap it for a Frenzy.
export const GOLDEN_LOG_EVERY_MIN: [number, number] = [3, 5];
export const GOLDEN_LOG_LASTS_SEC = 60;
export const FRENZY_SEC = 30;
export const FRENZY_MULT = 7; // 7x wood/sec from helpers and land while it lasts
export const YARD_SELLER_COST = 1_500; // cash helper that sells wood and planks for you at your price
export const LOST_BID_PENALTY = 0.05; // update 2: lose 5% of your Money only when you bid in an auction and a rival wins
export const SELLER_WALKAWAY_HOURS = 24; // spec
export const MAX_REJECTIONS = 3; // spec

export interface WorkshopDef { id: string; name: string; cost: number; slots: number; speed: number; buildMinutes: number; icon: string }
// Shed stays $600 but needs your first land. Others are 2x the first draft (section 16).
export const WORKSHOPS: WorkshopDef[] = [
  { id: 'shed', name: 'Backyard Shed', cost: 600, slots: 1, speed: 1, buildMinutes: 60, icon: '🛖' }, // 60 min build puts the first workshop near 2 hours
  { id: 'trailer', name: 'Work Trailer', cost: 5_000, slots: 2, speed: 1.25, buildMinutes: 30, icon: '🚐' },
  { id: 'workshop', name: 'Small Workshop', cost: 20_000, slots: 3, speed: 1.5, buildMinutes: 60, icon: '🏚️' },
  { id: 'shop', name: 'Lumber Shop', cost: 80_000, slots: 4, speed: 2, buildMinutes: 120, icon: '🏪' },
  { id: 'warehouse', name: 'Warehouse', cost: 300_000, slots: 5, speed: 2.5, buildMinutes: 240, icon: '🏬' },
  { id: 'factory', name: 'Furniture Factory', cost: 1_000_000, slots: 6, speed: 3, buildMinutes: 480, icon: '🏭' },
  { id: 'plant', name: 'Timber Plant', cost: 3_000_000, slots: 8, speed: 4, buildMinutes: 720, icon: '🏗️' },
  { id: 'hub', name: 'Global Manufacturing Hub', cost: 10_000_000, slots: 10, speed: 6, buildMinutes: 1440, icon: '🌐' },
]; // buildMinutes, slots and speed are BALANCE except slots (spec)

export interface ItemDef { id: string; name: string; tier: number; wood: number; minutes: number; value: number; icon: string }
const ITEM_NAMES: [string, string][][] = [
  [['stool', 'Wooden Stool'], ['birdhouse', 'Birdhouse'], ['chair', 'Wooden Chair']],
  [['smalltable', 'Small Table'], ['bench', 'Bench'], ['crate', 'Wooden Crate']],
  [['coffeetable', 'Coffee Table'], ['bookshelf', 'Bookshelf'], ['bedframe', 'Bed Frame']],
  [['diningtable', 'Dining Table'], ['cabinet', 'Cabinet'], ['desk', 'Office Desk']],
  [['diningset', 'Large Dining Set'], ['wardrobe', 'Wardrobe'], ['gardenset', 'Garden Bench Set']],
  [['sculpture', 'Wood Sculpture'], ['luxchair', 'Luxury Chair'], ['carvedtable', 'Carved Table']],
  [['artsculpture', 'Art Sculpture'], ['luxbed', 'Luxury Bed Set'], ['designer', 'Designer Furniture']],
  [['masterpiece', 'Masterpiece Sculpture'], ['royalset', 'Royal Furniture Set'], ['customart', 'Custom Art Piece']],
];
// Update 3: furniture is drawn (art/Furniture.tsx), no emoji.
// Each tier: more wood and time, more profit per wood. BALANCE
export const ITEMS: ItemDef[] = ITEM_NAMES.flatMap((tier, t) =>
  tier.map(([id, name], k) => {
    const wood = Math.round(20 * Math.pow(3, t) * (1 + k * 0.8));
    return {
      id, name, tier: t, wood,
      minutes: Math.round((2 + k * 1.5) * Math.pow(1.6, t)),
      value: Math.round(wood * MARKET_BASE_PRICE * 2.5 * Math.pow(1.25, t)),
      icon: '',
    };
  }),
);
export const GOLD_PER_MINUTE_SKIP = 1 / 3; // speed-ups cost 1 Gold per 3 minutes left, min 1. BALANCE

// ======================= PART 3: money and retention =======================

// Rewarded videos (opt-in only)
export const AD_GOLD_PER_VIDEO = 5; // BALANCE
export const AD_GOLD_VIDEOS_PER_DAY = 5; // spec
export const AD_BOOST_MINUTES = 30; // spec: 2x production for 30 minutes
export const AD_BOOST_MAX_MINUTES = 240; // watching again adds 30 min, up to 4 hours. BALANCE
export const AD_OFFLINE_MULT = 2; // spec

// Gold shop: sell time, not power. Prices BALANCE.
export const GOLD_SHOP = [
  { id: 'wood1h', title: '2x Wood for 1 hour', gold: 20, kind: 'wood' as const, hours: 1 },
  { id: 'wood24h', title: '2x Wood for 24 hours', gold: 150, kind: 'wood' as const, hours: 24 },
  { id: 'money1h', title: '2x Money for 1 hour', gold: 20, kind: 'money' as const, hours: 1 },
];
export const GOLD_REPAIR_ALL = 10; // spec: repairs the axe and every tool

// 7-day login rewards. Money is "minutes of your income". BALANCE
// Update 3: escalating 7-day calendar. Day 7 is the big anchor: 50 Gold plus a rare cosmetic.
// money = minutes of income, boostMin = minutes of 2x wood.
export const DAILY_REWARDS: { money?: number; gold?: number; boostMin?: number; big?: boolean; cosmetic?: boolean }[] = [
  { money: 10 },
  { gold: 5 },
  { money: 30 },
  { boostMin: 30, gold: 5 },
  { money: 60 },
  { gold: 10, boostMin: 60 },
  { gold: 50, money: 120, cosmetic: true, big: true },
];

export type Metric = 'chops' | 'felled' | 'woodSold' | 'moneyEarned' | 'helpersHired' | 'itemsCrafted' | 'landOffers' | 'upgrades' | 'offlineCollects';
export interface QuestDef { id: string; metric: Metric; label: (n: string) => string; base: number; scale?: 'income'; needs?: 'workshop' | 'helpers' }
// Update 3 (Playbook 2): 3 small quests a day, each doable in one session, 5 Gold each.
export const DAILY_QUESTS: QuestDef[] = [
  { id: 'chop', metric: 'chops', label: (n) => `Chop ${n} logs`, base: 500 },
  { id: 'upgrade', metric: 'upgrades', label: (n) => `Upgrade ${n} machines`, base: 3 },
  { id: 'offline', metric: 'offlineCollects', label: (n) => `Collect ${n} offline payouts`, base: 2 },
];
export const WEEKLY_QUESTS: QuestDef[] = [
  { id: 'wchop', metric: 'chops', label: (n) => `Chop ${n} times this week`, base: 3_000 },
  { id: 'wearn', metric: 'moneyEarned', label: (n) => `Earn ${n} this week`, base: 400, scale: 'income' },
  { id: 'wfell', metric: 'felled', label: (n) => `Cut down ${n} trees this week`, base: 150 },
];
export const DAILY_QUEST_GOLD = 5; // update 3
export const DAILY_QUEST_MONEY_MIN = 15; // minutes of income. BALANCE
export const WEEKLY_QUEST_GOLD = 25; // update 3: plus a bigger reward (2 hours of 2x wood and 1 hour of income)
export const WEEKLY_QUEST_BOOST_HOURS = 2;
export const WEEKLY_QUEST_MONEY_MIN = 60;

// Timber Rush (update 3): the 48-hour weekend event, 1.5x output on one wood type plus a limited order board
export const RUSH_DAYS = [6, 0]; // Sat, Sun
export const RUSH_BONUS = 0.5; // +50% (1.5x), added to other boosts
export const RUSH_ORDERS = 3; // extra event orders each event day
export const RUSH_ORDER_PRICE: [number, number] = [1.3, 1.6]; // x market price

// Prestige (spec: after about $1M; Part 3: reachable in 2-4 days, run 2 about 2-4x faster)
export const PRESTIGE_AT = 200_000_000; // Money earned this run. About 2.8 days of normal play in npm run pacing. BALANCE
export const PRESTIGE_NAME = 'Timber Baron';
export const PRESTIGE_GOLD = 20; // update 3: Gold for every prestige, on top of the multiplier

// Update 3: helper milestones. Every 25 of one helper type pays 10 Gold, once per milestone.
export const HELPER_MILESTONE_EVERY = 25;
export const HELPER_MILESTONE_GOLD = 10;

// Update 3: cosmetics. Gold only, looks only (never stats), kept forever through prestige.
export type CosmeticKind = 'tree' | 'axe' | 'bg';
export interface CosmeticDef { id: string; kind: CosmeticKind; name: string; gold: number; rare?: boolean }
export const COSMETICS: CosmeticDef[] = [
  { id: 'tree-pine', kind: 'tree', name: 'Pine', gold: 0 },
  { id: 'tree-redwood', kind: 'tree', name: 'Redwood', gold: 100 },
  { id: 'tree-golden', kind: 'tree', name: 'Golden Tree', gold: 250 },
  { id: 'tree-snowy', kind: 'tree', name: 'Snowy Pine', gold: 200 },
  { id: 'tree-autumn', kind: 'tree', name: 'Autumn Maple', gold: 200 },
  { id: 'tree-cherry', kind: 'tree', name: 'Cherry Blossom', gold: 0, rare: true },
  { id: 'axe-rusty', kind: 'axe', name: 'Rusty look', gold: 0 },
  { id: 'axe-steelblue', kind: 'axe', name: 'Steel Blue', gold: 50 },
  { id: 'axe-golden', kind: 'axe', name: 'Golden Axe', gold: 150 },
  { id: 'axe-fire', kind: 'axe', name: 'Fire Axe', gold: 200 },
  { id: 'axe-diamond', kind: 'axe', name: 'Diamond Shine', gold: 300 },
  { id: 'axe-frost', kind: 'axe', name: 'Frost Axe', gold: 0, rare: true },
  { id: 'bg-forest', kind: 'bg', name: 'Forest', gold: 0 },
  { id: 'bg-mountains', kind: 'bg', name: 'Mountains', gold: 150 },
  { id: 'bg-sunset', kind: 'bg', name: 'Sunset', gold: 250 },
  { id: 'bg-night', kind: 'bg', name: 'Night Sky', gold: 250 },
  { id: 'bg-snowy', kind: 'bg', name: 'Snowy Mountains', gold: 400 },
  { id: 'bg-aurora', kind: 'bg', name: 'Northern Lights', gold: 0, rare: true },
];
export const RARE_COSMETICS = ['tree-cherry', 'axe-frost', 'bg-aurora']; // Day 7 rewards, in this order
export const RARE_EXTRA_GOLD = 25; // Day 7 when you already own every rare cosmetic

// Update 3: a new system every 1 to 3 hours of early play (minutes of active play). Each one adds a new decision.
export type SystemId = 'land' | 'workshop' | 'market' | 'sawmill' | 'auctions' | 'manager';
export const SYSTEMS: { id: SystemId; name: string; minutes: number; why: string }[] = [
  { id: 'land', name: 'Land deals', minutes: 45, why: 'Haggle with sellers: offer low and risk a no, or pay up.' },
  { id: 'workshop', name: 'Workshop', minutes: 45, why: 'Turn wood into furniture, or sell it raw?' },
  { id: 'market', name: 'Market and Yard Seller', minutes: 120, why: 'Planks or wood, bulk orders, and automatic selling.' },
  { id: 'sawmill', name: 'Sawmill', minutes: 210, why: 'Cut planks at scale: wood now or planks later?' },
  { id: 'auctions', name: 'Land auctions', minutes: 300, why: 'Bid against rivals. Lose and you pay 5%.' },
  { id: 'manager', name: 'Manager', minutes: 420, why: 'Pay a wage to sell for you when the yard fills.' },
];

// Push notifications
export const NOTIF_QUIET_START = 21; // 9pm
export const NOTIF_QUIET_END = 9; // 9am

// ======================= PART 4: tools, wages, storage =======================

export const AXE_SKINS: Record<string, { name: string; head: string }> = {
  'steel-axe-skin': { name: 'Steel', head: '#d7e1ea' },
  'diamond-axe-skin': { name: 'Diamond', head: '#7fe3f0' },
};

export interface ToolDef {
  id: string; name: string; cost: number; icon: string; effect: string;
  chopPct?: number; // more wood per player chop
  chopFlat?: number; // + wood per player chop
  helperPct?: number; // more wood from helpers
  passiveFlat?: number; // + wood/sec
  needsHelpers?: boolean; // only works if you have helpers
  woodSalePct?: number; // more Money from selling wood
  plankSalePct?: number; // more Money from selling planks
  goldCost?: number; // can also be bought instantly with Gold
  fellsTrees?: boolean; // each chop fells the whole tree
  wearChops?: number; // loses 1% every N player chops
  wearMinutes?: number; // loses 1% every N minutes while working
  repairCost: number; // Money for 0% -> 100%
}
// Section 7 prices +20% (Balance v2). Wear: Chainsaw 10 chops and Harvester 5 uses are from the spec.
// Repair: Chainsaw $300, Logging Truck $1,200, Harvester $6,000 are spec examples +20%. Everything else BALANCE.
export const TOOLS: ToolDef[] = [
  { id: 'sharpstone', name: 'Sharpening Stone', cost: 120, icon: '🪨', effect: '+10% wood per chop', chopPct: 0.1, wearChops: 25, repairCost: 24 },
  { id: 'handsaw', name: 'Hand Saw', cost: 360, icon: '🪚', effect: '+1 wood per chop', chopFlat: 1, wearChops: 20, repairCost: 60 },
  { id: 'handle', name: 'Heavy Duty Axe Handle', cost: 960, icon: '🦯', effect: '+20% chop speed (you and helpers)', chopPct: 0.2, helperPct: 0.2, wearChops: 20, wearMinutes: 20, repairCost: 150 },
  { id: 'chainsaw', name: 'Chainsaw', cost: 1_800, icon: '⚙️', effect: '+5 wood per chop, +20% chop speed', chopFlat: 5, chopPct: 0.2, helperPct: 0.2, wearChops: 10, wearMinutes: 15, repairCost: 300 },
  { id: 'splitter', name: 'Log Splitter', cost: 6_000, icon: '🪓', effect: '2x Money from selling planks', plankSalePct: 1, wearMinutes: 30, repairCost: 720 },
  { id: 'chipper', name: 'Wood Chipper', cost: 14_400, icon: '🌀', effect: '+15% wood from every chop (you and helpers)', chopPct: 0.15, helperPct: 0.15, wearChops: 15, wearMinutes: 20, repairCost: 1_200 },
  { id: 'truck', name: 'Logging Truck', cost: 30_000, icon: '🚚', effect: '+50% Money from selling wood', woodSalePct: 0.5, wearMinutes: 15, repairCost: 1_200 },
  { id: 'crane', name: 'Crane', cost: 90_000, icon: '🏗️', effect: '+100 wood/sec (needs helpers)', passiveFlat: 100, needsHelpers: true, wearMinutes: 15, repairCost: 3_600 },
  { id: 'harvester', name: 'Harvester Machine', cost: 240_000, icon: '🚜', effect: '+500 wood/sec, every chop fells the whole tree', passiveFlat: 500, fellsTrees: true, wearChops: 5, wearMinutes: 10, repairCost: 6_000 },
  // Part 5 (section 19): Money or Gold, never Gold-only. Wear and repair are BALANCE.
  { id: 'goldchainsaw', name: 'Golden Chainsaw', cost: 500_000, goldCost: 1_500, icon: '✨', effect: '+100 wood per chop', chopFlat: 100, wearChops: 8, repairCost: 12_000 },
];

// Helper wages per hour (Part 4), +10% per helper level. Unpaid = helpers at 50% until paid.
export const HELPER_WAGES: Record<string, number> = {
  apprentice: 50, lumberjack: 150, veteran: 500, feller: 1_500, master: 5_000, crew: 20_000,
};
export const WAGE_LEVEL_GROWTH = 0.1;
export const UNPAID_HELPER_SPEED = 0.5;

// Wood storage (Part 4). Starts at 10,000. A full yard caps how fast wood sells, so storage is the main brake on day 2.
export const STORAGE_LEVELS = [
  { cap: 10_000, cost: 0 },
  { cap: 25_000, cost: 390_000 },
  { cap: 60_000, cost: 900_000 },
  { cap: 150_000, cost: 2_340_000 },
  { cap: 400_000, cost: 6_600_000 },
  { cap: 1_000_000, cost: 15_600_000 },
  { cap: 2_500_000, cost: 39_000_000 },
  { cap: 6_000_000, cost: 90_000_000 },
  { cap: 15_000_000, cost: 234_000_000 },
  { cap: 40_000_000, cost: 648_000_000 },
]; // each upgrade costs about 3 hours of the extra wood sales it allows. BALANCE

// ======================= PART 5: Market (section 9) =======================

export type Product = 'wood' | 'planks' | 'furniture';
export const PLANK_BASE_PRICE = 0.25; // $ per plank at normal demand. BALANCE
export const PLANK_WOOD = 2; // wood per plank (a plank also takes 2 spaces in storage). BALANCE
export const PLANK_CUT_PER_SEC = 2; // planks you cut per second while cutting is on. BALANCE

// News events, one per day at most (seeded by date). Multiplies demand.
export const MARKET_EVENTS = [
  { id: 'boom', name: 'Housing Boom', text: 'Builders want lumber. Demand for wood and planks up 50%.', demand: { wood: 1.5, planks: 1.5 } },
  { id: 'fair', name: 'Furniture Fair', text: 'Shoppers are out. Furniture demand up 40%.', demand: { furniture: 1.4 } },
  { id: 'cold', name: 'Cold Snap', text: 'Everyone needs firewood. Wood demand up 30%.', demand: { wood: 1.3 } },
  { id: 'crash', name: 'Market Crash', text: 'Buyers are scared. Demand down 40%: lower your price to sell.', demand: { wood: 0.6, planks: 0.6, furniture: 0.6 } },
  { id: 'reno', name: 'Renovation Craze', text: 'Everyone is remodeling. Plank demand up 60%.', demand: { planks: 1.6 } },
] as const;
export const MARKET_EVENT_CHANCE = 0.35; // chance a day has a news event. BALANCE

// Bulk orders: 2 a day, a buyer wants a big batch at a fixed price. You can accept, reject or ask for 10% more once.
export const BULK_BUYERS = ['BuildRight Homes', 'Cabin Co.', 'Fireside Fuel', 'Maple Street Builders', 'Northwoods Decking', 'Big Sky Framing'];
export const BULK_ORDERS_PER_DAY = 2;
export const BULK_COUNTER_BONUS = 0.1;
export const BULK_COUNTER_CHANCE = 0.5;

// ======================= PART 6: AI rivals and land auctions (section 8) =======================
// Rivals are bots, never real people.
export type RivalStyle = 'fast' | 'sniper' | 'steady' | 'cautious';
export const RIVALS: { name: string; style: RivalStyle; budget: number; blurb: string }[] = [
  { name: 'Timber Titans Inc', style: 'fast', budget: 1.25, blurb: 'Rich and bids fast' },
  { name: 'Redwood Corp', style: 'sniper', budget: 1.15, blurb: 'Waits until the last seconds' },
  { name: 'Big Pine Logging', style: 'steady', budget: 1.0, blurb: 'Bids steady, stops at a fair price' },
  { name: 'Mountain Wood Co.', style: 'cautious', budget: 0.9, blurb: 'Careful, only likes a bargain' },
]; // budget = how far over asking they will go (x0.85 to x1.15 each time). BALANCE

export const AUCTION_CHANCE = 0.4; // share of daily listings that are auctions (never the Small Clearing). BALANCE
export const AUCTION_SECONDS = 60; // spec
export const AUCTION_OUTBID_SECONDS = 10; // spec: after a rival outbids you, you get at least 10 seconds
export const AUCTION_START = 0.5; // opening bid = 50% of asking. BALANCE
export const AUCTION_STEP = 0.02; // each bid is at least +2% of asking. BALANCE
export const RIVAL_FREE_LAND = ['clearing']; // rivals ignore the first small plot so new players are not blocked
// First come, first served: rivals make 1-3 offers over the next hours, then the top one buys if you have not.
export const RIVAL_FIRST_OFFER_MIN = [60, 180]; // minutes after the listing appears. BALANCE
export const RIVAL_BUY_AFTER_MIN = [120, 300]; // minutes after their last offer. BALANCE
export const GOLDEN_CHAINSAW_ID = 'goldchainsaw';

// ======================= PART 7: manager helper =======================
export const MANAGER_COST = 20_000; // Money, one manager for the whole empire
export const MANAGER_SELL_AT = 0.8; // starts selling when the yard is 80% full, sells back down to 80%
export const MANAGER_WAGE = 1_000; // Part 8: $ per hour while he is switched on. Unpaid = he pauses selling and collecting.

// ======================= PART 8: Sawmill (building from section 10, comes with the Empire Pack) =======================
// Turns wood into planks (2 wood each) much faster than Cut planks (2 a second). Upgrades are instant. BALANCE
export const SAWMILL_LEVELS = [
  { level: 1, cost: 25_000, planksPerSec: 10 },
  { level: 2, cost: 100_000, planksPerSec: 25 },
  { level: 3, cost: 400_000, planksPerSec: 60 },
  { level: 4, cost: 1_500_000, planksPerSec: 150 },
  { level: 5, cost: 6_000_000, planksPerSec: 400 },
];
