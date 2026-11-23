// npm test: checks the game rules.
import {
  newGame as newGame0, chop, devSpawnGolden, grantProduct, claimVip, repair, repairCost, computeOffline, collectOffline, hireHelper, hireCost,
  levelHelper, ensureListings, makeOffer, acceptCounter, startBuild, startCraft, tick, woodMultFor, moneyMult,
  passiveWoodPerSec, GameState, workshopUnlocked, addBoost, buyTool, toolFx, woodPerChop, repairTool, toolRepairCost, storageCap,
  buyStorage, wagePerHour, rankInfo, repairAllCost, buyToolWithGold, ensureOrders, acceptOrder, counterOrder, storageUsed,
  hireManager, setManagerOn, managerCollect, collectOfflineBonus, managerActive, upgradeSawmill, setSawmillOn, plankCutRate,
} from '../src/game/logic';
// tests run with every system unlocked unless a test says otherwise (update 3 unlock schedule)
const newGame = (t?: number): GameState => ({ ...newGame0(t), playSec: 1e9 });
import { demandOf, marketPriceOf, priceTrend, weatherOf } from '../src/game/market';
import { startAuction, placeBid, minNextBid } from '../src/game/rivals';
import {
  claimLogin, canClaimLogin, rewardGoldVideo, goldVideosLeft, rewardAdBoost, canPrestige, doPrestige, ensureQuests, claimQuest,
  questProgress, goldRepair,
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
ok(HELPERS[0].cost === 400 && HELPERS[5].cost === 750_000, 'helper prices are 3x (Apprentice $400 (update 2), Elite $750,000)');
let h = hireHelper(rich(newGame(MON)), 'apprentice')!;
ok(h.helpers.apprentice.count === 1 && hireCost(h, 'apprentice') === Math.round(400 * 1.1), 'hiring works and next copy costs 10% more');
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
const soldItems = L24x.sellItems(ws, 'stool', MON + 3_600_000);
ok(soldItems.sold === 1 && soldItems.state.money > ws.money && soldItems.state.workshop.inventory.stool === 0, 'crafted item sells instantly at today\'s price');

// ---- Part 3 ----
let ad = newGame(MON);
for (let i = 0; i < 7; i++) ad = rewardGoldVideo(ad, MON + i * 8 * 60_000) ?? ad;
ok(ad.gold === 25 && goldVideosLeft(ad, MON + 3600_000) === 0, 'free Gold videos capped at 5 a day');
let b = { ...newGame(MON), boosts: addBoost([], 'wood', 2, 1, MON) };
b = rewardAdBoost(b, MON)!;
ok(Math.abs(woodMultFor(b, MON, 'pine') - 2) < 1e-9 && b.boosts.filter((x) => x.until > MON).length === 1 && Math.abs(b.boosts[0].until - MON - 2 * 3600_000) < 1, 'boosts share one timer: an ad boost on top of a running 2x makes it longer, never stacks');
ok(Math.abs(moneyMult({ ...newGame(MON), vipActive: true, boosts: addBoost([], 'money', 2, 1, MON) }, MON) - 3) < 1e-9, 'VIP 2x + money 2x = 3x');
let off = computeOffline({ ...h, wood: 0, selling: false, storageLevel: 9, lastSaved: MON - 20 * 3600_000 }, MON);
ok(!!off.result && Math.abs(off.result.produced - 2.5 * 0.5 * 8 * 3600) < 1, `offline: 50% rate, 8h cap (${Math.round(off.result!.produced)} wood)`);
let off2 = computeOffline({ ...newGame(MON), yardSeller: true, wood: 500, lastSaved: MON - 3600_000 }, MON);
ok(!!off2.result && off2.state.money === 0 && collectOffline(off2.state, off2.result!, 2).money === off2.result!.earned * 2, 'welcome back holds Money until Collect; video doubles it');
let d = newGame(MON);
d = claimLogin(d, MON)!;
ok(!canClaimLogin(d, MON) && d.login.index === 1, 'daily reward once a day');
const dGrace = claimLogin(d, MON + 2 * 86400_000)!;
ok(dGrace.login.index === 2, 'missing one day: grace, streak goes on');
d = claimLogin(d, MON + 3 * 86400_000)!;
ok(d.login.index === 1, 'missing two days: drop back one day, never to zero');
let q = ensureQuests(newGame(MON), MON);
ok(q.daily.quests.length === 3 && !!q.weekly.quest, '3 daily quests and 1 weekly quest');
const chopIdx = q.daily.quests.findIndex((z) => z.id === 'chop');
if (chopIdx >= 0) {
  for (let i = 0; i < q.daily.quests[chopIdx].target; i++) q = chop(q, MON, () => 0.5).state;
  ok(questProgress(q, q.daily.quests[chopIdx]) === q.daily.quests[chopIdx].target && claimQuest(q, chopIdx, MON)!.gold === 5, 'chop quest completes and pays 5 Gold');
}
let p = { ...rich(newGame(MON)), runMoneyEarned: PRESTIGE_AT * 4, gold: 77, owned: { ...newGame(MON).owned, products: ['com.lumberempire.propack'] } };
ok(canPrestige(p), 'prestige unlocks at the target');
const pp = doPrestige(p, MON)!;
ok(pp.prestige.mult === 3 && pp.money === 0 && pp.gold === 97 && pp.axeIndex === 0 && !pp.helpers.apprentice, 'prestige: 3x speed, keeps Gold, +20 Gold, resets run');
ok(Math.abs(woodMultFor(pp, MON, 'pine') - 3) < 1e-9, 'prestige multiplies wood output');

// notifications
const nine = new Date(2026, 10, 23, 22, 30).getTime();
ok(new Date(outOfQuietHours(nine)).getHours() === 9, 'notification at 10:30pm moves to 9am');
const plan = planNotification({ ...h, notif: { ...h.notif, lastFireDay: '2026-11-24' } }, new Date(2026, 10, 24, 1).getTime())!;
ok(new Date(plan.at).getDate() !== 24 && new Date(plan.at).getHours() >= 9 && new Date(plan.at).getHours() < 21, 'max 1 notification a day, outside quiet hours');
ok(plan.kind === 'offline' && plan.tab === 'chop', `offline cap notification opens Home: "${plan.title}"`);
const busy = { ...newGame(MON), workshop: { ...newGame(MON).workshop, level: 0, buildingTo: 1, buildDoneAt: MON + 2 * 3600_000 } };
const p2 = planNotification(busy, MON)!;
ok(p2.kind === 'upgrade' && p2.tab === 'workshop', `upgrade-finished notification opens Buildings ("${p2.title}")`);
const playedAt14 = planNotification({ ...newGame(MON), playHours: Array.from({ length: 24 }, (_, i) => (i === 14 ? 9 : 0)), login: { index: 1, lastClaimDay: '2026-11-23' } }, MON)!;
ok(playedAt14.kind === 'daily' && new Date(playedAt14.at).getHours() === 14, 'daily reward notification comes at your usual play time');

// ---- Part 4 ----
let pro = grantProduct(newGame(MON), 'com.lumberempire.propack', 'p1', MON)!;
ok(pro.gold === 2500 && pro.axeIndex === 0 && pro.owned.skins.includes('diamond-axe-skin') && moneyMult(pro, MON) === 2, 'Pro Logger Pack: 2500 Gold, Diamond skin only, 2x Money');
let baron = grantProduct(newGame(MON), 'com.lumberempire.landpack', 'l1', MON)!;
ok(baron.gold === 1000 && !!baron.lands.clearing && !baron.lands.redwood && helperCountOf(baron) === 0 && woodMultFor(baron, MON, 'pine') === 2, 'Land Baron Pack: 1000 Gold, Small Clearing, 2x Wood, no Redwood or helpers');
let baron2 = grantProduct({ ...newGame(MON), lands: { clearing: { upgrades: [], paid: 3000 } } }, 'com.lumberempire.landpack', 'l2', MON)!;
ok(baron2.gold === 1500, 'Land Baron Pack: +500 Gold if Small Clearing is already owned');

let t = buyTool(rich(newGame(MON)), 'chainsaw')!;
ok(Math.abs(woodPerChop(t, MON) - (0.8 + 5) * 1.2) < 1e-9, 'Chainsaw: +5 wood per chop and +20%');
for (let i = 0; i < 10 * 60; i++) t = chop(t, MON, () => 0.5).state;
ok(t.tools.chainsaw.durability === 40 && Math.abs(toolFx(t).chopFlat - 5 * 0.75) < 1e-9, 'Chainsaw wears 1% per 10 chops and works at 75% when worn');
ok(toolRepairCost(t, 'chainsaw', 100) === 180 && repairTool(t, 'chainsaw', 100)!.tools.chainsaw.durability === 100, 'Chainsaw repair costs Money ($300 for a full 0-100%)');
let brk = { ...t, axeDurability: 100, tools: { chainsaw: { durability: 0, chopWear: 0, minuteWear: 0 } } };
ok(toolFx(brk).chopFlat === 0, 'broken tool gives nothing');
ok(goldRepair({ ...brk, gold: 10 })!.tools.chainsaw.durability === 100 && goldRepair({ ...newGame(MON), gold: 10 }) === null, '10 Gold repairs everything');
ok(repairAllCost(brk) === 300, 'Repair All cost adds up tools and axe');

let wg = hireHelper(hireHelper(rich(newGame(MON)), 'apprentice')!, 'lumberjack')!;
ok(wagePerHour(wg) === 200, 'wages: Apprentice $50 + Lumberjack $150 per hour');
ok(Math.abs(wagePerHour(levelHelper(wg, 'apprentice')!) - 205) < 1e-9, 'wages +10% per helper level');
let paid = tick({ ...wg, money: 1000, selling: false }, 3600, MON);
ok(Math.abs(paid.money - 800) < 1e-6 && paid.wagesOwed === 0, 'wages are paid from Money over time');
let broke = tick({ ...wg, money: 0, selling: false }, 60, MON);
ok(broke.wagesOwed > 0 && Math.abs(passiveWoodPerSec(broke, MON) - 3.5) < 1e-9 && helperCountOf(broke) === 2, "can't pay: helpers at 50%, nobody quits");
ok(tick({ ...broke, money: 100 }, 1, MON).wagesOwed === 0, 'owed wages paid as soon as you have the Money');

let st = { ...newGame(MON), wood: 9999.5, selling: false };
ok(storageCap(st) === 10000 && chop(st, MON, () => 0.5).state.wood === 10000 && chop({ ...st, wood: 10000 }, MON, () => 0.5).result.storageFull, 'storage starts at 10,000 and full storage stops chopping');
ok(tick({ ...wg, wood: 10000, selling: false }, 60, MON).wood === 10000, 'full storage stops helpers too');
ok(storageCap(buyStorage(rich(newGame(MON)))!) === 25000, 'storage upgrade costs Money and raises the cap');
ok(rankInfo(200_000_000).name === 'Global Timber Tycoon' && rankInfo(50_000_000).name === 'National Lumber Co.', 'top rank is now $200M with ranks in between');

// ---- Part 5: Market ----
const DK = '2026-11-23';
ok(marketPriceOf(DK, 'wood') > 0.05 && marketPriceOf(DK, 'wood') < 0.2, `wood market price is near $0.10 (${marketPriceOf(DK, 'wood').toFixed(3)})`);
ok([-1, 0, 1].includes(priceTrend(DK, 'wood')) && !!weatherOf(DK).icon, 'price arrow and weather work');
let days14 = Array.from({ length: 14 }, (_, i) => demandOf(`2026-12-${i + 1}`, 'wood'));
ok(Math.max(...days14) - Math.min(...days14) > 0.2, 'demand really changes day to day');
let pl = tick({ ...newGame(MON), wood: 100, cutting: true, selling: false, plankSelling: false }, 10, MON);
ok(Math.abs(pl.planks - 20) < 1e-9 && Math.abs(pl.wood - 60) < 1e-9 && storageUsed(pl) === 100, 'cutting: 2 wood -> 1 plank, 2 a second, planks take 2 yard spaces');
let spl = { ...newGame(MON), yardSeller: true, planks: 5000, plankSelling: true, tools: { splitter: { durability: 100, chopWear: 0, minuteWear: 0 } } };
ok(tick(spl, 60, MON).money > tick({ ...spl, tools: {} }, 60, MON).money * 1.9, 'Log Splitter doubles plank Money');
let ord = ensureOrders({ ...newGame(MON), wood: 0 }, MON);
const o = ord.market.orders[0];
ok(ord.market.orders.length === 2 && acceptOrder(ord, o.id, MON) === null, '2 bulk orders a day, need the stock to deliver');
let del = acceptOrder({ ...ord, wood: 1e6, planks: 1e6 }, o.id, MON)!;
ok(del.money > 0 && del.market.orders[0].status === 'done' && del.market.log.length === 1 && del.market.days.length === 1, 'bulk order pays, logs and shows in the 7-day graph');
const co = counterOrder(ord, o.id)!;
ok(co.agreed ? co.state.market.orders[0].price > o.price : co.state.market.orders[0].status === 'gone', 'asking +10%: buyer agrees or walks');
let gc = buyTool(rich(newGame(MON)), 'goldchainsaw')!;
ok(gc.money === 1e9 - 500_000 && Math.abs(woodPerChop(gc, MON) - 100.8) < 1e-9, 'Golden Chainsaw: $500,000 Money, +100 wood per chop');
ok(buyToolWithGold({ ...newGame(MON), gold: 1500 }, 'goldchainsaw')!.gold === 0 && buyToolWithGold({ ...newGame(MON), gold: 1499 }, 'goldchainsaw') === null, 'Golden Chainsaw: or 1,500 Gold');
ok(buyToolWithGold({ ...newGame(MON), gold: 9999 }, 'chainsaw') === null, 'other tools cannot be bought with Gold');

// ---- Part 6: rivals and auctions ----
let rv = ensureListings(rich(newGame(MON)), MON);
ok(rv.listings.clearing.rivalBuysAt === null && rv.listings.clearing.saleType === 'negotiate', 'rivals leave the Small Clearing alone');
const rid = Object.keys(rv.listings).find((k) => rv.listings[k].saleType === 'negotiate' && rv.listings[k].rivalPlan.length)!;
const firstAt = rv.listings[rid].rivalPlan[0].at;
let rv2 = tick(rv, 1, firstAt + 1);
ok(!!rv2.listings[rid].rivalOffer && rv2.feed.some((f) => /just offered/.test(f.text)), 'rival offers show up in the activity feed');
const ro = rv2.listings[rid].rivalOffer!.amount;
let low = makeOffer(rv2, rid, Math.round(ro * 0.9), firstAt + 2);
ok(low.outcome.kind === 'countered' && low.state.listings[rid].counter! >= ro, 'seller asks you to beat the rival offer');
let late = tick(rv, 1, rv.listings[rid].rivalBuysAt! + 1);
ok(late.listings[rid].status === 'sold' && late.feed.some((f) => /took too long/.test(f.text)), 'take too long and a rival buys the land');
let au: GameState = { ...rv, listings: { ...rv.listings, pine: { ...rv.listings.pine, saleType: 'auction', status: 'open' } } };
au = startAuction(au, 'pine', MON)!;
ok(!!au.auction && au.auction.endsAt - MON === 60000 && au.auction.bid === 7500, 'auction: 60 seconds, opens at half the asking price');
au = placeBid(au, minNextBid(au.auction!), MON + 500).state;
ok(au.auction!.leader === 'you', 'you can bid and lead');
let t2 = MON;
let outbidSeen = false;
while (au.auction && au.auction.leader === 'you' && t2 < MON + 60000) { t2 += 1000; au = tick(au, 1, t2); }
outbidSeen = !!au.auction && au.auction.leader !== 'you';
ok(outbidSeen && au.auction!.outbid, `a rival outbids you (${au.auction?.leader})`);
let late2 = au;
// let it run to the last seconds, then check the 10-second rule after a rival outbids you near the end
let lt = t2;
while (late2.auction && late2.auction.endsAt - lt > 3000) { lt += 1000; late2 = tick(late2, 1, lt); }
if (late2.auction) {
  late2 = placeBid(late2, minNextBid(late2.auction), lt).state;
  ok(late2.auction!.endsAt - lt >= 10000, 'a late bid gives at least 10 seconds');
}
let big = placeBid(au, 15000 * 2, t2 + 1).state;
let bt = t2 + 1;
while (big.auction && bt < t2 + 300000) { bt += 1000; big = tick(big, 1, bt); }
ok(!!big.lands.pine && big.lands.pine.paid === 30000 && big.feed.some((f) => /You won/.test(f.text)), 'bid high enough and you win the land');
const aId = Object.keys(rv.listings).find((k) => rv.listings[k].saleType === 'auction');
if (aId) {
  let skip = tick(rv, 1, rv.listings[aId].rivalBuysAt! + 1);
  ok(skip.listings[aId].status === 'sold' && /did not join/.test(skip.feed.map((f) => f.text).join('|')), 'skip an auction and a rival wins it');
}
let gs = buyToolWithGold({ ...newGame(MON), gold: 1500, runMoneyEarned: PRESTIGE_AT }, 'goldchainsaw')!;
ok(!!doPrestige(gs, MON)!.tools.goldchainsaw, 'Golden Chainsaw bought with Gold is kept through prestige');
let ms = buyTool({ ...rich(newGame(MON)), runMoneyEarned: PRESTIGE_AT }, 'goldchainsaw')!;
ok(!doPrestige(ms, MON)!.tools.goldchainsaw, 'Golden Chainsaw bought with Money is lost on prestige');

// ---- Part 7: manager ----
let mg = hireManager({ ...newGame(MON), money: 25_000 })!;
ok(mg.money === 5_000 && mg.manager.hired && mg.manager.on && hireManager({ ...mg, money: 1e6 }) === null, 'manager costs $20,000, only one for the whole empire');
ok(setManagerOn(mg, false)!.manager.on === false, 'manager has an on/off switch');
const base: GameState = { ...mg, money: 1e6, selling: false };
let full = { ...base, wood: 9_500 };
ok(managerActive(full) && !managerActive({ ...full, wood: 7_000 }), 'manager starts at 80% full');
let after = full;
for (let i = 1; i <= 720; i++) after = tick(after, 5, MON + i * 5000);
ok(after.wood <= 8_000 + 1 && after.wood >= 7_900 && after.manager.soldToday > 0, 'manager sells back down to 80% at the market price');
ok(tick({ ...base, wood: 5_000 }, 60, MON).manager.soldToday === 0, 'manager does not sell below 80%');
ok(Math.abs(after.money - (1e6 + after.manager.moneyToday - 1000)) < 1, 'manager wage is $1,000 per hour, paid automatically');
let broke2 = tick({ ...full, money: 0 }, 60, MON);
ok((broke2.manager.owed ?? 0) > 0 && !managerActive(broke2) && broke2.manager.soldToday === 0, "can't pay him: he pauses selling and the amount owed adds up");
ok(managerCollect(broke2, { away: 3600, earned: 500, gross: 500, sold: 1, produced: 1 }).state.money === broke2.money, "can't pay him: he does not collect either");
let pk = { ...base, wood: 0, planks: 4_900, plankSelling: false };
for (let i = 1; i <= 720; i++) pk = tick(pk, 5, MON + i * 5000);
ok((pk.manager.planksToday ?? 0) > 0 && pk.planks * 2 <= 8_001, 'manager sells planks too, back down to 80% of the yard');
let fu: GameState = { ...base, wood: 9_500, workshop: { ...base.workshop, level: 0, inventory: { stool: 3 } } };
fu = tick(fu, 60, MON);
ok(fu.workshop.inventory.stool === 3 && fu.market.orders.every((o) => o.status !== 'done'), 'manager does not sell furniture or take bulk orders');
const offR = { away: 3600, earned: 500, gross: 500, sold: 5000, produced: 5000 };
const col = managerCollect({ ...mg, money: 0 }, offR);
ok(col.state.money === 500 && col.result.collectedBy === 'manager' && col.state.manager.collectedToday === 500, 'manager collects Welcome Back Money for you');
ok(collectOfflineBonus(col.state, col.result).money === 1000, 'optional video still adds the 2x bonus on top');
ok(managerCollect({ ...newGame(MON), money: 0 }, offR).state.money === 0, 'no manager: you collect it yourself');

// ---- Part 8: Sawmill ----
let sm = upgradeSawmill({ ...newGame(MON), money: 30_000 })!;
ok(sm.sawmill.level === 1 && sm.money === 5_000 && plankCutRate(sm) === 10 && plankCutRate({ ...newGame(MON), cutting: true }) === 2, 'Sawmill level 1: $25,000, 10 planks a second (Cut planks is 2)');
let sm2 = upgradeSawmill({ ...sm, money: 1e6 })!;
ok(sm2.sawmill.level === 2 && plankCutRate(sm2) === 25, 'Sawmill upgrades: level 2 is 25 planks a second');
let mill = tick({ ...sm2, wood: 1000, selling: false, plankSelling: false }, 10, MON);
ok(Math.abs(mill.planks - 250) < 1e-6 && Math.abs(mill.wood - 500) < 1e-6, 'Sawmill turns 2 wood into 1 plank');
ok(plankCutRate(setSawmillOn(sm2, false)!) === 0, 'Sawmill can be switched off');
let emp = grantProduct(newGame(MON), 'com.lumberempire.megapack', 'e1', MON)!;
ok(emp.sawmill.level === 1 && !emp.owned.pendingBuildings.includes('sawmill'), 'Empire Pack gives the Sawmill');

let pm = { ...grantProduct(newGame(MON), 'com.lumberempire.megapack', 'e2', MON)!, money: 1e7, runMoneyEarned: PRESTIGE_AT };
pm = upgradeSawmill(upgradeSawmill(pm)!)!;
ok(pm.sawmill.level === 3 && doPrestige(pm, MON)!.sawmill.level === 1, 'Empire Pack Sawmill: upgrades reset to level 1 on prestige, level 1 kept');
let mm = upgradeSawmill({ ...newGame(MON), money: 1e7, runMoneyEarned: PRESTIGE_AT })!;
ok(doPrestige(mm, MON)!.sawmill.level === 0, 'Sawmill built with Money: lost on prestige');

function helperCountOf(x: GameState) { return Object.values(x.helpers).reduce((a, h) => a + h.count, 0); }

// ---- Section 24: manual selling, Yard Seller, land changes ----
import * as L24x from '../src/game/logic';
import * as L24 from '../src/game/logic';
const quote = L24.sellQuote({ ...newGame(MON), wood: 1000 }, 'wood', MON);
const sa = L24.sellAll({ ...newGame(MON), wood: 1000 }, 'wood', MON);
ok(sa.sold === 1000 && Math.abs(sa.earned - quote.earned) < 1e-9 && Math.abs(quote.each - marketPriceOf(newGame(MON).dayKey, 'wood')) < 1e-9, `SELL: all 1,000 wood at market price (${quote.each.toFixed(3)} each, $${quote.earned.toFixed(2)})`);
ok(L24.hireYardSeller({ ...newGame(MON), money: 1499 }) === null, 'Yard Seller costs $1,500 cash');
const ys = L24.hireYardSeller({ ...newGame(MON), money: 1500, wood: 1000 })!;
ok(ys.money === 0 && tick(ys, 60, MON).wood < 1000, 'Yard Seller sells wood by itself');
ok(LAND.length === 14, '14 pieces of land to buy (update 4)');

// ---- Update 2 ----
import { prestigePreview } from '../src/game/meta';
let gl = tick({ ...newGame(MON), helpers: { apprentice: { count: 1, level: 0 } } }, 1, MON);
const spawn = gl.nextLogAt;
ok(spawn >= MON + 3 * 60_000 && spawn <= MON + 5 * 60_000, 'Golden Log spawns 3 to 5 minutes from now');
ok(!L24.goldenLogVisible(gl, spawn - 1000) && L24.goldenLogVisible(gl, spawn + 1000) && !L24.goldenLogVisible(gl, spawn + 61_000), 'Golden Log lasts 60 seconds');
const fz = L24.tapGoldenLog(gl, spawn + 5000)!;
ok(Math.abs(L24.passiveWoodPerSec(fz, spawn + 6000) / L24.passiveWoodPerSec(gl, spawn + 6000) - 7) < 1e-9 && L24.passiveWoodPerSec(fz, spawn + 36_000) === L24.passiveWoodPerSec(gl, spawn + 36_000), 'Frenzy: 7x wood/sec for 30 seconds');
const missed = tick(gl, 1, spawn + 70_000);
ok(missed.nextLogAt > spawn + 70_000 && missed.money === gl.money, 'missing a Golden Log costs nothing, a new one comes later');
ok(L24.hireCost({ ...newGame(MON), helpers: { apprentice: { count: 1, level: 0 } } }, 'apprentice') === Math.round(HELPERS[0].cost * 1.1), 'cost growth is 1.10 per copy');
const pv = prestigePreview({ ...newGame(MON), runMoneyEarned: PRESTIGE_AT * 1.44, moneyToday: 5e6, helpers: { crew: { count: 5, level: 0 } } }, MON);
ok(pv.pct === 120 && pv.minutes !== null && pv.minutes > 0, `prestige preview: +${pv.pct}% forever, back in ~${pv.minutes} min`);
const off24 = L24.makeOffer(ensureListings({ ...newGame(MON), money: 100_000 }, MON), 'clearing', 100, MON);
ok(off24.state.money === 100_000, 'a turned-down offer costs nothing (no penalty on Make an Offer)');

// ---- Update 3 ----
import * as M3 from '../src/game/meta';
import * as D3 from '../src/game/data';
ok(D3.GOLDEN_TREE_CHANCE === 1 / 200 && D3.GOLDEN_GOLD_MIN === 5 && D3.GOLDEN_GOLD_MAX === 15, 'Golden Tree: 1 in 200 trees, 5 to 15 Gold');
let ms3 = { ...newGame(MON), money: 1e12 } as GameState;
for (let i = 0; i < 25; i++) ms3 = hireHelper(ms3, 'apprentice')!;
const g25 = ms3.gold;
for (let i = 0; i < 24; i++) ms3 = hireHelper(ms3, 'apprentice')!;
ok(g25 === 10 && ms3.gold === 10 && hireHelper(ms3, 'apprentice')!.gold === 20, 'every 25 of one helper type pays 10 Gold, once each');
const cz = { ...newGame(MON), gold: 300 };
const boughtC = M3.buyCosmetic(cz, 'tree-redwood')!;
ok(boughtC.gold === 200 && boughtC.cosmetics.tree === 'tree-redwood' && M3.buyCosmetic(cz, 'tree-cherry') === null, 'cosmetics cost Gold, rare ones only from Day 7');
ok(passiveWoodPerSec({ ...boughtC, helpers: { apprentice: { count: 1, level: 0 } } }, MON) === passiveWoodPerSec({ ...cz, helpers: { apprentice: { count: 1, level: 0 } } }, MON), 'cosmetics never change wood/sec');
const pz = doPrestige({ ...boughtC, runMoneyEarned: PRESTIGE_AT }, MON)!;
ok(pz.cosmetics.owned.includes('tree-redwood') && pz.cosmetics.tree === 'tree-redwood', 'cosmetics are kept through prestige');
let dz: GameState = { ...newGame(MON), login: { index: 6, lastClaimDay: null } };
dz = claimLogin(dz, MON)!;
ok(dz.gold === 50 && dz.cosmetics.owned.includes('tree-cherry'), 'Day 7: 50 Gold plus a rare cosmetic');
const qz = ensureQuests(newGame(MON), MON);
ok([...qz.daily.quests.map((x) => x.id)].sort().join() === 'chop,offline,upgrade' && qz.daily.quests.find((x) => x.id === 'chop')!.target === 500, 'daily quests: chop 500, upgrade 3 machines, collect 2 offline payouts');
const lock = newGame0(MON);
ok(!L24.systemUnlocked(lock, 'land') && L24.systemUnlocked({ ...lock, playSec: 45 * 60 }, 'land') && !L24.systemUnlocked({ ...lock, playSec: 45 * 60 }, 'market'), 'new systems unlock with play time');
ok(L24.hireYardSeller({ ...lock, money: 5000 }) === null, 'Yard Seller waits for the Market unlock');
const sat = new Date(2026, 10, 28, 12).getTime();
const fri = new Date(2026, 10, 27, 12).getTime();
ok(L24.rushInfo(newGame(sat), sat).active && !L24.rushInfo(newGame(fri), fri).active && D3.RUSH_BONUS === 0.5, 'Timber Rush: Saturday and Sunday (48 hours), 1.5x');
const ev = ensureOrders(newGame(sat), sat);
ok(ev.market.orders.filter((o) => o.id.startsWith('rush-')).length === 3, 'Timber Rush adds a limited event order board');
const ideas = M3.buyIdeas({ ...newGame(MON), money: 0 }, 2000, MON);
ok(ideas.length > 0 && ideas.every((x) => x.cost <= 2000), `welcome-back ideas fit the budget (${ideas.map((x) => x.label).join(', ')})`);
const wb = M3.weeklyBoard({ ...newGame(MON), board: { weekKey: L24.weekKeyOf(MON), startTotal: 0, lastWeek: 0 }, totalMoneyEarned: 50_000 }, MON + 3 * 86400_000);
ok(wb.length === 5 && wb.some((r) => r.you && r.earned === 50_000) && wb.every((r, i) => i === 0 || wb[i - 1].earned >= r.earned), 'weekly leaderboard: you and 4 AI rivals, sorted');

// ---- Update 4: tree types ----
import * as D4 from '../src/game/data';
ok(D4.WOODS.length === 14 && D4.WOODS.every((w, i) => i === 0 || w.price > D4.WOODS[i - 1].price) && D4.WOOD.starwood.price === 55, '14 tree types, each pricier than the last, Starwood $55');
ok(D4.LAND.every((l, i) => l.wood === D4.WOODS[i].id) && D4.LAND[13].id === 'rainforest' && D4.LAND[13].asking === 90_000_000, 'each land grows the next tree type, Coastal Rainforest = Starwood at $90M');
const mx = L24.landMix('crystal');
ok(Math.abs(Object.values(mx).reduce((a, b) => a! + b!, 0)! - 1) < 1e-9 && mx.crystal === 0.6 && (mx.pine ?? 0) > 0 && !mx.glass, 'Crystal Caves grows mostly Crystal Wood plus the older woods, nothing better');
const tw = { ...newGame(MON), wood: 300, woodMix: { pine: 100, oak: 100, crystal: 100 } } as GameState;
const twq = L24.sellQuote(tw, 'wood', MON);
const fac = marketPriceOf(tw.dayKey, 'wood') / 0.1;
ok(Math.abs(twq.earned - 100 * (0.1 + 0.18 + 8) * fac) < 1e-6, 'each log sells at its own tree price, moved by the market');
const half = L24.sellAll(tw, 'wood', MON, 150);
ok(Math.abs((half.state.woodMix.crystal ?? 0) - 50) < 1e-6 && Math.abs(half.state.wood - 150) < 1e-6, 'selling part of the yard sells an even slice of every type');
const ownC = { ...newGame(MON), lands: { clearing: { upgrades: [], paid: 0 }, crystal: { upgrades: [], paid: 0 } } } as GameState;
ok(L24.chopType(ownC) === 'crystal' && L24.chop(ownC, MON, () => 0.5).state.woodMix.crystal! > 0, 'you chop your best tree');
const crewS = { ...ownC, helpers: { apprentice: { count: 5, level: 0 }, crew: { count: 2, level: 0 } } } as GameState;
const cb = L24.crewByLand(crewS);
ok(cb.find((c) => c.landId === 'crystal')!.helpers.every((h) => h.id === 'crew') && cb.find((c) => c.landId === 'crystal')!.helpers.length === 2, 'your best helpers work your best land');
const by = L24.passiveByType(crewS, MON);
ok((by.crystal ?? 0) > 0 && (by.pine ?? 0) > 0, 'helpers on Crystal Caves cut crystal; the rest chop pine at home');
const cut = tick({ ...newGame(MON), wood: 1000, woodMix: { crystal: 1000 }, sawmill: { level: 1, on: true }, cutting: false } as GameState, 1, MON);
ok(cut.planks > 0 && L24.avgPlankBase(cut) > 10, `the Sawmill cuts the wood you have: crystal planks are worth more (${L24.avgPlankBase(cut).toFixed(2)} each at base)`);

// ---- Playbook 3: ads and store ----
import * as PM from '../src/game/meta';
import { runAdReward } from '../src/game/adflow';
import * as PD from '../src/game/data';
{
  // Playbook 3 fix: the pill pays +5 Gold
  const P = newGame0(MON); // real unlock timing
  ok(PM.adPillState(P, MON).status === 'locked' && PM.adPillState({ ...P, playSec: 239 }, MON).status === 'locked', 'Watch Ad pill: not in the first 4 minutes');
  const A = { ...P, playSec: 300 };
  ok(PM.adPillState(A, MON).status === 'ready', 'Watch Ad pill: ready after 4 minutes');
  let x = PM.rewardGoldVideo(A, MON)!;
  ok(!!x && x.gold === A.gold + 5 && x.money === A.money, 'free player: one video pays +5 Gold (not cash)');
  const cd = PM.adPillState(x, MON + 1000);
  ok(cd.status === 'cooldown' && PM.clockText((cd as any).msLeft) === '6:59', 'cooldown 7 minutes: "Ready in 6:59"');
  ok(PM.rewardGoldVideo(x, MON + 60_000) === null, 'no reward during the cooldown');
  let t2 = MON;
  for (let i = 1; i < 5; i++) { t2 += 7 * 60_000; x = PM.rewardGoldVideo(x, t2) ?? x; }
  const cap = PM.adPillState(x, t2 + 8 * 60_000);
  ok(x.gold === 25 && x.ads.goldVideos === 5 && cap.status === 'capped' && (cap as any).msLeft > 0, '5 videos = 25 Gold, then "5 of 5 used today" with a countdown to midnight');
  ok(PM.rewardGoldVideo(x, t2 + 8 * 60_000) === null, 'no 6th video');
  ok(PM.adPillState(x, MON + 24 * 3600_000).status === 'ready', 'resets the next day');
  // Remove Ads: 1 instant reward a day, total
  const pay = { ...grantProduct(A, 'com.lumberempire.noads2', 'na1', MON)! };
  ok(PM.instantLeft(pay, MON) === 1 && PM.instantLeft(A, MON) === Infinity, 'payer: 1 instant reward a day; free players are not limited by it');
  const p1 = PM.withAdRule((s0) => PM.rewardGoldVideo(s0, MON), MON)(pay)!;
  ok(p1.gold === pay.gold + 5 && PM.instantLeft(p1, MON) === 0, 'payer: first ad reward of the day is instant +5 Gold');
  ok(PM.withAdRule((s0) => PM.rewardAdBoost(s0, MON + 60_000), MON + 60_000)(p1) === null, 'payer: second ad reward that day (timed boost) is refused');
  ok(PM.adPillState(p1, MON + 60_000).status === 'instantUsed', 'payer: home pill shows "1 of 1 used today"');
  ok(PM.instantUsedText(MON).startsWith('1 of 1 used today, new rewards tomorrow ('), 'payer: other ad buttons say "1 of 1 used today, new rewards tomorrow" with a countdown');
  const p2 = PM.withAdRule((s0) => PM.rewardAdBoost(s0, MON), MON)(pay)!;
  ok(!!p2 && PM.adPillState(p2, MON).status === 'instantUsed', 'payer: using the 1 on the boost also uses up the pill');
  ok(PM.instantLeft(p1, MON + 24 * 3600_000) === 1, 'payer: resets to 1 at midnight');
  const wb = PM.useInstant(pay, MON);
  ok(PM.instantLeft(wb, MON) === 0, 'payer: the welcome-back 2x counts as the 1 too');
}
{
  // reward only when the video finishes, never when it opens
  const run = async (events: ('earned' | 'closed-ok' | 'closed-early' | 'error')[], adFree = false) => {
    let paid = 0;
    const err = await runAdReward({
      adFree,
      canGrant: () => true,
      grant: () => { paid++; return true; },
      show: async (onEarned) => {
        let res: any = { ok: false, message: 'closed' };
        for (const e of events) {
          if (e === 'earned') onEarned();
          if (e === 'closed-ok') res = { ok: true };
          if (e === 'closed-early') res = { ok: false, message: 'Watch the whole video to get the reward.' };
          if (e === 'error') res = { ok: false, message: 'The video failed to play.' };
        }
        return res;
      },
    });
    return { paid, err };
  };
  (async () => {
    const a = await run(['earned', 'closed-ok']);
    ok(a.paid === 1 && a.err === null, 'ad: watched to the end = paid once');
    const b = await run(['closed-early']);
    ok(b.paid === 0 && !!b.err, 'ad: closed early = no reward');
    const c = await run(['error']);
    ok(c.paid === 0 && !!c.err, 'ad: failed to play = no reward');
    const d = await run(['earned', 'earned', 'closed-ok']);
    ok(d.paid === 1, 'ad: earned event twice = still paid once');
    const e = await run(['earned', 'closed-early']);
    ok(e.paid === 1 && e.err === null, 'ad: return-from-ad path, paid at the finish even if the close looks odd');
    const f = await run(['closed-ok']);
    ok(f.paid === 1, 'ad: finished but no earned event = still paid');
    const g = await run([], true);
    ok(g.paid === 1 && g.err === null, 'Remove Ads: reward is instant, no video');
    let opened = 0;
    await runAdReward({ adFree: false, canGrant: () => false, grant: () => true, show: async () => { opened++; return { ok: true }; } });
    ok(opened === 0, 'ad: never shows a video when the reward is not available');
  })();
}
{
  // boosts
  let bb = newGame(MON);
  for (let i = 0; i < 8; i++) bb = PM.rewardAdBoost(bb, MON) ?? bb;
  ok(Math.abs(PM.adBoostLeftMs(bb, MON) - 3600_000) < 1 && woodMultFor(bb, MON, 'pine') === 1.5 && PM.adBoostHoursLeft(bb, MON) === 0, 'timed boost: 1.5x for 1 hour, 1 hour a day');
  ok(PM.buyGoldItem({ ...bb, gold: 100 }, 'wood1h', MON) === null, 'Gold-bought boost shares the 1 hour a day: refused after the ad boost');
  const gbb = PM.buyGoldItem({ ...newGame(MON), gold: 100 }, 'wood1h', MON)!;
  ok(!!gbb && gbb.gold === 80 && PM.rewardAdBoost(gbb, MON) === null, 'a Gold boost uses up the ad boost too');
  ok(!PD.GOLD_SHOP.some((g) => g.id === 'wood24h'), 'the 24-hour Gold boost is no longer sold');
  ok(!!PM.rewardAdBoost(bb, MON + 24 * 3600_000), 'timed boost: resets at midnight');
  // Time Skip: 3 a day, 1 normal hour
  let ts = { ...newGame(MON), gold: 200 } as GameState;
  for (let i = 0; i < 5; i++) ts = PM.buyGoldItem(ts, 'skip1h', MON) ?? ts;
  ok(ts.gold === 140 && PM.skipsLeft(ts, MON) === 0 && PM.skipsLeft(ts, MON + 24 * 3600_000) === 3, 'Time Skip: 3 a day, Gold above that waits for tomorrow');
  const sk = { ...newGame(MON), gold: 20, helpers: { apprentice: { count: 10, level: 0 } } } as GameState;
  const plain = PM.buyGoldItem(sk, 'skip1h', MON)!.money;
  const boosted = PM.buyGoldItem({ ...sk, boosts: addBoost([], 'wood', 2, 1, MON), frenzyUntil: MON + 30_000 }, 'skip1h', MON)!.money;
  ok(Math.abs(plain - boosted) < 1e-6, 'Time Skip pays 1 normal hour, never boosted by a 2x boost or a Frenzy');
  // Golden Trees: 50 Gold a day
  let gt = devSpawnGolden({ ...newGame(MON), caps: { dayKey: L24.dayKeyOf(MON), goldenGold: 45, skips: 0, welcome2x: 0, boostHours: 0 } }, MON);
  let gr: any = null;
  for (let i = 0; i < 18 && !gr; i++) { const r = chop(gt, MON + 1000, () => 0.99); gt = r.state; if (r.result.golden) gr = r.result.golden; }
  ok(gr && gr.gold === 5 && !gr.capped && gt.gold === 5, 'Golden Tree: rolls 5-15 Gold but stops at 50 a day (45 + 5)');
  gt = devSpawnGolden(gt, MON + 2000); gr = null;
  const m0 = gt.money;
  for (let i = 0; i < 18 && !gr; i++) { const r = chop(gt, MON + 3000, () => 0.5); gt = r.state; if (r.result.golden) gr = r.result.golden; }
  ok(gr && gr.gold === 0 && gr.capped && gt.gold === 5 && gt.money > m0, 'after the cap: bonus Money and golden wood only, "Gold cap reached for today"');
  // welcome-back 2x: once a day
  const wbs = PM.useWelcome2x(newGame(MON), MON);
  ok(PM.welcome2xLeft(wbs, MON) === 0 && PM.welcome2xLeft(wbs, MON + 24 * 3600_000) === 1, 'welcome-back 2x: once a day, back at midnight');
  const perm = { ...grantProduct(newGame(MON), 'com.lumberempire.prod2x', 'pp', MON)!, boosts: addBoost([], 'wood', 2, 1, MON) };
  ok(Math.abs(woodMultFor(perm, MON, 'pine') - 3) < 1e-9, '2x Production Forever + 2x boost = 3x (they add)');
  const permP = doPrestige({ ...perm, runMoneyEarned: PRESTIGE_AT * 4 }, MON)!;
  ok(L24.permProdBonus(permP) === 1 && permP.prestige.mult > 1, '2x Forever is kept through prestige, prestige still multiplies on top');
  const g3 = grantProduct(newGame(MON), 'com.lumberempire.gold100', 'g100', MON)!;
  ok(g3.gold === 100, 'Gold packs pay Gold');
  const gp = PD.PRODUCTS.filter((p) => p.kind === 'gold' && !p.hidden).map((p) => `${p.id.split('.').pop()}:${p.grant.gold}:${p.usd}`).join(' ');
  ok(gp === 'gold100:100:$0.99 gold550:550:$4.99 gold1200:1200:$9.99 gold3000:3000:$19.99 gold7000:7000:$49.99 gold15000:15000:$99.99', `Gold packs are Muse's spec amounts (${gp})`);
  ok(!PD.PRODUCTS.some((p) => /gold(80|420|880|1800)$/.test(p.id)), 'the 80 / 420 / 880 / 1800 packs are gone');
  const skip = PM.buyGoldItem({ ...newGame(MON), gold: 20 }, 'skip1h', MON)!;
  ok(skip.gold === 0 && skip.money > 0, 'Time Skip: 20 Gold = 1 hour of production now');
}
{
  // store
  const st = newGame0(MON);
  ok(!PM.starterPopupDue(st, MON), 'Starter Pack: no pop-up before the first helper');
  const h1 = { ...st, helpers: { apprentice: { count: 1, level: 0 } } };
  ok(PM.starterPopupDue(h1, MON), 'Starter Pack: pops up after the first helper');
  ok(!PM.starterPopupDue({ ...h1, offers: { ...h1.offers, starterShown: true } }, MON), 'Starter Pack: shown once');
  ok(!PM.starterOnSale(h1, MON + 73 * 3600_000) && PM.starterOnSale(h1, MON + 71 * 3600_000), 'Starter Pack: first 72 hours only');
  const sp = grantProduct(h1, PM.STARTER_ID, 'sp', MON)!;
  ok(sp.gold === 300 && Math.abs(woodMultFor(sp, MON, 'pine') - 1.2) < 1e-9 && sp.cosmetics.owned.includes('axe-fire') && !PM.starterOnSale(sp, MON), 'Starter Pack: 300 Gold, +20% production forever, Fire Axe look');
  ok(PM.buyCosmetic({ ...sp, gold: 1000 }, 'axe-fire') === null, 'Starter buyers own the Fire Axe: the Cosmetics shop will not sell it again for 200 Gold');
  const o24 = grantProduct(newGame(MON), 'com.lumberempire.offline24', 'o24', MON)!;
  const offA = computeOffline({ ...o24, helpers: { apprentice: { count: 1, level: 0 } }, storageLevel: 9, lastSaved: MON - 30 * 3600_000 }, MON);
  ok(L24.offlineCapHours(o24) === 24 && Math.abs(offA.result!.away - 24 * 3600) < 1, 'Longer Offline: 24 hour cap (free is 8)');
  const na = grantProduct(newGame(MON), 'com.lumberempire.noads2', 'na', MON)!;
  ok(na.owned.noAds && na.gold === 400 && PM.adFree(na), 'Remove Ads: no videos, plus 400 Gold');
  ok(PM.forSale().every((p) => p.kind !== 'vip'), 'VIP is not for sale until monthly content ships');
  ok(PM.forSale().map((p) => p.id.split('.').pop()).join(',') === 'starter,gold100,gold550,gold1200,gold3000,gold7000,gold15000,noads2,prod2x,offline24', 'store order: Starter, 6 Gold packs, Remove Ads, 2x Forever, Longer Offline');
  ok(['propack', 'megapack', 'landpack'].every((id) => PD.PRODUCTS.find((p) => p.id === `com.lumberempire.${id}`)!.hidden) && !!grantProduct(newGame(MON), 'com.lumberempire.megapack', 'old1', MON), 'Pro / Empire / Land Baron packs: hidden, but old buyers still restore');
  ok(PRODUCTS.find((p) => p.id === 'com.lumberempire.noads2')!.removes!.length > 20, 'Remove Ads says what it removes');
}

{
  // old saves (update 2) can hold quest ids that no longer exist
  const old = { ...newGame(MON), daily: { dayKey: L24.dayKeyOf(MON), quests: [{ id: 'sell', target: 10, baseline: 0, claimed: false }] } } as GameState;
  const fixed = ensureQuests(old, MON);
  ok(fixed.daily.quests.length === 3 && fixed.daily.quests.every((q) => q.id !== 'sell'), 'old quests from an older version are replaced, no crash');
}
