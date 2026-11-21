import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getState, update, useGame } from '../game/store';
import {
  acceptCounter, buyLandUpgrade, landOutputBase, landUpgradeCost, makeOffer, rejectCounter, woodMultFor,
} from '../game/logic';
import { LAND, LAND_UPGRADES, PERSONALITY, WOOD_NAMES } from '../game/data';
import { duration, money, small } from '../game/format';
import { haptic } from '../services/haptics';
import { Button, Card, ProgressBar } from './ui';
import { showPopup } from './popup';
import { C } from './theme';

export function LandScreen() {
  const s = useGame();
  const now = Date.now();
  const [open, setOpen] = useState<string | null>(null);
  const owned = LAND.filter((l) => s.lands[l.id]);
  const forSale = LAND.filter((l) => !s.lands[l.id]);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Land</Text>
      <Card style={styles.rep}>
        <Text style={styles.label}>YOUR REPUTATION</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}><ProgressBar value={s.reputation / 100} color={C.leafLight} height={10} /></View>
          <Text style={styles.repNum}>{Math.round(s.reputation)}/100</Text>
        </View>
        <Text style={styles.sub}>Fair offers raise it and sellers go easier on you. Lowballing lowers it.</Text>
      </Card>

      {owned.length > 0 && <Text style={styles.section}>Your land</Text>}
      {owned.map((l) => {
        const mine = s.lands[l.id];
        return (
          <Card key={l.id}>
            <View style={styles.row}>
              <Text style={styles.icon}>{l.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{l.name}</Text>
                <Text style={styles.sub}>{l.acres} acres · {l.trees} trees · {WOOD_NAMES[l.wood]}</Text>
                <Text style={styles.owned}>+{small(landOutputBase(l.id, s) * woodMultFor(s, now, l.wood))} wood/sec</Text>
              </View>
            </View>
            <View style={[styles.row, { marginTop: 8, flexWrap: 'wrap' }]}>
              {LAND_UPGRADES.map((u) => {
                const has = mine.upgrades.includes(u.id);
                const cost = landUpgradeCost(l.id, u.id);
                return (
                  <Button
                    key={u.id}
                    small
                    style={{ flexGrow: 1 }}
                    variant={has ? 'ghost' : s.money >= cost ? 'green' : 'ghost'}
                    label={has ? `${u.name} ✓` : `${u.name} +${Math.round(u.bonus * 100)}%`}
                    sub={has ? undefined : money(cost)}
                    disabled={has || s.money < cost}
                    onPress={() => update((st) => buyLandUpgrade(st, l.id, u.id)) && haptic.success()}
                  />
                );
              })}
            </View>
          </Card>
        );
      })}

      <Text style={styles.section}>For sale</Text>
      <Text style={styles.sub}>Every piece of land has an owner. Make an offer in Money. They can accept, say no, or counter. New sellers every day.</Text>
      {forSale.map((l) => {
        const L = s.listings[l.id];
        const goneUntil = s.landGoneUntil[l.id] ?? 0;
        if (!L || L.status === 'gone') {
          return (
            <Card key={l.id} style={{ opacity: 0.6 }}>
              <View style={styles.row}>
                <Text style={styles.icon}>{l.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{l.name}</Text>
                  <Text style={styles.sub}>
                    {goneUntil > now ? `The seller walked away. Back in ${duration(goneUntil - now)}.` : 'A new seller lists it tomorrow.'}
                  </Text>
                </View>
              </View>
            </Card>
          );
        }
        const P = PERSONALITY[L.personality];
        const isOpen = open === l.id;
        return (
          <Card key={l.id}>
            <View style={styles.row}>
              <Text style={styles.icon}>{l.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{l.name}</Text>
                <Text style={styles.sub}>{l.acres} acres · {l.trees} trees · {WOOD_NAMES[l.wood]} · +{small(l.woodPerSec)} wood/sec</Text>
                <Text style={styles.asking}>Asking {money(l.asking)}</Text>
                <Text style={styles.sub}>Seller: {L.seller} · {P.label}</Text>
              </View>
            </View>
            {!isOpen ? (
              <Button style={{ marginTop: 8 }} variant="brown" label={L.history.length ? 'Keep negotiating' : 'Make an offer'} onPress={() => setOpen(l.id)} />
            ) : (
              <Negotiation landId={l.id} onClose={() => setOpen(null)} />
            )}
          </Card>
        );
      })}
      <Text style={styles.foot}>Land is bought with Money only. Gold and real money can never be used to bid on land.</Text>
    </ScrollView>
  );
}

function Negotiation({ landId, onClose }: { landId: string; onClose: () => void }) {
  const s = useGame();
  const L = s.listings[landId];
  const def = LAND.find((x) => x.id === landId)!;
  const [text, setText] = useState(String(Math.round(def.asking * 0.9)));
  if (!L) return null;
  const P = PERSONALITY[L.personality];
  const amount = Math.round(parseFloat(text.replace(/[^0-9.]/g, '')) || 0);

  const offer = () => {
    const r = makeOffer(getState(), landId, amount, Date.now());
    update(() => r.state);
    if (r.outcome.kind === 'accepted') {
      haptic.success();
      showPopup({ icon: def.icon, title: `You bought ${def.name}!`, body: `+${small(def.woodPerSec)} wood/sec. ${Object.keys(getState().lands).length === 1 ? 'Your workshop is now unlocked!' : ''}` });
      onClose();
    } else if (r.outcome.kind === 'error') {
      haptic.error();
      showPopup({ icon: '💬', title: r.outcome.message });
    } else if (r.outcome.kind === 'walked') {
      haptic.error();
      showPopup({ icon: '🚶', title: 'Seller walked away', body: r.outcome.message });
      onClose();
    }
  };

  return (
    <View style={styles.neg}>
      <Text style={styles.sub}>{P.blurb}. Their lowest price is secret.</Text>
      <View style={[styles.row, { marginTop: 6 }]}>
        <Text style={styles.small}>Seller mood</Text>
        <View style={{ flex: 1 }}>
          <ProgressBar value={L.mood / 100} color={L.mood > 50 ? C.leafLight : L.mood > 25 ? C.gold : C.red} height={8} />
        </View>
        <Text style={styles.small}>No {L.rejections}/3</Text>
      </View>

      {L.history.length > 0 && (
        <View style={styles.history}>
          {L.history.slice(-6).map((h, i) => (
            <Text key={i} style={[styles.hist, h.who === 'seller' && { color: C.bark }]}>
              {h.who === 'seller' ? `${L.seller}: ` : ''}{h.text}
            </Text>
          ))}
        </View>
      )}

      {L.status === 'counter' && L.counter !== null ? (
        <View style={[styles.row, { marginTop: 8 }]}>
          <Button
            style={{ flex: 1 }}
            label={`Accept ${money(L.counter)}`}
            disabled={s.money < L.counter}
            onPress={() => {
              if (update((st) => acceptCounter(st, landId))) {
                haptic.success();
                showPopup({ icon: def.icon, title: `You bought ${def.name}!`, body: `+${small(def.woodPerSec)} wood/sec.` });
                onClose();
              }
            }}
          />
          <Button style={{ flex: 1 }} variant="ghost" label="Say no" onPress={() => update((st) => rejectCounter(st, landId))} />
        </View>
      ) : null}

      <Text style={[styles.small, { marginTop: 8 }]}>{L.status === 'counter' ? 'Or counter with your own offer:' : 'Your offer'}</Text>
      <View style={styles.row}>
        <View style={styles.input}>
          <Text style={styles.dollar}>$</Text>
          <TextInput value={text} onChangeText={setText} keyboardType="number-pad" style={styles.inputText} maxLength={10} />
        </View>
        <Button label="Make Offer" disabled={amount <= 0 || amount > s.money} onPress={offer} />
      </View>
      <View style={[styles.row, { marginTop: 6 }]}>
        {[0.7, 0.85, 1].map((f) => (
          <Button key={f} small variant="ghost" style={{ flex: 1 }} label={`${Math.round(f * 100)}%`} sub={money(def.asking * f)} onPress={() => setText(String(Math.round(def.asking * f)))} />
        ))}
      </View>
      {amount > s.money && <Text style={[styles.small, { color: C.red }]}>You only have {money(s.money)}.</Text>}
      <Button small variant="ghost" style={{ marginTop: 6 }} label="Close" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.cream },
  content: { padding: 14, gap: 10, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '900', color: C.forest },
  section: { fontSize: 18, fontWeight: '900', color: C.forest, marginTop: 6 },
  label: { fontSize: 11, fontWeight: '900', color: C.inkSoft, letterSpacing: 1, marginBottom: 4 },
  rep: { gap: 4 },
  repNum: { fontWeight: '900', color: C.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { fontSize: 34, width: 46, textAlign: 'center' },
  name: { fontSize: 16, fontWeight: '900', color: C.ink },
  sub: { fontSize: 12, fontWeight: '700', color: C.inkSoft },
  small: { fontSize: 11, fontWeight: '800', color: C.inkSoft },
  asking: { fontSize: 15, fontWeight: '900', color: C.money, marginTop: 2 },
  owned: { fontSize: 13, fontWeight: '900', color: C.leaf, marginTop: 2 },
  neg: { marginTop: 10, borderTopWidth: 1, borderTopColor: C.cardEdge, paddingTop: 10 },
  history: { backgroundColor: 'rgba(107,68,35,0.07)', borderRadius: 10, padding: 8, marginTop: 8, gap: 3 },
  hist: { fontSize: 12, fontWeight: '700', color: C.ink },
  input: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1.5,
    borderColor: C.cardEdge, paddingHorizontal: 8, height: 42,
  },
  dollar: { fontWeight: '900', fontSize: 17, color: C.money },
  inputText: { flex: 1, fontWeight: '900', fontSize: 17, color: C.money, paddingVertical: 0 },
  foot: { fontSize: 11, color: C.inkSoft, fontWeight: '600', textAlign: 'center' },
});
