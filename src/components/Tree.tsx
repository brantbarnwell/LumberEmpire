// The big tree. Update 2: the whole middle of the screen is the tap zone, nothing is drawn on top of the tree,
// and every chop reacts on the impact frame: squash and stretch, flash, 3-5 chips, a +X rising from your finger,
// a log flying into the wood counter, sound and a light haptic.
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, GestureResponderEvent, Platform, Pressable, StyleSheet, View } from 'react-native';
import { CHOPS_PER_TREE } from '../game/data';
import { ChopResult } from '../game/logic';
import { small } from '../game/format';
import { C } from './theme';
import { TREE_H, TREE_W, StumpArt, TreeArt } from './art/TreeArt';
import { AxeArt, AxeLook } from './art/Axe';
import { feel, fly, lessMotion } from '../services/feel';

const ND = Platform.OS !== 'web';
const HIT = { x: 140, y: 256 }; // where the axe bites the trunk, in tree drawing coordinates
const AXE = 104;

interface Floater { id: number; text: string; color: string; size: number; x: number; y: number }
interface Chunk { id: number; path: { x: number[]; y: number[] }; spin: number; w: number; h: number; color: string; dur: number }

function FloatText({ f, onDone }: { f: Floater; onDone: () => void }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start(onDone);
  }, []);
  return (
    <Animated.Text
      pointerEvents="none"
      style={[
        styles.float,
        { left: f.x - 60, top: f.y - 20, color: f.color, fontSize: f.size },
        {
          opacity: t.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
          transform: [
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -90] }) },
            { scale: t.interpolate({ inputRange: [0, 0.12, 0.25, 1], outputRange: [0.4, 1.3, 1, 0.95] }) },
          ],
        },
      ]}
    >
      {f.text}
    </Animated.Text>
  );
}

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
    const vx = 50 + Math.random() * 120;
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
      w: 6 + Math.random() * 9,
      h: 4 + Math.random() * 5,
      color: golden ? (bark ? '#c8941b' : '#ffe27a') : bark ? '#6b4423' : i % 2 ? '#f1d49c' : '#d9b27a',
      dur,
    });
  }
  return out;
}

