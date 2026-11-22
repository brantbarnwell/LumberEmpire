// Home (update 2): tree in the middle, sawmill line behind it, one big SELL button at the bottom.
// Everything else lives in the tabs. Icons instead of sentences; at most a few words on screen.
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, LinearGradient as SvgGrad, Path, Stop } from 'react-native-svg';
import { getState, update, useGame } from '../game/store';
import { chop, devSpawnGolden, frenzyOn, goldenLogVisible, tapGoldenLog } from '../game/logic';
import { AXES } from '../game/data';
import { money } from '../game/format';
import { recordWood } from '../game/rate';
import { Tree } from './Tree';
import { SellButton } from './SellButton';
import { ProductionLine } from './art/Mill';
import { GoldenLogArt } from './art/Buildings';
import { axeLookOf } from './art/Axe';
import { Icon } from './art/Icons';
import { showToast } from './Celebrate';
import { feel, fly, lessMotion } from '../services/feel';
import { C } from './theme';

const ND = Platform.OS !== 'web';

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
    if (lessMotion()) return;
    const l = Animated.loop(Animated.timing(x, { toValue: 1, duration: dur, easing: Easing.linear, useNativeDriver: ND }));
    const t = setTimeout(() => l.start(), delay);
    return () => { clearTimeout(t); l.stop(); };
  }, []);
  return (
    <Animated.View style={{ position: 'absolute', top, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-160, 520] }) }] }}>
      <Svg width={size} height={size * 0.5} viewBox="0 0 100 50">
        <Path d="M10 44 Q0 44 4 34 Q6 24 18 26 Q22 10 40 14 Q50 2 64 12 Q80 8 82 24 Q98 24 96 36 Q96 46 84 44 Z" fill="#ffffff" stroke="#3a2210" strokeOpacity={0.25} strokeWidth={2} />
      </Svg>
    </Animated.View>
  );
}

function Background({ h }: { h: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={['#8fd0ec', '#cdeef5', '#eaf7e2']} style={StyleSheet.absoluteFill} />
      <View style={styles.sunGlow} />
      <View style={styles.sun} />
      <Cloud top={16} size={110} dur={70000} delay={0} />
      <Cloud top={70} size={80} dur={90000} delay={25000} />
      <Cloud top={130} size={130} dur={120000} delay={60000} />
      <Svg style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} width="100%" height={h * 0.78} viewBox="0 0 400 300" preserveAspectRatio="none">
        <Defs>
          <SvgGrad id="mt" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#9cb8c9" /><Stop offset="1" stopColor="#c9dfd8" /></SvgGrad>
        </Defs>
        <Path d="M0 110 L60 40 L110 95 L170 20 L240 105 L300 35 L360 90 L400 60 L400 300 L0 300 Z" fill="url(#mt)" stroke="#3a2210" strokeOpacity={0.25} strokeWidth={2} />
        <Path d="M170 20 L188 46 L176 42 L164 50 L152 44 Z M300 35 L316 58 L304 54 L292 60 L284 54 Z" fill="#ffffff" opacity={0.9} />
        <Path d="M0 160 Q100 110 200 150 T400 140 L400 300 L0 300 Z" fill="#8fc27a" />
        {Array.from({ length: 16 }, (_, i) => {
          const x = i * 26 + (i % 2) * 8;
          const ht = 40 + ((i * 37) % 26);
          const base = 166 + ((i * 13) % 14);
          return <Path key={i} d={`M${x} ${base} L${x + 13} ${base - ht} L${x + 26} ${base} Z`} fill={i % 3 ? '#4f8f52' : '#3e7a45'} stroke="#3a2210" strokeOpacity={0.25} strokeWidth={1.5} />;
        })}
        <Path d="M0 236 Q120 214 220 230 T400 226 L400 300 L0 300 Z" fill="#6fae5e" stroke="#3a2210" strokeOpacity={0.3} strokeWidth={2} />
      </Svg>
    </View>
  );
}

