// Update 2: the top bar is only four big counters (Money, Gold, wood, wood/sec). No words.
// Counters pop when they grow; wood/sec flashes green when a purchase raises it.
// FlyLayer draws the coins and logs that fly into these counters.
import { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../game/store';
import { chopType, frenzyOn, logPrice, passiveWoodPerSec, storageCap, storageUsed } from '../game/logic';
import { unitText } from './SellButton';
import { money, small, whole } from '../game/format';
import { recentWoodPerSec } from '../game/rate';
import { Icon, IconName, LogIcon } from './art/Icons';
import { WOOD, WoodType } from '../game/data';
import { lessMotion, onFly, onPop, pop, PopTarget } from '../services/feel';
import { C } from './theme';

const ND = Platform.OS !== 'web';
const targets: Partial<Record<PopTarget, { x: number; y: number }>> = {};

function Counter({ id, icon, value, color = '#fff', warn, children }: { id: PopTarget; icon: IconName; value: string; color?: string; warn?: boolean; children?: ReactNode }) {
  const sc = useRef(new Animated.Value(1)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const ref = useRef<any>(null);
  useEffect(() => onPop((t) => {
    if (t !== id) return;
    if (!lessMotion()) {
      sc.setValue(1.22);
      Animated.spring(sc, { toValue: 1, friction: 4, tension: 200, useNativeDriver: ND }).start();
    }
    if (id === 'wps') {
      flash.setValue(1);
      Animated.timing(flash, { toValue: 0, duration: 900, useNativeDriver: false }).start();
    }
  }), []);
  const measure = () => ref.current?.measureInWindow?.((x: number, y: number, w: number, h: number) => { targets[id] = { x: x + 22, y: y + h / 2 }; });
  return (
    // scale runs on the native driver, the green flash on JS: they must be on two different views
    // (mixing them on one view froze the iPhone app on every purchase)
    <Animated.View ref={ref as any} onLayout={measure} style={{ flex: 1, transform: [{ scale: sc }] }}>
      <Animated.View
        style={[styles.pill, warn && styles.warn, { backgroundColor: flash.interpolate({ inputRange: [0, 1], outputRange: ['rgba(0,0,0,0.32)', 'rgba(79,170,79,0.95)'] }) as any }]}
      >
        <Icon name={icon} size={26} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.num, { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
          {children}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

export function TopBar() {
  const s = useGame();
  const insets = useSafeAreaInsets();
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const now = Date.now();
  const wps = Math.max(passiveWoodPerSec(s, now), recentWoodPerSec());
  const cap = storageCap(s);
  // bug fix batch 1: the bar shows how full the yard really is (planks take 2 spaces each), red when full
  const used = storageUsed(s);
  const full = used >= cap - 0.5;
  const fill = Math.min(1, used / cap);
  const frenzy = frenzyOn(s, now);
  const ct = chopType(s);

  // pop Money and Gold when they grow by a real amount
  const last = useRef({ money: s.money, gold: s.gold });
  useEffect(() => {
    if (s.money - last.current.money > Math.max(1, last.current.money * 0.02)) pop('money');
    if (s.gold > last.current.gold) pop('gold');
    last.current = { money: s.money, gold: s.gold };
  }, [s.money, s.gold]);

  return (
    <LinearGradient colors={[C.forest, C.forest2]} style={[styles.bar, { paddingTop: insets.top + 6 }]}>
      <View style={styles.row}>
        <Counter id="money" icon="money" value={money(s.money)} color="#9cf09a" />
        <Counter id="gold" icon="gold" value={whole(s.gold)} color={C.gold} />
      </View>
      <View style={[styles.row, { marginTop: 6 }]}>
        <Counter id="wood" icon="wood" value={whole(s.wood)} color={full ? '#ff8a7a' : '#fff'} warn={full}>
          <View style={styles.cap}><View style={{ width: `${fill * 100}%`, height: '100%', borderRadius: 2, backgroundColor: full ? C.red : fill > 0.8 ? C.gold : C.leafLight }} /></View>
          <Text style={[styles.capText, full && { color: '#ff8a7a' }]} numberOfLines={1}>{whole(used)} / {whole(cap)} wood{full ? ' (full)' : ''}</Text>
          {/* update 4: the tree you chop and what one of its logs sells for */}
          <View style={styles.typeRow}>
            <LogIcon type={ct} size={14} />
            <Text style={styles.typeText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{WOOD[ct].name.replace(/ Wood$/, '')} {unitText(logPrice(s, ct, now))}/log</Text>
          </View>
        </Counter>
        <Counter id="wps" icon={frenzy ? 'frenzy' : 'wps'} value={`${small(wps)}/s`} color={frenzy ? C.gold : '#fff'} />
      </View>
    </LinearGradient>
  );
}

/** Coins and logs flying into the counters. Sits on top of everything and never blocks touches. */
export function FlyLayer() {
  const [items, setItems] = useState<{ id: number; icon: 'coin' | 'log'; wood?: string; from: { x: number; y: number }; to: { x: number; y: number }; target: PopTarget; delay: number }[]>([]);
  const next = useRef(1);
  useEffect(() => onFly((f) => {
    const to = targets[f.to];
    if (!to) { pop(f.to); return; }
    const add = Array.from({ length: f.n }, (_, i) => ({ id: next.current++, icon: f.icon, wood: f.wood, from: { x: f.from.x + (Math.random() - 0.5) * 40, y: f.from.y + (Math.random() - 0.5) * 20 }, to, target: f.to, delay: i * 45 }));
    setItems((x) => [...x.slice(-24), ...add]);
  }), []);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {items.map((it, i) => (
        <Flyer key={it.id} it={it} last={i === items.length - 1} onDone={() => setItems((x) => x.filter((y) => y.id !== it.id))} />
      ))}
    </View>
  );
}

function Flyer({ it, onDone }: { it: { icon: 'coin' | 'log'; wood?: string; from: { x: number; y: number }; to: { x: number; y: number }; target: PopTarget; delay: number }; last: boolean; onDone: () => void }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(it.delay),
      Animated.timing(t, { toValue: 1, duration: 560, easing: Easing.in(Easing.cubic), useNativeDriver: ND }),
    ]).start(() => { pop(it.target); onDone(); });
  }, []);
  const midX = (it.from.x + it.to.x) / 2 + (it.from.x < it.to.x ? -40 : 40);
  return (
    <Animated.View style={{
      position: 'absolute', left: 0, top: 0,
      opacity: t.interpolate({ inputRange: [0, 0.05, 0.9, 1], outputRange: [0, 1, 1, 0.2] }),
      transform: [
        { translateX: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [it.from.x - 11, midX - 11, it.to.x - 11] }) },
        { translateY: t.interpolate({ inputRange: [0, 0.35, 1], outputRange: [it.from.y - 11, it.from.y - 70, it.to.y - 11] }) },
        { scale: t.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.6, 1.2, 0.7] }) },
      ],
    }}>
      {it.icon === 'coin' ? <Icon name="money" size={24} /> : <LogIcon type={(it.wood ?? 'pine') as WoodType} size={26} />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: 10, paddingBottom: 8, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, borderBottomWidth: 3, borderColor: '#0d1c12' },
  row: { flexDirection: 'row', gap: 8 },
  pill: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 2, borderColor: 'rgba(0,0,0,0.35)' },
  warn: { borderColor: C.red },
  num: { fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'] },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  capText: { color: '#cfe3c8', fontSize: 10, fontWeight: '800', marginTop: 1 },
  typeText: { color: '#e9d9b6', fontSize: 10, fontWeight: '900', flexShrink: 1 },
  cap: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden', marginTop: 1 },
});
