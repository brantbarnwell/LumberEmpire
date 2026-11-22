import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { getState, update, useGame } from '../game/store';
import { minNextBid, placeBid, stepFor } from '../game/rivals';
import { LAND, LOST_BID_PENALTY, RIVALS } from '../game/data';
import { exactMoney, money } from '../game/format';
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
  const bump = useRef(new Animated.Value(1)).current;
  const beat = useRef(new Animated.Value(1)).current;
  const ND = Platform.OS !== 'web';
  useEffect(() => {
    bump.setValue(1.25);
    Animated.spring(bump, { toValue: 1, friction: 4, tension: 160, useNativeDriver: ND }).start();
  }, [a?.bid]);
  const secLeft = a ? Math.max(0, Math.ceil((a.endsAt - now) / 1000)) : 0;
  useEffect(() => {
    if (!a || secLeft > 10) return;
    beat.setValue(1.3);
    Animated.spring(beat, { toValue: 1, friction: 4, useNativeDriver: ND }).start();
  }, [secLeft]);
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

  const total = Math.max(1, (a.endsAt - a.startedAt) / 1000);
  const quick = [
    { label: 'Min bid', amount: next },
    { label: '+5%', amount: Math.max(next, Math.ceil((a.bid * 1.05) / step) * step) },
    { label: '+10%', amount: Math.max(next, Math.ceil((a.bid * 1.1) / step) * step) },
  ];
  const hot = left <= 10;

  return (
    <View style={[styles.box, winning ? styles.win : a.leader ? styles.lose : null]}>
      <View style={styles.row}>
        <Text style={styles.title}>{land.name}</Text>
        <Animated.Text style={[styles.timer, hot && { color: C.red, transform: [{ scale: beat }] }]}>{left}s</Animated.Text>
      </View>
      <View style={styles.timeBar}><View style={[styles.timeFill, { width: `${Math.min(100, (left / total) * 100)}%`, backgroundColor: hot ? C.red : left < 25 ? C.gold : C.leafLight }]} /></View>

      <View style={styles.bidRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bidLabel}>{a.leader ? 'Highest bid' : 'Opening price'}</Text>
          <Animated.Text style={[styles.bid, { transform: [{ scale: bump }] }]}>{money(a.bid)}</Animated.Text>
          <Text style={[styles.leader, { color: winning ? C.leaf : a.leader ? C.red : C.inkSoft }]}>
            {winning ? '👑 You are winning!' : a.leader ? `👑 ${a.leader} is winning` : 'No bids yet'}
          </Text>
        </View>
      </View>

      <View style={styles.faces}>
        <Face name="You" color={C.leafLight} lead={winning} />
        {a.participants.map((p) => (
          <Face key={p.rival} name={p.rival} color={RIVAL_COLORS[RIVALS.findIndex((r) => r.name === p.rival) % RIVAL_COLORS.length]} lead={a.leader === p.rival} />
        ))}
      </View>

      <Text style={styles.risk}>If you lose, you pay 5% of your Money, {exactMoney(s.money * LOST_BID_PENALTY)}.</Text>
      {a.outbid && !winning && <Text style={styles.outbid}>⚡ You were outbid! Bid again: you get at least 10 more seconds.</Text>}
      {err && <Text style={styles.err}>{err}</Text>}
      {!winning && (
        <>
          <View style={[styles.row, { gap: 6, marginTop: 8 }]}>
            {quick.map((q, i) => (
              <Button key={q.label} style={{ flex: 1 }} small variant={i === 0 ? 'green' : 'gold'} label={q.label} sub={money(q.amount)} disabled={s.money < q.amount} onPress={() => bid(q.amount)} />
            ))}
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
      <View style={styles.log}>
        {[...a.log].reverse().slice(0, 5).map((b, i) => (
          <Text key={i} style={[styles.logText, b.who === 'you' && { color: C.leaf }, i === 0 && { fontWeight: '900' }]}>
            {i === 0 ? '▶ ' : ''}{b.who === 'you' ? 'You' : b.who} bid {money(b.amount)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const RIVAL_COLORS = ['#c9372a', '#7a3fb0', '#2f6fb0', '#d9661f'];

function Face({ name, color, lead }: { name: string; color: string; lead: boolean }) {
  const initials = name === 'You' ? 'YOU' : name.split(' ').map((w) => w[0]).join('').slice(0, 2);
  return (
    <View style={{ alignItems: 'center', width: 66 }}>
      <Text style={{ fontSize: 14, height: 18, opacity: lead ? 1 : 0 }}>👑</Text>
      <View style={[styles.face, { backgroundColor: color, borderColor: lead ? C.gold : 'rgba(0,0,0,0.25)', transform: [{ scale: lead ? 1.12 : 1 }] }]}>
        <Text style={styles.faceText}>{initials}</Text>
      </View>
      <Text style={styles.faceName} numberOfLines={1}>{name.replace(' Inc', '').replace(' Corp', '').replace(' Co.', '')}</Text>
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
  timeBar: { height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.1)', overflow: 'hidden', marginTop: 4 },
  timeFill: { height: '100%', borderRadius: 4 },
  bidRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  faces: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 },
  face: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  faceText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  faceName: { fontSize: 10, fontWeight: '800', color: C.inkSoft, marginTop: 2 },
  risk: { fontSize: 11.5, fontWeight: '900', color: '#b3261e', marginTop: 8 },
  bidLabel: { fontSize: 11, fontWeight: '800', color: C.inkSoft, marginTop: 4 },
  bid: { fontSize: 34, fontWeight: '900', color: C.money, alignSelf: 'flex-start' },
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
