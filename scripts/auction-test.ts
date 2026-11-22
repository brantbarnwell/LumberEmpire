// npm run auction-test: do rivals really outbid you in land auctions? Uses the real game rules.
import { newGame, ensureListings, tick, GameState } from '../src/game/logic';
import { startAuction, placeBid, minNextBid } from '../src/game/rivals';
import { LAND } from '../src/game/data';

function playAuction(dayOffset: number, landId: string, capX: number, verbose = false) {
  const t0 = new Date(2026, 11, 1 + dayOffset, 12).getTime();
  let s: GameState = ensureListings({ ...newGame(t0), money: 1e9 }, t0);
  if (!s.listings[landId]) return null;
  s = { ...s, listings: { ...s.listings, [landId]: { ...s.listings[landId], saleType: 'auction', status: 'open' } } };
  s = startAuction(s, landId, t0)!;
  const asking = LAND.find((l) => l.id === landId)!.asking;
  const cap = asking * capX;
  let now = t0;
  let outbidCount = 0;
  let wasLeader = false;
  let lastOutbidAt = -1;
  const lines: string[] = [];
  const say = (x: string) => verbose && lines.push(`${((now - t0) / 1000).toFixed(0).padStart(3)}s  ${x}`);
  let seen = 0;
  while (s.auction && now < t0 + 600_000) {
    now += 1000;
    s = tick(s, 1, now);
    const a = s.auction;
    // print new bids
    if (verbose && a) for (const b of a.log.slice(seen)) say(`${b.who === 'you' ? 'YOU' : b.who} bid $${b.amount.toLocaleString()}  (${Math.round((a.endsAt - now) / 1000)}s left)`);
    if (a) seen = a.log.length;
    if (!a) break;
    if (wasLeader && a.leader !== 'you') { outbidCount++; lastOutbidAt = now; }
    wasLeader = a.leader === 'you';
    // player reacts 2 seconds after being outbid (or at the start)
    if (a.leader !== 'you' && (lastOutbidAt < 0 || now - lastOutbidAt >= 2000)) {
      const bid = minNextBid(a);
      if (bid <= cap) {
        const r = placeBid(s, bid, now);
        if (!r.error) { s = r.state; wasLeader = true; seen = s.auction!.log.length; say(`YOU bid $${bid.toLocaleString()}`); }
      }
    }
  }
  const won = !!s.lands[landId];
  const L = s.listings[landId];
  const price = won ? s.lands[landId].paid : L?.soldFor ?? 0;
  if (verbose) lines.push(`RESULT: ${won ? 'YOU WON' : `${L?.soldTo} won`} at $${Math.round(price).toLocaleString()} (${(price / asking).toFixed(2)}x asking). Rivals outbid you ${outbidCount} times.`);
  return { won, outbidCount, priceX: price / asking, lines };
}

const ex = playAuction(0, 'pine', 1.2, true)!;
console.log('ONE AUCTION, Pine Grove (asking $15,000). You bid the minimum each time you are outbid, up to 1.2x asking:');
ex.lines.forEach((l) => console.log('  ' + l));

console.log('\n200 auctions (5 lands x 40 days). Your limit vs. result:');
console.log('your limit   | rivals outbid you at least once | you won | avg price when you win');
for (const capX of [0.8, 1.0, 1.15, 1.3, 1.5]) {
  let n = 0, outbid = 0, won = 0, paid = 0;
  for (let d = 0; d < 40; d++) for (const id of ['pine', 'hillside', 'river', 'redwood', 'mountain']) {
    const r = playAuction(d, id, capX);
    if (!r) continue;
    n++;
    if (r.outbidCount > 0) outbid++;
    if (r.won) { won++; paid += r.priceX; }
  }
  console.log(`${(capX + 'x asking').padEnd(13)}| ${String(Math.round((outbid / n) * 100) + '%').padEnd(32)}| ${String(Math.round((won / n) * 100) + '%').padEnd(8)}| ${won ? (paid / won).toFixed(2) + 'x asking' : '-'}`);
}
