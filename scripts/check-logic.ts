// npm test: checks the game rules.
import {
  newGame, chop, devSpawnGolden, grantProduct, claimVip, repair, repairCost, computeOffline, collectOffline, hireHelper, hireCost,
  levelHelper, ensureListings, makeOffer, acceptCounter, startBuild, startCraft, tick, listForSale, woodMultFor, moneyMult,
  passiveWoodPerSec, GameState, workshopUnlocked, addBoost, buyTool, toolFx, woodPerChop, repairTool, toolRepairCost, storageCap,
  buyStorage, wagePerHour, rankInfo, repairAllCost, buyToolWithGold, ensureOrders, acceptOrder, counterOrder, storageUsed, salesPerSec,
  hireManager, setManagerOn, managerCollect, collectOfflineBonus, managerActive, upgradeSawmill, setSawmillOn, plankCutRate,
} from '../src/game/logic';
import { demandOf, shownChance, timeToSell, marketPriceOf, bestCommodityPrice } from '../src/game/market';
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
let off = computeOffline({ ...h, wood: 0, selling: false, storageLevel: 9, lastSaved: MON - 20 * 3600_000 }, MON);
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
ok(pp.prestige.mult === 3 && pp.money === 0 && pp.gold === 77 && pp.axeIndex === 0 && !pp.helpers.apprentice, 'prestige: 3x speed, keeps Gold, resets run');
ok(Math.abs(woodMultFor(pp, MON, 'pine') - 3) < 1e-9, 'prestige multiplies wood output');

// notifications
const nine = new Date(2026, 10, 23, 22, 30).getTime();
ok(new Date(outOfQuietHours(nine)).getHours() === 9, 'notification at 10:30pm moves to 9am');
const plan = planNotification({ ...h, notif: { ...h.notif, lastFireDay: '2026-11-24' } }, new Date(2026, 10, 24, 1).getTime())!;
ok(new Date(plan.at).getDate() !== 24 && new Date(plan.at).getHours() >= 9 && new Date(plan.at).getHours() < 21, 'max 1 notification a day, outside quiet hours');
ok(/logs/.test(plan.body), `personal message: "${plan.body}"`);

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
ok(shownChance(DK, 'wood', 2) < shownChance(DK, 'wood', 1) && shownChance(DK, 'wood', 1) < shownChance(DK, 'wood', 0.5), 'higher price = lower sell chance');
ok(timeToSell(DK, 'wood', 0.3, 5000, 0.02, 2.2) > timeToSell(DK, 'wood', 0.1, 5000, 0.02, 2.2) * 2, 'higher price = slower to sell a pile');
function run4h(f: number) {
  let x: GameState = { ...newGame(MON), helpers: { apprentice: { count: 10, level: 0 } }, money: 1e6 };
  x = { ...x, sellPrice: marketPriceOf(x.dayKey, 'wood') * f };
  for (let t = 0; t < 4 * 3600; t += 5) x = tick(x, 5, MON + t * 1000);
  return x.money - 1e6;
}
const best = bestCommodityPrice(newGame(MON).dayKey, 'wood') / marketPriceOf(newGame(MON).dayKey, 'wood');
ok(run4h(3) < run4h(best) * 0.8, `with helpers working, 3x price earns much less than the best-price tip (${best.toFixed(2)}x)`);
let days14 = Array.from({ length: 14 }, (_, i) => demandOf(`2026-12-${i + 1}`, 'wood'));
ok(Math.max(...days14) - Math.min(...days14) > 0.2, 'demand really changes day to day');
let pl = tick({ ...newGame(MON), wood: 100, cutting: true, selling: false, plankSelling: false }, 10, MON);
ok(Math.abs(pl.planks - 20) < 1e-9 && Math.abs(pl.wood - 60) < 1e-9 && storageUsed(pl) === 100, 'cutting: 2 wood -> 1 plank, 2 a second, planks take 2 yard spaces');
let spl = { ...newGame(MON), planks: 5000, plankSelling: true, tools: { splitter: { durability: 100, chopWear: 0, minuteWear: 0 } } };
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
const base: GameState = { ...mg, money: 1e6, selling: false, sellPrice: 0.123 };
let full = { ...base, wood: 9_500 };
ok(managerActive(full) && !managerActive({ ...full, wood: 7_000 }), 'manager starts at 80% full');
let after = full;
for (let i = 1; i <= 720; i++) after = tick(after, 5, MON + i * 5000);
ok(after.wood <= 8_000 + 1 && after.wood >= 7_900 && after.manager.soldToday > 0 && after.sellPrice === 0.123, 'manager sells back down to 80% at your price, even with selling paused, never changes price');
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

function helperCountOf(x: GameState) { return Object.values(x.helpers).reduce((a, h) => a + h.count, 0); }