/** Small icon chips in the top corner: frenzy timer, boosts, golden tree, worn axe. */
function Chips({ now, onRepair }: { now: number; onRepair?: () => void }) {
  const s = useGame();
  const chips: { key: string; icon: 'frenzy' | 'wps' | 'money' | 'gold' | 'tools'; text: string; color: string; onPress?: () => void }[] = [];
  if (frenzyOn(s, now)) chips.push({ key: 'fz', icon: 'frenzy', text: `7x ${Math.ceil((s.frenzyUntil - now) / 1000)}s`, color: '#d1462f' });
  if (s.treeGoldenUntil && s.treeGoldenUntil > now) chips.push({ key: 'gt', icon: 'gold', text: `${Math.ceil((s.treeGoldenUntil - now) / 1000)}s`, color: C.goldDark });
  for (const b of s.boosts.filter((x) => x.until > now).slice(0, 2)) {
    const m = Math.ceil((b.until - now) / 60000);
    chips.push({ key: `${b.kind}${b.until}`, icon: b.kind === 'wood' ? 'wps' : 'money', text: `${b.mult}x ${m >= 60 ? `${Math.floor(m / 60)}h` : `${m}m`}`, color: '#2f6b3a' });
  }
  if (s.axeDurability < 25) chips.push({ key: 'ax', icon: 'tools', text: s.axeDurability === 0 ? 'Fix axe' : `${s.axeDurability}%`, color: C.red, onPress: onRepair });
  if (!chips.length) return null;
  return (
    <View style={styles.chips} pointerEvents="box-none">
      {chips.map((c) => (
        <Pressable key={c.key} onPress={c.onPress} disabled={!c.onPress} style={[styles.chip, { backgroundColor: c.color }]}>
          <Icon name={c.icon} size={18} />
          <Text style={styles.chipText}>{c.text}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function GoldenLog({ now }: { now: number }) {
  const s = useGame();
  const ref = useRef<any>(null);
  if (!goldenLogVisible(s, now)) return null;
  return (
    <Pressable
      ref={ref}
      style={styles.log}
      accessibilityRole="button"
      accessibilityLabel="Golden Log: tap for a Frenzy"
      hitSlop={16}
      onPress={() => {
        const st = tapGoldenLog(getState(), Date.now());
        if (!st) return;
        update(() => st);
        feel.golden();
        ref.current?.measureInWindow?.((x: number, y: number) => fly('log', { x: x + 30, y }, 'wps', 6));
        showToast({ kind: 'FRENZY!', title: '7x wood for 30 seconds', icon: 'frenzy' });
      }}
    >
      <GoldenLogArt size={74} />
    </Pressable>
  );
}

export function ChopScreen({ onOpenUpgrades }: { onOpenUpgrades?: () => void }) {
  const s = useGame();
  const now = useNow(500);
  const [area, setArea] = useState({ w: 390, h: 520 });
  const golden = !!s.treeGoldenUntil && s.treeGoldenUntil > now;
  const frenzy = frenzyOn(s, now);
  const tint = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(tint, { toValue: frenzy ? 1 : 0, duration: 400, useNativeDriver: ND }).start();
  }, [frenzy]);

  const doChop = () => {
    const t = Date.now();
    const axe = AXES[getState().axeIndex];
    const { state, result } = chop(getState(), t);
    update(() => state);
    recordWood(result.wood + result.fellBonus, t);
    if (result.golden) {
      feel.golden();
      showToast({ kind: 'GOLDEN TREE!', title: `+${result.golden.gold} Gold`, sub: `+${money(result.golden.money)}`, icon: 'gold' });
    }
    if (result.axeBroke) showToast({ kind: 'AXE BROKE', title: `Repair your ${axe.name}`, icon: 'tools' });
    else if (result.axeLow) showToast({ kind: 'AXE AT 25%', title: 'Repair it soon', icon: 'tools' });
    return result;
  };

  const groundY = area.h - 34;
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }} onLayout={(e: LayoutChangeEvent) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        <Background h={area.h} />
        <ProductionLine s={s} width={area.w} groundY={groundY} />
        <View pointerEvents="none" style={[styles.ground, { top: groundY + 6 }]} />
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#ffd23f', opacity: tint.interpolate({ inputRange: [0, 1], outputRange: [0, 0.16] }) }]} />
        <Tree
          chops={s.treeChops}
          golden={golden}
          look={axeLookOf(s)}
          onChop={doChop}
          onDevLongPress={__DEV__ ? () => update((st) => devSpawnGolden(st, Date.now())) : undefined}
          areaW={area.w}
          areaH={area.h}
        />
        <GoldenLog now={now} />
        <Chips now={now} onRepair={onOpenUpgrades} />
      </View>
      <View style={styles.sellBar}>
        <SellButton p="wood" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sun: { position: 'absolute', right: 34, top: 18, width: 50, height: 50, borderRadius: 25, backgroundColor: '#fff1a0', borderWidth: 2, borderColor: 'rgba(58,34,16,0.25)' },
  sunGlow: { position: 'absolute', right: 16, top: 0, width: 86, height: 86, borderRadius: 43, backgroundColor: '#fff6c8', opacity: 0.5 },
  ground: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#6fae5e', borderTopWidth: 2, borderColor: 'rgba(58,34,16,0.3)' },
  chips: { position: 'absolute', left: 10, top: 10, gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 2, borderColor: '#3a2210', alignSelf: 'flex-start' },
  chipText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  log: { position: 'absolute', left: 12, bottom: 70, zIndex: 5 },
  sellBar: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8, backgroundColor: '#6fae5e' },
});
