// npm test: checks the game rules.
import {
  newGame, chop, devSpawnGolden, grantProduct, claimVip, repair, repairCost, computeOffline, collectOffline, hireHelper, hireCost,
  levelHelper, ensureListings, makeOffer, acceptCounter, startBuild, startCraft, tick, listForSale, woodMultFor, moneyMult,
  passiveWoodPerSec, GameState, workshopUnlocked, addBoost,
} from '../src/game/logic';
import {
  claimLogin, canClaimLogin, rewardGoldVideo, goldVideosLeft, rewardAdBoost, canPrestige, doPrestige, ensureQuests, claimQuest,
  questProgress,
} from '../src/game/meta';
import { outOfQuietHours, planNotification } from '../src/services/notify-plan';
import { HELPERS, LAND, PRESTIGE_AT, PRODUCTS, WORKSHOPS } from '../src/game/data';

const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const MON = new Date(2026, 10, 23, 12).getTime(); // Monday noon, no Timber Rush
const rich = (s: GameState, m = 1e9): GameState => ({ ...s, money: m, wood: 1e7 });

// ---- Part 1 ----
let s = devSpawnGolden(newGame(MON), MON);
let gold: any = null;
for (let i = 0; i < 18; i++) { const r = chop(s, MON + 1000, () => 0.5); s = r.state; if (r.result.golden) gold = r.result.golden; }
ok(gold && gold.gold >= 3 && gold.gold <= 10 && s.gold === gold.gold, `golden tree gives 3-10 Gold (got ${gold?.gold})`);
let g = grantProduct(newGame(MON), 'com.lumberempire.gold550', 'tx1', MON)!;
ok(g.gold === 550 && grantProduct(g, 'com.lumberempire.gold550', 'tx1', MON) === null, 'gold pack grants once per transaction');
let w = { ...newGame(MON), axeDurability: 0, money: 100 };
ok(repairCost(w, 100) === 12 && repair(w, 100)!.money === 88, 'Rusty Axe full repair $12');
let v = claimVip({ ...newGame(MON), vipActive: true }, MON)!;
ok(v.gold === 100 && claimVip(v, MON) === null, 'VIP daily 100 Gold once per day');
ok(PRODUCTS.find((p) => p.id === 'com.lumberempire.vip.monthly')!.usd === '$4.99 / month' && PRODUCTS.find((p) => p.id === 'com.lumberempire.vip.yearly')!.usd === '$39.99 / year', 'VIP is $4.99/month and $39.99/year');

// ---- Part 2: helpers ----
ok(HELPERS[0].cost === 450 && HELPERS[5].cost === 750_000, 'helper prices are 3x (Apprentice $450, Elite $750,000)');
let h = hireHelper(rich(newGame(MON)), 'apprentice')!;
ok(h.helpers.apprentice.count === 1 && hireCost(h, 'apprentice') === Math.round(450 * 1.15), 'hiring works and next copy costs 15% more');
ok(passiveWoodPerSec(h, MON) === 2, 'Apprentice makes 2 wood/sec');
h = levelHelper(h, 'apprentice')!;
ok(passiveWoodPerSec(h, MON) === 2.5, 'level up gives +25%');

// ---- Part 2: land ----
ok(LAND[0].asking === 3000 && LAND[5].asking === 3_000_000, 'land asking prices are 3x');
let l = ensureListings(rich(newGame(MON)), MON);
const L = l.listings.clearing;
ok(!!L && L.min >= 3000 * 0.6 * 0.9 && L.min <= 3000 * 1.08 * 1.1, `seller minimum scales with 3x asking (min $${L.min})`);
let lo = makeOffer(l, 'clearing', Math.round(L.min * 0.3), MON);
ok(lo.outcome.kind === 'rejected' && lo.state.reputation < l.reputation, 'lowball is rejected and lowers reputation');
let x = l;
for (let i = 0; i < 3; i++) x = makeOffer(x, 'clearing', 100, MON).state;
ok(x.listings.clearing.status === 'gone' && x.landGoneUntil.clearing > MON, '3 rejections: seller walks away for 24h');
let fair = makeOffer(l, 'clearing', 3_300, MON);
let bought = fair.outcome.kind === 'accepted' ? fair.state : acceptCounter(fair.state, 'clearing');
ok(!!bought && !!bought.lands.clearing, `fair offer buys the land (${fair.outcome.kind})`);

