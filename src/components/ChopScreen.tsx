import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { getState, update, useGame } from '../game/store';
import {
  bestPrice, boostMult, chop, demandFor, helperCount, passiveWoodPerSec, rushInfo, storageCap, storageUpgradeCost, buyStorage, demandLabel, devSpawnGolden, durabilityPower, marketPriceFor,
  moneyMult, repair, repairCost, salesPerSec, woodPerChop,
} from '../game/logic';
import { AXES, CRIT_CHANCE, CRIT_MULT, PRICE_MAX_FACTOR, YARD_SELLER_COST, PRICE_MIN_FACTOR, WOOD_NAMES, AD_BOOST_MINUTES } from '../game/data';
import { adFree, canAdBoost, rewardAdBoost } from '../game/meta';
import { runReward } from './reward';
import { duration, money, small, whole } from '../game/format';
import { recordWood } from '../game/rate';
import { haptic } from '../services/haptics';
import { Tree } from './Tree';
import { SellButton } from './SellButton';
import { WorkYard } from './art/Crew';
import { AxeArt, axeLookOf } from './art/Axe';
import Svg, { Circle, Defs, Ellipse, LinearGradient as SvgGrad, Path, Stop } from 'react-native-svg';
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

function Cloud({ top, size, dur, delay }: { top: number; size: number; dur: number; delay: number }) {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.timing(x, { toValue: 1, duration: dur, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' }));
    const t = setTimeout(() => l.start(), delay);
    return () => { clearTimeout(t); l.stop(); };
  }, []);
  return (
    <Animated.View style={{ position: 'absolute', top, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-160, 520] }) }] }}>
      <Svg width={size} height={size * 0.5} viewBox="0 0 100 50">
        <Path d="M10 44 Q0 44 4 34 Q6 24 18 26 Q22 10 40 14 Q50 2 64 12 Q80 8 82 24 Q98 24 96 36 Q96 46 84 44 Z" fill="#ffffff" opacity="0.92" />
      </Svg>
    </Animated.View>
  );
}

function Background() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={['#8fd0ec', '#cdeef5', '#eaf7e2']} style={StyleSheet.absoluteFill} />
      <View style={styles.sunGlow} />
      <View style={styles.sun} />
      <Cloud top={30} size={110} dur={70000} delay={0} />
      <Cloud top={90} size={80} dur={90000} delay={25000} />
      <Cloud top={10} size={70} dur={110000} delay={50000} />
      <Svg style={{ position: 'absolute', left: 0, right: 0, top: 120 }} width="100%" height={360} viewBox="0 0 400 360" preserveAspectRatio="none">
        <Defs>
          <SvgGrad id="mt" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#9cb8c9" /><Stop offset="1" stopColor="#c9dfd8" /></SvgGrad>
        </Defs>
        <Path d="M0 160 L60 80 L110 140 L170 50 L240 150 L300 70 L360 130 L400 100 L400 360 L0 360 Z" fill="url(#mt)" />
        <Path d="M170 50 L190 78 L176 74 L164 84 L150 76 Z M300 70 L318 94 L304 90 L292 98 L284 90 Z" fill="#ffffff" opacity="0.85" />
        <Path d="M0 210 Q100 150 200 200 T400 190 L400 360 L0 360 Z" fill="#8fc27a" />
        {Array.from({ length: 16 }, (_, i) => {
          const x = i * 26 + (i % 2) * 8;
          const h = 46 + ((i * 37) % 30);
          const base = 214 + ((i * 13) % 18);
          return <Path key={i} d={`M${x} ${base} L${x + 13} ${base - h} L${x + 26} ${base} Z`} fill={i % 3 ? '#4f8f52' : '#3e7a45'} />;
        })}
        <Path d="M0 270 Q120 230 220 262 T400 250 L400 360 L0 360 Z" fill="#6fae5e" />
      </Svg>
      <View style={styles.ground} />
    </View>
  );
}