export function Tree({
  chops, golden, look, onChop, onDevLongPress, areaW, areaH,
}: {
  chops: number;
  golden: boolean;
  look: AxeLook;
  onChop: () => ChopResult;
  onDevLongPress?: () => void;
  areaW: number;
  areaH: number;
}) {
  const shake = useRef(new Animated.Value(0)).current;
  const squash = useRef(new Animated.Value(0)).current;
  const quake = useRef(new Animated.Value(0)).current;
  const fall = useRef(new Animated.Value(0)).current;
  const grow = useRef(new Animated.Value(1)).current;
  const swing = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const idle = useRef(new Animated.Value(0)).current;
  const prog = useRef(new Animated.Value(chops / CHOPS_PER_TREE)).current;
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [felling, setFelling] = useState(false);
  const nextId = useRef(1);
  const box = useRef<any>(null);
  const origin = useRef({ x: 0, y: 0 });

  // size and place the tree at the bottom middle of the tap area
  const scale = Math.max(0.6, Math.min(1.05, (areaH - 24) / TREE_H, (areaW * 0.66) / TREE_W));
  const cx = areaW * 0.42; // a little left of centre so the sawmill shows on the right
  const left = cx - TREE_W / 2;
  const top = areaH - TREE_H - (TREE_H * (scale - 1)) / 2 - 10;

  // the tree sways a little in the wind
  useEffect(() => {
    if (lessMotion()) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(idle, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
      Animated.timing(idle, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    if (!golden || lessMotion()) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 700, useNativeDriver: ND }),
      Animated.timing(glow, { toValue: 0, duration: 700, useNativeDriver: ND }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [golden]);

  useEffect(() => {
    Animated.timing(prog, { toValue: chops / CHOPS_PER_TREE, duration: 160, useNativeDriver: false }).start();
  }, [chops]);

  const press = (e: GestureResponderEvent) => {
    const r = onChop();
    feel.chop(r.crit);
    const quiet = lessMotion();
    const { pageX, pageY } = e.nativeEvent;
    const locationX = pageX - origin.current.x;
    const locationY = pageY - origin.current.y;

    if (!quiet) {
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
      // squash on impact, stretch back
      squash.setValue(0);
      Animated.sequence([
        Animated.delay(50),
        Animated.timing(squash, { toValue: 1, duration: 50, useNativeDriver: ND }),
        Animated.spring(squash, { toValue: 0, friction: 3.5, tension: 220, useNativeDriver: ND }),
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
      // 3 to 5 chips, more when the tree falls
      const id0 = nextId.current;
      nextId.current += 100;
      setChunks((c) => [...c.slice(-20), ...makeChunks(r.felled ? 10 : r.crit ? 5 : 3 + Math.floor(Math.random() * 2), golden, id0)]);
    }

    const id = nextId.current++;
    const add: Floater[] = [
      r.storageFull
        ? { id, text: 'FULL!', color: '#ff8a7a', size: 26, x: locationX, y: locationY }
        : r.crit
          ? { id, text: `+${small(r.wood)}!`, color: '#ff8a1f', size: 34, x: locationX, y: locationY }
          : { id, text: `+${small(r.wood)}`, color: '#fff', size: 28, x: locationX, y: locationY },
    ];
    if (r.felled) add.push({ id: id + 50, text: `TIMBER! +${small(r.fellBonus)}`, color: C.gold, size: 32, x: cx, y: Math.max(60, top + 80) });
    setFloaters((f) => [...f.slice(-8), ...add]);
    if (!r.storageFull) fly('log', { x: pageX, y: pageY }, 'wood', r.felled ? 4 : 1);

    if (r.felled) {
      feel.milestone();
      setFelling(true);
      fall.setValue(0);
      grow.setValue(1);
      Animated.sequence([
        Animated.timing(fall, { toValue: 1, duration: quiet ? 1 : 520, easing: Easing.in(Easing.cubic), useNativeDriver: ND }),
        Animated.timing(grow, { toValue: 0, duration: 0, useNativeDriver: ND }),
        Animated.timing(fall, { toValue: 0, duration: 0, useNativeDriver: ND }),
        Animated.delay(120),
        Animated.spring(grow, { toValue: 1, friction: 4, tension: 90, useNativeDriver: ND }),
      ]).start(() => setFelling(false));
    }
  };

  const sway = idle.interpolate({ inputRange: [0, 1], outputRange: ['-0.8deg', '0.8deg'] });

  return (
    <Pressable
      // Phones chop on finger-down for snappy taps. The web preview uses a normal click,
      // because react-native-web does not send press-in from inside some containers.
      onPressIn={Platform.OS === 'web' ? undefined : press}
      onPress={Platform.OS === 'web' ? press : undefined}
      onLongPress={onDevLongPress}
      delayLongPress={1500}
      ref={box}
      onLayout={() => box.current?.measureInWindow?.((x: number, y: number) => { origin.current = { x, y }; })}
      style={{ position: 'absolute', left: 0, top: 0, width: areaW, height: areaH }}
      accessibilityRole="button"
      accessibilityLabel="Chop the tree"
    >
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left, top, width: TREE_W, height: TREE_H, transform: [{ scale }, { translateX: quake.interpolate({ inputRange: [-1, 1], outputRange: [-5, 5] }) }] }}>
        {golden && (
          <Animated.View style={[styles.glow, { opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.75] }) }]} />
        )}
        <View style={styles.shadowEllipse} />
        {felling && <View style={StyleSheet.absoluteFill}><StumpArt /></View>}
        <Animated.View
          style={{
            width: TREE_W, height: TREE_H,
            transformOrigin: 'bottom',
            opacity: fall.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
            transform: [
              { rotate: sway },
              { rotate: shake.interpolate({ inputRange: [-1, 1], outputRange: ['-2.2deg', '2.2deg'] }) },
              { rotate: fall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '84deg'] }) },
              { scale: grow.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }) },
              { scaleY: squash.interpolate({ inputRange: [0, 1], outputRange: [1, 0.95] }) },
              { scaleX: squash.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) },
            ],
          } as any}
        >
          <TreeArt golden={golden} cut={chops / CHOPS_PER_TREE} />
        </Animated.View>

        <Animated.View
          style={[styles.flash, {
            opacity: flash.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
            transform: [{ scale: flash.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.8] }) }],
          }]}
        />

        <Animated.View
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

        <View style={styles.chipOrigin}>
          {chunks.map((c) => (
            <ChunkView key={c.id} c={c} onDone={() => setChunks((cs) => cs.filter((x) => x.id !== c.id))} />
          ))}
        </View>
        {/* chops left: a thin bar under the tree, no words */}
        <View style={styles.prog}>
          <Animated.View style={[styles.progFill, { backgroundColor: golden ? C.gold : '#f1d49c', width: prog.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
      </Animated.View>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {floaters.map((f) => (
          <FloatText key={f.id} f={f} onDone={() => setFloaters((fs) => fs.filter((x) => x.id !== f.id))} />
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadowEllipse: { position: 'absolute', left: TREE_W / 2 - 80, top: TREE_H - 14, width: 160, height: 22, borderRadius: 80, backgroundColor: 'rgba(0,0,0,0.22)' },
  glow: { position: 'absolute', left: -10, top: 0, width: TREE_W + 20, height: TREE_W + 20, borderRadius: (TREE_W + 20) / 2, backgroundColor: '#ffe27a' },
  flash: { position: 'absolute', left: HIT.x - 18, top: HIT.y - 18, width: 36, height: 36, borderRadius: 18, backgroundColor: '#fffbe6' },
  axe: { position: 'absolute', left: HIT.x + 26, top: HIT.y - AXE + 44, width: AXE, height: AXE },
  chipOrigin: { position: 'absolute', left: HIT.x + 4, top: HIT.y - 4 },
  chunk: { position: 'absolute', borderRadius: 2, borderWidth: 1, borderColor: 'rgba(58,34,16,0.7)' },
  prog: { position: 'absolute', left: TREE_W / 2 - 50, top: TREE_H + 2, width: 100, height: 7, borderRadius: 4, backgroundColor: 'rgba(23,48,31,0.45)', overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(58,34,16,0.6)' },
  progFill: { height: '100%', borderRadius: 3 },
  float: { position: 'absolute', width: 120, textAlign: 'center', fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 2 } },
});
