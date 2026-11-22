import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CHOPS_PER_TREE } from '../game/data';
import { ChopResult } from '../game/logic';
import { small } from '../game/format';
import { C } from './theme';
import { TREE_H, TREE_W, StumpArt, TreeArt } from './art/TreeArt';
import { AxeArt, AxeLook } from './art/Axe';

const ND = Platform.OS !== 'web';
const W = TREE_W;
const H = TREE_H;
const HIT = { x: 140, y: 256 }; // where the axe bites the trunk
const AXE = 104;

interface Floater { id: number; text: string; color: string; size: number; x: number; y?: number }
interface Chunk { id: number; path: { x: number[]; y: number[] }; spin: number; w: number; h: number; color: string; dur: number }

function FloatText({ f, onDone }: { f: Floater; onDone: () => void }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start(onDone);
  }, []);
  return (
    <Animated.Text
      pointerEvents="none"
      style={[
        styles.float,
        { left: f.x, top: f.y ?? 0, color: f.color, fontSize: f.size },
        {
          opacity: t.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
          transform: [
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -110] }) },
            { scale: t.interpolate({ inputRange: [0, 0.12, 0.25, 1], outputRange: [0.4, 1.3, 1, 0.95] }) },
          ],
        },
      ]}
    >
      {f.text}
    </Animated.Text>
  );
}

