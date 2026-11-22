import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { getState, update, useGame } from '../game/store';
import { minNextBid, placeBid, stepFor } from '../game/rivals';
import { LAND, RIVALS } from '../game/data';
import { money } from '../game/format';
import { haptic } from '../services/haptics';
import { Button } from './ui';
import { C } from './theme';

function useNow() {
  const [n, setN] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setN(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  return n;
}

/** The live 60-second auction: timer, highest bid, who is winning, bid buttons. */
export function AuctionPanel() {
  const s = useGame();
  const now = useNow();
  const a = s.auction;
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const lastLen = useRef(0);
  useEffect(() => {
    if (!a) return;
    const last = a.log[a.log.length - 1];
    if (a.log.length > lastLen.current && last && last.who !== 'you' && a.log.some((x) => x.who === 'you')) haptic.error();
    lastLen.current = a.log.length;
  }, [a?.log.length]);
  if (!a) return null;
  const land = LAND.find((l) => l.id === a.landId)!;
  const left = Math.max(0, Math.ceil((a.endsAt - now) / 1000));
  const winning = a.leader === 'you';
  const next = minNextBid(a);
  const step = stepFor(a.landId);

  const bid = (amount: number) => {
    const r = placeBid(getState(), amount, Date.now());
    if (r.error) { setErr(r.error); haptic.error(); return; }
    setErr(null);
    update(() => r.state);
    haptic.chop();
  };

  return (
    <View style={[styles.box, winning ? styles.win : a.leader ? styles.lose : null]}>
      <View style={styles.row}>
        <Text style={styles.title}>🔨 {land.name} auction</Text>
        <Text style={[styles.timer, left <= 10 && { color: C.red }]}>{left}s</Text>
      </View>
      <Text style={styles.bidLabel}>{a.leader ? 'Highest bid' : 'Opening price'}</Text>
      <Text style={styles.bid}>{money(a.bid)}</Text>
      <Text style={[styles.leader, { color: winning ? C.leaf : a.leader ? C.red : C.inkSoft }]}>
        {winning ? '✅ You are winning!' : a.leader ? `${a.leader} is winning` : 'No bids yet'}
      </Text>
      {a.outbid && !winning && <Text style={styles.outbid}>You were outbid! You get at least 10 seconds to bid higher.</Text>}
      {err && <Text style={styles.err}>{err}</Text>}
      {!winning && (
        <>
          <View style={[styles.row, { gap: 6, marginTop: 8 }]}>
            <Button style={{ flex: 1 }} label={`Bid ${money(next)}`} disabled={s.money < next} onPress={() => bid(next)} />
            <Button style={{ flex: 1 }} variant="gold" label={`Bid ${money(next + step * 4)}`} disabled={s.money < next + step * 4} onPress={() => bid(next + step * 4)} />
          </View>
          <View style={[styles.row, { gap: 6, marginTop: 6 }]}>
            <View style={styles.input}>
              <Text style={styles.dollar}>$</Text>
              <TextInput value={text} onChangeText={setText} keyboardType="number-pad" placeholder={String(next)} style={styles.inputText} maxLength={10} accessibilityLabel="Your bid" />
            </View>
            <Button small variant="brown" label="Bid this" onPress={() => bid(parseFloat(text.replace(/[^0-9.]/g, '')) || 0)} />
          </View>
        </>
      )}
      <Text style={styles.small}>You have {money(s.money)}. Asking price was {money(land.asking)}.</Text>
      <Text style={[styles.small, { marginTop: 6 }]}>
        Bidding against: {a.participants.map((p) => `${p.rival} (${RIVALS.find((r) => r.name === p.rival)!.blurb.toLowerCase()})`).join(', ')}
      </Text>
      <View style={styles.log}>
        {[...a.log].reverse().slice(0, 6).map((b, i) => (
          <Text key={i} style={[styles.logText, b.who === 'you' && { color: C.leaf }]}>
            {b.who === 'you' ? 'You' : b.who} bid {money(b.amount)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 10, borderRadius: 14, padding: 12, backgroundColor: '#fff4dc', borderWidth: 2, borderColor: C.gold },
  win: { borderColor: C.leafLight, backgroundColor: '#eaf8e6' },
  lose: { borderColor: C.red, backgroundColor: '#fdecea' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: '900', color: C.ink, flex: 1 },
  timer: { fontSize: 30, fontWeight: '900', color: C.ink },
  bidLabel: { fontSize: 11, fontWeight: '800', color: C.inkSoft, marginTop: 4 },
  bid: { fontSize: 30, fontWeight: '900', color: C.money },
  leader: { fontSize: 15, fontWeight: '900' },
  outbid: { fontSize: 12.5, fontWeight: '800', color: C.red, marginTop: 4 },
  err: { fontSize: 12, fontWeight: '800', color: C.red, marginTop: 4 },
  input: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1.5, borderColor: C.cardEdge, paddingHorizontal: 8, height: 38 },
  dollar: { fontWeight: '900', fontSize: 16, color: C.money },
  inputText: { flex: 1, fontWeight: '900', fontSize: 16, color: C.money, paddingVertical: 0 },
  small: { fontSize: 11, fontWeight: '700', color: C.inkSoft, marginTop: 6 },
  log: { marginTop: 6, gap: 2 },
  logText: { fontSize: 12, fontWeight: '700', color: C.ink },
});
