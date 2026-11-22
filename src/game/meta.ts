// Part 3: daily rewards, quests, video rewards, Gold shop, prestige.
import {
  AD_BOOST_MAX_MINUTES, AD_BOOST_MINUTES, AD_GOLD_PER_VIDEO, AD_GOLD_VIDEOS_PER_DAY, AXES, DAILY_QUESTS, DAILY_QUEST_GOLD,
  DAILY_QUEST_MONEY_MIN, DAILY_REWARDS, GOLD_REPAIR_ALL, GOLD_SHOP, PRESTIGE_AT, QuestDef, WEEKLY_QUESTS, WEEKLY_QUEST_GOLD,
} from './data';
import {
  GameState, Quest, addBoost, addMoney, dayKeyOf, fixEverything, freshRun, hash, incomePerMin, marketPriceFor, repairAllCost,
  weekKeyOf, woodPerMinEstimate,
} from './logic';
import { money as fmtMoney, whole } from './format';

// ---------- daily login rewards (rolling: a missed day pauses, never resets) ----------

export function canClaimLogin(s: GameState, now: number) {
  return s.login.lastClaimDay !== dayKeyOf(now);
}

export function loginRewardText(s: GameState, i: number, now: number) {
  const r = DAILY_REWARDS[i];
  const parts: string[] = [];
  if (r.money) parts.push(fmtMoney(Math.max(5, incomePerMin(s, now) * r.money)));
  if (r.gold) parts.push(`${r.gold} Gold`);
  if (r.boostMin) parts.push(`2x Wood ${r.boostMin} min`);
  return parts.join(' + ');
}

export function claimLogin(s: GameState, now: number): GameState | null {
  if (!canClaimLogin(s, now)) return null;
  const r = DAILY_REWARDS[s.login.index];
  let st: GameState = { ...s, login: { index: (s.login.index + 1) % DAILY_REWARDS.length, lastClaimDay: dayKeyOf(now) } };
  if (r.money) st = addMoney(st, Math.max(5, incomePerMin(s, now) * r.money));
  if (r.gold) st = { ...st, gold: st.gold + r.gold };
  if (r.boostMin) st = { ...st, boosts: addBoost(st.boosts, 'wood', 2, r.boostMin / 60, now, 'daily') };
  return st;
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
  if (st.daily.dayKey !== dk) {
    const pool = DAILY_QUESTS.filter((d) => available(d, st));
    const picked = [...pool].sort((a, b) => hash(dk + a.id) - hash(dk + b.id)).slice(0, 3);
    const quests: Quest[] = picked.map((d) => ({ id: d.id, target: targetFor(d, st, now), baseline: st.stats[d.metric], claimed: false }));
    st = { ...st, daily: { dayKey: dk, quests } };
  }
  const wk = weekKeyOf(now);
  if (st.weekly.weekKey !== wk) {
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
  return Math.min(q.target, Math.max(0, s.stats[d.metric] - q.baseline));
}

export function questLabel(q: Quest) {
  const d = questDef(q.id);
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

export function goldVideosLeft(s: GameState, now: number) {
  const used = s.ads.dayKey === dayKeyOf(now) ? s.ads.goldVideos : 0;
  return Math.max(0, AD_GOLD_VIDEOS_PER_DAY - used);
}

export function rewardGoldVideo(s: GameState, now: number): GameState | null {
  if (goldVideosLeft(s, now) <= 0) return null;
  const dk = dayKeyOf(now);
  const used = s.ads.dayKey === dk ? s.ads.goldVideos : 0;
  return { ...s, gold: s.gold + AD_GOLD_PER_VIDEO, ads: { dayKey: dk, goldVideos: used + 1 } };
}

export function adBoostLeftMs(s: GameState, now: number) {
  const b = s.boosts.find((x) => x.source === 'ad' && x.until > now);
  return b ? b.until - now : 0;
}

export function canAdBoost(s: GameState, now: number) {
  return adBoostLeftMs(s, now) + AD_BOOST_MINUTES * 60000 <= AD_BOOST_MAX_MINUTES * 60000;
}

/** 2x production for 30 minutes. Watching again adds 30 minutes (up to 4 hours), it never stacks to 4x. */
export function rewardAdBoost(s: GameState, now: number): GameState | null {
  if (!canAdBoost(s, now)) return null;
  const add = AD_BOOST_MINUTES * 60000;
  const existing = s.boosts.find((x) => x.source === 'ad' && x.until > now);
  const boosts = existing
    ? s.boosts.map((b) => (b === existing ? { ...b, until: b.until + add } : b))
    : [...s.boosts, { kind: 'wood' as const, mult: 2, until: now + add, source: 'ad' as const }];
  return { ...s, boosts };
}

// ---------- Gold shop (sell time, not power) ----------

export function buyGoldItem(s: GameState, id: string, now: number): GameState | null {
  const it = GOLD_SHOP.find((x) => x.id === id);
  if (!it || s.gold < it.gold) return null;
  return { ...s, gold: s.gold - it.gold, boosts: addBoost(s.boosts, it.kind, 2, it.hours, now, 'gold') };
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
  const st: GameState = {
    ...s,
    ...freshRun(now),
    tools: kept,
    boosts: s.boosts,
    prestige: { count: s.prestige.count + 1, mult },
  };
  return st;
}

export function prestigeProgress(s: GameState) {
  return Math.min(1, s.runMoneyEarned / PRESTIGE_AT);
}

export { AXES, marketPriceFor };
