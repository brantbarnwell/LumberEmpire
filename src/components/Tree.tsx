import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CHOPS_PER_TREE } from '../game/data';
import { ChopResult } from '../game/logic';
import { small } from '../game/format';
import { C } from './theme';

const ND = Platform.OS !== 'web';
const W = 230;
const H = 300;

function Triangle({ w, h, color, top, left }: { w: number; h: number; color: string; top: number; left: number }) {
  return (
    <View
      style={{
        position: 'absolute', top, left, width: 0, height: 0,
        borderLeftWidth: w / 2, borderRightWidth: w / 2, borderBottomWidth: h,
        borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color,
      }}
    />
  );
}

interface Floater { id: number; text: string; color: string; size: number; x: number; }
interface Chip { id: number; dx: number; color: string; }

function FloatText({ f, onDone }: { f: Floater; onDone: () => void }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: ND }).start(onDone);
  }, []);
  return (
    <Animated.Text
      pointerEvents="none"
      style={[
        styles.float,
        { left: f.x, color: f.color, fontSize: f.size },
        {
          opacity: t.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
          transform: [
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -90] }) },
            { scale: t.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.6, 1.15, 1] }) },
          ],
        },
      ]}
    >
      {f.text}
    </Animated.Text>
  );
}

function WoodChip({ c, onDone }: { c: Chip; onDone: () => void }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 650, easing: Easing.linear, useNativeDriver: ND }).start(onDone);
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.chip,
        { backgroundColor: c.color },
        {
          opacity: t.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] }),
          transform: [
            { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, c.dx] }) },
            { translateY: t.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, -38, 40] }) },
            { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${c.dx * 6}deg`] }) },
          ],
        },
      ]}
    />
  );
}

export function Tree({
  chops, golden, goldenLeft, onChop, onDevLongPress,
}: {
  chops: number;
  golden: boolean;
  goldenLeft: number;
  onChop: () => ChopResult;
  onDevLongPress?: () => void;
}) {
  const shake = useRef(new Animated.Value(0)).current;
  const fall = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const swing = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [chips, setChips] = useState<Chip[]>([]);
  const nextId = useRef(1);

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
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 45, useNativeDriver: ND }),
      Animated.timing(shake, { toValue: -1, duration: 70, useNativeDriver: ND }),
      Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: ND }),
    ]).start();
    swing.setValue(0);
    Animated.sequence([
      Animated.timing(swing, { toValue: 1, duration: 70, useNativeDriver: ND }),
      Animated.timing(swing, { toValue: 0, duration: 160, useNativeDriver: ND }),
    ]).start();

    const id = nextId.current;
    nextId.current += 6;
    const x = W / 2 - 40 + Math.random() * 80;
    const add: Floater[] = r.storageFull ? [{ id, text: 'Storage full!', color: '#ff8a7a', size: 22, x: W / 2 - 70 }] : [
      r.crit
        ? { id, text: `CRIT! +${small(r.wood)}`, color: '#ff8a1f', size: 30, x: x - 30 }
        : { id, text: `+${small(r.wood)}`, color: C.cream, size: 24, x },
    ];
    if (r.felled) add.push({ id: id + 1, text: `TIMBER! +${small(r.fellBonus)}`, color: C.gold, size: 26, x: W / 2 - 80 });
    setFloaters((f) => [...f.slice(-14), ...add]);
    const n = r.crit ? 7 : 4;
    const newChips: Chip[] = Array.from({ length: n }, (_, i) => ({
      id: id * 100 + i,
      dx: 15 + Math.random() * 55,
      color: golden ? C.gold : i % 2 ? '#e2c18b' : '#c99a5b',
    }));
    setChips((c) => [...c.slice(-24), ...newChips]);

    if (r.felled) {
      fall.setValue(0);
      Animated.sequence([
        Animated.timing(fall, { toValue: 1, duration: 380, easing: Easing.in(Easing.quad), useNativeDriver: ND }),
        Animated.timing(pop, { toValue: 0, duration: 0, useNativeDriver: ND }),
        Animated.timing(fall, { toValue: 0, duration: 0, useNativeDriver: ND }),
        Animated.spring(pop, { toValue: 1, friction: 5, tension: 120, useNativeDriver: ND }),
      ]).start();
    }
  };

  const frac = chops / CHOPS_PER_TREE;
  const g = golden;
  const leaf = g ? ['#c8941b', '#e9b52f', '#ffd75e'] : ['#1e5530', '#2f6b3a', '#3f8a48'];
  const leafHi = g ? ['#e0ac2c', '#f7cd4f', '#ffe68f'] : ['#2a6a3b', '#3f8546', '#58a957'];

  return (
    <View style={styles.wrap}>
      <View style={styles.hpBar}>
        <View style={[styles.hpFill, { width: `${(1 - frac) * 100}%`, backgroundColor: g ? C.gold : C.moss }]} />
        <Text style={styles.hpText}>
          {g ? `GOLDEN TREE · ${goldenLeft}s left` : `Tree · ${CHOPS_PER_TREE - chops} chops left`}
        </Text>
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
        {g && (
          <Animated.View
            pointerEvents="none"
            style={[styles.glow, { opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.8] }) }]}
          />
        )}
        <View style={styles.shadowEllipse} />
        <Animated.View
          style={{
            width: W, height: H,
            transformOrigin: 'bottom',
            opacity: fall.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
            transform: [
              { rotate: shake.interpolate({ inputRange: [-1, 1], outputRange: ['-2.5deg', '2.5deg'] }) },
              { rotate: fall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '78deg'] }) },
              { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) },
            ],
          } as any}
        >
          {/* trunk */}
          <View style={[styles.trunk, g && { backgroundColor: '#9a6a1f' }]}>
            <View style={styles.barkLine} />
            <View style={[styles.barkLine, { left: 26, top: 22, height: 30 }]} />
            <View style={[styles.notch, { width: 6 + frac * 22, height: 10 + frac * 10 }]} />
          </View>
          {/* canopy */}
          <Triangle w={230} h={120} color={leaf[0]} top={128} left={0} />
          <Triangle w={190} h={104} color={leafHi[0]} top={128} left={20} />
          <Triangle w={186} h={110} color={leaf[1]} top={64} left={22} />
          <Triangle w={150} h={94} color={leafHi[1]} top={66} left={40} />
          <Triangle w={132} h={100} color={leaf[2]} top={4} left={49} />
          <Triangle w={98} h={82} color={leafHi[2]} top={10} left={66} />
          {g && (
            <>
              <Text style={[styles.sparkle, { top: 30, left: 60 }]}>✦</Text>
              <Text style={[styles.sparkle, { top: 110, left: 150 }]}>✦</Text>
              <Text style={[styles.sparkle, { top: 170, left: 40, fontSize: 14 }]}>✦</Text>
              <Text style={[styles.sparkle, { top: 80, left: 105, fontSize: 26 }]}>✦</Text>
            </>
          )}
        </Animated.View>

        {/* axe */}
        <Animated.Text
          pointerEvents="none"
          style={[
            styles.axe,
            {
              transform: [
                { scaleX: -1 },
                { rotate: swing.interpolate({ inputRange: [0, 1], outputRange: ['-30deg', '35deg'] }) },
              ],
            },
          ]}
        >
          🪓
        </Animated.Text>

        <View pointerEvents="none" style={styles.chipOrigin}>
          {chips.map((c) => (
            <WoodChip key={c.id} c={c} onDone={() => setChips((cs) => cs.filter((x) => x.id !== c.id))} />
          ))}
        </View>
        <View pointerEvents="none" style={styles.floatOrigin}>
          {floaters.map((f) => (
            <FloatText key={f.id} f={f} onDone={() => setFloaters((fs) => fs.filter((x) => x.id !== f.id))} />
          ))}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  hpBar: {
    width: 210, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.35)', overflow: 'hidden',
    justifyContent: 'center', marginBottom: 6,
  },
  hpFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 11 },
  hpText: { textAlign: 'center', color: '#fff', fontWeight: '800', fontSize: 12, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 2 },
  trunk: {
    position: 'absolute', left: W / 2 - 24, top: 232, width: 48, height: 66, backgroundColor: C.bark,
    borderRadius: 5, borderWidth: 2, borderColor: C.barkDark, overflow: 'hidden',
  },
  barkLine: { position: 'absolute', left: 10, top: 6, width: 3, height: 40, backgroundColor: C.barkDark, borderRadius: 2 },
  notch: { position: 'absolute', right: -2, top: 30, backgroundColor: '#ecd09b', borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
  shadowEllipse: { position: 'absolute', left: W / 2 - 70, top: H - 14, width: 140, height: 20, borderRadius: 70, backgroundColor: 'rgba(0,0,0,0.22)' },
  glow: { position: 'absolute', left: -20, top: -10, width: W + 40, height: W + 40, borderRadius: (W + 40) / 2, backgroundColor: '#ffe27a' },
  sparkle: { position: 'absolute', color: '#fffbe6', fontSize: 20, textShadowColor: C.gold, textShadowRadius: 8 },
  axe: { position: 'absolute', left: W / 2 + 14, top: 218, fontSize: 46, transformOrigin: 'bottom left' } as any,
  chipOrigin: { position: 'absolute', left: W / 2 + 24, top: 262 },
  chip: { position: 'absolute', width: 9, height: 5, borderRadius: 1.5 },
  floatOrigin: { position: 'absolute', left: 0, top: 150, width: W },
  float: { position: 'absolute', fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.55)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 2 } },
});
