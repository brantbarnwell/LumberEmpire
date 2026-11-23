// Part 3: daily rewards, quests, video rewards, Gold shop, prestige.
import {
  AD_BOOST_MAX_MINUTES, AD_BOOST_MINUTES, AD_GOLD_PER_VIDEO, AD_GOLD_VIDEOS_PER_DAY, AXES, DAILY_QUESTS, DAILY_QUEST_GOLD,
  DAILY_QUEST_MONEY_MIN, DAILY_REWARDS, GOLD_REPAIR_ALL, GOLD_SHOP, PRESTIGE_AT, QuestDef, WEEKLY_QUESTS, WEEKLY_QUEST_GOLD,
  WEEKLY_QUEST_BOOST_HOURS, WEEKLY_QUEST_MONEY_MIN, PRESTIGE_GOLD, COSMETICS, RARE_COSMETICS, RARE_EXTRA_GOLD, CosmeticKind,
  HELPERS, LAND, LAND_UPGRADES, TOOLS, SAWMILL_LEVELS, WORKSHOPS, YARD_SELLER_COST, MANAGER_COST, RIVALS,
  AD_PILL_COOLDOWN_MIN, AD_BOOST_HOURS_PER_DAY, AD_BOOST_MULT, WELCOME_2X_PER_DAY, TIME_SKIPS_PER_DAY, AD_PILL_UNLOCK_SEC, AD_FREE_INSTANT_PER_DAY, STARTER_PACK_HOURS, PRODUCTS,
} from './data';
import {
  GameState, Quest, addBoost, prodBoostLeftMs, capsToday, addMoney, dayKeyOf, fixEverything, freshRun, hash, incomePerMin, marketPriceFor, repairAllCost,
  weekKeyOf, woodPerMinEstimate, hireCost, levelCost, landUpgradeCost, sawmillNextCost, storageUpgradeCost, systemUnlocked, unitPrice,
  workshopUnlocked,
} from './logic';
import { money as fmtMoney, whole } from './format';

export const EMPIRE_PACK_ID = 'com.lumberempire.megapack';

// ---------- daily login rewards (update 3: miss one day = grace, miss more = drop back one day, never to zero) ----------

function daysBetween(a: string, b: string) {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()) / 86400_000);
}

/** Which calendar day you are on right now, after the grace rule. */
export function loginIndexNow(s: GameState, now: number) {
  if (!s.login.lastClaimDay) return s.login.index;
  const gap = daysBetween(s.login.lastClaimDay, dayKeyOf(now));
  return gap >= 3 ? Math.max(0, s.login.index - 1) : s.login.index;
}

export function canClaimLogin(s: GameState, now: number) {
  return s.login.lastClaimDay !== dayKeyOf(now);
}

/** The rare cosmetic the next Day 7 gives (null = you own them all: extra Gold instead). */
export function nextRareCosmetic(s: GameState) {
  return RARE_COSMETICS.find((id) => !s.cosmetics.owned.includes(id)) ?? null;
}

export function loginRewardText(s: GameState, i: number, now: number) {
  const r = DAILY_REWARDS[i];
  const parts: string[] = [];
  if (r.money) parts.push(fmtMoney(Math.max(5, incomePerMin(s, now) * r.money)));
  if (r.gold) parts.push(`${r.gold} Gold`);
  if (r.boostMin) parts.push(`2x Wood ${r.boostMin} min`);
  if (r.cosmetic) {
    const c = nextRareCosmetic(s);
    parts.push(c ? `rare ${COSMETICS.find((x) => x.id === c)!.name}` : `+${RARE_EXTRA_GOLD} Gold`);
  }
  return parts.join(' + ');
}

export function claimLogin(s: GameState, now: number): GameState | null {
  if (!canClaimLogin(s, now)) return null;
  const index = loginIndexNow(s, now);
  const r = DAILY_REWARDS[index];
  let st: GameState = { ...s, login: { index: (index + 1) % DAILY_REWARDS.length, lastClaimDay: dayKeyOf(now) } };
  if (r.money) st = addMoney(st, Math.max(5, incomePerMin(s, now) * r.money));
  if (r.gold) st = { ...st, gold: st.gold + r.gold };
  if (r.boostMin) st = { ...st, boosts: addBoost(st.boosts, 'wood', 2, r.boostMin / 60, now, 'daily') };
  if (r.cosmetic) {
    const c = nextRareCosmetic(st);
    st = c ? { ...st, cosmetics: { ...st.cosmetics, owned: [...st.cosmetics.owned, c] } } : { ...st, gold: st.gold + RARE_EXTRA_GOLD };
  }
  return st;
}