// ---- Part 2: workshop ----
ok(WORKSHOPS[0].cost === 600 && WORKSHOPS[1].cost === 5000 && WORKSHOPS[7].cost === 10_000_000, 'workshop prices: shed $600, others 2x');
ok(!workshopUnlocked(rich(newGame(MON))) && startBuild(rich(newGame(MON)), MON) === null, 'shed is locked until first land');
let ws = startBuild(bought!, MON)!;
ok(ws.workshop.buildingTo === 0, 'shed builds after buying land');
ws = tick(ws, 0, MON + WORKSHOPS[0].buildMinutes * 60000 + 1);
ok(ws.workshop.level === 0, 'shed finishes after its build time');
ws = startCraft({ ...ws, wood: 1000 }, 'stool', MON)!;
ok(ws.workshop.queue.length === 1 && startCraft(ws, 'stool', MON) === null, 'craft uses the one shed slot');
ws = tick(ws, 0, MON + 3_600_000);
ok(ws.workshop.inventory.stool === 1, 'crafted item lands in inventory');
ws = listForSale(ws, 'stool', 1, MON, () => 0)!;
ws = tick(ws, 0, MON + 86_400_000);
ok(ws.workshop.history.length === 1, 'cheap item sells');

// ---- Part 3 ----
let ad = newGame(MON);
for (let i = 0; i < 7; i++) ad = rewardGoldVideo(ad, MON) ?? ad;
ok(ad.gold === 25 && goldVideosLeft(ad, MON) === 0, 'free Gold videos capped at 5 a day');
let b = { ...newGame(MON), boosts: addBoost([], 'wood', 2, 1, MON) };
b = rewardAdBoost(b, MON)!;
ok(Math.abs(woodMultFor(b, MON, 'pine') - 3) < 1e-9, 'boosts add: 2x + 2x = 3x, not 4x');
ok(Math.abs(moneyMult({ ...newGame(MON), vipActive: true, boosts: addBoost([], 'money', 2, 1, MON) }, MON) - 3) < 1e-9, 'VIP 2x + money 2x = 3x');
let off = computeOffline({ ...h, wood: 0, selling: false, lastSaved: MON - 20 * 3600_000 }, MON);
ok(!!off.result && Math.abs(off.result.produced - 2.5 * 0.5 * 8 * 3600) < 1, `offline: 50% rate, 8h cap (${Math.round(off.result!.produced)} wood)`);
let off2 = computeOffline({ ...newGame(MON), wood: 500, lastSaved: MON - 3600_000 }, MON);
ok(!!off2.result && off2.state.money === 0 && collectOffline(off2.state, off2.result!, 2).money === off2.result!.earned * 2, 'welcome back holds Money until Collect; video doubles it');
let d = newGame(MON);
d = claimLogin(d, MON)!;
ok(!canClaimLogin(d, MON) && d.login.index === 1, 'daily reward once a day');
d = claimLogin(d, MON + 3 * 86400_000)!;
ok(d.login.index === 2, 'missing days does not reset the streak');
let q = ensureQuests(newGame(MON), MON);
ok(q.daily.quests.length === 3 && !!q.weekly.quest, '3 daily quests and 1 weekly quest');
const chopIdx = q.daily.quests.findIndex((z) => z.id === 'chop');
if (chopIdx >= 0) {
  for (let i = 0; i < q.daily.quests[chopIdx].target; i++) q = chop(q, MON, () => 0.5).state;
  ok(questProgress(q, q.daily.quests[chopIdx]) === q.daily.quests[chopIdx].target && claimQuest(q, chopIdx, MON)!.gold === 3, 'chop quest completes and pays Gold');
}
let p = { ...rich(newGame(MON)), runMoneyEarned: PRESTIGE_AT * 4, gold: 77, owned: { ...newGame(MON).owned, products: ['com.lumberempire.propack'] } };
ok(canPrestige(p), 'prestige unlocks at the target');
const pp = doPrestige(p, MON)!;
ok(pp.prestige.mult === 3 && pp.money === 0 && pp.gold === 77 && pp.axeIndex === 5 && pp.helpers.apprentice.count === 3, 'prestige: 3x speed, keeps Gold and paid pack items');
ok(Math.abs(woodMultFor(pp, MON, 'pine') - 3) < 1e-9, 'prestige multiplies wood output');

// notifications
const nine = new Date(2026, 10, 23, 22, 30).getTime();
ok(new Date(outOfQuietHours(nine)).getHours() === 9, 'notification at 10:30pm moves to 9am');
const plan = planNotification({ ...h, notif: { ...h.notif, lastFireDay: '2026-11-24' } }, new Date(2026, 10, 24, 1).getTime())!;
ok(new Date(plan.at).getDate() !== 24 && new Date(plan.at).getHours() >= 9 && new Date(plan.at).getHours() < 21, 'max 1 notification a day, outside quiet hours');
ok(/logs/.test(plan.body), `personal message: "${plan.body}"`);
