// Big "NEW AXE!" / "NEW TOOL!" moment whenever you get new gear or a new kind of helper.
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { useGame } from '../game/store';
import { AXES, AXE_SKINS, HELPERS, LAND, TOOLS } from '../game/data';
import { update } from '../game/store';
import { showPopup } from './popup';
import { money } from '../game/format';
import { AxeArt, axeLookOf, AxeLook } from './art/Axe';
import { haptic } from '../services/haptics';
import { C } from './theme';

const ND = Platform.OS !== 'web';
type Moment = { kind: string; title: string; sub: string; axe?: AxeLook; icon?: string };

function Rays() {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: ND }));
    l.start();
    return () => l.stop();
  }, []);
  return (
    <Animated.View style={[styles.rays, { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
      <Svg width={340} height={340} viewBox="-170 -170 340 340">
        <G>
          {Array.from({ length: 14 }, (_, i) => (
            <Path key={i} d="M0 0 L-16 -170 L16 -170 Z" fill={i % 2 ? '#ffe27a' : '#fff6c8'} opacity={0.55} transform={`rotate(${(i * 360) / 14})`} />
          ))}
        </G>
      </Svg>
    </Animated.View>
  );
}

export function Celebrate() {
  const s = useGame();
  const prev = useRef<{ axe: number; skin: string | null; tools: string[]; helpers: string[]; lands: string[] } | null>(null);
  const [queue, setQueue] = useState<Moment[]>([]);
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const cur = {
      axe: s.axeIndex,
      skin: s.equippedSkin,
      tools: Object.keys(s.tools),
      helpers: HELPERS.filter((h) => (s.helpers[h.id]?.count ?? 0) > 0).map((h) => h.id),
      lands: Object.keys(s.lands),
    };
    const p = prev.current;
    prev.current = cur;
    if (!p) return; // first load: nothing to celebrate
    const add: Moment[] = [];
    if (cur.axe > p.axe) add.push({ kind: 'NEW AXE!', title: AXES[cur.axe].name, sub: `${AXES[cur.axe].power} wood per chop. Go try it!`, axe: axeLookOf({ axeIndex: cur.axe, equippedSkin: null }) });
    if (cur.skin && cur.skin !== p.skin) add.push({ kind: 'NEW LOOK!', title: `${AXE_SKINS[cur.skin]?.name ?? 'New'} axe skin`, sub: 'Your axe looks brand new.', axe: axeLookOf({ axeIndex: cur.axe, equippedSkin: cur.skin }) });
    for (const t of cur.tools) if (!p.tools.includes(t)) {
      const d = TOOLS.find((x) => x.id === t);
      if (d) add.push({ kind: 'NEW TOOL!', title: d.name, sub: d.effect, icon: d.icon });
    }
    for (const h of cur.helpers) if (!p.helpers.includes(h)) {
      const d = HELPERS.find((x) => x.id === h)!;
      add.push({ kind: 'NEW CREW MEMBER!', title: d.name, sub: 'Watch them work on the Chop screen.', icon: d.icon });
    }
    for (const l of cur.lands) if (!p.lands.includes(l)) {
      const d = LAND.find((x) => x.id === l)!;
      add.push({ kind: 'NEW LAND!', title: d.name, sub: `+${d.woodPerSec.toLocaleString('en-US')} wood/sec.${cur.lands.length === 1 ? ' Your workshop is now unlocked!' : ''}`, icon: d.icon });
    }
    if (add.length) setQueue((q) => [...q, ...add]);
  }, [s.axeIndex, s.equippedSkin, Object.keys(s.tools).length, Object.keys(s.helpers).length, Object.keys(s.lands).length]);

  // lost an auction you bid in: tell the player what it cost
  useEffect(() => {
    const L = s.lastAuctionLoss;
    if (!L) return;
    const d = LAND.find((x) => x.id === L.landId);
    showPopup({ icon: '💸', title: `${L.winner} won ${d?.name ?? 'the land'}`, body: `You lost the auction and ${money(L.lost)} (20% of your Money). Bid higher next time!` });
    update((st) => ({ ...st, lastAuctionLoss: null }));
  }, [s.lastAuctionLoss?.at]);

  const m = queue[0];
  useEffect(() => {
    if (!m) return;
    haptic.success();
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 70, useNativeDriver: ND }).start();
  }, [m]);
  if (!m) return null;

  const close = () => setQueue((q) => q.slice(1));
  return (
    <Pressable style={styles.dim} onPress={close} accessibilityRole="button" accessibilityLabel="Close">
      <Rays />
      <Animated.View style={{ alignItems: 'center', opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }, { rotate: pop.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '0deg'] }) }] }}>
        <Text style={styles.kind}>{m.kind}</Text>
        <View style={styles.disc}>
          {m.axe ? <AxeArt look={m.axe} size={170} /> : <Text style={styles.icon}>{m.icon}</Text>}
        </View>
        <Text style={styles.title}>{m.title}</Text>
        <Text style={styles.sub}>{m.sub}</Text>
        <View style={styles.btn}><Text style={styles.btnText}>Awesome!</Text></View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dim: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(10,20,12,0.78)', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  rays: { position: 'absolute' },
  kind: { color: C.gold, fontSize: 30, fontWeight: '900', letterSpacing: 1, textShadowColor: '#000', textShadowRadius: 6, textShadowOffset: { width: 0, height: 3 } },
  disc: { width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,248,234,0.15)', borderWidth: 3, borderColor: 'rgba(245,197,66,0.7)', alignItems: 'center', justifyContent: 'center', marginVertical: 10 },
  icon: { fontSize: 110 },
  title: { color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center' },
  sub: { color: C.cream, fontSize: 15, fontWeight: '700', textAlign: 'center', marginTop: 4, paddingHorizontal: 30 },
  btn: { marginTop: 18, backgroundColor: C.gold, borderRadius: 14, paddingHorizontal: 34, paddingVertical: 12, borderWidth: 2, borderColor: C.goldDark },
  btnText: { color: C.ink, fontWeight: '900', fontSize: 17 },
});