// ---------- cosmetics (update 3): Gold only, looks only, kept forever ----------

export function buyCosmetic(s: GameState, id: string): GameState | null {
  const c = COSMETICS.find((x) => x.id === id);
  if (!c || c.rare || s.cosmetics.owned.includes(id) || s.gold < c.gold) return null;
  return equipCosmetic({ ...s, gold: s.gold - c.gold, cosmetics: { ...s.cosmetics, owned: [...s.cosmetics.owned, id] } }, id);
}

/** Free, any time. Equipping the default (or the one already on) for axes takes the skin off. */
export function equipCosmetic(s: GameState, id: string): GameState | null {
  const c = COSMETICS.find((x) => x.id === id);
  if (!c || !s.cosmetics.owned.includes(id)) return null;
  const k: CosmeticKind = c.kind;
  if (k === 'tree') return { ...s, cosmetics: { ...s.cosmetics, tree: id } };
  if (k === 'bg') return { ...s, cosmetics: { ...s.cosmetics, bg: id } };
  return { ...s, equippedSkin: null, cosmetics: { ...s.cosmetics, axe: s.cosmetics.axe === id ? null : id } };
}

export function unequipCosmetic(s: GameState, kind: CosmeticKind): GameState {
  if (kind === 'tree') return { ...s, cosmetics: { ...s.cosmetics, tree: 'tree-pine' } };
  if (kind === 'bg') return { ...s, cosmetics: { ...s.cosmetics, bg: 'bg-forest' } };
  return { ...s, equippedSkin: null, cosmetics: { ...s.cosmetics, axe: null } };
}

// ---------- what your money can buy (Welcome Back suggestions) ----------

export type BuyIdea = { label: string; cost: number; tab: 'upgrades' | 'helpers' | 'land' | 'workshop' | 'market' };

/** The best things you can afford with `budget`, best value first (wood/sec per dollar, roughly). */
export function buyIdeas(s: GameState, budget: number, now: number, max = 3): BuyIdea[] {
  const price = Math.max(0.01, unitPrice(s, 'wood', now));
  const opts: (BuyIdea & { value: number })[] = [];
  const nextAxe = AXES[s.axeIndex + 1];
  if (nextAxe) opts.push({ label: nextAxe.name, cost: nextAxe.cost, tab: 'upgrades', value: (nextAxe.power - AXES[s.axeIndex].power) * 1.5 });
  for (const h of HELPERS) {
    const owned = s.helpers[h.id]?.count ?? 0;
    opts.push({ label: `${owned ? 'Another ' : ''}${h.name}`, cost: hireCost(s, h.id), tab: 'helpers', value: h.woodPerSec * (1 + 0.25 * (s.helpers[h.id]?.level ?? 0)) });
    const lc = levelCost(s, h.id);
    if (lc !== null && owned > 0) opts.push({ label: `Level up ${h.name}s`, cost: lc, tab: 'helpers', value: h.woodPerSec * owned * 0.25 });
  }
  for (const l of LAND) if (s.lands[l.id] && systemUnlocked(s, 'land')) {
    for (const u of LAND_UPGRADES) if (!s.lands[l.id].upgrades.includes(u.id)) opts.push({ label: `${u.name} on ${l.name}`, cost: landUpgradeCost(l.id, u.id), tab: 'land', value: l.woodPerSec * u.bonus });
  }
  for (const t of TOOLS) if (!s.tools[t.id] && t.cost <= budget) {
    const v = (t.chopFlat ?? 0) * 0.3 + (t.passiveFlat ?? 0) + (t.helperPct ?? 0) * 10 + (t.woodSalePct ?? 0) * 10;
    if (v > 0) opts.push({ label: t.name, cost: t.cost, tab: 'upgrades', value: v });
  }
  if (!s.yardSeller && systemUnlocked(s, 'market')) opts.push({ label: 'Yard Seller (auto-sells)', cost: YARD_SELLER_COST, tab: 'helpers', value: 1e9 / YARD_SELLER_COST });
  const sc = storageUpgradeCost(s);
  if (sc !== null && !s.yardSeller) opts.push({ label: 'Bigger wood yard', cost: sc, tab: 'upgrades', value: 0.5 });
  const mc = sawmillNextCost(s);
  if (mc !== null && systemUnlocked(s, 'sawmill')) opts.push({ label: s.sawmill.level ? `Sawmill level ${s.sawmill.level + 1}` : 'Build the Sawmill', cost: mc, tab: 'workshop', value: (SAWMILL_LEVELS[s.sawmill.level]?.planksPerSec ?? 0) * 0.5 });
  const nw = WORKSHOPS[s.workshop.level + 1];
  if (nw && workshopUnlocked(s) && s.workshop.buildingTo === null) opts.push({ label: nw.name, cost: nw.cost, tab: 'workshop', value: 1 });
  if (!s.manager.hired && systemUnlocked(s, 'manager')) opts.push({ label: 'Manager', cost: MANAGER_COST, tab: 'helpers', value: 0.5 });
  void price;
  return opts.filter((o) => o.cost <= budget && o.cost > 0).sort((a, b) => b.value / b.cost - a.value / a.cost).slice(0, max).map(({ label, cost, tab }) => ({ label, cost, tab }));
}

