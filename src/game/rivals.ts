// Part 6: AI rival companies and land auctions (section 8). Rivals are bots, never real people.
// Everything here is decided by seeded rolls, so the same day plays out the same way and can be tested.
import {
  AUCTION_CHANCE, LOST_BID_PENALTY, AUCTION_OUTBID_SECONDS, AUCTION_SECONDS, AUCTION_START, AUCTION_STEP, LAND, RIVALS, RIVAL_BUY_AFTER_MIN,
  RIVAL_FIRST_OFFER_MIN, RIVAL_FREE_LAND, RivalStyle,
} from './data';
import { hash } from './market';
import type { Auction, FeedItem, GameState, Listing } from './logic';
import { buyLand } from './logic';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
const styleOf = (name: string): RivalStyle => RIVALS.find((r) => r.name === name)!.style;

export function addFeed(s: GameState, item: FeedItem): GameState {
  return { ...s, feed: [item, ...s.feed].slice(0, 40) };
}

/** Sale type and rival plans for a new listing. */
export function planRivals(landId: string, asking: number, dk: string, run: number, now: number) {
  const r = (k: string) => hash(`rival:${dk}:${landId}:${k}:${run}`);
  const free = RIVAL_FREE_LAND.includes(landId);
  const saleType: Listing['saleType'] = !free && r('type') < AUCTION_CHANCE ? 'auction' : 'negotiate';
  if (free) return { saleType, createdAt: now, rivalPlan: [], rivalOffer: null, rivalBuysAt: null };
  const n = 1 + Math.floor(r('n') * 3);
  const plan: Listing['rivalPlan'] = [];
  let t = now;
  let amount = asking * (0.75 + r('a0') * 0.15);
  for (let i = 0; i < n; i++) {
    const [lo, hi] = RIVAL_FIRST_OFFER_MIN;
    t += (lo + r('t' + i) * (hi - lo)) * 60000;
    const rival = RIVALS[Math.floor(r('who' + i) * RIVALS.length)];
    amount = Math.min(asking * rival.budget, amount * (1.03 + r('up' + i) * 0.1));
    plan.push({ at: t, rival: rival.name, amount: Math.round(amount) });
  }
  const [lo, hi] = RIVAL_BUY_AFTER_MIN;
  const buysAt = t + (lo + r('buy') * (hi - lo)) * 60000;
  return { saleType, createdAt: now, rivalPlan: plan, rivalOffer: null as Listing['rivalOffer'], rivalBuysAt: buysAt };
}

function landName(id: string) {
  return LAND.find((l) => l.id === id)!.name;
}

/** Rival offers and buy-outs on first-come land, plus a live auction. Runs every tick. */
export function rivalTick(s: GameState, now: number): GameState {
  let st = s;
  for (const id of Object.keys(st.listings)) {
    let L = st.listings[id];
    if (L.status === 'gone' || L.status === 'sold') continue;
    if (st.auction?.landId === id) continue;
    // rival offers come in over time
    while (L.rivalPlan.length && L.rivalPlan[0].at <= now) {
      const o = L.rivalPlan[0];
      const better = !L.rivalOffer || o.amount > L.rivalOffer.amount;
      L = { ...L, rivalPlan: L.rivalPlan.slice(1), rivalOffer: better ? { rival: o.rival, amount: o.amount } : L.rivalOffer };
      if (L.saleType === 'negotiate') {
        st = addFeed(st, { at: o.at, kind: 'rival', landId: id, text: `${o.rival} just offered ${fmt(o.amount)} for ${landName(id)}` });
      } else {
        st = addFeed(st, { at: o.at, kind: 'rival', landId: id, text: `${o.rival} signed up for the ${landName(id)} auction` });
      }
    }
    // too slow: a rival buys it
    if (L.rivalBuysAt !== null && L.rivalBuysAt <= now) {
      const p = auctionParticipants(st, id, L);
      let who = L.rivalOffer?.rival ?? p[0]?.rival ?? RIVALS[0].name;
      let price = L.rivalOffer?.amount ?? LAND.find((x) => x.id === id)!.asking;
      if (L.saleType === 'auction' && p.length) {
        const sorted = [...p].sort((a, b) => b.max - a.max);
        who = sorted[0].rival;
        price = sorted[1] ? Math.min(sorted[0].max, sorted[1].max + stepFor(id)) : AUCTION_START * LAND.find((x) => x.id === id)!.asking;
      }
      L = { ...L, status: 'sold', soldTo: who, soldFor: Math.round(price), rivalPlan: [] };
      st = addFeed(st, {
        at: L.rivalBuysAt!, kind: 'lose', landId: id,
        text: L.saleType === 'auction'
          ? `Auction over: ${who} won ${landName(id)} for ${fmt(price)}. You did not join in time.`
          : `${who} bought ${landName(id)} for ${fmt(price)}. You took too long.`,
      });
    }
    st = { ...st, listings: { ...st.listings, [id]: L } };
  }
  if (st.auction) st = auctionTick(st, now);
  return st;
}

