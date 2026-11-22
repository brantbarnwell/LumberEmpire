// The big SELL button (section 24): sells part of your pile at your price, with a cash burst.
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getState, update, useGame } from '../game/store';
import { buyersWillTake, moneyMult, sellNow, sellShare, toolFx } from '../game/logic';
import { money, whole } from '../game/format';
import { haptic } from '../services/haptics';
import { C } from './theme';

const ND = Platform.OS !== 'web';
type Bit = { id: number; icon: string; dx: number; up: number; spin: number; delay: number };

function Burst({ b, onDone }: { b: Bit; onDone: () => void }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([Animated.delay(b.delay), Animated.timing(t, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: ND })]).start(onDone);
  }, []);
  return (
    <Animated.Text
      pointerEvents="none"
      style={[styles.bit, {
        opacity: t.interpolate({ inputRange: [0, 0.05, 0.75, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, b.dx] }) },
          { translateY: t.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, -b.up, -b.up + 30] }) },
          { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${b.spin}deg`] }) },
          { scale: t.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.4, 1.2, 0.9] }) },
        ],
      }]}
    >
      {b.icon}
    </Animated.Text>
  );
}

export function SellButton({ p }: { p: 'wood' | 'planks' }) {
  const s = useGame();
  const [bits, setBits] = useState<Bit[]>([]);
  const [msg, setMsg] = useState<{ text: string; good: boolean; id: number } | null>(null);
  const press = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const msgT = useRef(new Animated.Value(0)).current;
  const idRef = useRef(1);

  const stock = Math.floor(p === 'wood' ? s.wood : s.planks);
  const price = p === 'wood' ? s.sellPrice : s.plankPrice;
  const share = sellShare(s.dayKey, p, price);
  const willSell = Math.min(Math.floor(stock * share), buyersWillTake(s, p, price), stock);
  const fx = toolFx(s);
  const estimate = willSell * price * moneyMult(s, Date.now()) * (1 + (p === 'wood' ? fx.woodSalePct : fx.plankSalePct));
  const ready01 = stock >= 1 ? Math.min(1, buyersWillTake(s, p, price) / stock) : 0;
  const ready = stock >= 1;

  // gentle pulse when there is wood waiting, so new players notice the button
  useEffect(() => {
    if (!ready) return;
    const l = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
      Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
    ]));
    l.start();
    return () => l.stop();
  }, [ready]);

  const sell = () => {
    const { state, result } = sellNow(getState(), p, Date.now());
    const id = idRef.current++;
    if (result.sold > 0) {
      update(() => state);
      haptic.success();
      const n = Math.min(14, 4 + Math.floor(Math.log10(1 + result.earned) * 2));
      setBits((b) => [...b.slice(-20), ...Array.from({ length: n }, (_, i) => ({
        id: id * 100 + i, icon: i % 3 === 0 ? '🪙' : '💵', dx: -110 + Math.random() * 220, up: 70 + Math.random() * 90,
        spin: -200 + Math.random() * 400, delay: i * 25,
      }))]);
      setMsg({ text: `Sold ${whole(result.sold)} for ${money(result.earned)}!${result.why === 'buyers' ? ' Buyers ran out, more are coming.' : ''}`, good: true, id });
    } else {
      haptic.error();
      setMsg({
        text: result.why === 'empty' ? `No ${p} to sell yet.` : result.why === 'price' ? 'Nobody wants it at that price. Lower your price.' : 'No buyers right now. Wait a few seconds.',
        good: false, id,
      });
    }
    msgT.setValue(0);
    Animated.timing(msgT, { toValue: 1, duration: 2600, useNativeDriver: ND }).start();
  };

  const scale = Animated.add(
    press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.93] }),
    pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.025] }),
  );

  return (
    <View style={{ alignItems: 'stretch' }}>
      <Pressable
        onPress={sell}
        onPressIn={() => Animated.spring(press, { toValue: 1, friction: 6, tension: 300, useNativeDriver: ND }).start()}
        onPressOut={() => Animated.spring(press, { toValue: 0, friction: 4, tension: 200, useNativeDriver: ND }).start()}
        accessibilityRole="button"
        accessibilityLabel={`Sell ${p}`}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <LinearGradient colors={ready ? ['#ffe17a', '#f5b81f', '#d8901a'] : ['#e8dcc0', '#cbbd9c']} style={styles.btn}>
            <Text style={styles.big}>💰 SELL {p === 'wood' ? 'WOOD' : 'PLANKS'}</Text>
            <Text style={styles.small}>
              {!ready ? `Chop to get ${p}` : willSell > 0 ? `about ${whole(willSell)} of ${whole(stock)} for ~${money(estimate)}` : share < 0.05 ? 'Price too high: almost nobody buys' : 'Buyers are on their way…'}
            </Text>
          </LinearGradient>
        </Animated.View>
      </Pressable>
      <View style={styles.poolRow}>
        <Text style={styles.poolText}>👥 Buyers ready</Text>
        <View style={styles.poolBar}><View style={[styles.poolFill, { width: `${ready01 * 100}%` }]} /></View>
        <Text style={styles.poolText}>{Math.round(share * 100)}% of pile at your price</Text>
      </View>
      <View pointerEvents="none" style={styles.burstOrigin}>
        {bits.map((b) => <Burst key={b.id} b={b} onDone={() => setBits((x) => x.filter((y) => y.id !== b.id))} />)}
      </View>
      {msg && (
        <Animated.Text
          key={msg.id}
          pointerEvents="none"
          style={[styles.msg, { color: msg.good ? C.money : C.red }, {
            opacity: msgT.interpolate({ inputRange: [0, 0.08, 0.8, 1], outputRange: [0, 1, 1, 0] }),
            transform: [{ translateY: msgT.interpolate({ inputRange: [0, 0.1, 1], outputRange: [8, 0, -6] }) }],
          }]}
        >
          {msg.text}
        </Animated.Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: 18, paddingVertical: 12, alignItems: 'center', borderWidth: 2.5, borderColor: '#a86a10' },
  big: { fontSize: 24, fontWeight: '900', color: '#3a2210', letterSpacing: 1, textShadowColor: 'rgba(255,255,255,0.6)', textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } },
  small: { fontSize: 12.5, fontWeight: '800', color: '#5a3a10', marginTop: 1 },
  poolRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  poolText: { fontSize: 10.5, fontWeight: '800', color: C.inkSoft },
  poolBar: { flex: 1, height: 7, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.1)', overflow: 'hidden' },
  poolFill: { height: '100%', borderRadius: 4, backgroundColor: C.leafLight },
  burstOrigin: { position: 'absolute', left: '50%', top: 20 },
  bit: { position: 'absolute', fontSize: 22 },
  msg: { textAlign: 'center', fontWeight: '900', fontSize: 13, marginTop: 4 },
});