// ---------- quests ----------

function targetFor(def: QuestDef, s: GameState, now: number) {
  if (def.scale !== 'income') return def.base;
  const perMin = def.metric === 'woodSold' ? woodPerMinEstimate(s, now) : incomePerMin(s, now);
  const raw = def.base * perMin;
  const mag = Math.pow(10, Math.max(0, Math.floor(Math.log10(Math.max(1, raw))) - 1));
  return Math.max(10, Math.round(raw / mag) * mag);
}

function available(def: QuestDef, s: GameState) {
  if (def.needs === 'workshop') return s.workshop.level >= 0;
  return true;
}

export function ensureQuests(s: GameState, now: number): GameState {
  let st = s;
  const dk = dayKeyOf(now);
  const known = (id: string) => [...DAILY_QUESTS, ...WEEKLY_QUESTS].some((q) => q.id === id);
  // saves from older versions can hold quests that no longer exist: roll new ones
  if (st.daily.dayKey !== dk || st.daily.quests.some((q) => !known(q.id))) {
    const pool = DAILY_QUESTS.filter((d) => available(d, st));
    const picked = [...pool].sort((a, b) => hash(dk + a.id) - hash(dk + b.id)).slice(0, 3);
    const quests: Quest[] = picked.map((d) => ({ id: d.id, target: targetFor(d, st, now), baseline: st.stats[d.metric], claimed: false }));
    st = { ...st, daily: { dayKey: dk, quests } };
  }
  const wk = weekKeyOf(now);
  if (st.weekly.weekKey !== wk || (st.weekly.quest && !known(st.weekly.quest.id))) {
    const d = WEEKLY_QUESTS[Math.floor(hash('wk' + wk) * WEEKLY_QUESTS.length)];
    st = { ...st, weekly: { weekKey: wk, quest: { id: d.id, target: targetFor(d, st, now), baseline: st.stats[d.metric], claimed: false } } };
  }
  return st;
}

export function questDef(id: string) {
  return [...DAILY_QUESTS, ...WEEKLY_QUESTS].find((q) => q.id === id)!;
}

export function questProgress(s: GameState, q: Quest) {
  const d = questDef(q.id);
  if (!d) return 0; // a quest from an older version, replaced on the next tick
  return Math.min(q.target, Math.max(0, s.stats[d.metric] - q.baseline));
}

export function questLabel(q: Quest) {
  const d = questDef(q.id);
  if (!d) return 'New quest coming';
  const n = d.metric === 'moneyEarned' ? fmtMoney(q.target) : whole(q.target);
  return d.label(n);
}

export function dailyQuestMoney(s: GameState, now: number) {
  return Math.max(10, incomePerMin(s, now) * DAILY_QUEST_MONEY_MIN);
}