// ---------- auctions ----------

export function stepFor(landId: string) {
  const asking = LAND.find((l) => l.id === landId)!.asking;
  const raw = asking * AUCTION_STEP;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  return Math.max(10, Math.round(raw / mag) * mag);
}

function auctionParticipants(s: GameState, landId: string, L: Listing) {
  const asking = LAND.find((l) => l.id === landId)!.asking;
  const r = (k: string) => hash(`auction:${s.listingsDay}:${landId}:${k}:${s.prestige.count}`);
  const order = [...RIVALS].sort((a, b) => r('o' + a.name) - r('o' + b.name));
  const n = 2 + Math.floor(r('n') * 2); // 2 or 3 rivals
  const step = stepFor(landId);
  return order.slice(0, n).map((rv) => ({
    rival: rv.name,
    max: Math.round((asking * rv.budget * (0.85 + r('m' + rv.name) * 0.3)) / step) * step,
  }));
}

export function canStartAuction(s: GameState, landId: string) {
  const L = s.listings[landId];
  return !!L && L.saleType === 'auction' && L.status === 'open' && !s.auction;
}

export function startAuction(s: GameState, landId: string, now: number): GameState | null {
  if (!canStartAuction(s, landId)) return null;
  const L = s.listings[landId];
  const asking = LAND.find((l) => l.id === landId)!.asking;
  const a: Auction = {
    landId,
    startedAt: now,
    endsAt: now + AUCTION_SECONDS * 1000,
    bid: Math.round((asking * AUCTION_START) / stepFor(landId)) * stepFor(landId),
    leader: null,
    participants: auctionParticipants(s, landId, L),
    lastSec: Math.floor(now / 1000),
    log: [],
    outbid: false,
  };
  return addFeed({ ...s, auction: a }, { at: now, kind: 'you', landId, text: `Auction started for ${landName(landId)}. ${a.participants.map((p) => p.rival).join(', ')} are bidding.` });
}

export function minNextBid(a: Auction) {
  return a.leader === null ? a.bid : a.bid + stepFor(a.landId);
}

export function placeBid(s: GameState, amount: number, now: number): { state: GameState; error?: string } {
  const a = s.auction;
  if (!a || now >= a.endsAt) return { state: s, error: 'The auction is over.' };
  amount = Math.round(amount);
  if (a.leader === 'you') return { state: s, error: 'You are already winning.' };
  if (amount < minNextBid(a)) return { state: s, error: `Bid at least ${fmt(minNextBid(a))}.` };
  if (amount > s.money) return { state: s, error: "You don't have that much Money." };
  const endsAt = a.endsAt - now < AUCTION_OUTBID_SECONDS * 1000 ? now + AUCTION_OUTBID_SECONDS * 1000 : a.endsAt;
  const na: Auction = { ...a, bid: amount, leader: 'you', outbid: false, endsAt, log: [...a.log, { who: 'you', amount, at: now }] };
  return { state: addFeed({ ...s, auction: na }, { at: now, kind: 'you', landId: a.landId, text: `You bid ${fmt(amount)} on ${landName(a.landId)}` }) };
}

/** Chance a rival bids this second, by style and time left. */
function bidChance(style: RivalStyle, msLeft: number) {
  if (style === 'fast') return 0.45;
  if (style === 'steady') return 0.2;
  if (style === 'cautious') return 0.1;
  return msLeft <= 8000 ? 0.65 : 0.02; // sniper
}