/** A chunk of wood that flies off the trunk with real-looking gravity and spin. */
function ChunkView({ c, onDone }: { c: Chunk; onDone: () => void }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: c.dur, easing: Easing.linear, useNativeDriver: ND }).start(onDone);
  }, []);
  const steps = c.path.x.map((_, i) => i / (c.path.x.length - 1));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.chunk,
        { width: c.w, height: c.h, backgroundColor: c.color },
        {
          opacity: t.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] }),
          transform: [
            { translateX: t.interpolate({ inputRange: steps, outputRange: c.path.x }) },
            { translateY: t.interpolate({ inputRange: steps, outputRange: c.path.y }) },
            { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${c.spin}deg`] }) },
          ],
        },
      ]}
    />
  );
}

function makeChunks(n: number, golden: boolean, idBase: number): Chunk[] {
  const out: Chunk[] = [];
  for (let i = 0; i < n; i++) {
    const vx = 50 + Math.random() * 120; // fly right, away from the trunk
    const vy = -(90 + Math.random() * 160);
    const g = 620;
    const dur = 650 + Math.random() * 350;
    const T = dur / 1000;
    const dir = Math.random() < 0.25 ? -0.5 : 1;
    const xs: number[] = [];
    const ys: number[] = [];
    for (let k = 0; k <= 6; k++) {
      const tt = (T * k) / 6;
      xs.push(vx * tt * dir);
      ys.push(Math.min(40, vy * tt + 0.5 * g * tt * tt));
    }
    const bark = i % 3 === 0;
    out.push({
      id: idBase + i,
      path: { x: xs, y: ys },
      spin: (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 540),
      w: 5 + Math.random() * 9,
      h: 3 + Math.random() * 5,
      color: golden ? (bark ? '#c8941b' : '#ffe27a') : bark ? '#6b4423' : i % 2 ? '#f1d49c' : '#d9b27a',
      dur,
    });
  }
  return out;
}

export function Tree({
  chops, golden, goldenLeft, look, onChop, onDevLongPress,
}: {
  chops: number;
  golden: boolean;
  goldenLeft: number;
  look: AxeLook;
  onChop: () => ChopResult;
  onDevLongPress?: () => void;
}) {
  const shake = useRef(new Animated.Value(0)).current;
  const quake = useRef(new Animated.Value(0)).current;
  const fall = useRef(new Animated.Value(0)).current;
  const grow = useRef(new Animated.Value(1)).current;
  const swing = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const idle = useRef(new Animated.Value(0)).current;
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [felling, setFelling] = useState(false);
  const nextId = useRef(1);

  // the tree sways a little in the wind, the axe breathes
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(idle, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
      Animated.timing(idle, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    if (!golden) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 700, useNativeDriver: ND }),
        Animated.timing(glow, { toValue: 0, duration: 700, useNativeDriver: ND }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [golden]);

  const press = () => {
    const r = onChop();
    // axe: quick wind-up is skipped for snappy taps, it slams down then springs back
    swing.stopAnimation();
    swing.setValue(0);
    Animated.sequence([
      Animated.timing(swing, { toValue: 1, duration: 60, easing: Easing.in(Easing.quad), useNativeDriver: ND }),
      Animated.spring(swing, { toValue: 0, friction: 5, tension: 140, useNativeDriver: ND }),
    ]).start();
    shake.setValue(0);
    Animated.sequence([
      Animated.delay(50),
      Animated.timing(shake, { toValue: 1, duration: 45, useNativeDriver: ND }),
      Animated.timing(shake, { toValue: -0.6, duration: 70, useNativeDriver: ND }),
      Animated.spring(shake, { toValue: 0, friction: 4, tension: 160, useNativeDriver: ND }),
    ]).start();
    flash.setValue(0);
    Animated.sequence([
      Animated.delay(50),
      Animated.timing(flash, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: ND }),
    ]).start(() => flash.setValue(0));
    if (r.crit || r.felled) {
      quake.setValue(0);
      Animated.sequence([
        Animated.timing(quake, { toValue: 1, duration: 40, useNativeDriver: ND }),
        Animated.timing(quake, { toValue: -1, duration: 60, useNativeDriver: ND }),
        Animated.timing(quake, { toValue: 0.5, duration: 50, useNativeDriver: ND }),
        Animated.timing(quake, { toValue: 0, duration: 50, useNativeDriver: ND }),
      ]).start();
    }

    const id = nextId.current;
    nextId.current += 100;
    const x = W / 2 - 30 + Math.random() * 60;
    const add: Floater[] = r.storageFull ? [{ id, text: 'Yard full! Sell wood', color: '#ff8a7a', size: 22, x: W / 2 - 95 }] : [
      r.crit
        ? { id, text: `CRIT! +${small(r.wood)}`, color: '#ff8a1f', size: 32, x: x - 40 }
        : { id, text: `+${small(r.wood)}`, color: '#fff', size: 26, x },
    ];
    if (r.felled) add.push({ id: id + 1, text: `TIMBER! +${small(r.fellBonus)}`, color: C.gold, size: 30, x: W / 2 - 100, y: -60 });
    setFloaters((f) => [...f.slice(-10), ...add]);
    setChunks((c) => [...c.slice(-30), ...makeChunks(r.crit ? 11 : r.felled ? 14 : 6, golden, id + 10)]);

    if (r.felled) {
      setFelling(true);
      fall.setValue(0);
      grow.setValue(1);
      Animated.sequence([
        Animated.timing(fall, { toValue: 1, duration: 520, easing: Easing.in(Easing.cubic), useNativeDriver: ND }),
        Animated.timing(grow, { toValue: 0, duration: 0, useNativeDriver: ND }),
        Animated.timing(fall, { toValue: 0, duration: 0, useNativeDriver: ND }),
        Animated.delay(120),
        Animated.spring(grow, { toValue: 1, friction: 4, tension: 90, useNativeDriver: ND }),
      ]).start(() => setFelling(false));
    }
  };

  const frac = chops / CHOPS_PER_TREE;
  const sway = idle.interpolate({ inputRange: [0, 1], outputRange: ['-0.8deg', '0.8deg'] });

  return (
    <View style={styles.wrap}>
      <View style={styles.hpBar}>
        <View style={[styles.hpFill, { width: `${(1 - frac) * 100}%`, backgroundColor: golden ? C.gold : C.moss }]} />
        <Text style={styles.hpText}>{golden ? `GOLDEN TREE · ${goldenLeft}s left` : `${CHOPS_PER_TREE - chops} chops to TIMBER!`}</Text>
      </View>
      <Pressable
        // Phones chop on finger-down for snappy taps. The web preview uses a normal click,
        // because react-native-web does not send press-in from inside a ScrollView.
        onPressIn={Platform.OS === 'web' ? undefined : press}
        onPress={Platform.OS === 'web' ? press : undefined}
        onLongPress={onDevLongPress}
        delayLongPress={1500}
        style={{ width: W, height: H }}
        accessibilityRole="button"
        accessibilityLabel="Chop the tree"
      >
        <Animated.View style={{ width: W, height: H, transform: [{ translateX: quake.interpolate({ inputRange: [-1, 1], outputRange: [-5, 5] }) }] }}>
          {golden && (
            <Animated.View pointerEvents="none" style={[styles.glow, { opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.75] }) }]} />
          )}
          <View style={styles.shadowEllipse} />
          {felling && <View style={StyleSheet.absoluteFill} pointerEvents="none"><StumpArt /></View>}
          <Animated.View
            style={{
              width: W, height: H,
              transformOrigin: 'bottom',
              opacity: fall.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
              transform: [
                { rotate: sway },
                { rotate: shake.interpolate({ inputRange: [-1, 1], outputRange: ['-2.2deg', '2.2deg'] }) },
                { rotate: fall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '84deg'] }) },
                { scale: grow.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }) },
              ],
            } as any}
          >
            <TreeArt golden={golden} cut={frac} />
          </Animated.View>

          {/* impact: a white flash and a puff of sawdust where the axe bites */}
          <Animated.View
            pointerEvents="none"
            style={[styles.flash, {
              opacity: flash.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
              transform: [{ scale: flash.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.8] }) }],
            }]}
          />

          {/* the axe: lifted, slams into the trunk */}
          <Animated.View
            pointerEvents="none"
            style={[styles.axe, {
              transformOrigin: 'bottom',
              transform: [
                { rotate: swing.interpolate({ inputRange: [0, 1], outputRange: ['28deg', '-38deg'] }) },
                { translateY: idle.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) },
              ],
            } as any]}
          >
            <View style={{ transform: [{ scaleX: -1 }] }}>
              <AxeArt look={look} size={AXE} />
            </View>
          </Animated.View>

          <View pointerEvents="none" style={styles.chipOrigin}>
            {chunks.map((c) => (
              <ChunkView key={c.id} c={c} onDone={() => setChunks((cs) => cs.filter((x) => x.id !== c.id))} />
            ))}
          </View>
          <View pointerEvents="none" style={styles.floatOrigin}>
            {floaters.map((f) => (
              <FloatText key={f.id} f={f} onDone={() => setFloaters((fs) => fs.filter((x) => x.id !== f.id))} />
            ))}
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  hpBar: {
    width: 220, height: 24, borderRadius: 12, backgroundColor: 'rgba(23,48,31,0.55)', overflow: 'hidden',
    justifyContent: 'center', marginBottom: 6, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)',
  },
  hpFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 10 },
  hpText: { textAlign: 'center', color: '#fff', fontWeight: '900', fontSize: 12, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 2 },
  shadowEllipse: { position: 'absolute', left: W / 2 - 80, top: H - 14, width: 160, height: 22, borderRadius: 80, backgroundColor: 'rgba(0,0,0,0.22)' },
  glow: { position: 'absolute', left: -10, top: 0, width: W + 20, height: W + 20, borderRadius: (W + 20) / 2, backgroundColor: '#ffe27a' },
  flash: { position: 'absolute', left: HIT.x - 18, top: HIT.y - 18, width: 36, height: 36, borderRadius: 18, backgroundColor: '#fffbe6' },
  axe: { position: 'absolute', left: HIT.x + 26, top: HIT.y - AXE + 44, width: AXE, height: AXE },
  chipOrigin: { position: 'absolute', left: HIT.x + 4, top: HIT.y - 4 },
  chunk: { position: 'absolute', borderRadius: 2, borderWidth: 0.5, borderColor: 'rgba(58,34,16,0.5)' },
  floatOrigin: { position: 'absolute', left: 0, top: 150, width: W },
  float: { position: 'absolute', fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 2 } },
});