export function claimQuest(s: GameState, which: number | 'weekly', now: number): GameState | null {
  const q = which === 'weekly' ? s.weekly.quest : s.daily.quests[which];
  if (!q || q.claimed || questProgress(s, q) < q.target) return null;
  let st: GameState;
  if (which === 'weekly') {
    st = { ...s, gold: s.gold + WEEKLY_QUEST_GOLD, weekly: { ...s.weekly, quest: { ...q, claimed: true } } };
    st = addMoney({ ...st, boosts: addBoost(st.boosts, 'wood', 2, WEEKLY_QUEST_BOOST_HOURS, now, 'daily') }, Math.max(50, incomePerMin(s, now) * WEEKLY_QUEST_MONEY_MIN));
  } else {
    const quests = s.daily.quests.map((x, i) => (i === which ? { ...x, claimed: true } : x));
    st = addMoney({ ...s, gold: s.gold + DAILY_QUEST_GOLD, daily: { ...s.daily, quests } }, dailyQuestMoney(s, now));
  }
  return st;
}

// ---------- video rewards ----------

export function adFree(s: GameState) {
  return s.vipActive || s.owned.noAds;
}

/** Today's ad counters (they reset at midnight). */
function adsToday(s: GameState, now: number): GameState['ads'] {
  const dk = dayKeyOf(now);
  return s.ads.dayKey === dk ? s.ads : { ...s.ads, dayKey: dk, goldVideos: 0, instantUsed: 0 };
}

export function msToMidnight(now: number) {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - now;
}

// ---------- Playbook 3 fix: Remove Ads = 1 instant reward a day, in total ----------

/** Instant rewards left today for Remove Ads / VIP players (Infinity = not ad-free, they watch videos). */
export function instantLeft(s: GameState, now: number) {
  if (!adFree(s)) return Infinity;
  return Math.max(0, AD_FREE_INSTANT_PER_DAY - adsToday(s, now).instantUsed);
}

/**
 * Wraps any ad reward. Free players: unchanged. Ad-free players: the reward is instant, but only
 * 1 a day across every ad button (home pill, welcome-back 2x, timed boost).
 */
export function withAdRule(apply: (s: GameState) => GameState | null, now: number) {
  return (s: GameState): GameState | null => {
    if (!adFree(s)) return apply(s);
    if (instantLeft(s, now) <= 0) return null;
    const x = apply(s);
    if (!x) return null;
    const a = adsToday(x, now);
    return { ...x, ads: { ...a, instantUsed: a.instantUsed + 1 } };
  };
}

/** Counts one instant reward for an ad-free player (used by the welcome-back 2x). */
export function useInstant(s: GameState, now: number): GameState {
  if (!adFree(s)) return s;
  const a = adsToday(s, now);
  return { ...s, ads: { ...a, instantUsed: a.instantUsed + 1 } };
}

/** "1 of 1 used today, new rewards tomorrow" + countdown, for every ad button once the 1 is used. */
export function instantUsedText(now: number) {
  return `1 of 1 used today, new rewards tomorrow (${clockText(msToMidnight(now))})`;
}

