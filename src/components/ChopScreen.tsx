import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { getState, update, useGame } from '../game/store';
import {
  bestPrice, boostMult, chop, demandFor, demandLabel, devSpawnGolden, durabilityPower, marketPriceFor,
  moneyMult, repair, repairCost, salesPerSec, woodPerChop,
} from '../game/logic';
import { AXES, CRIT_CHANCE, CRIT_MULT, PRICE_MAX_FACTOR, PRICE_MIN_FACTOR } from '../game/data';
import { duration, money, small, whole } from '../game/format';
import { recordWood } from '../game/rate';
import { haptic } from '../services/haptics';
import { Tree } from './Tree';
import { showPopup } from './popup';
import { Button, Card, DurabilityBar } from './ui';
import { C } from './theme';

function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

function Background() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={[C.sky1, C.sky2]} style={StyleSheet.absoluteFill} />
      <View style={[styles.sun]} />
      {[
        [8, 40, 0.55], [70, 60, 0.7], [250, 30, 0.6], [300, 70, 0.75], [-20, 90, 0.8], [330, 100, 0.85],
      ].map(([left, top, sc], i) => (
        <View key={i} style={{ position: 'absolute', left: `${(Number(left) / 360) * 100}%`, bottom: 70 + Number(top) * 0.4, transform: [{ scale: Number(sc) }] }}>
          <View style={styles.bgTree} />
        </View>
      ))}
      <View style={styles.hill} />
      <View style={styles.ground} />
    </View>
  );
}