function auctionTick(s: GameState, now: number): GameState {
  let st = s;
  let a = st.auction!;
  const endSec = Math.floor(now / 1000);
  for (let sec = a.lastSec + 1; sec <= endSec; sec++) {
    const t = sec * 1000;
    if (t >= a.endsAt) return finishAuction({ ...st, auction: a }, a.endsAt);
    const left = a.endsAt - t;
    const step = stepFor(a.landId);
    const next = a.leader === null ? a.bid : a.bid + step;
    const order = [...a.participants].sort((x, y) => hash(`${a.startedAt}:${sec}:${x.rival}`) - hash(`${a.startedAt}:${sec}:${y.rival}`));
    for (const p of order) {
      if (p.rival === a.leader || next > p.max) continue;
      if (hash(`${a.startedAt}:${p.rival}:${sec}:bid`) >= bidChance(styleOf(p.rival), left)) continue;
      const jump = styleOf(p.rival) === 'fast' && hash(`${a.startedAt}:${p.rival}:${sec}:jump`) < 0.25 ? step : 0;
      const amount = Math.min(p.max, next + jump);
      const outbidYou = a.leader === 'you';
      const was = a.bid;
      a = {
        ...a, bid: amount, leader: p.rival, outbid: outbidYou || a.outbid,
        endsAt: outbidYou && left < AUCTION_OUTBID_SECONDS * 1000 ? t + AUCTION_OUTBID_SECONDS * 1000 : a.endsAt,
        log: [...a.log, { who: p.rival, amount, at: t }],
      };
      st = addFeed(st, {
        at: t, kind: outbidYou ? 'lose' : 'rival', landId: a.landId,
        text: outbidYou ? `${p.rival} outbid you by ${fmt(amount - was)} on ${landName(a.landId)}!` : `${p.rival} bid ${fmt(amount)} for ${landName(a.landId)}`,
      });
      break; // one bid per second keeps it readable
    }
    a = { ...a, lastSec: sec };
  }
  return { ...st, auction: a };
}

function finishAuction(s: GameState, at: number): GameState {
  const a = s.auction!;
  const L = s.listings[a.landId];
  let st: GameState = { ...s, auction: null };
  if (a.leader === 'you' && st.money >= a.bid) {
    st = buyLand(st, a.landId, a.bid);
    return addFeed(st, { at, kind: 'win', landId: a.landId, text: `You won ${landName(a.landId)} for ${fmt(a.bid)}!` });
  }
  let winner = a.leader;
  let price = a.bid;
  if (a.leader === 'you') {
    // could not pay: the best rival takes it
    const top = [...a.participants].sort((x, y) => y.max - x.max)[0];
    winner = top.rival;
    price = Math.min(top.max, a.bid);
    st = { ...st, reputation: Math.max(0, st.reputation - 5) };
  }
  if (!winner) {
    st = { ...st, listings: { ...st.listings, [a.landId]: { ...L, status: 'gone' } } };
    return addFeed(st, { at, kind: 'rival', landId: a.landId, text: `Nobody bid on ${landName(a.landId)}. Back tomorrow.` });
  }
  st = { ...st, listings: { ...st.listings, [a.landId]: { ...L, status: 'sold', soldTo: winner, soldFor: price, rivalPlan: [] } } };
  // update 2: bidding in an auction and losing costs 5% of your Money (never charged if you did not bid)
  if (a.log.some((x) => x.who === 'you')) {
    const lost = Math.round(st.money * LOST_BID_PENALTY);
    if (lost > 0) {
      st = { ...st, money: st.money - lost, lastAuctionLoss: { landId: a.landId, lost, winner, at } };
      st = addFeed(st, { at, kind: 'lose', landId: a.landId, text: `You lost the auction and paid ${fmt(lost)} (5% of your Money).` });
    }
  }
  return addFeed(st, {
    at, kind: 'lose', landId: a.landId,
    text: a.leader === 'you' ? `You could not pay ${fmt(a.bid)}. ${winner} took ${landName(a.landId)}.` : `${winner} won ${landName(a.landId)} for ${fmt(price)}.`,
  });
}

export function toggleWatch(s: GameState, landId: string): GameState {
  return { ...s, watched: s.watched.includes(landId) ? s.watched.filter((x) => x !== landId) : [...s.watched, landId] };
}

export { styleOf };