export function clockText(ms: number) {
  const t = Math.ceil(ms / 1000);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const ss = String(t % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

// ---------- the free Gold video = the Watch Ad pill on the home screen ----------

export function goldVideosLeft(s: GameState, now: number) {
  return Math.max(0, AD_GOLD_VIDEOS_PER_DAY - adsToday(s, now).goldVideos);
}

export type AdPillState =
  | { status: 'locked' } // first 4 minutes of play: not shown
  | { status: 'ready'; left: number } // "Watch Ad · +5 Gold"
  | { status: 'cooldown'; msLeft: number; left: number } // "Ready in 6:59"
  | { status: 'capped'; msLeft: number } // 5 of 5 used: countdown to midnight
  | { status: 'instantUsed'; msLeft: number }; // Remove Ads: "1 of 1 used today", countdown to midnight

export function adPillState(s: GameState, now: number): AdPillState {
  if (s.playSec < AD_PILL_UNLOCK_SEC && s.prestige.count === 0) return { status: 'locked' };
  if (instantLeft(s, now) <= 0) return { status: 'instantUsed', msLeft: msToMidnight(now) };
  const a = adsToday(s, now);
  const left = AD_GOLD_VIDEOS_PER_DAY - a.goldVideos;
  if (left <= 0) return { status: 'capped', msLeft: msToMidnight(now) };
  const wait = a.lastVideoAt + AD_PILL_COOLDOWN_MIN * 60000 - now;
  if (wait > 0) return { status: 'cooldown', msLeft: wait, left };
  return { status: 'ready', left };
}

/** +5 Gold. Only when the pill is ready (cooldown and the 5-a-day cap). Wrap with withAdRule for the Remove Ads rule. */
export function rewardGoldVideo(s: GameState, now: number): GameState | null {
  const st = adPillState(s, now).status;
  if (st !== 'ready') return null;
  const a = adsToday(s, now);
  return { ...s, gold: s.gold + AD_GOLD_PER_VIDEO, ads: { ...a, goldVideos: a.goldVideos + 1, lastVideoAt: now } };
}

// ---------- Playbook 3: Starter Pack offer ----------

export const STARTER_ID = 'com.lumberempire.starter';

/** For sale only in the first 72 hours, and only until bought. */
export function starterOnSale(s: GameState, now: number) {
  return !s.owned.products.includes(STARTER_ID) && now - s.offers.firstSeenAt < STARTER_PACK_HOURS * 3600_000;
}

/** The one-time pop-up: after the first milestone (first helper hired), once, first 72 hours only. */
export function starterPopupDue(s: GameState, now: number) {
  const helpers = Object.values(s.helpers).reduce((n, h) => n + (h?.count ?? 0), 0);
  return starterOnSale(s, now) && !s.offers.starterShown && (helpers > 0 || s.prestige.count > 0);
}

export function forSale() {
  return PRODUCTS.filter((p) => !p.hidden);
}

export function adBoostLeftMs(s: GameState, now: number) {
  return prodBoostLeftMs(s, now);
}

/** Timed boost hours left today, ads and Gold buys combined (cap 1). */
export function adBoostHoursLeft(s: GameState, now: number) {
  return Math.max(0, AD_BOOST_HOURS_PER_DAY - capsToday(s, now).boostHours);
}

export function canAdBoost(s: GameState, now: number) {
  return adBoostHoursLeft(s, now) >= AD_BOOST_MINUTES / 60 && adBoostLeftMs(s, now) + AD_BOOST_MINUTES * 60000 <= AD_BOOST_MAX_MINUTES * 60000;
}

/** 1.5x production for 1 hour, 1 hour a day (ads and Gold combined). Shares one timer, never stacks. */
export function rewardAdBoost(s: GameState, now: number): GameState | null {
  if (!canAdBoost(s, now)) return null;
  const c = capsToday(s, now);
  return { ...s, boosts: addBoost(s.boosts, 'wood', AD_BOOST_MULT, AD_BOOST_MINUTES / 60, now, 'ad'), caps: { ...c, boostHours: c.boostHours + AD_BOOST_MINUTES / 60 } };
}

/** Welcome-back 2x: once a day. Collect is always free. */
export function welcome2xLeft(s: GameState, now: number) {
  return Math.max(0, WELCOME_2X_PER_DAY - capsToday(s, now).welcome2x);
}

export function useWelcome2x(s: GameState, now: number): GameState {
  const c = capsToday(s, now);
  return { ...s, caps: { ...c, welcome2x: c.welcome2x + 1 } };
}

/** 1 hour of normal production: without timed 2x boosts or a Golden Log Frenzy, so a skip can't be multiplied. */
export function skipValue(s: GameState, now: number) {
  return incomePerMin({ ...s, boosts: [], frenzyUntil: 0 }, now) * 60;
}

/** Time Skips left today (3 a day = 3 hours of production). */
export function skipsLeft(s: GameState, now: number) {
  return Math.max(0, TIME_SKIPS_PER_DAY - capsToday(s, now).skips);
}

// ---------- Gold shop (sell time, not power) ----------

export function buyGoldItem(s: GameState, id: string, now: number): GameState | null {
  const it = GOLD_SHOP.find((x) => x.id === id);
  if (!it || s.gold < it.gold) return null;
  if (it.kind === 'skip') {
    if (skipsLeft(s, now) <= 0) return null; // 3 a day; Gold above that waits for tomorrow
    const c = capsToday(s, now);
    return addMoney({ ...s, gold: s.gold - it.gold, caps: { ...c, skips: c.skips + 1 } }, skipValue(s, now) * it.hours);
  }
  // 2x boosts bought with Gold share the daily 2-hour cap with the ad boost
  if (adBoostHoursLeft(s, now) < it.hours || adBoostLeftMs(s, now) + it.hours * 3600_000 > AD_BOOST_MAX_MINUTES * 60000) return null;
  const c = capsToday(s, now);
  return { ...s, gold: s.gold - it.gold, boosts: addBoost(s.boosts, it.kind, AD_BOOST_MULT, it.hours, now, 'gold'), caps: { ...c, boostHours: c.boostHours + it.hours } };
}

/** Spec: 10 Gold repairs the axe and every tool to 100%, no Money. */
export function goldRepair(s: GameState): GameState | null {
  if (repairAllCost(s) === 0 || s.gold < GOLD_REPAIR_ALL) return null;
  return fixEverything({ ...s, gold: s.gold - GOLD_REPAIR_ALL });
}

// ---------- prestige ----------

export function prestigeGain(s: GameState) {
  if (s.runMoneyEarned < PRESTIGE_AT) return 0;
  return Math.sqrt(s.runMoneyEarned / PRESTIGE_AT);
}

export function canPrestige(s: GameState) {
  return s.runMoneyEarned >= PRESTIGE_AT;
}

/** Resets the run (incl. tools, storage, wages). Keeps Gold, purchases, VIP, streaks, quests, stats. Wood output gets faster for good. */
export function doPrestige(s: GameState, now: number): GameState | null {
  if (!canPrestige(s)) return null;
  const mult = s.prestige.mult + prestigeGain(s);
  // Tools bought with Gold (Golden Chainsaw) are kept forever; Money-bought tools reset.
  const kept: GameState['tools'] = {};
  for (const [id, t] of Object.entries(s.tools)) if (t.keep) kept[id] = { durability: 100, chopWear: 0, minuteWear: 0, keep: true };
  // Sawmill (section 23): from the Empire Pack = level 1 kept forever (Money upgrades reset to 1); built with Money = reset.
  const packMill = s.owned.products.includes(EMPIRE_PACK_ID);
  const st: GameState = {
    ...s,
    ...freshRun(now),
    tools: kept,
    sawmill: packMill ? { level: 1, on: s.sawmill.on } : { level: 0, on: true },
    boosts: s.boosts,
    prestige: { count: s.prestige.count + 1, mult },
    gold: s.gold + PRESTIGE_GOLD, // update 3
  };
  return st;
}

export function prestigeProgress(s: GameState) {
  return Math.min(1, s.runMoneyEarned / PRESTIGE_AT);
}

export { AXES, marketPriceFor };

/**
 * Update 2: prestige preview. "+38% forever" and roughly how long until you are back where you are today,
 * at your current Money per minute sped up by the new multiplier.
 */
export function prestigePreview(s: GameState, now: number) {
  const gain = prestigeGain(s);
  const pct = Math.round((gain / s.prestige.mult) * 100);
  const perMin = incomePerMin(s, now) * ((s.prestige.mult + gain) / s.prestige.mult);
  const minutes = perMin > 0 ? Math.max(1, Math.round(s.moneyToday / perMin)) : null;
  return { pct, minutes };
}

// ---------- weekly leaderboard (update 3): you against the four AI rival companies, resets Monday ----------
export type BoardRow = { name: string; earned: number; you: boolean };
export function weeklyBoard(s: GameState, now: number): BoardRow[] {
  const wk = weekKeyOf(now);
  const start = new Date(wk.split('-').map(Number)[0], wk.split('-').map(Number)[1] - 1, wk.split('-').map(Number)[2]).getTime();
  const frac = Math.min(1, Math.max(0.02, (now - start) / (7 * 86400_000)));
  const mine = s.board?.weekKey === wk ? s.totalMoneyEarned - s.board.startTotal : 0;
  // rivals keep pace with you: their week is sized from your last week or your pace this week
  const ref = Math.max(20_000, s.board?.lastWeek ?? 0, mine / Math.max(0.2, frac));
  const rows: BoardRow[] = RIVALS.map((r) => {
    const target = ref * (0.55 + hash(`board:${wk}:${r.name}`) * 0.75) * r.budget;
    const curve = frac * (0.9 + 0.1 * Math.sin(frac * 9 + hash(r.name) * 6)); // they earn in bursts, not a straight line
    return { name: r.name, earned: Math.round(target * Math.min(1, curve)), you: false };
  });
  rows.push({ name: 'You', earned: Math.round(mine), you: true });
  return rows.sort((a, b) => b.earned - a.earned);
}