export function ChopScreen({ onOpenUpgrades }: { onOpenUpgrades: () => void }) {
  const s = useGame();
  const now = useNow();
  const axe = AXES[s.axeIndex];
  const golden = !!s.treeGoldenUntil && s.treeGoldenUntil > now;
  const goldenLeft = golden ? Math.ceil((s.treeGoldenUntil! - now) / 1000) : 0;

  const doChop = () => {
    const t = Date.now();
    const { state, result } = chop(getState(), t);
    update(() => state);
    recordWood(result.wood + result.fellBonus, t);
    if (result.crit) haptic.crit();
    else haptic.chop();
    if (result.golden) {
      haptic.success();
      showPopup({ icon: '🌟', title: `You found a Golden Tree! +${result.golden.gold} Gold`, body: `Bonus: ${money(result.golden.money)} and golden wood.` });
    }
    if (result.axeBroke) showPopup({ icon: '🔧', title: `Your ${axe.name} broke!`, body: 'It works like a rusty axe until you repair it.' });
    else if (result.axeLow) showPopup({ icon: '⚠️', title: `${axe.name} at 25%`, body: 'It only chops at half power now. Repair it soon.' });
    return result;
  };

  const boosts = s.boosts.filter((b) => b.until > now);
  const dur = s.axeDurability;
  const fullCost = repairCost(s, 100);

  return (
    <View style={{ flex: 1 }}>
      <Background />
      <ScrollView contentContainerStyle={styles.content} bounces={false}>
        {(boosts.length > 0 || s.vipActive) && (
          <View style={styles.boostRow}>
            {s.vipActive && <Text style={[styles.boost, { backgroundColor: '#5b2d8e' }]}>👑 VIP 2x Money</Text>}
            {boosts.map((b, i) => (
              <Text key={i} style={styles.boost}>
                {b.kind === 'wood' ? '🪵' : '💵'} {b.mult}x {b.kind === 'wood' ? 'Wood' : 'Money'} · {duration(b.until - now)}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.treeArea}>
          <Tree
            chops={s.treeChops}
            golden={golden}
            goldenLeft={goldenLeft}
            onChop={doChop}
            onDevLongPress={__DEV__ ? () => update((st) => devSpawnGolden(st, Date.now())) : undefined}
          />
          <Text style={styles.tapHint}>Tap the tree to chop!</Text>
        </View>

        <Card style={styles.axeCard}>
          <View style={styles.axeRow}>
            <Text style={{ fontSize: 30 }}>🪓</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.h}>{axe.name}</Text>
              <Text style={styles.sub}>
                {small(woodPerChop(s, now))} wood per chop · {Math.round(CRIT_CHANCE * 100)}% crit for {CRIT_MULT}x
              </Text>
              <View style={styles.durRow}>
                <DurabilityBar value={dur} width={110} />
                <Text style={[styles.durText, dur < 25 && { color: C.red }]}>
                  {dur}%{dur === 0 ? ' BROKEN' : durabilityPower(dur) < 1 ? ` · ${durabilityPower(dur) * 100}% power` : ''}
                </Text>
              </View>
            </View>
            <View style={{ gap: 6 }}>
              {dur < 50 && fullCost > 0 && (
                <Button
                  small
                  variant={dur < 25 ? 'red' : 'brown'}
                  label={`Repair ${money(fullCost)}`}
                  disabled={s.money < fullCost}
                  onPress={() => {
                    if (update((st) => repair(st, 100))) haptic.success();
                  }}
                />
              )}
              <Button small variant="gold" label="Upgrades" onPress={onOpenUpgrades} />
            </View>
          </View>
        </Card>

        <SellPanel now={now} />
      </ScrollView>
    </View>
  );
}

function SellPanel({ now }: { now: number }) {
  const s = useGame();
  const market = marketPriceFor(s.dayKey);
  const demand = demandFor(s.dayKey);
  const label = demandLabel(demand);
  const minP = Math.round(market * PRICE_MIN_FACTOR * 100) / 100;
  const maxP = Math.round(market * PRICE_MAX_FACTOR * 100) / 100;
  const [text, setText] = useState(s.sellPrice.toFixed(2));
  useEffect(() => setText(s.sellPrice.toFixed(2)), [s.sellPrice]);

  const setPrice = (p: number) => {
    const v = Math.round(Math.min(maxP, Math.max(minP, p)) * 100) / 100;
    update((st) => (st.sellPrice === v ? null : { ...st, sellPrice: v }));
  };

  const perMin = salesPerSec({ ...s, selling: true }, s.sellPrice, s.wood) * 60;
  const profitPerMin = perMin * s.sellPrice * moneyMult(s, now);
  const best = bestPrice(s.dayKey);
  const levels = ['Low', 'Normal', 'High', 'Very High'];
  const lvl = levels.indexOf(label);
  const ratio = s.sellPrice / market;
  const priceNote = ratio > 1.6 ? 'Very high price. Wood will sell slowly.' : ratio < 0.6 ? 'Very cheap. Sells fast, but you lose profit.' : null;

  return (
    <Card style={styles.sellCard}>
      <View style={styles.sellHead}>
        <Text style={styles.h}>Sell Wood</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.sub}>{s.selling ? 'Selling' : 'Paused'}</Text>
          <Switch
            value={s.selling}
            onValueChange={(v) => { update((st) => ({ ...st, selling: v })); }}
            trackColor={{ true: C.leafLight, false: '#bbb' }}
          />
        </View>
      </View>

      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>Your price</Text>
        <View style={styles.priceInput}>
          <Text style={styles.priceDollar}>$</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            onEndEditing={() => {
              const v = parseFloat(text);
              if (isFinite(v)) setPrice(v);
              else setText(s.sellPrice.toFixed(2));
            }}
            onBlur={() => {
              const v = parseFloat(text);
              if (isFinite(v)) setPrice(v);
            }}
            keyboardType="decimal-pad"
            returnKeyType="done"
            style={styles.priceText}
            maxLength={6}
          />
        </View>
        <Text style={styles.sub}>per wood</Text>
      </View>

      <Slider
        style={{ width: '100%', height: 36 }}
        minimumValue={minP}
        maximumValue={maxP}
        step={0.01}
        value={s.sellPrice}
        onValueChange={setPrice}
        minimumTrackTintColor={C.leafLight}
        maximumTrackTintColor="#d6c7a4"
        thumbTintColor={C.bark}
      />
      <View style={styles.sliderLabels}>
        <Text style={styles.tiny}>Very cheap</Text>
        <Text style={styles.tiny}>Market {money(market)}</Text>
        <Text style={styles.tiny}>Very expensive</Text>
      </View>

      <View style={styles.demandRow}>
        <Text style={styles.sub}>Demand today:</Text>
        <View style={styles.meter}>
          {levels.map((l, i) => (
            <View key={l} style={[styles.seg, { backgroundColor: i <= lvl ? ['#e5a33b', '#a8c94a', '#5fb85a', '#2e9d4d'][lvl] : 'rgba(0,0,0,0.1)' }]} />
          ))}
        </View>
        <Text style={[styles.sub, { fontWeight: '900', color: C.ink }]}>{label}</Text>
      </View>

      <View style={styles.forecast}>
        <View style={styles.fc}>
          <Text style={styles.fcNum}>{whole(perMin)}</Text>
          <Text style={styles.tiny}>wood sold / min</Text>
        </View>
        <View style={styles.fc}>
          <Text style={[styles.fcNum, { color: C.money }]}>{money(profitPerMin)}</Text>
          <Text style={styles.tiny}>est. profit / min</Text>
        </View>
        <View style={styles.fc}>
          <Text style={styles.fcNum}>{whole(s.soldToday)}</Text>
          <Text style={styles.tiny}>sold today</Text>
        </View>
      </View>
      <Text style={styles.hint}>
        {s.wood < 1
          ? 'Chop some wood and buyers will start coming.'
          : priceNote ?? `Tip: best profit is around ${money(best)} per wood today. More wood in stock brings more buyers.`}
        {boostMult(s, 'money', now) > 1 || s.vipActive ? ' Money boost active!' : ''}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 24, gap: 10 },
  sun: { position: 'absolute', right: 30, top: 18, width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff3b0', opacity: 0.9 },
  bgTree: {
    width: 0, height: 0, borderLeftWidth: 34, borderRightWidth: 34, borderBottomWidth: 110,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#6fa86b',
  },
  hill: { position: 'absolute', left: -60, right: -60, bottom: 0, height: 120, borderTopLeftRadius: 400, borderTopRightRadius: 400, backgroundColor: '#7cb66a' },
  ground: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 70, backgroundColor: '#5e9a52' },
  boostRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  boost: { backgroundColor: C.bark, color: '#fff', fontWeight: '800', fontSize: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  treeArea: { alignItems: 'center', paddingTop: 4 },
  tapHint: { marginTop: 8, color: C.forest, fontWeight: '800', fontSize: 13, opacity: 0.7 },
  axeCard: { paddingVertical: 10 },
  axeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  h: { fontSize: 17, fontWeight: '900', color: C.ink },
  sub: { fontSize: 12, color: C.inkSoft, fontWeight: '700' },
  tiny: { fontSize: 10.5, color: C.inkSoft, fontWeight: '700' },
  durRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  durText: { fontSize: 11, fontWeight: '800', color: C.inkSoft },
  sellCard: { gap: 6 },
  sellHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceLabel: { fontSize: 14, fontWeight: '800', color: C.ink },
  priceInput: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1.5,
    borderColor: C.cardEdge, paddingHorizontal: 8, height: 36,
  },
  priceDollar: { fontWeight: '900', fontSize: 17, color: C.money },
  priceText: { fontWeight: '900', fontSize: 17, color: C.money, width: 64, paddingVertical: 0 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -6 },
  demandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meter: { flexDirection: 'row', gap: 3, flex: 1 },
  seg: { flex: 1, height: 8, borderRadius: 4 },
  forecast: { flexDirection: 'row', gap: 8, marginTop: 2 },
  fc: { flex: 1, backgroundColor: 'rgba(107,68,35,0.08)', borderRadius: 10, paddingVertical: 6, alignItems: 'center' },
  fcNum: { fontSize: 16, fontWeight: '900', color: C.ink },
  hint: { fontSize: 11.5, color: C.inkSoft, fontWeight: '700', textAlign: 'center' },
});