export function ChopScreen({ onOpenUpgrades, onOpenMarket }: { onOpenUpgrades: () => void; onOpenMarket?: () => void }) {
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
  const rush = rushInfo(s, now);
  const [adMsg, setAdMsg] = useState<string | null>(null);
  const dur = s.axeDurability;
  const fullCost = repairCost(s, 100);

  return (
    <View style={{ flex: 1 }}>
      <Background />
      <ScrollView contentContainerStyle={styles.content} bounces={false}>
        {rush.active && (
          <Text style={styles.rush}>🔥 Timber Rush: 2x {WOOD_NAMES[rush.type]} output this weekend</Text>
        )}
        <View style={styles.boostRow}>
          {canAdBoost(s, now) && (
            <Text
              style={[styles.boost, styles.adChip]}
              onPress={async () => {
                setAdMsg(null);
                const err = await runReward((st) => rewardAdBoost(st, Date.now()));
                if (err) setAdMsg(err);
              }}
            >
              {adFree(s) ? '⚡' : '▶'} 2x wood {AD_BOOST_MINUTES} min{adFree(s) ? ' (free)' : ''}
            </Text>
          )}
        </View>
        {adMsg && <Text style={styles.adMsg} onPress={() => setAdMsg(null)}>{adMsg}</Text>}
        {(boosts.length > 0 || s.vipActive) && (
          <View style={styles.boostRow}>
            {s.vipActive && <Text style={[styles.boost, { backgroundColor: '#5b2d8e' }]}>👑 VIP 2x Money</Text>}
            {boosts.map((b, i) => (
              <Text key={i} style={styles.boost}>
                {b.kind === 'wood' ? '🪵' : '💵'} {b.mult}x {b.kind === 'wood' ? 'Wood' : 'Money'}{b.source === 'ad' ? ' (video)' : ''} · {duration(b.until - now)}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.treeArea}>
          <Tree
            chops={s.treeChops}
            golden={golden}
            goldenLeft={goldenLeft}
            look={axeLookOf(s)}
            onChop={doChop}
            onDevLongPress={__DEV__ ? () => update((st) => devSpawnGolden(st, Date.now())) : undefined}
          />
          <Text style={styles.tapHint}>Tap the tree to chop!</Text>
        </View>

        <SellCard />

        {helperCount(s) > 0 || Object.keys(s.lands).length > 0 ? <Crew /> : null}

        <Card style={styles.axeCard}>
          <View style={styles.axeRow}>
            <View style={styles.axeIcon}><AxeArt look={axeLookOf(s)} size={54} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.h}>{axe.name}{s.equippedSkin ? ' ✨' : ''}</Text>
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
        {onOpenMarket && <Button variant="brown" label="📈 Open Market: planks, furniture, bulk orders" onPress={onOpenMarket} />}
      </ScrollView>
    </View>
  );
}

/** Helpers and machines working in the forest. */
function Crew() {
  const s = useGame();
  return (
    <View style={{ gap: 6 }}>
      <WorkYard s={s} />
      <Text style={styles.crewText}>🌲 Your crew{Object.keys(s.lands).length ? ' and land' : ''}: +{small(passiveWoodPerSec(s, Date.now()))} wood/sec</Text>
      {s.wagesOwed > 0 && <Text style={styles.warn}>💸 Wages unpaid: helpers at half speed until you have {money(s.wagesOwed)}</Text>}
    </View>
  );
}

/** Storage bar + the big SELL button, right under the tree. */
function SellCard() {
  const s = useGame();
  const cap = storageCap(s);
  const full = s.wood >= cap;
  const upCost = storageUpgradeCost(s);
  return (
    <Card style={{ gap: 8 }}>
      <View style={styles.storeRow}>
        <Text style={[styles.sub, full && { color: C.red }]}>{full ? 'Yard FULL: sell wood!' : '🪵 Wood yard'}</Text>
        <View style={{ flex: 1 }}>
          <View style={styles.storeBar}><View style={{ width: `${Math.min(100, (s.wood / cap) * 100)}%`, height: '100%', borderRadius: 4, backgroundColor: full ? C.red : s.wood / cap > 0.8 ? C.gold : C.leafLight }} /></View>
        </View>
        <Text style={styles.tiny}>{whole(s.wood)}/{whole(cap)}</Text>
      </View>
      {s.wood / cap > 0.8 && upCost !== null && (
        <Button small variant={s.money >= upCost ? 'green' : 'ghost'} label={`Bigger yard: ${money(upCost)}`} disabled={s.money < upCost}
          onPress={() => update((st) => buyStorage(st)) && haptic.success()} />
      )}
      <SellButton p="wood" />
      {!s.yardSeller && (
        <Text style={styles.hint}>Tired of tapping SELL? Hire a 🧑‍💼 Yard Seller for {money(YARD_SELLER_COST)} in Helpers. He sells for you, even while you are away.</Text>
      )}
    </Card>
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

  const perMin = salesPerSec({ ...s, selling: true, yardSeller: true }, s.sellPrice, Math.max(s.wood, 1000)) * 60;
  const profitPerMin = perMin * s.sellPrice * moneyMult(s, now);
  const best = bestPrice(s.dayKey);
  const levels = ['Low', 'Normal', 'High', 'Very High'];
  const lvl = levels.indexOf(label);
  const ratio = s.sellPrice / market;
  const priceNote = ratio > 1.6 ? 'Very high price. Wood will sell slowly.' : ratio < 0.6 ? 'Very cheap. Sells fast, but you lose profit.' : null;

  return (
    <Card style={styles.sellCard}>
      <View style={styles.sellHead}>
        <Text style={styles.h}>Wood price</Text>
        {s.yardSeller ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.sub}>{s.selling ? 'Yard Seller: selling' : 'Yard Seller: paused'}</Text>
            <Switch
              value={s.selling}
              onValueChange={(v) => { update((st) => ({ ...st, selling: v })); }}
              trackColor={{ true: C.leafLight, false: '#bbb' }}
            />
          </View>
        ) : <Text style={styles.sub}>Cheap sells more per tap</Text>}
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
          <Text style={styles.tiny}>{s.yardSeller ? 'auto-sold / min' : 'buyers / min'}</Text>
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
  sun: { position: 'absolute', right: 34, top: 22, width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff1a0' },
  sunGlow: { position: 'absolute', right: 14, top: 2, width: 96, height: 96, borderRadius: 48, backgroundColor: '#fff6c8', opacity: 0.5 },
  axeIcon: { width: 54, height: 54, borderRadius: 14, backgroundColor: 'rgba(107,68,35,0.1)', alignItems: 'center', justifyContent: 'center' },
  bgTree: {
    width: 0, height: 0, borderLeftWidth: 34, borderRightWidth: 34, borderBottomWidth: 110,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#6fa86b',
  },
  hill: { position: 'absolute', left: -60, right: -60, bottom: 0, height: 120, borderTopLeftRadius: 400, borderTopRightRadius: 400, backgroundColor: '#7cb66a' },
  ground: { position: 'absolute', left: 0, right: 0, top: 470, bottom: 0, backgroundColor: '#6fae5e' },
  rush: { backgroundColor: '#d9661f', color: '#fff', fontWeight: '900', fontSize: 12.5, textAlign: 'center', borderRadius: 10, paddingVertical: 5, overflow: 'hidden' },
  adChip: { backgroundColor: '#2e8a3e' },
  adMsg: { textAlign: 'center', fontSize: 12, fontWeight: '800', color: C.ink, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 8, padding: 6, overflow: 'hidden' },
  crew: { paddingVertical: 8, alignItems: 'center' },
  warn: { fontSize: 12, fontWeight: '800', color: C.red, marginTop: 3, textAlign: 'center' },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  storeBar: { height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.1)', overflow: 'hidden' },
  crewRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4 },
  crewText: { fontSize: 12.5, fontWeight: '900', color: C.leaf, marginTop: 4 },
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
