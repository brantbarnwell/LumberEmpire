// Update 2: one tap sells everything at the market price. "Sell 1,000 wood for $120" / "$0.12 per wood".
import { useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getState, update, useGame } from '../game/store';
import { sellAll, sellQuote } from '../game/logic';
import { priceTrend } from '../game/market';
import { money, whole } from '../game/format';
import { feel, fly, lessMotion } from '../services/feel';
import { Icon } from './art/Icons';
import { C } from './theme';

const ND = Platform.OS !== 'web';

/** "$0.12" with 2 decimals, 3 when it is tiny. */
export function unitText(n: number) {
  if (n >= 100) return money(n);
  if (n >= 0.1) return '$' + n.toFixed(2);
  return '$' + n.toFixed(3);
}

export function PriceTag({ p, each, size = 14 }: { p: 'wood' | 'planks' | 'furniture'; each: number; size?: number }) {
  const s = useGame();
  const t = priceTrend(s.dayKey, p);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Text style={{ fontSize: size, fontWeight: '900', color: C.ink }}>{p === 'wood' ? 'avg ' : ''}{unitText(each)} per {p === 'wood' ? 'log' : p === 'planks' ? 'plank' : 'item'}</Text>
      <Icon name={t > 0 ? 'up' : t < 0 ? 'down' : 'flat'} size={size + 2} />
    </View>
  );
}

export function SellButton({ p, compact }: { p: 'wood' | 'planks'; compact?: boolean }) {
  const s = useGame();
  const [plus, setPlus] = useState<{ id: number; text: string } | null>(null);
  const press = useRef(new Animated.Value(0)).current;
  const plusT = useRef(new Animated.Value(0)).current;
  const ref = useRef<any>(null);
  const q = sellQuote(s, p, Date.now());
  const ready = q.units >= 1;
  const auto = s.yardSeller && (p === 'wood' ? s.selling : s.plankSelling);

  const sell = () => {
    const r = sellAll(getState(), p, Date.now());
    if (r.sold < 1) { feel.error(); return; }
    update(() => r.state);
    feel.sell();
    ref.current?.measureInWindow?.((x: number, y: number, w: number) => fly('coin', { x: x + w / 2, y: y + 10 }, 'money', Math.min(8, 3 + Math.floor(Math.log10(1 + r.earned)))));
    setPlus({ id: Date.now(), text: `+${money(r.earned)}` });
    plusT.setValue(0);
    Animated.timing(plusT, { toValue: 1, duration: lessMotion() ? 600 : 1000, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start();
  };

  const name = p === 'wood' ? 'wood' : 'planks';
  return (
    <View ref={ref} style={{ alignSelf: 'stretch' }}>
      <Pressable
        onPress={sell}
        disabled={!ready}
        onPressIn={() => Animated.spring(press, { toValue: 1, friction: 6, tension: 300, useNativeDriver: ND }).start()}
        onPressOut={() => Animated.spring(press, { toValue: 0, friction: 4, tension: 200, useNativeDriver: ND }).start()}
        accessibilityRole="button"
        accessibilityLabel={`Sell ${name}`}
      >
        <Animated.View style={{ transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] }) }] }}>
          <LinearGradient colors={ready ? ['#ffe17a', '#f5b81f', '#d8901a'] : ['#efe3c6', '#d9caa6']} style={[styles.btn, compact && { paddingVertical: 8 }]}>
            <View style={styles.row}>
              <Icon name={auto && !ready ? 'seller' : p === 'wood' ? 'wood' : 'planks'} size={compact ? 26 : 32} />
              <Text style={[styles.big, compact && { fontSize: 18 }]} numberOfLines={1} adjustsFontSizeToFit>
                {ready ? `Sell ${whole(q.units)} ${name} for ${money(q.earned)}` : auto ? 'Auto-selling' : `No ${name} yet`}
              </Text>
            </View>
            <PriceTag p={p} each={q.each} size={compact ? 12.5 : 14} />
          </LinearGradient>
        </Animated.View>
      </Pressable>
      {plus && (
        <Animated.Text
          key={plus.id}
          pointerEvents="none"
          style={[styles.plus, {
            opacity: plusT.interpolate({ inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 1, 1, 0] }),
            transform: [{ translateY: plusT.interpolate({ inputRange: [0, 1], outputRange: [0, -70] }) }, { scale: plusT.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.6, 1.25, 1] }) }],
          }]}
        >
          {plus.text}
        </Animated.Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: 18, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', borderWidth: 2.5, borderColor: '#3a2210', gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  big: { fontSize: 22, fontWeight: '900', color: '#3a2210', flexShrink: 1 },
  plus: { position: 'absolute', alignSelf: 'center', top: -10, fontSize: 30, fontWeight: '900', color: '#9cf09a', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 2 } },
});
