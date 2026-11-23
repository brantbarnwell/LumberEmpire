import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getState, update, useGame } from '../game/store';
import {
  GameState, crewByLand, logPrice, acceptCounter, buyLandUpgrade, landOutputBase, landUpgradeCost, lostBidCost, makeOffer, rejectCounter, woodMultFor,
} from '../game/logic';
import { LAND, LAND_UPGRADES, PERSONALITY, WOOD_NAMES, WOODS, RIVALS } from '../game/data';
import { LogIcon } from './art/Icons';
import { unitText } from './SellButton';
import { canStartAuction, startAuction, toggleWatch } from '../game/rivals';
import { AuctionPanel } from './AuctionPanel';
import { LandArt } from './art/Buildings';
import { duration, exactMoney, money, small } from '../game/format';
import { haptic } from '../services/haptics';
import { Button, Card, ProgressBar } from './ui';
import { showPopup } from './popup';
import { C } from './theme';

/** Update 4: the tree type a land grows and what one of its logs sells for today. */
function WoodLine({ s, l, now }: { s: GameState; l: (typeof LAND)[number]; now: number }) {
  const idx = WOODS.findIndex((w) => w.id === l.wood);
  const crew = crewByLand(s).find((c) => c.landId === l.id)?.helpers.length ?? 0;
  return (
    <View style={{ marginTop: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <LogIcon type={l.wood} size={22} />
        <Text style={[styles.woodName, { flex: 1 }]}>
          {WOOD_NAMES[l.wood]}  <Text style={styles.woodPrice}>{unitText(logPrice(s, l.wood, now))}/log</Text>
        </Text>
      </View>
      <Text style={styles.sub}>{idx > 0 ? `Mostly ${WOOD_NAMES[l.wood]}, plus ${idx === 1 ? 'Pine' : `${idx} older woods`}` : 'Pine, the starting wood'}{s.lands[l.id] ? ` · crew ${crew}/${l.crew}` : ''}</Text>
    </View>
  );
}

export function LandScreen() {
  const s = useGame();
  const now = Date.now();
  const [open, setOpen] = useState<string | null>(null);
  const owned = LAND.filter((l) => s.lands[l.id]);
  const forSale = LAND.filter((l) => !s.lands[l.id]).sort((a, b) => Number(s.watched.includes(b.id)) - Number(s.watched.includes(a.id)));

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

      <Card>
        <Text style={styles.label}>RIVAL ACTIVITY (BOTS, NOT REAL PEOPLE)</Text>
        {s.feed.length === 0 && <Text style={styles.sub}>{RIVALS.map((r) => r.name).join(', ')} also want land. Their moves show up here.</Text>}
        {s.feed.slice(0, 8).map((f, i) => (
          <Text key={i} style={[styles.feed, f.kind === 'lose' && { color: C.red }, f.kind === 'win' && { color: C.leaf }, f.kind === 'you' && { color: C.inkSoft }]}>
            {f.landId && s.watched.includes(f.landId) ? '⭐ ' : ''}{ago(now - f.at)} · {f.text}
          </Text>
        ))}
      </Card>

      {owned.length > 0 && <Text style={styles.section}>Your land</Text>}
      {owned.map((l) => {
        const mine = s.lands[l.id];
        return (
          <Card key={l.id}>
            <View style={styles.row}>
              <View style={styles.landArt}><LandArt id={l.id} width={88} owned={!!s.lands[l.id]} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{l.name}</Text>
                <WoodLine s={s} l={l} now={now} />
                <Text style={styles.owned}>+{small(landOutputBase(l.id, s) * woodMultFor(s, now, l.wood))} wood/sec</Text>
                <View style={[styles.row, { marginTop: 4, gap: 3 }]}>
                  {LAND_UPGRADES.map((u) => <Text key={u.id} style={{ fontSize: 14, opacity: mine.upgrades.includes(u.id) ? 1 : 0.25 }}>🌲</Text>)}
                  <Text style={styles.small}> Land level {mine.upgrades.length + 1}/{LAND_UPGRADES.length + 1}</Text>
                </View>
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
        if (L && L.status === 'sold') {
          return (
            <Card key={l.id} style={{ opacity: 0.6 }}>
              <View style={styles.row}>
                <View style={styles.landArt}><LandArt id={l.id} width={88} owned={!!s.lands[l.id]} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{l.name}</Text>
                  <Text style={[styles.sub, { color: C.red }]}>Sold to {L.soldTo} for {money(L.soldFor ?? 0)}. New sellers tomorrow.</Text>
                </View>
              </View>
            </Card>
          );
        }
        if (!L || L.status === 'gone') {
          return (
            <Card key={l.id} style={{ opacity: 0.6 }}>
              <View style={styles.row}>
                <View style={styles.landArt}><LandArt id={l.id} width={88} owned={!!s.lands[l.id]} /></View>
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
        const watched = s.watched.includes(l.id);
        const rivalsIn = L.rivalBuysAt !== null;
        const head = (
          <View style={styles.row}>
            <View style={styles.landArt}><LandArt id={l.id} width={88} owned={!!s.lands[l.id]} /></View>
            <View style={{ flex: 1 }}>
              <View style={styles.row}>
                <Text style={[styles.name, { flex: 1 }]}>{l.name}</Text>
                <Text style={[styles.badge, L.saleType === 'auction' && styles.badgeAuction]}>{L.saleType === 'auction' ? 'AUCTION' : 'MAKE AN OFFER'}</Text>
                <Text style={styles.star} onPress={() => update((st) => toggleWatch(st, l.id))} accessibilityLabel="Watch this land">{watched ? '⭐' : '☆'}</Text>
              </View>
              <WoodLine s={s} l={l} now={now} />
              <Text style={styles.sub}>{l.acres} acres · +{small(l.woodPerSec)} logs/sec · crew {l.crew}</Text>
              <Text style={styles.asking}>Asking {money(l.asking)}</Text>
              {L.saleType === 'negotiate' && <Text style={styles.sub}>Seller: {L.seller} · {P.label}</Text>}
              {L.rivalOffer && L.saleType === 'negotiate' && <Text style={[styles.sub, { color: C.red }]}>Best rival offer: {L.rivalOffer.rival} {money(L.rivalOffer.amount)}</Text>}
              {rivalsIn && L.rivalBuysAt! > now && (
                <Text style={[styles.sub, { color: C.bark }]}>
                  {L.saleType === 'auction' ? `Rivals will run this auction without you in about ${duration(L.rivalBuysAt! - now)}.` : `Rivals are interested. One may buy it in about ${duration(L.rivalBuysAt! - now)}.`}
                </Text>
              )}
              {!rivalsIn && <Text style={[styles.sub, { color: C.leaf }]}>No rivals want this small plot. Take your time.</Text>}
            </View>
          </View>
        );
        if (L.saleType === 'auction') {
          const live = s.auction?.landId === l.id;
          return (
            <Card key={l.id}>
              {head}
              {live ? <AuctionPanel /> : (
                <>
                  <Text style={[styles.sub, { marginTop: 6 }]}>60-second auction against rival companies. Bids start at half the asking price. If a rival outbids you near the end, you get 10 more seconds.</Text>
                  <View style={styles.risk}><Text style={styles.riskText}>If you lose, you pay 5% of your Money, {exactMoney(lostBidCost(s))}.</Text></View>
                  <Button style={{ marginTop: 8 }} variant="gold" label={s.auction ? 'Another auction is running' : 'Join auction now'} disabled={!canStartAuction(s, l.id)}
                    onPress={() => update((st) => startAuction(st, l.id, Date.now())) && haptic.success()} />
                </>
              )}
            </Card>
          );
        }
        return (
          <Card key={l.id}>
            {head}
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

function ago(ms: number) {
  if (ms < 60000) return 'now';
  return duration(ms).split(' ')[0] + ' ago';
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
  landArt: { width: 88, marginRight: 4 },
  woodName: { fontSize: 14, fontWeight: '900', color: C.ink },
  woodPrice: { fontSize: 14, fontWeight: '900', color: C.money },
  risk: { marginTop: 8, backgroundColor: '#fdecea', borderRadius: 10, borderWidth: 1.5, borderColor: '#f3b3ab', padding: 8 },
  riskText: { fontSize: 12, fontWeight: '900', color: '#b3261e' },
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
  feed: { fontSize: 12, fontWeight: '700', color: C.ink, paddingVertical: 2 },
  badge: { fontSize: 9.5, fontWeight: '900', color: C.bark, backgroundColor: '#efe2c4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  badgeAuction: { color: '#fff', backgroundColor: '#c2571a' },
  star: { fontSize: 20, paddingHorizontal: 4 },
  foot: { fontSize: 11, color: C.inkSoft, fontWeight: '600', textAlign: 'center' },
});
